from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, SessionLocal
from app import models
import requests


# ------------------------------------------------------------
# Initialize FastAPI
# ------------------------------------------------------------
app = FastAPI(title="Smart Market Network API")

# ------------------------------------------------------------
# CORS Configuration
# ------------------------------------------------------------
origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Database Setup
# ------------------------------------------------------------
models.Base.metadata.create_all(bind=engine)

# ------------------------------------------------------------
# Load Default Inventory (only if empty)
# ------------------------------------------------------------
def load_inventory():
    db = SessionLocal()
    try:
        if db.query(models.Product).first():
            print("ℹ️ Inventory already populated — skipping.")
            return

        print("🚀 Populating Smart Market retailers for all cities...")

        cities = [
            "Vellore", "Katpadi", "Ranipet", "Thiruvannamalai",
            "Arani", "Gudiyatham", "Pallikonda", "Anaicut"
        ]
        retailer_names = ["FreshMart", "SmartBazaar", "QuickCart", "MegaStore", "UrbanShop"]

        product_catalog = {
            "Fruits": [
                {"name": "Apples", "price": 95, "quantity": 150},
                {"name": "Bananas", "price": 45, "quantity": 200},
                {"name": "Oranges", "price": 80, "quantity": 180},
                {"name": "Mangoes", "price": 120, "quantity": 100},
            ],
            "Vegetables": [
                {"name": "Tomatoes", "price": 40, "quantity": 250},
                {"name": "Potatoes", "price": 35, "quantity": 300},
                {"name": "Carrots", "price": 50, "quantity": 200},
                {"name": "Onions", "price": 45, "quantity": 220},
            ],
            "Dairy": [
                {"name": "Milk", "price": 52, "quantity": 150},
                {"name": "Curd", "price": 35, "quantity": 120},
                {"name": "Butter", "price": 120, "quantity": 80},
                {"name": "Cheese", "price": 160, "quantity": 70},
            ],
            "Bakery": [
                {"name": "Bread", "price": 40, "quantity": 100},
                {"name": "Croissant", "price": 60, "quantity": 80},
                {"name": "Muffins", "price": 75, "quantity": 90},
                {"name": "Buns", "price": 30, "quantity": 110},
            ],
            "Beverages": [
                {"name": "Green Tea", "price": 150, "quantity": 90},
                {"name": "Coffee Powder", "price": 210, "quantity": 75},
                {"name": "Soft Drink", "price": 45, "quantity": 300},
                {"name": "Fruit Juice", "price": 70, "quantity": 180},
            ],
            "Groceries": [
                {"name": "Rice", "price": 68, "quantity": 500},
                {"name": "Wheat Flour", "price": 50, "quantity": 400},
                {"name": "Sugar", "price": 56, "quantity": 300},
                {"name": "Salt", "price": 25, "quantity": 250},
                {"name": "Cooking Oil", "price": 165, "quantity": 200},
            ],
            "Home Care": [
                {"name": "Soap", "price": 38, "quantity": 250},
                {"name": "Shampoo", "price": 120, "quantity": 150},
                {"name": "Detergent", "price": 180, "quantity": 100},
                {"name": "Dish Wash", "price": 90, "quantity": 120},
            ]
        }

        import random
        for city in cities:
            for name in retailer_names:
                user = models.User(
                    username=f"{name.lower()}_{city.lower()}",
                    email=f"{name.lower()}_{city.lower()}@smartmarket.com",
                    password="1234",
                    role="retailer",
                    status="active"
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                retailer = models.Retailer(
                    user_id=user.id, location=city, name=name, deliverable=True
                )
                db.add(retailer)
                db.commit()
                db.refresh(retailer)

                selected_categories = random.sample(list(product_catalog.keys()), 4)
                for category in selected_categories:
                    items = random.sample(product_catalog[category], 2)
                    for item in items:
                        db.add(models.Product(
                            retailer_id=retailer.id,
                            name=item["name"],
                            price=item["price"],
                            quantity=item["quantity"],
                            category=category
                        ))

        db.commit()
        print("✅ Realistic retailers and product mix successfully added.")
    except Exception as e:
        print("❌ Error loading inventory:", e)
        db.rollback()
    finally:
        db.close()

# Load once at startup
load_inventory()

# ------------------------------------------------------------
# Routers Import and Registration
# ------------------------------------------------------------
from app.routers import customer, retailer, admin, orders, addresses, products, copilot
from app.utils import telegram_utils  # ✅ Import AFTER app creation

# ✅ Include all routers here
app.include_router(customer.router)
app.include_router(retailer.router)
app.include_router(admin.router)
app.include_router(orders.router)
app.include_router(addresses.router)
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(copilot.router, prefix="/api/copilot", tags=["Copilot"])
app.include_router(telegram_utils.router) 

# ------------------------------------------------------------
# Root Route
# ------------------------------------------------------------
@app.get("/")
def read_root():
    return {"msg": "✅ Smart Market Network backend is running!"}
