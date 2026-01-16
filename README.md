![screenshot](https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/photo.jpg)

# What is this?

<p>
    We started as a Dropbox-like file manager that works with every storage protocol: <a href="https://www.filestash.app/ftp-client.html">FTP</a>, <a href="https://www.filestash.app/ssh-file-transfer.html">SFTP</a>, <a href="https://www.filestash.app/s3-browser.html">S3</a>, <a href="https://www.filestash.app/smb-client.html">SMB</a>, <a href="https://www.filestash.app/webdav-client.html">WebDAV</a>, IPFS, and <a href="https://www.filestash.app/docs/plugin/#storage">about 20 more</a>.
</p>
<p>
    It grew onto a universal data access platform with <a href="https://www.filestash.app/docs/guide/virtual-filesystem.html?origin=github">virtual filesystem capabilities</a>, <a href="https://www.filestash.app/docs/api/?origin=github#api">APIs</a>, and Gateways to expose your data over <a href="https://www.filestash.app/docs/guide/sftp-gateway.html?origin=github">SFTP</a>, S3, and <a href="https://www.filestash.app/docs/guide/mcp-gateway.html?origin=github">MCP</a> to give LLMs a limited view of your data:
</p>

<a href="http://demo.filestash.app">
    <img src="https://www.filestash.app/img/illustration/filestash-integrations.png" alt="storage + auth architecture" />
</a>

# Key Features

<ul>
    <li>A plugin based architecture with a minimal core that can be extended and customized through a rich ecosystem of plugins.</li>
    <li>An awesome web client to access your data, built in vanilla JS, sleek, speedy, snappy, and infinitely customizable through our <a href="https://www.filestash.app/docs/guide/plugin-development.html#patch-plugins-in-depth">dynamic patch plugins</a>.</li>
    <li>A Workflow engine to enable automation and tons of integrations capabilities</li>
    <li>Integrations with almost every storage system and authentication provider, with the explicit goal of supporting 100 percent of storage and auth technologies on the market (including unconventional ones like using <a href="https://github.com/mickael-kerjean/filestash/tree/master/server/plugin/plg_authenticate_wordpress">WordPress as an IdP</a>).</li>
    <li>The frontend can open virtually any file format using xdg-open plugins that add renderers and additional buttons for formats not natively supported by browsers, from <a href="https://demo.filestash.app/assets/plugin/application_photography.zip">astronomy</a> (<a href="https://www.filestash.app/tools/fits-viewer.html">fits</a>, <a href="https://www.filestash.app/tools/xisf-viewer.html">xisf</a>) to <a href="https://demo.filestash.app/assets/plugin/application_embroidery.zip">embroidery</a> (dgt, dst, dsb, dsz, edr, exp, 10o, col, hus, inf, jef, ksm, pcm, pcs, pes, sew, shv, sst, tap, u01, vip, vp3 and xxx) and everything in between like:
    <ul>
        <li><a href="https://demo.filestash.app/assets/plugin/application_science.zip">science</a> (with latex, plantuml & pandoc compilers)</li>
        <li><a href="https://demo.filestash.app/assets/plugin/application_gis.zip">GIS</a> (<a href="https://www.filestash.app/tools/geojson-viewer.html">geojson</a>, <a href="https://www.filestash.app/tools/shp-viewer.html">shp</a>, gpx, wms and <a href="https://www.filestash.app/tools/dbf-viewer.html">dbf</a>), <a href="https://demo.filestash.app/assets/plugin/application_engineering.zip">data engineering</a> (<a href="https://www.filestash.app/tools/parquet-viewer.html">parquet</a>, <a href="https://www.filestash.app/tools/arrow-viewer.html">arrow</a>, <a href="https://www.filestash.app/tools/feather-viewer.html">feather</a>, <a href="https://www.filestash.app/tools/avro-viewer.html">avro</a>, <a href="https://www.filestash.app/tools/orc-viewer.html">orc</a>, <a href="https://www.filestash.app/tools/hdf5-viewer.html">hdf5</a>, <a href="https://www.filestash.app/tools/hdf5-viewer.html">h5</a>, <a href="https://www.filestash.app/tools/netcdf-viewer.html">netcdf</a>, <a href="https://www.filestash.app/tools/netcdf-viewer.html">nc</a>, rds, rda and rdata)</li>
    </ul>
</ul>


- Themes:

xxxxxxx

- Shared Links which you can mount locally as network drives
- Builtin Music, Video, Image viewers with optional transcoding and Chromecast support
- [Themes](https://www.filestash.app/docs/plugin/#theme) replicating the UX of [dropbox](https://www.filestash.app/img/screenshots/theme_dropbox.png), [gdrive](https://www.filestash.app/img/screenshots/theme_gdrive.png), [github](https://www.filestash.app/img/screenshots/theme_github.png), [ibm](https://www.filestash.app/img/screenshots/theme_ibm.png), [onedrive](https://www.filestash.app/img/screenshots/theme_onedrive.png), [and more](https://www.filestash.app/img/screenshots/theme_untitled.png)

- ... and much <sub>much <sub>much</sub></sub> more. From Chromecast support, on demand video transcoding, mouting shared links locally as a network drive, public site, antivirus, quota, .... As a rule of thumb, if your problem can be solve with something involving files, we most likely have a plugin for it


# Getting Started

To install Filestash, head to the [Getting started](https://www.filestash.app/docs/?origin=github) guide.

If you want to leverage plugins, head over to the [inventory](https://www.filestash.app/docs/plugin/?origin=github), or learn about [developing your own plugins](https://www.filestash.app/docs/guide/plugin-development.html?origin=github)


# Vision & Philosophy

Our goal is simple: **to build the best file management platform ever made. Period.** But "best" means different things to different people, and making Filestash modular is the only sane model to accomplish that. Anything that isn't a fundamental truth of the universe and might spark a debate belongs in a plugin. Literally every piece listed in the key features is a plugin you can swap for another implementation or remove entirely.

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

To see what's currently installed in your instance, head over to [/about](https://demo.filestash.app/about). The inventory of plugins is [documented here](https://www.filestash.app/docs/plugin/) and you can learn all there is about those in the developing your own plugin guide


# Support

- Commercial Users → [support contract](https://www.filestash.app/pricing/?origin=github)
- For individuals → [#filestash](https://kiwiirc.com/nextclient/#irc://irc.libera.chat/#filestash?nick=guest??) on IRC (libera.chat).

Want to help us sprinkle some toppings on our noodle cups?
- Bitcoin: `3LX5KGmSmHDj5EuXrmUvcg77EJxCxmdsgW`
- [Open Collective](https://opencollective.com/filestash)


# Credits

Filestash stands on the shoulder of: [contributors](https://github.com/mickael-kerjean/filestash/graphs/contributors), folks developing [awesome libraries](https://github.com/mickael-kerjean/filestash/blob/master/go.mod), a whole bunch of C stuff (the [C standard library](https://imgs.xkcd.com/comics/dependency.png), [libjpeg](https://libjpeg-turbo.org/), [libpng](https://www.libpng.org/pub/png/libpng.html), [libgif](https://giflib.sourceforge.net/), [libraw](https://www.libraw.org/about) and many more), [fontawesome](https://fontawesome.com), [material](https://material.io/icons/), [Browser stack](https://www.browserstack.com/) to let us test on real devices, and the many guys from Nebraska and elsewhere who have been thanklessly maintaining the critical pieces that Filestash sits on top:

<img src="https://imgs.xkcd.com/comics/dependency.png" alt="credit to the nebraska guy on xkcd" />
