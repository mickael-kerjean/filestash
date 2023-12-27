import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { loadCSS } from "../../helpers/loader.js";
import { join } from "../../lib/path.js";
import { createLoader } from "../../components/loader.js";
import { getDownloadUrl } from "./common.js";

import * as THREE from "../../lib/vendor/three/three.module.js"
import { OrbitControls } from "../../lib/vendor/three/OrbitControls.js";
import { GLTFLoader } from "../../lib/vendor/three/GLTFLoader.js";
import { OBJLoader } from "../../lib/vendor/three/OBJLoader.js";
import { STLLoader } from "../../lib/vendor/three/STLLoader.js";
import { FBXLoader } from "../../lib/vendor/three/FBXLoader.js";
import { Rhino3dmLoader } from "../../lib/vendor/three/3DMLoader.js";

import ctrlError from "../ctrl_error.js";

import "../../components/menubar.js";

export default function(render, { mime }) {
    const $page = createElement(`
        <div class="component_3dviewer">
            <component-menubar></component-menubar>
            <div class="threeviewer_container"></div>
        </div>
    `);
    render($page);

    const removeLoader = createLoader(qs($page, ".threeviewer_container"));
    effect(rxjs.of(getLoader(mime)).pipe(
        rxjs.mergeMap(([loader, createMesh]) => new rxjs.Observable((observer) => loader.load(
            getDownloadUrl(),
            (object) => observer.next(createMesh(object)),
            null,
            (err) => observer.error(err),
        ))),
        removeLoader,
        rxjs.mergeMap((mesh) => {
            // setup the dom
            const renderer = new THREE.WebGLRenderer();
            renderer.setSize($page.clientWidth, $page.clientHeight);
            renderer.setClearColor(0x525659);
            qs($page, ".threeviewer_container").appendChild(renderer.domElement);

            // setup the scene
            const scene = new THREE.Scene();
            scene.add(mesh);

            // setup the main threeJS components: camera, controls & lighting
            const camera = new THREE.PerspectiveCamera(45, $page.clientWidth / $page.clientHeight, 1, 1000);
            const controls = new OrbitControls(camera, renderer.domElement);
            [
                new THREE.AmbientLight(0xffffff, 1.5),
                new THREE.DirectionalLight(0xffffff, 1.5),
                new THREE.DirectionalLight(0xffffff, 1.5),
            ].forEach((light, i) => {
                if (i === 1) light.position.set(100, 100, 100);
                else if (i === 2) light.position.set(-100, -100, -100);
                scene.add(light);
            });

            // center everything
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            camera.position.set(center.x, center.y, center.z + Math.max(size.x, size.y, size.z) * 1.8);
            controls.target.copy(center);

            // resize handler
            const onResize = () => {
                camera.aspect = $page.clientWidth / $page.clientHeight;
			    camera.updateProjectionMatrix();
                renderer.setSize($page.clientWidth, $page.clientHeight);
            };
            window.addEventListener("resize", onResize);
            onDestroy(() => window.removeEventListener("resize", onResize));

            return rxjs.animationFrames().pipe(rxjs.tap(() => {
	            controls.update();
	            renderer.render(scene, camera);
            }));
        }),
        rxjs.catchError(ctrlError()),
    ));
}

function getLoader(mime) {
    const identity = (s) => s;
    switch(mime) {
    case "application/object":
        return [new OBJLoader(), identity];
    case "model/3dm":
        const loader = new Rhino3dmLoader();
        loader.setLibraryPath(join(import.meta.url, "../../lib/vendor/three/rhino3dm/"));
        return [loader, identity];
    case "model/gtlt-binary":
    case "model/gltf+json":
        return [new GLTFLoader(), (gltf) => gltf.scene];
    case "model/stl":
        return [new STLLoader(), (geometry) => new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial(),
        )];
    case "application/fbx":
        return [new FBXLoader(), identity];
    default:
        throw new Error(`Invalid loader for "${mime}"`);
    }
}

export function init() {
    return loadCSS(import.meta.url, "./application_3d.css");
}
