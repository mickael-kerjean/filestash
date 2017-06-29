import React from 'react';
import PropTypes from 'prop-types';

import CodeMirror from 'codemirror/lib/codemirror';

// keybinding
import 'codemirror/keymap/emacs.js';

// search
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/addon/dialog/dialog.js';

// code folding
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';

// modes
import 'codemirror/addon/mode/simple';

CodeMirror.defineSimpleMode("orgmode", {
    start: [
        {regex: /^(^\*{1,6}\s)(TODO|DOING|WAITING){0,1}(CANCEL|DEFERRED|DONE){0,1}(.*)$/, token: ["header org-level-star", "header org-todo", "header org-done", "header"]},
        {regex: /(^\+[^\/]*\+)/, token: ["strikethrough"]},
        {regex: /(^\*[^\/]*\*)/, token: ["strong"]},
        {regex: /(^\/[^\/]*\/)/, token: ["em"]},
        {regex: /(^\_[^\/]*\_)/, token: ["link"]},
        {regex: /(^\~[^\/]*\~)/, token: ["comment"]},
        {regex: /(^\=[^\/]*\=)/, token: ["comment"]},
        // special syntax
        //{regex: /(^[\*]+)(\s[TODO|NEXT|DONE|DEFERRED|REJECTED|WAITING]{2,})?(.*)/, token: ['comment', 'qualifier', 'header']}, // headline
        {regex: /\[\[[^\[\]]*\]\[[^\[\]]*\]\]/, token: "url"}, // links
        {regex: /\[[xX\s]?\]/, token: 'qualifier'}, // checkbox
        {regex: /\#\+BEGIN_[A-Z]*/, token: "comment", next: "env"}, // comments
        {regex: /:?[A-Z_]+\:.*/, token: "comment"}, // property drawers
        {regex: /(\#\+[A-Z_]*)(\:.*)/, token: ["keyword", 'qualifier']}, // environments
        {regex: /(CLOCK\:|SHEDULED\:)(\s.+)/, token: ["comment", "keyword"]}
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


export class Editor extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            editor: null,
            filename: this.props.filename
        }
    }

    componentWillReceiveProps(props){
        if(this.props.content !== props.content){
            this.state.editor.getDoc().setValue(props.content);
        }
        if(this.props.height !== props.height){
            this.updateHeight(props.height);
        }
    }

    componentDidMount(){
        this.loadMode(this.props.filename)
            .then(loadCodeMirror.bind(this))

        function loadCodeMirror(mode){
            const size_small = 500;
            let editor = CodeMirror(document.getElementById('editor'), {
                value: this.props.content,
                lineNumbers: document.body.offsetWidth > size_small ? true : false,
                mode: mode,
                keyMap: "emacs",
                lineWrapping: true,
                foldGutter: {
                    minFoldSize: 1
                }
            });
            if(mode === 'orgmode'){
                let state = {
                    stab: 'OVERVIEW'
                };
                editor.setOption("extraKeys", {
                    "Tab": function(cm) {
                        let pos = cm.getCursor();
                        isFold(cm, pos) ? unfold(cm, pos) : fold(cm, pos);
                    },
                    "Shift-Tab": function(cm){
                        if(state.stab === "SHOW_ALL"){
                            // fold everything that can be fold
                            state.stab = 'OVERVIEW';
                            cm.operation(function() {
                                for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                                    fold(cm, CodeMirror.Pos(i, 0));
                                }
                            });
                        }else{
                            // unfold all headers
                            state.stab = 'SHOW_ALL';
                            cm.operation(function() {
                                for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                                    if(/header/.test(cm.getTokenTypeAt(CodeMirror.Pos(i, 0))) === true){
                                        unfold(cm, CodeMirror.Pos(i, 0))
                                    }
                                }
                            });
                        }
                    }
                });

                function fold(cm, start){
                    cm.foldCode(start, null, "fold");
                }
                function unfold(cm, start){
                    cm.foldCode(start, null, "unfold");
                }
                function isFold(cm, start){
                    const line = start.line;
                    const marks = cm.findMarks(CodeMirror.Pos(line, 0), CodeMirror.Pos(line + 1, 0));
                    for (let i = 0; i < marks.length; ++i)
                        if (marks[i].__isFold && marks[i].find().from.line == line) return marks[i];
                    return false;
                }
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

                function collapseWidget(){
                    let $widget = document.createElement('span');
                    $widget.appendChild(document.createTextNode('colapse'));
                    return $widget;
                }
                function expandWidget(){
                    let $widget = document.createElement('span');
                    $widget.appendChild(document.createTextNode('expand'));
                    return $widget;
                }
            }
            this.setState({editor: editor});
            this.updateHeight(this.props.height);

            editor.on('change', (edit) => {
                if(this.props.onChange){
                    this.props.onChange(edit.getValue());
                }
            })
            CodeMirror.commands.save = () => {
                let elt = editor.getWrapperElement();
                elt.style.background = "rgba(0,0,0,0.1)";
                window.setTimeout(function() { elt.style.background = ""; }, 300);
                this.props.onSave && this.props.onSave();
            };
        }
    }

    componentWillUnmount(){
        this.state.editor.clearHistory();
    }

    updateHeight(height){
        if(height){
            //document.querySelector('.CodeMirror').style.height = height+'px';
        }
    }


    loadMode(file){
        let ext = file.split('.').pop(),
            mode = null;

        ext = ext.replace(/~$/, ''); // remove emacs mark when a file is opened

        if(ext === 'org' || ext === 'org_archive'){ return Promise.resolve('orgmode'); }
        else if(ext === 'js' || ext === 'json'){
            // import('../pages/editpage/index')
            //     .then((m) => {console.log(m);})
            //     .catch((err) => {
            //         console.trace(err)
            //     })
            // require(["../pages/editpage/javascript"], function(a) {
            //     console.log("DONEEE");
            //     console.log("HEREEE")
            // }, function(err){
            //     console.log(err)
            // });

            //
            // return System.import('../pages/editpage/index')
            //     .then((mode) => {
            //         console.log(mode)
            //         return Promise.resolve('javascript')
            //     })
            //System.import('codemirror/mode/javascript/javascript')
            return Promise.resolve('javascript')
        }
        // else if(ext === 'sh'){ mode = 'shell'; }
        // else if(ext === 'py'){ mode = 'python'; }
        // else if(ext === 'html'){ mode = 'htmlmixed'; }
        // else if(ext === 'css'){ mode = 'css'; }
        // else if(ext === 'erl'){ mode = 'erlang'; }
        // else if(ext === 'go'){mode = 'go'; }
        // else if(ext === 'markdown' || ext === 'md'){mode = 'markdown'; }
        // else if(ext === 'pl'){mode = 'perl'; }
        // else if(ext === 'clj'){ mode = 'clojure'; }
        // else if(ext === 'php'){ mode = 'php'; }
        // else if(ext === 'r'){ mode = 'r'; }
        // else if(ext === 'rb'){ mode = 'ruby'; }
        // else if(ext === 'less' || ext === 'scss'){ mode = 'sass'; }
        // else if(ext === 'sql'){ mode = 'sql'; }
        // else if(ext === 'xml'){ mode = 'xml'; }
        // else if(ext === 'yml'){
        //     System.import('codemirror/mode/javascript/javascript')
        //         //.then(() => Promise.resolve('javascript'));
        // }
        // else if(ext === 'c' || ext === 'cpp' || ext === 'java'){
        //     mode = 'clike';
        // }
        else{ return Promise.resolve('orgmode') }
    }

    render() {
        return (
                <div id="editor" style={{height: '100%'}}></div>
        );
    }
}

Editor.propTypes = {
    content: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    onSave: PropTypes.func
}

// function load(mode){
//     let url = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.26.0/mode/'+mode+'/'+mode+'.js';
//     var script = document.createElement('script');
//     script.type = 'text/javascript';
//     script.src = url;
//     document.getElementsByTagName('head')[0].appendChild(script);
//     return mode;
// }
