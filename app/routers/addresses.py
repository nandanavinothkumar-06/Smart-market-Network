from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])

# ✅ Create a new address
@router.post("/", response_model=schemas.Address)
def create_address(address: schemas.AddressCreate, db: Session = Depends(get_db)):
    db_address = models.Address(**address.dict())
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    return db_address

# ✅ Get all addresses for a user (for cart.html)
@router.get("/user/{user_id}", response_model=List[schemas.Address])
def get_user_addresses(user_id: int, db: Session = Depends(get_db)):
    addresses = db.query(models.Address).filter(models.Address.user_id == user_id).all()
    if not addresses:
        raise HTTPException(status_code=404, detail="No addresses found for this user")
    return addresses

# ✅ Update an existing address
@router.put("/{address_id}", response_model=schemas.Address)
def update_address(address_id: int, updated_address: schemas.AddressCreate, db: Session = Depends(get_db)):
    address = db.query(models.Address).filter(models.Address.id == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    for key, value in updated_address.dict().items():
        setattr(address, key, value)

    db.commit()
    db.refresh(address)
    return address

# ✅ Delete an address
@router.delete("/{address_id}")
def delete_address(address_id: int, db: Session = Depends(get_db)):
    address = db.query(models.Address).filter(models.Address.id == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()
    return {"message": f"Address {address_id} deleted successfully"}
