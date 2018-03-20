# What is it about?
Call it an FTP client, an S3 viewer or a Dropbox like web app, Nuage leverages your existing storage to help you manage your files in the cloud using any of the following protocols/platforms:

<p align="center">
  FTP • SFTP • WebDAV • Git • S3 <br>
  Dropbox • Google Drive
</p>

[Try it here](https://nuage.kerjean.me)

[[https://raw.githubusercontent.com/mickael-kerjean/nuage/master/.assets/img/photo.jpg]]


# Features
- manage your files directly from your browser
- work with multiple cloud providers and protocols, easily extensible
- upload files and folders
- mobile friendly
- super fast
- audio player
- video player
- image viewer
- emacs keybindings =;)=

# What about my credentials?
Credentials are stored in your browser in a http only cookie encrypted using aes-256-cbc and aren't persistent in the server disk at all.
The "remember me" feature relies on localstorage to store your credentials encrypted using aes-256-cbc.

Note that on the FTP and sFTP, sessions connections aren't destroyed on every request but are reused and killed after 2 minutes. The reasoning is connections are expensive to create and this trick make the entire application feel much much faster for users who tries to navigate.

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

# Known Issues
- Google Drive: Google Drive lets you add multiple files with the same name in the same directory. You won't be able to see all those in Nuage as we assume that all filenames in a directory are unique.

# Licensing
Nuage is an open source software with its source code available under the AGPL license. Commercial license and support is available upon request, contact me for details: mickael@kerjean.me


# Credits
- Icons from www.flaticon.com
- Folks developing awesome [libraries](https://github.com/mickael-kerjean/nuage/blob/master/package.json) as Nuage is just butter and cream on top.
