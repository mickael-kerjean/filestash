export default async function(I3D, { THREE }) {
    const module = await import("./vendor/GLTFLoader.js");

    return class Impl extends I3D {
        constructor() {
            super();
        }

        load(url, onLoad, onProgress, onError) {
            return new module.GLTFLoader().load(url, onLoad, onProgress, onError);
        }

        transform(gltf) {
            const mesh = gltf.scene;
            mesh.animations = gltf.animations;
            return mesh;
        }
    }
}
