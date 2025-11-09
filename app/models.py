from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String)  # customer, retailer, admin
    password = Column(String)
    status = Column(String, default="active")  # active, pending, rejected
    
    # Add relationships
    orders = relationship("Order", back_populates="customer")
    addresses = relationship("Address", back_populates="user")

class Retailer(Base):
    __tablename__ = "retailers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    location = Column(String)
    name = Column(String)
    deliverable = Column(Boolean, default=False)
    
    # Add relationships
    products = relationship("Product", back_populates="retailer")
    orders = relationship("Order", back_populates="retailer")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    retailer_id = Column(Integer, ForeignKey("retailers.id"))
    name = Column(String)
    price = Column(Float)
    quantity = Column(Integer)
    category = Column(String)
    
    # Add relationship
    retailer = relationship("Retailer", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

# NEW: Address model for delivery locations
class Address(Base):
    __tablename__ = "addresses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    address_line1 = Column(String)
    address_line2 = Column(String, nullable=True)
    city = Column(String)
    state = Column(String)
    pincode = Column(String)
    is_default = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="addresses")

# UPDATED: Enhanced Order model
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    retailer_id = Column(Integer, ForeignKey("retailers.id"))
    address_id = Column(Integer, ForeignKey("addresses.id"))  # NEW: Delivery address
    order_number = Column(String, unique=True, index=True)  # NEW: Unique order number
    total_price = Column(Float)
    status = Column(String, default="placed")  # placed, confirmed, dispatched, delivered, cancelled
    payment_status = Column(String, default="pending")  # NEW: pending, paid, failed
    order_date = Column(DateTime, default=datetime.utcnow)
    delivery_date = Column(DateTime, nullable=True)
    delivery_timestamp = Column(DateTime, nullable=True)
    email_sent = Column(Boolean, default=False)
    
    # Relationships
    customer = relationship("User", back_populates="orders")
    retailer = relationship("Retailer", back_populates="orders")
    address = relationship("Address")
    order_items = relationship("OrderItem", back_populates="order")
    notifications = relationship("Notification", back_populates="order")

# NEW: OrderItem model for multiple products in one order
class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    price = Column(Float)  # Price at time of order
    
    product = relationship("Product", back_populates="order_items")
    order = relationship("Order", back_populates="order_items")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    retailer_id = Column(Integer, ForeignKey("retailers.id"))
    user_id = Column(Integer, ForeignKey("users.id"))  # NEW: Link to user
    message = Column(String)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    
    # Relationship
    order = relationship("Order", back_populates="notifications")
    
