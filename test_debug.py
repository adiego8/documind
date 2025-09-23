#!/usr/bin/env python3

import sys
sys.path.append('/Users/alejandrodiego/Projects/rag/mywelltax')

from app.database import UserDB, UserQueryDB

# Test get_user_by_username
print("Testing get_user_by_username:")
admin_user = UserDB.get_user_by_username('admin')
print(f"Admin user: {admin_user}")
print(f"Has admin_code_id: {'admin_code_id' in admin_user}")

# Test the new admin method
print("\nTesting get_all_queries_for_assistant_by_admin_code:")
try:
    queries = UserQueryDB.get_all_queries_for_assistant_by_admin_code(1, 1, 3)
    print(f"Number of queries: {len(queries)}")
    if queries:
        print(f"First query keys: {list(queries[0].keys())}")
        print(f"First query username: {queries[0].get('username', 'NOT FOUND')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()