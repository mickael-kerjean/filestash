![screenshot](https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/photo.jpg)

<p align="center">
    <a href="https://github.com/mickael-kerjean/contributors" alt="Contributors">
        <img src="https://img.shields.io/github/contributors/mickael-kerjean/filestash" style="max-width:100%;">
    </a>
    <a href="https://opencollective.com/filestash" alt="Backers on Open Collective">
        <img src="https://img.shields.io/opencollective/backers/filestash" style="max-width:100%;">
    </a>
    <a href="https://opencollective.com/filestash" alt="Sponsors on Open Collective">
        <img src="https://img.shields.io/opencollective/sponsors/filestash" style="max-width:100%;">
    </a>
    <a href="https://hub.docker.com/r/machines/filestash" alt="Docker Hub">
        <img src="https://img.shields.io/docker/pulls/machines/filestash" style="max-width:100%;">
    </a>
    <br>
    <a href="#" alt="Build">
        <img src="https://github.com/mickael-kerjean/filestash/actions/workflows/ci.yml/badge.svg" style="max-width:100%;">
    </a>
    <a href="https://kiwiirc.com/nextclient/#irc://irc.libera.chat/#filestash?nick=guest??" alt="Chat on IRC">
        <img src="https://img.shields.io/badge/IRC-%23filestash-brightgreen.svg" style="max-width:100%;">
    </a>
</p>

<p align="center">
    A Dropbox-like file manager that let you manage your data anywhere it is located:<br>
    <a href="https://www.filestash.app/ftp-client.html">FTP</a> • FTPS • <a href="https://www.filestash.app/ssh-file-transfer.html">SFTP</a> • <a href="https://www.filestash.app/webdav-client.html">WebDAV</a> • Git • <a href="https://www.filestash.app/s3-browser.html">S3</a> • NFS • Samba • Artifactory • <a href="https://www.filestash.app/ldap-browser.html">LDAP</a> • Mysql <br>
       Storj • CardDAV • CalDAV • Backblaze B2 • <a href="https://www.filestash.app/s3-browser.html">Minio</a> <br>
               Dropbox • Google Drive
</p>
<p align="center">
    <a href="http://demo.filestash.app">
      <img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/button_demo.png" alt="demo button" />
    </a>
</p>

# Features
- Manage your files from a browser
- Authentication middleware to connect to various source of user
- Flexible Share mechanism
- Chromecast support for images, music, and videos
- Video player
- Video transcoding (mov, mkv, avi, mpeg, and more)
- Image viewer
- Image transcoding (raw images from Nikon, Canon, and more)
- Photo management
- Audio player
- Shared links are full fledge network drive
- Office documents (docx, xlsx and more)
- Full org mode client ([documentation](https://www.filestash.app/2018/05/31/release-note-v0.1/))
- User friendly
- Mobile friendly
- Customisable
- Plugins
- Super fast
- Upload files and folders
- Download as zip
- Multiple cloud providers and protocols, easily extensible
- Nyan cat loader
- Quick access: frequently access folders are pin to the homepage
- Emacs, VIM or Sublime keybindings `;)`
- Search
- .. and many more

# Documentation
- [Getting started](https://www.filestash.app/docs/)
- [Installation](https://www.filestash.app/docs/install-and-upgrade/)
- [FAQ](https://www.filestash.app/docs/faq/)

# Screenshots
<p align="center">
    <a href="https://demo.filestash.app">
        <img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/navigation.gif" alt="user experience on navigation" />
    </a>
</p>
<p align="center">
    <a href="http://demo.filestash.app">
        <img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/photo_management.gif" alt="user experience on medias" />
    </a>
</p>

# The core idea

Filestash started as an attempt to solve the Dropbox problem by abstracting the storage aspect so you can "bring your own backend" by implementing this interface:
```
type IBackend interface {
	Init(params map[string]string, app *App) (IBackend, error) // constructor
	Ls(path string) ([]os.FileInfo, error)           // list files in a folder
	Cat(path string) (io.ReadCloser, error)          // download a file
	Mkdir(path string) error                         // create a folder
	Rm(path string) error                            // remove something
	Mv(from string, to string) error                 // rename something
	Save(path string, file io.Reader) error          // save a file
	Touch(path string) error                         // create a file
	LoginForm() Form                                 // dynamic form generation for the login
}
```
It has evolved with plugins which are the lego bricks you can assemble together to form a solution that works for you. You can bring your own identity provider, your own authorisation, your own search and more. If there's something you want, plugin will likely make it possible.

Some outside the box example of this "filesystem as a framework" ideas we've done for the sake of science:
- mysql plugin which shows databases as folders, tables as subfolder and rows as individual files. When opening a file (= a row), the user is presented with a form that is dynamically rendered from the DB schema and can be edit and saved back to mysql by people who have no knowledge of SQL.
- ldap backend from which you can browse through a LDAP directory and also view / edit record it contains. eg: [this public ldap](https://demo.filestash.app/login?type=ldap&hostname=ldap%3A%2F%2Fipa.demo1.freeipa.org&bind_dn=uid%3Dadmin%2Ccn%3Dusers%2Ccn%3Daccounts%2Cdc%3Ddemo1%2Cdc%3Dfreeipa%2Cdc%3Dorg&bind_password=Secret123&base_dn=cn%3Daccounts%2Cdc%3Ddemo1%2Cdc%3Dfreeipa%2Cdc%3Dorg)

<!-- if you feel curious, we wrote a more in depth article about the [interesting ideas in Filestash]() -->

# Support
- For companies -> [support contract](https://www.filestash.app/pricing/)
- For individuals -> [#filestash](https://kiwiirc.com/nextclient/#irc://irc.libera.chat/#filestash?nick=guest??) on IRC (libera.chat). To financially contribute to the project:
  - Bitcoin: `3LX5KGmSmHDj5EuXrmUvcg77EJxCxmdsgW`
  - [Open Collective](https://opencollective.com/filestash)

# Credits
- [Contributors](https://github.com/mickael-kerjean/filestash/graphs/contributors) and folks developing [awesome libraries](https://github.com/mickael-kerjean/filestash/blob/master/go.mod)
- Logo derived from the work of [ssnjrthegr8](https://github.com/ssnjrthegr8), Iconography from [flaticon](https://www.flaticon.com/), [fontawesome](https://fontawesome.com) and [material](https://material.io/icons/)
- [libvips](https://github.com/libvips/libvips) and [libraw](https://github.com/LibRaw/LibRaw). Those libraries are statically compiled in Filestash. Instructions to build Filestash is available [here](https://github.com/mickael-kerjean/filestash/blob/master/.drone.yml) and instructions to create your own static library for libvips and libraw is to be found [here](https://github.com/mickael-kerjean/filestash/tree/master/server/plugin/plg_image_light/deps)
