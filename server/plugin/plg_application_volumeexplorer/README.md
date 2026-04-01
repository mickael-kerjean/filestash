# Volume Explorer Filestash Plugin

This plugin is a thin Filestash adapter for the published `@qim3d/volume-explorer` package.

It avoids duplicating the viewer source in Filestash by bundling the packaged `dist/app`
build into the plugin zip and loading it under the Filestash origin. That allows the viewer
to request protected TIFF files through the active Filestash session.

## Build

```sh
cd server/plugin/plg_application_volumeexplorer
make
```

## Install into the Filestash dist tree

```sh
cd server/plugin/plg_application_volumeexplorer
make install
```

The plugin zip will contain:
- `manifest.json`
- the Filestash loader adapter
- the packaged `volume-explorer` web app under `app/`
