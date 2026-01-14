import { createElement, nop } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import { createModal, MODAL_RIGHT_BUTTON } from "../../components/modal.js";
import notification from "../../components/notification.js";
import { query as getConfig } from "../../model/config.js";

import { formObjToJSON$ } from "./helper_form.js";
import { getBackendAvailable, getMiddlewareAvailable } from "./ctrl_storage_state.js";
import { get as getAdminConfig, save as saveConfig } from "./model_config.js";

export function getDeps({ getPassword = nop }) {
    return rxjs.combineLatest([
        getAdminConfig().pipe(formObjToJSON$()),
        getBackendAvailable(),
        getMiddlewareAvailable(),
        getConfig(),
    ]).pipe(
        rxjs.map(([{ constant, middleware }, backendSpecs, authSpecs, { connections }]) => ([
            {
                name_success: "You're using HTTPS",
                name_failure: "Your connection isn't encrypted",
                pass: window.location.protocol !== "http:",
                severe: true,
                message: createElement("<i>Set up HTTPS to secure your connection and protect your data in transit</i>"),
            }, {
                name_success: "Running as non root user: '" + constant.user + "'",
                name_failure: "Running as root",
                pass: constant.user !== "root",
                severe: true,
                message: createElement("<i>You should run as a non-privileged user, running as root is risky.</i>"),
            }, {
                pass: false,
                severe: connections.length === 0,
                name_failure: connections.length === 0 ? "Almost there!" : "Want to try something different?",
                message: withPreset(createElement(`
                    <div id="configuration-preset">
                        <i>Pick a preset that best fits your needs:</i><br>
                        <div data-bind="templates"></div>
                        <div class="note">
                            Notes: Templates get you started quickly, but they're just scratching the surface.
                            Want more? Head to <a href="admin/storage">/admin/storage</a> to wire up your own storage, authentication via SSO, and RBAC authorization.
                        </div>
                        <style>${CSS}</style>
                    </div>
                `), {
                    password: getPassword(),
                    hasStorage: (name, field = null) => !!backendSpecs[name] && (field === null ? true : !!backendSpecs[name][field]),
                    hasAuth: (name) => !!authSpecs[name]
                }),
            }, {
                name_success: "Enterprise Support: active",
                name_failure: "Enterprise Support: no",
                pass: constant.license !== "agpl",
                message: createElement("<i>Need guaranteed response times? Upgrade to a support plan with 9x5 or 24x7 coverage and SLAs</i>"),
            }, {
                name_success: "Enterprise License: active",
                name_failure: "You're on the AGPL version",
                pass: constant.license !== "agpl",
                message: createElement("<i>Upgrade to Filestash enterprise for production usage in a commercial environment</i>"),
            }
        ])),
    );
}

