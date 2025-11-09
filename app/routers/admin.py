from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from app.utils.telegram_utils import send_telegram_message  # ✅ central utility
import requests

router = APIRouter(prefix="/admin", tags=["Admin"])

# ----------------------------
# Database Session Dependency
# ----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------------
# Admin Registration & Login
# ----------------------------
@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Invalid role for admin registration")

    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = models.User(
        username=user.username,
        email=user.email,
        password=user.password,  # ⚠️ plain text (demo only)
        role="admin",
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    send_telegram_message(f"🆕 *New Admin Registered*: {user.username}")

    return {"message": "Admin registered successfully", "user_id": new_user.id}


@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()

    if not db_user or user.password != db_user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if db_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    return {"message": "Login successful", "user_id": db_user.id}


# ----------------------------
# User Management
# ----------------------------
@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "status": u.status,
        }
        for u in users
    ]


# ----------------------------
# Retailer Management
# ----------------------------
@router.get("/retailers")
def get_all_retailers(db: Session = Depends(get_db)):
    retailers = db.query(models.Retailer).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "location": r.location,
            "status": "blocked" if getattr(r, "is_blocked", False) else "active",
            "rating": getattr(r, "rating", 4.5)
        }
        for r in retailers
    ]


@router.get("/pending-retailers")
def get_pending_retailers(db: Session = Depends(get_db)):
    pending = db.query(models.User).filter(
        models.User.role == "retailer", models.User.status == "pending"
    ).all()
    return [{"id": r.id, "username": r.username, "email": r.email} for r in pending]


@router.post("/approve-retailer/{retailer_id}")
def approve_retailer(retailer_id: int, db: Session = Depends(get_db)):
    retailer = db.query(models.User).filter(
        models.User.id == retailer_id, models.User.role == "retailer"
    ).first()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")

    retailer.status = "active"
    db.commit()

    # Email + Telegram alerts
    try:
        from app.email_utils import send_email
        send_email(
            to_email=retailer.email,
            subject="Retailer Approved",
            body=f"Hi {retailer.username}, your account has been approved! You can now log in and manage your inventory."
        )
    except Exception as e:
        print("⚠️ Email sending failed:", e)

    send_telegram_message(f"✅ Retailer *{retailer.username}* has been approved and activated.")

    return {"message": f"Retailer {retailer.username} approved"}


@router.post("/reject-retailer/{retailer_id}")
def reject_retailer(retailer_id: int, db: Session = Depends(get_db)):
    retailer = db.query(models.User).filter(
        models.User.id == retailer_id, models.User.role == "retailer"
    ).first()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")

    retailer.status = "rejected"
    db.commit()

    try:
        from app.email_utils import send_email
        send_email(
            to_email=retailer.email,
            subject="Retailer Registration Rejected",
            body=f"Hi {retailer.username}, unfortunately your registration was not approved."
        )
    except Exception as e:
        print("⚠️ Email sending failed:", e)

    send_telegram_message(f"🚫 Retailer *{retailer.username}* registration has been rejected.")
    return {"message": f"Retailer {retailer.username} rejected"}


@router.post("/block-retailer/{retailer_id}")
def block_retailer(retailer_id: int, db: Session = Depends(get_db)):
    retailer = db.query(models.Retailer).filter(models.Retailer.id == retailer_id).first()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")

    setattr(retailer, "is_blocked", True)
    db.commit()

    send_telegram_message(f"⚠️ Retailer *{retailer.name}* has been blocked by Admin.")
    return {"message": f"Retailer {retailer.name} blocked"}


# ----------------------------
# Product & Order Management
# ----------------------------
@router.get("/products")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "category": p.category,
            "quantity": p.quantity,
            "retailer_id": p.retailer_id
        }
        for p in products
    ]


@router.get("/orders")
def get_all_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    results = []

    for order in orders:
        items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
        customer = db.query(models.User).filter(models.User.id == order.customer_id).first()

        results.append({
            "id": order.id,
            "order_number": order.order_number,
            "customer": customer.username if customer else "Unknown",
            "total": order.total_price,
            "status": order.status,
            "items": [
                {"product_id": i.product_id, "quantity": i.quantity, "price": i.price}
                for i in items
            ],
        })

    return results


@router.post("/orders/{order_id}/approve")
def approve_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "approved"
    db.commit()

    send_telegram_message(
        f"🧾 *Order Approved!*\n"
        f"Order ID: {order.id}\n"
        f"Total: ₹{order.total_price}\n"
        f"Status: Approved ✅"
    )

    return {"message": f"Order #{order.id} approved successfully"}
