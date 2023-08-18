import { createElement } from "../../lib/skeleton/index.js";

export default function(render) {
    const $page = createElement(`
<div class="box-container">
  <div class="box-item pointer no-select">
    <div>admin <span class="no-select">
        <span class="icon">+</span>
      </span>
    </div>
  </div>
  <div class="box-item pointer no-select">
    <div>htpasswd <span class="no-select">
        <span class="icon">+</span>
      </span>
    </div>
  </div>
  <div class="box-item pointer no-select">
    <div>ldap <span class="no-select">
        <span class="icon">+</span>
      </span>
    </div>
  </div>
  <div class="box-item pointer no-select active">
    <div>openid <span class="no-select">
        <span class="icon">
          <img class="component_icon" draggable="false" src="/assets/icons/delete.svg" alt="delete">
        </span>
      </span>
    </div>
  </div>
  <div class="box-item pointer no-select">
    <div>passthrough <span class="no-select">
        <span class="icon">+</span>
      </span>
    </div>
  </div>
  <div class="box-item pointer no-select">
    <div>saml <span class="no-select">
        <span class="icon">+</span>
      </span>
    </div>
  </div>
</div>
    `);
    render($page);
}
