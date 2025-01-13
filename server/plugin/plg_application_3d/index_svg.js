export default async function(I3D, { THREE }) {
    const module = await import("./vendor/SVGLoader.js");

    const threecolor = (color) => {
        if (color && color.substr && color.substr(0, 4) === "RGB(") {
            function componentToHex(c) {
                const hex = c.toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            }
            const [r, g, b] = color.replace(/^RGB\(/, "").replace(/\)/, "").split(",").map((i) => parseInt(i));
            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        }
        return color;
    };

    const createMaterial = (color, opacity = 1) => new THREE.MeshBasicMaterial({
        color: new THREE.Color().setStyle(color),
        opacity,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        wireframe: false,
    });

    return class Impl extends I3D {
        constructor() {
            super();
        }

        load(url, onLoad, onProgress, onError) {
            return (new module.SVGLoader()).load(url, onLoad, onProgress, onError);
        }

        transform(data) {
            const group = new THREE.Group();
            group.name = "All";
            group.scale.y *= -1;
            let renderOrder = 0;
            for (const path of data.paths) {
                const fillColor = threecolor(path.userData.style.fill);
                if (fillColor !== undefined && fillColor !== "none") {
                    const material = createMaterial(
                        fillColor,
                        path.userData.style.fillOpacity,
                    );
                    const shapes = module.SVGLoader.createShapes(path);
                    for (const shape of shapes) {
                        const mesh = new THREE.Mesh(
                            new THREE.ShapeGeometry(shape),
                            material,
                        );
                        mesh.renderOrder = renderOrder++;
                        group.add(mesh);
                    }
                }
                const strokeColor = threecolor(path.userData.style.stroke);
                if (strokeColor !== undefined && strokeColor !== "none") {
                    const material = createMaterial(strokeColor);
                    for (const subPath of path.subPaths) {
                        const geometry = module.SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);
                        if (geometry) {
                            const mesh = new THREE.Mesh(geometry, material);
                            mesh.renderOrder = renderOrder++;
                            group.add(mesh);
                        }
                    }
                }
            }
            return group;
        }

        is2D() {
            return true;
        }
    }
}
