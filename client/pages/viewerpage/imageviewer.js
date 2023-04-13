import React, { useEffect, useReducer, useRef } from "react";
import filepath from "path";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import { MenuBar } from "./menubar";
import { Bundle, Icon, NgIf, Loader, EventEmitter, EventReceiver } from "../../components/";
import { alert, randomString, objectGet, notify, getMimeType, currentShare } from "../../helpers/";
import { Session } from "../../model/";
import { Pager } from "./pager";
import { t } from "../../locales/";
import "./imageviewer.scss";
import "./pager.scss";

const SmallExif = (props) => (
    <Bundle loader={import(/* webpackChunkName: "exif" */"./image_exif")} symbol="SmallExif">
        {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const LargeExif = (props) => (
    <Bundle loader={import(/* webpackChunkName: "exif" */"./image_exif")} symbol="LargeExif">
        {(Comp) => <Comp {...props}/>}
    </Bundle>
);

export function ImageViewerComponent({ filename, data, path, subscribe, unsubscribe }) {
    const [state, setState] = useReducer((s, a) => {
        return { ...s, ...a };
    }, {
        preload: null,
        refresh: 0,
        show_exif: false,
        is_loaded: false,
        draggable: false,
    });
    const $container = useRef();
    const refresh = () => setState({ refresh: state.refresh + 1 });
    const shortcut = (e) => {
        if (e.keyCode === 27) setState({ show_exif: false });
        else if (e.keyCode === 73) setState({ show_exif: !state.show_exif });
    };
    useEffect(() => {
        setState({ is_loaded: false });
        subscribe("media::preload", (preload) => {
            setState({ preload: preload });
        });
        document.addEventListener("webkitfullscreenchange", refresh);
        document.addEventListener("mozfullscreenchange", refresh);
        document.addEventListener("fullscreenchange", refresh);
        document.addEventListener("keydown", shortcut);

        return () => {
            unsubscribe("media::preload");
            document.removeEventListener("webkitfullscreenchange", refresh);
            document.removeEventListener("mozfullscreenchange", refresh);
            document.removeEventListener("fullscreenchange", refresh);
            document.removeEventListener("keydown", shortcut);
        };

    }, [data]);

    const chromecastSetup = (event) => {
        switch (event.sessionState) {
        case cast.framework.SessionState.SESSION_STARTED:
            chromecastHandler();
            break;
        }
    };

    const chromecastHandler = (event) => {
        const cSession = cast.framework.CastContext.getInstance().getCurrentSession()
        if (!cSession) return;

        const createLink = () => {
            const shareID = currentShare();
            const origin = location.origin;
            if (shareID) {
                const target = new URL(origin + data);
                target.searchParams.append("share", shareID);
                return Promise.resolve(target.toString());
            }
            return Session.currentUser().then(({ authorization }) => {
                const target = new URL(origin + data);
                target.searchParams.append("authorization", authorization);
                return target.toString()
            });
        };

        return createLink().then((link) => {
            const media = new chrome.cast.media.MediaInfo(
                link,
                getMimeType(filename),
            );
            media.metadata = new chrome.cast.media.PhotoMediaMetadata();
            media.metadata.title = filename;
            media.metadata.images = [
                new chrome.cast.Image(origin + "/assets/icons/photo.png"),
            ];
            return cSession.loadMedia(new chrome.cast.media.LoadRequest(media));
        }).catch((err) => {
            notify.send(err && err.message, "error");
        });
    };

    useEffect(() => {
        if (!objectGet(window.chrome, ["cast", "isAvailable"])) {
            return;
        }
        const context = cast.framework.CastContext.getInstance();
        document.getElementById("chromecast-target").append(document.createElement("google-cast-launcher"));
        context.addEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            chromecastSetup,
        );
        chromecastHandler();
        return () => {
            context.removeEventListener(
                cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                chromecastSetup,
            );
        };
    }, []);

    const hasExif = (fname) => {
        const ext = filepath.extname(fname).toLowerCase().substring(1);
        return ["jpg", "jpeg", "tiff", "tif"].indexOf(ext) !== -1;
    };
    const toggleExif = () => {
        if (window.innerWidth < 580) {
            alert.now(<SmallExif />);
        } else {
            setState({
                show_exif: !state.show_exif,
            });
        }
    };
    const requestFullScreen = () => {
        if ("webkitRequestFullscreen" in document.body) {
            $container.current.webkitRequestFullscreen();
        } else if ("mozRequestFullScreen" in document.body) {
            $container.current.mozRequestFullScreen();
        }
    };

    return (
        <div className="component_imageviewer">
            <MenuBar title={filename} download={data}>
                <NgIf type="inline" cond={hasExif(filename)}>
                    <Icon name="info" onClick={toggleExif} />
                </NgIf>
                <NgIf
                    type="inline"
                    cond={("webkitRequestFullscreen" in document.body) ||
                          ("mozRequestFullScreen" in document.body)}>
                    <Icon name="fullscreen" onClick={requestFullScreen} />
                </NgIf>
            </MenuBar>
            <div
                ref={$container}
                className={
                    "component_image_container " +
                        (document.webkitIsFullScreen || document.mozFullScreen ? "fullscreen" : "")
                }
            >
                <div className="images_wrapper">
                    <ImageFancy
                        draggable={state.draggable}
                        onLoad={() => setState({ is_loaded: true })}
                        url={data} />
                </div>
                <div className={"images_aside scroll-y"+(state.show_exif ? " open": "")}>
                    <div className="header">
                        <div>{ t("Info") }</div>
                        <div style={{ flex: 1 }}>
                            <Icon name="close" onClick={toggleExif} />
                        </div>
                    </div>
                    <div className="content">
                        <LargeExif
                            data={data}
                            show={state.show_exif}
                            ready={state.is_loaded} />
                    </div>
                </div>
                <Pager
                    type={["image"]}
                    path={path}
                    pageChange={(files) => setState({ draggable: files.length > 1 ? true : false })}
                    next={(e) => setState({ preload: e })} />
            </div>

            <NgIf cond={state.is_loaded}>
                <Img style={{ display: "none" }} src={state.preload}/>
            </NgIf>
        </div>
    );
}

export const ImageViewer = EventReceiver(EventEmitter(ImageViewerComponent));

class ImageFancyComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            isError: false,
            drag_init: { x: null, t: null },
            drag_current: { x: null, t: null },
            hasAction: false,
        };
        this.img = new Image();
        this.img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    }

    UNSAFE_componentWillReceiveProps(nextProp) {
        if (nextProp.url !== this.props.url) {
            this.setState({
                isLoading: true,
                isError: false,
                drag_current: { x: 0 },
                hasAction: false,
            });
        }
    }

    onLoad() {
        this.setState({ isLoading: false });
        this.props.onLoad();
    }
    onError(w) {
        this.setState({ isError: true });
    }

    imageDragStart(e) {
        if(!this.props.draggable) return;
        const t = new Date();
        if (e.touches) {
            this.setState({
                drag_init: { x: e.touches[0].clientX, t: t },
                hasAction: true,
            });
        } else {
            this.setState({
                drag_init: { x: e.pageX, t: t },
                hasAction: true,
            });
        }
        if (e.dataTransfer) e.dataTransfer.setDragImage(this.img, 0, 0);
    }
    imageDragEnd(e) {
        const drag_end = {
            x: function(dragX, touch) {
                if (dragX !== null) return dragX;
                if (touch && touch[0]) {
                    return touch[0].clientX;
                }
                return 0;
            }(e.pageX || null, e.changedTouches || null),
            t: new Date(),
        };

        const direction = function(x_current, x_init) {
            if (x_current.t - x_init.t > 200 &&
                Math.abs(x_current.x - x_init.x) <
                (window.innerWidth < 500 ? window.innerWidth / 3 : 250)) {
                return "neutral";
            }
            return x_current.x > x_init.x ? "right" : "left";
        }(drag_end, this.state.drag_init);

        if (direction === "left") {
            return this.setState({
                drag_current: { x: - window.innerWidth },
                hasAction: false,
            }, () => {
                this.props.emit("media::next");
            });
        } else if (direction === "right") {
            return this.setState({
                drag_current: { x: + window.innerWidth },
                hasAction: false,
            }, () => {
                this.props.emit("media::previous");
            });
        }
        return this.setState({
            drag_current: { x: 0 },
            hasAction: false,
        });
    }
    imageDrag(e) {
        if (e.pageX > 0) {
            this.setState({
                drag_current: { x: e.pageX - this.state.drag_init.x },
            });
        } else if (e.touches && e.touches[0].clientX > 0) {
            this.setState({
                drag_current: { x: e.touches[0].clientX - this.state.drag_init.x },
            });
        }
    }

    render() {
        if (this.state.isError) {
            return (
                <span className="error">
                    <div>
                        <div className="label">
                            { t("Can't load this picture") }
                        </div>
                    </div>
                </span>
            );
        }
        if (this.state.isLoading) {
            return (
                <div className="loader">
                    <Loader style={{ margin: "auto" }}/>
                    <Img
                        className="photo"
                        onError={this.onError.bind(this)}
                        onLoad={this.onLoad.bind(this)}
                        style={{ display: "none" }}
                        src={this.props.url} />
                </div>
            );
        }
        return (
            <ReactCSSTransitionGroup
                transitionName="image" transitionLeave={true} transitionEnter={true}
                transitionAppear={true} transitionEnterTimeout={5000} transitionAppearTimeout={5000}
                transitionLeaveTimeout={5000}>
                <div key={this.props.url}>
                    <Img
                        src={this.props.url}
                        style={{ transform: `translateX(${this.state.drag_current.x}px)` }}
                        className={this.state.hasAction ? "photo": "photo idle"}
                        onTouchStart={this.imageDragStart.bind(this)}
                        onDragStart={this.imageDragStart.bind(this)}
                        onDragEnd={this.imageDragEnd.bind(this)}
                        onTouchEnd={this.imageDragEnd.bind(this)}
                        onDrag={this.imageDrag.bind(this)}
                        onTouchMove={this.imageDrag.bind(this)}
                        draggable={this.props.draggable} />
                </div>
            </ReactCSSTransitionGroup>
        );
    }
}

const ImageFancy = EventEmitter(ImageFancyComponent);

function Img({ src, ...props }) {
    const image_url = (url, size) => {
        return url+"&size="+parseInt(Math.max(window.innerWidth*size, window.innerHeight*size));
    };
    if (!src) return null;
    return (
        <img
            {...props}
            src={image_url(src, 1)}
            srcSet={`${image_url(src, 1)}, ${image_url(src, 3/2)} 1.5x, ${image_url(src, 2)} 2x`}
        />
    );
}
