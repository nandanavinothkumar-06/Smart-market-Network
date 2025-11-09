from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(tags=["Retailer Copilot"])

@router.post("/summary")
def get_rule_based_summary(retailer_id: int, db: Session = Depends(get_db)):
    """
    Generate a local rule-based analytics summary for the retailer
    (No AI integration — fast and explainable)
    """
    products = db.query(models.Product).filter(models.Product.retailer_id == retailer_id).all()
    orders = db.query(models.Order).filter(models.Order.retailer_id == retailer_id).all()

    if not products:
        return {"summary": "No products found for this retailer."}

    total_products = len(products)
    total_stock = sum(p.quantity for p in products)
    avg_price = round(sum(p.price for p in products) / total_products, 2)
    low_stock = [p for p in products if p.quantity < 50]
    top_product = max(products, key=lambda p: p.quantity)
    revenue = sum(getattr(o, "total_price", 0) for o in orders)
    pending_orders = len([o for o in orders if o.status == "Pending"])
    accepted_orders = len([o for o in orders if o.status == "Accepted"])

    # --- Rule-based suggestions ---
    suggestions = []

    if low_stock:
        low_names = ", ".join(p.name for p in low_stock[:3])
        suggestions.append(f"🔁 Restock low inventory items: {low_names}...")
    if top_product:
        suggestions.append(f"🏆 Promote top-selling item: {top_product.name} — high demand!")
    if pending_orders > 5:
        suggestions.append(f"⚠️ {pending_orders} orders pending — optimize delivery workflow.")
    if revenue > 5000:
        suggestions.append("💸 Strong sales trend — consider seasonal offers or combos.")
    if avg_price < 50:
        suggestions.append("📊 Average product price is low — try adding premium SKUs.")

    if not suggestions:
        suggestions.append("✅ Inventory and sales look stable. Keep monitoring trends weekly.")

    summary = {
        "summary": (
            f"📦 {total_products} products | 💰 Avg Price ₹{avg_price} | "
            f"Orders: {pending_orders} pending, {accepted_orders} accepted | "
            f"Revenue: ₹{revenue:.2f}"
        ),
        "suggestions": suggestions,
    }

    return summary
