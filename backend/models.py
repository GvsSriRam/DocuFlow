from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    status = Column(String, default="uploaded")  # uploaded, extracted, verified, failed
    upload_time = Column(DateTime, default=func.now())
    
    # Relationships
    line_items = relationship("LineItem", back_populates="document")

class LineItem(Base):
    __tablename__ = "line_items"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    description = Column(Text)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    extracted_data = Column(Text)  # JSON string of raw extraction data
    
    # Relationships
    document = relationship("Document", back_populates="line_items")
    matches = relationship("Match", back_populates="line_item")

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    line_item_id = Column(Integer, ForeignKey("line_items.id"))
    product_id = Column(String)
    product_description = Column(Text)
    confidence = Column(Float, default=0.0)
    verified = Column(Boolean, default=False)
    user_selected = Column(Boolean, default=False)
    
    # Relationships
    line_item = relationship("LineItem", back_populates="matches")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, unique=True, index=True)
    description = Column(Text)
    category = Column(String)
    specifications = Column(Text)