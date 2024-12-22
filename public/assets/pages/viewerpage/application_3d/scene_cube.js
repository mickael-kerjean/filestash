import { onDestroy } from "../../../lib/skeleton/index.js";
import { ViewCubeGizmo, SimpleCameraControls, ObjectPosition } from "../../../lib/vendor/three/viewcube.js";

export default function({ camera, renderer, refresh, controls }) {
    const viewCubeGizmo = new ViewCubeGizmo(camera, renderer, {
        pos: ObjectPosition.RIGHT_BOTTOM,
        dimension: 130,
        faceColor: 0xf9f9fa,
        outlineColor: 0xe2e2e2,
    });

    const simpleCameraControls = new SimpleCameraControls(camera);
    simpleCameraControls.setControls(controls);

    refresh.push(() => {
        viewCubeGizmo.update();
        simpleCameraControls.update();
    });

    const onCubeClick = (event) => simpleCameraControls.flyTo(event.quaternion);
    viewCubeGizmo.addEventListener("change", onCubeClick);
    onDestroy(() => viewCubeGizmo.removeEventListener("change", onCubeClick));
}