function withPreset($preset, { password, hasStorage, hasAuth }) {
    const TEMPLATES = [
        {
            name: "Local files - just for me",
            success: createElement("<span>Ready! Visit <a class=\"wavy\" href=\"login\">/login</a> with your admin password to start browsing files.</span>"),
            output_connections: [{ "type": "local", "label": "local" }],
            output_identity_provider: { "type": "passthrough", "params": "{\"strategy\":\"password_only\"}" },
            output_attribute_mapping: { "related_backend": "local", "params": "{\"local\":{\"type\":\"local\",\"password\":\"{{ .password }}\"}}" },
            isOK: hasStorage("local") && hasAuth("passthrough"),
        },
        {
            name: "Local Storage - Local Users",
            success: createElement("<span>Applied! Create your first users from <a class=\"wavy\" href=\"admin/simple-user-management\">/admin/simple-user-management</a></span>"),
            input_storage: password ? null : ["admin_password"],
            output_connections: [{ "type": "local", "label": "local" }],
            output_identity_provider: { "type": "local", "params": "{}" },
            output_attribute_mapping: {
                "related_backend": "local",
                "params": "{\"local\":{\"type\":\"local\",\"password\":\""+(password || "[[admin_password]]") +"\"}}",
            },
            isOK: hasStorage("local") && hasAuth("local"),
        },
        {
            name: "SFTP Storage - Use existing credentials",
            success: createElement("<span>Done! Visit <a class=\"wavy\" href=\"login\">/login</a> and authenticate with your SFTP username and password or private key.</span>"),
            input_storage: ["sftp_hostname"],
            output_connections: [{ "type": "sftp", "label": "sftp" }],
            output_identity_provider: { "type": "passthrough", "params": "{\"strategy\":\"username_and_password\"}" },
            output_attribute_mapping: { "related_backend": "sftp", "params": "{\"sftp\":{\"type\":\"sftp\",\"hostname\":\"[[sftp_hostname]]\",\"username\":\"{{ .user }}\",\"password\":\"{{ .password }}\"}}" },
            isOK: hasStorage("sftp") && hasAuth("passthrough"),
        },
        {
            name: "S3 Storage - Use your AWS credentials",
            success: createElement("<span>All set! Visit <a class=\"wavy\" href=\"login\">/login</a> - use your access_key_id as username, secret_access_key as password.</span>"),
            output_connections: [{ "type": "s3", "label": "s3" }],
            output_identity_provider: { "type": "passthrough", "params": "{\"strategy\":\"username_and_password\"}" },
            output_attribute_mapping: { "related_backend": "s3", "params": "{\"s3\":{\"type\":\"s3\",\"access_key_id\":\"{{ .user }}\",\"secret_access_key\":\"{{ .password }}\"}}" },
            isOK: hasStorage("s3") && hasAuth("passthrough"),
        },
        {
            name: "S3 Storage - Multiple users",
            success: createElement("<span>All set! Create your first users from <a class=\"wavy\" href=\"admin/simple-user-management\">/admin/simple-user-management</a></span>"),
            input_storage: ["access_key_id", "secret_access_key"],
            output_connections: [{ "type": "s3", "label": "s3" }],
            output_identity_provider: { "type": "local", "params": "{}" },
            output_attribute_mapping: { "related_backend": "s3", "params": "{\"s3\":{\"type\":\"s3\",\"access_key_id\":\"[[access_key_id]]\",\"secret_access_key\":\"[[secret_access_key]]\"}}" },
            isOK: hasStorage("s3") && hasAuth("local"),
        },
        {
            name: "FTP Storage - WordPress Users",
            success: createElement("<span>Done! Visit <a class=\"wavy\" href=\"login\">/login</a> - use your wordpress credentials to access your FTP.</span>"),
            input_storage: ["ftp_hostname", "ftp_username", "ftp_password"],
            input_auth: ["wordpress_url"],
            output_connections: [{ "type": "ftp", "label": "ftp" }],
            output_identity_provider: { "type": "wordpress", "params": "{\"url\":\"[[wordpress_url]]\"}" },
            output_attribute_mapping: { "related_backend": "ftp", "params": "{\"ftp\":{\"type\":\"ftp\",\"hostname\":\"[[ftp_hostname]]\",\"username\":\"[[ftp_username]]\",\"password\":\"[[ftp_password]]\"}}" },
            isOK: hasStorage("ftp") && hasAuth("wordpress"),
        },
    ];

    const $templates = qs($preset, `[data-bind="templates"]`);
    const onClick = (specs) => {
        return async() => {
            if (!specs.isOK) return createModal({ withButtonsRight: "OK" })(createElement(`
                <div>
                    Your build is missing some plugins. Contact Support
                </div>
            `));
            const output = {
                connections: specs.output_connections,
                identity_provider: specs.output_identity_provider,
                attribute_mapping: specs.output_attribute_mapping,
            };
            const $form = createElement("<form id=\"configuration-preset-modal\"></form>");
            $form.onsubmit = (e) => e.preventDefault();
            const save = await new Promise((done) => {
                console.log(specs);
                const fields = (specs.input_storage || []).concat(specs.input_auth || []);
                if (fields.length === 0) return done(true);
                fields.forEach((fieldName) => $form.appendChild(createElement(`
                    <label class="no-select">
                        ${fieldName}
                        <input class="component_input" type="text" name="${fieldName}" />
                    </label>
                `)));
                createModal({ withButtonsRight: "Apply" })($form, (choice, $modal) => {
                    if (choice !== MODAL_RIGHT_BUTTON) return done(false);
                    let ok = false;
                    qsa($modal, "input").forEach(($input) => {
                        if ($input.value) ok = true;
                        output.identity_provider.params = output.identity_provider.params.replaceAll("[["+$input.getAttribute("name")+"]]", $input.value.replaceAll(`"`, `\"`));
                        output.attribute_mapping.params = output.attribute_mapping.params.replaceAll("[["+$input.getAttribute("name")+"]]", $input.value.replaceAll(`"`, `\"`));
                    });
                    done(ok);
                });
            });
            if (save === false) return;
            await getAdminConfig().pipe(
                rxjs.first(),
                formObjToJSON$(),
                rxjs.map((config) => {
                    config.connections = output.connections;
                    config.middleware.attribute_mapping = output.attribute_mapping;
                    config.middleware.identity_provider = output.identity_provider;
                    return config;
                }),
                saveConfig(),
                rxjs.tap(() => notification.success(specs.success)),
                rxjs.catchError((err) => {
                    notification.error(err.message);
                    return rxjs.throwError(err);
                }),
            ).toPromise();
        };
    };
    TEMPLATES.map((specs) => {
        const $div = createElement(`<div></div>`);
        const $button = document.createElement("button");
        $button.className = "no-select";
        $button.innerText = `APPLY PRESET`;
        $button.onclick = onClick(specs);
        $div.appendChild($button);
        $div.appendChild(createElement(`<span> &#x27A1; ${specs.name || "N/A"}</span>`));
        return $div;
    }).forEach(($button) => $templates.appendChild($button));

    return $preset;
}

const CSS = `
#configuration-preset .note {
    font-style: italic;
    text-align: justify;
    padding: 5px 10px;
    margin-top: 10px;
    border: 2px dashed rgba(255,255,255,0.2);
    font-size: 0.95rem;
}

#configuration-preset a {
    text-decoration: underline;
    text-decoration-style: wavy;
    text-decoration-color: rgba(0, 0, 0, 0.3);
}

#configuration-preset button {
    background: rgba(0, 0, 0, 0.3);
    margin: 2px 0;
    padding: 5px 9px;
    text-transform: uppercase;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
    font-size: 0.92rem;
}

.touch-no #configuration-preset button:hover {
    background: rgba(0, 0, 0, 0.45);
}

#configuration-preset-modal label {
    font-size: 0.9rem;
}
`;
