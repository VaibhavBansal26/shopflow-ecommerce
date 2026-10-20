"""
Semantic search engine using sentence-transformers for dense retrieval
combined with keyword matching for a hybrid BM25 + dense approach.
Products are embedded and stored as pgvector vectors in PostgreSQL.
"""
import asyncio
import json
import numpy as np
from typing import List, Optional
import asyncpg
import redis.asyncio as aioredis
from sentence_transformers import SentenceTransformer


class SemanticSearchEngine:
    MODEL_NAME = 'all-MiniLM-L6-v2'  # 384-dim, fast and accurate
    EMBED_DIM = 384
    CACHE_TTL = 3600

    def __init__(self, db_pool: asyncpg.Pool, redis_client: aioredis.Redis):
        self.db = db_pool
        self.redis = redis_client
        self.model: Optional[SentenceTransformer] = None

    async def initialize(self):
        """Load model and ensure pgvector extension + column exists."""
        loop = asyncio.get_event_loop()
        self.model = await loop.run_in_executor(
            None, lambda: SentenceTransformer(self.MODEL_NAME)
        )

        async with self.db.acquire() as conn:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            # Add embedding column if missing
            await conn.execute("""
                DO $$ BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='products' AND column_name='embedding'
                  ) THEN
                    ALTER TABLE products ADD COLUMN embedding vector(384);
                    CREATE INDEX ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
                  END IF;
                END $$;
            """)
        print(f'[SemanticSearch] Model loaded: {self.MODEL_NAME}')

    def get_embedding(self, text: str) -> np.ndarray:
        return self.model.encode(text, normalize_embeddings=True)

    def _build_product_text(self, row: dict) -> str:
        parts = [row.get('name', ''), row.get('short_description', '') or '',
                 row.get('description', '') or '', row.get('category_name', '') or '']
        if row.get('tags'):
            parts.extend(row['tags'])
        return ' '.join(filter(None, parts))

    async def index_all_products(self) -> int:
        """Embed all products and store vectors in PostgreSQL."""
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT p.id, p.name, p.short_description, p.description, p.tags,
                       c.name AS category_name
                FROM products p LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.is_active = true
            """)

        texts = [self._build_product_text(dict(r)) for r in rows]
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None, lambda: self.model.encode(texts, batch_size=64, normalize_embeddings=True, show_progress_bar=True)
        )

        async with self.db.acquire() as conn:
            async with conn.transaction():
                for row, emb in zip(rows, embeddings):
                    await conn.execute(
                        "UPDATE products SET embedding = $1 WHERE id = $2",
                        emb.tolist(), row['id']
                    )
        return len(rows)

    async def search(
        self,
        query: str,
        region: Optional[str] = None,
        category: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 20,
    ) -> List[dict]:
        cache_key = f'search:{query}:{region}:{category}:{max_price}:{limit}'
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Get query embedding
        loop = asyncio.get_event_loop()
        query_emb = await loop.run_in_executor(None, lambda: self.get_embedding(query))

        # Build WHERE conditions
        conditions = ['p.is_active = true']
        params: list = []
        pi = 2  # $1 is the embedding

        if category:
            conditions.append(f'c.slug = ${pi}')
            params.append(category)
            pi += 1
        if max_price:
            conditions.append(f'p.price <= ${pi}')
            params.append(max_price)
            pi += 1
        if region:
            conditions.append(f'(${pi} = ANY(p.region_tags) OR p.region_tags IS NULL OR array_length(p.region_tags, 1) = 0)')
            params.append(region)
            pi += 1

        where = f'WHERE {" AND ".join(conditions)}'

        # Hybrid: vector similarity + keyword boost
        sql = f"""
            WITH vector_results AS (
                SELECT p.id, p.name, p.slug, p.price, p.compare_at_price,
                       p.default_image_url, p.average_rating, p.review_count,
                       p.short_description, p.sold_count, p.quantity,
                       c.name AS category_name,
                       (1 - (p.embedding <=> $1::vector)) AS vector_score,
                       ts_rank(
                           to_tsvector('english', COALESCE(p.name,'') || ' ' || COALESCE(p.description,'')),
                           plainto_tsquery('english', '{query.replace("'","")}')
                       ) AS text_score
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                {where}
                AND p.embedding IS NOT NULL
                ORDER BY p.embedding <=> $1::vector
                LIMIT {limit * 3}
            )
            SELECT *, (vector_score * 0.7 + LEAST(text_score, 1.0) * 0.3) AS hybrid_score
            FROM vector_results
            ORDER BY hybrid_score DESC
            LIMIT {limit}
        """

        async with self.db.acquire() as conn:
            rows = await conn.fetch(sql, query_emb.tolist(), *params)

        results = [dict(r) for r in rows]

        await self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(results, default=str))
        return results
