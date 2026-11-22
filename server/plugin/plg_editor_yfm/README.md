# YFM preview for Filestash

Preview [Yandex Flavored Markdown (YFM)](https://diplodoc.com/docs/en/syntax/)
alongside the source in Filestash's Markdown editor. YFM is the Markdown dialect
used by Diplodoc for documentation. The preview uses
[Diplodoc Transform](https://github.com/diplodoc-platform/transform) to render
interactive tabs, collapsible sections, notes, tables and file includes.

## Install

This is a Filestash [runtime plugin](https://www.filestash.app/docs/guide/plugin-development.html#runtime-plugins)
and requires a Filestash build with the CodeMirror editor extension hook.
Filestash loads `editor_yfm.zip` from `state/plugins/` inside its data directory
at startup.

Building requires Make, Node.js 24+, npm 11.5.1+ and zip. Run the command
below from this directory.

```sh
make install FILESTASH_PATH=/path/to/filestash/data
```

If you run Filestash from the repository's `dist/` directory with its default
data path, run `make install` without arguments. Use `make` to produce only
`dist/editor_yfm.zip` for deployment on another instance.

Restart Filestash, then open a `.md` file and select **YFM preview** in the
toolbar. The preview updates while you type and scrolls with the source. Drag
the divider or use the arrow keys while it is focused. Save with the regular
editor button.

## Try it

Paste this into any Markdown file and open its preview.

```markdown
{% note tip "Live preview" %}

Edit this line to see the preview update.

{% endnote %}
```

For tabs, a cut and a relative include, open [YFM-demo.md](example/YFM-demo.md)
from a storage connected to Filestash. Keep the `snippets/` folder beside it.

## Preview scope

Includes and local images are read through the current Filestash session or
share. Relative links in an include resolve from that file. The preview escapes
raw HTML and omits remote images and embedded frames. Site-wide settings such
as `.yfm`, `toc.yaml` and `presets.yaml` are handled by the Diplodoc site build.
