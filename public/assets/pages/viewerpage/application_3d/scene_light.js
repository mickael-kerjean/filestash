import { settings_get } from "../../../lib/settings.js";
import * as THREE from "../../../../lib/vendor/three/three.module.js";

const LIGHT_COLOR = 0xf5f5f5;

export default function({ scene, box, camera }) {
    addLight(
        scene,
        new THREE.AmbientLight(LIGHT_COLOR),
        settings_get("viewerpage_3d_light", 2),
    );

    // to make things "look nice", a good setup is to get lights positioned
    // in a 3D cube with a couple "twist" in term of position & intensity
    const l = addLight.bind(this, scene, new THREE.DirectionalLight(LIGHT_COLOR));
    l(0.25, [plus(box.max.x*3), 0, 20]); // right
    l(0.25, [minus(box.min.x*3), 0, -20]); // left
    l(0.35, [0, plus(box.max.y*4), 20]); // top
    l(0.35, [0, minus(box.min.y*4), -20]); // bottom

    l(0.2, [0, 0, plus(7*box.max.z)]); // front
    l(0.2, [0, 0, minus(15*box.min.z)]); // back

    l(0.4, [camera.position.x, camera.position.y, camera.position.z]); // camera
}

function addLight(scene, light, intensity, pos = []) {
    light = light.clone();
    light.intensity = intensity;
    light.position.set(...pos);
    if (light.type !== "AmbientLight") light.castShadow = true;
    scene.add(light);
}

const plus = notZero.bind(null, 1);
const minus = notZero.bind(null, -1);
function notZero(sgn, n) {
    if (n === 0) return sgn;
    return n;
}
