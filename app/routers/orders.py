from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid
import requests

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/orders", tags=["Orders"])


# ✅ Utility to generate unique order numbers
def generate_order_number() -> str:
    return f"ORD-{uuid.uuid4().hex[:8].upper()}"


@router.post("/", response_model=schemas.OrderResponse)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    """Create a new order, update inventory, and notify via Telegram."""
    if not order.order_items or len(order.order_items) == 0:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    try:
        # 1️⃣ Validate inventory and calculate total
        total_price = 0.0
        for item in order.order_items:
            product = (
                db.query(models.Product)
                .filter(models.Product.id == item.product_id)
                .with_for_update()
                .first()
            )
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            if product.quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for {product.name}. "
                           f"Available: {product.quantity}, Requested: {item.quantity}"
                )
            total_price += float(item.price) * int(item.quantity)

        # 2️⃣ Create the order
        order_number = generate_order_number()
        db_order = models.Order(
            order_number=order_number,
            customer_id=order.customer_id,
            retailer_id=order.retailer_id,
            address_id=order.address_id,
            total_price=total_price,
            status="placed",
            payment_status="pending",
            order_date=datetime.utcnow()
        )
        db.add(db_order)
        db.flush()

        # 3️⃣ Create OrderItems + update stock
        for item in order.order_items:
            db_item = models.OrderItem(
                order_id=db_order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=item.price
            )
            db.add(db_item)
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            product.quantity -= item.quantity

        db.commit()
        db.refresh(db_order)

        # 4️⃣ Send Telegram notification (formatted)
        try:
            # Fetch the full address from DB
            address_obj = db.query(models.Address).filter(models.Address.id == order.address_id).first()
            address_text = (
                f"{address_obj.address_line1}, {address_obj.city}, "
                f"{address_obj.state} - {address_obj.pincode}"
                if address_obj else "Address not found"
            )

            # Build items list
            items = [
                {
                    "name": db.query(models.Product).filter(models.Product.id == i.product_id).first().name,
                    "quantity": i.quantity,
                    "subtotal": float(i.price) * int(i.quantity)
                }
                for i in order.order_items
            ]

            telegram_data = {
                "order_no": order_number,
                "customer_id": order.customer_id,
                "retailer_id": order.retailer_id,
                "total": f"{total_price:.2f}",
                "address": address_text,
                "status": "Placed",
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "items": items
            }

            r = requests.post("http://127.0.0.1:8080/telegram/notify", json=telegram_data)
            if r.status_code == 200:
                print(f"✅ Telegram notification sent for order {order_number}")
            else:
                print(f"⚠️ Telegram API responded with {r.status_code}: {r.text}")
        except Exception as e:
            print(f"⚠️ Telegram send failed: {e}")

        return {
            "order": db_order,
            "message": "Order created successfully and inventory updated",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating order: {str(e)}")


# ✅ Get all orders by customer
@router.get("/user/{user_id}", response_model=List[schemas.Order])
def get_user_orders(user_id: int, db: Session = Depends(get_db)):
    orders = (
        db.query(models.Order)
        .filter(models.Order.customer_id == user_id)
        .order_by(models.Order.order_date.desc())
        .all()
    )
    return orders


# ✅ Get all orders by retailer
@router.get("/retailer/{retailer_id}", response_model=List[schemas.Order])
def get_retailer_orders(retailer_id: int, db: Session = Depends(get_db)):
    orders = (
        db.query(models.Order)
        .filter(models.Order.retailer_id == retailer_id)
        .order_by(models.Order.order_date.desc())
        .all()
    )
    return orders


# ✅ Update order status (e.g., Approved, Shipped, Delivered)
@router.put("/{order_id}/status")
def update_order_status(
    order_id: int, status_update: schemas.OrderStatusUpdate, db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status_update.status

    # Automatically set delivery timestamp if delivered
    if status_update.status.lower() == "delivered":
        order.delivery_timestamp = datetime.utcnow()
        msg = (
            f"📦 *Order Delivered!*\n"
            f"🆔 Order ID: {order.id}\n"
            f"💰 Total: ₹{order.total_price:.2f}\n"
            f"✅ Status: Delivered"
        )
    elif status_update.status.lower() == "approved":
        msg = (
            f"✅ *Order Approved!*\n"
            f"🆔 Order ID: {order.id}\n"
            f"📦 Status: Approved"
        )
    elif status_update.status.lower() == "shipped":
        msg = (
            f"🚚 *Order Shipped!*\n"
            f"🆔 Order ID: {order.id}\n"
            f"📍 Status: Shipped"
        )
    else:
        msg = f"ℹ️ Order #{order.id} updated to status: {status_update.status}"

    db.commit()

    # Telegram update message
    try:
        payload = {"message": msg}
        requests.post("http://127.0.0.1:8080/telegram/notify", json=payload)
        print(f"✅ Telegram message sent for status update: {status_update.status}")
    except Exception as e:
        print(f"⚠️ Telegram send failed: {e}")

    return {"message": "Order status updated successfully"}
