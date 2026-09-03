![screenshot](https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/photo.jpg)

# What is this?

<p>
    Filestash started as a storage agnostic Dropbox-like file manager that speaks every storage protocol (<a href="https://www.filestash.app/ftp-client.html">FTP</a>, <a href="https://www.filestash.app/ssh-file-transfer.html">SFTP</a>, <a href="https://www.filestash.app/s3-browser.html">S3</a>, <a href="https://www.filestash.app/smb-client.html">SMB</a>, <a href="https://www.filestash.app/webdav-client.html">WebDAV</a>, IPFS, and <a href="https://www.filestash.app/docs/plugin/#storage">about 20 more</a>). It grew into what we want to be the world's best file management platform, centered around <strong>3 pillars</strong>:
</p>

<ol>
    <li><strong>Web client</strong> <i>(the file manager available from your browser)</i>: <a href="https://www.filestash.app/docs/install-and-upgrade/#configuration">documentation</a> / <a href="https://www.filestash.app/img/screenshots/feature1.png">screenshot</a> </li>
    <li><strong>Native client</strong> <i>(to sync your data on your device)</i>: <a href="https://github.com/mickael-kerjean/fdrive">repo</a> / screenshots for <a href="https://downloads.filestash.app/img/app-filestash-www-img-screenshots-fdrive-mac.png">mac</a>, <a href="https://downloads.filestash.app/img/app-filestash-www-img-screenshots-fdrive-windows.png">windows</a>, <a href="https://downloads.filestash.app/img/app-filestash-www-img-screenshots-fdrive-linux.png">linux</a>, <a href="https://downloads.filestash.app/img/app-filestash-www-img-screenshots-fdrive-android.png">android</a> & <a href="https://downloads.filestash.app/img/app-filestash-www-img-screenshots-fdrive-iphone.png">iphone</a></li>
    <li><strong>Gateways</strong> <i>(to expose your storages over any protocol)</i>: <a href="https://www.filestash.app/docs/guide/sftp-gateway.html#working-example">showcase</a> </li>
</ol>

<p>
    The philosophy that guides this project is: "anything that's not a fundamental truth of the universe lives in a plugin". That keeps the core lean and fast, and the opinions replaceable, so when your requirements get deep or weird, the answer is a plugin, not a fork.
</p>

<p>
    <a href="http://demo.filestash.app"><img src="https://www.filestash.app/img/illustration/filestash-integrations.png" alt="storage + auth architecture" /></a>
</p>

# Key Features

