from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from datetime import datetime

router = APIRouter(prefix="/retailer", tags=["Retailer"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username")
    if db_user.password != user.password:
        raise HTTPException(status_code=401, detail="Invalid password")
    if db_user.role != "retailer":
        raise HTTPException(status_code=403, detail="Not a retailer account")
    if db_user.status != "active":
        raise HTTPException(status_code=403, detail="Retailer account not active")

    return {"message": "Login successful"}

@router.get("/inventory/{retailer_id}")
def get_inventory(retailer_id: int, db: Session = Depends(get_db)):
    retailer = db.query(models.Retailer).filter(models.Retailer.id == retailer_id).first()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")

    products = db.query(models.Product).filter(models.Product.retailer_id == retailer.id).all()
    return products

@router.put("/order/{order_id}/dispatch")
def dispatch_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "Dispatched"
    db.commit()
    return {"message": "Order dispatched"}

@router.put("/order/{order_id}/deliver")
def deliver_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "Delivered"
    order.delivery_timestamp = datetime.utcnow()
    order.email_sent = True
    db.commit()
    return {"message": "Order delivered"}
@router.put("/inventory/update")
def update_inventory(update: schemas.InventoryUpdate, db: Session = Depends(get_db)):
    # Find the product for this retailer
    product = db.query(models.Product).filter(
        models.Product.retailer_id == update.retailer_id,
        models.Product.name == update.product_name
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update quantity
    product.quantity = update.new_qty
    
    # Update price if provided
    if update.price is not None:
        product.price = update.price
    
    # Update category if provided
    if update.category is not None:
        product.category = update.category
    
    db.commit()
    return {"message": "Inventory updated successfully"}

@router.get("/{retailer_id}/inventory")
def get_retailer_inventory(retailer_id: int, db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(
        models.Product.retailer_id == retailer_id
    ).all()
    return products