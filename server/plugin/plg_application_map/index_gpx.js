import { PLUGINS, DEFAULT_TILE_SERVER } from "./constant.js";

export default async function(IMap) {
    const plugins = await Promise.all(PLUGINS.map((name) => import(`./plugins/${name}.js`)));

    return class MapImpl extends IMap {
        constructor(response, { L, map, $page }) {
            super();
            const xmlDoc = new DOMParser().parseFromString(
                new TextDecoder().decode(response),
                "application/xml",
            );
            this.xmlDoc = xmlDoc;
            L.tileLayer(DEFAULT_TILE_SERVER, { maxZoom: 21 }).addTo(map);
            plugins.forEach((plugin) => plugin.default({ map, $page }));
        }

        async toGeoJSON() {
            let geoJSON = {
                type: "FeatureCollection",
                features: [],
            };
            this.xmlDoc.querySelectorAll("wpt").forEach((wayPoint) => {
                geoJSON.features.push({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [
                            Number(wayPoint.getAttribute("lon")),
                            Number(wayPoint.getAttribute("lat")),
                        ],
                    },
                    properties: {
                        group: "waypoint",
                        "popup::type": "html",
                        "popup::content": createLegendFromXML(wayPoint),
                    },
                });
            });
            this.xmlDoc.querySelectorAll("rte").forEach((route) => {
                const coordinates = [];
                route.querySelectorAll("rtept").forEach((point) => {
                    const lon = Number(point.getAttribute("lon"));
                    const lat = Number(point.getAttribute("lat"));
                    if (!isNaN(lon) && !isNaN(lat)) {
                        coordinates.push([lon, lat]);
                    }
                });
                if (coordinates.length > 0) geoJSON.features.push({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: coordinates,
                    },
                    properties: {
                        group: "path",
                        weight: 5,
                        name: route.querySelector("name").textContent,
                    },
                });
            });
            this.xmlDoc.querySelectorAll("trk").forEach((track) => {
                track.querySelectorAll("trkseg").forEach((segment) => {
                    const group = "Track: " + track.querySelector("name").textContent;
                    const coordinates = [];
                    segment.querySelectorAll("trkpt").forEach((point) => {
                        const lon = Number(point.getAttribute("lon"));
                        const lat = Number(point.getAttribute("lat"));
                        if (!isNaN(lon) && !isNaN(lat)) {
                            coordinates.push([lon, lat]);
                        }
                    });
                    if (coordinates.length > 0) {
                        geoJSON.features.push({
                            type: "Feature",
                            geometry: {
                                type: "LineString",
                                coordinates: coordinates,
                            },
                            properties: {
                                group,
                                color: "brown",
                                weight: 3,
                                name: track.querySelector("name").textContent,
                            },
                        });
                        geoJSON.features.push({
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: coordinates[0],
                            },
                            properties: {
                                group,
                                color: "green",
                                name: "Start: " + group,
                            },
                        });
                        geoJSON.features.push({
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: coordinates.slice(-1)[0],
                            },
                            properties: {
                                group,
                                color: "red",
                                name: "Arrival: " + group,
                            },
                        });
                    }
                });
            });
            return geoJSON;
        }
    }
}

function createLegendFromXML(point) {
    return [...point.children]
        .map((tag) => `
            <div class="ellipsis" style="line-height: 1rem;">
                <strong style="text-transform: capitalize;">${tag.tagName}: </strong>
                ${tag.textContent || "N/A"}
            </div>
        `)
        .join("");
}
