// reference:
// - uno programming: https://www.youtube.com/watch?v=CzxLKG9CUvo
// - dispatch commands: https://wiki.documentfoundation.org/Development/DispatchCommands
Module.zetajs.then(function(zetajs) {
    init({
        css: zetajs.uno.com.sun.star,
        zetajs,
    });
});

function init({ zetajs, css }) {
    const context = zetajs.getUnoComponentContext();
    const desktop = css.frame.Desktop.create(context);
    let ctrl, xModel;

    // UI Element: remove toolbar in writer
    const config = css.configuration.ReadWriteAccess.create(context, "en-US");
    ["Writer", "Calc", "Impress"].forEach((app) => {
        const uielems = config.getByHierarchicalName(`/org.openoffice.Office.UI.${app}WindowState/UIElements/States`);
        for (const i of uielems.getElementNames()) {
            const uielem = uielems.getByName(i);
            if (uielem.getByName("Visible")) uielem.setPropertyValue("Visible", false);
        }
    });

    // Theme & Colors
    const elmnts = config.getByHierarchicalName("/org.openoffice.Office.UI/ColorScheme/ColorSchemes");
    for (const i of elmnts.getElementNames()) {
        const colorScheme = elmnts.getByName(i);
        // console.log(colorScheme.getElementNames());
        colorScheme.getByName("AppBackground").setPropertyValue("Color", 16119285); // #f5f5f5
        colorScheme.getByName("WriterPageBreaks").setPropertyValue("Color", 16119285); // #f5f5f5
        colorScheme.getByName("WriterSectionBoundaries").setPropertyValue("Color", 16119285); // #f5f5f5
        colorScheme.getByName("Shadow").setPropertyValue("Color", 16119285); // #f5f5f5
        colorScheme.getByName("FontColor").setPropertyValue("Color", 2368548); // #242424
        colorScheme.getByName("WriterHeaderFooterMark").setPropertyValue("Color", 16777215); // #ffffff
    }
    config.commitChanges();

    zetajs.mainPort.onmessage = function(e) {
        switch (e.data.cmd) {
        case "destroy":
            toggleTools({ mime: e.data.mime, css, ctrl, context });
            xModel = null;
            ctrl = null;
            break;
        case "load":
            const { filename, mime } = e.data;
            const in_path = `file:///tmp/office/${filename}`;
            xModel = desktop.loadComponentFromURL(in_path, "_default", 0, []);
            ctrl = xModel.getCurrentController();
            ctrl.getFrame().LayoutManager.hideElement("private:resource/menubar/menubar");
            ctrl.getFrame().LayoutManager.hideElement("private:resource/statusbar/statusbar");
            ctrl.getFrame().getContainerWindow().FullScreen = true;
            toggleTools({ mime, css, ctrl, context });
            const commands = [ // ref: https://wiki.documentfoundation.org/Development/DispatchCommands
                "Bold", "Italic", "Underline", "Strikeout", "LeftPara", "RightPara", "CenterPara",
                "JustifyPara", "Color", "FontHeight", ...(isWriter(mime) ? ["StyleApply", "DefaultBullet", "DefaultNumbering"] : []),
            ];
            for (const id of commands) {
                const urlObj = transformUrl(".uno:" + id, { css, context });
                const listener = zetajs.unoObject([css.frame.XStatusListener], {
                    disposing: function(source) {},
                    statusChanged: function(state) {
                        state = zetajs.fromAny(state.State);
                        if (id === "StyleApply") state = state && state.StyleName || null;
                        else if (id === "Color") state = typeof state === "number" ? state : null;
                        else if (id === "FontHeight") state = state && state.Height || null;
                        else if (typeof state !== "boolean") state = false;

                        if (state === null) return;
                        zetajs.mainPort.postMessage({ cmd: "setFormat", id, state });
                    },
                });
                queryDispatch(urlObj, { ctrl }).addStatusListener(listener, urlObj);
            }
            zetajs.mainPort.postMessage({ cmd: "loaded" });
            break;
        case "save":
            xModel.store();
            zetajs.mainPort.postMessage({ cmd: "save" });
            break;
        case "toggleFormatting":
            dispatch(".uno:" + e.data.id, { css, ctrl, context });
            break;
        default:
            throw Error("Unknown message command: " + e.data.cmd);
        }
    }
}

function transformUrl(unoUrl, { css, context }) {
    const ioparam = {
        val: new css.util.URL({
            Complete: unoUrl
        }),
    };
    css.util.URLTransformer.create(context).parseStrict(ioparam);
    return ioparam.val;
}

function queryDispatch(urlObj, { ctrl }) {
    return ctrl.queryDispatch(urlObj, "_self", 0);
}

function dispatch(unoUrl, { css, ctrl, context }) {
    const urlObj = transformUrl(unoUrl, { css, context });
    queryDispatch(urlObj, { ctrl }).dispatch(urlObj, []);
}

function toggleTools({ css, ctrl, context, mime }) {
    dispatch(".uno:Sidebar", { css, ctrl, context });
    if (isCalc(mime)) dispatch(".uno:InputLineVisible", { css, ctrl, context });
    if (isWriter(mime)) dispatch(".uno:Ruler", { css, ctrl, context });
}

function isWriter(mime) {
    return ["application/word", "application/msword", "application/rtf", "application/vnd.oasis.opendocument.text"].indexOf(mime) >= 0;
}

function isCalc(mime) {
    return ["application/excel", "application/vnd.ms-excel", "application/vnd.oasis.opendocument.spreadsheet"].indexOf(mime) >= 0;
}
