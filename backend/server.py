from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from starlette.middleware.cors import CORSMiddleware
import os
import uuid
import logging
from datetime import datetime, timezone

from config import db, ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE, ROLE_DATA_ENTRY, ROLE_VERIFICATION, STAFF_ROLES, close_db
from models import *
from helpers import (
    hash_password, verify_password, create_jwt, get_current_user, require_role,
    to_public_user, _normalize_checklist, _next_parcel_number, _next_courier_number,
    parcel_doc_to_out
)

# Create main app
app = FastAPI(title="Warehouse Management System")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# =========================
# Helper Functions for Couriers
# =========================
def courier_doc_to_out(doc: dict) -> dict:
    created_at = doc.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    products = []
    for p in doc.get('products', []):
        p_created = p.get('created_at')
        if isinstance(p_created, str):
            p_created = datetime.fromisoformat(p_created)
        products.append({
            'id': p['id'],
            'name': p['name'],
            'quantity': int(p.get('quantity', 0)),
            'photo': p.get('photo'),
            'damaged': bool(p.get('damaged', False)),
            'damaged_count': int(p.get('damaged_count', 0)),
            'category': p.get('category'),
            'brand': p.get('brand'),
            'code': p.get('code'),
            'description': p.get('description'),
            'price': float(p['price']) if p.get('price') is not None else None,
            'supplier': p.get('supplier'),
            'invoice_number': p.get('invoice_number'),
            'cost_per_unit': float(p['cost_per_unit']) if p.get('cost_per_unit') is not None else None,
            'gst_percent': float(p['gst_percent']) if p.get('gst_percent') is not None else None,
            'data_entry_done': bool(p.get('data_entry_done', False)),
            'verification_done': bool(p.get('verification_done', False)),
            'created_at': p_created,
        })
    total_qty = sum(p['quantity'] for p in products)
    data_entry_done_count = sum(1 for p in products if p.get('data_entry_done'))
    verification_done_count = sum(1 for p in products if p.get('verification_done'))
    return {
        'id': doc['id'],
        'courier_number': doc['courier_number'],
        'courier_company': doc.get('courier_company'),
        'tracking_number': doc.get('tracking_number'),
        'receiver_name': doc.get('receiver_name'),
        'num_packages': doc['num_packages'],
        'slip_photo': doc.get('slip_photo'),
        'package_photo': doc.get('package_photo'),
        'products': products,
        'handled_by': doc.get('handled_by'),
        'charges': doc.get('charges'),
        'payment_made': doc.get('payment_made', False),
        'payment_mode': doc.get('payment_mode'),
        'total_quantity': total_qty,
        'checklist': _normalize_checklist(doc.get('checklist')),
        'accepted': bool(doc.get('accepted', False)),
        'accepted_at': doc.get('accepted_at'),
        'accepted_by': doc.get('accepted_by'),
        'rejected': bool(doc.get('rejected', False)),
        'rejected_reason': doc.get('rejected_reason'),
        'rejected_at': doc.get('rejected_at'),
        'rejected_by': doc.get('rejected_by'),
        'owner_approved': bool(doc.get('owner_approved', False)),
        'owner_approved_at': doc.get('owner_approved_at'),
        'owner_approved_by': doc.get('owner_approved_by'),
        'owner_rejected': bool(doc.get('owner_rejected', False)),
        'owner_rejected_reason': doc.get('owner_rejected_reason'),
        'owner_rejected_at': doc.get('owner_rejected_at'),
        'owner_rejected_by': doc.get('owner_rejected_by'),
        'status': doc.get('status', 'pending_owner_approval'),
        'sent_to_data_entry': bool(doc.get('sent_to_data_entry', False)),
        'sent_to_owner': bool(doc.get('sent_to_owner', False)),
        'sent_to_owner_at': doc.get('sent_to_owner_at'),
        'sent_to_owner_by': doc.get('sent_to_owner_by'),
        'ready_for_verification': bool(doc.get('ready_for_verification', False)),
        'ready_for_verification_at': doc.get('ready_for_verification_at'),
        'verification_complete': bool(doc.get('verification_complete', False)),
        'verification_complete_at': doc.get('verification_complete_at'),
        'verification_complete_by': doc.get('verification_complete_by'),
        'data_entry_done_count': data_entry_done_count,
        'verification_done_count': verification_done_count,
        'attachments': doc.get('attachments') or [],
        'created_at': created_at,
        'created_by_name': doc.get('created_by_name', 'Cashier'),


             # ========== ADD THESE MISSING DOCUMENT FIELDS ==========
        'upload_list_text': doc.get('upload_list_text'),
        'upload_list_photo': doc.get('upload_list_photo'),
        'upload_list_type': doc.get('upload_list_type'),
        'upload_list_name': doc.get('upload_list_name'),
        'invoice_photo': doc.get('invoice_photo'),
        'invoice_name': doc.get('invoice_name'),
    }

