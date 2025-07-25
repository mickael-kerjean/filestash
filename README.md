![screenshot](https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/photo.jpg)

<p align="center">
    <a href="https://github.com/mickael-kerjean/contributors" alt="Contributors">
        <img src="https://img.shields.io/github/contributors/mickael-kerjean/filestash" style="max-width:100%;">
    </a>
    <a href="https://hub.docker.com/r/machines/filestash" alt="Docker Hub">
        <img src="https://img.shields.io/docker/pulls/machines/filestash" style="max-width:100%;">
    </a>
    <a href="https://kiwiirc.com/nextclient/#irc://irc.libera.chat/#filestash?nick=guest??" alt="Chat on IRC">
        <img src="https://img.shields.io/badge/IRC-%23filestash-brightgreen.svg" style="max-width:100%;">
    </a>
</p>

<p align="center">
    A Dropbox-like file manager that let you manage your data anywhere it is located:<br>
    <a href="https://www.filestash.app/ftp-client.html">FTP</a> • <a href="https://www.filestash.app/ftp-client.html">FTPS</a> • <a href="https://www.filestash.app/ssh-file-transfer.html">SFTP</a> • <a href="https://www.filestash.app/webdav-client.html">WebDAV</a> • Git • <a href="https://www.filestash.app/s3-browser.html">S3</a> • NFS • <a href="https://www.filestash.app/smb-client.html">SMB</a> • Artifactory • <a href="https://www.filestash.app/ldap-browser.html">LDAP</a> • Mysql <br>
       Storj • CardDAV • CalDAV • Backblaze B2 • <a href="https://www.filestash.app/s3-browser.html">Minio</a> <br>Dropbox • Google Drive
</p>
<p align="center">
    <a href="http://demo.filestash.app">
      <img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/button_demo.png" alt="demo button" />
    </a>
</p>


# Key Features

