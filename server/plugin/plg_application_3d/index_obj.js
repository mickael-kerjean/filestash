import { toCreasedNormals } from "./vendor/utils/BufferGeometryUtils.js";

export default async function(I3D, { THREE }) {
    const module = await import("./vendor/OBJLoader.js");

    return class Impl extends I3D {
        constructor() {
            super();
        }

        load(url, onLoad, onProgress, onError) {
            return (new module.OBJLoader()).load(url, onLoad, onProgress, onError);
        }

        transform(obj) {
            obj.name = "All";
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0x40464b,
                        emissive: 0x40464b,
                        specular: 0xf9f9fa,
                        shininess: 10,
                        transparent: true,
                    });
                    // smooth the edges: https://discourse.threejs.org/t/how-to-smooth-an-obj-with-threejs/3950/16
                    child.geometry = toCreasedNormals(child.geometry, (30 / 180) * Math.PI);
                }
            });
            return obj;
        }
    }
}
