import { createElement, nop } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import ajax from "../../lib/ajax.js";
import { load as loadPlugin } from "../../model/plugin.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

import componentDownloader, { init as initDownloader } from "./application_downloader.js";
import { renderMenubar, buttonDownload } from "./component_menubar.js";

class IMap {
    toGeoJSON() { throw new Error("NOT_IMPLEMENTED"); }
}

export default async function(render, { mime, getDownloadUrl = nop, getFilename = nop, acl$ = rxjs.EMPTY }) {
    const $page = createElement(`
        <div class="component_map">
            <component-menubar filename="${getFilename() || ""}"></component-menubar>
            <div id="map"></div>
        </div>
    `);
    render($page);
    const $menubar = renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getFilename(), getDownloadUrl()),
    );

    const map = window.L.map("map");
    const removeLoader = createLoader(qs($page, "#map"));
    await effect(ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).pipe(
        rxjs.mergeMap(async({ response }) => {
            const loader = await loadPlugin(mime);
            if (!loader) {
                try {
                    loadGeoJSON(map, JSON.parse(new TextDecoder().decode(response)));
                    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 21 }).addTo(map);
                }
                catch (err) { componentDownloader(render, { mime, acl$, getFilename, getDownloadUrl }); }
                return rxjs.EMPTY;
            }
            const mapImpl = new (await loader(IMap, { mime, getDownloadUrl, getFilename, $menubar }))(response, {
                map, $page, L: window.L,
            });
            loadGeoJSON(map, await mapImpl.toGeoJSON());
        }),
        removeLoader,
        rxjs.catchError(ctrlError()),
    ));
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
        initDownloader(),
        ...priors,
    ]);
}

function loadGeoJSON(map, content) {
    const overlay = { global: window.L.layerGroup([]) };
    let n = 0;
    const geojson = window.L.geoJSON(content, {
        style: (feature) => {
            const style = { color: "#3388ff", weight: 3 };
            if (feature.properties.color) style.color = feature.properties.color;
            if (feature.properties.weight) style.weight = feature.properties.weight;
            return style;
        },
        pointToLayer: (feature, latlng) => {
            return window.L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#e2e2e2",
                color: "#000000",
                opacity: 0.5,
                weight: 1,
                fillOpacity: 0.3
            });
        },
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
    try {
        const center = geojson.getBounds().getCenter();
        const zoom = (function(p1, p2) {
            const distance = Math.log10(1 + Math.abs(p1.lat - p2.lat) + Math.abs(p1.lng - p2.lng));
            const [a, b] = distance > 0.5 ? [-4, 11] : [-15, 15];
            return Math.floor(a * distance + b);
        })(geojson.getBounds().getNorthEast(), geojson.getBounds().getSouthWest());
        map.setView([center.lat, center.lng], zoom);
    } catch (err) {
        map.setView([0, 0], 2);
    }

    // display everything
    Object.keys(overlay).forEach((key) => overlay[key].addTo(map));
    delete overlay["global"];
    if (Object.keys(overlay).length > 0) window.L.control.layers({}, overlay).addTo(map);
}
