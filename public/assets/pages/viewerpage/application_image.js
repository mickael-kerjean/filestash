import { createElement, createRender, onDestroy } from "../../lib/skeleton/index.js";
import { toHref } from "../../lib/skeleton/router.js";
import rxjs, { effect, onLoad, onClick } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { animate } from "../../lib/animate.js";
import { extname } from "../../lib/path.js";
import { qs, safe } from "../../lib/dom.js";
import { get as getConfig } from "../../model/config.js";
import { load as loadPlugin } from "../../model/plugin.js";
import { Chromecast } from "../../model/chromecast.js";
import { loadCSS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";
import notification from "../../components/notification.js";
import t from "../../locales/index.js";
import ctrlError from "../ctrl_error.js";

import componentInformation, { init as initInformation } from "./application_image/information.js";
import componentPagination, { init as initPagination } from "./application_image/pagination.js";
import componentZoom from "./application_image/zoom.js";
import ctrlDownloader, { init as initDownloader } from "./application_downloader.js";

import { renderMenubar, buttonDownload, buttonFullscreen } from "./component_menubar.js";

class IImage {
    getSRC() { throw new Error("NOT_IMPLEMENTED"); }
}

export default function(render, { getFilename, getDownloadUrl, mime, hasMenubar = true, acl$ }) {
    const $page = createElement(`
        <div class="component_imageviewer">
            <component-menubar filename="${safe(getFilename())}" class="${!hasMenubar && "hidden"}"></component-menubar>
            <div class="component_image_container">
                <div class="images_wrapper no-select">
                    <img class="photo idle hidden" draggable="false" />
                    <div data-bind="component_navigation"></div>
                </div>
                <div class="images_aside scroll-y"></div>
            </div>
        </div>
    `);
    render($page);

    const $imgContainer = qs($page, ".images_wrapper");
    const $photo = qs($page, "img.photo");
    const $menubar = qs($page, "component-menubar");
    const removeLoader = createLoader($imgContainer);
    const load$ = new rxjs.BehaviorSubject(null);
    const toggleInfo = ($button) => {
        const $aside = qs($page, ".images_aside");
        $aside.classList.toggle("open");
        $button.setAttribute("aria-expanded", $aside.classList.contains("open") ? "true" : "false");
        componentInformation(createRender(qs($page, ".images_aside")), { toggle: toggleInfo, load$ });
    };

    renderMenubar(
        $menubar,
        buttonDownload(getFilename(), getDownloadUrl()),
        buttonFullscreen(qs($page, ".component_image_container")),
        buttonInfo({ toggle: toggleInfo }),
        buttonChromecast(getFilename(), getDownloadUrl()),
    );

    effect(rxjs.from(loadPlugin(mime)).pipe(
        rxjs.mergeMap(async(loader) => {
            let src = `${getDownloadUrl()}&size=${window.innerWidth}`;
            if (loader) {
                const { response } = await ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).toPromise();
                const img = new (await loader(IImage, { mime, $menubar, getFilename, getDownloadUrl }))({ $photo });
                src = await img.getSRC(response);
            }
            $photo.setAttribute("src", src);
            await onLoad($photo).toPromise();
        }),
        rxjs.tap(() => load$.next($photo)),
        removeLoader,
        rxjs.tap(() => {
            const cancel = animate($photo, {
                onEnter: () => $photo.classList.remove("hidden"),
                onExit: async() => (await cancel)(),
                time: 300,
                easing: "cubic-bezier(.51,.92,.24,1.15)",
                keyframes: [
                    { opacity: 0, transform: "scale(.97)" },
                    { opacity: 1 },
                    { opacity: 1, transform: "scale(1)" },
                ],
            });
        }),
        rxjs.catchError((err) => {
            if (err.target instanceof HTMLElement && err.type === "error") {
                return rxjs.of(initDownloader()).pipe(
                    removeLoader,
                    rxjs.mergeMap(() => {
                        load$.error(err);
                        ctrlDownloader(createRender(qs($page, ".images_wrapper")), { acl$, getFilename, getDownloadUrl, hasMenubar: false });
                        return rxjs.EMPTY;
                    }),
                );
            }
            return ctrlError()(err);
        }),
    ));

    effect(load$.pipe(
        rxjs.first(),
        rxjs.tap(() => {
            componentZoom({ $img: $photo, $page, $menubar, load$ });
            componentPagination(createRender(qs($page, "[data-bind=\"component_navigation\"]")), { $img: $photo });
        }),
    ));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_image.css"),
        loadCSS(import.meta.url, "./component_menubar.css"),
        initPagination(), initInformation(),
    ]);
}

