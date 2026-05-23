#!/usr/bin/env python3
"""
Backend API Testing for Warehouse Management System
Tests all authentication and staff management endpoints
"""
import requests
import sys
from datetime import datetime

# Public endpoint from frontend/.env
BASE_URL = "https://stock-manager-1051.preview.emergentagent.com/api"

# Default credentials
OWNER_EMAIL = "owner@warehouse.com"
OWNER_PASSWORD = "Owner@123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class WMSAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.owner_token = None
        self.staff_token = None
        self.created_staff_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []

    def log(self, message, color=Colors.BLUE):
        print(f"{color}{message}{Colors.END}")

    def test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        self.tests_run += 1
        
        print(f"\n{'='*80}")
        print(f"Test #{self.tests_run}: {name}")
        if description:
            print(f"Description: {description}")
        print(f"{'='*80}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", Colors.GREEN)
                self.test_results.append({"test": name, "status": "PASSED", "code": response.status_code})
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", Colors.RED)
                self.log(f"Response: {response.text}", Colors.RED)
                self.test_results.append({"test": name, "status": "FAILED", "expected": expected_status, "got": response.status_code, "response": response.text[:200]})

            # Try to parse JSON response
            try:
                response_data = response.json()
                print(f"Response data: {response_data}")
                return success, response_data
            except:
                return success, {}

        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Error: {str(e)}", Colors.RED)
            self.test_results.append({"test": name, "status": "ERROR", "error": str(e)})
            return False, {}

    def run_all_tests(self):
        """Execute all test cases"""
        self.log("\n" + "="*80, Colors.BLUE)
        self.log("WAREHOUSE MANAGEMENT SYSTEM - BACKEND API TESTS", Colors.BLUE)
        self.log("="*80 + "\n", Colors.BLUE)

        # Test 1: Valid owner login
        success, response = self.test(
            "Owner Login - Valid Credentials",
            "POST",
            "/auth/login",
            200,
            data={"email": OWNER_EMAIL, "password": OWNER_PASSWORD, "role": "owner"},
            description="Login with default owner credentials"
        )
        if success and 'token' in response:
            self.owner_token = response['token']
            self.log(f"✓ Owner token obtained: {self.owner_token[:20]}...", Colors.GREEN)
        else:
            self.log("✗ Failed to obtain owner token - stopping tests", Colors.RED)
            return self.print_summary()

        # Test 2: Wrong password
        self.test(
            "Owner Login - Wrong Password",
            "POST",
            "/auth/login",
            401,
            data={"email": OWNER_EMAIL, "password": "WrongPassword123", "role": "owner"},
            description="Should reject wrong password with 401"
        )

        # Test 3: Role mismatch
        self.test(
            "Owner Login - Role Mismatch",
            "POST",
            "/auth/login",
            403,
            data={"email": OWNER_EMAIL, "password": OWNER_PASSWORD, "role": "warehouse"},
            description="Should reject role mismatch with 403"
        )

        # Test 4: Get current user with token
        self.test(
            "Get Current User (/auth/me)",
            "GET",
            "/auth/me",
            200,
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Should return current user with valid Bearer token"
        )

        # Test 5: Create staff - warehouse role
        test_email = f"test_warehouse_{datetime.now().strftime('%H%M%S')}@warehouse.com"
        success, response = self.test(
            "Create Staff - Warehouse Role",
            "POST",
            "/owner/staff",
            201,
            data={
                "email": test_email,
                "full_name": "Test Warehouse Staff",
                "password": "Test@123",
                "role": "warehouse"
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Owner creates a warehouse staff account"
        )
        if success and 'id' in response:
            self.created_staff_id = response['id']
            self.created_staff_email = test_email
            self.log(f"✓ Staff created with ID: {self.created_staff_id}", Colors.GREEN)

        # Test 6: Create staff - duplicate email
        self.test(
            "Create Staff - Duplicate Email",
            "POST",
            "/owner/staff",
            409,
            data={
                "email": test_email,
                "full_name": "Duplicate Staff",
                "password": "Test@123",
                "role": "data_entry"
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Should reject duplicate email with 409"
        )

        # Test 7: Login as newly created staff
        success, response = self.test(
            "Staff Login - Newly Created Account",
            "POST",
            "/auth/login",
            200,
            data={"email": test_email, "password": "Test@123", "role": "warehouse"},
            description="Newly created staff should be able to login"
        )
        if success and 'token' in response:
            self.staff_token = response['token']
            self.log(f"✓ Staff token obtained: {self.staff_token[:20]}...", Colors.GREEN)

        # Test 8: Staff tries to create another staff (should fail with 403)
        if self.staff_token:
            self.test(
                "Create Staff - Non-Owner JWT",
                "POST",
                "/owner/staff",
                403,
                data={
                    "email": "another_staff@warehouse.com",
                    "full_name": "Another Staff",
                    "password": "Test@123",
                    "role": "verification"
                },
                headers={"Authorization": f"Bearer {self.staff_token}"},
                description="Non-owner should not be able to create staff (403)"
            )

        # Test 9: List all staff
        success, response = self.test(
            "List All Staff",
            "GET",
            "/owner/staff",
            200,
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Owner should be able to list all staff"
        )
        if success:
            staff_count = len(response) if isinstance(response, list) else 0
            self.log(f"✓ Found {staff_count} staff member(s)", Colors.GREEN)

        # Test 10: Delete staff
        if self.created_staff_id:
            self.test(
                "Delete Staff",
                "DELETE",
                f"/owner/staff/{self.created_staff_id}",
                200,
                headers={"Authorization": f"Bearer {self.owner_token}"},
                description="Owner should be able to delete staff"
            )

        # Test 11: Create staff with other roles (data_entry, verification)
        for role in ["data_entry", "verification"]:
            test_email_role = f"test_{role}_{datetime.now().strftime('%H%M%S')}@warehouse.com"
            success, response = self.test(
                f"Create Staff - {role.replace('_', ' ').title()} Role",
                "POST",
                "/owner/staff",
                201,
                data={
                    "email": test_email_role,
                    "full_name": f"Test {role.replace('_', ' ').title()} Staff",
                    "password": "Test@123",
                    "role": role
                },
                headers={"Authorization": f"Bearer {self.owner_token}"},
                description=f"Owner creates a {role} staff account"
            )
            if success and 'id' in response:
                # Clean up - delete the created staff
                requests.delete(
                    f"{self.base_url}/owner/staff/{response['id']}",
                    headers={"Authorization": f"Bearer {self.owner_token}"}
                )

        # ============================================================
        # PHASE 3: PARCEL MANAGEMENT TESTS
        # ============================================================
        self.log("\n" + "="*80, Colors.BLUE)
        self.log("PHASE 3: PARCEL MANAGEMENT TESTS", Colors.BLUE)
        self.log("="*80 + "\n", Colors.BLUE)

        # Test 12: Create parcel with payment_made=true and payment_mode='upi'
        success, response = self.test(
            "Create Parcel - Payment Made (UPI)",
            "POST",
            "/parcels",
            201,
            data={
                "company_name": "ABC Traders",
                "num_packages": 5,
                "products": [
                    {"name": "T-Shirt", "quantity": 50},
                    {"name": "Jeans", "quantity": 20}
                ],
                "payment_made": True,
                "payment_mode": "upi"
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Create parcel with payment made via UPI"
        )
        parcel_id_1 = None
        parcel_number_1 = None
        if success and 'id' in response:
            parcel_id_1 = response['id']
            parcel_number_1 = response.get('parcel_number')
            self.log(f"✓ Parcel created: {parcel_number_1} (ID: {parcel_id_1})", Colors.GREEN)
            # Verify parcel_number format
            if parcel_number_1 and parcel_number_1.startswith('PCL-'):
                self.log(f"✓ Parcel number format correct: {parcel_number_1}", Colors.GREEN)
            else:
                self.log(f"✗ Parcel number format incorrect: {parcel_number_1}", Colors.RED)
            # Verify products have IDs and timestamps
            if 'products' in response and len(response['products']) == 2:
                for prod in response['products']:
                    if 'id' in prod and 'created_at' in prod:
                        self.log(f"✓ Product has ID and timestamp: {prod['name']}", Colors.GREEN)
                    else:
                        self.log(f"✗ Product missing ID or timestamp: {prod}", Colors.RED)
            # Verify payment_mode is returned
            if response.get('payment_mode') == 'upi':
                self.log(f"✓ Payment mode stored correctly: upi", Colors.GREEN)
            else:
                self.log(f"✗ Payment mode incorrect: {response.get('payment_mode')}", Colors.RED)

        # Test 13: Create parcel with payment_made=true and payment_mode='card'
        success, response = self.test(
            "Create Parcel - Payment Made (Card)",
            "POST",
            "/parcels",
            201,
            data={
                "company_name": "XYZ Corp",
                "num_packages": 3,
                "products": [
                    {"name": "Laptop", "quantity": 10}
                ],
                "payment_made": True,
                "payment_mode": "card"
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Create parcel with payment made via Card"
        )
        parcel_id_2 = None
        if success and 'id' in response:
            parcel_id_2 = response['id']
            if response.get('payment_mode') == 'card':
                self.log(f"✓ Payment mode stored correctly: card", Colors.GREEN)

        # Test 14: Create parcel with payment_made=true and payment_mode='cash'
        success, response = self.test(
            "Create Parcel - Payment Made (Cash)",
            "POST",
            "/parcels",
            201,
            data={
                "company_name": "Cash Traders",
                "num_packages": 2,
                "products": [
                    {"name": "Shoes", "quantity": 15}
                ],
                "payment_made": True,
                "payment_mode": "cash"
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Create parcel with payment made via Cash"
        )
        parcel_id_3 = None
        if success and 'id' in response:
            parcel_id_3 = response['id']

        # Test 15: Create parcel with payment_made=true but no payment_mode (should fail with 400)
        self.test(
            "Create Parcel - Payment Made Without Mode",
            "POST",
            "/parcels",
            400,
            data={
                "company_name": "No Mode Company",
                "num_packages": 1,
                "products": [
                    {"name": "Item", "quantity": 5}
                ],
                "payment_made": True
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Should reject payment_made=true without payment_mode (400)"
        )

        # Test 16: Create parcel with payment_made=false (payment_mode should be null)
        success, response = self.test(
            "Create Parcel - Payment Not Made",
            "POST",
            "/parcels",
            201,
            data={
                "company_name": "Unpaid Company",
                "num_packages": 4,
                "products": [
                    {"name": "Widget", "quantity": 30}
                ],
                "payment_made": False,
                "payment_mode": "upi"  # Should be ignored
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Create parcel with payment_made=false (payment_mode should be null)"
        )
        parcel_id_4 = None
        if success and 'id' in response:
            parcel_id_4 = response['id']
            if response.get('payment_mode') is None:
                self.log(f"✓ Payment mode correctly nulled when payment_made=false", Colors.GREEN)
            else:
                self.log(f"✗ Payment mode should be null but got: {response.get('payment_mode')}", Colors.RED)

        # Test 17: Create parcel with empty products array (should fail with 422)
        self.test(
            "Create Parcel - Empty Products Array",
            "POST",
            "/parcels",
            422,
            data={
                "company_name": "Empty Products",
                "num_packages": 1,
                "products": [],
                "payment_made": False
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Should reject empty products array (422)"
        )

        # Test 18: Create parcel with carton_photo (base64 data URL)
        # Small 1x1 red pixel PNG as base64
        small_image_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        success, response = self.test(
            "Create Parcel - With Carton Photo",
            "POST",
            "/parcels",
            201,
            data={
                "company_name": "Photo Company",
                "num_packages": 1,
                "products": [
                    {"name": "Item with Photo", "quantity": 10}
                ],
                "payment_made": False,
                "carton_photo": small_image_base64
            },
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Create parcel with base64 carton photo"
        )
        parcel_id_5 = None
        if success and 'id' in response:
            parcel_id_5 = response['id']
            if response.get('carton_photo') == small_image_base64:
                self.log(f"✓ Carton photo stored and returned correctly", Colors.GREEN)
            else:
                self.log(f"✗ Carton photo not returned correctly", Colors.RED)

        # Test 19: GET /api/parcels - List all parcels (newest first)
        success, response = self.test(
            "List All Parcels",
            "GET",
            "/parcels",
            200,
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Owner should be able to list all parcels"
        )
        if success and isinstance(response, list):
            self.log(f"✓ Found {len(response)} parcel(s)", Colors.GREEN)
            # Verify newest first (check if first parcel has later created_at than last)
            if len(response) >= 2:
                first_time = response[0].get('created_at', '')
                last_time = response[-1].get('created_at', '')
                if first_time >= last_time:
                    self.log(f"✓ Parcels sorted newest first", Colors.GREEN)
                else:
                    self.log(f"✗ Parcels not sorted correctly", Colors.RED)
            # Verify total_quantity is computed
            for parcel in response[:3]:  # Check first 3
                if 'total_quantity' in parcel:
                    expected_total = sum(p['quantity'] for p in parcel.get('products', []))
                    if parcel['total_quantity'] == expected_total:
                        self.log(f"✓ total_quantity computed correctly for {parcel.get('parcel_number')}", Colors.GREEN)
                    else:
                        self.log(f"✗ total_quantity incorrect for {parcel.get('parcel_number')}", Colors.RED)

        # Test 20: GET /api/parcels/{id} - Get single parcel
        if parcel_id_1:
            success, response = self.test(
                "Get Single Parcel",
                "GET",
                f"/parcels/{parcel_id_1}",
                200,
                headers={"Authorization": f"Bearer {self.owner_token}"},
                description="Get a single parcel by ID"
            )
            if success and response.get('id') == parcel_id_1:
                self.log(f"✓ Retrieved correct parcel: {response.get('parcel_number')}", Colors.GREEN)

        # Test 21: GET /api/parcels/stats/summary - Get summary stats
        success, response = self.test(
            "Get Parcel Stats Summary",
            "GET",
            "/parcels/stats/summary",
            200,
            headers={"Authorization": f"Bearer {self.owner_token}"},
            description="Get summary statistics for all parcels"
        )
        if success:
            required_fields = ['total_parcels', 'paid', 'unpaid', 'total_packages', 'total_units']
            all_present = all(field in response for field in required_fields)
            if all_present:
                self.log(f"✓ All required stats fields present", Colors.GREEN)
                self.log(f"  Total parcels: {response.get('total_parcels')}", Colors.BLUE)
                self.log(f"  Paid: {response.get('paid')}, Unpaid: {response.get('unpaid')}", Colors.BLUE)
                self.log(f"  Total packages: {response.get('total_packages')}", Colors.BLUE)
                self.log(f"  Total units: {response.get('total_units')}", Colors.BLUE)
            else:
                self.log(f"✗ Missing required stats fields", Colors.RED)

        # Test 22: RBAC - Login as existing warehouse staff for RBAC tests
        success, response = self.test(
            "Login as Warehouse Staff for RBAC",
            "POST",
            "/auth/login",
            200,
            data={"email": "warehouse@warehouse.com", "password": "Warehouse@123", "role": "warehouse"},
            description="Login with existing warehouse staff for RBAC tests"
        )
        warehouse_token = None
        if success and 'token' in response:
            warehouse_token = response['token']
            self.log(f"✓ Warehouse staff token obtained for RBAC tests", Colors.GREEN)

        # Test 23: RBAC - Non-owner (warehouse staff) tries to create parcel (should fail with 403)
        if warehouse_token:
            self.test(
                "RBAC - Non-Owner Create Parcel",
                "POST",
                "/parcels",
                403,
                data={
                    "company_name": "Unauthorized",
                    "num_packages": 1,
                    "products": [{"name": "Item", "quantity": 1}],
                    "payment_made": False
                },
                headers={"Authorization": f"Bearer {warehouse_token}"},
                description="Non-owner should not be able to create parcels (403)"
            )

            # Test 24: RBAC - Non-owner tries to list parcels (should fail with 403)
            self.test(
                "RBAC - Non-Owner List Parcels",
                "GET",
                "/parcels",
                403,
                headers={"Authorization": f"Bearer {warehouse_token}"},
                description="Non-owner should not be able to list parcels (403)"
            )

            # Test 25: RBAC - Non-owner tries to get parcel stats (should fail with 403)
            self.test(
                "RBAC - Non-Owner Get Stats",
                "GET",
                "/parcels/stats/summary",
                403,
                headers={"Authorization": f"Bearer {warehouse_token}"},
                description="Non-owner should not be able to get stats (403)"
            )

        # Test 26: Delete Parcel
        if parcel_id_2:
            self.test(
                "Delete Parcel",
                "DELETE",
                f"/parcels/{parcel_id_2}",
                200,
                headers={"Authorization": f"Bearer {self.owner_token}"},
                description="Owner should be able to delete a parcel"
            )

            # Verify deletion - try to get the deleted parcel (should fail with 404)
            self.test(
                "Verify Parcel Deleted",
                "GET",
                f"/parcels/{parcel_id_2}",
                404,
                headers={"Authorization": f"Bearer {self.owner_token}"},
                description="Deleted parcel should not be found (404)"
            )

        # Test 27: RBAC - Non-owner tries to delete parcel (should fail with 403)
        if warehouse_token and parcel_id_3:
            self.test(
                "RBAC - Non-Owner Delete Parcel",
                "DELETE",
                f"/parcels/{parcel_id_3}",
                403,
                headers={"Authorization": f"Bearer {warehouse_token}"},
                description="Non-owner should not be able to delete parcels (403)"
            )

        return self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        self.log("TEST SUMMARY", Colors.BLUE)
        print("="*80)
        print(f"Total Tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}", Colors.GREEN)
        if self.tests_failed > 0:
            self.log(f"Failed: {self.tests_failed}", Colors.RED)
        else:
            self.log(f"Failed: {self.tests_failed}", Colors.GREEN)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        print("="*80 + "\n")

        if self.tests_failed > 0:
            self.log("FAILED TESTS:", Colors.RED)
            for result in self.test_results:
                if result['status'] in ['FAILED', 'ERROR']:
                    print(f"  - {result['test']}: {result}")
            print()

        return 0 if self.tests_failed == 0 else 1

def main():
    tester = WMSAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
