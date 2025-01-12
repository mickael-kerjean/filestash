export default async function(I3D, { THREE }) {
    const module = await import("./vendor/STLLoader.js");

    return class Impl extends I3D {
        constructor() {
            super();
        }

        load(url, onLoad, onProgress, onError) {
            return (new module.STLLoader()).load(url, onLoad, onProgress, onError);
        }

        transform(geometry) {
            const material = new THREE.MeshPhongMaterial({
                emissive: 0x40464b,
                specular: 0xf9f9fa,
                shininess: 15,
                transparent: true,
            });
            if (geometry.hasColors) material.vertexColors = true;
            else material.color = material.emissive;
            return new THREE.Mesh(geometry, material);
        }
    }
}
