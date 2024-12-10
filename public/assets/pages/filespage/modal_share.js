import { createElement, createRender } from "../../lib/skeleton/index.js";
import { toHref } from "../../lib/skeleton/router.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import assert from "../../lib/assert.js";
import ajax from "../../lib/ajax.js";
import { forwardURLParams, join } from "../../lib/path.js";
import { qs, qsa } from "../../lib/dom.js";
import { randomString } from "../../lib/random.js";
import { animate } from "../../lib/animate.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";
import notification from "../../components/notification.js";
import t from "../../locales/index.js";

import { currentPath, isDir } from "./helper.js";

const IMAGE = {
    COPY: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjUzMzMzMzM2O3N0cm9rZS13aWR0aDowLjYzOTk5OTk5IiBkPSJNNDY0IDBIMTQ0Yy0yNi41MSAwLTQ4IDIxLjQ5LTQ4IDQ4djQ4SDQ4Yy0yNi41MSAwLTQ4IDIxLjQ5LTQ4IDQ4djMyMGMwIDI2LjUxIDIxLjQ5IDQ4IDQ4IDQ4aDMyMGMyNi41MSAwIDQ4LTIxLjQ5IDQ4LTQ4di00OGg0OGMyNi41MSAwIDQ4LTIxLjQ5IDQ4LTQ4VjQ4YzAtMjYuNTEtMjEuNDktNDgtNDgtNDh6TTM2MiA0NjRINTRhNiA2IDAgMCAxLTYtNlYxNTBhNiA2IDAgMCAxIDYtNmg0MnYyMjRjMCAyNi41MSAyMS40OSA0OCA0OCA0OGgyMjR2NDJhNiA2IDAgMCAxLTYgNnptOTYtOTZIMTUwYTYgNiAwIDAgMS02LTZWNTRhNiA2IDAgMCAxIDYtNmgzMDhhNiA2IDAgMCAxIDYgNnYzMDhhNiA2IDAgMCAxLTYgNnoiLz4KPC9zdmc+Cg==",
    LOADING: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0nMTIwcHgnIGhlaWdodD0nMTIwcHgnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIiBjbGFzcz0idWlsLXJpbmctYWx0Ij4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIgY2xhc3M9ImJrIj48L3JlY3Q+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0ibm9uZSIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSIjNmY2ZjZmIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJzdHJva2UtZGFzaG9mZnNldCIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIGZyb209IjAiIHRvPSI1MDIiPjwvYW5pbWF0ZT4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InN0cm9rZS1kYXNoYXJyYXkiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE1MC42IDEwMC40OzEgMjUwOzE1MC42IDEwMC40Ij48L2FuaW1hdGU+CiAgPC9jaXJjbGU+Cjwvc3ZnPgo=",
    DELETE: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODIuNDI4IDQ4Mi40MjkiPgogIDxwYXRoIHN0eWxlPSJmaWxsOiM2ZjZmNmY7c3Ryb2tlLXdpZHRoOjAuOTQ3MjAwNTQiIGQ9Im0gMjM5LjcxMDM4LDEwLjg1ODU2NyBjIC0yOS4yODYzMywwLjE0ODk1OSAtNTYuMjI4MjEsMjMuMTU4MTY3IC02MS4xMzg4Myw1MS45OTYxMjkgLTAuMDM1OSw1LjUyMjQ0IC04LjExOTM2LDEuNTIzODUyIC0xMS44MTQxMSwyLjczNDMwMSAtMjEuNjU5MywwLjM1NzE4IC00My4zODAyLC0wLjY3Njg3NSAtNjUuMDA3MTksMC40Mzg0NTIgLTI1Ljc0Mzk2MSwyLjgxNDg5NiAtNDcuMDQxMDg0LDI2LjM4MTc2IC00Ny4xNzMxNzIsNTIuMjkyMTMxIC0xLjcyMjExOCwyMi4zMjI3NyAxMS42Nzg0MSw0NC43NzgwOSAzMi4zMjg3NjgsNTMuNTM1MzIgMS41MDI3NjcsNy4xMzU1IDAuMjE0MTksMTYuMTEyMjggMC42NDM4LDIzLjk1NTY4IDAuMTEwMTQ1LDc1LjI4MzExIC0wLjIxODQzMywxNTAuNTc3MzcgMC4xNjA5NSwyMjUuODUzNjcgMS40ODk4MDUsMjUuODUxOTIgMjMuOTUyNDE0LDQ4LjI5NzYgNDkuODA1NzI0LDQ5Ljc2Njg3IDY4Ljk5NTMyLDAuMjc5OTggMTM4LjAxNjU0LDAuMjI5NjYgMjA3LjAxMzE3LDAuMDI0NyAyNi4wMTg1MiwtMS4yNzY5MSA0OC43MjA1LC0yMy44MzQ0MyA1MC4xOTI0OSwtNDkuODM3NjcgMC4zNjUyOCwtODMuMTUzOTggMC4wNDk3LC0xNjYuMzI1MDggMC4xNTUzOCwtMjQ5LjQ4NTU4IDIwLjg0ODU5LC04LjUyMTk5IDM0LjU5NTY3LC0zMC45NzQ5OSAzMi45NzkzNiwtNTMuNDExMzEgMC4wNzUyLC0yNi4wNzE2MTEgLTIxLjMyNDY5LC00OS45MDA0NDIgLTQ3LjIyOTkxLC01Mi42OTkyMDYgLTI0LjY2MTA5LC0xLjA5MzY1MSAtNDkuNDEyODgsLTAuMDg0ODcgLTc0LjEwNTUsLTAuNDMyOSAtMy45NDgzNywwLjYxMjkxMSAtMi4zMDc4NywtNS4zNzQ4NTkgLTMuODc5MTQsLTcuOTc4OTIzIC03LjI2MTcsLTI3LjU4NzA0MiAtMzQuMzcxMDIsLTQ3Ljg1NDgyMzggLTYyLjkzMTc5LC00Ni43NTE2NDMgeiBtIDEuNTA0MDQsMjguNTMwNzE3IGMgMTUuNDcwMDYsLTAuMzA1NjE5IDMwLjI2NjY3LDExLjA4NDk0OCAzNC4wMzQ0NywyNi4xOTk3MTMgLTIyLjY4MzQsLTAuMDA1OSAtNDUuMzk2OTIsMC4wMTIzMyAtNjguMDYxNTQsLTAuMDA5MiAzLjgwNzAyLC0xNS4wNzAyMDQgMTguMzQxMTcsLTI2LjQxOTgyMyAzNC4wMjcwNywtMjYuMTkwNDYzIHogTSAxMDguNjc4NTEsOTQuMTM2MzYzIGMgODkuNDUyNTcsMC4xMzkxNjYgMTc4LjkyODgzLC0wLjI3NzY1MSAyNjguMzY2NjksMC4yMDcyIDEzLjc0MTMxLDEuNDE4NTc4IDIzLjkyNjY0LDE1LjE3NjA3NyAyMi4yNjY2MiwyOC43MDgzMTcgMC4wMzI1LDE0LjU1MDU0IC0xNC4wNzUxNCwyNi41NjAyNiAtMjguNDA0OTIsMjQuODcxNDIgLTg4LjUwNjYsLTAuMTQwMzcgLTE3Ny4wMzY5MSwwLjI4MDA2IC0yNjUuNTI4OCwtMC4yMDkwNiBDIDkxLjEyNTU5LDE0Ni4yNDIyMyA4MC45ODkyODUsMTMxLjcwMTYzIDgzLjE4MTc5NCwxMTcuNzAxNjggODMuOTcwODg3LDEwNC43NDEzIDk1LjU3NzEzMSw5My45MjA1OTYgMTA4LjY3ODUxLDk0LjEzNjM2MyBaIE0gMzY2LjMzLDE3Ni40NzA2NiBjIC0wLjE0MDc3LDgxLjQyODQ4IDAuMjgwNjIsMTYyLjg4MDcgLTAuMjA5MDUsMjQ0LjI5NDQ3IC0xLjQzODYyLDEzLjkxMTUxIC0xNS40NzY4NSwyNC4xMDU4OCAtMjkuMTUyMzIsMjIuMjc1ODggLTY2LjE5Njc4LC0wLjE0MTYyIC0xMzIuNDE3NDMsMC4yODE3NSAtMTk4LjU5OTQ1LC0wLjIwOTA2IC0xMy44OTE2OSwtMS40NDg4IC0yNC4xMTkwOSwtMTUuNDc1NzUgLTIyLjI3MjE2LC0yOS4xNTc4NiAwLC03OS4wNjc4MSAwLC0xNTguMTM1NjEgMCwtMjM3LjIwMzQzIDgzLjQxMDk4LDAgMTY2LjgyMTk4LDAgMjUwLjIzMjk4LDAgeiIgLz4KICA8cGF0aCBzdHlsZT0iZmlsbDojNmY2ZjZmO3N0cm9rZS13aWR0aDowLjk4MjA4MSIgZD0ibSAxNzEuNjg2NDQsMjQ3LjQ3Mzc5IGMgLTkuMzQ2NzYsMC4xNTY0NCAtMTUuNzQwMzIsOS44ODgwNSAtMTQuMDg2NzMsMTguNzExMzMgMC4xMjM1MSw0Ny42MjcwMSAtMC4yNDQwMSw5NS4yNzkwMyAwLjE3ODM5LDE0Mi44OTA4NyAxLjIwNzY0LDEwLjk3MTM2IDE1LjkxODAzLDE2LjUyNzk0IDI0LjA3MjQ5LDkuMDg0MjUgOC40MTc1OSwtNi44MTg4NyA0LjQ3NDY5LC0xOC44ODM5MiA1LjM0Nzc0LC0yOC4wODEzOCAtMC4xMjQzOSwtNDMuMzcxMjcgMC4yNDUyLC04Ni43Njc4NCAtMC4xNzgzOSwtMTMwLjEyMzgxIC0xLjAzNzk1LC03LjMxNDM5IC03Ljk1MDU0LC0xMi45NTcwNSAtMTUuMzMzNSwtMTIuNDgxMjYgeiIgLz4KICA8cGF0aCBzdHlsZT0iZmlsbDojNmY2ZjZmO3N0cm9rZS13aWR0aDowLjk4MjA4MSIgZD0ibSAyNDAuNTAxMTYsMjQ3LjQ3Mzc5IGMgLTkuMzQ2NDksMC4xNTYxNiAtMTUuNzQwNjcsOS44ODgxNyAtMTQuMDg2NzMsMTguNzExMzMgMC4xMjM1Miw0Ny42MjcwMSAtMC4yNDQwMSw5NS4yNzkwMyAwLjE3ODM5LDE0Mi44OTA4NyAxLjgwNTA0LDE3LjU2NDg5IDMwLjM3NDEyLDE1LjM0MjI3IDI5LjQyMDIzLC0yLjMwMTc2IC0wLjEyMzMzLC00OC45MzY0MiAwLjI0Mzc3LC05Ny44OTgyIC0wLjE3ODM4LC0xNDYuODE5MTggLTEuMDM3MzUsLTcuMzE0MSAtNy45NTEwMSwtMTIuOTU2OTQgLTE1LjMzMzUxLC0xMi40ODEyNiB6IiAvPgogIDxwYXRoIHN0eWxlPSJmaWxsOiM2ZjZmNmY7c3Ryb2tlLXdpZHRoOjAuOTgyMDgxIiBkPSJtIDMwOS4zMTU4OCwyNDcuNDczNzkgYyAtOS4zNDcxMSwwLjE1NTMgLTE1Ljc0MzE0LDkuODg3MTMgLTE0LjA4NjcyLDE4LjcxMTMzIDAuMTIzNTQsNDcuNjI0OTkgLTAuMjQ0MDYsOTUuMjc1ODEgMC4xNzgzOCwxNDIuODg1MTEgMS4xOTg1NiwxMC45NzMyMSAxNS45MTY2NCwxNi41MzYwNiAyNC4wNzA1OCw5LjA5MDAxIDguNDE5MzMsLTYuODE3ODcgNC40NzM2NiwtMTguODg0MiA1LjM0Nzc0LC0yOC4wODEzOCAtMC4xMjQ0MiwtNDMuMzcxMjQgMC4yNDUyNCwtODYuNzY4MDQgLTAuMTc4MzksLTEzMC4xMjM4MSAtMS4wMzY3NCwtNy4zMTMyMSAtNy45NTAxMiwtMTIuOTU2NTggLTE1LjMzMTU5LC0xMi40ODEyNiB6IiAvPgo8L3N2Zz4K",
    EDIT: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjkgMTI5Ij4KICA8cGF0aCBmaWxsPSIjNkY2RjZGIiBkPSJtMTE5LjIsMTE0LjNoLTEwOS40Yy0yLjMsMC00LjEsMS45LTQuMSw0LjFzMS45LDQuMSA0LjEsNC4xaDEwOS41YzIuMywwIDQuMS0xLjkgNC4xLTQuMXMtMS45LTQuMS00LjItNC4xeiIgLz4KICA8cGF0aCBmaWxsPSIjNkY2RjZGIiBkPSJtNS43LDc4bC0uMSwxOS41YzAsMS4xIDAuNCwyLjIgMS4yLDMgMC44LDAuOCAxLjgsMS4yIDIuOSwxLjJsMTkuNC0uMWMxLjEsMCAyLjEtMC40IDIuOS0xLjJsNjctNjdjMS42LTEuNiAxLjYtNC4yIDAtNS45bC0xOS4yLTE5LjRjLTEuNi0xLjYtNC4yLTEuNi01LjktMS43NzYzNmUtMTVsLTEzLjQsMTMuNS01My42LDUzLjVjLTAuNywwLjgtMS4yLDEuOC0xLjIsMi45em03MS4yLTYxLjFsMTMuNSwxMy41LTcuNiw3LjYtMTMuNS0xMy41IDcuNi03LjZ6bS02Mi45LDYyLjlsNDkuNC00OS40IDEzLjUsMTMuNS00OS40LDQ5LjMtMTMuNiwuMSAuMS0xMy41eiIvPgo8L3N2Zz4K",
};

