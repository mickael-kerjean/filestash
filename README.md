![screenshot](https://raw.githubusercontent.com/mickael-kerjean/nuage/master/.assets/img/photo.jpg)

<p align="center">
    A Dropbox-like file manager that let you manage your data anywhere it is located:<br>
    FTP • SFTP • WebDAV • Git • S3 <br>
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
- Audio player
- Video player
- Image viewer
- Emacs keybindings + [org mode](https://orgmode.org/) friendly `;)`
- Frequently access folders are pin to the homepage for quick access
- Customise the connection page so that your users don't even have to know what protocol to use and where it is located ([example](http://files.kerjean.me))
- Stateless (perfect candidate for AWS lamdba if that's your thing)

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
Credentials are stored in your browser in a http only cookie encrypted using aes-256-cbc and aren't persistent in the server disk at all.
The "remember me" feature relies on localstorage to store your credentials encrypted using aes-256-cbc.

Note that on the FTP and sFTP, sessions connections aren't destroyed on every request but are reused and killed after 2 minutes. The reasoning is connections are expensive to create and this trick make the entire application feel much much faster for users who tries to navigate.

# Licensing
Nuage is an open source software with its source code available under the AGPL license. Commercial license and support is available upon request, contact me for details: mickael@kerjean.me

# Credits
- Iconography: www.flaticon.com, fontawesome.com and material.io
- Folks developing awesome [libraries](https://github.com/mickael-kerjean/nuage/blob/master/package.json)
