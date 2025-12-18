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
    A Dropbox-like file manager that works with every storage protocol:<br>
    <a href="https://www.filestash.app/ftp-client.html">FTP</a> • <a href="https://www.filestash.app/ftp-client.html">FTPS</a> • <a href="https://www.filestash.app/ssh-file-transfer.html">SFTP</a> • <a href="https://www.filestash.app/webdav-client.html">WebDAV</a> • Git • <a href="https://www.filestash.app/s3-browser.html">S3</a> • NFS • <a href="https://www.filestash.app/smb-client.html">SMB</a> • Artifactory • <a href="https://www.filestash.app/ldap-browser.html">LDAP</a> • Mysql <br>
       Sharepoint • Azure • CalDAV • Backblaze B2 • <a href="https://www.filestash.app/s3-browser.html">Minio</a> • Storj <br>IPFS • Dropbox • Google Drive • ...
</p>
<p align="center">
    <a href="http://demo.filestash.app">
      <img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/button_demo.png" alt="demo button" />
    </a>
</p>

# What / Why ?

Familiar with the infamous comment from Dropbox's launch on HN? It went like this:

<img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/hn.png" alt="demo button" />

Once we had a great user interface for FTP, we extended the idea to virtually every storage protocol and added gateways to expose Dropbox itself as an SFTP server, closing the infamous loop, while also adding all the features we always wished Dropbox had.

# Key Features

- Sleek, Speedy, Snappy, works great on Desktop and Mobile
- Extensible / Customisable / Hackable via a rich ecosystem of plugins and a Workflow engine to enable automation
- Shared Links which you can mount locally as network drives
- Builtin Music, Video, Image viewers with optional transcoding and Chromecast support
- [API](https://www.filestash.app/docs/api/?origin=github#api) and LLM integration via [MCP](https://www.filestash.app/docs/guide/mcp-gateway.html) with support for other S3 and [SFTP Gateways](https://www.filestash.app/docs/guide/sftp-gateway.html).
- [Themes](https://www.filestash.app/docs/plugin/#theme) replicating the UX of [dropbox](https://www.filestash.app/img/screenshots/theme_dropbox.png), [gdrive](https://www.filestash.app/img/screenshots/theme_gdrive.png), [github](https://www.filestash.app/img/screenshots/theme_github.png), [ibm](https://www.filestash.app/img/screenshots/theme_ibm.png), [onedrive](https://www.filestash.app/img/screenshots/theme_onedrive.png), [and more](https://www.filestash.app/img/screenshots/theme_untitled.png)
- ... and much <sub>much <sub>much</sub></sub> more


# Documentation

- [Getting started](https://www.filestash.app/docs/?origin=github)
- [Installation](https://www.filestash.app/docs/install-and-upgrade/?origin=github)
- [API](https://www.filestash.app/docs/api/?origin=github#api) and [MCP](https://www.filestash.app/docs/guide/mcp-gateway.html)
- [Plugins Inventory](https://www.filestash.app/docs/plugin/?origin=github)
- [Hardening Guide](https://downloads.filestash.app/upload/hardening-guide.pdf?origin=github)


# Vision & Philosophy

Our goal is simple: **to build the best file management platform ever made. Period.** But "best" means different things to different people, and making Filestash modular is the only sane model to accomplish that. Anything that isn't a fundamental truth of the universe and might spark a debate belongs in a plugin.

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
            <li><a href="https://demo.filestash.app/assets/plugin/application_photography.zip">photography</a>: heif, nef, raf, <a href="https://www.filestash.app/tools/tiff-viewer.html">tiff</a>, raw, arw, sr2, srf, nrw, cr2, crw, x3f, pef, rw2, orf, mrw, mdc, mef, mos, dcr, kdc, 3fr, erf and srw</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_photography.zip">astronomy</a>: <a href="https://www.filestash.app/tools/fits-viewer.html">fits</a>, <a href="https://www.filestash.app/tools/xisf-viewer.html">xisf</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_science.zip">science</a>: with latex, plantuml & pandoc compilers</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_musician.zip">music</a>: mid, midi, gp4 and gp5</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_gis.zip">GIS</a>: <a href="https://www.filestash.app/tools/geojson-viewer.html">geojson</a>, <a href="https://www.filestash.app/tools/shp-viewer.html">shp</a>, gpx, wms and <a href="https://www.filestash.app/tools/dbf-viewer.html">dbf</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_engineering.zip">data engineering</a>: <a href="https://www.filestash.app/tools/parquet-viewer.html">parquet</a>, <a href="https://www.filestash.app/tools/arrow-viewer.html">arrow</a>, <a href="https://www.filestash.app/tools/feather-viewer.html">feather</a>, <a href="https://www.filestash.app/tools/avro-viewer.html">avro</a>, <a href="https://www.filestash.app/tools/orc-viewer.html">orc</a>, <a href="https://www.filestash.app/tools/hdf5-viewer.html">hdf5</a>, <a href="https://www.filestash.app/tools/hdf5-viewer.html">h5</a>, <a href="https://www.filestash.app/tools/netcdf-viewer.html">netcdf</a>, <a href="https://www.filestash.app/tools/netcdf-viewer.html">nc</a>, rds, rda and rdata</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_dev.zip">dev</a>: a, so, o, dylib, dll, har, cap, pcap, pcapng and <a href="https://www.filestash.app/tools/sqlite-viewer.html">sqlite</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_creative.zip">creative work</a>: svg, <a href="https://www.filestash.app/tools/psd-viewer.html">psd</a>, ai, <a href="https://www.filestash.app/tools/sketch-viewer.html">sketch</a>, <a href="https://www.filestash.app/tools/cdr-viewer.html">cdr</a>, woff, woff2, ttf, otf, eot, exr, tga, pgm, ppm, dds, ktx, dpx, pcx, xpm, pnm, xbm, aai, xwd, cin, pbm, pcd, sgi, wbmp and rgb</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_biomed.zip">biomedical</a>: dicom, sam, bam, cif, pdb, xyz, sdf, mol, mol2 and mmtf</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_autodesk.zip">autodesk</a>: <a href="https://www.filestash.app/tools/dwg-viewer.html">dwg</a> and <a href="https://www.filestash.app/tools/dxf-viewer.html">dxf</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_adobe.zip">adobe</a>: <a href="https://www.filestash.app/tools/psd-viewer.html">psd</a>, ai, <a href="https://www.filestash.app/tools/xd-viewer.html">xd</a>, <a href="https://www.filestash.app/tools/dng-viewer.html">dng</a>, <a href="https://www.filestash.app/tools/eps-viewer.html">postscript</a>, aco, ase, swf</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_3d.zip">3d</a>: fbx, gltf, obj, stl, step, mesh, ifc, dae</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_embroidery.zip">embroidery</a>: dgt, dst, dsb, dsz, edr, exp, 10o, col, hus, inf, jef, ksm, pcm, pcs, pes, sew, shv, sst, tap, u01, vip, vp3 and xxx</li>
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
