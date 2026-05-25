from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me-in-prod-warehouse-secret-key-2026')
JWT_ALG = 'HS256'
JWT_EXP_HOURS = 24 * 7  # 7 days

# Roles
ROLE_OWNER = 'owner'
ROLE_CASHIER = 'cashier'
ROLE_WAREHOUSE = 'warehouse'
ROLE_DATA_ENTRY = 'data_entry'
ROLE_VERIFICATION = 'verification'
VALID_ROLES = [ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE, ROLE_DATA_ENTRY, ROLE_VERIFICATION]
STAFF_ROLES = [ROLE_CASHIER, ROLE_WAREHOUSE, ROLE_DATA_ENTRY, ROLE_VERIFICATION]

ROLE_LABELS = {
    ROLE_OWNER: 'Owner',
    ROLE_CASHIER: 'Cashier',
    ROLE_WAREHOUSE: 'Warehouse Staff',
    ROLE_DATA_ENTRY: 'Data Entry Staff',
    ROLE_VERIFICATION: 'Verification Staff',
}

# Create the main app without a prefix
app = FastAPI(title="Warehouse Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# =========================
# Pydantic Models
# =========================
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    full_name: str
    role: str
    role_label: str
    created_at: datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal['owner', 'cashier', 'warehouse', 'data_entry', 'verification']

class LoginResponse(BaseModel):
    token: str
    user: UserPublic

class CreateStaffRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=6, max_length=100)
    role: Literal['cashier', 'warehouse', 'data_entry', 'verification']

# ----- Parcel / Product models -----
class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: int = Field(ge=1, le=1_000_000)

class ProductOut(BaseModel):
    id: str
    name: str
    quantity: int
    photo: Optional[str] = None
    damaged: bool = False
    damaged_count: int = 0
    category: Optional[str] = None
    brand: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    # Data Entry / purchase fields
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    transportation_method: Optional[str] = None
    transporter_name: Optional[str] = None
    transportation_cost: Optional[float] = None
    gst_percent: Optional[float] = None
    total_invoice_amount: Optional[float] = None
    cost_per_unit: Optional[float] = None
    gst_amount: Optional[float] = None
    hsn_code: Optional[str] = None
    unit: Optional[str] = None
    data_entry_done: bool = False
    created_at: datetime

