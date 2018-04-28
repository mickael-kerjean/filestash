import 'codemirror/addon/mode/simple';
import {
    org_cycle, org_shifttab, org_metaleft, org_metaright, org_meta_return, org_metaup,
    org_metadown, org_insert_todo_heading, org_shiftleft, org_shiftright, fold, unfold,
    isFold, org_set_fold, org_shiftmetaleft, org_shiftmetaright
} from './emacs-org';

CodeMirror.__mode = 'orgmode';

CodeMirror.defineSimpleMode("orgmode", {
    start: [
        {regex: /^(\*{1,}\s)(TODO|DOING|WAITING|NEXT|)(CANCELLED|CANCEL|DEFERRED|DONE|REJECTED|STOP|STOPPED|)(.*?)(?:(\s{10,}|))(\:[\S]+\:|)$/, token: ["header org-level-star","header org-todo","header org-done","header", "header void", "header comment"]},
        {regex: /(\+[^\+]+\+)/, token: ["strikethrough"]},
        {regex: /(\*[^\*]+\*)/, token: ["strong"]},
        {regex: /(\/[^\/]+\/)/, token: ["em"]},
        {regex: /(\_[^\_]+\_)/, token: ["link"]},
        {regex: /(\~[^\~]+\~)/, token: ["comment"]},
        {regex: /(\=[^\=]+\=)/, token: ["comment"]},
        {regex: /\[\[[^\[\]]*\]\[[^\[\]]*\]\]/, token: "url"}, // links
        {regex: /\[[xX\s]?\]/, token: 'qualifier'}, // checkbox
        {regex: /\#\+BEGIN_[A-Z]*/, token: "comment", next: "env"}, // comments
        {regex: /:?[A-Z_]+\:.*/, token: "comment"}, // property drawers
        {regex: /(\#\+[A-Z_]*)(\:.*)/, token: ["keyword", 'qualifier']}, // environments
        {regex: /(CLOCK\:|SHEDULED\:|DEADLINE\:)(\s.+)/, token: ["comment", "keyword"]}
    ],
    env: [
        {regex: /.*?\#\+END_[A-Z]*/, token: "comment", next: "start"},
        {regex: /.*/, token: "comment"}
    ]
});
CodeMirror.registerHelper("fold", "orgmode", function(cm, start) {
    // init
    const levelToMatch = headerLevel(start.line);

    // no folding needed
    if(levelToMatch === null) return;

    // find folding limits
    const lastLine = cm.lastLine();
    let end = start.line;
    while(end < lastLine){
        end += 1;
        let level = headerLevel(end);
        if(level && level <= levelToMatch) {
            end = end - 1;
            break;
        };
    }

    return {
        from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
        to: CodeMirror.Pos(end, cm.getLine(end).length)
    };

    function headerLevel(lineNo) {
        var line = cm.getLine(lineNo);
        var match = /^\*+/.exec(line);
        if(match && match.length === 1 && /header/.test(cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0)))){
            return match[0].length;
        }
        return null;
    }
});
CodeMirror.registerGlobalHelper("fold", "drawer", function(mode) {
    return mode.name === 'orgmode' ? true : false;
}, function(cm, start) {
    const drawer = isBeginningOfADrawer(start.line);
    if(drawer === false) return;

    // find folding limits
    const lastLine = cm.lastLine();
    let end = start.line;
    while(end < lastLine){
        end += 1;
        if(isEndOfADrawer(end)){
            break
        }
    }
    return {
        from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
        to: CodeMirror.Pos(end, cm.getLine(end).length)
    };

    function isBeginningOfADrawer(lineNo) {
        var line = cm.getLine(lineNo);
        var match = /^\:.*\:$/.exec(line);
        if(match && match.length === 1 && match[0] !== ':END:'){
            return true;
        }
        return false;
    }
    function isEndOfADrawer(lineNo){
        var line = cm.getLine(lineNo);
        return line.trim() === ':END:' ? true : false;
    }
});


CodeMirror.afterInit = function(editor, fn){

    editor.setOption("extraKeys", {
        "Tab": function(cm) { org_cycle(cm); },
        "Shift-Tab": function(cm){ fn('shifttab', org_shifttab(cm)); },
        "Alt-Left": function(cm){ org_metaleft(cm); },
        "Alt-Right": function(cm){ org_metaright(cm); },
        "Alt-Enter": function(cm){ org_meta_return(cm); },
        "Alt-Up": function(cm){ org_metaup(cm); },
        "Alt-Down": function(cm){ org_metadown(cm); },
        "Shift-Alt-Left": function(cm){ org_shiftmetaleft(cm); },
        "Shift-Alt-Right": function(cm){ org_shiftmetaright(cm); },
        "Shift-Alt-Enter": function(cm){ org_insert_todo_heading(cm); },
        "Shift-Left": function(cm){ org_shiftleft(cm); },
        "Shift-Right": function(cm){ org_shiftright(cm); },
    });
    fn('shifttab', org_set_fold(editor));

    editor.addKeyMap({
        "Ctrl-X Ctrl-C": function(cm){
            cm.execCommand('quit');
        }
    });

    editor.on('touchstart', function(cm, e){
        setTimeout(() => {
            isFold(cm, cm.getCursor()) ? unfold(cm, cm.getCursor()) : fold(cm, cm.getCursor())
        }, 150);
    });

    // fold everything except headers by default
    editor.operation(function() {
        for (var i = 0; i < editor.lineCount() ; i++) {
            if(/header/.test(editor.getTokenTypeAt(CodeMirror.Pos(i, 0))) === false){
                fold(editor, CodeMirror.Pos(i, 0));
            }
        }
    });
}



export default CodeMirror;
