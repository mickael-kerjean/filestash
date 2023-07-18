import { createElement } from "../common/skeleton/index.js";

export function prompt(label, okFn, errFn) {
    const $node = createElement(`
    <dialog open>
  <p>Greetings, one and all!</p>
  <form method="dialog">
    <button>OK</button>
  </form>
</dialog>`);
    document.body.appendChild($node);
    okFn("OK")
}
