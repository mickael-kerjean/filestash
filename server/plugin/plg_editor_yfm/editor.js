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

class YfmPreview extends HTMLElement {
    disconnectedCallback() {
        this.cleanup?.();
    }
}
customElements.define("filestash-yfm-preview", YfmPreview);

export default function(Base, {$menubar, getDownloadUrl}) {
    return class extends Base {
        constructor(editor) {
            super(editor);
            const original = new URL(getDownloadUrl(false), document.baseURI);
            const path = original.searchParams.get("path");
            if (!path) return;
            const download = new URL("api/files/cat", document.baseURI);
            const share = original.searchParams.get("share");
            if (share) download.searchParams.set("share", share);
            const lang = (document.documentElement.lang || navigator.language).split("-")[0];
            const isRussian = lang === "ru";
            const label = isRussian ? "Превью YFM" : "YFM preview";
            const params = new URLSearchParams(location.search);
            const viewBase = new URL("view", document.baseURI).href;
            const host = editor.getWrapperElement().parentElement;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "yfm-preview-toggle";
            button.textContent = label;
            button.setAttribute("aria-pressed", "false");
            button.setAttribute("aria-controls", "filestash-yfm-panel");
            $menubar.add(button);

            const panel = document.createElement("filestash-yfm-preview");
            panel.id = "filestash-yfm-panel";
            panel.hidden = true;
            const status = document.createElement("div");
            status.className = "yfm-preview-status";
            status.setAttribute("role", "status");
            panel.append(status);
            host.append(panel);
            const divider = addDivider(host, editor, isRussian ? "Размер панели редактора" : "Editor pane size");

            let worker, frame, timer, result;
            let requestId = 0;
            let frameReady = false;
            let anchor = params.get("yfm-anchor");
            let ignoreEditorTop;
            const theme = () => document.body.classList.contains("dark-mode") ? "dark" : "light";
            const themeObserver = new MutationObserver(() => post({type: "theme", theme: theme()}));

            function post(message) {
                if (frameReady) frame.contentWindow.postMessage(message, "*");
            }

            function updateFrame() {
                if (!frameReady || !result) return;
                post({type: "render", html: result.html, anchor, theme: theme(),
                    position: editorScrollPosition(editor), lines: editor.lineCount()});
                if (result.html) anchor = null;
            }

            function onEditorScroll() {
                if (Math.abs(editor.getScrollInfo().top - ignoreEditorTop) < 1) return;
                ignoreEditorTop = undefined;
                post({type: "scroll", position: editorScrollPosition(editor)});
            }

            function onPreviewMessage(event) {
                if (event.origin !== "null" || event.source !== frame?.contentWindow || event.data?.type !== "scroll") return;
                const {position} = event.data;
                if (position !== "top" && position !== "bottom" && (!Number.isFinite(position) || position < 0)) return;
                const target = editorScrollTarget(editor, position);
                if (Math.abs(editor.getScrollInfo().top - target) < 1) return;
                ignoreEditorTop = target;
                editor.scrollTo(null, target);
                ignoreEditorTop = editor.getScrollInfo().top;
            }

            function requestRender() {
                if (!worker) return;
                const id = ++requestId;
                clearTimeout(timer);
                timer = setTimeout(() => {
                    worker?.postMessage({id, source: editor.getValue(), path, downloadUrl: download.href, lang, viewBase});
                }, 180);
            }

            function stop() {
                requestId++;
                clearTimeout(timer);
                editor.off("changes", requestRender);
                editor.off("scroll", onEditorScroll);
                window.removeEventListener("message", onPreviewMessage);
                themeObserver.disconnect();
                divider.hide();
                worker?.terminate();
                worker = null;
                frame?.remove();
                frame = null;
                frameReady = false;
                result = null;
                ignoreEditorTop = undefined;
            }

            panel.cleanup = stop;
            button.addEventListener("click", async () => {
                if (!panel.hidden) {
                    stop();
                    panel.hidden = true;
                    host.classList.remove("with-yfm-preview");
                    button.setAttribute("aria-pressed", "false");
                    editor.refresh();
                    editor.focus();
                    return;
                }

                panel.hidden = false;
                host.classList.add("with-yfm-preview");
                button.setAttribute("aria-pressed", "true");
                editor.refresh();
                status.textContent = isRussian ? "Загрузка предпросмотра…" : "Loading preview…";
                const opening = ++requestId;
                try {
                    await stylesheet;
                    if (!panel.isConnected || opening !== requestId) return;
                    divider.show();
                    editor.refresh();
                    worker = new Worker(assetURL("render.js"));
                    worker.onmessage = ({data}) => {
                        if (data.id !== requestId) return;
                        result = data;
                        status.textContent = [data.error, ...(data.warnings || [])].filter(Boolean).join("\n");
                        updateFrame();
                    };
                    worker.onerror = () => {
                        status.textContent = isRussian ? "Не удалось загрузить рендерер YFM." : "Could not load the YFM renderer.";
                    };
                    const loadingFrame = frame = document.createElement("iframe");
                    frame.title = label;
                    frame.setAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox");
                    frame.addEventListener("load", () => {
                        if (frame !== loadingFrame) return;
                        frameReady = true;
                        updateFrame();
                    }, {once: true});
                    frame.src = assetURL("preview.html");
                    panel.append(frame);
                    window.addEventListener("message", onPreviewMessage);
                    themeObserver.observe(document.body, {attributes: true, attributeFilter: ["class"]});
                    editor.on("changes", requestRender);
                    editor.on("scroll", onEditorScroll);
                    requestRender();
                } catch (error) {
                    status.textContent = error.message;
                }
            });
            if (params.get("yfm") === "1") button.click();
        }
    };
}
