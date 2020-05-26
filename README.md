![screenshot](https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/photo.jpg)

<p align="center">
    <a href="https://github.com/mickael-kerjean/contributors" alt="Contributors">
        <img src="https://img.shields.io/github/contributors/mickael-kerjean/filestash" style="max-width:100%;">
    </a>
    <a href="https://opencollective.com/filestash" alt="Backers on Open Collective">
        <img src="https://img.shields.io/opencollective/backers/filestash" style="max-width:100%;">
    </a>
<a href="https://app.fossa.com/projects/git%2Bgithub.com%2Fmickael-kerjean%2Ffilestash?ref=badge_shield" alt="FOSSA Status"><img src="https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmickael-kerjean%2Ffilestash.svg?type=shield"/></a>
    <a href="https://opencollective.com/filestash" alt="Sponsors on Open Collective">
        <img src="https://img.shields.io/opencollective/sponsors/filestash" style="max-width:100%;">
    </a>
    <a href="https://hub.docker.com/r/machines/filestash" alt="Docker Hub">
        <img src="https://img.shields.io/docker/pulls/machines/filestash" style="max-width:100%;">
    </a>
    <br>
    <a href="#" alt="Build">
        <img src="https://ci.kerjean.me/api/badges/nuage/nuage/status.svg" style="max-width:100%;">
    </a>
    <a href="https://kiwiirc.com/nextclient/#irc://irc.freenode.net/#filestash?nick=guest??" alt="Chat on IRC">
        <img src="https://img.shields.io/badge/IRC-%23filestash-brightgreen.svg" style="max-width:100%;">
    </a>
</p>

<p align="center">
    A Dropbox-like file manager that let you manage your data anywhere it is located:<br>
    <a href="https://www.filestash.app/ftp-client.html">FTP</a> • FTPS • <a href="https://www.filestash.app/ssh-file-transfer.html">SFTP</a> • WebDAV • Git • <a href="https://www.filestash.app/s3-browser.html">S3</a> • <a href="https://www.filestash.app/ldap-browser.html">LDAP</a> • Mysql <br>
       CardDAV • CalDAV • Backblaze B2 • <a href="https://www.filestash.app/s3-browser.html">Minio</a> <br>
               Dropbox • Google Drive
</p>
<p align="center">
    <a href="http://demo.filestash.app">
      <img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/button_demo.png" alt="demo button" />
    </a>
</p>

# Features
- Manage your files from a browser
- Full org mode client ([documentation](https://www.filestash.app/2018/05/31/release-note-v0.1/))
- Flexible Share mechanism
- Video player
- Video transcoding (mov, mkv, avi, mpeg, and more)
- Image viewer
- Image transcoding (raw images from Nikon, Canon, and more)
- Photo management
- Audio player
- Full Text Search
- Shared links are full fledge network drive
- Office documents (docx, xlsx and more)
- User friendly
- Mobile friendly
- Customisable
- Super fast
- Upload files and folders
- Multiple cloud providers and protocols, easily extensible
- Nyan cat loader
- Quick access: frequently access folders are pin to the homepage
- Emacs, VIM or Sublime keybindings `;)`

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

# Documentation
- [Getting started](https://www.filestash.app/docs)
- [Installation](https://www.filestash.app/docs/install-and-upgrade/)
- [FAQ](https://www.filestash.app/docs/faq/)

# The core idea

Filestash aims to solve the Dropbox problem by abstracting the storage aspect. This makes it possible to bring your own backend or create your own by implementing a simple interface. The power of that model makes it possible for non nerds to easily interact with complex systems without prior training (assuming they are familiar with Dropbox). As an example of that superpower, see our [LDAP backend](https://www.filestash.app/ldap-browser.html) and the Mysql one that emulate a file system where first level folder are the databases, tables are represented as subfolders and each row is represented as a file:

![infographic](https://www.filestash.app/img/illustration/filestash-framework.png)

# Support the project

If you use Filestash, contributing to my coffee bill would go a long way as I have spent countless hours in the last 3 years working on this project from my local coffee shop.

- Bitcoin: `3LX5KGmSmHDj5EuXrmUvcg77EJxCxmdsgW`
- [Open Collective](https://opencollective.com/filestash)

# Credits
- [Contributors](https://github.com/mickael-kerjean/filestash/graphs/contributors) and folks developing [awesome libraries](https://github.com/mickael-kerjean/filestash/blob/master/go.mod)
- Logo derived from the work of [ssnjrthegr8](https://github.com/ssnjrthegr8), Iconography from [flaticon](https://www.flaticon.com/), [fontawesome](https://fontawesome.com) and [material](https://material.io/icons/)
- [libvips](https://github.com/libvips/libvips) and [libraw](https://github.com/LibRaw/LibRaw). Those libraries are statically compiled in Filestash. Instructions to build Filestash is available [here](https://github.com/mickael-kerjean/filestash/blob/master/.drone.yml) and instructions to create your own static library for libvips and libraw is to be found [here](https://github.com/mickael-kerjean/filestash/tree/master/server/plugin/plg_image_light/deps)


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmickael-kerjean%2Ffilestash.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmickael-kerjean%2Ffilestash?ref=badge_large)