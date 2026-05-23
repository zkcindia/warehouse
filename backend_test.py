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
