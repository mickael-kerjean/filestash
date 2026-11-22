import {addDivider, editorScrollPosition, editorScrollTarget} from "./editor-split.js";

const assetURL = (file) => new URL(file, import.meta.url).href;
const stylesheet = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = assetURL("editor.css");
    link.onload = resolve;
    link.onerror = () => reject(new Error("Could not load YFM preview styles."));
    document.head.append(link);
});
stylesheet.catch(() => {});

customElements.define("filestash-yfm-preview", class extends HTMLElement {
    disconnectedCallback() {
        this.cleanup?.();
    }
});

export default function(Base, {$menubar, getDownloadUrl}) {
    return class extends Base {
        constructor(editor) {
            super(editor);
            const download = new URL(getDownloadUrl(false), document.baseURI);
            if (download.searchParams.get("path")) mountPreview(editor, $menubar, download.href);
        }
    };
}

function mountPreview(editor, menubar, downloadUrl) {
    const lang = (document.documentElement.lang || navigator.language).split("-")[0];
    const isRussian = lang === "ru";
    const label = isRussian ? "Превью YFM" : "YFM preview";
    const params = new URLSearchParams(location.search);
    const options = {downloadUrl, lang, label, viewBase: new URL("view", document.baseURI).href, anchor: params.get("yfm-anchor")};
    let session;

    const host = editor.getWrapperElement().parentElement;
    const panel = document.createElement("filestash-yfm-preview");
    panel.id = "filestash-yfm-panel";
    panel.hidden = true;
    const status = document.createElement("div");
    status.className = "yfm-preview-status";
    status.setAttribute("role", "status");
    panel.append(status);
    host.append(panel);
    const divider = addDivider(host, editor, isRussian ? "Размер панели редактора" : "Editor pane size");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "yfm-preview-toggle";
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-controls", panel.id);
    menubar.add(button);

    function close() {
        session?.abort();
        session = null;
        divider.hide();
    }

    function setVisible(visible) {
        panel.hidden = !visible;
        host.classList.toggle("with-yfm-preview", visible);
        button.setAttribute("aria-pressed", String(visible));
        editor.refresh();
    }

    panel.cleanup = close;
    button.addEventListener("click", async () => {
        if (session) {
            close();
            setVisible(false);
            editor.focus();
            return;
        }

        const {signal} = session = new AbortController();
        setVisible(true);
        status.textContent = isRussian ? "Загрузка предпросмотра…" : "Loading preview…";
        try {
            await stylesheet;
            if (signal.aborted) return;
            divider.show();
            editor.refresh();
            startPreview(editor, panel, status, options, signal);
        } catch (error) {
            if (!signal.aborted) status.textContent = error.message;
        }
    });
    if (params.get("yfm") === "1") button.click();
}

function startPreview(editor, panel, status, options, signal) {
    const {downloadUrl, lang, label, viewBase} = options;
    const worker = new Worker(assetURL("render.js"));
    const frame = document.createElement("iframe");
    frame.title = label;
    frame.setAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox");
    frame.src = assetURL("preview.html");

    let ready = false;
    let requestId = 0;
    let timer, result, ignoreEditorTop;
    const theme = () => document.body.classList.contains("dark-mode") ? "dark" : "light";
    const themeObserver = new MutationObserver(() => post({type: "theme", theme: theme()}));

    function post(message) {
        // A sandboxed frame without allow-same-origin has an opaque origin.
        if (ready) frame.contentWindow.postMessage(message, "*");
    }

    function updateFrame() {
        if (!ready || !result) return;
        post({type: "render", html: result.html, anchor: options.anchor, theme: theme(),
            position: editorScrollPosition(editor), lines: editor.lineCount()});
        if (result.html) options.anchor = null;
    }

    function requestRender() {
        const id = ++requestId;
        clearTimeout(timer);
        timer = setTimeout(() => {
            worker.postMessage({id, source: editor.getValue(), downloadUrl, lang, viewBase});
        }, 180);
    }

    function onEditorScroll() {
        if (Math.abs(editor.getScrollInfo().top - ignoreEditorTop) < 1) return;
        ignoreEditorTop = undefined;
        post({type: "scroll", position: editorScrollPosition(editor)});
    }

    function onPreviewMessage(event) {
        if (event.origin !== "null" || event.source !== frame.contentWindow || event.data?.type !== "scroll") return;
        const {position} = event.data;
        if (position !== "top" && position !== "bottom" && (!Number.isFinite(position) || position < 0)) return;
        const target = editorScrollTarget(editor, position);
        if (Math.abs(editor.getScrollInfo().top - target) < 1) return;
        ignoreEditorTop = target;
        editor.scrollTo(null, target);
        ignoreEditorTop = editor.getScrollInfo().top;
    }

    signal.addEventListener("abort", () => {
        clearTimeout(timer);
        editor.off("changes", requestRender);
        editor.off("scroll", onEditorScroll);
        themeObserver.disconnect();
        worker.terminate();
        frame.remove();
    }, {once: true});
    worker.addEventListener("message", ({data}) => {
        if (data.id !== requestId) return;
        result = data;
        status.textContent = data.error || data.warnings.join("\n");
        updateFrame();
    }, {signal});
    worker.addEventListener("error", () => {
        status.textContent = lang === "ru" ? "Не удалось загрузить рендерер YFM." : "Could not load the YFM renderer.";
    }, {signal});
    frame.addEventListener("load", () => {
        ready = true;
        if (result) updateFrame();
        else post({type: "theme", theme: theme()});
    }, {once: true, signal});
    panel.append(frame);
    window.addEventListener("message", onPreviewMessage, {signal});
    themeObserver.observe(document.body, {attributes: true, attributeFilter: ["class"]});
    editor.on("changes", requestRender);
    editor.on("scroll", onEditorScroll);
    requestRender();
}
