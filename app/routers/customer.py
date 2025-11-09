from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List
from app.email_utils import send_email



router = APIRouter(prefix="/customer", tags=["Customer"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if user.role != "customer":
        raise HTTPException(status_code=403, detail="Invalid role for customer registration")
    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Store password as plain text (NOT recommended for production)
    new_user = models.User(username=user.username, email=user.email, password=user.password, role="customer", status="active")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Customer registered successfully", "user_id": new_user.id}

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()

    # Simple password check (plain text)
    if not db_user or user.password != db_user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if db_user.role != "customer":
        raise HTTPException(status_code=403, detail="Unauthorized")

    return {"message": "Login successful", "user_id": db_user.id}

@router.get("/cities")
def get_cities(db: Session = Depends(get_db)):
    locations = db.query(models.Retailer.location).distinct().all()
    return {"cities": list(set([loc[0] for loc in locations]))}

@router.get("/retailers/{city}")
def get_retailers_by_city(city: str, db: Session = Depends(get_db)):
    shops = db.query(models.Retailer).filter(models.Retailer.location == city).all()
    return [{"id": shop.id, "name": shop.name} for shop in shops]

@router.get("/products/{retailer_id}", response_model=list[schemas.ProductOut])
async def get_products(retailer_id: int, db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(models.Product.retailer_id == retailer_id).all()

    # Filter out bad/null data
    valid_products = [
        p for p in products if p.price is not None and p.category is not None
    ]

    return valid_products

@router.post("/order")
def place_multiple_orders(orders: List[schemas.OrderCreate], db: Session = Depends(get_db)):
    total = 0
    for order in orders:
        product = db.query(models.Product).filter(
            models.Product.retailer_id == order.retailer_id,
            models.Product.name == order.product
        ).first()

        if not product or product.quantity < order.quantity:
            raise HTTPException(status_code=400, detail=f"{order.product} unavailable or not enough stock")

        cost = product.price * order.quantity
        total += cost
        product.quantity -= order.quantity

        new_order = models.Order(
            customer_id=1,  # Replace with real session later
            retailer_id=order.retailer_id,
            product=order.product,
            quantity=order.quantity,
            total_price=cost
        )
        db.add(new_order)
        notification = models.Notification(
            retailer_id=order.retailer_id,
            message=f"New order from customer #{new_order.customer_id}: {order.quantity} x {order.product}"
        )
        db.add(notification)

        # Send email to customer
        customer = db.query(models.User).filter(models.User.id == new_order.customer_id).first()
        send_email(
            # to_email=customer.username + "@gmail.com",  # Replace with real email if stored
            to_email="bsarathy2241@gmail.com",
            subject="Your Order Confirmation",
            body=f"You ordered {order.quantity} x {order.product} from Retailer #{order.retailer_id}.\nTotal: ₹{cost:.2f}"  
        )

        # Send email to retailer
        retailer_user = db.query(models.User).join(models.Retailer).filter(models.Retailer.id == order.retailer_id).first()
        send_email(
            # to_email=retailer_user.username + "@gmail.com",  # Replace with real email if stored
            to_email="sarathybhas@gmail.com",
            subject="New Order Received",
            body=f"Customer #{new_order.customer_id} ordered {order.quantity} x {order.product}.\nTotal: ₹{cost:.2f}"
        )


    db.commit()
    return {"message": "All items ordered!", "grand_total": total}