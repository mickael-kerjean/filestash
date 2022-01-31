import React from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import { DropTarget } from "react-dnd";

import { EventEmitter, Icon } from "../../components/";
import { t } from "../../locales/";
import "./filezone.scss";

function FileZoneComponent({ connectDropFile, fileIsOver }) {
    return connectDropFile(
        <div className={"component_filezone "+(fileIsOver ? "hover" : "")}>
            { t("DROP HERE TO UPLOAD") }
        </div>,
    );
}

const HOCDropTargetForFSFile = (Cmp) => {
    return DropTarget(
        "__NATIVE_FILE__", {
            drop(props, monitor) {
                props.emit("file.upload", props.path, monitor.getItem());
            },
        },
        (connect, monitor) => ({
            connectDropFile: connect.dropTarget(),
            fileIsOver: monitor.isOver(),
        }),
    )(Cmp);
};

export const FileZone = EventEmitter(HOCDropTargetForFSFile(FileZoneComponent));

function MobileFileUploadComponent({ emit, path, accessRight }) {
    if (!window.CONFIG["upload_button"] && /(Android|iPad|iPhone)/.test(navigator.userAgent) === false) {
        return null;
    } else if (accessRight.can_create_file === false || accessRight.can_create_directory === false) {
        return null;
    }

    const onUpload = (e) => {
        emit("file.upload", path, e);
    };
    return (
        <ReactCSSTransitionGroup
            transitionName="mobilefileupload" transitionLeave={false} transitionEnter={false}
            transitionAppear={true} transitionAppearTimeout={550}>
            <div className="component_mobilefileupload">
                <form>
                    <input onChange={onUpload} type="file" name="file" id="mobilefileupload" multiple/>
                    <label htmlFor="mobilefileupload">
                        <Icon name="upload_white"/>
                    </label>
                </form>
            </div>
        </ReactCSSTransitionGroup>
    );
}

export const MobileFileUpload = EventEmitter(MobileFileUploadComponent);
