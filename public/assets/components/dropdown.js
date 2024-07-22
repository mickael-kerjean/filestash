import { createFragment } from "../lib/skeleton/index.js";
import { animate, slideYIn } from "../lib/animate.js";
import assert from "../lib/assert.js";
import { loadCSS } from "../helpers/loader.js";

export default class ComponentDropdown extends HTMLDivElement {
    constructor() {
        super();
        this.render();
    }

    async connectedCallback() {
        await loadCSS(import.meta.url, "./dropdown.css");
    }

    static get observedAttributes() {
        return ["options"];
    }

    render() {
        this.classList.add("component_dropdown", "view", "sort");
        this.appendChild(createFragment(`
  <div class="dropdown_button">
    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDM2MCw0NjAgSCAyNCBDIDEwLjcsNDYwIDAsNDUzLjMgMCw0NDAgdiAtMTIgYyAwLC0xMy4zIDEwLjcsLTIwIDI0LC0yMCBoIDMzNiBjIDEzLjMsMCAyNCw2LjcgMjQsMjAgdiAxMiBjIDAsMTMuMyAtMTAuNywyMCAtMjQsMjAgeiIgLz4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDIyNi41NTM5LDIzNC44ODQyOCBWIDUyLjk0MzI4MyBjIDAsLTYuNjI3IC01LjM3MywtMTIgLTEyLC0xMiBoIC00NCBjIC02LjYyNywwIC0xMiw1LjM3MyAtMTIsMTIgViAyMzQuODg0MjggaCAtNTIuMDU5IGMgLTIxLjM4MiwwIC0zMi4wOSwyNS44NTEgLTE2Ljk3MSw0MC45NzEgbCA4Ni4wNTksODYuMDU5IGMgOS4zNzMsOS4zNzMgMjQuNTY5LDkuMzczIDMzLjk0MSwwIGwgODYuMDU5LC04Ni4wNTkgYyAxNS4xMTksLTE1LjExOSA0LjQxMSwtNDAuOTcxIC0xNi45NzEsLTQwLjk3MSB6IiAvPgo8L3N2Zz4K" alt="download_white">
  </div>`));

        this.appendChild(createFragment(`
  <div class="dropdown_container">
    <ul>
      <li>
        <div>
          <a download="README.org" href="/api/files/cat?path=%2FREADME.org">Save current file</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" href="/api/export/private/text/html/README.org">Export as HTML</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" href="/api/export/private/application/pdf/README.org">Export as PDF</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" href="/api/export/private/text/markdown/README.org">Export as Markdown</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" href="/api/export/private/text/plain/README.org">Export as TXT</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" download="README.tex" href="/api/export/private/text/x-latex/README.org">Export as Latex</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" download="README.ics" href="/api/export/private/text/calendar/README.org">Export as ical</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" download="README.odt" href="/api/export/private/application/vnd.oasis.opendocument.text/README.org">Export as Open office</a>
        </div>
      </li>
      <li>
        <div>
          <a target="_blank" download="README.pdf" href="/api/export/private/application/pdf/README.org?mode=beamer">Export as Beamer</a>
        </div>
      </li>
    </ul>
  </div>
</div>
        `));

        const setActive = () => this.classList.toggle("active");
        assert.type(this.querySelector(".dropdown_button"), window.HTMLElement).onclick = () => {
            setActive();
            animate(assert.type(this.querySelector(".dropdown_container"), window.HTMLElement), {
                time: 100,
                keyframes: slideYIn(2),
            });
        };
    }
}

customElements.define("component-dropdown", ComponentDropdown, { extends: "div" });
