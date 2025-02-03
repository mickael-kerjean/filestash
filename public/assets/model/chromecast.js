export async function init(config) {
    if (!config["enable_chromecast"]) {
        return Promise.resolve();
    } else if (!("chrome" in window)) {
        return Promise.resolve();
    } else if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        return Promise.resolve();
    }
    return Chromecast.init();
}

export const Chromecast = new class ChromecastManager {
    init() {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
            script.onerror = () => resolve(null);
            window["__onGCastApiAvailable"] = function(isAvailable) {
                if (isAvailable) window.cast.framework.CastContext.getInstance().setOptions({
                    receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
                });
                resolve(null);
            };
            document.head.appendChild(script);
        });
    }

    createLink(apiPath) {
        const target = new URL(location.origin + apiPath);
        const shareID = new URLSearchParams(location.search).get("search");
        if (shareID) target.searchParams.append("share", shareID);
        return target.toString();
    }

    createRequest(mediaInfo) {
        if (!window.BEARER_TOKEN) throw new Error("Invalid account");
        // TODO: it would be much much nicer to set the authorization from an HTTP header
        // but this would require to create a custom web receiver app, setup accounts on
        // google, etc,... Until that happens, we're setting the authorization within the
        // url. Once we have that app, the authorisation will come from a customData field
        // of a chrome.cast.media.LoadRequest
        const target = new URL(mediaInfo.contentId);
        target.searchParams.append("authorization", window.BEARER_TOKEN);
        mediaInfo.contentId = target.toString();
        return new window.chrome.cast.media.LoadRequest(mediaInfo);
    }

    context() {
        if (!window.chrome?.cast?.isAvailable) return;
        return window.cast.framework.CastContext.getInstance();
    }

    session() {
        const context = this.context();
        if (!context) return;
        return context.getCurrentSession();
    }

    media() {
        const session = this.session();
        if (!session) return;
        return session.getMediaSession();
    }
}();
