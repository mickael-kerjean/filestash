class FilestashTable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        this.iframe = document.createElement("iframe");
        this.iframe.setAttribute("style", "width: 100%; height: 100%; border: none; display: block;");
        this.iframe.setAttribute("sandbox", "allow-downloads allow-same-origin allow-scripts allow-presentation allow-forms");
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
            }, 100);
        }
    }

    disconnectedCallback() {
        clearTimeout(this.debounce);
        this.debounce = null;
    }

    connectedCallback() {
        const src = this.getAttribute("src") || "";
        const name = this.getAttribute("name") || "main.dat";

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
                    import { init as initConfig, getVersion, get } from "${import.meta.url}/../../model/config.js";

                    await initConfig();
                    const { render } = await import("${import.meta.url}/../../"+ getVersion() +"/index.js");
                    const Application = await import("${import.meta.url}/../../"+ getVersion() +"/pages/viewerpage/application_table.js");

                    const $app = document.querySelector("#app");
                    const mime = get("mime", {})["${name}".split(".").pop().toLowerCase()];
                    render(Application, $app, {
                        mime: mime,
                        hasMenubar: true,
                        getFilename: () => "${name}",
                        getDownloadUrl: () => "${src}",
                    });
                    window.addEventListener("message", (event) => {
                        if(event.data.type === "refresh") {
                            render(Application, $app, {
                                mime: mime,
                                hasMenubar: true,
                                getFilename: () => event.data.payload.name,
                                getDownloadUrl: () => event.data.payload.src,
                            });
                        }
                    });
                </script>

                <component-modal></component-modal>
            </body>
        </html>`;
    }
}

customElements.define("filestash-table", FilestashTable);
