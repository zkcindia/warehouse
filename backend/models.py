from pydantic import BaseModel, Field, ConfigDict, EmailStr
from datetime import datetime
from typing import List, Optional, Literal

# =========================
# User Models
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

# =========================
# Parcel / Product Models
# =========================
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
    po_number: Optional[str] = None
    batch_number: Optional[str] = None
    mrp: Optional[float] = None
    discount_percent: Optional[float] = None
    igst_percent: Optional[float] = None
    expiry_date: Optional[str] = None
    remarks: Optional[str] = None
    cgst_per_unit: Optional[float] = None
    sgst_per_unit: Optional[float] = None
    transport_per_unit: Optional[float] = None
    final_per_unit_auto: Optional[float] = None
    final_total_auto: Optional[float] = None
    final_price_manual: Optional[float] = None
    final_price_source: Optional[str] = None
    verification_done: bool = False
    verification_notes: Optional[str] = None
    verified_at: Optional[str] = None
    verified_by: Optional[str] = None
    created_at: datetime

class ParcelCreate(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: int = Field(ge=1, le=100000)
    carton_photo: Optional[str] = None
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

class ParcelPatch(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: Optional[int] = Field(default=None, ge=1, le=100000)
    carton_photo: Optional[str] = None
    submitted_by: Optional[str] = Field(default=None, max_length=80)
    payment_made: Optional[bool] = None
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None
    products: Optional[List[ProductIn]] = None

class ProductPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    quantity: Optional[int] = Field(default=None, ge=1, le=1_000_000)

# =========================
# Courier Models
# =========================
class CourierAttachment(BaseModel):
    id: str
    name: str
    mime_type: Optional[str] = None
    size: Optional[int] = None
    data: str
    uploaded_at: Optional[str] = None

class CourierAttachmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    mime_type: Optional[str] = Field(default=None, max_length=120)
    size: Optional[int] = Field(default=None, ge=0)
    data: str = Field(min_length=1)

class CourierEntry(BaseModel):
    courier_company: Optional[str] = Field(default=None, max_length=120)
    tracking_number: Optional[str] = Field(default=None, max_length=80)
    receiver_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: int = Field(ge=1, le=100000)
    slip_photo: Optional[str] = None
    package_photo: Optional[str] = None
    products: List[ProductIn] = Field(default_factory=list)
    charges: Optional[float] = Field(default=None, ge=0)
    payment_made: bool = False
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None
    attachments: List[CourierAttachmentIn] = Field(default_factory=list)

class CourierBatchCreate(BaseModel):
    handled_by: Optional[str] = Field(default=None, max_length=80)
    entries: List[CourierEntry] = Field(min_length=1, max_length=50)

class CourierOut(BaseModel):
    id: str
    courier_number: str
    courier_company: Optional[str] = None
    tracking_number: Optional[str] = None
    receiver_name: Optional[str] = None
    num_packages: int
    slip_photo: Optional[str] = None
    package_photo: Optional[str] = None
    products: List[ProductOut]
    handled_by: Optional[str] = None
    charges: Optional[float] = None
    payment_made: bool
    payment_mode: Optional[str] = None
    total_quantity: int
    checklist: dict
    accepted: bool = False
    accepted_at: Optional[str] = None
    accepted_by: Optional[str] = None
    rejected: bool = False
    rejected_reason: Optional[str] = None
    rejected_at: Optional[str] = None
    rejected_by: Optional[str] = None
    
    # ADD THESE MISSING FIELDS:
    owner_approved: bool = False
    owner_approved_at: Optional[str] = None
    owner_approved_by: Optional[str] = None
    owner_rejected: bool = False
    owner_rejected_reason: Optional[str] = None
    owner_rejected_at: Optional[str] = None
    owner_rejected_by: Optional[str] = None
    status: str = "pending_owner_approval"
    
    sent_to_data_entry: bool = False
    sent_to_owner: bool = False
    sent_to_owner_at: Optional[str] = None
    sent_to_owner_by: Optional[str] = None
    ready_for_verification: bool = False
    ready_for_verification_at: Optional[str] = None
    verification_complete: bool = False
    verification_complete_at: Optional[str] = None
    verification_complete_by: Optional[str] = None
    data_entry_done_count: int = 0
    verification_done_count: int = 0
    attachments: List[CourierAttachment] = Field(default_factory=list)
    created_at: datetime
    created_by_name: str

       # Add these:
    upload_list_text: Optional[str] = None
    upload_list_photo: Optional[str] = None
    upload_list_type: Optional[str] = None
    upload_list_name: Optional[str] = None
    upload_list_mime: Optional[str] = None
    invoice_photo: Optional[str] = None
    invoice_name: Optional[str] = None
    invoice_mime: Optional[str] = None


    
class CourierPatch(BaseModel):
    courier_company: Optional[str] = Field(default=None, max_length=120)
    tracking_number: Optional[str] = Field(default=None, max_length=80)
    receiver_name: Optional[str] = Field(default=None, max_length=120)
    num_packages: Optional[int] = Field(default=None, ge=1, le=100000)
    slip_photo: Optional[str] = None
    package_photo: Optional[str] = None
    handled_by: Optional[str] = Field(default=None, max_length=80)
    charges: Optional[float] = Field(default=None, ge=0)
    payment_made: Optional[bool] = None
    payment_mode: Optional[Literal['upi', 'card', 'cash']] = None
    products: Optional[List[ProductIn]] = None

class ChecklistUpdate(BaseModel):
    checklist: dict

class AcceptCourierBody(BaseModel):
    accepted: bool = True

class RejectCourierBody(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)

class CourierItemAdd(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: int = Field(ge=1, le=1_000_000)
    photo: Optional[str] = None
    damaged: bool = False
    damaged_count: int = Field(default=0, ge=0, le=1_000_000)
    category: Optional[str] = Field(default=None, max_length=80)
    brand: Optional[str] = Field(default=None, max_length=80)
    code: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, max_length=600)
    price: Optional[float] = Field(default=None, ge=0)

class CourierItemsBatchAdd(BaseModel):
    items: List[CourierItemAdd] = Field(min_length=1, max_length=100)

class SendToDataEntryBody(BaseModel):
    sent: bool = True

class OwnerForwardBody(BaseModel):
    forward: bool = True

class CourierItemDataEntry(BaseModel):
    supplier: Optional[str] = Field(default=None, max_length=120)
    invoice_number: Optional[str] = Field(default=None, max_length=80)
    invoice_date: Optional[str] = Field(default=None, max_length=40)
    transportation_method: Optional[str] = Field(default=None, max_length=40)
    transporter_name: Optional[str] = Field(default=None, max_length=120)
    transportation_cost: Optional[float] = Field(default=None, ge=0)
    gst_percent: Optional[float] = Field(default=None, ge=0, le=100)
    total_invoice_amount: Optional[float] = Field(default=None, ge=0)
    cost_per_unit: Optional[float] = Field(default=None, ge=0)
    gst_amount: Optional[float] = Field(default=None, ge=0)
    hsn_code: Optional[str] = Field(default=None, max_length=40)
    unit: Optional[str] = Field(default=None, max_length=20)
    po_number: Optional[str] = Field(default=None, max_length=80)
    batch_number: Optional[str] = Field(default=None, max_length=80)
    mrp: Optional[float] = Field(default=None, ge=0)
    discount_percent: Optional[float] = Field(default=None, ge=0, le=100)
    igst_percent: Optional[float] = Field(default=None, ge=0, le=100)
    expiry_date: Optional[str] = Field(default=None, max_length=40)
    remarks: Optional[str] = Field(default=None, max_length=500)
    data_entry_done: Optional[bool] = None

class VerificationItemBody(BaseModel):
    final_price_manual: Optional[float] = Field(default=None, ge=0)
    clear_manual: Optional[bool] = None
    verification_done: Optional[bool] = None
    verification_notes: Optional[str] = Field(default=None, max_length=500)

class CompleteVerificationBody(BaseModel):
    complete: bool = True