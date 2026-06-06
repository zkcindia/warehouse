import bcrypt
import jwt
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import ReturnDocument
from config import db, JWT_SECRET, JWT_ALG, JWT_EXP_HOURS, ROLE_LABELS, COURIER_CHECKLIST_KEYS

security = HTTPBearer()

# =========================
# Auth Helpers
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
# Data Helpers
# =========================
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

def _default_checklist() -> dict:
    return {k: False for k in COURIER_CHECKLIST_KEYS}

def _normalize_checklist(raw: dict = None) -> dict:
    out = _default_checklist()
    if not raw or not isinstance(raw, dict):
        return out
    for k in COURIER_CHECKLIST_KEYS:
        out[k] = bool(raw.get(k, False))
    return out

async def _next_parcel_number() -> str:
    res = await db.counters.find_one_and_update(
        {'_id': 'parcel_number'},
        {'$inc': {'value': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    val = (res or {}).get('value') or 1
    return f"PCL-{val:04d}"

async def _next_courier_number(now: datetime = None) -> str:
    now = now or datetime.now(timezone.utc)
    date_key = now.strftime('%d%m%y')
    res = await db.counters.find_one_and_update(
        {'_id': f'courier_number:{date_key}'},
        {'$inc': {'value': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    val = (res or {}).get('value') or 1
    return f"{date_key}-{val:02d}"

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