function buttonInfo({ toggle }) {
    const $el = createElement(`
        <button aria-controls="pane-info" aria-expanded="false">
            <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg4MiwwLDAsMC44ODIsNS45LDUuOSkiPgogICAgPHBhdGggc3R5bGU9ImZpbGw6I2YyZjJmMjtmaWxsLW9wYWNpdHk6MSIgZD0ibSA2Mi4xNjIsMCBjIDYuNjk2LDAgMTAuMDQzLDQuNTY3IDEwLjA0Myw5Ljc4OSAwLDYuNTIyIC01LjgxNCwxMi41NTUgLTEzLjM5MSwxMi41NTUgLTYuMzQ0LDAgLTEwLjA0NSwtMy43NTIgLTkuODY5LC05Ljk0NyBDIDQ4Ljk0NSw3LjE3NiA1My4zNSwwIDYyLjE2MiwwIFogTSA0MS41NDMsMTAwIGMgLTUuMjg3LDAgLTkuMTY0LC0zLjI2MiAtNS40NjMsLTE3LjYxNSBsIDYuMDcsLTI1LjQ1NyBjIDEuMDU3LC00LjA3NyAxLjIzLC01LjcwNyAwLC01LjcwNyAtMS41ODgsMCAtOC40NTEsMi44MTYgLTEyLjUxLDUuNTkgTCAyNyw1Mi40MDYgQyAzOS44NjMsNDEuNDggNTQuNjYyLDM1LjA3MiA2MS4wMDQsMzUuMDcyIGMgNS4yODUsMCA2LjE2OCw2LjM2MSAzLjUyNSwxNi4xNDggTCA1Ny41OCw3Ny45OCBjIC0xLjIzNCw0LjcyOSAtMC43MDMsNi4zNTkgMC41MjcsNi4zNTkgMS41ODYsMCA2Ljc4NywtMS45NjMgMTEuODk2LC02LjA0MSBMIDczLDgyLjM3NyBDIDYwLjQ4OCw5NS4xIDQ2LjgzLDEwMCA0MS41NDMsMTAwIFoiIC8+CiAgPC9nPgo8L3N2Zz4K" alt="info">
        </button>
    `);
    effect(rxjs.merge(
        onClick($el),
        rxjs.fromEvent(window, "keydown").pipe(rxjs.filter((e) => e.key === "i")),
    ).pipe(rxjs.mapTo($el), rxjs.tap(toggle)));
    return $el;
}

function buttonChromecast(filename, downloadURL) {
    const context = Chromecast.context();
    if (!context) return;

    const chromecastSetup = (event) => {
        switch (event.sessionState) {
        case window.cast.framework.SessionState.SESSION_STARTED:
            chromecastLoader();
            break;
        }
    };
    const chromecastLoader = () => {
        const session = Chromecast.session();
        if (!session) return;

        const link = Chromecast.createLink("/" + toHref(downloadURL));
        const media = new window.chrome.cast.media.MediaInfo(
            link,
            getConfig("mime", {})[extname(filename)],
        );
        media.metadata = new window.chrome.cast.media.PhotoMediaMetadata();
        media.metadata.title = filename;
        media.metadata.images = [
            new window.chrome.cast.Image(location.origin + "/" + toHref("/assets/icons/photo.png")),
        ];
        try {
            const req = Chromecast.createRequest(media);
            session.loadMedia(req);
        } catch (err) {
            console.error(err);
            notification.error(t("Cannot establish a connection"));
        }
    };

    context.addEventListener(
        window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        chromecastSetup,
    );
    onDestroy(() => context.removeEventListener(
        window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        chromecastSetup,
    ));

    const media = Chromecast.media();
    if (media && media.media && media.media.mediaCategory === "IMAGE") chromecastLoader();

    return document.createElement("google-cast-launcher");
}