- Manage files from your browser
- Sleek, Speedy, Snappy, works great on Desktop and Mobile
- Extensible / Customisable / Hackable via a rich ecosystem of plugins
- Shared Links which you can mount locally as network drives
- Builtin Music, Video, Image viewers with optional transcoding and Chromecast support
- API and LLM integration via [MCP](https://www.filestash.app/docs/api/#mcp)
- ... and much more


# Documentation

- [Getting started](https://www.filestash.app/docs/)
- [Installation](https://www.filestash.app/docs/install-and-upgrade/)
- [API](https://www.filestash.app/docs/api/#api) and [MCP](https://www.filestash.app/docs/api/#mcp)
- [Plugins Inventory](https://www.filestash.app/docs/plugin/)
- [Hardening Guide](https://downloads.filestash.app/upload/hardening-guide.pdf)


# Vision & Philosophy

Our goal is simple: **to build the best web based file manager ever made. Period.** But "best" means different things to different people, and making Filestash modular is the only sane model to accomplish that. Anything that isn't a fundamental truth of the universe and might spark a debate belongs in a plugin.

This modularity is made possible by the magic of programming interfaces. For example, if you want a [Dropbox-like frontend for FTP](https://news.ycombinator.com/item?id=9224), you will find out the [FTP plugin](https://github.com/mickael-kerjean/filestash/tree/master/server/plugin/plg_backend_ftp) simply implements this interface:
```go
type IBackend interface {
	Ls(path string) ([]os.FileInfo, error)           // list files in a folder
	Cat(path string) (io.ReadCloser, error)          // download a file
	Mkdir(path string) error                         // create a folder
	Rm(path string) error                            // remove something
	Mv(from string, to string) error                 // rename something
	Save(path string, file io.Reader) error          // save a file
	Touch(path string) error                         // create a file

	// I have omitted 2 other methods, a first one to enable connections reuse and
	// another one to declare what should the login form be like.
}
```

There are interfaces you can implement for every key component of Filestash: from storage, to authentication, authorisation, custom apps, search, thumbnailing, frontend patches, middleware, endpoint creation and a [few others](https://github.com/mickael-kerjean/filestash/blob/master/server/common/plugin.go).

To see what's currently installed in your instance, head over to [/about](https://demo.filestash.app/about). The inventory of plugins is [documented here](https://www.filestash.app/docs/plugin/).

# Roadmap

There are 2 major pieces of work currently underway:

<ol>
    <li>Making Filestash able to open virtually anything. Thanks to plugin, we're adding support for files your browser has never heard of, from astrophysics to embroidery patterns. Concretly we have added support for:
        <ul>
            <li>photography: .heif, .nef, .raf, .tiff, .raw, .arw, .sr2, .srf, .nrw, .cr2, .crw, .x3f, .pef, .rw2, .orf, .mrw, .mdc, .mef, .mos, .dcr, .kdc, .3fr, .erf and .srw</li>
            <li>astronomy: fits, xisf</li>
            <li>science stuff with compilers for latex, plantuml & pandoc</li>
            <li>music: mid, .midi, .gp4 and .gp5</li>
            <li>GIS: .geojson, .shp, .gpx, .wms and .dbf</li>
            <li>data engineering: .parquet, .arrow, .feather, .avro, .orc, .hdf5, .h5, .netcdf, .nc, .rds, .rda and .rdata</li>
            <li>dev: .a, .so, .o, .dylib, .dll, .har, .cap, .pcap, .pcapng and sqlite</li>
            <li>creative work: svg, psd, ai, sketch, cdr, woff, woff2, ttf, otf, eot, exr, tga, pgm, ppm, dds, ktx, dpx, pcx, xpm, pnm, xbm, aai, xwd, cin, pbm, pcd, sgi, wbmp and rgb</li>
            <li>biomedical: dicom, sam, bam, cif, pdb, xyz, sdf, mol, mol2 and mmtf</li>
            <li>autodesk: dwg and dxf</li>
            <li>adobe: psd, ai, xd, dng, postscript, aco, ase, swf</li>
            <li>3d: fbx, gltf, obj, stl, step, mesh, ifc, dae</li>
            <li>embroidery: .dgt, .dst, .dsb, .dsz, .edr, .exp, .10o, .col, .hus, .inf, .jef, .ksm, .pcm, .pcs, .pes, .sew, .shv, .sst, .tap, .u01, .vip, .vp3. and .xxx</li>
            <li>there is more to come as we stumbled upon new niches and spend time talking to real people.</li>
        </ul>
    </li>
    <li>Getting to v1.0. Filestash is already rock solid, it has been in active development for over 8 years. But the bar for v1.0 will be reached when Filestash is objectively better than Dropbox, Google Drive, and Box by every single measurable metric we care about. That's the mission.</li>
</ol>

# Support

- Commercial Users → [support contract](https://www.filestash.app/pricing/?origin=github)
- For individuals → [#filestash](https://kiwiirc.com/nextclient/#irc://irc.libera.chat/#filestash?nick=guest??) on IRC (libera.chat).

Want to help us sprinkle some toppings on our noodle cups?
- Bitcoin: `3LX5KGmSmHDj5EuXrmUvcg77EJxCxmdsgW`
- [Open Collective](https://opencollective.com/filestash)


# Credits

Filestash stands on the shoulder of: [contributors](https://github.com/mickael-kerjean/filestash/graphs/contributors), folks developing [awesome libraries](https://github.com/mickael-kerjean/filestash/blob/master/go.mod), a whole bunch of C stuff (the [C standard library](https://imgs.xkcd.com/comics/dependency.png), [libjpeg](https://libjpeg-turbo.org/), [libpng](https://www.libpng.org/pub/png/libpng.html), [libgif](https://giflib.sourceforge.net/), [libraw](https://www.libraw.org/about) and many more), [fontawesome](https://fontawesome.com), [material](https://material.io/icons/), [Browser stack](https://www.browserstack.com/) to let us test on real devices, and the many guys from Nebraska and elsewhere who have been thanklessly maintaining the critical pieces that Filestash sits on top:

<img src="https://imgs.xkcd.com/comics/dependency.png" alt="credit to the nebraska guy on xkcd" />
