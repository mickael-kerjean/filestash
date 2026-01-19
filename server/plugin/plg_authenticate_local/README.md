
```
export TOKEN=xxxx


# list users
curl -H "Accept: application/json" -H "Authorization: Bearer $TOKEN" "http://localhost:8334/admin/api/simple-user-management"

# upsert user
curl -X POST -d 'email=test@example.com&password=password&role=user' -H "Accept: application/json" -H "Authorization: Bearer $TOKEN" "http://localhost:8334/admin/api/simple-user-management"

# delete user
curl -X DELETE -H "Accept: application/json" -H "Authorization: Bearer $TOKEN" "http://localhost:8334/admin/api/simple-user-management?email=test@example.com"
```
