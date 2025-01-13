import { createElement, onDestroy } from "../../../lib/skeleton/index.js";
import { OrbitControls } from "../../../../lib/vendor/three/OrbitControls.js";

export default function({ THREE, $page, $menubar, mesh, refresh, is2D }) {
    // setup the dom
    const renderer = new THREE.WebGLRenderer({ antialias: true, shadowMapEnabled: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xf5f5f5);
    renderer.setSize($page.clientWidth, $page.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    $page.appendChild(renderer.domElement);

    // center everything
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // setup the scene, camera and controls
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f2f4);
    const camera = new THREE.PerspectiveCamera(
        45,
        $page.clientWidth / $page.clientHeight,
        Math.max(0.1, maxDim / 100),
        maxDim * 1000,
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    if (is2D()) {
        controls.zoomToCursor = true;
        controls.enableRotate = false;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ORBIT
        };
    }

    scene.add(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    camera.position.set(center.x, center.y, center.z + maxDim * (is2D() ? 1.3 : 1.8));
    controls.target.copy(center);

    const mixer = new THREE.AnimationMixer(mesh);
    if (mesh.animations.length > 0) {
        const ICON = {
            PLAY: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgdmlld0JveD0iMCAwIDU4Ljc1MiA1OC43NTIiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzE1OCIKICAgc29kaXBvZGk6ZG9jbmFtZT0icGxheS5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMi4yIChiMGE4NDg2NTQxLCAyMDIyLTEyLTAxKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcwogICAgIGlkPSJkZWZzMTYyIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MTYwIgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzAwMDAwMCIKICAgICBib3JkZXJvcGFjaXR5PSIwLjI1IgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiCiAgICAgaW5rc2NhcGU6cGFnZWNoZWNrZXJib2FyZD0iMCIKICAgICBpbmtzY2FwZTpkZXNrY29sb3I9IiNkMWQxZDEiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjE1LjQyMDc1MiIKICAgICBpbmtzY2FwZTpjeD0iMjkuMzQzNTc2IgogICAgIGlua3NjYXBlOmN5PSIyNS45MzkwNzMiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxOTA0IgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjExNTciCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjciCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjM0IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnMTU4IiAvPgogIDxwYXRoCiAgICAgZD0iTSA0NS42MDY5MTMsMjUuMTc0NzEyIDIyLjY5MTQwMSw2LjEwODk4MjUgYyAtMS40Njk2MjUsLTAuOTA3ODUyNSAtMy4zNzIzNTQsLTAuOTA1Mzc2NiAtNC44MzY1ODQsMCAtMS40OTM1MTUsMC45MjEwNTc3IC0yLjQyMjE0NSwyLjY0MTg1MSAtMi40MjIxNDUsNC40ODk3NDM1IFYgNDguNzMyNjYgYyAwLDEuODQ4NzE4IDAuOTI3ODYsMy41Njk1MTEgMi40MTI4OTcsNC40ODU2MTcgMC43MzQ0MjcsMC40NTgwNTMgMS41NzM2NjMsMC42OTk4NzIgMi40MjY3NjksMC42OTk4NzIgMC44NTA3OTUsMCAxLjY4OTI2LC0wLjI0MDk5NCAyLjQyMDYwNCwtMC42OTU3NDUgbCAyMi45MTU1MTIsLTE5LjA2NzM4IGMgMS40OTE5NzQsLTAuOTIzNTMzIDIuNDE4MjkyLC0yLjY0MzUwMSAyLjQxODI5MiwtNC40ODg5MTggLTcuN2UtNCwtMS44NDI5NDEgLTAuOTI2MzE4LC0zLjU2MjkwOSAtMi40MTk4MzMsLTQuNDkxMzk0IHogbSAtMi42MDU3MDIsNC42OTM1OTggYyAtMjguNjY3NDc0LC0xOS45MTIyMDY3IC0xNC4zMzM3MzcsLTkuOTU2MTAzIDAsMCB6IgogICAgIHN0eWxlPSJmaWxsOiNmMmYyZjIiCiAgICAgaWQ9InBhdGgxNTYiCiAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJjY2Nzc2NzY2NjY2NjIiAvPgo8L3N2Zz4K",
            PAUSE: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgdmlld0JveD0iMCAwIDU4Ljc1MiA1OC43NTIiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzE1OCIKICAgc29kaXBvZGk6ZG9jbmFtZT0icGF1c2Uuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjIuMiAoYjBhODQ4NjU0MSwgMjAyMi0xMi0wMSkiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnMKICAgICBpZD0iZGVmczE2MiIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9Im5hbWVkdmlldzE2MCIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiMwMDAwMDAiCiAgICAgYm9yZGVyb3BhY2l0eT0iMC4yNSIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjZDFkMWQxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIxNS40MjA3NTIiCiAgICAgaW5rc2NhcGU6Y3g9IjI4LjQzNTcwOSIKICAgICBpbmtzY2FwZTpjeT0iMjUuOTM5MDczIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkwNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMTU3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIzNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzE1OCIgLz4KICA8cmVjdAogICAgIHN0eWxlPSJmaWxsOiNmMmYyZjI7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjAuOTM2NjQxIgogICAgIGlkPSJyZWN0NTA3IgogICAgIHdpZHRoPSIzOS42NTU5MTQiCiAgICAgaGVpZ2h0PSI0NS4xMjEzNTciCiAgICAgeD0iMTAuMzExNDcyIgogICAgIHk9IjcuMTUyMjY4OSIKICAgICByeD0iNS43NSIgLz4KPC9zdmc+Cg==",
        };
        const $button = createElement(`<img class="component_icon" draggable="false" src="${ICON.PLAY}" alt="play">`);
        const action = mixer.clipAction(mesh.animations[0]);
        let isPlaying = false;
        $button.onclick = () => {
            if (isPlaying === false) action.play();
            else action.stop();
            isPlaying = !isPlaying;
            $button.setAttribute("src", isPlaying ? ICON.PAUSE : ICON.PLAY);
        };
        $menubar.add($button);
    }

    const onResize = () => {
        camera.aspect = $page.clientWidth / $page.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize($page.clientWidth, $page.clientHeight);
    };
    window.addEventListener("resize", onResize);
    onDestroy(() => window.removeEventListener("resize", onResize));

    const clock = new THREE.Clock();
    refresh.push(() => {
        controls.update();
        renderer.render(scene, camera);
        mixer.update(clock.getDelta());
    });

    return { renderer, scene, camera, controls, box };
}
