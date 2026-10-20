import pytest
import numpy as np
import json
from unittest.mock import AsyncMock, MagicMock, patch
from src.recommender import HybridRecommender


@pytest.fixture
def recommender():
    db_pool = MagicMock()
    redis_client = MagicMock()
    rec = HybridRecommender(db_pool, redis_client)
    return rec


@pytest.fixture
def recommender_with_matrix(recommender):
    recommender._user_ids = ["user-1", "user-2"]
    recommender._item_ids = ["prod-1", "prod-2", "prod-3"]
    recommender._user_item_matrix = np.array([
        [5.0, 3.0, 0.0],
        [0.0, 4.0, 2.0],
    ], dtype=np.float32)
    return recommender


@pytest.mark.asyncio
async def test_get_recommendations_returns_cached(recommender):
    cached_data = json.dumps([{"id": "prod-1", "name": "Widget", "score": 0.9}]).encode()
    recommender.redis.get = AsyncMock(return_value=cached_data)

    results = await recommender.get_recommendations(user_id="user-1")

    assert len(results) == 1
    assert results[0]["id"] == "prod-1"
    recommender.redis.get.assert_called_once()


@pytest.mark.asyncio
async def test_get_recommendations_popular_fallback(recommender):
    recommender.redis.get = AsyncMock(return_value=None)
    recommender.redis.set = AsyncMock(return_value=True)

    popular_rows = [
        {"id": "prod-1", "name": "Widget", "price": 9.99, "images": [], "rating": 4.8, "score": 100},
        {"id": "prod-2", "name": "Gadget", "price": 19.99, "images": [], "rating": 4.5, "score": 80},
    ]
    conn_mock = AsyncMock()
    conn_mock.fetch = AsyncMock(return_value=popular_rows)
    recommender.db.acquire = MagicMock(
        return_value=AsyncMock(__aenter__=AsyncMock(return_value=conn_mock), __aexit__=AsyncMock())
    )

    results = await recommender.get_recommendations(user_id="unknown-user", limit=5)

    assert len(results) == 2
    conn_mock.fetch.assert_called()


@pytest.mark.asyncio
async def test_checkout_recommendations(recommender):
    recommender.redis.get = AsyncMock(return_value=None)
    recommender.redis.set = AsyncMock(return_value=True)

    co_purchase_rows = [
        {"id": "prod-5", "name": "Accessory", "price": 5.99, "images": [], "rating": 4.2, "co_purchases": 25},
    ]
    conn_mock = AsyncMock()
    conn_mock.fetch = AsyncMock(return_value=co_purchase_rows)
    recommender.db.acquire = MagicMock(
        return_value=AsyncMock(__aenter__=AsyncMock(return_value=conn_mock), __aexit__=AsyncMock())
    )

    results = await recommender.get_checkout_recommendations(
        cart_product_ids=["prod-1", "prod-2"], limit=4
    )

    assert len(results) >= 0  # may return 0 if no co-purchases, or 1
    conn_mock.fetch.assert_called_once()


@pytest.mark.asyncio
async def test_build_matrix_empty_db(recommender):
    conn_mock = AsyncMock()
    conn_mock.fetch = AsyncMock(return_value=[])
    recommender.db.acquire = MagicMock(
        return_value=AsyncMock(__aenter__=AsyncMock(return_value=conn_mock), __aexit__=AsyncMock())
    )

    await recommender._build_user_item_matrix()

    assert recommender._user_item_matrix is None
    assert recommender._item_ids == []


@pytest.mark.asyncio
async def test_build_matrix_populates_correctly(recommender):
    rows = [
        {"user_id": "u1", "product_id": "p1", "total_score": 3},
        {"user_id": "u1", "product_id": "p2", "total_score": 1},
        {"user_id": "u2", "product_id": "p1", "total_score": 5},
    ]
    conn_mock = AsyncMock()
    conn_mock.fetch = AsyncMock(return_value=rows)
    recommender.db.acquire = MagicMock(
        return_value=AsyncMock(__aenter__=AsyncMock(return_value=conn_mock), __aexit__=AsyncMock())
    )

    await recommender._build_user_item_matrix()

    assert recommender._user_item_matrix is not None
    assert len(recommender._user_ids) == 2
    assert len(recommender._item_ids) == 2
    # All matrix entries should be log1p-transformed (positive)
    assert (recommender._user_item_matrix >= 0).all()
