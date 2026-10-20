from pydantic import BaseModel
from typing import List, Optional


class RecommendationRequest(BaseModel):
    user_id: Optional[str] = None
    region: Optional[str] = None
    context: Optional[str] = None
    limit: Optional[int] = 10
    exclude_ids: Optional[List[str]] = []
    cart_product_ids: Optional[List[str]] = []


class SearchRequest(BaseModel):
    query: str
    region: Optional[str] = None
    category: Optional[str] = None
    max_price: Optional[float] = None
    limit: Optional[int] = 20


class EmbedRequest(BaseModel):
    text: str