class ParcelCreate(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: int = Field(ge=1, le=100000)
    carton_photo: Optional[str] = None  # data:image/...;base64,...
    products: List[ProductIn] = Field(min_length=1)
    submitted_by: Optional[str] = Field(default=None, max_length=80)
    payment_made: bool = False
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None

class BatchParcelEntry(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: int = Field(ge=1, le=100000)
    carton_photo: Optional[str] = None
    products: List[ProductIn] = Field(min_length=1)
    payment_made: bool = False
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None

class BatchParcelCreate(BaseModel):
    submitted_by: Optional[str] = Field(default=None, max_length=80)
    entries: List[BatchParcelEntry] = Field(min_length=1, max_length=50)

class ParcelOut(BaseModel):
    id: str
    parcel_number: str
    company_name: Optional[str] = None
    num_packages: int
    carton_photo: Optional[str] = None
    products: List[ProductOut]
    submitted_by: Optional[str] = None
    payment_made: bool
    payment_mode: Optional[str] = None
    total_quantity: int
    created_at: datetime
    created_by_name: str

# =========================
# Helpers
# =========================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False

def create_jwt(user: dict) -> str:
    payload = {
        'sub': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user['full_name'],
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

def to_public_user(doc: dict) -> dict:
    created_at = doc.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    return {
        'id': doc['id'],
        'email': doc['email'],
        'full_name': doc['full_name'],
        'role': doc['role'],
        'role_label': ROLE_LABELS.get(doc['role'], doc['role']),
        'created_at': created_at,
    }

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_jwt(token)
    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return user

def require_role(*allowed_roles: str):
    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if user['role'] not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")
        return user
    return _checker

# =========================
# Startup: seed owner + index
# =========================
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index('email', unique=True)
        await db.users.create_index('id', unique=True)
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

    # Seed demo accounts for ALL roles
    demo_accounts = [
        {'email': 'owner@warehouse.com',        'password': 'Owner@123',       'full_name': 'Demo Owner',             'role': ROLE_OWNER},
        {'email': 'cashier@warehouse.com',      'password': 'Cashier@123',     'full_name': 'Demo Cashier',           'role': ROLE_CASHIER},
        {'email': 'warehouse@warehouse.com',    'password': 'Warehouse@123',   'full_name': 'Demo Warehouse Staff',   'role': ROLE_WAREHOUSE},
        {'email': 'dataentry@warehouse.com',    'password': 'DataEntry@123',   'full_name': 'Demo Data Entry Staff',  'role': ROLE_DATA_ENTRY},
        {'email': 'verification@warehouse.com', 'password': 'Verify@123',      'full_name': 'Demo Verification Staff','role': ROLE_VERIFICATION},
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
                logger.info(f"Seeded demo {acc['role']}: {acc['email']}")
            except Exception as e:
                logger.warning(f"Seed skipped for {acc['email']}: {e}")

# =========================
# Routes
# =========================
@api_router.get("/")
async def root():
    return {"message": "Warehouse Management System API", "status": "ok"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

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

# Owner: manage staff
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

@api_router.get("/owner/staff", response_model=List[UserPublic])
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

# ============================================================
# Parcels (incoming products from companies) - Owner managed
# ============================================================
def parcel_doc_to_out(doc: dict) -> dict:
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
            'quantity': p['quantity'],
            'photo': p.get('photo'),
            'damaged': bool(p.get('damaged', False)),
            'damaged_count': int(p.get('damaged_count', 0)),
            'category': p.get('category'),
            'brand': p.get('brand'),
            'code': p.get('code'),
            'description': p.get('description'),
            'price': float(p['price']) if p.get('price') is not None else None,
            'created_at': p_created,
        })
    total_qty = sum(p['quantity'] for p in products)
    return {
        'id': doc['id'],
        'parcel_number': doc['parcel_number'],
        'company_name': doc.get('company_name'),
        'num_packages': doc['num_packages'],
        'carton_photo': doc.get('carton_photo'),
        'products': products,
        'submitted_by': doc.get('submitted_by'),
        'payment_made': doc.get('payment_made', False),
        'payment_mode': doc.get('payment_mode'),
        'total_quantity': total_qty,
        'created_at': created_at,
        'created_by_name': doc.get('created_by_name', 'Owner'),
    }

async def _next_parcel_number() -> str:
    # Atomic counter to avoid duplicates after deletes
    res = await db.counters.find_one_and_update(
        {'_id': 'parcel_number'},
        {'$inc': {'value': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    val = (res or {}).get('value') or 1
    return f"PCL-{val:04d}"

@api_router.post("/parcels", response_model=ParcelOut, status_code=201)
async def create_parcel(body: ParcelCreate, user: dict = Depends(require_role(ROLE_WAREHOUSE))):
    if body.payment_made and not body.payment_mode:
        raise HTTPException(status_code=400, detail="Payment mode is required when payment is made.")
    if not body.payment_made:
        body.payment_mode = None
    # Validate image size if provided (rough check on base64 length ~ 4MB)
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
    # Validate each entry's payment combo
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

@api_router.get("/parcels", response_model=List[ParcelOut])
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
    # aggregate total quantity + packages
    pipeline = [
        {'$project': {
            'num_packages': 1,
            'total_qty': {'$sum': '$products.quantity'},
        }},
        {'$group': {
            '_id': None,
            'packages': {'$sum': '$num_packages'},
            'units': {'$sum': '$total_qty'},
        }}
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

# --- Product-level edits inside a parcel ---
class ProductPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    quantity: Optional[int] = Field(default=None, ge=1, le=1_000_000)

class ParcelPatch(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: Optional[int] = Field(default=None, ge=1, le=100000)
    carton_photo: Optional[str] = None  # can be base64 or '' to clear
    submitted_by: Optional[str] = Field(default=None, max_length=80)
    payment_made: Optional[bool] = None
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None
    products: Optional[List[ProductIn]] = None  # full replace if provided

@api_router.patch("/parcels/{parcel_id}", response_model=ParcelOut)
async def patch_parcel(parcel_id: str, body: ParcelPatch, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    parcel = await db.parcels.find_one({'id': parcel_id}, {'_id': 0})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found.")

    update = {}
    if body.company_name is not None:
        update['company_name'] = body.company_name.strip() or None
    if body.num_packages is not None:
        update['num_packages'] = int(body.num_packages)
    if body.carton_photo is not None:
        if body.carton_photo == '':
            update['carton_photo'] = None
        else:
            if len(body.carton_photo) > 6_000_000:
                raise HTTPException(status_code=400, detail="Carton photo is too large (max ~4MB).")
            update['carton_photo'] = body.carton_photo
    if body.submitted_by is not None:
        update['submitted_by'] = body.submitted_by.strip() or None
    if body.payment_made is not None:
        update['payment_made'] = bool(body.payment_made)
        if not body.payment_made:
            update['payment_mode'] = None
        else:
            # if turning on payment, require a mode (either provided or already on doc)
            mode = body.payment_mode if body.payment_mode is not None else parcel.get('payment_mode')
            if not mode:
                raise HTTPException(status_code=400, detail="Payment mode is required when payment is made.")
            update['payment_mode'] = mode
    elif body.payment_mode is not None:
        # payment_made not provided but mode is — keep current paid state but update mode
        if not parcel.get('payment_made'):
            raise HTTPException(status_code=400, detail="Cannot set payment mode while invoice is unpaid.")
        update['payment_mode'] = body.payment_mode
    if body.products is not None:
        if len(body.products) < 1:
            raise HTTPException(status_code=400, detail="At least one product is required.")
        # Preserve existing IDs/created_at where possible by index
        existing = parcel.get('products', [])
        new_products = []
        now_iso = datetime.now(timezone.utc).isoformat()
        for i, p in enumerate(body.products):
            base = existing[i] if i < len(existing) else None
            new_products.append({
                'id': base['id'] if base else str(uuid.uuid4()),
                'name': p.name.strip(),
                'quantity': int(p.quantity),
                'created_at': base['created_at'] if base else now_iso,
            })
        update['products'] = new_products

    if update:
        await db.parcels.update_one({'id': parcel_id}, {'$set': update})
    updated = await db.parcels.find_one({'id': parcel_id}, {'_id': 0})
    return parcel_doc_to_out(updated)

@api_router.patch("/parcels/{parcel_id}/products/{product_id}", response_model=ParcelOut)
async def update_product(parcel_id: str, product_id: str, body: ProductPatch, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    parcel = await db.parcels.find_one({'id': parcel_id}, {'_id': 0})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found.")
    products = parcel.get('products', [])
    idx = next((i for i, p in enumerate(products) if p['id'] == product_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Product not found in this parcel.")
    if body.name is not None:
        products[idx]['name'] = body.name.strip()
    if body.quantity is not None:
        products[idx]['quantity'] = int(body.quantity)
    await db.parcels.update_one({'id': parcel_id}, {'$set': {'products': products}})
    updated = await db.parcels.find_one({'id': parcel_id}, {'_id': 0})
    return parcel_doc_to_out(updated)

@api_router.delete("/parcels/{parcel_id}/products/{product_id}", response_model=ParcelOut)
async def delete_product(parcel_id: str, product_id: str, user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE))):
    parcel = await db.parcels.find_one({'id': parcel_id}, {'_id': 0})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found.")
    products = [p for p in parcel.get('products', []) if p['id'] != product_id]
    if len(products) == len(parcel.get('products', [])):
        raise HTTPException(status_code=404, detail="Product not found in this parcel.")
    if not products:
        # If no products left, delete the parcel itself
        await db.parcels.delete_one({'id': parcel_id})
        raise HTTPException(status_code=410, detail="Last product removed; parcel deleted.")
    await db.parcels.update_one({'id': parcel_id}, {'$set': {'products': products}})
    updated = await db.parcels.find_one({'id': parcel_id}, {'_id': 0})
    return parcel_doc_to_out(updated)

# ============================================================
# Couriers (outgoing shipments) - Cashier managed
# ============================================================
class CourierEntry(BaseModel):
    courier_company: Optional[str] = Field(default=None, max_length=120)
    tracking_number: Optional[str] = Field(default=None, max_length=80)
    receiver_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: int = Field(ge=1, le=100000)
    slip_photo: Optional[str] = None
    products: List[ProductIn] = Field(default_factory=list)
    charges: Optional[float] = Field(default=None, ge=0)
    payment_made: bool = False
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None

class CourierBatchCreate(BaseModel):
    handled_by: Optional[str] = Field(default=None, max_length=80)
    entries: List[CourierEntry] = Field(min_length=1, max_length=50)

# Warehouse checklist items (fixed set)
COURIER_CHECKLIST_KEYS = [
    'master_carton',
    'label_check',
    'bills_check',
    'quantity_verify',
    'damage_check',
    'photo_taken',
]

def _default_checklist() -> dict:
    return {k: False for k in COURIER_CHECKLIST_KEYS}

def _normalize_checklist(raw: Optional[dict]) -> dict:
    out = _default_checklist()
    if not raw or not isinstance(raw, dict):
        return out
    for k in COURIER_CHECKLIST_KEYS:
        out[k] = bool(raw.get(k, False))
    return out


class CourierOut(BaseModel):
    id: str
    courier_number: str
    courier_company: Optional[str] = None
    tracking_number: Optional[str] = None
    receiver_name: Optional[str] = None
    num_packages: int
    slip_photo: Optional[str] = None
    products: List[ProductOut]
    handled_by: Optional[str] = None
    charges: Optional[float] = None
    payment_made: bool
    payment_mode: Optional[str] = None
    total_quantity: int
    checklist: dict
    sent_to_data_entry: bool = False
    data_entry_done_count: int = 0
    created_at: datetime
    created_by_name: str


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
            'quantity': p['quantity'],
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
            'invoice_date': p.get('invoice_date'),
            'transportation_method': p.get('transportation_method'),
            'transporter_name': p.get('transporter_name'),
            'transportation_cost': float(p['transportation_cost']) if p.get('transportation_cost') is not None else None,
            'gst_percent': float(p['gst_percent']) if p.get('gst_percent') is not None else None,
            'total_invoice_amount': float(p['total_invoice_amount']) if p.get('total_invoice_amount') is not None else None,
            'cost_per_unit': float(p['cost_per_unit']) if p.get('cost_per_unit') is not None else None,
            'gst_amount': float(p['gst_amount']) if p.get('gst_amount') is not None else None,
            'hsn_code': p.get('hsn_code'),
            'unit': p.get('unit'),
            'data_entry_done': bool(p.get('data_entry_done', False)),
            'created_at': p_created,
        })
    total_qty = sum(p['quantity'] for p in products)
    data_entry_done_count = sum(1 for p in products if p.get('data_entry_done'))
    return {
        'id': doc['id'],
        'courier_number': doc['courier_number'],
        'courier_company': doc.get('courier_company'),
        'tracking_number': doc.get('tracking_number'),
        'receiver_name': doc.get('receiver_name'),
        'num_packages': doc['num_packages'],
        'slip_photo': doc.get('slip_photo'),
        'products': products,
        'handled_by': doc.get('handled_by'),
        'charges': doc.get('charges'),
        'payment_made': doc.get('payment_made', False),
        'payment_mode': doc.get('payment_mode'),
        'total_quantity': total_qty,
        'checklist': _normalize_checklist(doc.get('checklist')),
        'sent_to_data_entry': bool(doc.get('sent_to_data_entry', False)),
        'data_entry_done_count': data_entry_done_count,
        'created_at': created_at,
        'created_by_name': doc.get('created_by_name', 'Cashier'),
    }

async def _next_courier_number() -> str:
    res = await db.counters.find_one_and_update(
        {'_id': 'courier_number'},
        {'$inc': {'value': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    val = (res or {}).get('value') or 1
    return f"CRX-{val:04d}"

@api_router.post("/couriers/batch", status_code=201)
async def create_couriers_batch(body: CourierBatchCreate, user: dict = Depends(require_role(ROLE_CASHIER))):
    for idx, e in enumerate(body.entries):
        if e.payment_made and not e.payment_mode:
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1}: payment mode is required when payment is made.")
        if not e.payment_made:
            e.payment_mode = None
        if e.slip_photo and len(e.slip_photo) > 6_000_000:
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1}: slip photo is too large (max ~4MB).")

    handled_by = (body.handled_by.strip() if body.handled_by else None) or None
    now = datetime.now(timezone.utc)
    created = []
    for e in body.entries:
        courier_number = await _next_courier_number()
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
            'products': products,
            'handled_by': handled_by,
            'charges': float(e.charges) if e.charges is not None else None,
            'payment_made': bool(e.payment_made),
            'payment_mode': e.payment_mode,
            'created_at': now.isoformat(),
            'created_by': user['id'],
            'created_by_name': user['full_name'],
        }
        await db.couriers.insert_one(doc)
        created.append(courier_doc_to_out(doc))
    return {"created": created, "count": len(created)}

@api_router.get("/couriers", response_model=List[CourierOut])
async def list_couriers(user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE))):
    cursor = db.couriers.find({}, {'_id': 0}).sort('created_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]

@api_router.delete("/couriers/{cid}")
async def delete_courier(cid: str, user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE))):
    res = await db.couriers.delete_one({'id': cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    return {"success": True, "id": cid}

class CourierPatch(BaseModel):
    courier_company: Optional[str] = Field(default=None, max_length=120)
    tracking_number: Optional[str] = Field(default=None, max_length=80)
    receiver_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: Optional[int] = Field(default=None, ge=1, le=100000)
    slip_photo: Optional[str] = None
    handled_by: Optional[str] = Field(default=None, max_length=80)
    charges: Optional[float] = Field(default=None, ge=0)
    payment_made: Optional[bool] = None
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None
    products: Optional[List[ProductIn]] = None

@api_router.patch("/couriers/{cid}", response_model=CourierOut)
async def patch_courier(cid: str, body: CourierPatch, user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    update = {}
    for f in ['courier_company', 'tracking_number', 'receiver_name', 'handled_by']:
        v = getattr(body, f)
        if v is not None:
            update[f] = v.strip() or None
    if body.num_packages is not None:
        update['num_packages'] = int(body.num_packages)
    if body.slip_photo is not None:
        if body.slip_photo == '':
            update['slip_photo'] = None
        else:
            if len(body.slip_photo) > 6_000_000:
                raise HTTPException(status_code=400, detail="Slip photo is too large (max ~4MB).")
            update['slip_photo'] = body.slip_photo
    if body.charges is not None:
        update['charges'] = float(body.charges)
    if body.payment_made is not None:
        update['payment_made'] = bool(body.payment_made)
        if not body.payment_made:
            update['payment_mode'] = None
        else:
            mode = body.payment_mode if body.payment_mode is not None else doc.get('payment_mode')
            if not mode:
                raise HTTPException(status_code=400, detail="Payment mode required when paid.")
            update['payment_mode'] = mode
    elif body.payment_mode is not None:
        update['payment_mode'] = body.payment_mode
    if body.products is not None:
        if len(body.products) < 1:
            raise HTTPException(status_code=400, detail="At least one product required.")
        existing = doc.get('products', [])
        new_products = []
        now_iso = datetime.now(timezone.utc).isoformat()
        for i, p in enumerate(body.products):
            base = existing[i] if i < len(existing) else None
            new_products.append({
                'id': base['id'] if base else str(uuid.uuid4()),
                'name': p.name.strip(),
                'quantity': int(p.quantity),
                'created_at': base['created_at'] if base else now_iso,
            })
        update['products'] = new_products
    if update:
        await db.couriers.update_one({'id': cid}, {'$set': update})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

@api_router.delete("/couriers/{cid}/products/{product_id}", response_model=CourierOut)
async def delete_courier_product(cid: str, product_id: str, user: dict = Depends(require_role(ROLE_OWNER, ROLE_CASHIER, ROLE_WAREHOUSE))):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    products = [p for p in doc.get('products', []) if p['id'] != product_id]
    if len(products) == len(doc.get('products', [])):
        raise HTTPException(status_code=404, detail="Product not found in this courier entry.")
    if not products:
        await db.couriers.delete_one({'id': cid})
        raise HTTPException(status_code=410, detail="Last product removed; courier entry deleted.")
    await db.couriers.update_one({'id': cid}, {'$set': {'products': products}})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

# --- Per-courier warehouse checklist ---
class ChecklistUpdate(BaseModel):
    checklist: dict

@api_router.patch("/couriers/{cid}/checklist", response_model=CourierOut)
async def update_courier_checklist(
    cid: str,
    body: ChecklistUpdate,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION)),
):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    normalized = _normalize_checklist(body.checklist)
    await db.couriers.update_one(
        {'id': cid},
        {'$set': {
            'checklist': normalized,
            'checklist_updated_at': datetime.now(timezone.utc).isoformat(),
            'checklist_updated_by': user['full_name'],
        }},
    )
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)

# --- Add item to a courier (only after checklist complete) ---
class CourierItemAdd(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: int = Field(ge=1, le=1_000_000)
    photo: Optional[str] = None  # base64 data url, optional
    damaged: bool = False
    damaged_count: int = Field(default=0, ge=0, le=1_000_000)
    category: Optional[str] = Field(default=None, max_length=80)
    brand: Optional[str] = Field(default=None, max_length=80)
    code: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, max_length=600)
    price: Optional[float] = Field(default=None, ge=0)


def _apply_item_into_products(products: list, body: 'CourierItemAdd', now_iso: str) -> list:
    """Returns updated products list applying body either by merging (same name)
    or appending as a new product."""
    name_clean = body.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Item name is required.")
    if body.photo and len(body.photo) > 6_000_000:
        raise HTTPException(status_code=400, detail="Item photo is too large (max ~4MB).")

    damaged_flag = bool(body.damaged) and body.damaged_count > 0
    damaged_count = int(body.damaged_count) if damaged_flag else 0
    if damaged_count > body.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"{name_clean}: damaged count cannot exceed quantity.",
        )

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
    match_idx = next(
        (i for i, p in enumerate(out) if (p.get('name') or '').strip().lower() == name_clean.lower()),
        -1,
    )
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


@api_router.post("/couriers/{cid}/items", response_model=CourierOut, status_code=201)
async def add_courier_item(
    cid: str,
    body: CourierItemAdd,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION)),
):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")

    checklist = _normalize_checklist(doc.get('checklist'))
    if not all(checklist.get(k) for k in COURIER_CHECKLIST_KEYS):
        raise HTTPException(
            status_code=400,
            detail="Complete the warehouse checklist before adding items.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    products = _apply_item_into_products(list(doc.get('products', [])), body, now_iso)

    await db.couriers.update_one(
        {'id': cid},
        {'$set': {
            'products': products,
            'items_updated_at': now_iso,
            'items_updated_by': user['full_name'],
        }},
    )
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)


class CourierItemsBatchAdd(BaseModel):
    items: List[CourierItemAdd] = Field(min_length=1, max_length=100)


@api_router.post("/couriers/{cid}/items/batch", response_model=CourierOut, status_code=201)
async def add_courier_items_batch(
    cid: str,
    body: CourierItemsBatchAdd,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION)),
):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    checklist = _normalize_checklist(doc.get('checklist'))
    if not all(checklist.get(k) for k in COURIER_CHECKLIST_KEYS):
        raise HTTPException(
            status_code=400,
            detail="Complete the warehouse checklist before adding items.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    products = list(doc.get('products', []))
    for entry in body.items:
        products = _apply_item_into_products(products, entry, now_iso)

    await db.couriers.update_one(
        {'id': cid},
        {'$set': {
            'products': products,
            'items_updated_at': now_iso,
            'items_updated_by': user['full_name'],
        }},
    )
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)


