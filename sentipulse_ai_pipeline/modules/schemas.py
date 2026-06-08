from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class BaseReview(BaseModel):
    brandId: Optional[str] = None
    branchId: Optional[str] = None
    brand_name: str
    branch_name: str
    user: str = Field(default="Anonymous")
    text: str = Field(default="None")
    rating: Optional[float] = None
    overall_rating: Optional[float] = None
    date: datetime
    source: str
    review_url: Optional[str] = None
    location: Optional[str] = None
    
    # Optional fields heavily dependent on the platform
    meal_type: Optional[str] = None
    price_per_person: Optional[str] = None
    service_type: Optional[str] = None

class GoogleReview(BaseReview):
    source: str = "google"
    review_id: Optional[str] = None
    reviewer_profile: Optional[str] = None
    likes_count: Optional[int] = None
    stars: Optional[int] = None
    reviews_count: Optional[int] = None
    reviewerPhotoUrl: Optional[str] = None
    rating_food: Optional[int] = None
    rating_service: Optional[int] = None
    rating_atmosphere: Optional[int] = None

class FoodpandaReview(BaseReview):
    source: str = "foodpanda"
    vendor_code: Optional[str] = None
    vendor_name: Optional[str] = None
    review_tags: Optional[list[str]] = Field(default_factory=list)

class UbereatsReview(BaseReview):
    source: str = "ubereats"

class TalabatReview(BaseReview):
    source: str = "talabat"

class TripadvisorReview(BaseReview):
    source: str = "tripadvisor"
    title: Optional[str] = None
    trip_type: Optional[str] = None
    visit_date: Optional[str] = None

class OpentableReview(BaseReview):
    source: str = "opentable"
    rating_food: Optional[int] = None
    rating_service: Optional[int] = None
    rating_atmosphere: Optional[int] = None
    rating_value: Optional[int] = None
    rating_noise: Optional[str] = None

class FacebookReview(BaseReview):
    source: str = "facebook"
    recommended: Optional[bool] = None
