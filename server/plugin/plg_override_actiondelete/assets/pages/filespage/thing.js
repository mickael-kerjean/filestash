diff --git a/public/assets/pages/filespage/thing.js b/public/assets/pages/filespage/thing.js
index f6f0ec48..3c86ffcb 100644
--- a/public/assets/pages/filespage/thing.js
+++ b/public/assets/pages/filespage/thing.js
@@ -11,6 +11,14 @@ import { addSelection, isSelected, clearSelection } from "./state_selection.js";
 import { mv as mv$ } from "./model_files.js";
 import { mv as mvVL, withVirtualLayer } from "./model_virtual_layer.js";
 
+import rxjs from "../../lib/rx.js";
+import { rm as rm$ } from "./model_files.js";
+import { rm as rmVL } from "./model_virtual_layer.js";
+import { basename } from "../../lib/path.js";
+import t from "../../locales/index.js";
+import { createModal } from "../../components/modal.js";
+import componentDelete from "./modal_delete.js";
+
 const mv = (from, to) => withVirtualLayer(
     mv$(from, to),
     mvVL(from, to),
@@ -149,6 +157,27 @@ export function createThing({
         return $thing;
     }
 
+    let $action = $thing.querySelector(".component_action");
+    $action.innerHTML = `<img class="component_icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODIuNDI4IDQ4Mi40MjkiPgogIDxwYXRoIHN0eWxlPSJmaWxsOiM2ZjZmNmY7c3Ryb2tlLXdpZHRoOjAuOTQ3MjAwNTQiIGQ9Im0gMjM5LjcxMDM4LDEwLjg1ODU2NyBjIC0yOS4yODYzMywwLjE0ODk1OSAtNTYuMjI4MjEsMjMuMTU4MTY3IC02MS4xMzg4Myw1MS45OTYxMjkgLTAuMDM1OSw1LjUyMjQ0IC04LjExOTM2LDEuNTIzODUyIC0xMS44MTQxMSwyLjczNDMwMSAtMjEuNjU5MywwLjM1NzE4IC00My4zODAyLC0wLjY3Njg3NSAtNjUuMDA3MTksMC40Mzg0NTIgLTI1Ljc0Mzk2MSwyLjgxNDg5NiAtNDcuMDQxMDg0LDI2LjM4MTc2IC00Ny4xNzMxNzIsNTIuMjkyMTMxIC0xLjcyMjExOCwyMi4zMjI3NyAxMS42Nzg0MSw0NC43NzgwOSAzMi4zMjg3NjgsNTMuNTM1MzIgMS41MDI3NjcsNy4xMzU1IDAuMjE0MTksMTYuMTEyMjggMC42NDM4LDIzLjk1NTY4IDAuMTEwMTQ1LDc1LjI4MzExIC0wLjIxODQzMywxNTAuNTc3MzcgMC4xNjA5NSwyMjUuODUzNjcgMS40ODk4MDUsMjUuODUxOTIgMjMuOTUyNDE0LDQ4LjI5NzYgNDkuODA1NzI0LDQ5Ljc2Njg3IDY4Ljk5NTMyLDAuMjc5OTggMTM4LjAxNjU0LDAuMjI5NjYgMjA3LjAxMzE3LDAuMDI0NyAyNi4wMTg1MiwtMS4yNzY5MSA0OC43MjA1LC0yMy44MzQ0MyA1MC4xOTI0OSwtNDkuODM3NjcgMC4zNjUyOCwtODMuMTUzOTggMC4wNDk3LC0xNjYuMzI1MDggMC4xNTUzOCwtMjQ5LjQ4NTU4IDIwLjg0ODU5LC04LjUyMTk5IDM0LjU5NTY3LC0zMC45NzQ5OSAzMi45NzkzNiwtNTMuNDExMzEgMC4wNzUyLC0yNi4wNzE2MTEgLTIxLjMyNDY5LC00OS45MDA0NDIgLTQ3LjIyOTkxLC01Mi42OTkyMDYgLTI0LjY2MTA5LC0xLjA5MzY1MSAtNDkuNDEyODgsLTAuMDg0ODcgLTc0LjEwNTUsLTAuNDMyOSAtMy45NDgzNywwLjYxMjkxMSAtMi4zMDc4NywtNS4zNzQ4NTkgLTMuODc5MTQsLTcuOTc4OTIzIC03LjI2MTcsLTI3LjU4NzA0MiAtMzQuMzcxMDIsLTQ3Ljg1NDgyMzggLTYyLjkzMTc5LC00Ni43NTE2NDMgeiBtIDEuNTA0MDQsMjguNTMwNzE3IGMgMTUuNDcwMDYsLTAuMzA1NjE5IDMwLjI2NjY3LDExLjA4NDk0OCAzNC4wMzQ0NywyNi4xOTk3MTMgLTIyLjY4MzQsLTAuMDA1OSAtNDUuMzk2OTIsMC4wMTIzMyAtNjguMDYxNTQsLTAuMDA5MiAzLjgwNzAyLC0xNS4wNzAyMDQgMTguMzQxMTcsLTI2LjQxOTgyMyAzNC4wMjcwNywtMjYuMTkwNDYzIHogTSAxMDguNjc4NTEsOTQuMTM2MzYzIGMgODkuNDUyNTcsMC4xMzkxNjYgMTc4LjkyODgzLC0wLjI3NzY1MSAyNjguMzY2NjksMC4yMDcyIDEzLjc0MTMxLDEuNDE4NTc4IDIzLjkyNjY0LDE1LjE3NjA3NyAyMi4yNjY2MiwyOC43MDgzMTcgMC4wMzI1LDE0LjU1MDU0IC0xNC4wNzUxNCwyNi41NjAyNiAtMjguNDA0OTIsMjQuODcxNDIgLTg4LjUwNjYsLTAuMTQwMzcgLTE3Ny4wMzY5MSwwLjI4MDA2IC0yNjUuNTI4OCwtMC4yMDkwNiBDIDkxLjEyNTU5LDE0Ni4yNDIyMyA4MC45ODkyODUsMTMxLjcwMTYzIDgzLjE4MTc5NCwxMTcuNzAxNjggODMuOTcwODg3LDEwNC43NDEzIDk1LjU3NzEzMSw5My45MjA1OTYgMTA4LjY3ODUxLDk0LjEzNjM2MyBaIE0gMzY2LjMzLDE3Ni40NzA2NiBjIC0wLjE0MDc3LDgxLjQyODQ4IDAuMjgwNjIsMTYyLjg4MDcgLTAuMjA5MDUsMjQ0LjI5NDQ3IC0xLjQzODYyLDEzLjkxMTUxIC0xNS40NzY4NSwyNC4xMDU4OCAtMjkuMTUyMzIsMjIuMjc1ODggLTY2LjE5Njc4LC0wLjE0MTYyIC0xMzIuNDE3NDMsMC4yODE3NSAtMTk4LjU5OTQ1LC0wLjIwOTA2IC0xMy44OTE2OSwtMS40NDg4IC0yNC4xMTkwOSwtMTUuNDc1NzUgLTIyLjI3MjE2LC0yOS4xNTc4NiAwLC03OS4wNjc4MSAwLC0xNTguMTM1NjEgMCwtMjM3LjIwMzQzIDgzLjQxMDk4LDAgMTY2LjgyMTk4LDAgMjUwLjIzMjk4LDAgeiIgLz4KICA8cGF0aCBzdHlsZT0iZmlsbDojNmY2ZjZmO3N0cm9rZS13aWR0aDowLjk4MjA4MSIgZD0ibSAxNzEuNjg2NDQsMjQ3LjQ3Mzc5IGMgLTkuMzQ2NzYsMC4xNTY0NCAtMTUuNzQwMzIsOS44ODgwNSAtMTQuMDg2NzMsMTguNzExMzMgMC4xMjM1MSw0Ny42MjcwMSAtMC4yNDQwMSw5NS4yNzkwMyAwLjE3ODM5LDE0Mi44OTA4NyAxLjIwNzY0LDEwLjk3MTM2IDE1LjkxODAzLDE2LjUyNzk0IDI0LjA3MjQ5LDkuMDg0MjUgOC40MTc1OSwtNi44MTg4NyA0LjQ3NDY5LC0xOC44ODM5MiA1LjM0Nzc0LC0yOC4wODEzOCAtMC4xMjQzOSwtNDMuMzcxMjcgMC4yNDUyLC04Ni43Njc4NCAtMC4xNzgzOSwtMTMwLjEyMzgxIC0xLjAzNzk1LC03LjMxNDM5IC03Ljk1MDU0LC0xMi45NTcwNSAtMTUuMzMzNSwtMTIuNDgxMjYgeiIgLz4KICA8cGF0aCBzdHlsZT0iZmlsbDojNmY2ZjZmO3N0cm9rZS13aWR0aDowLjk4MjA4MSIgZD0ibSAyNDAuNTAxMTYsMjQ3LjQ3Mzc5IGMgLTkuMzQ2NDksMC4xNTYxNiAtMTUuNzQwNjcsOS44ODgxNyAtMTQuMDg2NzMsMTguNzExMzMgMC4xMjM1Miw0Ny42MjcwMSAtMC4yNDQwMSw5NS4yNzkwMyAwLjE3ODM5LDE0Mi44OTA4NyAxLjgwNTA0LDE3LjU2NDg5IDMwLjM3NDEyLDE1LjM0MjI3IDI5LjQyMDIzLC0yLjMwMTc2IC0wLjEyMzMzLC00OC45MzY0MiAwLjI0Mzc3LC05Ny44OTgyIC0wLjE3ODM4LC0xNDYuODE5MTggLTEuMDM3MzUsLTcuMzE0MSAtNy45NTEwMSwtMTIuOTU2OTQgLTE1LjMzMzUxLC0xMi40ODEyNiB6IiAvPgogIDxwYXRoIHN0eWxlPSJmaWxsOiM2ZjZmNmY7c3Ryb2tlLXdpZHRoOjAuOTgyMDgxIiBkPSJtIDMwOS4zMTU4OCwyNDcuNDczNzkgYyAtOS4zNDcxMSwwLjE1NTMgLTE1Ljc0MzE0LDkuODg3MTMgLTE0LjA4NjcyLDE4LjcxMTMzIDAuMTIzNTQsNDcuNjI0OTkgLTAuMjQ0MDYsOTUuMjc1ODEgMC4xNzgzOCwxNDIuODg1MTEgMS4xOTg1NiwxMC45NzMyMSAxNS45MTY2NCwxNi41MzYwNiAyNC4wNzA1OCw5LjA5MDAxIDguNDE5MzMsLTYuODE3ODcgNC40NzM2NiwtMTguODg0MiA1LjM0Nzc0LC0yOC4wODEzOCAtMC4xMjQ0MiwtNDMuMzcxMjQgMC4yNDUyNCwtODYuNzY4MDQgLTAuMTc4MzksLTEzMC4xMjM4MSAtMS4wMzY3NCwtNy4zMTMyMSAtNy45NTAxMiwtMTIuOTU2NTggLTE1LjMzMTU5LC0xMi40ODEyNiB6IiAvPgo8L3N2Zz4K" />`;
+    $action.onclick = (e) => {
+        e.preventDefault();
+        e.stopPropagation();
+        const rm = (...paths) => withVirtualLayer(
+            rm$(...paths),
+            rmVL(...paths),
+        );
+        return rxjs.from(componentDelete(
+            createModal({
+                withButtonsRight: t("OK"),
+                withButtonsLeft: t("CANCEL"),
+            }),
+            basename(path).substr(0, 15),
+        )).pipe(
+            rxjs.mergeMap(() => rm(path)),
+            rxjs.tap(() =>  window.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 27 }))),
+        ).subscribe();
+    };
+
     const checked = isSelected(n);
     if (permissions && permissions.can_move !== false) $thing.setAttribute("draggable", "true");
     $thing.classList.add(checked ? "selected" : "not-selected");