@api_router.delete("/couriers/{cid}/items/{item_id}", response_model=CourierOut)
async def remove_courier_item(
    cid: str,
    item_id: str,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION)),
):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    products = [p for p in doc.get('products', []) if p.get('id') != item_id]
    if len(products) == len(doc.get('products', [])):
        raise HTTPException(status_code=404, detail="Item not found.")
    await db.couriers.update_one({'id': cid}, {'$set': {'products': products}})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)


# ============================================================
# Data Entry workflow
# ============================================================
class SendToDataEntryBody(BaseModel):
    sent: bool = True


@api_router.patch("/couriers/{cid}/send-to-data-entry", response_model=CourierOut)
async def send_courier_to_data_entry(
    cid: str,
    body: SendToDataEntryBody,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE)),
):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if body.sent and not doc.get('products'):
        raise HTTPException(status_code=400, detail="Add at least one item before sending to Data Entry.")
    now_iso = datetime.now(timezone.utc).isoformat()
    update = {
        'sent_to_data_entry': bool(body.sent),
        'sent_to_data_entry_at': now_iso if body.sent else None,
        'sent_to_data_entry_by': user['full_name'] if body.sent else None,
    }
    await db.couriers.update_one({'id': cid}, {'$set': update})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)


@api_router.get("/data-entry/couriers", response_model=List[CourierOut])
async def list_data_entry_couriers(
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_DATA_ENTRY)),
):
    cursor = db.couriers.find(
        {'sent_to_data_entry': True}, {'_id': 0}
    ).sort('sent_to_data_entry_at', -1)
    docs = await cursor.to_list(1000)
    return [courier_doc_to_out(d) for d in docs]


