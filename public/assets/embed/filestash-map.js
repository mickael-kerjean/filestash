import { init as initConfig, getVersion } from "../model/config.js";

const DEBOUNCETIME = 100;

await initConfig();

class FilestashMap extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        this.iframe = document.createElement("iframe");
        this.iframe.setAttribute("style", "width: 100%; height: 100%; border: none; display: block;");
        this.iframe.setAttribute("sandbox", "allow-downloads allow-scripts allow-presentation");
        this.shadowRoot.appendChild(this.iframe);

        this.debounce = null;
    }

    static get observedAttributes() {
        return ["name", "src"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === null) return;
        if (oldValue !== newValue) {
            clearTimeout(this.debounce);
            this.debounce = setTimeout(() => {
                this.iframe.contentWindow.postMessage({
                    type: "refresh",
                    payload: { name: this.getAttribute("name"), src: this.getAttribute("src") },
                }, "*");
            }, DEBOUNCETIME);
        }
    }

    disconnectedCallback() {
        clearTimeout(this.debounce);
        this.debounce = null;
    }

    connectedCallback() {
        const src = this.getAttribute("src") || "";
        const name = this.getAttribute("name") || "main.dbf";
        const mime = {
            "geojson": "application/geo+json",
            "shp": "application/vnd.shp",
            "wms": "application/vnd.ogc.wms_xml",
        }[name.split(".").pop().toLowerCase()];

        this.style.display = "inline-block";
        this.iframe.srcdoc = `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title></title>
            </head>
            <body>
                <div id="app">
                    <component-bootscreen></component-bootscreen>
                </div>

                <script>
                customElements.define("component-bootscreen", class ComponentBootScreen extends HTMLElement {
                    connectedCallback() {
                        this.innerHTML = \`
                        <div class="component_loader">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width: 30px;">
                                <circle fill="#57595A" stroke="#57595A" stroke-width="15" r="15" cx="40" cy="100">
                                    <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4"></animate>
                                </circle>
                                <circle fill="#57595A" stroke="#57595A" stroke-width="15" r="15" cx="100" cy="100">
                                    <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2"></animate>
                                </circle>
                                <circle fill="#57595A" stroke="#57595A" stroke-width="15" r="15" cx="160" cy="100">
                                    <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0"></animate>
                                </circle>
                            </svg>
                            <style>
                                html, body, #app { height: 100%; margin: 0; }
                                #app { display: flex; }
                                component-bootscreen { margin: auto; }
                            </style>
                        </div>\`;
                    }
                });
                </script>

                <script type="module" defer>
                import { render } from "${import.meta.url}/../../${getVersion()}/index.js";
                import * as Application from "${import.meta.url}/../../${getVersion()}/pages/viewerpage/application_map.js";

                const $app = document.querySelector("#app");
                render(Application, $app, {
                    mime: "${mime}",
                    hasMenubar: true,
                    getFilename: () => "${name}",
                    getDownloadUrl: () => "${src}",
                });
                window.addEventListener("message", (event) => {
                    if(event.data.type === "refresh") {
                        render(Application, $app, {
                            mime: "${mime}",
                            hasMenubar: true,
                            getFilename: () => event.data.payload.name,
                            getDownloadUrl: () => event.data.payload.src,
                        });
                    }
                });
                </script>

                <script type="module" src="${import.meta.url}/../../${getVersion()}/components/modal.js"></script>
                <component-modal></component-modal>
            </body>
        </html>`;
    }
}

customElements.define("filestash-map", FilestashMap);
