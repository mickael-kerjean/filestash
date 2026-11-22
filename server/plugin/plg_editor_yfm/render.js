import transform from "@diplodoc/transform";
import defaultPlugins from "@diplodoc/transform/lib/plugins.js";
import includes from "@diplodoc/transform/lib/plugins/includes/index.js";
import {log} from "@diplodoc/transform/lib/log.js";
import {defaultOptions} from "@diplodoc/transform/lib/sanitize.js";
import {resolve} from "path";
import {files, missing, resetFiles} from "./virtual-files.js";

const ROOT = "/filestash";
const MAX_INCLUDE_ROUNDS = 10;
const MAX_INCLUDES = 32;
const MAX_INCLUDE_EXPANSIONS = 128;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES = 12;
const SCROLL_ANCHOR = "filestash_scroll_anchor";
let active;

self.addEventListener("message", async ({data}) => {
    active?.abort();
    const request = active = new AbortController();
    try {
        const result = await render(data, request.signal);
        if (!request.signal.aborted) self.postMessage({id: data.id, ...result});
    } catch (error) {
        if (!request.signal.aborted) self.postMessage({id: data.id, error: error.message});
    }
});

async function render({source, path, downloadUrl, viewBase, lang}, signal) {
    if (source.length > 2 * 1024 * 1024) throw new Error("This document is too large to preview.");
    const api = new URL(downloadUrl);
    if (api.origin !== self.location.origin || !api.pathname.endsWith("/api/files/cat")) {
        throw new Error("Invalid Filestash download URL.");
    }
    const share = api.searchParams.get("share");
    api.search = "";
    if (share) api.searchParams.set("share", share);
    const loaded = new Map();
    const images = new Map();
    const warnings = new Set();
    const documentPath = ROOT + path;
    let html;
    let includeExpansions;

    function fileURL(file) {
        const url = new URL(api);
        url.searchParams.set("path", file);
        return url;
    }

    function rewriteLinks(md) {
        md.included = files;
        md.core.ruler.before("includes", "filestash_paths", (state) => {
            const currentPath = state.env.path || documentPath;
            if (state.env.includes?.length && ++includeExpansions > MAX_INCLUDE_EXPANSIONS) {
                warnings.add("Some includes exceed the preview expansion limit.");
                throw new Error("Too many include expansions.");
            }
            if (state.env.includes?.includes(currentPath)) {
                warnings.add("Circular include: " + currentPath.slice(ROOT.length));
                return;
            }
            for (const block of state.tokens) {
                for (const token of block.children || []) {
                    if (token.type === "image") {
                        const target = resolveTarget(currentPath, token.attrGet("src"));
                        if (target && !images.has(target.path) && images.size < MAX_IMAGES) images.set(target.path, null);
                        token.attrSet("src", (target && images.get(target.path)) || "");
                    }
                    const hrefValue = token.attrGet("href");
                    if (hrefValue) {
                        const target = resolveTarget(currentPath, hrefValue);
                        if (!target) continue;
                        if (/\.(md|markdown)$/i.test(target.path)) {
                            const href = new URL(viewBase + target.path.split("/").map(encodeURIComponent).join("/"));
                            if (share) href.searchParams.set("share", share);
                            href.searchParams.set("yfm", "1");
                            if (target.hash) href.searchParams.set("yfm-anchor", target.hash);
                            token.attrSet("href", href.href);
                        } else {
                            const href = fileURL(target.path);
                            href.searchParams.set("name", target.path.split("/").at(-1).replaceAll('"', "_") || "file");
                            token.attrSet("href", href.href);
                        }
                    }
                }
            }
        });
    }

    function compile() {
        signal.throwIfAborted();
        resetFiles();
        log.clear();
        includeExpansions = 0;
        for (const [file, text] of loaded) {
            if (text !== null) files[file] = text || "\n";
        }
        return transform(source, {
            path: documentPath,
            root: ROOT + "/",
            lang,
            allowHTML: false,
            sanitizeOptions: {
                ...defaultOptions,
                allowedSchemesByTag: {img: ["data"]},
                allowedAttributes: {
                    ...defaultOptions.allowedAttributes,
                    "*": [...defaultOptions.allowedAttributes["*"], "data-yfm-line"],
                },
            },
            disableCircularError: true,
            plugins: [...defaultPlugins, includes, rewriteLinks, scrollMarkers],
        }).result.html;
    }

    for (let round = 0; round < MAX_INCLUDE_ROUNDS; round++) {
        html = compile();
        const pending = [...missing].filter((file) => file.startsWith(ROOT + "/") && !loaded.has(file));
        if (!pending.length || loaded.size >= MAX_INCLUDES) break;
        await Promise.all(pending.slice(0, MAX_INCLUDES - loaded.size).map(async (file) => {
            try {
                const path = storagePath(decodeURIComponent(file.slice(ROOT.length)));
                if (!path || !/\.(md|markdown)$/i.test(path)) throw new Error("Markdown include required.");
                const response = await fetchFile(fileURL(path), signal);
                loaded.set(file, new TextDecoder("utf-8", {fatal: true}).decode(await readBytes(response, MAX_FILE_BYTES)));
            } catch {
                loaded.set(file, null);
                warnings.add("Include unavailable: " + file.slice(ROOT.length));
            }
        }));
    }
    if ([...missing].some((file) => !loaded.has(file))) warnings.add("Some includes could not be resolved.");

    if (images.size) {
        await Promise.all([...images.keys()].map(async (file) => {
            try {
                const response = await fetchFile(fileURL(file), signal);
                const type = response.headers.get("Content-Type")?.split(";")[0];
                if (!/^image\/(png|jpeg|gif|webp|avif|bmp|svg\+xml)$/.test(type)) throw new Error("Unsupported image.");
                const bytes = await readBytes(response, MAX_IMAGE_BYTES);
                const reader = new FileReaderSync();
                images.set(file, reader.readAsDataURL(new Blob([bytes], {type})));
            } catch {
                warnings.add("Image unavailable: " + file);
            }
        }));
        html = compile();
    }
    return {html, warnings: [...warnings]};
}

