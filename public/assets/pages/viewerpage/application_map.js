import { createElement, nop } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { extname } from "../../lib/path.js";
import ajax from "../../lib/ajax.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";

import { renderMenubar, buttonDownload } from "./component_menubar.js";
import ctrlError from "../ctrl_error.js";

const DEFAULT_TILE_SERVER = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"; // "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",

const PLUGINS = [
    "plugin_grayscale",
    // ... add more plugins via frontend override
];

export default async function(render, { mime, getDownloadUrl = nop, getFilename = nop }) {
    const $page = createElement(`
        <div class="component_map">
            <component-menubar filename="${getFilename() || ""}"></component-menubar>
            <div id="map"></div>
        </div>
    `);
    render($page);
    renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getFilename(), getDownloadUrl()),
    );

    const map = window.L.map("map");
    const removeLoader = createLoader(qs($page, "#map"));
    await effect(ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).pipe(
        rxjs.map(({ response }) => response),
        rxjs.mergeMap(async(data) => { switch(mime) {
            case "application/geo+json": return loadGeoJSON(map, JSON.parse(new TextDecoder().decode(data)));
            case "application/vnd.ogc.wms_xml": return loadWMS(map, new TextDecoder().decode(data));
            case "application/vnd.shp": return await loadSHP(map, data);
            default: throw new Error(`Insupported mime type: '${mime}'`);
        }}),
        removeLoader,
        rxjs.catchError(ctrlError()),
    ));

    for (let i=0; i<PLUGINS.length; i++) {
        await import(`./application_map/${PLUGINS[i]}.js`)
            .then(async(module) => await module.default({ map, $page }));
    }
}

export async function init($root) {
    const priors = ($root && [
        $root.classList.add("component_page_viewerpage"),
        loadCSS(import.meta.url, "./component_menubar.css"),
        loadCSS(import.meta.url, "../ctrl_viewerpage.css"),
    ]);
    await Promise.all([
        loadJS(import.meta.url, "../../lib/vendor/leaflet/leaflet.js"),
        loadCSS(import.meta.url, "../../lib/vendor/leaflet/leaflet.css"),
        loadCSS(import.meta.url, "./application_map.css"),
        ...priors,
    ]);
}

function loadGeoJSON(map, content) {
    window.L.tileLayer(DEFAULT_TILE_SERVER, { maxZoom: 21 }).addTo(map);

    const overlay = { global: window.L.layerGroup([]) };
    let n = 0;
    const geojson = window.L.geoJSON(content, {
        onEachFeature: (feature, shape) => {
            n += 1;
            if (n > 10000) return;
            const { group = "global", ...props } = feature.properties || {};
            const featureObject = (function() {
                if (props["name"]) shape = shape.bindPopup(props["name"]);
                switch (props["popup::type"]) {
                case "text":
                    shape = shape.bindPopup(props["popup::content"]);
                    break;
                case "html":
                    shape = shape.bindPopup((function() {
                        const $richLabel = window.L.DomUtil.create("div", "");
                        $richLabel.innerHTML = props["popup::content"];
                        if ($richLabel.querySelector("script")) $richLabel.innerHTML = `__BLOCKED_CONTENT__`;
                        return $richLabel;
                    })(), {
                        className: "leaflet-measure-resultpopup",
                        autoPanPadding: [10, 10],
                    });
                    break;
                }
                return shape;
            })(feature.geometry || {});
            if (!featureObject) return;
            if (!overlay[group]) overlay[group] = window.L.layerGroup([]);
            overlay[group].addLayer(featureObject);
        }
    });

    // center map around bounds
    const center = geojson.getBounds().getCenter();
    const zoom = (function(p1, p2) {
        const distance = Math.log10(1 + Math.abs(p1.lat - p2.lat) + Math.abs(p1.lng - p2.lng));
        const [a, b] = distance > 0.5 ? [-4, 11] : [-15, 15];
        return Math.floor(a * distance + b);
    })(geojson.getBounds().getNorthEast(), geojson.getBounds().getSouthWest());
    map.setView([center.lat, center.lng], zoom);

    // display everything
    Object.keys(overlay).forEach((key) => overlay[key].addTo(map));
    delete overlay["global"];
    if (Object.keys(overlay).length > 0) window.L.control.layers({}, overlay).addTo(map);
}

function loadWMS(map, content) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "application/xml");
    const svcURL = (function() {
        const svc = xmlDoc.querySelector("Capability OnlineResource");
        if (!svc) return "";
        return svc.getAttribute("xlink:href");
    }());
    let _layer = "";
    const baseLayers = {};
    xmlDoc.querySelectorAll("Layer").forEach((layer) => {
        _layer = layer.querySelector("Name").textContent;
        baseLayers[layer.querySelector("Title").textContent] = window.L.tileLayer.wms(svcURL, {
            layers: _layer,
        });
    });
    map.setView([0, 0], 1);
    window.L.tileLayer.wms(svcURL, { layers: _layer }).addTo(map);
    window.L.control.layers(baseLayers, {}).addTo(map);
}

async function loadSHP(map, content) {
    const module = await import("../../lib/vendor/shp-to-geojson.browser.js");
    const shp = new module.default({});
    shp._shpBuffer = module.Buffer.from(content);
    shp._tableBuffer = module.Buffer.from(new ArrayBuffer(16));
    shp._init();
    await shp.load();
    loadGeoJSON(map, shp.getGeoJson());
}
