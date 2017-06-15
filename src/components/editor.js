import React from 'react';
import PropTypes from 'prop-types';

import CodeMirror from 'codemirror/lib/codemirror';
import 'codemirror/keymap/emacs.js';
import 'codemirror/addon/mode/simple';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/addon/dialog/dialog.js';
//import '../pages/editpage/javascript';

CodeMirror.defineSimpleMode("orgmode", {
    start: [
        {regex: /(^\+[^\/]*\+)/, token: ["strikethrough"]},
        {regex: /(^\*[^\/]*\*)/, token: ["header", "strong"]},
        {regex: /(^\/[^\/]*\/)/, token: ["em"]},
        {regex: /(^\_[^\/]*\_)/, token: ["link"]},
        {regex: /(^\~[^\/]*\~)/, token: ["comment"]},
        {regex: /(^\=[^\/]*\=)/, token: ["comment"]},        
        {regex: /(^[\*]+)(\s[TODO|NEXT|DONE|DEFERRED|REJECTED|WAITING]{2,})?(.*)/, token: ['comment', 'qualifier', 'header']}, // headline
        {regex: /\s*\:?[A-Z_]+\:.*/, token: "qualifier"}, // property drawers
        {regex: /(\#\+[A-Z_]*)(\:.*)/, token: ["keyword", 'qualifier']}, // environments
        {regex: /\[\[[^\[\]]*\]\[[^\[\]]*\]\]/, token: "url"}, // links
        {regex: /\[[xX\s]?\]/, token: 'qualifier'}, // checkbox
        {regex: /\#\+BEGIN_[A-Z]*/, token: "comment", next: "env"}, // comments
    ],
    env: [
        {regex: /.*?\#\+END_[A-Z]*/, token: "comment", next: "start"},
        {regex: /.*/, token: "comment"}
    ],
    meta: {
        dontIndentStates: ["comment"],
        lineComment: "//"
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
            //console.log(mode)
            let editor = CodeMirror(document.getElementById('editor'), {
                value: this.props.content,
                lineNumbers: document.body.offsetWidth > 500 ? true : false,
                mode: mode,
                lineWrapping: true,
                keyMap: "emacs"
            });
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
