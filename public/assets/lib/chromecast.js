import rxjs from "../../lib/rx.js";
import { toHref } from "./skeleton/router.js";
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

    $dom() {
        return document.createElement("google-cast-launcher");
    }

    ready(currentMedia) {
        const context = this.context();
        if (!context) return rxjs.EMPTY;
        return rxjs.merge(
            rxjs.fromEvent(context, window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED).pipe(
                rxjs.filter(({ sessionState }) => [window.cast.framework.SessionState.SESSION_STARTED, window.cast.framework.SessionState.SESSION_RESUMED].includes(sessionState)),
            ),
            currentMedia ? new rxjs.Observable((subscriber) => {
                const session = this.session();
                if (!session) return;
                const media = session.getMediaSession();
                if (media && media.media && media.media.mediaCategory === currentMedia) subscriber.next();
            }) : rxjs.EMPTY,
        );
    }
}

export default new ChromecastManager();
