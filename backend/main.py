from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import requests
import json
from datetime import datetime
import pandas as pd
from io import StringIO

from database import SessionLocal, engine, Base
import models
import schemas

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Endeavor Document Processor")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API endpoints (provided by Endeavor - UPDATE THESE WITH REAL ENDPOINTS)
EXTRACTION_API = "https://api.endeavor.com/extract"  # Replace with actual endpoint
MATCHING_API = "https://api.endeavor.com/match"      # Replace with actual endpoint

# For development, you can mock these responses
MOCK_MODE = True  # Set to False when using real APIs

@app.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload PDF and extract line items"""
    
    # Save uploaded file
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Create document record
    db_document = models.Document(
        filename=file.filename,
        file_path=file_path,
        status="uploaded"
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Call extraction API
    try:
        if MOCK_MODE:
            # Mock extraction response for development
            extraction_data = {
                "line_items": [
                    {
                        "description": "Hex bolt M8x50 stainless steel",
                        "quantity": 100,
                        "unit_price": 0.25
                    },
                    {
                        "description": "Washers flat M8 zinc plated",
                        "quantity": 200,
                        "unit_price": 0.05
                    },
                    {
                        "description": "Nuts hex M8 stainless",
                        "quantity": 100,
                        "unit_price": 0.15
                    }
                ]
            }
        else:
            with open(file_path, "rb") as f:
                files = {"file": (file.filename, f, "application/pdf")}
                response = requests.post(EXTRACTION_API, files=files)
                
            if response.status_code != 200:
                raise Exception(f"API returned {response.status_code}")
            extraction_data = response.json()
        
        # Save extracted line items
        for item_data in extraction_data.get("line_items", []):
            line_item = models.LineItem(
                document_id=db_document.id,
                description=item_data.get("description", ""),
                quantity=item_data.get("quantity", 0),
                unit_price=item_data.get("unit_price", 0.0),
                extracted_data=json.dumps(item_data)
            )
            db.add(line_item)
        
        db_document.status = "extracted"
        db.commit()
            
    except Exception as e:
        db_document.status = "extraction_failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")
    
    return schemas.DocumentResponse(
        id=db_document.id,
        filename=db_document.filename,
        status=db_document.status,
        upload_time=db_document.upload_time
    )

@app.get("/documents/{document_id}/items")
async def get_document_items(document_id: int, db: Session = Depends(get_db)):
    """Get extracted line items with matches"""
    
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    line_items = db.query(models.LineItem).filter(models.LineItem.document_id == document_id).all()
    
    # Get matches for each line item
    result = []
    for item in line_items:
        # Call matching API
        try:
            if MOCK_MODE:
                # Mock matching response
                mock_products = [
                    {"product_id": "HB-M8-50-SS", "description": "Hex Bolt M8x50mm Stainless Steel A2", "confidence": 0.95},
                    {"product_id": "HB-M8-40-SS", "description": "Hex Bolt M8x40mm Stainless Steel A2", "confidence": 0.85},
                    {"product_id": "HB-M8-60-SS", "description": "Hex Bolt M8x60mm Stainless Steel A2", "confidence": 0.80},
                ]
                
                if "washer" in item.description.lower():
                    matches = [
                        {"product_id": "WF-M8-ZP", "description": "Flat Washer M8 Zinc Plated", "confidence": 0.92},
                        {"product_id": "WF-M8-SS", "description": "Flat Washer M8 Stainless Steel", "confidence": 0.88},
                        {"product_id": "WS-M8-ZP", "description": "Spring Washer M8 Zinc Plated", "confidence": 0.75},
                    ]
                elif "nut" in item.description.lower():
                    matches = [
                        {"product_id": "NH-M8-SS", "description": "Hex Nut M8 Stainless Steel A2", "confidence": 0.93},
                        {"product_id": "NH-M8-ZP", "description": "Hex Nut M8 Zinc Plated", "confidence": 0.87},
                        {"product_id": "NL-M8-SS", "description": "Lock Nut M8 Stainless Steel", "confidence": 0.82},
                    ]
                else:
                    matches = mock_products
            else:
                payload = {"description": item.description}
                response = requests.post(MATCHING_API, json=payload)
                
                if response.status_code != 200:
                    matches = []
                else:
                    matches = response.json().get("matches", [])
            
            # Save matches to database
            for match_data in matches:
                existing_match = db.query(models.Match).filter(
                    models.Match.line_item_id == item.id,
                    models.Match.product_id == match_data.get("product_id")
                ).first()
                
                if not existing_match:
                    match = models.Match(
                        line_item_id=item.id,
                        product_id=match_data.get("product_id"),
                        product_description=match_data.get("description"),
                        confidence=match_data.get("confidence", 0.0),
                        verified=False
                    )
                    db.add(match)
            
            db.commit()
            
            result.append({
                "id": item.id,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "matches": matches
            })
                
        except Exception as e:
            result.append({
                "id": item.id,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "matches": [],
                "error": str(e)
            })
    
    return {"document_id": document_id, "line_items": result}

@app.post("/documents/{document_id}/verify")
async def verify_matches(document_id: int, verification_data: schemas.VerificationRequest, db: Session = Depends(get_db)):
    """Save user-verified matches"""
    
    for item_verification in verification_data.verified_items:
        # Update match as verified
        match = db.query(models.Match).filter(
            models.Match.line_item_id == item_verification.line_item_id,
            models.Match.product_id == item_verification.selected_product_id
        ).first()
        
        if match:
            # Reset all matches for this line item
            db.query(models.Match).filter(
                models.Match.line_item_id == item_verification.line_item_id
            ).update({models.Match.verified: False, models.Match.user_selected: False})
            
            # Mark selected match as verified
            match.verified = True
            match.user_selected = True
            
    # Update document status
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if document:
        document.status = "verified"
    
    db.commit()
    return {"message": "Verification saved successfully"}

@app.get("/documents/{document_id}/export")
async def export_matches(document_id: int, db: Session = Depends(get_db)):
    """Export verified matches as CSV"""
    
    # Get verified matches
    query = db.query(
        models.LineItem.description.label("line_item_description"),
        models.LineItem.quantity,
        models.LineItem.unit_price,
        models.Match.product_id,
        models.Match.product_description,
        models.Match.confidence
    ).join(
        models.Match, models.LineItem.id == models.Match.line_item_id
    ).filter(
        models.LineItem.document_id == document_id,
        models.Match.user_selected == True
    )
    
    # Convert to DataFrame
    results = query.all()
    if not results:
        raise HTTPException(status_code=404, detail="No verified matches found")
    
    df = pd.DataFrame([{
        "Line Item Description": r.line_item_description,
        "Quantity": r.quantity,
        "Unit Price": r.unit_price,
        "Matched Product ID": r.product_id,
        "Matched Product Description": r.product_description,
        "Confidence": r.confidence
    } for r in results])
    
    # Save to CSV
    csv_filename = f"matches_{document_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    csv_path = os.path.join("exports", csv_filename)
    os.makedirs("exports", exist_ok=True)
    df.to_csv(csv_path, index=False)
    
    return FileResponse(
        path=csv_path,
        filename=csv_filename,
        media_type="text/csv"
    )

@app.get("/documents")
async def list_documents(db: Session = Depends(get_db)):
    """List all processed documents"""
    documents = db.query(models.Document).all()
    return [schemas.DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        status=doc.status,
        upload_time=doc.upload_time
    ) for doc in documents]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)