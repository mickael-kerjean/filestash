import { createElement, createRender, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick, onLoad } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import assert from "../../lib/assert.js";
import t from "../../locales/index.js";
import { loadJS, loadCSS } from "../../helpers/loader.js";

export default async function(render, { toggle, load$ }) {
    const $page = createElement(`
        <div>
            <div data-bind="header"></div>
            <div data-bind="body">
                <component-icon name="loading"></component-icon>
            </div>
        </div>
    `);
    render($page);
    componentHeader(createRender(qs($page, `[data-bind="header"]`)), { toggle });
    componentBody(createRender(qs($page, `[data-bind="body"]`)), { load$ });
}

function componentHeader(render, { toggle }) {
    const $header = createElement(`
        <div class="header">
            <div>${t("Info")}</div>
            <div style="flex: 1 1 0%;">
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MS45NzYgNTEuOTc2Ij4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjUzMzMzMjg1O3N0cm9rZS13aWR0aDoxLjQ1NjgxMTE5IiBkPSJtIDQxLjAwNTMxLDQwLjg0NDA2MiBjIC0xLjEzNzc2OCwxLjEzNzc2NSAtMi45ODIwODgsMS4xMzc3NjUgLTQuMTE5ODYxLDAgTCAyNi4wNjg2MjgsMzAuMDI3MjM0IDE0LjczNzU1MSw0MS4zNTgzMSBjIC0xLjEzNzc3MSwxLjEzNzc3MSAtMi45ODIwOTMsMS4xMzc3NzEgLTQuMTE5ODYxLDAgLTEuMTM3NzcyMiwtMS4xMzc3NjggLTEuMTM3NzcyMiwtMi45ODIwODggMCwtNC4xMTk4NjEgTCAyMS45NDg3NjYsMjUuOTA3MzcyIDExLjEzMTkzOCwxNS4wOTA1NTEgYyAtMS4xMzc3NjQ3LC0xLjEzNzc3MSAtMS4xMzc3NjQ3LC0yLjk4MzU1MyAwLC00LjExOTg2MSAxLjEzNzc3NCwtMS4xMzc3NzIxIDIuOTgyMDk4LC0xLjEzNzc3MjEgNC4xMTk4NjUsMCBMIDI2LjA2ODYyOCwyMS43ODc1MTIgMzYuMzY5NzM5LDExLjQ4NjM5OSBjIDEuMTM3NzY4LC0xLjEzNzc2OCAyLjk4MjA5MywtMS4xMzc3NjggNC4xMTk4NjIsMCAxLjEzNzc2NywxLjEzNzc2OSAxLjEzNzc2NywyLjk4MjA5NCAwLDQuMTE5ODYyIEwgMzAuMTg4NDg5LDI1LjkwNzM3MiA0MS4wMDUzMSwzNi43MjQxOTcgYyAxLjEzNzc3MSwxLjEzNzc2NyAxLjEzNzc3MSwyLjk4MjA5MSAwLDQuMTE5ODY1IHoiIC8+Cjwvc3ZnPgo=" alt="close">
            </div>
        </div>
    `);
    render($header);

    effect(onClick($header, `[alt="close"]`).pipe(rxjs.tap(toggle)));
}

