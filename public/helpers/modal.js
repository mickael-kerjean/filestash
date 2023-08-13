import Modal from "../components/modal.js";

// prompt, alert, confirm, modal, popup?
class ModalManager {
    constructor() {
        this.$dom = document.body.querySelector("component-modal");
    }

    alert($node, opts) {
        if (this.$dom instanceof Modal) {
            this.$dom.trigger($node, opts);
        }
    }
}

export default new ModalManager();
