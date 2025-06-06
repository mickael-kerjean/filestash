import { createElement } from "../../../lib/skeleton/index.js";
import { qs } from "../../../lib/dom.js";
import * as THREE from "../../../lib/vendor/three/three.module.js";

export default function(render, { camera, controls, mesh, $menubar, $toolbar, is2D }) {
    if (mesh.children.length <= 1) return;

    $menubar.add(buttonLayers({ $toolbar }));
    render(createChild(
        document.createDocumentFragment(),
        mesh,
        0,
        { camera, controls, is2D }
    ));
}

function buttonLayers({ $toolbar }) {
    const $button = createElement(`<img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiNmMmYyZjIiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJtIDEuODI0MDExMiw2LjUzMDQxMTMgOS44OTUxMjU4LDUuMzc3MjgwNyBhIDAuNTkyMzE0MDQsMC41OTIzMTQwNCAwIDAgMCAwLjU1NzQ3NCwwIGwgOS44OTUxMywtNS4zNzcyODA3IGEgMC41MTEwMTYwMiwwLjUxMTAxNjAyIDAgMCAwIC0wLjA1ODA4LC0wLjk0MDczMzkgbCAtOS44OTUxMiwtNC4wNDE2NzI1IGEgMC41ODA3MDAwNSwwLjU4MDcwMDA1IDAgMCAwIC0wLjQ0MTMzNCwwIEwgMS44ODIwODI1LDUuNTg5Njc3NCBhIDAuNTExMDE2MDIsMC41MTEwMTYwMiAwIDAgMCAtMC4wNTgwNzEsMC45NDA3MzM5IHoiIC8+CiAgPHBhdGggZD0iTSAyMi4xMTM2NywxMC40NDQzMzIgMTkuOTg4MzA2LDkuNTM4NDM3NiAxMi4yNzY2MTEsMTMuNzMxMDkxIGEgMC41OTIzMTQwNCwwLjU5MjMxNDA0IDAgMCAxIC0wLjU1NzQ3NCwwIEwgNC4wMDc0NDM1LDkuNTM4NDM3NiAxLjg4MjA4MTIsMTAuNDQ0MzMyIGEgMC41NTc0NzIwNCwwLjU1NzQ3MjA0IDAgMCAwIDAsMC45ODcxODcgbCA5Ljg5NTEyOTgsNS42OTA4NTkgYSAwLjUzNDI0NDA3LDAuNTM0MjQ0MDcgMCAwIDAgMC41NTc0NzEsMCBsIDkuODk1MTMsLTUuNjkwODU5IEEgMC41NTc0NzIwNCwwLjU1NzQ3MjA0IDAgMCAwIDIyLjExMzY3LDEwLjQ0NDMzMiBaIiAvPgogIDxwYXRoIGQ9Im0gMjIuMTEzNjcsMTUuNjAwOTQzIC0xLjgxMTc4NCwtMC43ODk3NSAtOC4wMjUyNzUsNC4zNjY4NjYgYSAwLjU5MjMxNDA0LDAuNTkyMzE0MDQgMCAwIDEgLTAuNTU3NDc0LDAgbCAtOC4wMjUyNzE1LC00LjM2Njg2NiAtMS44MTE3ODQzLDAuNzg5NzUgYSAwLjU2OTA4NjAzLDAuNTY5MDg2MDMgMCAwIDAgMCwxLjAxMDQyMiBsIDkuODk1MTI5OCw1LjgwNjk5OCBhIDAuNTkyMzE0MDQsMC41OTIzMTQwNCAwIDAgMCAwLjU1NzQ3MSwwIGwgOS44OTUxMywtNS44MDY5OTggQSAwLjU2OTA4NjAzLDAuNTY5MDg2MDMgMCAwIDAgMjIuMTEzNjcsMTUuNjAwOTQzIFoiIC8+Cjwvc3ZnPgo=" alt="layers">`);
    $button.onclick = () => $toolbar.classList.toggle("open");
    return $button;
}

function createChild($fragment, mesh, child = 0, opts) {
    if (["Bone"].indexOf(mesh.type) >= 0) return;
    buildDOM($fragment, mesh, child, opts);
    if (mesh.children.length > 0 && child < 4) {
        for (let i=0; i<mesh.children.length; i++) {
            if (mesh.children[i].type === "Group" || !!mesh.children[i].name) {
                createChild($fragment, mesh.children[i], child + 1, opts);
            }
        }
    }
    return $fragment;
}

function buildDOM($fragment, child, left, { camera, controls, is2D }) {
    const $label = createElement(`
        <label class="no-select" style="padding-left: ${left*20}px">
            <div class="component_checkbox">
                <input type="checkbox" ${child.visible ? "checked" : ""} />
                <span class="indicator"></span>
            </div>
            <span class="text">${name(child)}</span>
        </label>
    `);
    qs($label, "input").onchange = () => child.visible = !child.visible;
    $label.onclick = async(e) => {
        if (is2D()) return;
        else if (e.target.nodeName === "INPUT" || e.target.classList.contains("component_checkbox")) return;
        e.preventDefault(); e.stopPropagation();
        getRootObject(child).traverse((c) => {
            if (!c.material) return;
            c.material.opacity = c.id === child.id || c.parent.id === child.id ? 1 : 0.2;
            c.material.depthWrite = c.material.opacity === 1;
        });
        await flyTo({ mesh: child, camera, controls });
    };
    $fragment.appendChild($label);
}

async function flyTo({ mesh, camera, controls }) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());

    const targetLookAt = box.getCenter(new THREE.Vector3());
    const targetDistance = Math.max(size.x, size.y, size.z) * 1.1;
    const targetPosition = targetLookAt.clone().add(new THREE.Vector3(targetDistance, targetDistance, targetDistance));

    const [startPosition, startLookAt] = [camera.position.clone(), controls.target.clone()];
    const startTime = performance.now();
    return new Promise((resolve) => (function animate() {
        const t = Math.min((performance.now() - startTime) / 500, 1);
        camera.position.lerpVectors(startPosition, targetPosition, t);
        controls.target.lerpVectors(startLookAt, targetLookAt, t);
        controls.update();
        t < 1 ? requestAnimationFrame(animate) : resolve();
    })());
}

function getRootObject(mesh) {
    if (mesh.type === "Scene" || mesh.parent.type === "Scene") return mesh;
    return getRootObject(mesh.parent);
}

function name(mesh) {
    if (mesh.name) return mesh.name;
    else if (mesh.isGroup && mesh.uuid) return `group: ${mesh.uuid}`;
    else if (mesh.uuid) return mesh.uuid;
    return "N/A";
}
