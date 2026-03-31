import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, preventDefault } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { MODAL_RIGHT_BUTTON } from "../../components/modal.js";
import t from "../../locales/index.js";

export default function(render, filename, file, userInfo) {
    return document.body.classList.contains("touch-yes")
        ? renderMobile(render, filename, file, userInfo)
        : renderDesktop(render, filename, file, userInfo);
}

function renderDesktop(render, filename, file, userInfo) {
    const safeFile = file || {};
    const safeUserInfo = sanitizeUserInfo(userInfo);
    const permissionsValue = extractPermissions(safeFile);
    const ownerLabel = safeFile.uid === undefined
        ? "Unknown"
        : (safeFile.uid === safeUserInfo.uid ? "You" : safeFile.uid);
    const groupLabel = formatGroupLabel(safeFile.gid, safeUserInfo);

    const $modal = createElement(`
        <div>
            <b>${filename}</b><br/>
            ${"Owner: " + ownerLabel}<br/>
            ${"Group: " + groupLabel}<br/><br/>
            Permissions:
            <form style="margin-top: 10px;">
                <div id="checkbox-grid"></div>
                <div class="modal-error-message"></div>
            </form>
        </div>
    `);

    const permissions = permissionsToList(permissionsValue);
    const gridContainer = qs($modal, "#checkbox-grid");
    const allDisabled = (
        safeFile.uid !== undefined &&
        safeUserInfo.uid !== undefined &&
        safeFile.uid !== safeUserInfo.uid
    );

    const rowTitles = ["User", "Group", "All"];
    const columnLabels = ["Read", "Write", "Execute"];

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";

    for (let row = 0; row < 3; row++) {
        const tr = document.createElement("tr");

        const labelTd = document.createElement("td");
        labelTd.textContent = rowTitles[row] || `Row ${row + 1}`;
        labelTd.style.paddingRight = "10px";
        tr.appendChild(labelTd);

        for (let col = 0; col < 3; col++) {
            const td = document.createElement("td");
            td.style.paddingRight = "10px";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            const cbId = `cb-${row}-${col}`;
            checkbox.id = cbId;
            checkbox.disabled = allDisabled;
            checkbox.checked = permissions[row * 3 + col] ?? false;

            const label = document.createElement("label");
            label.htmlFor = cbId;
            label.style.userSelect = "none";
            label.textContent = columnLabels[col] ?? "";
            label.style.cursor = "pointer";

            td.appendChild(checkbox);
            td.appendChild(label);
            tr.appendChild(td);
        }

        table.appendChild(tr);
    }
    gridContainer.appendChild(table);

    const ret = new rxjs.Subject();
    const pressOK = render($modal, function(id) {
        if (id !== MODAL_RIGHT_BUTTON) {
            return;
        }

        const values = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const cb = document.getElementById(`cb-${row}-${col}`);
                if (cb && cb instanceof HTMLInputElement) {
                    values.push(cb.checked);
                }
            }
        }

        const perm = permissionsToString(values);
        ret.next(perm);
        ret.complete();
    }).bind(null, MODAL_RIGHT_BUTTON);

    effect(rxjs.fromEvent(qs($modal, "form"), "submit").pipe(
        preventDefault(),
        rxjs.tap(pressOK),
    ));

    return ret.toPromise();
}

function renderMobile(_, filename, file) {
    const safeFile = file || {};
    const currentPerms = permissionsToString(permissionsToList(extractPermissions(safeFile)));
    return new Promise((done) => {
        const value = window.prompt(t("Enter permissions (e.g. 755)"), currentPerms);
        if (!value || !/^\d{3}$/.test(value)) {
            return;
        }
        done(value);
    });
}

function sanitizeUserInfo(userInfo) {
    return {
        uid: userInfo?.uid,
        gids: Array.isArray(userInfo?.gids) ? userInfo.gids : [],
        gnames: Array.isArray(userInfo?.gnames) ? userInfo.gnames : [],
    };
}

function formatGroupLabel(gid, userInfo) {
    if (gid === undefined) {
        return "Unknown";
    }
    const idx = userInfo.gids.indexOf(gid);
    if (idx === -1) {
        return gid;
    }
    return userInfo.gnames[idx] || gid;
}

function extractPermissions(file) {
    if (typeof file.perms === "number") {
        return file.perms;
    }
    if (typeof file.perms === "string" && file.perms !== "") {
        const parsed = parseInt(file.perms, 8);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    if (typeof file.mode === "number") {
        return file.mode & 0o777;
    }
    return 0o644;
}

/**
 * @returns {boolean[]}
 */
function permissionsToList(permissions) {
    const normalized = Number.isFinite(permissions) ? (permissions & 0o777) : 0o644;
    const perms = normalized.toString(8).padStart(3, "0");
    const ret = [];

    for (let i = 0; i < 3; i++) {
        let groupPerms = parseInt(perms[i], 10);
        for (let j = 2; j >= 0; j--) {
            if (groupPerms >= 2 ** j) {
                ret.push(true);
                groupPerms -= 2 ** j;
            } else {
                ret.push(false);
            }
        }
    }
    return ret;
}

function permissionsToString(list) {
    let ret = 0;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (list[i * 3 + j]) {
                ret += 2 ** (2 - j);
            }
        }
        if (i !== 2) {
            ret *= 10;
        }
    }
    return ret.toString(10);
}
