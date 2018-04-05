# Nuage

Call it an FTP client, an S3 viewer or a Dropbox like web app, Nuage leverages your existing storage to help you manage your files in the cloud using any of the following protocols/platforms:

<p align="center">
  FTP • SFTP • WebDAV • Git • S3 <br>
  Dropbox • Google Drive
</p>

![screenshot](https://raw.githubusercontent.com/mickael-kerjean/nuage/master/.assets/img/photo.jpg)

<h1 align="center">
  <a href="https://nuage.kerjean.me"> DEMO </a>
</h1>

# Features
- manage your files directly from your browser
- work with multiple cloud providers and protocols, easily extensible
- upload files and folders
- mobile friendly
- super fast
- audio player
- video player
- image viewer
- emacs keybindings `;)`

# Install
It's a simple react app with node in the backend. Installation requires docker, docker-compose and npm:
```
# get the code
curl -L -X GET https://github.com/mickael-kerjean/nuage/archive/master.zip > nuage.zip
unzip nuage.zip && cd nuage-master
# install dependencies and create the actual image
npm run image && npm run start
```
That's it !

# What about my credentials?
Credentials are stored in your browser in a http only cookie encrypted using aes-256-cbc and aren't persistent in the server disk at all.
The "remember me" feature relies on localstorage to store your credentials encrypted using aes-256-cbc.

Note that on the FTP and sFTP, sessions connections aren't destroyed on every request but are reused and killed after 2 minutes. The reasoning is connections are expensive to create and this trick make the entire application feel much much faster for users who tries to navigate.

# Licensing
Nuage is an open source software with its source code available under the AGPL license. Commercial license and support is available upon request, contact me for details: mickael@kerjean.me

# Credits
- Icons from www.flaticon.com
- Folks developing awesome [libraries](https://github.com/mickael-kerjean/nuage/blob/master/package.json) as Nuage is just butter and cream on top.