def _apply_item_into_products(products: list, body: CourierItemAdd, now_iso: str) -> list:
    name_clean = body.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Item name is required.")
    if body.photo and len(body.photo) > 6_000_000:
        raise HTTPException(status_code=400, detail="Item photo is too large (max ~4MB).")
    damaged_flag = bool(body.damaged) and body.damaged_count > 0
    damaged_count = int(body.damaged_count) if damaged_flag else 0
    if damaged_count > body.quantity:
        raise HTTPException(status_code=400, detail=f"{name_clean}: damaged count cannot exceed quantity.")
    
    def _clean(v):
        if v is None:
            return None
        s = str(v).strip()
        return s or None
    
    new_fields = {
        'category': _clean(body.category),
        'brand': _clean(body.brand),
        'code': _clean(body.code),
        'description': _clean(body.description),
        'price': float(body.price) if body.price is not None else None,
    }
    
    out = list(products)
    match_idx = next((i for i, p in enumerate(out) if (p.get('name') or '').strip().lower() == name_clean.lower()), -1)
    if match_idx >= 0:
        existing = out[match_idx]
        new_qty = int(existing.get('quantity', 0)) + int(body.quantity)
        new_dmg = int(existing.get('damaged_count', 0)) + damaged_count
        merged = {
            **existing,
            'name': name_clean,
            'quantity': new_qty,
            'damaged': bool(existing.get('damaged', False) or damaged_flag or new_dmg > 0),
            'damaged_count': new_dmg,
            'photo': body.photo if body.photo else existing.get('photo'),
            'updated_at': now_iso,
        }
        for k, v in new_fields.items():
            if v is not None:
                merged[k] = v
        out[match_idx] = merged
    else:
        out.append({
            'id': str(uuid.uuid4()),
            'name': name_clean,
            'quantity': int(body.quantity),
            'photo': body.photo,
            'damaged': damaged_flag,
            'damaged_count': damaged_count,
            **new_fields,
            'created_at': now_iso,
        })
    return out

