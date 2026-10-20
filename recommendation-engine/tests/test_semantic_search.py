import pytest
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from src.semantic_search import SemanticSearchEngine


@pytest.fixture
def mock_engine():
    db_pool = MagicMock()
    redis_client = MagicMock()
    engine = SemanticSearchEngine(db_pool, redis_client)
    # Inject a fake model
    fake_model = MagicMock()
    fake_model.encode.return_value = np.random.rand(384).astype(np.float32)
    engine.model = fake_model
    return engine


def test_get_embedding_returns_array(mock_engine):
    vec = mock_engine.get_embedding("blue running shoes")
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (384,)


def test_get_embedding_called_with_normalize(mock_engine):
    mock_engine.get_embedding("test query")
    mock_engine.model.encode.assert_called_once_with("test query", normalize_embeddings=True)


@pytest.mark.asyncio
async def test_search_uses_cache(mock_engine):
    cached = b'[{"id":"p1","name":"Widget","score":0.9}]'
    mock_engine.redis.get = AsyncMock(return_value=cached)

    results = await mock_engine.search("widget", limit=5)

    assert len(results) == 1
    assert results[0]["id"] == "p1"
    mock_engine.redis.get.assert_called_once()


@pytest.mark.asyncio
async def test_search_queries_db_on_cache_miss(mock_engine):
    import json

    mock_engine.redis.get = AsyncMock(return_value=None)
    mock_engine.redis.set = AsyncMock(return_value=True)

    db_row = {
        "id": "prod-1",
        "name": "Widget",
        "price": 9.99,
        "images": [],
        "rating": 4.5,
        "vector_score": 0.85,
        "text_score": 0.7,
    }

    conn_mock = AsyncMock()
    conn_mock.fetch = AsyncMock(return_value=[db_row])
    mock_engine.db.acquire = MagicMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=conn_mock), __aexit__=AsyncMock()))

    results = await mock_engine.search("widget", limit=5)

    conn_mock.fetch.assert_called_once()
    assert mock_engine.redis.set.called


@pytest.mark.asyncio
async def test_embed_product_updates_db(mock_engine):
    conn_mock = AsyncMock()
    conn_mock.execute = AsyncMock()
    mock_engine.db.acquire = MagicMock(
        return_value=AsyncMock(__aenter__=AsyncMock(return_value=conn_mock), __aexit__=AsyncMock())
    )

    await mock_engine.embed_product("prod-1", "Widget", "A great widget", "Gadgets")

    conn_mock.execute.assert_called_once()
    call_args = conn_mock.execute.call_args[0]
    assert "prod-1" in call_args[1] or "prod-1" == call_args[1]
