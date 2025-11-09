from fastapi import APIRouter, Request
import requests

router = APIRouter()

# 🔐 Telegram credentials
TELEGRAM_BOT_TOKEN = "8595205177:AAFrr0-RNqCPGvf9pGOt_It5H8X2qAke610"
TELEGRAM_CHAT_ID = "5965859600"

# ------------------------------------------------------------
# ✅ 1. Utility function (for direct message use)
# ------------------------------------------------------------
def send_telegram_message(message: str) -> bool:
    """Send a simple text message directly to Telegram."""
    try:
        telegram_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
        r = requests.post(telegram_url, json=payload)
        if r.status_code == 200:
            print("✅ Telegram message sent successfully.")
            return True
        else:
            print(f"⚠️ Telegram error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"❌ Telegram send failed: {e}")
        return False


# ------------------------------------------------------------
# ✅ 2. REST API route (for structured JSON order notifications)
# ------------------------------------------------------------
@router.post("/telegram/notify")
async def telegram_notify(request: Request):
    """Receive structured order data and send formatted Telegram message."""
    data = await request.json()

    order_no = data.get("order_no", "N/A")
    customer_id = data.get("customer_id", "N/A")
    retailer_id = data.get("retailer_id", "N/A")
    total = data.get("total", "0.00")
    address = data.get("address", "Not provided")
    status = data.get("status", "Placed")
    time = data.get("time", "N/A")
    items = data.get("items", [])

    products_text = "\n".join(
        [f"• {item['name']} (x{item['quantity']}) - ₹{item['subtotal']}" for item in items]
    ) or "No items found."

    message = (
        f"🛍️ *New Order Received!*\n\n"
        f"📦 *Order ID:* `{order_no}`\n"
        f"👤 *Customer:* `{customer_id}`\n"
        f"🏬 *Retailer:* `{retailer_id}`\n"
        f"💰 *Total:* ₹{total}\n"
        f"🕒 *Time:* {time}\n\n"
        f"🧾 *Items:*\n{products_text}\n\n"
        f"📍 *Address:* {address}\n\n"
        f"✅ *Status:* {status}"
    )

    # Send to Telegram
    telegram_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    r = requests.post(telegram_url, json=payload)

    return {"status": "sent" if r.status_code == 200 else "failed", "code": r.status_code}
