from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class DocumentResponse(BaseModel):
    id: int
    filename: str
    status: str
    upload_time: datetime
    
    class Config:
        from_attributes = True

class LineItemMatch(BaseModel):
    product_id: str
    description: str
    confidence: float

class LineItemResponse(BaseModel):
    id: int
    description: str
    quantity: int
    unit_price: float
    matches: List[LineItemMatch]

class VerifiedItem(BaseModel):
    line_item_id: int
    selected_product_id: str

class VerificationRequest(BaseModel):
    verified_items: List[VerifiedItem]

class ProductResponse(BaseModel):
    product_id: str
    description: str
    category: Optional[str] = None