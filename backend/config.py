from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me-in-prod-warehouse-secret-key-2026')
JWT_ALG = 'HS256'
JWT_EXP_HOURS = 24 * 7

# Roles
ROLE_OWNER = 'owner'
ROLE_CASHIER = 'cashier'
ROLE_WAREHOUSE = 'warehouse'
ROLE_DATA_ENTRY = 'data_entry'
ROLE_VERIFICATION = 'verification'
STAFF_ROLES = [ROLE_CASHIER, ROLE_WAREHOUSE, ROLE_DATA_ENTRY, ROLE_VERIFICATION]

ROLE_LABELS = {
    ROLE_OWNER: 'Owner',
    ROLE_CASHIER: 'Cashier',
    ROLE_WAREHOUSE: 'Warehouse Staff',
    ROLE_DATA_ENTRY: 'Data Entry Staff',
    ROLE_VERIFICATION: 'Verification Staff',
}

# Warehouse checklist keys
COURIER_CHECKLIST_KEYS = [
    'master_carton',
    'label_check',
    'bills_check',
    'quantity_verify',
    'damage_check',
    'photo_taken',
]

def close_db():
    client.close()