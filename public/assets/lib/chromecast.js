class ChromecastManager {
    init() {
        // TODO: additional rules for setup
        const src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
        if (document.head.querySelector(`script[src="${src}"]`)) return Promise.resolve();

        return new Promise((done) => {
            const script = document.createElement("script");
            script.src = src;
            script.onerror = () => done();
            window["__onGCastApiAvailable"] = function(isAvailable) {
                if (isAvailable) window.cast.framework.CastContext.getInstance().setOptions({
                    receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
                });
                done();
            };
            document.head.appendChild(script);
        });
    }

    origin() {
        return location.origin;
    };

    isAvailable() {
        if (!window.chrome) return false;
        else if (!window.chrome.cast) return false;
        return window.chrome.cast.isAvailable;
    }

    // createLink(apiPath) {
    //     const target = new URL(this.origin() + apiPath);
    //     const shareID = new window.URL(location.href).searchParams.get("share");
    //     if (shareID) target.searchParams.append("share", shareID);
    //     return target.toString();
    // }

    createRequest(mediaInfo, authorization) {
        if (!authorization) Promise.reject(new Error("Invalid account"));

        // TODO: it would be much much nicer to set the authorization in an HTTP header
        // but this would require to create a custom web receiver app, setup accounts on
        // google, etc,... Until that happens, we're setting the authorization within the
        // url. Once we have that app, the authorisation will come from a customData field
        // of a chrome.cast.media.LoadRequest
        const target = new URL(mediaInfo.contentId);
        target.searchParams.append("authorization", window.Session.authorization);
        mediaInfo.contentId = target.toString();
        return new window.chrome.cast.media.LoadRequest(mediaInfo);
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

    media() {
        const session = this.session();
        if (!session) return;
        return session.getMediaSession();
    }
}

export default new ChromecastManager();
