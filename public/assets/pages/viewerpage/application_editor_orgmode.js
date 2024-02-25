export default function(editor) {
    window.CodeMirror.orgmode.init(editor, (key, value) => {
        if (key === "shifttab") {
            // org_shifttab(this.state.editor)
            // this.props.onFoldChange(value);
        }
    });
}
