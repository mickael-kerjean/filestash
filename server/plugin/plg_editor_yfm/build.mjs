import {execFile} from "node:child_process";
import {copyFile, mkdir, readFile, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {build} from "esbuild";
import {nodeModulesPolyfillPlugin} from "esbuild-plugins-node-modules-polyfill";

const root = fileURLToPath(new URL(".", import.meta.url));
const output = root + "dist";
const transform = root + "node_modules/@diplodoc/transform";
await mkdir(output, {recursive: true});

await build({
    absWorkingDir: root,
    entryPoints: ["render.js"],
    outdir: output,
    bundle: true,
    minify: true,
    legalComments: "linked",
    platform: "browser",
    target: ["es2022"],
    plugins: [
        {
            name: "diplodoc-browser",
            setup(build) {
                build.onResolve({filter: /^(node:)?fs$/}, () => ({path: root + "virtual-files.js"}));
                // Diplodoc packages still import these Markdown-it v13 paths.
                build.onResolve({filter: /^markdown-it\/lib\/(common\/utils|token)$/}, ({path}) => ({
                    path: fileURLToPath(import.meta.resolve(path + ".mjs")),
                }));
                // source-map-resolve expects the decoder's old CommonJS export.
                build.onLoad({filter: /[\\/]source-map-resolve[\\/]index\.js$/}, async ({path}) => {
                    const code = await readFile(path, "utf8");
                    return {
                        contents: code.replace('require("decode-uri-component")', 'require("decode-uri-component").default'),
                    };
                });
            },
        },
        nodeModulesPolyfillPlugin({globals: {process: true, Buffer: true}}),
    ],
});

const files = ["manifest.json", "editor.js", "editor.css", "preview.html", "preview.js", "preview.css"];
await Promise.all(files.map((name) => copyFile(root + name, output + "/" + name)));
await copyFile(transform + "/LICENSE", output + "/LICENSE.diplodoc");
for (const [kind, name] of [["css", "yfm.css"], ["js", "yfm.js"]]) {
    const asset = await readFile(transform + "/dist/" + kind + "/" + name.replace(".", ".min."), "utf8");
    await writeFile(output + "/" + name, asset.replace(/^.*sourceMappingURL=.*$/m, ""));
}

await promisify(execFile)("zip", ["-q", "-FS", "editor_yfm.zip", ...files,
    "render.js", "render.js.LEGAL.txt", "yfm.css", "yfm.js", "LICENSE.diplodoc"], {cwd: output});
