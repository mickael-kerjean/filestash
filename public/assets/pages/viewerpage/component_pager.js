import { createElement } from "../../lib/skeleton/index.js";
import { loadCSS } from "../../helpers/loader.js";

export default function(render) {
    render(createElement(`
  <div class="wrapper no-select">
    <span>
      <a href="/view/Documents/assets/background.png">
        <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6I2YyZjJmMjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MS41MTE4MTEwMjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZSIgZD0ibSAxNiw3LjE2IC00LjU4LDQuNTkgNC41OCw0LjU5IC0xLjQxLDEuNDEgLTYsLTYgNiwtNiB6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" alt="arrow_left_white">
      </a>
      <label class="pager">
        <form>
          <input class="prevent" type="number" value="2" style="width: 12px;">
        </form>
        <span class="separator">/</span>
        <span>2</span>
      </label>
      <a href="/view/Documents/assets/background.png">
        <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6I2YyZjJmMjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MS41MTE4MTEwMjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZSIgZD0iTTguNTkgMTYuMzRsNC41OC00LjU5LTQuNTgtNC41OUwxMCA1Ljc1bDYgNi02IDZ6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" alt="arrow_right_white">
      </a>
    </span>
  </div>
`));
}

export function init() {
    return loadCSS(import.meta.url, "./component_pager.css");
}
