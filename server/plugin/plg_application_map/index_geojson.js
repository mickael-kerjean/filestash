import { PLUGINS, DEFAULT_TILE_SERVER } from "./constant.js";

export default async function(IMap) {
    const plugins = await Promise.all(PLUGINS.map((name) => import(`./plugins/${name}.js`)));

    return class MapImpl extends IMap {
        constructor(response, { map, $page }) {
            super();
            this.response = JSON.parse(new TextDecoder().decode(response));

            window.L.tileLayer(DEFAULT_TILE_SERVER, { maxZoom: 21 }).addTo(map);
            plugins.forEach((plugin) => plugin.default({ map, $page }));
        }

        async toGeoJSON() {
            return this.response;
        }
    }
}
