// prompt, alert, confirm, modal, popup?
class ModalManager {
    constructor() {
        this.$dom = document.body.querySelector("component-modal");
        if (!this.$dom) throw new Error("dom not set");
    }

    alert($node, opts) {
        this.$dom.trigger($node, opts);
    }
}

export default new ModalManager();