export default function(render, { path }) {
    const $modal = createElement(`
        <div class="component_share">
            <h2>${t("Create a New Link")}</h2>
            <div class="share--content link-type no-select">
                <div data-role="viewer">${t("Viewer")}</div>
                <div data-role="editor">${t("Editor")}</div>
                <div data-role="uploader" class="${isDir(path) ? "" : "hidden"}">${t("Uploader")}</div>
            </div>
            <div data-bind="share-body"></div>
        </div>
    `);
    render($modal);
    const ret = new rxjs.Subject();
    const role$ = new rxjs.BehaviorSubject(null);

    const state = {
        /** @type {object} */ form: {},
        /** @type {any[] | null} */ links: null,
    };

    // feature: select
    const toggle = (val) => rxjs.mergeMap(() => {
        state.form = {};
        role$.next(role$.value === val ? null : val);
        return rxjs.EMPTY;
    });
    effect(rxjs.merge(
        onClick(qs($modal, `[data-role="viewer"]`)).pipe(toggle("viewer")),
        onClick(qs($modal, `[data-role="editor"]`)).pipe(toggle("editor")),
        onClick(qs($modal, `[data-role="uploader"]`)).pipe(toggle("uploader")),
        role$.asObservable(),
    ).pipe(rxjs.tap(() => {
        const ctrl = role$.value === null ? ctrlListShares : ctrlCreateShare;

        // feature: set active button
        for (const $button of qs($modal, ".share--content").children) {
            $button.getAttribute("data-role") === role$.value
                ? $button.classList.add("active")
                : $button.classList.remove("active");
        }

        // feature: render body and associated events
        ctrl(createRender(qs($modal, `[data-bind="share-body"]`)), {
            formState: {
                path,
                ...state.form,
            },
            formLinks: state.links,
            load: (data) => {
                const role = shareObjToRole(data);
                state.form = {
                    ...data,
                    url_enable: !!data.url,
                    password_enable: !!data.password,
                    expire_enable: !!data.expire,
                    users_enable: !!data.users,
                };
                role$.next(role);
            },
            save: async({ id, ...data }) => {
                const body = { id, path, ...data, ...roleToShareObj(role$.value) };
                await ajax({
                    method: "POST",
                    body,
                    url: `api/share/${id}`,
                }).toPromise();
                assert.truthy(state.links).push({
                    ...body,
                    path: body.path.substring(currentPath().length - 1),
                });
                role$.next(null);
            },
            remove: async({ id }) => {
                await ajax({
                    method: "DELETE",
                    url: `api/share/${id}`,
                }).toPromise();
                state.links = (state.links || []).filter((link) => link && link.id !== id);
                role$.next(null);
            },
            all: async() => {
                const { responseJSON } = await ajax({
                    url: `api/share?path=` + encodeURIComponent(path),
                    method: "GET",
                    responseType: "json",
                }).toPromise();
                const currentFolder = path.replace(new RegExp("/$"), "").split("/").pop();
                const sharedLinkIsFolder = new RegExp("/$").test(path);
                state.links = responseJSON.results.map((obj) => {
                    obj.path = sharedLinkIsFolder
                        ? `./${currentFolder}${obj.path}`
                        : `./${currentFolder}`;
                    return obj;
                }).sort((a, b) => {
                    if (a.path === b.path) return a.id > b.id ? 1 : -1;
                    return a.path > b.path ? 1 : -1;
                });
                return state.links;
            },
        });
    })));

    return ret.toPromise();
}

