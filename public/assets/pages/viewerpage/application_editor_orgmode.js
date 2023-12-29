export default function(editor) {
    CodeMirror.orgmode.init(editor, (key, value) => {
        if (key === "shifttab") {
            // org_shifttab(this.state.editor)
            // this.props.onFoldChange(value);
        }
    });
}
