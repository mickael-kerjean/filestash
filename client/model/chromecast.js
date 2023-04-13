"use strict";

import { Session } from "./session";
import { currentShare, objectGet } from "../helpers/";

class ChromecastManager {
    init() {
        return new Promise((done) => {
            const script = document.createElement("script");
            script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
            script.onerror = () => done()
            window["__onGCastApiAvailable"] = function(isAvailable) {
                if (isAvailable) cast.framework.CastContext.getInstance().setOptions({
                    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
                });
                done();
            };
            document.head.appendChild(script)
        });
    }

    origin() {
        return location.origin;
    };

    createLink(apiPath) {
        const shareID = currentShare();
        if (shareID) {
            const target = new URL(this.origin() + apiPath);
            target.searchParams.append("share", shareID);
            return target.toString();
        }
        const target = new URL(this.origin() + apiPath)
        return target.toString();
    }

    createRequest(mediaInfo) {
        let prior = Promise.resolve();
        if (!Session.authorization) prior = Session.currentUser();
        return prior.then(() => {
            if (!Session.authorization) throw new Error("Invalid account");
            // TODO: it would be much much nicer to set the authorization from an HTTP header
            // but this would require to create a custom web receiver app, setup accounts on
            // google, etc,... Until that happens, we're setting the authorization within the
            // url. Once we have that app, the authorisation will come from a customData field
            // of a chrome.cast.media.LoadRequest
            const target = new URL(mediaInfo.contentId);
            target.searchParams.append("authorization", Session.authorization);
            mediaInfo.contentId = target.toString();
            return new chrome.cast.media.LoadRequest(mediaInfo);
        });
    }

    context() {
        if (!objectGet(window.chrome, ["cast", "isAvailable"])) {
            return;
        }
        return cast.framework.CastContext.getInstance();
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

export const Chromecast = new ChromecastManager();
