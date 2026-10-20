"""
Hybrid recommendation engine:
- Collaborative filtering (user–item implicit feedback matrix via ALS/cosine)
- Content-based filtering (product embedding similarity)
- Regional popularity boost
- Frequently bought together (checkout recommendations)
"""
import json
import numpy as np
from typing import List, Optional
import asyncpg
import redis.asyncio as aioredis
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity


class HybridRecommender:
    CACHE_TTL = 1800  # 30 min

    def __init__(self, db_pool: asyncpg.Pool, redis_client: aioredis.Redis):
        self.db = db_pool
        self.redis = redis_client
        self._user_item_matrix: Optional[np.ndarray] = None
        self._item_ids: List[str] = []
        self._user_ids: List[str] = []

    async def initialize(self):
        await self._build_user_item_matrix()
        print('[Recommender] Initialized')

    async def _build_user_item_matrix(self):
        """Build implicit feedback matrix from interactions."""
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT user_id::text, product_id::text, SUM(score) AS total_score
                FROM user_product_interactions
                WHERE created_at > NOW() - INTERVAL '90 days'
                GROUP BY user_id, product_id
            """)

        if not rows:
            return

        user_ids = list({r['user_id'] for r in rows})
        item_ids = list({r['product_id'] for r in rows})
        u_idx = {u: i for i, u in enumerate(user_ids)}
        i_idx = {it: i for i, it in enumerate(item_ids)}

        matrix = np.zeros((len(user_ids), len(item_ids)), dtype=np.float32)
        for r in rows:
            matrix[u_idx[r['user_id']], i_idx[r['product_id']]] = float(r['total_score'])

        # Log-scale the scores to dampen frequency bias
        matrix = np.log1p(matrix)

        self._user_item_matrix = matrix
        self._user_ids = user_ids
        self._item_ids = item_ids

    async def get_recommendations(
        self,
        user_id: str,
        region: Optional[str],
        context: Optional[str],
        limit: int,
        exclude_ids: List[str],
    ) -> List[dict]:
        cache_key = f'rec:{user_id}:{region}:{limit}'
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        scores: dict[str, float] = {}

        # 1. Collaborative filtering
        if self._user_item_matrix is not None and user_id in self._user_ids:
            cf_scores = await self._collaborative_scores(user_id)
            for pid, s in cf_scores.items():
                scores[pid] = scores.get(pid, 0) + s * 0.5

        # 2. Content-based from purchase history
        cb_scores = await self._content_based_scores(user_id)
        for pid, s in cb_scores.items():
            scores[pid] = scores.get(pid, 0) + s * 0.3

        # 3. Regional popularity
        regional = await self._regional_scores(region)
        for pid, s in regional.items():
            scores[pid] = scores.get(pid, 0) + s * 0.2

        # Remove excluded and already-purchased
        purchased = await self._get_purchased_ids(user_id)
        exclude_set = set(exclude_ids) | purchased
        filtered = {k: v for k, v in scores.items() if k not in exclude_set}

        # Sort and fetch top products
        top_ids = sorted(filtered, key=filtered.get, reverse=True)[:limit]

        if not top_ids:
            # Fallback: popular products
            return await self._popular_fallback(region, limit, list(exclude_set))

        products = await self._fetch_products(top_ids)
        result = sorted(products, key=lambda p: filtered.get(p['id'], 0), reverse=True)

        await self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(result, default=str))
        return result

    async def _collaborative_scores(self, user_id: str) -> dict:
        u_idx = self._user_ids.index(user_id)
        user_vec = self._user_item_matrix[u_idx].reshape(1, -1)
        sims = cosine_similarity(user_vec, self._user_item_matrix)[0]

        # Top-20 similar users
        similar_idxs = np.argsort(sims)[-21:-1][::-1]
        scores = {}
        for idx in similar_idxs:
            weight = float(sims[idx])
            for j, item_id in enumerate(self._item_ids):
                if self._user_item_matrix[u_idx, j] == 0:  # not yet interacted
                    scores[item_id] = scores.get(item_id, 0) + weight * float(self._user_item_matrix[idx, j])
        return scores

    async def _content_based_scores(self, user_id: str) -> dict:
        async with self.db.acquire() as conn:
            # Average embedding of user's purchased products
            rows = await conn.fetch("""
                SELECT p.embedding
                FROM user_product_interactions upi
                JOIN products p ON p.id = upi.product_id
                WHERE upi.user_id = $1 AND upi.action = 'purchase'
                  AND p.embedding IS NOT NULL
                ORDER BY upi.created_at DESC LIMIT 10
            """, user_id)

            if not rows:
                return {}

            user_profile = np.mean([np.array(r['embedding']) for r in rows], axis=0)
            user_profile = user_profile / np.linalg.norm(user_profile)

            # Find similar products
            similar = await conn.fetch("""
                SELECT id::text, (1 - (embedding <=> $1::vector)) AS score
                FROM products WHERE is_active = true AND embedding IS NOT NULL
                ORDER BY embedding <=> $1::vector LIMIT 50
            """, user_profile.tolist())

        return {r['id']: float(r['score']) for r in similar}

    async def _regional_scores(self, region: Optional[str]) -> dict:
        if not region:
            return {}
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT upi.product_id::text, COUNT(*) AS cnt
                FROM user_product_interactions upi
                JOIN users u ON u.id = upi.user_id
                WHERE u.region = $1 AND upi.action = 'purchase'
                  AND upi.created_at > NOW() - INTERVAL '7 days'
                GROUP BY upi.product_id ORDER BY cnt DESC LIMIT 50
            """, region)
        if not rows:
            return {}
        max_cnt = max(r['cnt'] for r in rows)
        return {r['product_id']: r['cnt'] / max_cnt for r in rows}

    async def _get_purchased_ids(self, user_id: str) -> set:
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                "SELECT DISTINCT product_id::text FROM user_product_interactions WHERE user_id = $1 AND action = 'purchase'",
                user_id)
        return {r['product_id'] for r in rows}

    async def _fetch_products(self, ids: List[str]) -> List[dict]:
        if not ids:
            return []
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id::text, name, slug, price, compare_at_price,
                       default_image_url, average_rating, review_count, short_description
                FROM products WHERE id = ANY($1::uuid[]) AND is_active = true
            """, ids)
        return [dict(r) for r in rows]

    async def _popular_fallback(self, region, limit, exclude_ids) -> List[dict]:
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id::text, name, slug, price, compare_at_price,
                       default_image_url, average_rating, review_count, short_description
                FROM products
                WHERE is_active = true AND NOT (id::text = ANY($1))
                  AND ($2::text IS NULL OR $2 = ANY(region_tags) OR array_length(region_tags,1) = 0)
                ORDER BY sold_count DESC LIMIT $3
            """, exclude_ids or [], region, limit)
        return [dict(r) for r in rows]

    async def get_checkout_recommendations(
        self,
        cart_product_ids: List[str],
        user_id: Optional[str],
        region: Optional[str],
        limit: int,
    ) -> List[dict]:
        """Frequently bought together using co-purchase matrix."""
        if not cart_product_ids:
            return []

        cache_key = f'checkout_rec:{":".join(sorted(cart_product_ids))}:{region}'
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT oi2.product_id::text, COUNT(*) AS co_count
                FROM order_items oi1
                JOIN order_items oi2 ON oi2.order_id = oi1.order_id
                  AND oi2.product_id != oi1.product_id
                WHERE oi1.product_id = ANY($1::uuid[])
                  AND oi2.product_id NOT IN (SELECT unnest($1::uuid[]))
                GROUP BY oi2.product_id
                ORDER BY co_count DESC LIMIT $2
            """, cart_product_ids, limit * 2)

        top_ids = [r['product_id'] for r in rows][:limit]
        if not top_ids:
            return await self._popular_fallback(region, limit, cart_product_ids)

        result = await self._fetch_products(top_ids)
        await self.redis.setex(cache_key, 900, json.dumps(result, default=str))
        return result

    async def get_regional_trending(self, region: Optional[str], limit: int) -> List[dict]:
        cache_key = f'trending:{region}:{limit}'
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT p.id::text, p.name, p.slug, p.price, p.compare_at_price,
                       p.default_image_url, p.average_rating, p.review_count,
                       p.short_description, COUNT(upi.id) AS interaction_count
                FROM products p
                LEFT JOIN user_product_interactions upi ON upi.product_id = p.id
                  AND upi.created_at > NOW() - INTERVAL '7 days'
                LEFT JOIN users u ON u.id = upi.user_id
                  AND ($1::text IS NULL OR u.region = $1)
                WHERE p.is_active = true
                  AND ($1::text IS NULL OR $1 = ANY(p.region_tags) OR array_length(p.region_tags,1) = 0 OR p.region_tags IS NULL)
                GROUP BY p.id
                ORDER BY interaction_count DESC, p.sold_count DESC
                LIMIT $2
            """, region, limit)

        result = [dict(r) for r in rows]
        await self.redis.setex(cache_key, 1800, json.dumps(result, default=str))
        return result