<ul>
    <li><a href="#plugins">Plugin Driven Architecture</a>: everything that matters is a plugin, browse the <a href="https://www.filestash.app/docs/plugin/">ecosystem</a> or <a href="https://www.filestash.app/docs/guide/plugin-development.html?origin=github">build your own</a>. With this approach, you get exactly what you need without overhead and bloat.</li>
    <li>Universal Access: the web client is just one way to access your data (albeit an awesome one, handcrafted in vanilla JS). <a href="https://www.filestash.app/docs/api/#api">APIs</a> and <a href="https://www.filestash.app/docs/guide/storage-gateway.html?origin=github">Gateways</a> let you also expose your data over protocols like <a href="https://www.filestash.app/docs/guide/sftp-gateway.html?origin=github">SFTP</a>, S3, FTP, WebDAV, <a href="https://www.filestash.app/docs/guide/mcp-gateway.html?origin=github">MCP</a>, and AS2.</li>
    <li><a href="https://www.filestash.app/docs/plugin/#storage">Integrations</a>: our explicit goal is to support 100% of storage and authentication technologies on the market. Beyond your usual options, you can go much further, like a <a href="https://www.filestash.app/docs/guide/virtual-filesystem.html?origin=github">virtual filesystem</a> delegating authentication to your <a href="https://github.com/mickael-kerjean/filestash/tree/master/server/plugin/plg_authenticate_wordpress">WordPress site</a> and using its roles to drive <a href="https://www.filestash.app/docs/guide/authorization.html#option-2-rbac">RBAC authorization</a>.</li>
    <li><a href="https://www.filestash.app/docs/guide/workflow-engine.html">Workflow Engine</a>: automate anything that happens to your files by chaining actions on events, from simple notifications via Slack or email to full on MFT pipelines and everything in between.</li>
    <li>File Apps: use any of the existing apps or <a href="https://www.filestash.app/docs/guide/plugin-development.html#xdg-open-plugins-in-depth">build your own</a>, from astronomy to embroidery and everything in between like:
        <ul>
            <li><a href="https://demo.filestash.app/assets/plugin/application_photography.zip">photography</a>: heif, nef, raf, <a href="https://www.filestash.app/tools/tiff-viewer.html">tiff</a>, raw, arw, sr2, srf, nrw, cr2, crw, x3f, pef, rw2, orf, mrw, mdc, mef, mos, dcr, kdc, 3fr, erf and srw</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_photography.zip">astronomy</a>: <a href="https://www.filestash.app/tools/fits-viewer.html">fits</a>, <a href="https://www.filestash.app/tools/xisf-viewer.html">xisf</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_science.zip">science</a>: with latex, plantuml & pandoc compilers</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_musician.zip">music</a>: mid, midi, gp4 and gp5</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_gis.zip">GIS</a>: <a href="https://www.filestash.app/tools/geojson-viewer.html">geojson</a>, <a href="https://www.filestash.app/tools/shp-viewer.html">shp</a>, gpx, wms and <a href="https://www.filestash.app/tools/dbf-viewer.html">dbf</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_engineering.zip">data engineering</a>: <a href="https://www.filestash.app/tools/parquet-viewer.html">parquet</a>, <a href="https://www.filestash.app/tools/arrow-viewer.html">arrow</a>, <a href="https://www.filestash.app/tools/feather-viewer.html">feather</a>, <a href="https://www.filestash.app/tools/avro-viewer.html">avro</a>, <a href="https://www.filestash.app/tools/orc-viewer.html">orc</a>, <a href="https://www.filestash.app/tools/hdf5-viewer.html">hdf5</a>, <a href="https://www.filestash.app/tools/hdf5-viewer.html">h5</a>, <a href="https://www.filestash.app/tools/netcdf-viewer.html">netcdf</a>, <a href="https://www.filestash.app/tools/netcdf-viewer.html">nc</a>, rds, rda and rdata</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_dev.zip">dev</a>: a, so, o, dylib, dll, tar, tgz, zip, har, cap, pcap, pcapng and <a href="https://www.filestash.app/tools/sqlite-viewer.html">sqlite</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_creative.zip">creative work</a>: svg, <a href="https://www.filestash.app/tools/psd-viewer.html">psd</a>, ai, <a href="https://www.filestash.app/tools/sketch-viewer.html">sketch</a>, <a href="https://www.filestash.app/tools/cdr-viewer.html">cdr</a>, woff, woff2, ttf, otf, eot, exr, tga, pgm, ppm, dds, ktx, dpx, pcx, xpm, pnm, xbm, aai, xwd, cin, pbm, pcd, sgi, wbmp and rgb</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_biomed.zip">biomedical</a>: dicom, sam, bam, cif, pdb, xyz, sdf, mol, mol2 and mmtf</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_autodesk.zip">autodesk</a>: <a href="https://www.filestash.app/tools/dwg-viewer.html">dwg</a> and <a href="https://www.filestash.app/tools/dxf-viewer.html">dxf</a></li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_adobe.zip">adobe</a>: <a href="https://www.filestash.app/tools/psd-viewer.html">psd</a>, ai, <a href="https://www.filestash.app/tools/xd-viewer.html">xd</a>, <a href="https://www.filestash.app/tools/dng-viewer.html">dng</a>, <a href="https://www.filestash.app/tools/eps-viewer.html">postscript</a>, aco, ase, swf</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_3d.zip">3d</a>: fbx, gltf, obj, stl, step, mesh, ifc, dae</li>
            <li><a href="https://demo.filestash.app/assets/plugin/application_embroidery.zip">embroidery</a>: dgt, dst, dsb, dsz, edr, exp, 10o, col, hus, inf, jef, ksm, pcm, pcs, pes, sew, shv, sst, tap, u01, vip, vp3 and xxx</li>
            <li><a href="https://github.com/mickael-kerjean/filestash/tree/master/server/plugin/plg_widget_pgp">e2e</a>: pgp, gpg</li>
        </ul>
    </li>
    <li>Themes: <br>
        <img src="https://www.filestash.app/img/screenshots/theme_github.png" height="150" />
        <img src="https://www.filestash.app/img/screenshots/theme_apple.png" height="150" />
        <img src="https://www.filestash.app/img/screenshots/theme_dropbox.png" height="150" />
        <img src="https://www.filestash.app/img/screenshots/theme_ibm.png" height="150" />
    </li>
    <li>AI features for <a href="https://www.filestash.app/docs/guide/search.html">search</a>, <a href="https://www.filestash.app/features/smart-folder.html">smart folders</a> and OCRs.</li>
    <li>... and much <sub>much <sub>more (versioning, audit, public site, antivirus, quota, chat, chromecast support, on demand video transcoding, mounting shared links as network drive, ...)</sub></sub><br> As a rule of thumb, if your problem involves files, we either already <a href="https://www.filestash.app/docs/plugin/">have a plugin</a> for it or can make a plugin for it</li>