async function ctrlListShares(render, { load, remove, all, formLinks }) {
    const $page = createElement(`
        <div class="hidden">
            <h2>${t("Existing Links")}</h2>
            <div class="share--content existing-links" style="max-height: 90px;">
                 <component-icon name="loading"></component-icon>
            </div>
        </div>
    `);
    render($page);

    effect(rxjs.merge(
        rxjs.of(formLinks).pipe(rxjs.filter((val) => val !== null)),
        rxjs.from(all()),
    ).pipe(rxjs.tap((links) => {
        if (links.length === 0) {
            $page.classList.add("hidden");
            return;
        }
        $page.classList.remove("hidden");

        const $fragment = document.createDocumentFragment();
        const $content = qs($page, ".share--content");
        let length = links.length;
        links.forEach((shareObj) => {
            const $share = createElement(`
                <div class="link-details no-select">
                    <div class="copy role ellipsis">${t(shareObjToRole(shareObj))}</div>
                    <div class="copy path ellipsis" title="${shareObj.path}">${shareObj.path}</div>
                    <div class="link-details--icons">
                        <img class="component_icon" draggable="false" src="${IMAGE.DELETE}" alt="delete">
                        <img class="component_icon" draggable="false" src="${IMAGE.EDIT}" alt="edit">
                    </div>
                </div>
            `);
            qsa($share, ".copy").forEach(($el) => $el.onclick = () => {
                const link = location.origin + forwardURLParams(toHref(`/s/${shareObj.id}`), ["share"]);
                copyToClipboard(link);
                notification.info(t("The link was copied in the clipboard"));
            });
            qs($share, `[alt="delete"]`).onclick = async() => {
                $share.remove();
                length -= 1;
                if (length === 0) $content.replaceChildren(createElement(`
                    <component-icon name="loading"></component-icon>
                `));
                await remove(shareObj);
            };
            qs($share, `[alt="edit"]`).onclick = () => load(shareObj);
            $fragment.appendChild($share);
        });
        $content.replaceChildren($fragment);
    })));
}

