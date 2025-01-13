export default async function(I3D, { THREE }) {
    const module = await import("./vendor/FBXLoader.js");

    return class Impl extends I3D {
        constructor() {
            super();
        }

        load(url, onLoad, onProgress, onError) {
            return (new module.FBXLoader()).load(url, onLoad, onProgress, onError);
        }

        transform(obj) {
            obj.name = "All";
            return obj;
        }
    }
}