function componentBody(render, { load$ }) {
    const $page = createElement(`
        <div class="content">
            <div class="content_box">
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NDggNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjIiIGQ9Ik0gNDAwLDY0IEggMzUyIFYgMTIgQyAzNTIsNS40IDM0Ni42LDAgMzQwLDAgaCAtNDAgYyAtNi42LDAgLTEyLDUuNCAtMTIsMTIgViA2NCBIIDE2MCBWIDEyIEMgMTYwLDUuNCAxNTQuNiwwIDE0OCwwIEggMTA4IEMgMTAxLjQsMCA5Niw1LjQgOTYsMTIgViA2NCBIIDQ4IEMgMjEuNSw2NCAwLDg1LjUgMCwxMTIgdiAzNTIgYyAwLDI2LjUgMjEuNSw0OCA0OCw0OCBoIDM1MiBjIDI2LjUsMCA0OCwtMjEuNSA0OCwtNDggViAxMTIgQyA0NDgsODUuNSA0MjYuNSw2NCA0MDAsNjQgWiBtIC0yLDQwNCBIIDUwIGMgLTMuMywwIC02LjAyMjE0NywtMi43MDAwNyAtNiwtNiBWIDE1NCBoIDM2MCB2IDMwOCBjIDAsMy4zIC0yLjcsNiAtNiw2IHoiIC8+Cjwvc3ZnPgo=" alt="schedule">
                <div class="headline" data-bind="date">-</div>
                <div class="description" data-bind="time">-</div>
            </div>
            <div class="content_box">
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjIiIGQ9Ik01MTIgMTQ0djI4OGMwIDI2LjUtMjEuNSA0OC00OCA0OEg0OGMtMjYuNSAwLTQ4LTIxLjUtNDgtNDhWMTQ0YzAtMjYuNSAyMS41LTQ4IDQ4LTQ4aDg4bDEyLjMtMzIuOWM3LTE4LjcgMjQuOS0zMS4xIDQ0LjktMzEuMWgxMjUuNWMyMCAwIDM3LjkgMTIuNCA0NC45IDMxLjFMMzc2IDk2aDg4YzI2LjUgMCA0OCAyMS41IDQ4IDQ4ek0zNzYgMjg4YzAtNjYuMi01My44LTEyMC0xMjAtMTIwcy0xMjAgNTMuOC0xMjAgMTIwIDUzLjggMTIwIDEyMCAxMjAgMTIwLTUzLjggMTIwLTEyMHptLTMyIDBjMCA0OC41LTM5LjUgODgtODggODhzLTg4LTM5LjUtODgtODggMzkuNS04OCA4OC04OCA4OCAzOS41IDg4IDg4eiIgLz4KPC9zdmc+Cg==" alt="camera">
                <div class="headline" data-bind="camera-setting">-</div>
                <div class="description" data-bind="camera-name">-</div>
            </div>
            <div data-bind="map"></div>
            <div data-bind="all">
                <component-icon name="loading"></component-icon>
            </div>
        </div>
    `);
    render($page);

    effect(load$.pipe(rxjs.tap(async ($img) => {
        if (!$img) return;
        const metadata = await extractExif($img);
        qs($page, `[data-bind="date"]`).innerText = formatDate(metadata.date) || "-";
        qs($page, `[data-bind="time"]`).innerText = formatTime(metadata.date) || "-";
        qs($page, `[data-bind="camera-setting"]`).innerText = formatCameraSettings(metadata) || "-";
        qs($page, `[data-bind="camera-name"]`).innerText = formatCameraName(metadata) || "-";

        if (metadata.location) await componentMap(createRender(qs($page, `[data-bind="map"]`)), { metadata });
        componentMore(createRender(qs($page, `[data-bind="all"]`)), { metadata });
    })));
}

