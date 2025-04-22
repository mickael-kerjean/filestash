import { loadJS } from "../../assets/helpers/loader.js";

await loadJS("https://cdn.jsdelivr.net", "/npm/occt-import-js@0.0.22/dist/occt-import-js.min.js");

async function LoadGeometry(url) {
    const occt = await occtimportjs()
    let fileUrl = "https://raw.githubusercontent.com/kovacsv/occt-import-js/main/test/testfiles/cax-if/as1_pe_203.stp"
    // let response = await fetch(fileUrl)
    let response = await fetch(url)
    let buffer = await response.arrayBuffer()
    let fileBuffer = new Uint8Array(buffer)
    return occt.ReadStepFile(fileBuffer, null);
}

export default async function(I3D, { THREE }) {
    return class Impl extends I3D {
        constructor() {
            super();
        }

        load(url, onLoad, onProgress, onError) {
            LoadGeometry(url)
                .then(({ success, ...obj }) => {
                    if (success === false) throw new Error("NOT SUPPORTED");
                    onLoad(obj);
                })
                .catch((err) => onError(err));
        }

        transform({ root, meshes }) {
            const group = new THREE.Group();

            const recurse = ({ meshes: m, children, name}) => {
                if (m.length > 0) {
                    const obj = new THREE.Object3D();
                    obj.name = name;
                    for (let i=0; i<m.length; i++) {
                        const resultMesh = meshes[m[i]];
                        console.log(name, resultMesh);
                        let geometry = new THREE.BufferGeometry()
                        geometry.setAttribute(
                            "position",
                            new THREE.Float32BufferAttribute(resultMesh.attributes.position.array, 3),
                        )
                        if (resultMesh.attributes.normal) geometry.setAttribute(
                            "normal",
                            new THREE.Float32BufferAttribute(resultMesh.attributes.normal.array, 3),
                        );
                        geometry.setIndex(new THREE.BufferAttribute(
                            Uint32Array.from(resultMesh.index.array),
                            1,
                        ));
                        let material = null
                        if (resultMesh.color) material = new THREE.MeshPhongMaterial({ color: new THREE.Color(
                            resultMesh.color[0],
                            resultMesh.color[1],
                            resultMesh.color[2],
                        )});
                        else material = new THREE.MeshPhongMaterial({ color: 0xcccccc });
                        obj.add(new THREE.Mesh(geometry, material));
                    }
                    group.add(obj);
                }
                if (children.length > 0) children.forEach((obj) => recurse(obj));
            }
            root.children.forEach(recurse);

            return group;
        }

        transformOld({ meshes, root }) {
            console.log(meshes, root)
            const targetObject = new THREE.Object3D();
            for (let resultMesh of meshes) {
                let geometry = new THREE.BufferGeometry()
                geometry.setAttribute(
                    "position",
                    new THREE.Float32BufferAttribute(resultMesh.attributes.position.array, 3),
                )
                if (resultMesh.attributes.normal) geometry.setAttribute(
                    "normal",
                    new THREE.Float32BufferAttribute(resultMesh.attributes.normal.array, 3),
                );
                geometry.setIndex(new THREE.BufferAttribute(
                    Uint32Array.from(resultMesh.index.array),
                    1,
                ));

                let material = null
                if (resultMesh.color) material = new THREE.MeshPhongMaterial({ color: new THREE.Color(
                    resultMesh.color[0],
                    resultMesh.color[1],
                    resultMesh.color[2],
                )});
                else material = new THREE.MeshPhongMaterial({ color: 0xcccccc });

                targetObject.add(new THREE.Mesh(geometry, material));
            }
            return targetObject;
        }
    }
}
