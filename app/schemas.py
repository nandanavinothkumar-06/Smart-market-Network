from pydantic import BaseModel, Field
from typing import List, Any, Optional
from datetime import datetime

# ------------------ USER ------------------
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str  # 'customer', 'retailer', 'admin'

class UserLogin(BaseModel):
    username: str
    password: str


# ------------------ ADDRESS ------------------
class AddressBase(BaseModel):
    user_id: int
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    pincode: str
    is_default: bool = False

class AddressCreate(AddressBase):
    pass

class Address(AddressBase):
    id: int

    class Config:
        orm_mode = True



# ------------------ PRODUCT ------------------
class ProductBase(BaseModel):
    name: str
    price: float
    quantity: int
    category: str
    retailer_id: int

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int

    class Config:
        orm_mode = True

class InventoryUpdate(BaseModel):
    retailer_id: int
    product_name: str
    new_qty: int
    price: Optional[float] = None
    category: Optional[str] = None


# ------------------ ORDER ITEM ------------------
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    order_id: int

    class Config:
        from_attributes = True


# ------------------ ORDER ------------------
class OrderBase(BaseModel):
    retailer_id: int
    address_id: int
    total_price: float

class OrderCreate(BaseModel):
    customer_id: int
    retailer_id: int
    address_id: int
    order_items: List[OrderItemCreate]

class OrderStatusUpdate(BaseModel):
    status: str  # placed, confirmed, dispatched, delivered, cancelled

class OrderPaymentUpdate(BaseModel):
    payment_status: str  # pending, paid, failed

class Order(OrderBase):
    id: int
    customer_id: int
    order_number: str
    status: str
    payment_status: str
    order_date: datetime
    delivery_date: Optional[datetime] = None
    delivery_timestamp: Optional[datetime] = None
    email_sent: bool = False
    order_items: List[OrderItem] = Field(default_factory=list)
    address: Optional[Address] = None  # Include full address

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    id: int
    order_number: str
    customer_id: int
    retailer_id: int
    total_price: float
    status: str
    payment_status: str
    order_date: datetime
    delivery_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ------------------ RETAILER ------------------
class RetailerOut(BaseModel):
    id: int
    user_id: int
    location: str
    name: str
    deliverable: bool

    class Config:
        from_attributes = True


# ------------------ NOTIFICATIONS ------------------
class NotificationOut(BaseModel):
    id: int
    message: str
    is_read: bool
    timestamp: datetime
    order_id: Optional[int] = None

    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    retailer_id: int
    user_id: int
    message: str
    order_id: Optional[int] = None


# ------------------ CART ------------------
class CartItemBase(BaseModel):
    product_id: int
    quantity: int

class CartItemCreate(CartItemBase):
    pass

class CartItem(CartItemBase):
    id: int
    user_id: int
    product: ProductOut

    class Config:
        from_attributes = True


# ------------------ RESPONSE MODELS ------------------
class OrderResponse(BaseModel):
    order: Order
    message: str

class AddressResponse(BaseModel):
    address: Address
    message: str

class OrderListResponse(BaseModel):
    orders: List[OrderSummary]
    total: int

class AddressListResponse(BaseModel):
    addresses: List[Address]
    total: int
