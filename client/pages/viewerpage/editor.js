import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router'
import CodeMirror from 'codemirror/lib/codemirror';
import 'codemirror/lib/codemirror.css';
window.CodeMirror = CodeMirror;
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
import 'codemirror/addon/fold/foldgutter.css';

import { NgIf, Loader } from '../../components/';
import { debounce  } from '../../helpers/';
import { org_shifttab } from './editor/emacs-org';
import './editor.scss';

@withRouter
export class Editor extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            loading: null,
            editor: null,
            filename: this.props.filename,
            listeners: []
        };
        this._refresh = this._refresh.bind(this);
        this.onEdit = this.onEdit.bind(this);
    }

    _refresh(){
        if(this.state.editor) this.state.editor.refresh();
    }

    componentDidMount(){
        window.addEventListener('resize', this._refresh);
        this.setState({loading: null, error: false}, () => {
            window.setTimeout(() => {
                if(this.state.loading === null) this.setState({loading: true});
            }, 200);
        });


        this.loadKeybinding()
            .then(() => this.loadMode(this.props.filename))
            .then((res) => new Promise((done) => this.setState({loading: false}, () => done(res))))
            .then(loadCodeMirror.bind(this))
            .then(() => {
                this.props.event.subscribe((data) => {
                    const [type, value] = data;
                    if(type === "goTo"){
                        this.state.editor.operation((cm) => {
                            this.state.editor.setSelection({line: value, ch: 0}, {line: value, ch: this.state.editor.getLine(value).length});
                        });

                        requestAnimationFrame(() => {
                            // For some reasons I ignore, codemirror would give different value for scroll position, depending on
                            // when you ask for it. Based on a few debug sessions, I found out the results to be much more accurate when
                            // wrapped around an async hack like that
                            const pY = this.state.editor.charCoords({line: value, ch: 0}, "local").top;
                            this.state.editor.operation((cm) => {
                                this.state.editor.scrollTo(null, pY);
                                this.state.editor.setSelection({line: value, ch: 0}, {line: value, ch: this.state.editor.getLine(value).length});
                            });
                        });
                    }else if(type === "refresh"){
                        const cursor = this.state.editor.getCursor();
                        const selections = this.state.editor.listSelections();
                        this.state.editor.setValue(this.props.content);
                        this.state.editor.setCursor(cursor);
                        if(selections.length > 0){
                            this.state.editor.setSelection(selections[0].anchor, selections[0].head);
                        }
                    }else if(type === "fold"){
                        this.props.onFoldChange(
                            org_shifttab(this.state.editor)
                        );
                        this.state.editor.refresh();
                    }
                });
            });

        function loadCodeMirror(data){
            const [CodeMirror, mode] = data;

            let listeners = [];
            let editor = CodeMirror(document.getElementById('editor'), {
                value: this.props.content,
                lineNumbers: true,
                mode: mode,
                keyMap: ["emacs", "vim"].indexOf(CONFIG["editor"]) === -1 ? "sublime" : CONFIG["editor"],
                lineWrapping: true,
                readOnly: !this.props.readonly,
                foldOptions: {
                    widget: "..."
                }
            });
            if(!('ontouchstart' in window)) editor.focus();
            editor.getWrapperElement().setAttribute("mode", mode);
            this.props.onModeChange(mode);

            editor.on('change', this.onEdit);

            if(mode === "orgmode"){
                listeners.push(CodeMirror.orgmode.init(editor, (key, value) => {
                    if(key === "shifttab"){
                        this.props.onFoldChange(value);
                    }
                }));
            }


            CodeMirror.commands.save = () => {
                this.props.onSave && this.props.onSave();
            };
            editor.addKeyMap({
                "Ctrl-X Ctrl-C": function(cm){
                    window.history.back();
                }
            });

            return new Promise((done) => {
                this.setState({editor: editor, listeners: listeners}, done);
            });
        }
    }

    onEdit(cm){
        if(this.props.onChange){
            this.props.onChange(cm.getValue());
        }
    }

    componentWillUnmount(){
        window.removeEventListener('resize', this._refresh);
        this.state.editor.off('change', this.onEdit);
        this.state.editor.clearHistory();
        this.state.listeners.map((fn) => fn());
    }

    loadMode(file){
        let ext = file.split('.').pop(),
            mode = null;

        // remove emacs mark when a file is opened
        ext = ext
            .replace(/~$/, '')
            .replace(/\#$/, '');

        if(ext === 'org' || ext === 'org_archive'){ mode = 'orgmode'; }
        else if(ext === 'sh'){ mode = 'shell'; }
        else if(ext === 'py'){ mode = 'python'; }
        else if(ext === 'html' || ext === 'htm'){ mode = 'htmlmixed'; }
        else if(ext === 'css'){ mode = 'css'; }
        else if(ext === 'less' || ext === 'scss' || ext === 'sass'){ mode = 'sass'; }
        else if(ext === 'js' || ext === 'json'){ mode = 'javascript'; }
        else if(ext === 'jsx'){ mode = 'jsx'; }
        else if(ext === 'php' || ext === 'php5' || ext === 'php4'){ mode = 'php'; }
        else if(ext === 'elm'){ mode = 'elm'; }
        else if(ext === 'erl'){ mode = 'erlang'; }
        else if(ext === 'go'){mode = 'go'; }
        else if(ext === 'markdown' || ext === 'md'){mode = 'yaml-frontmatter'; }
        else if(ext === 'pl' || ext === 'pm'){mode = 'perl'; }
        else if(ext === 'clj'){ mode = 'clojure'; }
        else if(ext === 'el' || ext === 'lisp' || ext === 'cl' || ext === 'emacs'){ mode = 'commonlisp'; }
        else if(ext === 'Dockerfile'){ mode = 'dockerfile'; }
        else if(ext === 'R'){ mode = 'r'; }
        else if(ext === 'Makefile'){ mode = 'cmake'; }
        else if(ext === 'rb'){ mode = 'ruby'; }
        else if(ext === 'sql'){ mode = 'sql'; }
        else if(ext === 'xml' || ext === 'rss' || ext === 'svg' || ext === 'atom'){ mode = 'xml'; }
        else if(ext === 'yml' || ext === 'yaml'){ mode = 'yaml'; }
        else if(ext === 'lua'){ mode = 'lua'; }
        else if(ext === 'csv'){ mode = 'spreadsheet'; }
        else if(ext === 'rs' || ext === 'rlib'){ mode = 'rust'; }
        else if(ext === 'latex' || ext === 'tex'){ mode = 'stex'; }
        else if(ext === 'diff' || ext === 'patch'){ mode = 'diff'; }
        else if(ext === 'sparql'){ mode = 'sparql'; }
        else if(ext === 'properties'){ mode = 'properties'; }
        else if(ext === 'c' || ext === 'cpp' || ext === 'java' || ext === 'h'){
            mode = 'clike';
        }else{
            mode = 'text';
        }

        return import(/* webpackChunkName: "editor" */'./editor/'+mode)
            .catch(() => import("./editor/text"))
            .then((module) => Promise.resolve([module.default, mode: mode]));
    }

    loadKeybinding(){
        if(CONFIG["editor"] === "emacs" || !CONFIG["editor"]){
            return Promise.resolve();
        }
        return import(/* webpackChunkName: "editor" */'./editor/keymap_'+CONFIG["editor"]);
    }

    render() {
        return (
            <div className="component_editor">
              <NgIf cond={this.state.loading === true}>
                <Loader/>
              </NgIf>
              <NgIf cond={this.state.loading === false}>
                <div id="editor"></div>
              </NgIf>
            </div>
        );
    }
}

Editor.propTypes = {
    content: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    onSave: PropTypes.func
};
