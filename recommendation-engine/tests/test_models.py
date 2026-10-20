import pytest
from pydantic import ValidationError
from src.models import RecommendationRequest, SearchRequest, EmbedRequest


def test_recommendation_request_defaults():
    req = RecommendationRequest()
    assert req.limit == 10
    assert req.exclude_ids == []
    assert req.cart_product_ids == []
    assert req.user_id is None
    assert req.region is None


def test_recommendation_request_custom():
    req = RecommendationRequest(
        user_id="user-1",
        region="us-west",
        limit=5,
        exclude_ids=["p1", "p2"],
        cart_product_ids=["p3"],
    )
    assert req.user_id == "user-1"
    assert req.region == "us-west"
    assert req.limit == 5
    assert len(req.exclude_ids) == 2
    assert req.cart_product_ids == ["p3"]


def test_search_request_requires_query():
    with pytest.raises(ValidationError):
        SearchRequest()


def test_search_request_valid():
    req = SearchRequest(query="wireless headphones", limit=10)
    assert req.query == "wireless headphones"
    assert req.limit == 10


def test_search_request_defaults():
    req = SearchRequest(query="shoes")
    assert req.limit == 20
    assert req.region is None
    assert req.category is None
    assert req.max_price is None


def test_search_request_with_filters():
    req = SearchRequest(query="laptop", max_price=1500.0, category="electronics", region="us-east")
    assert req.max_price == 1500.0
    assert req.category == "electronics"
    assert req.region == "us-east"


def test_embed_request():
    req = EmbedRequest(text="blue running shoes size 10")
    assert req.text == "blue running shoes size 10"


def test_embed_request_requires_text():
    with pytest.raises(ValidationError):
        EmbedRequest()
