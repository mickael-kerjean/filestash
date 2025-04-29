export default async function(I3D, { THREE }) {
    const module = await import("./vendor/MeshLoader.js");

    return class Impl extends I3D {
        constructor() {
            super();
        }

        load(url, onLoad, onProgress, onError) {
            return (new module.MeshLoader()).load(url, onLoad, onProgress, onError);
        }

        transform(obj) {
            return obj;
        }
    }
}