function resolveTarget(from, href) {
    if (!href || /^[a-z][a-z\d+.-]*:|^[#?]|^\/\/|\\/i.test(href)) return null;
    const url = new URL(href, "https://storage.invalid" + from.slice(ROOT.length).split("/").map(encodeURIComponent).join("/"));
    if (url.origin !== "https://storage.invalid") return null;
    let path;
    try {
        path = storagePath(decodeURIComponent(url.pathname));
    } catch {
        return null;
    }
    return path && {path, hash: url.hash};
}

function storagePath(path) {
    if (!path.startsWith("/") || /[\\\x00-\x1f\x7f]/.test(path)) return null;
    return resolve("/", path);
}

function scrollMarkers(md) {
    const lines = new WeakMap();
    function marker(state, line) {
        const token = new state.Token(SCROLL_ANCHOR, "span", 0);
        token.meta = {line};
        return token;
    }
    md.renderer.rules[SCROLL_ANCHOR] = (tokens, index) =>
        `<span class="yfm-scroll-anchor" aria-hidden="true" data-yfm-line="${tokens[index].meta.line}"></span>\n`;

    md.core.ruler.before("includes", SCROLL_ANCHOR, (state) => {
        if (state.inlineMode || state.env.includes?.length) return;
        let depth = 0;
        state.tokens = state.tokens.flatMap((token, index, tokens) => {
            const topLevel = depth === 0;
            depth += token.nesting;
            if (!topLevel || token.hidden || token.nesting < 0) return [token];
            const next = tokens[index + 1];
            const line = (token.map || (token.type === "tabs_open" && next?.map))?.[0];
            if (line === undefined) return [token];
            // The include rule replaces the directive's tokens with the included document.
            if (token.type === "paragraph_open" && /^{%\s*include\b/.test(next?.content || "")) {
                return [marker(state, line), token];
            }
            lines.set(token, line);
            return [token];
        });
    });
    md.core.ruler.push(SCROLL_ANCHOR + "_render", (state) => {
        if (state.inlineMode || state.env.includes?.length) return;
        state.tokens = state.tokens.flatMap((token) => lines.has(token) ? [marker(state, lines.get(token)), token] : [token]);
    });
}

async function fetchFile(url, signal) {
    const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    });
    if (!response.ok) throw new Error("File unavailable.");
    return response;
}

async function readBytes(response, limit) {
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
        for (;;) {
            const {value, done} = await reader.read();
            if (done) break;
            size += value.length;
            if (size > limit) throw new Error("File is too large.");
            chunks.push(value);
        }
    } finally {
        await reader.cancel();
    }
    return new Uint8Array(await new Blob(chunks).arrayBuffer());
}
