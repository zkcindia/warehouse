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
ROLE_WAREHOUSE = 'warehouse'
ROLE_DATA_ENTRY = 'data_entry'
ROLE_VERIFICATION = 'verification'
VALID_ROLES = [ROLE_OWNER, ROLE_WAREHOUSE, ROLE_DATA_ENTRY, ROLE_VERIFICATION]
STAFF_ROLES = [ROLE_WAREHOUSE, ROLE_DATA_ENTRY, ROLE_VERIFICATION]

ROLE_LABELS = {
    ROLE_OWNER: 'Owner',
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
    role: Literal['owner', 'warehouse', 'data_entry', 'verification']

class LoginResponse(BaseModel):
    token: str
    user: UserPublic

class CreateStaffRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=6, max_length=100)
    role: Literal['warehouse', 'data_entry', 'verification']

# ----- Parcel / Product models -----
class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: int = Field(ge=1, le=1_000_000)

class ProductOut(BaseModel):
    id: str
    name: str
    quantity: int
    created_at: datetime

class ParcelCreate(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: int = Field(ge=1, le=100000)
    carton_photo: Optional[str] = None  # data:image/...;base64,...
    products: List[ProductIn] = Field(min_length=1)
    submitted_by: Optional[str] = Field(default=None, max_length=80)
    payment_made: bool = False
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None

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
