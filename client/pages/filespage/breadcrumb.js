import { DropTarget } from "react-dnd";

import { EventEmitter, BreadCrumb, PathElement } from "../../components/";
import { pathBuilder, filetype, basename } from "../../helpers/";

export class BreadCrumbTargettable extends BreadCrumb {
    constructor(props) {
        super(props);
    }

    render() {
        return super.render(Element);
    }
}

const HOCDropTargetForVirtualFile = (Cmp) => {
    const fileTarget = {
        canDrop(props) {
            return props.isLast ? false : true;
        },
        drop(props, monitor, component) {
            const src = monitor.getItem();
            if (props.currentSelection.length === 0) {
                const from = pathBuilder(src.path, src.name, src.type);
                const to = pathBuilder(props.path.full, src.name, src.type);
                return { action: "rename", args: [from, to, src.type], ctx: "breadcrumb" };
            } else {
                return {
                    action: "rename.multiple",
                    args: props.currentSelection.map((selectionPath) => {
                        const from = selectionPath;
                        const to = pathBuilder(
                            props.path.full,
                            "./"+basename(selectionPath),
                            filetype(selectionPath),
                        );
                        return [from, to];
                    }),
                };
            }
        },
    };

    return DropTarget(
        "file",
        fileTarget,
        (connect, monitor) => ({
            connectDropTarget: connect.dropTarget(),
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    )(Cmp);
};

const HOCDropTargetForFSFile = (Cmp) => {
    const nativeFileTarget = {
        canDrop(props) {
            return props.isLast ? false : true;
        },
        drop: function(props, monitor) {
            const files = monitor.getItem();
            props.emit("file.upload", props.path.full, files);
        },
    };

    return DropTarget(
        "__NATIVE_FILE__",
        nativeFileTarget,
        (connect, monitor) => ({
            connectNativeFileDropTarget: connect.dropTarget(),
            isNativeFileOver: monitor.isOver(),
            canDropFile: monitor.canDrop(),
        }),
    )(Cmp);
};

class ElementComponent extends PathElement {
    constructor(props) {
        super(props);
    }

    render() {
        const highlight = (this.props.isOver && this.props.canDrop ) ||
            (this.props.isNativeFileOver && this.props.canDropFile);
        return this.props.connectNativeFileDropTarget(this.props.connectDropTarget(
            super.render(highlight),
        ));
    }
}

const Element = EventEmitter(HOCDropTargetForVirtualFile(HOCDropTargetForFSFile(ElementComponent)));
