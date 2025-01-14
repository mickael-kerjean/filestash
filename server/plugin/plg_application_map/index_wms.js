import { PLUGINS, DEFAULT_TILE_SERVER } from "./constant.js";

export default async function(IMap) {
    let modules = await Promise.all(PLUGINS.map((name) => import(`./plugins/${name}.js`)));

    return class MapImpl extends IMap {
        constructor(response, { map, $page }) {
            super();
            for (let i=0; i<PLUGINS.length; i++) {
                modules.forEach((module) => module.default({ map, $page }));
            }
            const xmlDoc = new DOMParser().parseFromString(
                new TextDecoder().decode(response),
                "application/xml",
            );
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

        async toGeoJSON() {
            return null;
        }
    }
}
