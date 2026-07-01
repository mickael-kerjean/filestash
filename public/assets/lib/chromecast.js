import { toHref } from "./skeleton/router.js";
import rxjs from "./rx.js";
import { get as getConfig } from "../model/config.js";

class ChromecastManager {
    init() {
        if (navigator.onLine === false) return Promise.resolve();
        if (!getConfig("enable_chromecast", false)) {
            return Promise.resolve();
        } else if (!("chrome" in window)) {
            return Promise.resolve();
        } else if (["localhost", "127.0.0.1"].includes(location.hostname)) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            if (document.head.querySelector("script#chromecast")) return resolve(null);
            const $script = document.createElement("script");
            $script.id = "chromecast";
            $script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
            $script.onerror = () => resolve(null);
            window["__onGCastApiAvailable"] = function(isAvailable) {
                if (isAvailable) window.cast.framework.CastContext.getInstance().setOptions({
                    receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
                });
                resolve(null);
            };
            document.head.appendChild($script);
        });
    }

    $dom() {
        return document.createElement("google-cast-launcher");
    }

    isAvailable() {
        if (!window.chrome) return false;
        else if (!window.chrome.cast) return false;
        return !!window.chrome.cast.isAvailable;
    }

    createLink(apiPath, token) {
        const target = new URL(location.origin + "/" + toHref(apiPath));
        if (token) target.searchParams.append("authorization", token);
        if (target.searchParams.has("name")) target.searchParams.delete("name");
        return target.toString();
    }

    context() {
        if (!this.isAvailable()) return;
        return window.cast.framework.CastContext.getInstance();
    }

    session() {
        const context = this.context();
        if (!context) return;
        return context.getCurrentSession();
    }

    ready$() {
        const context = this.context();
        if (!context) return rxjs.EMPTY;
        return rxjs.merge(
            rxjs.fromEvent(context, window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED).pipe(
                rxjs.filter(({ sessionState }) => [window.cast.framework.SessionState.SESSION_STARTED].includes(sessionState)),
                rxjs.mapTo({ mediaCategory: null }),
            ),
            new rxjs.Observable((observer) => {
                const session = this.session();
                if (!session) return;
                const media = session.getMediaSession();
                if (media && media.media && media.media.mediaCategory) observer.next({ mediaCategory: media.media.mediaCategory });
            }),
        );
    }

    load$(media) {
        const session = this.session();
        if (!session) return rxjs.EMPTY;
        return rxjs.of(new window.chrome.cast.media.LoadRequest(media)).pipe(
            rxjs.mergeMap((lr) => session.loadMedia(lr)),
            rxjs.mergeMap(() => rxjs.merge(
                rxjs.fromEvent(session, window.cast.framework.SessionEventType.MEDIA_SESSION),
                new rxjs.Observable((observer) => {
                    const media = session.getMediaSession();
                    if (media) observer.next();
                    observer.complete();
                }),
            )),
        );
    }

    events$() {
        const session = this.session();
        if (!session) return rxjs.EMPTY;

        const media = session.getMediaSession();
        if (!media) return rxjs.EMPTY;
        return rxjs.merge(
            new rxjs.Observable((observer) => {
                const listener = () => observer.next(media);
                media.addUpdateListener(listener);
                return () => media.removeUpdateListener(listener);
            }),
            rxjs.fromEvent(this.context(), window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED).pipe(
                rxjs.filter(({ sessionState }) => sessionState === window.cast.framework.SessionState.SESSION_ENDING),
                rxjs.first(),
                rxjs.mapTo(media),
            ),
        );
    }
}

export default new ChromecastManager();
