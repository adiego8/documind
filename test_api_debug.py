#!/usr/bin/env python3
import requests

# Test API with debug
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc1ODQ1OTU5MX0.bQd3dmpXy_cd53oVPtvX-hrWMNvro4euggn_Z5bl09o"

# First check what get_current_user returns by calling a different endpoint that prints user info
headers = {"Authorization": f"Bearer {token}"}

print("Making API call to assistants endpoint...")
response = requests.get("http://localhost:8000/assistants/1/history?limit=1", headers=headers)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    queries = data.get('queries', [])
    print(f"Number of queries: {len(queries)}")
    if queries:
        query = queries[0]
        print(f"Query has username field: {'username' in query}")
        print(f"Query keys: {list(query.keys())}")
else:
    print(f"Error: {response.text}")