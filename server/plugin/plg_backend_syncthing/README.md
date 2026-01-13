```
# Test instance:
docker run --name=syncthing-sync -d -e PUID=1000 -e PGID=1000 -p 8384:8384 -v ./syncthing/config:/var/syncthing -v ./syncthing/sync:/sync syncthing/syncthing
```

ref: https://docs.syncthing.net/v1.0.0/rest/system-browse-get.html
