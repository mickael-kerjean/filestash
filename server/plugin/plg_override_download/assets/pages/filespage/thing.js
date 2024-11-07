diff --git a/public/assets/pages/filespage/thing.js b/public/assets/pages/filespage/thing.js
index dd4f69ec..3bdcb97c 100644
--- a/public/assets/pages/filespage/thing.js
+++ b/public/assets/pages/filespage/thing.js
@@ -35,6 +35,20 @@ export function init() {
     };
 }
 
+window.onDownload = function(e, self) {
+    e.preventDefault(); e.stopPropagation();
+    const path = self.parentElement.getAttribute("data-path");
+    const $link = document.createElement("a");
+    $link.download = path.split("/").pop();
+    if (isDir(path)) $link.download += ".zip";
+    $link.href = `/api/files/{verb}?path=${path}`.replace(
+        "{verb}",
+        isDir(path) ? "zip" : "cat",
+    );
+    $link.click();
+    $link.remove();
+};
+
 const $tmpl = createElement(`
     <a href="__TEMPLATE__" class="component_thing no-select" draggable="false" data-link>
         <div class="component_checkbox"><input name="select" type="checkbox"><span class="indicator"></span></div>
@@ -46,6 +60,15 @@ const $tmpl = createElement(`
             </span></span>
         </span>
         <span class="component_datetime"></span>
+        <div class="component_action" onclick="onDownload(event, this)">
+            <span><img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDM2MCw0NjAgSCAyNCBDIDEwLjcsNDYwIDAsNDUzLjMgMCw0NDAgdiAtMTIgYyAwLC0xMy4zIDEwLjcsLTIwIDI0LC0yMCBoIDMzNiBjIDEzLjMsMCAyNCw2LjcgMjQsMjAgdiAxMiBjIDAsMTMuMyAtMTAuNywyMCAtMjQsMjAgeiIgLz4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDIyNi41NTM5LDIzNC44ODQyOCBWIDUyLjk0MzI4MyBjIDAsLTYuNjI3IC01LjM3MywtMTIgLTEyLC0xMiBoIC00NCBjIC02LjYyNywwIC0xMiw1LjM3MyAtMTIsMTIgViAyMzQuODg0MjggaCAtNTIuMDU5IGMgLTIxLjM4MiwwIC0zMi4wOSwyNS44NTEgLTE2Ljk3MSw0MC45NzEgbCA4Ni4wNTksODYuMDU5IGMgOS4zNzMsOS4zNzMgMjQuNTY5LDkuMzczIDMzLjk0MSwwIGwgODYuMDU5LC04Ni4wNTkgYyAxNS4xMTksLTE1LjExOSA0LjQxMSwtNDAuOTcxIC0xNi45NzEsLTQwLjk3MSB6IiAvPgo8L3N2Zz4K" alt="download"></span>
+        </div>
+        <style>
+        .component_action > span > .component_icon { box-sizing: border-box; background: rgba(0,0,0,0.1); border-radius: 50%; padding: 4px; filter: contrast(0); }
+        .component_action { display: none; float: right; color: #6f6f6f; line-height: 25px; margin: 0 -10px; padding: 0 10px; position: relative; }
+        .list .component_action { position: absolute; top: 10px; right: 10px; }
+        .component_thing:hover .component_action { display: block; }
+        </style>
         <div class="selectionOverlay"></div>
     </a>
 `);