async function componentMap(render, { metadata }) {
    const DMSToDD = (d) => {
        if (!d || d.length !== 4) return null;
        const [degrees, minutes, seconds, direction] = d;
        const dd = degrees + minutes/60 + seconds/(60*60);
        return direction == "S" || direction == "W" ? -dd : dd;
    };
    const lat = DMSToDD(metadata.location[0]);
    const lng = DMSToDD(metadata.location[1]);
    const $page = createElement(`
        <div class="component_mapshot error">
            <div class="wrapper">
                <div class="mapshot_placeholder error hidden">
                    <span><div>Erreur</div></span>
                </div>
                <div class="mapshot_placeholder loading hidden">
                    <div class="loader">
                        <div class="component_loader">
                            <svg width="120px" height="120px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><rect x="0" y="0" width="100" height="100" fill="none"></rect><circle cx="50" cy="50" r="40" stroke="rgba(100%,100%,100%,0.679)" fill="none" stroke-width="10" stroke-linecap="round"></circle><circle cx="50" cy="50" r="40" stroke="#6f6f6f" fill="none" stroke-width="6" stroke-linecap="round"><animate attributeName="stroke-dashoffset" dur="2s" repeatCount="indefinite" from="0" to="502"></animate><animate attributeName="stroke-dasharray" dur="2s" repeatCount="indefinite" values="150.6 100.4;1 250;150.6 100.4"></animate></circle></svg>
                        </div>
                    </div>
                </div>
                <a href="https://www.google.com/maps/search/?api=1&amp;query=${lat},${lng}">
                    <div class="marker"><img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPHBhdGggc3R5bGU9ImZpbGw6IzMxMzUzODtmaWxsLW9wYWNpdHk6MSIgZD0iTTgsMEM0LjY4NywwLDIsMi42ODcsMiw2YzAsMy44NTQsNC4zMjEsOC42NjMsNSw5LjM5OEM3LjI4MSwxNS43MDMsNy41MTYsMTYsOCwxNnMwLjcxOS0wLjI5NywxLTAuNjAyICBDOS42NzksMTQuNjYzLDE0LDkuODU0LDE0LDZDMTQsMi42ODcsMTEuMzEzLDAsOCwweiBNOCwxMGMtMi4yMDksMC00LTEuNzkxLTQtNHMxLjc5MS00LDQtNHM0LDEuNzkxLDQsNFMxMC4yMDksMTAsOCwxMHogTTgsNCAgQzYuODk2LDQsNiw0Ljg5Niw2LDZzMC44OTYsMiwyLDJzMi0wLjg5NiwyLTJTOS4xMDQsNCw4LDR6IiAvPgo8L3N2Zz4K" alt="location"></div>
                    <div data-bind="maptile"></div>
                </a>
            </div>
        </div>
    `);
    render($page);

    await new Promise((resolve) => setTimeout(resolve, 500));
    const TILE_SERVER = "https://tile.openstreetmap.org/${z}/${x}/${y}.png";
    const TILE_SIZE = parseInt($page.clientWidth / 3 * 100) / 100;
    $page.style.height = "${TILE_SIZE*3}px;";
    const mapper = function map_url(lat, lng, zoom) {
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenamse
        const n = Math.pow(2, zoom);
        const tile_numbers = [
            (lng+180)/360*n,
            (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2*n,
            zoom,
        ];
        return {
            tile: function(tile_server, x = 0, y = 0) {
                return tile_server
                    .replace("${x}", Math.floor(tile_numbers[0])+x)
                    .replace("${y}", Math.floor(tile_numbers[1])+y)
                    .replace("${z}", Math.floor(zoom));
            },
            position: function() {
                return [
                    tile_numbers[0] - Math.floor(tile_numbers[0]),
                    tile_numbers[1] - Math.floor(tile_numbers[1]),
                ];
            },
        };
    }(lat, lng, 11);
    const center = (position, i) => parseInt(TILE_SIZE * (1 + position[i]) * 1000)/1000;
    const $tiles = createElement(`
        <div class="bigpicture">
            <div class="line">
                <img src="${mapper.tile(TILE_SERVER, -1, -1)}" class="btl" style="height: ${TILE_SIZE}px;">
                <img src="${mapper.tile(TILE_SERVER, 0, -1)}" style="height: ${TILE_SIZE}px;">
                <img src="${mapper.tile(TILE_SERVER, 1, -1)}" class="btr" style="height: ${TILE_SIZE}px;">
            </div>
            <div class="line">
                <img src="${mapper.tile(TILE_SERVER, -1, 0)}" style="height: ${TILE_SIZE}px;">
                <img src="${mapper.tile(TILE_SERVER, 0, 0)}" style="height: ${TILE_SIZE}px;">
                <img src="${mapper.tile(TILE_SERVER, 1, 0)}" style="height: ${TILE_SIZE}px;">
            </div>
            <div class="line">
                <img src="${mapper.tile(TILE_SERVER, -1, 1)}" class="bbl" style="height: ${TILE_SIZE}px;">
                <img src="${mapper.tile(TILE_SERVER, 0, 1)}" style="height: ${TILE_SIZE}px;">
                <img src="${mapper.tile(TILE_SERVER, 1, 1)}" class="bbr" style="height: ${TILE_SIZE}px;">
            </div>
        </div>
    `);
    qs($page, `[data-bind="maptile"]`).appendChild($tiles);
    qs($page, ".marker").setAttribute("style", `
        left: ${TILE_SIZE * (1 + mapper.position()[0]) - 15}px;
        top: ${TILE_SIZE * (1 + mapper.position()[1]) - 30}px;
    `);
    $tiles.setAttribute("style", `transform-origin: ${center(mapper.position(), 0)}px ${center(mapper.position(), 1)}px;`);
}

function componentMore(render, { metadata }) {
    const $page = createElement(`
        <div class="more">
            <div class="more_container"></div>
        </div>
    `);
    render($page);

    const $all = document.createDocumentFragment();
    const formatKey = (str) => str.replace(/([A-Z][a-z])/g, " $1");
    const formatValue = (str) => {
        if (!metadata.all || metadata.all[str] === undefined) return "-";
        if (typeof metadata.all[str] === "number") {
            return parseInt(metadata.all[str]*100)/100;
        } else if (metadata.all[str].denominator !== undefined &&
                   metadata.all[str].numerator !== undefined) {
            if (metadata.all[str].denominator === 1) {
                return metadata.all[str].numerator;
            } else if (metadata.all[str].numerator > metadata.all[str].denominator) {
                return parseInt(
                    metadata.all[str].numerator * 10 / metadata.all[str].denominator,
                ) / 10;
            } else {
                return metadata.all[str].numerator+"/"+metadata.all[str].denominator;
            }
        } else if (typeof metadata.all[str] === "string") {
            return metadata.all[str];
        } else if (Array.isArray(metadata.all[str])) {
            let arr = metadata.all[str];
            if (arr.length > 15) {
                arr = arr.slice(0, 3);
                arr.push("...");
            }
            return arr.toString().split(",").join(", ");
        } else {
            return JSON.stringify(metadata.all[str], null, 2);
        }
    };
    Object.keys(metadata.all || {}).sort((a, b) => {
        if (a.toLowerCase().trim() < b.toLowerCase().trim()) return -1;
        else if (a.toLowerCase().trim() > b.toLowerCase().trim()) return +1;
        return 0;
    }).map((key) => {
        switch(key) {
        case "undefined":
        case "thumbnail":
            break;
        default: $all.appendChild(createElement(`
            <div class="meta_key">
                <div class="title">${formatKey(key)}: </div>
                <div class="value">${formatValue(key)}</div>
            </div>
        `));
        }
    });
    qs($page, ".more_container").appendChild($all);
}

export function init() {
    return Promise.all([
        loadJS(import.meta.url, "../../lib/vendor/exif-js.js"),
        loadCSS(import.meta.url, "./application_image_metadata.css"),
    ]);
}

const extractExif = ($img) => new Promise((resolve) => EXIF.getData($img, function(data) {
    const metadata = EXIF.getAllTags(this);
    const to_date = (str) => {
        if (!str) return null;
        return new Date(...str.split(/[ :]/));
    };
    resolve({
        date: to_date(
            metadata["DateTime"] || metadata["DateTimeDigitized"] ||
                metadata["DateTimeOriginal"] || metadata["GPSDateStamp"],
        ),
        location: metadata["GPSLatitude"] && metadata["GPSLongitude"] && [
            [
                metadata["GPSLatitude"][0], metadata["GPSLatitude"][1],
                metadata["GPSLatitude"][2], metadata["GPSLatitudeRef"],
            ],
            [
                metadata["GPSLongitude"][0], metadata["GPSLongitude"][1],
                metadata["GPSLongitude"][2], metadata["GPSLongitudeRef"],
            ],
        ] || null,
        maker: metadata["Make"] || null,
        model: metadata["Model"] || null,
        focal: metadata["FocalLength"] || null,
        aperture: metadata["FNumber"] || null,
        shutter: metadata["ExposureTime"] || null,
        iso: metadata["ISOSpeedRatings"] || null,
        dimension: metadata["PixelXDimension"] && metadata["PixelYDimension"] && [
            metadata["PixelXDimension"],
            metadata["PixelYDimension"],
        ] || null,
        all: Object.keys(metadata).length === 0 ? null : metadata,
    });
}));

const formatTime = (t) => t && t.toLocaleTimeString(
    "en-us",
    { weekday: "short", hour: "2-digit", minute: "2-digit" },
);

const formatDate = (t) => t && t.toLocaleDateString(
    navigator.language,
    { day: "numeric", year: "numeric", month: "short", day: "numeric" },
);

const formatCameraSettings = (metadata) => {
    let str = format("model", metadata);
    const f = format("focal", metadata)
    if (!f) return str;
    return `${str} (${f})`;
};

const formatCameraName = (metadata) => {
    return [
        format("shutter", metadata),
        format("aperture", metadata),
        format("iso", metadata),
    ].join(" ").trim() || "-";
};

const format = (key, metadata) => {
    if (!metadata[key]) return "";
    switch(key) {
    case "focal":
        return `${metadata.focal}mm`;
    case "iso":
        return `ISO${metadata.iso}`;
    case "aperture":
        return "ƒ"+parseInt(metadata.aperture*10)/10;
    case "shutter":
        if (metadata.shutter > 60) return metadata.shutter+"m";
        else if (metadata.shutter > 1) return metadata.shutter+"s";
        return "1/"+parseInt(metadata.shutter.denominator / metadata.shutter.numerator)+"s";
    case "dimension":
        if (metadata.dimension.length !== 2 || !metadata.dimension[0] || !metadata.dimension[1]) return "-";
        return metadata.dimension[0]+"x"+metadata.dimension[1];
    default:
        return metadata[key];
    }
};