async function ctrlCreateShare(render, { save, formState }) {
    const enc = (p) => encodeURIComponent(p).replaceAll("%2F", "/");
    if (formState.path) formState.path = join(
        location.origin + enc(currentPath()),
        enc(formState.path),
    );
    let id = formState.id || randomString(7);
    const $page = createElement(`
        <div>
            <h2 class="no-select pointer">${t("Advanced")}<span><img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MC41MzMzMzMyMSIgZD0ibSA3LjcwNSw4LjA0NSA0LjU5LDQuNTggNC41OSwtNC41OCAxLjQxLDEuNDEgLTYsNiAtNiwtNiB6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" alt="arrow_bottom"></span></h2>
            <form class="share--content restrictions no-select"></form>
            <div class="shared-link">
                <input name="create" class="copy" type="text" readonly="" value="${location.origin}${toHref("/s/" + id)}">
                <button title="Copy URL">
                    <img class="component_icon" draggable="false" src="${IMAGE.COPY}" alt="copy">
                </button>
            </div>
        </div>
    `);
    render($page);
    const $body = qs($page, ".restrictions");

    // feature1: setup the shared link form
    const formSpec = {
        users_enable: {
            type: "enable",
            label: t("Only for users"),
            target: ["users"],
            default: false,
        },
        users: {
            id: "users",
            type: "text",
            placeholder: "name0@email.com,name1@email.com",
        },
        password_enable: {
            label: t("Password"),
            type: "enable",
            target: ["password"],
            default: false,
        },
        password: {
            id: "password",
            type: "text",
            placeholder: t("Password"),
        },
        expire_enable: {
            label: t("Expiration"),
            type: "enable",
            target: ["expire"],
            default: false,
        },
        expire: {
            id: "expire",
            type: "date",
        },
        url_enable: {
            label: "link",
            type: "enable",
            target: ["link"],
            default: false,
        },
        url: {
            id: "link",
            type: "text",
        },
        path: {
            type: "hidden",
        },
    };
    const tmpl = formTmpl({
        renderNode: () => createElement("<div></div>"),
        renderLeaf: ({ label, type }) => {
            if (type !== "enable") return createElement("<label></label>");
            const title =
                  label === "users_enable"
                      ? t("Only for users")
                      : label === "expire_enable"
                          ? t("Expiration")
                          : label === "password_enable"
                              ? t("Password")
                              : label === "url_enable"
                                  ? t("Custom Link url")
                                  : assert.fail("unknown label");
            return createElement(`
                <div class="component_supercheckbox">
                    <label class="ellipsis">
                        <span data-bind="children"></span>
                        <span class="label">${title}</span>
                    </label>
                </div>
            `);
        },
    });
    const $form = await createForm(mutateForm(formSpec, formState), tmpl);
    $body.replaceChildren($form);
    const clientHeight = $body.offsetHeight;
    $body.classList.add("hidden");
    qs($page, "h2").onclick = async() => { // toggle advanced button
        if ($body.classList.contains("hidden")) {
            $body.classList.remove("hidden");
            await animate($body, {
                time: 200,
                keyframes: [{ height: "0" }, { height: `${clientHeight}px` }],
            });
            return;
        }
        await animate($body, {
            time: 100,
            keyframes: [{ height: `${clientHeight}px` }, { height: "0" }],
        });
        $body.classList.add("hidden");
    };
    // sync editable custom link input with link id
    effect(rxjs.fromEvent(qs($form, `[name="url"]`), "keyup").pipe(rxjs.tap((e) => {
        id = e.target.value.replaceAll(" ", "-").replace(new RegExp("[^A-Za-z\-]"), "");
        qs(assert.type($form.closest(".component_share"), HTMLElement), `input[name="create"]`).value = `${location.origin}${toHref("/s/" + id)}`;
    })));

    // feature: create a shared link
    const $copy = qs($page, `[alt="copy"]`);
    effect(onClick(qs($page, ".shared-link")).pipe(
        rxjs.first(),
        rxjs.switchMap(async() => {
            const form = new FormData(assert.type(qs(document.body, ".component_share form"), HTMLFormElement));
            const body = [...form].reduce((acc, [key, value]) => {
                if (form.has(`${key}_enable`)) acc[key] = value;
                return acc;
            }, { id, path: form.get("path") });
            $copy.setAttribute("src", IMAGE.LOADING);
            const link = location.origin + forwardURLParams(toHref(`/s/${id}`), ["share"]);
            await save(body);
            copyToClipboard(link);
            notification.info(t("The link was copied in the clipboard"));
        }),
        rxjs.catchError((err) => {
            $copy.setAttribute("src", IMAGE.COPY);
            notification.error(t(err.message));
            throw err;
        }),
        rxjs.retry(),
    ));
}

function roleToShareObj(role) {
    return {
        can_read: (function(r) {
            if (r === "viewer") return true;
            else if (r === "editor") return true;
            return false;
        }(role)),
        can_write: (function(r) {
            if (r === "editor") return true;
            return false;
        }(role)),
        can_upload: (function(r) {
            if (r === "uploader") return true;
            else if (r === "editor") return true;
            return false;
        }(role)),
    };
}

function shareObjToRole({ can_read, can_write, can_upload }) {
    if (can_read === true && can_write === false && can_upload === false) {
        return "viewer";
    } else if (can_read === false && can_write === false && can_upload === true) {
        return "uploader";
    } else if (can_read === true && can_write === true && can_upload === true) {
        return "editor";
    }
    return undefined;
}

export function copyToClipboard(str) {
    if (!str) return;
    const $input = document.createElement("input");
    $input.setAttribute("type", "text");
    $input.setAttribute("style", "position: absolute; top:0;left:0;background:red");
    $input.setAttribute("display", "none");
    document.body.appendChild($input);
    $input.value = str;
    $input.select();
    document.execCommand("copy");
    $input.remove();
}
