/* eslint-disable max-len, no-invalid-this */
import "codemirror/addon/mode/simple";
import {
    org_cycle, org_shifttab, org_metaleft, org_metaright, org_meta_return, org_metaup,
    org_metadown, org_insert_todo_heading, org_shiftleft, org_shiftright, fold, unfold,
    isFold, org_set_fold, org_shiftmetaleft, org_shiftmetaright,
} from "./emacs-org";
import { pathBuilder, dirname, currentShare } from "../../../helpers/";
const CodeMirror = window.CodeMirror;

CodeMirror.__mode = "orgmode";

CodeMirror.defineSimpleMode("orgmode", {
    start: [
        { regex: /(\*\s)(TODO|DOING|WAITING|NEXT|PENDING|)(CANCELLED|CANCELED|CANCEL|DONE|REJECTED|STOP|STOPPED|)(\s+\[\#[A-C]\]\s+|)(.*?)(?:(\s{10,}|))(\:[\S]+\:|)$/, sol: true, token: ["header level1 org-level-star", "header level1 org-todo", "header level1 org-done", "header level1 org-priority", "header level1", "header level1 void", "header level1 comment"] },
        { regex: /(\*{1,}\s)(TODO|DOING|WAITING|NEXT|PENDING|)(CANCELLED|CANCELED|CANCEL|DEFERRED|DONE|REJECTED|STOP|STOPPED|)(\s+\[\#[A-C]\]\s+|)(.*?)(?:(\s{10,}|))(\:[\S]+\:|)$/, sol: true, token: ["header org-level-star", "header org-todo", "header org-done", "header org-priority", "header", "header void", "header comment"] },
        { regex: /(\+[^\+]+\+)/, token: ["strikethrough"] },
        { regex: /(\*[^\*]+\*)/, token: ["strong"] },
        { regex: /(\/[^\/]+\/)/, token: ["em"] },
        { regex: /(\_[^\_]+\_)/, token: ["link"] },
        { regex: /(\~[^\~]+\~)/, token: ["comment"] },
        { regex: /(\=[^\=]+\=)/, token: ["comment"] },
        { regex: /\[\[[^\[\]]+\]\[[^\[\]]+\]\]/, token: "org-url" }, // links
        { regex: /\[\[[^\[\]]+\]\]/, token: "org-image" }, // image
        { regex: /\[[xX\s\-\_]\]/, token: "qualifier org-toggle" }, // checkbox
        { regex: /\#\+(?:(BEGIN|begin))_[a-zA-Z]*/, token: "comment", next: "env", sol: true }, // comments
        { regex: /:?[A-Z_]+\:.*/, token: "comment", sol: true }, // property drawers
        { regex: /(\#\+[a-zA-Z_]*)(\:.*)/, token: ["keyword", "qualifier"], sol: true }, // environments
        { regex: /(CLOCK\:|SHEDULED\:|DEADLINE\:)(\s.+)/, token: ["comment", "keyword"] },
    ],
    env: [
        { regex: /\#\+(?:(END|end))_[a-zA-Z]*/, token: "comment", next: "start", sol: true },
        { regex: /.*/, token: "comment" },
    ],
});
CodeMirror.registerHelper("fold", "orgmode", function(cm, start) {
    // init
    const levelToMatch = headerLevel(start.line);

    // no folding needed
    if (levelToMatch === null) return;

    // find folding limits
    const lastLine = cm.lastLine();
    let end = start.line;
    while (end < lastLine) {
        end += 1;
        const level = headerLevel(end);
        if (level && level <= levelToMatch) {
            end = end - 1;
            break;
        };
    }

    return {
        from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
        to: CodeMirror.Pos(end, cm.getLine(end).length),
    };

    function headerLevel(lineNo) {
        const line = cm.getLine(lineNo);
        const match = /^\*+/.exec(line);
        if (match && match.length === 1 && /header/.test(cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0)))) {
            return match[0].length;
        }
        return null;
    }
});
CodeMirror.registerGlobalHelper("fold", "drawer", function(mode) {
    return mode.name === "orgmode" ? true : false;
}, function(cm, start) {
    const drawer = isBeginningOfADrawer(start.line);
    if (drawer === false) return;

    // find folding limits
    const lastLine = cm.lastLine();
    let end = start.line;
    while (end < lastLine) {
        end += 1;
        if (isEndOfADrawer(end)) {
            break;
        }
    }

    return {
        from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
        to: CodeMirror.Pos(end, cm.getLine(end).length),
    };

    function isBeginningOfADrawer(lineNo) {
        const line = cm.getLine(lineNo);
        const match = /^\:.*\:$/.exec(line);
        if (match && match.length === 1 && match[0] !== ":END:") {
            return true;
        }
        return false;
    }
    function isEndOfADrawer(lineNo) {
        const line = cm.getLine(lineNo);
        return line.trim() === ":END:" ? true : false;
    }
});


CodeMirror.registerHelper("orgmode", "init", (editor, fn) => {
    editor.setOption("extraKeys", {
        "Tab": (cm) => org_cycle(cm),
        "Shift-Tab": (cm) => fn("shifttab", org_shifttab(cm)),
        "Alt-Left": (cm) => org_metaleft(cm),
        "Alt-Right": (cm) => org_metaright(cm),
        "Alt-Enter": (cm) => org_meta_return(cm),
        "Alt-Up": (cm) => org_metaup(cm),
        "Alt-Down": (cm) => org_metadown(cm),
        "Shift-Alt-Left": (cm) => org_shiftmetaleft(cm),
        "Shift-Alt-Right": (cm) => org_shiftmetaright(cm),
        "Shift-Alt-Enter": (cm) => org_insert_todo_heading(cm),
        "Shift-Left": (cm) => org_shiftleft(cm),
        "Shift-Right": (cm) => org_shiftright(cm),
    });
    fn("shifttab", org_set_fold(editor));

    editor.on("mousedown", toggleHandler);
    editor.on("touchstart", toggleHandler);
    editor.on("gutterClick", foldLine);

    // fold everything except headers by default
    editor.operation(function() {
        for (let i = 0; i < editor.lineCount(); i++) {
            if (/header/.test(editor.getTokenTypeAt(CodeMirror.Pos(i, 0))) === false) {
                fold(editor, CodeMirror.Pos(i, 0));
            }
        }
    });
    return CodeMirror.orgmode.destroy.bind(this, editor);
});

CodeMirror.registerHelper("orgmode", "destroy", (editor) => {
    editor.off("mousedown", toggleHandler);
    editor.off("touchstart", toggleHandler);
    editor.off("gutterClick", foldLine);
});

function foldLine(cm, line) {
    const cursor = { line: line, ch: 0 };
    isFold(cm, cursor) ? unfold(cm, cursor) : fold(cm, cursor);
}


let widgets = [];
function toggleHandler(cm, e) {
    const position = cm.coordsChar({
        left: e.clientX || (e.targetTouches && e.targetTouches[0].clientX),
        top: e.clientY || (e.targetTouches && e.targetTouches[0].clientY),
    }, "page");
    const token = cm.getTokenAt(position);

    _disableSelection();
    if (/org-level-star/.test(token.type)) {
        _preventIfShould();
        _foldHeadline();
        _disableSelection();
    } else if (/org-toggle/.test(token.type)) {
        _preventIfShould();
        _toggleCheckbox();
        _disableSelection();
    } else if (/org-todo/.test(token.type)) {
        _preventIfShould();
        _toggleTodo();
        _disableSelection();
    } else if (/org-done/.test(token.type)) {
        _preventIfShould();
        _toggleDone();
        _disableSelection();
    } else if (/org-priority/.test(token.type)) {
        _preventIfShould();
        _togglePriority();
        _disableSelection();
    } else if (/org-url/.test(token.type)) {
        _disableSelection();
        _navigateLink();
    } else if (/org-image/.test(token.type)) {
        _disableSelection();
        _toggleImageWidget();
    }

    function _preventIfShould() {
        if ("ontouchstart" in window) e.preventDefault();
    }
    function _disableSelection() {
        cm.on("beforeSelectionChange", _onSelectionChangeHandler);
        function _onSelectionChangeHandler(cm, obj) {
            obj.update([{
                anchor: position,
                head: position,
            }]);
            cm.off("beforeSelectionChange", _onSelectionChangeHandler);
        }
    }

    function _foldHeadline() {
        const line = position.line;
        if (line >= 0) {
            const cursor = { line: line, ch: 0 };
            isFold(cm, cursor) ? unfold(cm, cursor) : fold(cm, cursor);
        }
    }

    function _toggleCheckbox() {
        const line = position.line;
        const content = cm.getRange(
            { line: line, ch: token.start },
            { line: line, ch: token.end },
        );
        const new_content = content === "[X]" || content === "[x]" ? "[ ]" : "[X]";
        cm.replaceRange(
            new_content,
            { line: line, ch: token.start },
            { line: line, ch: token.end },
        );
    }

    function _toggleTodo() {
        const line = position.line;
        cm.replaceRange(
            "DONE",
            { line: line, ch: token.start },
            { line: line, ch: token.end },
        );
    }

    function _toggleDone() {
        const line = position.line;
        cm.replaceRange(
            "TODO",
            { line: line, ch: token.start },
            { line: line, ch: token.end },
        );
    }

    function _togglePriority() {
        const PRIORITIES = [" [#A] ", " [#B] ", " [#C] ", " [#A] "];
        const line = position.line;
        const content = cm.getRange({ line: line, ch: token.start }, { line: line, ch: token.end });
        const new_content = PRIORITIES[PRIORITIES.indexOf(content) + 1];
        cm.replaceRange(
            new_content,
            { line: line, ch: token.start },
            { line: line, ch: token.end },
        );
    }

    function _toggleImageWidget() {
        const exist = !!widgets
            .filter((line) => line === position.line)[0];

        if (exist === false) {
            if (!token.string.match(/\[\[(.*)\]\]/)) return null;
            const $node = _buildImage(RegExp.$1);
            const widget = cm.addLineWidget(position.line, $node, { coverGutter: false });
            widgets.push(position.line);
            $node.addEventListener("click", closeWidget);

            function closeWidget() {
                widget.clear();
                $node.removeEventListener("click", closeWidget);
                widgets = widgets.filter((line) => line !== position.line);
            }
        }
        function _buildImage(src) {
            const $el = document.createElement("div");
            const $img = document.createElement("img");

            if (/^https?\:\/\//.test(src)) {
                $img.src = src;
            } else {
                const root_path = dirname(window.location.pathname.replace(/^\/view/, ""));
                const img_path = src;
                $img.src = "/api/files/cat?path="+encodeURIComponent(pathBuilder(root_path, img_path));
            }
            $el.appendChild($img);
            return $el;
        }
        return null;
    }

    function _navigateLink() {
        token.string.match(/\[\[(.*?)\]\[/);
        const link = RegExp.$1;
        if (!link) return;

        let open = "_blank";
        const isMobile = screen.availWidth < screen.availHeight;
        if (!document.querySelector(".component_fab img.component_icon[alt=\"save\"]")) {
            open = "_self";
        } else if (isMobile) {
            open = "_self";
        }

        if (/^https?\:\/\//.test(link)) {
            window.open(link, open);
        } else {
            const root_path = dirname(window.location.pathname.replace(/^\/view/, ""));
            const share = currentShare();
            const url = share ? "/view"+pathBuilder(root_path, link)+"?share="+share : "/view"+pathBuilder(root_path, link);
            window.open(url, open);
        }
    }
}


export default CodeMirror;
