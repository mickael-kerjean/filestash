import { createElement, navigate } from "../../lib/skeleton/index.js";
import rxjs, { withEffect, textContent } from "../../lib/rxjs/index.js";
import { animate, CSSTransition } from "../../lib/animate/index.js";

export default function(render) {
    const $page = createElement(`
<div>
  <h1>Admin</h1>
  <p>
    Settings <br/>
    <form>
      <input id="ftp_username" name="username" type="text" />
      <input id="ftp_password" name="password" type="text" />
    </form>
    <a href="./" data-link>go home</a>
  </p>
</div>`);
    render($page);
    withEffect(animate($page).pipe(CSSTransition()));

    const formValues = rxjs.combineLatest(
        rxjs.
            fromEvent($page.querySelector("#ftp_username"), "input").
            pipe(rxjs.map((e) => ({name: e.target.id, value: e.target.value})), rxjs.startWith(null)),
        rxjs.
            fromEvent($page.querySelector("#ftp_password"), "input").
            pipe(rxjs.map((e) => ({name: e.target.id, value: e.target.value}), rxjs.startWith(null)))
    ).subscribe((e) => { // pipe onto reducer function that build our form object
        console.log("OK", e)
    });
};