# =========================
# Startup: seed demo accounts
# =========================
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index('email', unique=True)
        await db.users.create_index('id', unique=True)
    except Exception as e:
        logging.warning(f"Index creation warning: {e}")
    
    demo_accounts = [
        {'email': 'owner@warehouse.com', 'password': 'Owner@123', 'full_name': 'Demo Owner', 'role': ROLE_OWNER},
        {'email': 'cashier@warehouse.com', 'password': 'Cashier@123', 'full_name': 'Demo Cashier', 'role': ROLE_CASHIER},
        {'email': 'warehouse@warehouse.com', 'password': 'Warehouse@123', 'full_name': 'Demo Warehouse Staff', 'role': ROLE_WAREHOUSE},
        {'email': 'dataentry@warehouse.com', 'password': 'DataEntry@123', 'full_name': 'Demo Data Entry Staff', 'role': ROLE_DATA_ENTRY},
        {'email': 'verification@warehouse.com', 'password': 'Verify@123', 'full_name': 'Demo Verification Staff', 'role': ROLE_VERIFICATION},
    ]
    for acc in demo_accounts:
        existing = await db.users.find_one({'email': acc['email']})
        if not existing:
            doc = {
                'id': str(uuid.uuid4()),
                'email': acc['email'],
                'password_hash': hash_password(acc['password']),
                'full_name': acc['full_name'],
                'role': acc['role'],
                'created_at': datetime.now(timezone.utc).isoformat(),
                'created_by': 'system',
            }
            try:
                await db.users.insert_one(doc)
                logging.info(f"Seeded demo {acc['role']}: {acc['email']}")
            except Exception as e:
                logging.warning(f"Seed skipped for {acc['email']}: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    close_db()

# =========================
# Basic Routes
# =========================
@api_router.get("/")
async def root():
    return {"message": "Warehouse Management System API", "status": "ok"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# =========================
# Auth Routes
# =========================
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    user = await db.users.find_one({'email': body.email.lower().strip()}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user['role'] != body.role:
        raise HTTPException(status_code=403, detail="This account does not belong to the selected role.")
    if not verify_password(body.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_jwt(user)
    return {"token": token, "user": to_public_user(user)}

@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return to_public_user(user)

# =========================
# Owner Routes (Staff Management)
# =========================
@api_router.post("/owner/staff", response_model=UserPublic, status_code=201)
async def create_staff(body: CreateStaffRequest, owner: dict = Depends(require_role(ROLE_OWNER))):
    email = body.email.lower().strip()
    existing = await db.users.find_one({'email': email})
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")
    doc = {
        'id': str(uuid.uuid4()),
        'email': email,
        'password_hash': hash_password(body.password),
        'full_name': body.full_name.strip(),
        'role': body.role,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': owner['id'],
    }
    await db.users.insert_one(doc)
    return to_public_user(doc)

@api_router.get("/owner/staff", response_model=list[UserPublic])
async def list_staff(owner: dict = Depends(require_role(ROLE_OWNER))):
    cursor = db.users.find({'role': {'$in': STAFF_ROLES}}, {'_id': 0}).sort('created_at', -1)
    docs = await cursor.to_list(1000)
    return [to_public_user(d) for d in docs]

@api_router.delete("/owner/staff/{user_id}")
async def delete_staff(user_id: str, owner: dict = Depends(require_role(ROLE_OWNER))):
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Staff not found.")
    if target['role'] == ROLE_OWNER:
        raise HTTPException(status_code=400, detail="Cannot delete an Owner account.")
    await db.users.delete_one({'id': user_id})
    return {"success": True, "id": user_id}

# =========================
# Owner Approval Routes (Cashier → Owner approval)
# =========================
@api_router.get("/owner/pending-cashier-couriers", response_model=list[CourierOut])
async def get_pending_cashier_couriers(user: dict = Depends(require_role(ROLE_OWNER))):
    """Get couriers created by Cashier waiting for Owner approval"""
    cursor = db.couriers.find(
        {
            '$or': [
                {'owner_approved': {'$exists': False}},
                {'owner_approved': False}
            ],
            'owner_rejected': {'$ne': True},
            'status': {'$ne': 'warehouse_processing'},
            'accepted': {'$ne': True}
        },
        {'_id': 0}
    ).sort('created_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.get("/cashier/owner-rejected-couriers", response_model=list[CourierOut])
async def get_owner_rejected_couriers(user: dict = Depends(require_role(ROLE_CASHIER))):
    """Get couriers rejected by Owner, waiting for Cashier to fix"""
    cursor = db.couriers.find(
        {
            'owner_rejected': True,
            'status': 'owner_rejected'
        },
        {'_id': 0}
    ).sort('owner_rejected_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.get("/warehouse/pending-couriers", response_model=list[CourierOut])
async def get_pending_warehouse_couriers(user: dict = Depends(require_role(ROLE_WAREHOUSE))):
    """Get couriers approved by Owner, waiting for Warehouse acceptance"""
    cursor = db.couriers.find(
        {
            'owner_approved': True,
            'accepted': {'$ne': True},
            'rejected': {'$ne': True},
            'status': 'owner_approved'
        },
        {'_id': 0}
    ).sort('owner_approved_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.patch("/couriers/{cid}/owner-approve", response_model=CourierOut)
async def owner_approve_courier(
    cid: str, 
    body: AcceptCourierBody, 
    user: dict = Depends(require_role(ROLE_OWNER))
):
    """Owner approves courier created by Cashier, sends to Warehouse queue"""
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    if doc.get('owner_approved'):
        raise HTTPException(status_code=400, detail="Courier already approved by Owner.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.couriers.update_one({'id': cid}, {'$set': {
        'owner_approved': bool(body.accepted),
        'owner_approved_at': now_iso if body.accepted else None,
        'owner_approved_by': user['full_name'] if body.accepted else None,
        'status': 'owner_approved' if body.accepted else 'owner_rejected'
    }})
    
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.patch("/couriers/{cid}/owner-reject", response_model=CourierOut)
async def owner_reject_courier(
    cid: str, 
    body: RejectCourierBody, 
    user: dict = Depends(require_role(ROLE_OWNER))
):
    """Owner rejects courier, sends back to Cashier for fixes"""
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    reason = (body.reason or '').strip()
    
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required.")
    
    print(f"DEBUG: Rejecting courier {cid} with reason: {reason}")
    
    await db.couriers.update_one(
        {'id': cid}, 
        {'$set': {
            'owner_rejected': True,
            'owner_rejected_reason': reason,
            'owner_rejected_at': now_iso,
            'owner_rejected_by': user['full_name'],
            'status': 'owner_rejected',
            'accepted': False,
            'accepted_at': None,
            'accepted_by': None,
            'rejected': False,
            'rejected_reason': None,
            'rejected_at': None,
            'rejected_by': None,
            'owner_approved': False,
            'owner_approved_at': None,
            'owner_approved_by': None,
        }}
    )
    
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    print(f"DEBUG: After update - owner_rejected_reason: {updated.get('owner_rejected_reason')}")
    
    return courier_doc_to_out(updated)

# =========================
# Parcel Routes (Incoming)
# =========================
@api_router.post("/parcels", response_model=ParcelOut, status_code=201)
async def create_parcel(body: ParcelCreate, user: dict = Depends(require_role(ROLE_WAREHOUSE))):
    if body.payment_made and not body.payment_mode:
        raise HTTPException(status_code=400, detail="Payment mode is required when payment is made.")
    if not body.payment_made:
        body.payment_mode = None
    if body.carton_photo and len(body.carton_photo) > 6_000_000:
        raise HTTPException(status_code=400, detail="Carton photo is too large (max ~4MB).")
    
    now = datetime.now(timezone.utc)
    parcel_number = await _next_parcel_number()
    products = [{
        'id': str(uuid.uuid4()),
        'name': p.name.strip(),
        'quantity': int(p.quantity),
        'created_at': now.isoformat(),
    } for p in body.products]
    
    doc = {
        'id': str(uuid.uuid4()),
        'parcel_number': parcel_number,
        'company_name': (body.company_name.strip() if body.company_name else None) or None,
        'num_packages': int(body.num_packages),
        'carton_photo': body.carton_photo,
        'products': products,
        'submitted_by': (body.submitted_by.strip() if body.submitted_by else None) or None,
        'payment_made': bool(body.payment_made),
        'payment_mode': body.payment_mode,
        'created_at': now.isoformat(),
        'created_by': user['id'],
        'created_by_name': user['full_name'],
    }
    await db.parcels.insert_one(doc)
    return parcel_doc_to_out(doc)

@api_router.post("/parcels/batch", status_code=201)
async def create_parcels_batch(body: BatchParcelCreate, user: dict = Depends(require_role(ROLE_WAREHOUSE))):
    for idx, e in enumerate(body.entries):
        if e.payment_made and not e.payment_mode:
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1}: payment mode is required when payment is made.")
        if not e.payment_made:
            e.payment_mode = None
        if e.carton_photo and len(e.carton_photo) > 6_000_000:
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1}: carton photo is too large (max ~4MB).")
    
    submitted_by = (body.submitted_by.strip() if body.submitted_by else None) or None
    now = datetime.now(timezone.utc)
    created = []
    for e in body.entries:
        parcel_number = await _next_parcel_number()
        products = [{
            'id': str(uuid.uuid4()),
            'name': p.name.strip(),
            'quantity': int(p.quantity),
            'created_at': now.isoformat(),
        } for p in e.products]
        doc = {
            'id': str(uuid.uuid4()),
            'parcel_number': parcel_number,
            'company_name': (e.company_name.strip() if e.company_name else None) or None,
            'num_packages': int(e.num_packages),
            'carton_photo': e.carton_photo,
            'products': products,
            'submitted_by': submitted_by,
            'payment_made': bool(e.payment_made),
            'payment_mode': e.payment_mode,
            'created_at': now.isoformat(),
            'created_by': user['id'],
            'created_by_name': user['full_name'],
        }
        await db.parcels.insert_one(doc)
        created.append(parcel_doc_to_out(doc))
    return {"created": created, "count": len(created)}

@api_router.get("/parcels", response_model=list[ParcelOut])
async def list_parcels(user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    cursor = db.parcels.find({}, {'_id': 0}).sort('created_at', -1)
    docs = await cursor.to_list(1000)
    return [parcel_doc_to_out(d) for d in docs]

@api_router.get("/parcels/{parcel_id}", response_model=ParcelOut)
async def get_parcel(parcel_id: str, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    doc = await db.parcels.find_one({'id': parcel_id}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Parcel not found.")
    return parcel_doc_to_out(doc)

@api_router.delete("/parcels/{parcel_id}")
async def delete_parcel(parcel_id: str, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    res = await db.parcels.delete_one({'id': parcel_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parcel not found.")
    return {"success": True, "id": parcel_id}

@api_router.get("/parcels/stats/summary")
async def parcels_summary(user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    total_parcels = await db.parcels.count_documents({})
    paid = await db.parcels.count_documents({'payment_made': True})
    unpaid = total_parcels - paid
    pipeline = [
        {'$project': {'num_packages': 1, 'total_qty': {'$sum': '$products.quantity'}}},
        {'$group': {'_id': None, 'packages': {'$sum': '$num_packages'}, 'units': {'$sum': '$total_qty'}}}
    ]
    agg = await db.parcels.aggregate(pipeline).to_list(1)
    packages = agg[0]['packages'] if agg else 0
    units = agg[0]['units'] if agg else 0
    return {
        'total_parcels': total_parcels,
        'paid': paid,
        'unpaid': unpaid,
        'total_packages': packages,
        'total_units': units,
    }

# =========================
# Courier Routes (Outgoing - Cashier creates with owner_approved=False)
# =========================
@api_router.post("/couriers/batch", status_code=201)
async def create_couriers_batch(body: CourierBatchCreate, user: dict = Depends(require_role(ROLE_CASHIER))):
    for idx, e in enumerate(body.entries):
        if e.payment_made and not e.payment_mode:
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1}: payment mode is required when payment is made.")
        if not e.payment_made:
            e.payment_mode = None
        if e.slip_photo and len(e.slip_photo) > 6_000_000:
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1}: slip photo is too large (max ~4MB).")
        if e.package_photo and len(e.package_photo) > 6_000_000:
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1}: package photo is too large (max ~4MB).")
    
    handled_by = (body.handled_by.strip() if body.handled_by else None) or None
    now = datetime.now(timezone.utc)
    created = []
    for e in body.entries:
        courier_number = await _next_courier_number(now)
        products = [{
            'id': str(uuid.uuid4()),
            'name': p.name.strip(),
            'quantity': int(p.quantity),
            'created_at': now.isoformat(),
        } for p in e.products]
        doc = {
            'id': str(uuid.uuid4()),
            'courier_number': courier_number,
            'courier_company': (e.courier_company.strip() if e.courier_company else None) or None,
            'tracking_number': (e.tracking_number.strip() if e.tracking_number else None) or None,
            'receiver_name': (e.receiver_name.strip() if e.receiver_name else None) or None,
            'num_packages': int(e.num_packages),
            'slip_photo': e.slip_photo,
            'package_photo': e.package_photo,
            'products': products,
            'handled_by': handled_by,
            'charges': float(e.charges) if e.charges is not None else None,
            'payment_made': bool(e.payment_made),
            'payment_mode': e.payment_mode,
            'attachments': [],
            'created_at': now.isoformat(),
            'created_by': user['id'],
            'created_by_name': user['full_name'],
            'owner_approved': False,
            'owner_rejected': False,
            'status': 'pending_owner_approval',
        }
        await db.couriers.insert_one(doc)
        created.append(courier_doc_to_out(doc))
    return {"created": created, "count": len(created)}

@api_router.get("/couriers", response_model=list[CourierOut])
async def list_couriers(user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE))):
    cursor = db.couriers.find({}, {'_id': 0}).sort('created_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.get("/couriers/rejected", response_model=list[CourierOut])
async def list_rejected_couriers(user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER))):
    cursor = db.couriers.find({'rejected': True}, {'_id': 0}).sort('rejected_at', -1)
    docs = await cursor.to_list(500)
    return [courier_doc_to_out(d) for d in docs]

@api_router.delete("/couriers/{cid}")
async def delete_courier(cid: str, user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE))):
    res = await db.couriers.delete_one({'id': cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    return {"success": True, "id": cid}

# =========================
# Update Courier (for Cashier editing rejected couriers)
# =========================
# =========================
# Update Courier (for Cashier editing rejected couriers & Owner uploading documents)
# =========================
@api_router.patch("/couriers/{cid}", response_model=CourierOut)
async def update_courier(
    cid: str, 
    body: dict,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE))
):
    """Update courier fields - used by Cashier when editing rejected couriers and Owner uploading documents"""
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    update_fields = {}
    
    # Updated allowed fields - ADDED document upload fields
    allowed_fields = [
        'courier_company', 'num_packages', 'handled_by', 
        'payment_made', 'payment_mode', 'charges', 'vehicle',
        'transport_charge', 'transport_vehicle', 'transport_payment_mode',
        'slip_photo', 'package_photo',
        # ===== ADD THESE DOCUMENT UPLOAD FIELDS =====
        'upload_list_text',
        'upload_list_photo',
        'upload_list_type',
        'upload_list_name',
        'upload_list_mime',
        'invoice_photo',
        'invoice_name',
        'invoice_mime'
    ]
    
    for field in allowed_fields:
        if field in body and body[field] is not None:
            if field == 'num_packages':
                update_fields[field] = int(body[field])
            elif field in ['charges', 'transport_charge']:
                if body[field] != "":
                    update_fields[field] = float(body[field])
                else:
                    update_fields[field] = None
            else:
                update_fields[field] = body[field]
        elif field in body and body[field] is None:
            update_fields[field] = None
        elif field in body and body[field] == "":
            update_fields[field] = None
    
    if update_fields:
        update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
        update_fields['updated_by'] = user['full_name']
        await db.couriers.update_one({'id': cid}, {'$set': update_fields})
        print(f"DEBUG: Updated fields for courier {cid}: {list(update_fields.keys())}")
        print(f"DEBUG: upload_list_text set to: {update_fields.get('upload_list_text')}")
        print(f"DEBUG: upload_list_photo set to: {'Present' if update_fields.get('upload_list_photo') else 'Not set'}")
        print(f"DEBUG: invoice_photo set to: {'Present' if update_fields.get('invoice_photo') else 'Not set'}")
    
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)
# Warehouse Checklist & Accept/Reject
# =========================
@api_router.patch("/couriers/{cid}/accept", response_model=CourierOut)
async def accept_courier(cid: str, body: AcceptCourierBody, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    if not doc.get('owner_approved'):
        raise HTTPException(status_code=400, detail="Courier must be approved by Owner before Warehouse can accept.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    update = {
        'accepted': bool(body.accepted),
        'accepted_at': now_iso if body.accepted else None,
        'accepted_by': user['full_name'] if body.accepted else None,
        'status': 'warehouse_processing' if body.accepted else 'warehouse_rejected',
    }
    if body.accepted:
        update.update({'rejected': False, 'rejected_reason': None, 'rejected_at': None, 'rejected_by': None})
    await db.couriers.update_one({'id': cid}, {'$set': update})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.patch("/couriers/{cid}/reject", response_model=CourierOut)
async def reject_courier(cid: str, body: RejectCourierBody, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    if not doc.get('owner_approved'):
        raise HTTPException(status_code=400, detail="Courier must be approved by Owner before Warehouse can reject.")
    
    if doc.get('sent_to_data_entry'):
        raise HTTPException(status_code=400, detail="Courier already sent to Data Entry. Recall it first to reject.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    reason = (body.reason or '').strip() or None
    await db.couriers.update_one({'id': cid}, {'$set': {
        'rejected': True, 
        'rejected_reason': reason, 
        'rejected_at': now_iso, 
        'rejected_by': user['full_name'],
        'accepted': False, 
        'accepted_at': None, 
        'accepted_by': None, 
        'sent_to_data_entry': False,
        'status': 'warehouse_rejected',
    }})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.patch("/couriers/{cid}/resolve", response_model=CourierOut)
async def resolve_courier_rejection(cid: str, user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('rejected') and not doc.get('owner_rejected'):
        raise HTTPException(status_code=400, detail="This courier is not flagged as rejected.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.couriers.update_one(
        {'id': cid},
        {'$set': {
            'rejected': False,
            'rejected_reason': None,
            'rejected_resolved_at': now_iso,
            'rejected_resolved_by': user['full_name'],
            'accepted': False,
            'accepted_at': None,
            'accepted_by': None,
            'owner_approved': False,
            'owner_rejected': False,
            'status': 'pending_owner_approval',
        }},
    )
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.patch("/couriers/{cid}/checklist", response_model=CourierOut)
async def update_courier_checklist(cid: str, body: ChecklistUpdate, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('accepted'):
        raise HTTPException(status_code=400, detail="Accept the courier before updating its checklist.")
    normalized = _normalize_checklist(body.checklist)
    await db.couriers.update_one({'id': cid}, {'$set': {
        'checklist': normalized,
        'checklist_updated_at': datetime.now(timezone.utc).isoformat(),
        'checklist_updated_by': user['full_name'],
    }})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.post("/couriers/{cid}/items", response_model=CourierOut, status_code=201)
async def add_courier_item(cid: str, body: CourierItemAdd, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    if not doc.get('accepted'):
        raise HTTPException(status_code=400, detail="Accept the courier before adding items.")
    
    checklist = _normalize_checklist(doc.get('checklist'))
    from config import COURIER_CHECKLIST_KEYS
    if not all(checklist.get(k) for k in COURIER_CHECKLIST_KEYS):
        raise HTTPException(status_code=400, detail="Complete the warehouse checklist before adding items.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    products = _apply_item_into_products(list(doc.get('products', [])), body, now_iso)
    await db.couriers.update_one({'id': cid}, {'$set': {'products': products, 'items_updated_at': now_iso, 'items_updated_by': user['full_name']}})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.post("/couriers/{cid}/items/batch", response_model=CourierOut, status_code=201)
async def add_courier_items_batch(
    cid: str,
    body: CourierItemsBatchAdd,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION))
):
    """Add multiple items to a courier at once"""
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    if not doc.get('accepted'):
        raise HTTPException(status_code=400, detail="Accept the courier before adding items.")
    
    checklist = _normalize_checklist(doc.get('checklist'))
    from config import COURIER_CHECKLIST_KEYS
    if not all(checklist.get(k) for k in COURIER_CHECKLIST_KEYS):
        raise HTTPException(status_code=400, detail="Complete the warehouse checklist before adding items.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    products = list(doc.get('products', []))
    
    for item in body.items:
        products = _apply_item_into_products(products, item, now_iso)
    
    await db.couriers.update_one(
        {'id': cid}, 
        {'$set': {
            'products': products, 
            'items_updated_at': now_iso, 
            'items_updated_by': user['full_name']
        }}
    )
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

# =========================
# Workflow: Send to Owner -> Forward to Data Entry -> Verification
# =========================
@api_router.patch("/couriers/{cid}/send-to-owner", response_model=CourierOut)
async def send_courier_to_owner(cid: str, body: SendToDataEntryBody, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    if not doc.get('accepted'):
        raise HTTPException(status_code=400, detail="Courier must be accepted first.")
    
    if body.sent and not doc.get('products'):
        raise HTTPException(status_code=400, detail="Add at least one item before completing SOP.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    update = {
        'sent_to_owner': bool(body.sent),
        'sent_to_owner_at': now_iso if body.sent else None,
        'sent_to_owner_by': user['full_name'] if body.sent else None,
        'status': 'pending_owner_review' if body.sent else 'warehouse_processing',
    }
    if not body.sent:
        update['sent_to_data_entry'] = False
        update['sent_to_data_entry_at'] = None
        update['sent_to_data_entry_by'] = None
    
    await db.couriers.update_one({'id': cid}, {'$set': update})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.patch("/couriers/{cid}/owner-forward", response_model=CourierOut)
async def owner_forward_to_data_entry(cid: str, body: OwnerForwardBody, user: dict = Depends(require_role(ROLE_OWNER))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('sent_to_owner'):
        raise HTTPException(status_code=400, detail="Courier has not been submitted by Warehouse yet.")
    if body.forward and not doc.get('products'):
        raise HTTPException(status_code=400, detail="Courier has no items to forward.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.couriers.update_one({'id': cid}, {'$set': {
        'sent_to_data_entry': bool(body.forward),
        'sent_to_data_entry_at': now_iso if body.forward else None,
        'sent_to_data_entry_by': user['full_name'] if body.forward else None,
        'status': 'data_entry' if body.forward else 'pending_owner_review',
    }})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.get("/owner/couriers/pending", response_model=list[CourierOut])
async def list_owner_pending_couriers(user: dict = Depends(require_role(ROLE_OWNER))):
    cursor = db.couriers.find(
        {
            'sent_to_owner': True,
            '$or': [
                {'sent_to_data_entry': {'$exists': False}},
                {'sent_to_data_entry': False},
            ],
        },
        {'_id': 0},
    ).sort('sent_to_owner_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.patch("/couriers/{cid}/forward-to-data-entry", response_model=CourierOut)
async def warehouse_forward_to_data_entry(
    cid: str, 
    body: SendToDataEntryBody, 
    user: dict = Depends(require_role(ROLE_WAREHOUSE))
):
    """Warehouse forwards courier directly to Data Entry (after Owner approval)"""
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    
    # Check if owner approved
    if not doc.get('owner_approved'):
        raise HTTPException(status_code=400, detail="Courier must be approved by Owner first.")
    
    if not doc.get('accepted'):
        raise HTTPException(status_code=400, detail="Courier must be accepted by Warehouse first.")
    
    if not doc.get('products'):
        raise HTTPException(status_code=400, detail="Add at least one item before forwarding.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.couriers.update_one(
        {'id': cid}, 
        {'$set': {
            'sent_to_data_entry': bool(body.sent),
            'sent_to_data_entry_at': now_iso if body.sent else None,
            'sent_to_data_entry_by': user['full_name'] if body.sent else None,
            'sent_to_owner': True,  # Mark as sent to owner (for tracking)
            'sent_to_owner_at': now_iso,
            'sent_to_owner_by': user['full_name'],
            'status': 'data_entry' if body.sent else 'warehouse_processing',
        }}
    )
    
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)


@api_router.get("/data-entry/couriers", response_model=list[CourierOut])
async def list_data_entry_couriers(user: dict = Depends(require_role(ROLE_OWNER, ROLE_DATA_ENTRY))):
    cursor = db.couriers.find(
        {
            'sent_to_data_entry': True,
            '$or': [
                {'ready_for_verification': {'$exists': False}},
                {'ready_for_verification': False},
            ],
        },
        {'_id': 0},
    ).sort('sent_to_data_entry_at', -1)
    docs = await cursor.to_list(2000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.patch("/couriers/{cid}/items/{item_id}/data-entry", response_model=CourierOut)
async def update_item_data_entry(cid: str, item_id: str, body: CourierItemDataEntry, user: dict = Depends(require_role(ROLE_OWNER, ROLE_DATA_ENTRY))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('sent_to_data_entry'):
        raise HTTPException(status_code=400, detail="This courier has not been sent to Data Entry yet.")
    
    products = list(doc.get('products', []))
    idx = next((i for i, p in enumerate(products) if p.get('id') == item_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Item not found.")
    
    update_fields = {}
    for f in ['supplier', 'invoice_number', 'invoice_date', 'transportation_method', 'transporter_name', 'hsn_code', 'unit', 'po_number', 'batch_number', 'expiry_date', 'remarks']:
        v = getattr(body, f)
        if v is not None:
            update_fields[f] = (v.strip() if isinstance(v, str) else v) or None
    for f in ['transportation_cost', 'gst_percent', 'total_invoice_amount', 'cost_per_unit', 'gst_amount', 'mrp', 'discount_percent', 'igst_percent']:
        v = getattr(body, f)
        if v is not None:
            update_fields[f] = float(v)
    if body.data_entry_done is not None:
        update_fields['data_entry_done'] = bool(body.data_entry_done)
    
    products[idx] = {**products[idx], **update_fields, 'data_entry_updated_at': datetime.now(timezone.utc).isoformat(), 'data_entry_updated_by': user['full_name']}
    
    all_done = bool(products) and all(p.get('data_entry_done') for p in products)
    now_iso = datetime.now(timezone.utc).isoformat()
    set_payload = {'products': products}
    if all_done and not doc.get('ready_for_verification'):
        set_payload['ready_for_verification'] = True
        set_payload['ready_for_verification_at'] = now_iso
        set_payload['status'] = 'ready_for_verification'
    elif not all_done and doc.get('ready_for_verification') and not doc.get('verification_complete'):
        set_payload['ready_for_verification'] = False
        set_payload['ready_for_verification_at'] = None
        set_payload['status'] = 'data_entry'
    
    await db.couriers.update_one({'id': cid}, {'$set': set_payload})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.get("/verification/couriers", response_model=list[CourierOut])
async def list_verification_couriers(user: dict = Depends(require_role(ROLE_OWNER, ROLE_VERIFICATION))):
    cursor = db.couriers.find({'ready_for_verification': True}, {'_id': 0}).sort('ready_for_verification_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.patch("/couriers/{cid}/items/{item_id}/verification", response_model=CourierOut)
async def update_item_verification(cid: str, item_id: str, body: VerificationItemBody, user: dict = Depends(require_role(ROLE_OWNER, ROLE_VERIFICATION))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('ready_for_verification'):
        raise HTTPException(status_code=400, detail="This courier is not ready for verification yet.")
    if doc.get('verification_complete'):
        raise HTTPException(status_code=400, detail="Courier verification is already complete and locked.")
    
    products = list(doc.get('products', []))
    idx = next((i for i, p in enumerate(products) if p.get('id') == item_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Item not found.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    new_item = {**products[idx]}
    if body.clear_manual:
        new_item['final_price_manual'] = None
        new_item['final_price_source'] = 'auto'
    elif body.final_price_manual is not None:
        new_item['final_price_manual'] = float(body.final_price_manual)
        new_item['final_price_source'] = 'manual'
    if body.verification_notes is not None:
        new_item['verification_notes'] = body.verification_notes.strip() or None
    if body.verification_done is not None:
        new_item['verification_done'] = bool(body.verification_done)
        if body.verification_done:
            new_item['verified_at'] = now_iso
            new_item['verified_by'] = user['full_name']
        else:
            new_item['verified_at'] = None
            new_item['verified_by'] = None
    
    products[idx] = new_item
    await db.couriers.update_one({'id': cid}, {'$set': {'products': products}})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.patch("/couriers/{cid}/complete-verification", response_model=CourierOut)
async def complete_courier_verification(cid: str, body: CompleteVerificationBody, user: dict = Depends(require_role(ROLE_OWNER, ROLE_VERIFICATION))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('ready_for_verification'):
        raise HTTPException(status_code=400, detail="This courier is not ready for verification yet.")
    if body.complete:
        products = doc.get('products', [])
        if not products:
            raise HTTPException(status_code=400, detail="Courier has no items to verify.")
        if not all(p.get('verification_done') for p in products):
            missing = sum(1 for p in products if not p.get('verification_done'))
            raise HTTPException(status_code=400, detail=f"Verify all items first ({missing} pending).")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.couriers.update_one({'id': cid}, {'$set': {
        'verification_complete': bool(body.complete),
        'verification_complete_at': now_iso if body.complete else None,
        'verification_complete_by': user['full_name'] if body.complete else None,
        'status': 'completed' if body.complete else 'ready_for_verification',
    }})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)


@api_router.patch("/couriers/{cid}/complete-verification", response_model=CourierOut)
async def complete_courier_verification(cid: str, body: CompleteVerificationBody, user: dict = Depends(require_role(ROLE_OWNER, ROLE_VERIFICATION))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('ready_for_verification'):
        raise HTTPException(status_code=400, detail="This courier is not ready for verification yet.")
    if body.complete:
        products = doc.get('products', [])
        if not products:
            raise HTTPException(status_code=400, detail="Courier has no items to verify.")
        if not all(p.get('verification_done') for p in products):
            missing = sum(1 for p in products if not p.get('verification_done'))
            raise HTTPException(status_code=400, detail=f"Verify all items first ({missing} pending).")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.couriers.update_one({'id': cid}, {'$set': {
        'verification_complete': bool(body.complete),
        'verification_complete_at': now_iso if body.complete else None,
        'verification_complete_by': user['full_name'] if body.complete else None,
        'status': 'completed' if body.complete else 'ready_for_verification',
    }})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

# =========================
# Owner Analytics
# =========================
@api_router.get("/owner/analytics")
async def owner_analytics(user: dict = Depends(require_role(ROLE_OWNER))):
    total = await db.couriers.count_documents({})
    rejected = await db.couriers.count_documents({'rejected': True})
    pending_cashier = await db.couriers.count_documents({
        'owner_approved': False,
        'owner_rejected': {'$ne': True},
        'status': 'pending_owner_approval'
    })
    pending_warehouse = await db.couriers.count_documents({
        'owner_approved': True,
        'accepted': {'$ne': True},
        'rejected': {'$ne': True},
        'status': 'owner_approved'
    })
    pending_owner_review = await db.couriers.count_documents({
        'sent_to_owner': True,
        '$or': [
            {'sent_to_data_entry': {'$exists': False}},
            {'sent_to_data_entry': False},
        ],
    })
    in_data_entry = await db.couriers.count_documents({'sent_to_data_entry': True})
    ready_verification = await db.couriers.count_documents({
        'ready_for_verification': True,
        '$or': [
            {'verification_complete': {'$exists': False}},
            {'verification_complete': False},
        ],
    })
    verified = await db.couriers.count_documents({'verification_complete': True})
    
    pipeline = [{'$unwind': {'path': '$products', 'preserveNullAndEmptyArrays': False}}, {'$group': {'_id': None, 'items': {'$sum': 1}, 'units': {'$sum': {'$ifNull': ['$products.quantity', 0]}}, 'damaged': {'$sum': {'$ifNull': ['$products.damaged_count', 0]}}}}]
    agg = await db.couriers.aggregate(pipeline).to_list(1)
    item_stats = agg[0] if agg else {'items': 0, 'units': 0, 'damaged': 0}
    
    return {
        'total_couriers': total,
        'pending_cashier': pending_cashier,
        'pending_warehouse': pending_warehouse,
        'pending_owner_review': pending_owner_review,
        'in_data_entry': in_data_entry,
        'ready_verification': ready_verification,
        'verified': verified,
        'rejected_open': rejected,
        'total_items': int(item_stats.get('items', 0)),
        'total_units': int(item_stats.get('units', 0)),
        'damaged_units': int(item_stats.get('damaged', 0)),
    }

# =========================
# Inventory
# =========================
@api_router.get("/inventory/items")
async def list_inventory_items(user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION))):
    cursor = db.couriers.find({}, {'_id': 0}).sort('created_at', -1)
    rows = []
    async for doc in cursor:
        courier_number = doc.get('courier_number')
        courier_company = doc.get('courier_company')
        courier_id = doc.get('id')
        for p in doc.get('products', []):
            p_created = p.get('created_at')
            if isinstance(p_created, str):
                try:
                    p_created = datetime.fromisoformat(p_created)
                except Exception:
                    p_created = None
            rows.append({
                'item_id': p.get('id'), 
                'name': p.get('name'), 
                'quantity': int(p.get('quantity', 0)),
                'photo': p.get('photo'), 
                'damaged': bool(p.get('damaged', False)),
                'damaged_count': int(p.get('damaged_count', 0)), 
                'created_at': p_created,
                'courier_id': courier_id, 
                'courier_number': courier_number, 
                'courier_company': courier_company,
            })
    rows.sort(key=lambda r: r.get('created_at') or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return rows

# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)