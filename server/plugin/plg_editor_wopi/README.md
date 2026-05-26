
```
# collabora: http://localhost:9980/hosting/discovery
docker run --rm --network=host -e "extra_params=--o:ssl.enable=false" collabora/code

# onlyoffice: http://localhost/hosting/discovery
docker run --network=host -e WOPI_ENABLED=true --rm onlyoffice/documentserver
```
