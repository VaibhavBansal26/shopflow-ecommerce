from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
import redis.asyncio as aioredis
import os
from dotenv import load_dotenv

from .models import RecommendationRequest, SearchRequest, EmbedRequest
from .recommender import HybridRecommender
from .semantic_search import SemanticSearchEngine

load_dotenv()

recommender: HybridRecommender = None
search_engine: SemanticSearchEngine = None
db_pool: asyncpg.Pool = None
redis_client: aioredis.Redis = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global recommender, search_engine, db_pool, redis_client

    db_pool = await asyncpg.create_pool(os.getenv('DATABASE_URL'), min_size=2, max_size=10)
    redis_client = aioredis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))

    recommender = HybridRecommender(db_pool, redis_client)
    search_engine = SemanticSearchEngine(db_pool, redis_client)

    await recommender.initialize()
    await search_engine.initialize()

    yield

    await db_pool.close()
    await redis_client.close()


app = FastAPI(title='ShopFlow Recommendation Engine', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

INTERNAL_TOKEN = os.getenv('INTERNAL_API_TOKEN', 'shopflow-internal-token')

def verify_internal(x_internal_token: str = Header(...)):
    if x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=403, detail='Forbidden')


# ──────────────────────────────────────────────
# Semantic Search
# ──────────────────────────────────────────────

@app.post('/search')
async def semantic_search(req: SearchRequest, _=Depends(verify_internal)):
    """
    Full semantic search: combines BM25 keyword matching with dense vector
    similarity (sentence-transformers) for re-ranking.
    """
    results = await search_engine.search(
        query=req.query,
        region=req.region,
        category=req.category,
        max_price=req.max_price,
        limit=req.limit or 20,
    )
    return {'results': results, 'query': req.query, 'count': len(results)}


@app.post('/embed')
async def embed_query(req: EmbedRequest, _=Depends(verify_internal)):
    """Return embedding vector for a query (for client-side similarity)."""
    embedding = search_engine.get_embedding(req.text)
    return {'embedding': embedding.tolist()}


@app.post('/index-products')
async def index_products(_=Depends(verify_internal)):
    """Re-index all products into the vector store."""
    count = await search_engine.index_all_products()
    return {'indexed': count}


# ──────────────────────────────────────────────
# Recommendations
# ──────────────────────────────────────────────

@app.post('/recommend')
async def get_recommendations(req: RecommendationRequest, _=Depends(verify_internal)):
    """
    Hybrid recommendations:
    1. Collaborative filtering (user–item matrix)
    2. Content-based (embedding similarity on past purchases)
    3. Regional popularity boost
    4. Re-rank with recency decay
    """
    recs = await recommender.get_recommendations(
        user_id=req.user_id,
        region=req.region,
        context=req.context,
        limit=req.limit or 10,
        exclude_ids=req.exclude_ids or [],
    )
    return {'recommendations': recs, 'user_id': req.user_id}


@app.post('/recommend/checkout')
async def checkout_recommendations(req: RecommendationRequest, _=Depends(verify_internal)):
    """Recommendations shown at checkout — frequently bought together."""
    recs = await recommender.get_checkout_recommendations(
        cart_product_ids=req.cart_product_ids or [],
        user_id=req.user_id,
        region=req.region,
        limit=req.limit or 6,
    )
    return {'recommendations': recs}


@app.post('/recommend/regional')
async def regional_trending(req: RecommendationRequest, _=Depends(verify_internal)):
    """Top trending products in a geographic region."""
    recs = await recommender.get_regional_trending(region=req.region, limit=req.limit or 10)
    return {'recommendations': recs, 'region': req.region}


@app.get('/health')
async def health():
    return {'status': 'ok', 'model_loaded': search_engine.model is not None}
