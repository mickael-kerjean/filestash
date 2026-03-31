
```
# run a IPFS server node:
docker run --rm --name ipfs_host -p 4001:4001 -p 4001:4001/udp -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 ipfs/kubo:v0.39.0
```

api doc:
- https://github.com/ipfs/kubo/blob/c1e1cfebbbc946f957e39345b9224a05704f701d/client/rpc/api.go#L60C6-L69C1
- https://github.com/ipfs/kubo/tree/master/client/rpc
- https://github.com/ipfs/go-ipfs-api
