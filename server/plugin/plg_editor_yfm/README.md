# YFM preview for Filestash

Open a `.md` file and select **YFM preview** in the editor toolbar. The preview updates as you type and follows the Filestash theme. Drag the divider or focus it and use the arrow keys to resize the panes. Scrolling in either pane follows document blocks in the other. Use the Filestash save button to write the Markdown source.

The preview uses Diplodoc Transform and its browser runtime for YFM tabs, cuts, notes, tables, and other document markup. Includes and local images are read through Filestash using the current session or share. Relative paths inside an included file are resolved from that file's directory. External hyperlinks open on click. The preview blocks automatic requests for remote images.

The plugin renders individual documents and their Markdown includes. Diplodoc project settings such as `.yfm`, `toc.yaml`, and `presets.yaml` are part of the site build. Raw HTML is escaped and embedded frames are omitted. The preview bounds file sizes, the number of images and includes, and include expansion.

## Build and install

With Node.js 22+, npm, and zip installed, run the following in this directory.

```sh
npm ci
npm run build
```

Copy `dist/editor_yfm.zip` to `state/plugins/` under the Filestash data directory (`FILESTASH_PATH`), then restart Filestash. This archive uses Filestash's `xdg-open` extension API and can be installed independently of the source build on versions with the CodeMirror editor extension hook.

Upload the contents of [example](example/) into the same folder and open `YFM-demo.md` to try the plugin.
