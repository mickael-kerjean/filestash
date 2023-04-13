import React, { useReducer, useEffect } from "react";
import { useHistory } from "react-router-dom";
import Path from "path";

import "./viewerpage.scss";
import "./error.scss";
import { Files } from "../model/";
import {
    BreadCrumb, Bundle, NgIf, Loader, EventReceiver, LoggedInOnly, ErrorPage,
} from "../components/";
import { opener, notify, objectGet } from "../helpers/";
import { FileDownloader, ImageViewer, PDFViewer, FormViewer } from "./viewerpage/";

const VideoPlayer = (props) => (
    <Bundle
        loader={import(/* webpackChunkName: "video" */"./viewerpage/videoplayer")}
        symbol="VideoPlayer" overrides={["/overrides/video-transcoder.js"]}>
        {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const IDE = (props) => (
    <Bundle
        loader={import(/* webpackChunkName: "ide" */"./viewerpage/ide")}
        symbol="IDE">
        {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const AudioPlayer = (props) => (
    <Bundle
        loader={import(/* webpackChunkName: "audioplayer" */"./viewerpage/audioplayer")}
        symbol="AudioPlayer">
        {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const Appframe = (props) => (
    <Bundle
        loader={import(/* webpackChunkName: "appframe" */"./viewerpage/appframe")}
        symbol="AppFrame">
        {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const EbookViewer = (props) => (
    <Bundle
        loader={import(/* webpackChunkName: "ebookviewer" */"./viewerpage/ebookviewer")}
        symbol="EbookViewer">
        {(Comp) => <Comp {...props}/>}
    </Bundle>
)


export function ViewerPageComponent({ error, subscribe, unsubscribe, match, location }) {
    const history = useHistory();
    const currentUrl = history.location.pathname;

    const [state, setState] = useReducer((s, a) => {
        return { ...s, ...a };
    }, {
        url: null,
        opener: null,
        content: null,
        needSaving: false,
        isSaving: false,
        loading: false,
        application_arguments: null,
    });
    const path = currentUrl.replace("/view", "").replace(/%23/g, "#") + (location.hash || "");
    const filename = Path.basename(currentUrl.replace("/view", "")) || "untitled.dat";

    const save = (file) => {
        setState({ isSaving: true, needSaving: false });
        return (new Promise((done, err) => {
            const reader = new FileReader();
            reader.onload = () => done(reader.result);
            reader.readAsText(file);
        })).then((content) => {
            let oldContent = state.content;
            setState({ content: content });
            return Files.save(path, file)
                .then(() => setState({ isSaving: false }))
                .catch((err) => {
                    if (err && err.code === "CANCELLED") return;
                    setState({ isSaving: false, needSaving: true, content: oldContent });
                    notify.send(err, "error");
                });
        });
    }

    const needSaving = (bool) => {
        setState({ needSaving: bool });
        return Promise.resolve();
    };

    useEffect(() => {
        const metadata = () => {
            const [app_opener, app_args] = opener(path);
            setState({ loading: true, needSaving: false, url: null, opener: null, application_arguments: null });
            return Files.url(path).then((url) => {
                setState({
                    url: url,
                    opener: app_opener,
                    application_arguments: app_args,
                });
                return app_opener;
            }).catch((_err) => error(_err));
        };

        const data_fetch = (app) => {
            if (app !== "editor" && app !== "form") {
                setState({ loading: false });
                return null;
            }
            return Promise.all([
                Files.cat(path),
                Files.options(path),
            ]).then((d) => {
                const [content, options] = d;
                setState({
                    content: content,
                    loading: false,
                    acl: options["allow"],
                });
            }).catch((err) => {
                if (err.code !== "BINARY_FILE") {
                    error(err);
                    return;
                }
                setState({
                    loading: false,
                    opener: "download",
                });
            });
        };

        metadata().then(data_fetch);
        return history.listen(() => {})
    }, [path]);

    useEffect(() => {
        return () => {
            if (!objectGet(window.chrome, ["cast", "isAvailable"])) {
                return
            }
            cast.framework.CastContext.getInstance().endCurrentSession();
        };
    }, [])

    return (
        <div className="component_page_viewerpage">
            <BreadCrumb needSaving={state.needSaving} className="breadcrumb" path={path} />
            <div className="page_container">
                <NgIf cond={state.loading === true}>
                    <Loader/>
                </NgIf>
                <NgIf cond={state.loading === false}>
                    <NgIf cond={state.opener === "editor"}>
                        <IDE
                            needSavingUpdate={needSaving}
                            needSaving={state.needSaving}
                            isSaving={state.isSaving}
                            onSave={save}
                            content={state.content || ""}
                            url={state.url}
                            path={path}
                            acl={state.acl}
                            filename={filename} />
                    </NgIf>
                    <NgIf cond={state.opener === "image"}>
                        <ImageViewer
                            data={state.url}
                            filename={filename}
                            path={path} />
                    </NgIf>
                    <NgIf cond={state.opener === "pdf"}>
                        <PDFViewer
                            data={state.url}
                            filename={filename} />
                    </NgIf>
                    <NgIf cond={state.opener === "video"}>
                        <VideoPlayer
                            data={state.url}
                            filename={filename}
                            path={path} />
                    </NgIf>
                    <NgIf cond={state.opener === "form"}>
                        <FormViewer
                            needSavingUpdate={needSaving}
                            needSaving={state.needSaving}
                            isSaving={state.isSaving}
                            onSave={save}
                            content={state.content || ""}
                            data={state.url}
                            filename={filename} />
                    </NgIf>
                    <NgIf cond={state.opener === "audio"}>
                        <AudioPlayer data={state.url} filename={filename} />
                    </NgIf>
                    <NgIf cond={state.opener === "download"}>
                        <FileDownloader data={state.url} filename={filename} />
                    </NgIf>
                    <NgIf cond={state.opener === "appframe"}>
                        <Appframe data={path} filename={filename} args={state.application_arguments} />
                    </NgIf>
                    <NgIf cond={state.opener === "ebook"}>
                        <EbookViewer filename={filename} data={state.url} />
                    </NgIf>
                </NgIf>
            </div>
        </div>
    );
}

export const ViewerPage = ErrorPage(LoggedInOnly(EventReceiver(ViewerPageComponent)));