class CourierItemDataEntry(BaseModel):
    supplier: Optional[str] = Field(default=None, max_length=120)
    invoice_number: Optional[str] = Field(default=None, max_length=80)
    invoice_date: Optional[str] = Field(default=None, max_length=40)  # ISO date string (YYYY-MM-DD)
    transportation_method: Optional[str] = Field(default=None, max_length=40)
    transporter_name: Optional[str] = Field(default=None, max_length=120)
    transportation_cost: Optional[float] = Field(default=None, ge=0)
    gst_percent: Optional[float] = Field(default=None, ge=0, le=100)
    total_invoice_amount: Optional[float] = Field(default=None, ge=0)
    cost_per_unit: Optional[float] = Field(default=None, ge=0)
    gst_amount: Optional[float] = Field(default=None, ge=0)
    hsn_code: Optional[str] = Field(default=None, max_length=40)
    unit: Optional[str] = Field(default=None, max_length=20)
    data_entry_done: Optional[bool] = None


@api_router.patch("/couriers/{cid}/items/{item_id}/data-entry", response_model=CourierOut)
async def update_item_data_entry(
    cid: str,
    item_id: str,
    body: CourierItemDataEntry,
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_DATA_ENTRY)),
):
    doc = await db.couriers.find_one({'id': cid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Courier entry not found.")
    if not doc.get('sent_to_data_entry'):
        raise HTTPException(
            status_code=400,
            detail="This courier has not been sent to Data Entry yet.",
        )
    products = list(doc.get('products', []))
    idx = next((i for i, p in enumerate(products) if p.get('id') == item_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Item not found.")

    update_fields = {}
    for f in [
        'supplier', 'invoice_number', 'invoice_date',
        'transportation_method', 'transporter_name', 'hsn_code', 'unit',
    ]:
        v = getattr(body, f)
        if v is not None:
            update_fields[f] = (v.strip() if isinstance(v, str) else v) or None
    for f in [
        'transportation_cost', 'gst_percent', 'total_invoice_amount',
        'cost_per_unit', 'gst_amount',
    ]:
        v = getattr(body, f)
        if v is not None:
            update_fields[f] = float(v)
    if body.data_entry_done is not None:
        update_fields['data_entry_done'] = bool(body.data_entry_done)

    products[idx] = {
        **products[idx],
        **update_fields,
        'data_entry_updated_at': datetime.now(timezone.utc).isoformat(),
        'data_entry_updated_by': user['full_name'],
    }
    await db.couriers.update_one({'id': cid}, {'$set': {'products': products}})
    updated = await db.couriers.find_one({'id': cid}, {'_id': 0})
    return courier_doc_to_out(updated)


# --- Global inventory: flat list of items across all couriers ---
@api_router.get("/inventory/items")
async def list_inventory_items(
    user: dict = Depends(require_role(ROLE_OWNER, ROLE_WAREHOUSE, ROLE_VERIFICATION)),
):
    cursor = db.couriers.find({}, {'_id': 0}).sort('created_at', -1)
    rows = []
    async for doc in cursor:
        courier_number = doc.get('courier_number')
        courier_company = doc.get('courier_company')
        courier_id = doc.get('id')
        checklist = _normalize_checklist(doc.get('checklist'))
        checklist_complete = all(checklist.get(k) for k in COURIER_CHECKLIST_KEYS)
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
                'checklist_complete': checklist_complete,
            })
    # newest items first
    rows.sort(key=lambda r: r.get('created_at') or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return rows


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
