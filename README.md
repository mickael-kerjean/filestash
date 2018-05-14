![screenshot](https://raw.githubusercontent.com/mickael-kerjean/nuage/master/.assets/img/photo.jpg)

<p align="center">
    A Dropbox-like file manager that let you manage your data anywhere it is located:<br>
    FTP • SFTP • WebDAV • Git • S3 • Minio <br>
        Dropbox • Google Drive
</p>
<p align="center">
    <i>Yes we have a</i> <b><a href="https://nuage.kerjean.me">DEMO</a></b>
</p>


# Features
- Manage your files directly from your browser
- User friendly
- Super fast
- Works offline
- Upload files and folders
- Works great on mobile
- Multiple cloud providers and protocols, easily extensible
- [Org Mode](https://orgmode.org/) friendly: see [org features](https://github.com/mickael-kerjean/nuage/wiki/Org-Mode)
- Audio player
- Video player
- Image viewer
- Emacs keybindings `;)`
- Frequently access folders are pin to the homepage for quick access
- Customise the connection page so that your users don't even have to know what protocol to use and where it is located ([example](http://files.kerjean.me))
- Stateless (perfect candidate for AWS lambda if that's your thing)

# Install
Nuage is a react app with node in the backend. Installation:
```
git clone https://github.com/mickael-kerjean/nuage
cd nuage
npm install
npm run build
node server/index.js
```

Or with [docker](https://hub.docker.com/r/machines/nuage/) and [Docker compose](https://github.com/mickael-kerjean/nuage/blob/master/docker/docker-compose.yml)

# What about my credentials?
Nuage is stateless, nothing is kept server side. Credentials are simply stored in an http only cookie encrypted using aes-256-cbc only the server has the key (in config_server.js).

# Credits
- Iconography: www.flaticon.com, fontawesome.com and material.io
- Folks developing awesome [libraries](https://github.com/mickael-kerjean/nuage/blob/master/package.json)
