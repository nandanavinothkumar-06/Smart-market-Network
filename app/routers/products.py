from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["Products"])

# ✅ Get all products (for customers)
@router.get("/", response_model=List[schemas.ProductOut])
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    if not products:
        raise HTTPException(status_code=404, detail="No products found")
    return products

# ✅ Get all products for a specific retailer
@router.get("/retailer/{retailer_id}", response_model=List[schemas.ProductOut])
def get_products_by_retailer(retailer_id: int, db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(models.Product.retailer_id == retailer_id).all()
    if not products:
        raise HTTPException(status_code=404, detail="No products found for this retailer")
    return products

# ✅ Add a new product (for retailer/admin use)
@router.post("/", response_model=schemas.ProductOut)
def add_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    new_product = models.Product(**product.dict())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

# ✅ Update existing product
@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, product_update: schemas.ProductCreate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in product_update.dict().items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product

# ✅ Delete a product
@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": f"Product {product_id} deleted successfully"}
