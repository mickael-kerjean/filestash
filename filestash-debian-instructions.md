⚠ Make sure to be root.

First, install go 1.13 to `/usr/local/`:
```sh
curl --resolve golang.org -sL https://golang.org/dl/go1.13.15.src.tar.gz | tar xzf -C /usr/local
```

Once that done, you can run the script to install filestash :
```sh
filestash-debian-script.sh 
```

The executable will be located in `/app`.

As filestash runs on port 8334, this port must be allowed by the firewall. There are several ways to do this, but here is what you should do with UFW:
```sh
ufw allow 8334
```

To start filestash run :
```sh
systemctl start filestash
```
