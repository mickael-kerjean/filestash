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
            const download = new URL(getDownloadUrl(false), document.baseURI);
            const path = download.searchParams.get("path");
            if (!path) return;
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

            let worker, frame, timer, result;
            let requestId = 0;
            let frameReady = false;
            let anchor = params.get("yfm-anchor");

            function updateFrame() {
                if (!frameReady || !result) return;
                frame.contentWindow.postMessage({html: result.html, anchor}, "*");
                if (result.html) anchor = null;
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
                worker?.terminate();
                worker = null;
                frame?.remove();
                frame = null;
                frameReady = false;
                result = null;
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
                    editor.on("changes", requestRender);
                    requestRender();
                } catch (error) {
                    status.textContent = error.message;
                }
            });
            if (params.get("yfm") === "1") button.click();
        }
    };
}