</ul>

# Plugins

**Malleability** isn't an afterthought, it's the whole architecture:

> anything that's not a fundamental truth of the universe lives in a plugin

Taken literally, the "truths of the universe" are a set of [core interfaces](https://github.com/mickael-kerjean/filestash/tree/master/server/pkg/core), one for every key component of Filestash, and they're yours to implement (storage, authentication, authorisation, search, thumbnailing, apps, middleware, frontend changes, ...)

The oldest one is the storage interface, the one at work whenever you connect to a storage:

```go
type IBackend interface {
	Ls(path string) ([]os.FileInfo, error)
	Stat(path string) (os.FileInfo, error)
	Cat(path string) (io.ReadCloser, error)
	Mkdir(path string) error
	Rm(path string) error
	Mv(from string, to string) error
	Save(path string, file io.Reader) error
	Touch(path string) error
}
```

Historically, plugins were made in Go and [compiled in](https://www.filestash.app/docs/guide/plugin-development.html#compiled-plugin). Today there's a second path: [runtime plugins](https://www.filestash.app/docs/guide/plugin-development.html#runtime-plugins), a zip you drop in the plugins folder. The zip can reshape the frontend and it can carry wasm implementing the very same core interfaces. That wasm runs in a VM with tight control on permissions: no declared network host, no way to phone home. Installing a plugin doesn't mean trusting it with everything.

For example:
```rust
use filestash::*;

#[derive(Default)]
pub struct Plugin;

impl Authorisation for Plugin {
    fn ls(&self, _ctx: &Context, path: &str) -> Decision {
        self.check(path)
    }
    fn cat(&self, _ctx: &Context, path: &str) -> Decision { ... }
    fn stat(&self, _ctx: &Context, path: &str) -> Decision { ... }
}

impl Plugin {
    fn check(&self, path: &str) -> Decision {
        if path.split("/").any(|segment| segment == "top_secret") {
            log::warn!("[TOPSECRET] access denied !!");
            return Decision::Deny;
        }
        Decision::Allow
    }
}

register!(Plugin: Authorisation);
```
These few lines give you a readonly view of your data where every folder named "top_secret" is off limits. For more examples, browse the [plugin folder](https://github.com/mickael-kerjean/filestash/tree/master/server/plugin), [the runtime plugin cookbook](https://github.com/mickael-kerjean/filestash/tree/master/server/plugin/plg_runtime_cookbook), and [the plugin marketplace](https://www.filestash.app/docs/plugin).

And to be clear, code is the power-user path, there are [no code options](https://www.filestash.app/docs/guide/authorization.html)

# Getting Started

To install Filestash, head to the [Getting started](https://www.filestash.app/docs/?origin=github) guide. If you want to leverage plugins, head over to the [inventory](https://www.filestash.app/docs/plugin/?origin=github), or learn about [developing your own plugins](https://www.filestash.app/docs/guide/plugin-development.html?origin=github).

# Support

- Commercial Users → [support contract](https://www.filestash.app/pricing/?origin=github)
- For individuals:
  - [#filestash](https://kiwiirc.com/nextclient/#irc://irc.libera.chat/#filestash?nick=guest??) on IRC (libera.chat)
  - Bitcoin: `3LX5KGmSmHDj5EuXrmUvcg77EJxCxmdsgW`
  - [Open Collective](https://opencollective.com/filestash)


# Origin Story

Familiar with the infamous comment from Dropbox's launch on HN? In my memory it goes like this:

<img src="https://raw.githubusercontent.com/mickael-kerjean/filestash_images/master/.assets/hn.png" />

Is this the story of a random guy that spent 10 years and thousands of hours proving BrandonM right? And possibly the longest standing troll on HN ? You be the judge. But first, let's rewind the tape all the way back.

We're some day, some time, somewhere around 2010, or maybe 2011 ... actually I don't remember, it might have been 2012. What I remember though is I was on the way back from uni, carrying one of those super tiny notebook in my backpack:

<img src="https://upload.wikimedia.org/wikipedia/commons/4/40/HP_Mini-Note_2133%2C_Asus_Eee_PC_701_and_Everex_Cloudbook.jpg?utm_source=en.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled" />

I loved that flimsy little machine, it ran windows atrociously but felt as fast as a racecar if you were a linux user. On that very average day, I opened up that little race machine on my desk and ..... nothing, the screen would not turn on, no fan noise, nothing. I was told:

> The motherboard died

I was doubled lucky, first my data was kept in sync with what was back then (and still is today) the most popular Dropbox alternative running from an old machine pretending to be a server in my parent leaving room 1000 km away. Second,



Luckily a friend gave me his old laptop, so I and that's when I tried to sync my data that was on the most popular Dropbox alternative at the time and still is today, installed the sync client, press synchronise and figure it might take some time so went to bed while the sync was hapening.

The next morning as I wake up, the sync client was still busy doing god know what, fine it ran the whole day, the whole night and the next morning it was still stuck. Every day, the progress bar which had this indication for how long something would take, would go larger and larger instead of going down. A week later I figured:

> alright then it looks like a pretty serious bug! Let's fix it!

Super enthusiastic about the idea to contribute to open source, I started to poke around to understand what was going on. There was no LLM to assist in debugging so it was a fairly painfull process. Nothing interesting in the application logs, no errors that I could see. At some point I started to look at the queries hapening on mysql and it became immeditatly clear, the sync client was quite literally ddosing the database the hardest it could in a loop and the mysql was to its knees begging for a break after more than a week of constant hamering. Weird so as a despaired attempt, I downloaded another sync client called syncthing and tried to sync on the new machine, it tooks under 2 hours when the other sync client did not get it done in over a week. A few seconds after syncthing did the job, the other sync did not liked that I used another tool to synchronise data and it started deleting things, nooooooooooooo! one, two, three I killed the old sync client and that's why we won't know how many 100x faster syncthing was since the original sync got killed. That's how I learned about weird commands like `occ files:scan` to force synchronisation between what the filesystem has and what this alternative thought it had. Yes it turned out that the database is used to store a copy of the actual filesystem that must stay in sync because .... euh ....






I was a happy user of this Dropbox alternative until this incident, the idea to go back to something that has such an architectural defect that it makes more sql query than plain Wordpress to show me a list of files and folder in the root directory made that option unthinkable. Fun fact, 15 years later, that problem only got worse, [same software produce even more sql queries](https://gist.github.com/mickael-kerjean/6e10ad14e66f238548d3464b52086fb4) than it did back then, while it was ~20 to do a simple operation like listing the files in a folder, it's now over 200! I literally tried everything but they all had the same problem which boils down to an architectural choice you have to make early on: Do you want to bet for or against the unix philosophy? Everyone else is betting against, we surely need a solution that embrace the unix philosophy.

Can't we make a nice Dropbox alternative that is a nice integration of 3 core components interacting with each other: storage, web client and sync client. There was literally hundreds of options when it comes to finding a solution for storage that could speak various standard protocols, there was a few other sync clients that all worked better like Unison and syncthing, we just needed some kind of glue to integrate everything togetther so here went my week ends and thousands of hours later.

That day, I learned one lesson, no it was not about backup but the sheer superiority of the unix philosophy, one tool that does it well that integrate with an ecosystem. Even today, all the Dropbox alternative make it impossible to integrate with the ecosystem, wouldn't it be cool to use syncthing as my sync client, tight to the openssh SFTP server,


# Credits

Filestash stands on the shoulder of: [contributors](https://github.com/mickael-kerjean/filestash/graphs/contributors), folks developing [awesome libraries](https://github.com/mickael-kerjean/filestash/blob/master/go.mod), [BrandonM](https://news.ycombinator.com/user?id=BrandonM), a whole bunch of C stuff (the [C standard library](https://imgs.xkcd.com/comics/dependency.png), [libjpeg](https://libjpeg-turbo.org/), [libpng](https://www.libpng.org/pub/png/libpng.html), [libgif](https://giflib.sourceforge.net/), [libraw](https://www.libraw.org/about) and many more), [fontawesome](https://fontawesome.com), [material](https://material.io/icons/), [Browser stack](https://www.browserstack.com/) to let us test on real devices, and the many guys from Nebraska and elsewhere who have been thanklessly maintaining the critical pieces that Filestash sits on top:

<img src="https://imgs.xkcd.com/comics/dependency.png" alt="credit to the nebraska guy on xkcd" />
