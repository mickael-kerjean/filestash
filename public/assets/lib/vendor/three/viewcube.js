import * as THREE from "./three.module.js";
const DEFAULT_FACENAMES = {
  top: "TOP",
  front: "FRONT",
  right: "RIGHT",
  back: "BACK",
  left: "LEFT",
  bottom: "BOTTOM"
};
var ObjectPosition = /* @__PURE__ */ ((ObjectPosition2) => {
  ObjectPosition2[ObjectPosition2["LEFT_BOTTOM"] = 0] = "LEFT_BOTTOM";
  ObjectPosition2[ObjectPosition2["LEFT_TOP"] = 1] = "LEFT_TOP";
  ObjectPosition2[ObjectPosition2["RIGHT_TOP"] = 2] = "RIGHT_TOP";
  ObjectPosition2[ObjectPosition2["RIGHT_BOTTOM"] = 4] = "RIGHT_BOTTOM";
  return ObjectPosition2;
})(ObjectPosition || {});
class FixedPosGizmo extends THREE.Object3D {
  /**
   * Construct one instance of this gizmo
   * @param camera Camera used in your canvas
   * @param renderer Renderer used in your canvas
   * @param dimension Size of area ocupied by this gizmo. Because width and height of this area is same,
   * it is single value. The real size of the objet will be calculated automatically considering rotation.
   * @param pos Position of the gizmo
   */
  constructor(camera, renderer, dimension = 150, pos = 2) {
    super();
    this.camera = camera;
    this.renderer = renderer;
    this.gizmoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 4);
    this.gizmoCamera.position.set(0, 0, 2);
    this.gizmoDim = dimension;
    this.gizmoPos = pos;
    this.initialize();
  }
  /**
   * Function called by constructor to initialize this gizmo. The children class can override this function
   * to add its own initialization logic.
   */
  initialize() {
  }
  /**
   * Update and rerender this gizmo
   */
  update() {
    this.updateOrientation();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    const viewport = new THREE.Vector4();
    this.renderer.getViewport(viewport);
    const pos = this.calculateViewportPos();
    this.renderer.setViewport(pos.x, pos.y, this.gizmoDim, this.gizmoDim);
    this.renderer.render(this, this.gizmoCamera);
    this.renderer.setViewport(viewport.x, viewport.y, viewport.z, viewport.w);
    this.renderer.autoClear = autoClear;
  }
  /**
   * Free the GPU-related resources allocated by this instance. Call this method whenever this instance
   * is no longer used in your app.
   */
  dispose() {
  }
  updateOrientation() {
    this.quaternion.copy(this.camera.quaternion).invert();
    this.updateMatrixWorld();
  }
  calculatePosInViewport(offsetX, offsetY, bbox) {
    const x = (offsetX - bbox.min.x) / this.gizmoDim * 2 - 1;
    const y = -((offsetY - bbox.min.y) / this.gizmoDim) * 2 + 1;
    return { x, y };
  }
  calculateViewportPos() {
    const domElement = this.renderer.domElement;
    const canvasWidth = domElement.offsetWidth;
    const canvasHeight = domElement.offsetHeight;
    const pos = this.gizmoPos;
    const length = this.gizmoDim;
    let x = canvasWidth - length;
    let y = canvasHeight - length;
    switch (pos) {
      case 0:
        x = 0;
        y = 0;
        break;
      case 1:
        x = 0;
        break;
      case 4:
        y = 0;
        break;
    }
    return { x, y };
  }
  calculateViewportBbox() {
    const domElement = this.renderer.domElement;
    const canvasWidth = domElement.offsetWidth;
    const canvasHeight = domElement.offsetHeight;
    const pos = this.gizmoPos;
    const length = this.gizmoDim;
    const bbox = new THREE.Box2(
      new THREE.Vector2(canvasWidth - length, 0),
      new THREE.Vector2(canvasWidth, length)
    );
    switch (pos) {
      case 0:
        bbox.set(
          new THREE.Vector2(0, canvasHeight - length),
          new THREE.Vector2(length, canvasHeight)
        );
        break;
      case 1:
        bbox.set(new THREE.Vector2(0, 0), new THREE.Vector2(length, length));
        break;
      case 4:
        bbox.set(
          new THREE.Vector2(canvasWidth - length, canvasHeight - length),
          new THREE.Vector2(canvasWidth, canvasHeight)
        );
        break;
    }
    return bbox;
  }
}
function createTextTexture(text, props) {
  const fontface = props.font || "Helvetica";
  const fontsize = props.fontSize || 30;
  const width = props.width || 200;
  const height = props.height || 200;
  const bgColor = props.bgColor ? props.bgColor.join(", ") : "255, 255, 255, 1.0";
  const fgColor = props.color ? props.color.join(", ") : "0, 0, 0, 1.0";
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = `bold ${fontsize}px ${fontface}`;
    context.fillStyle = `rgba(${bgColor})`;
    context.fillRect(0, 0, width, height);
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    context.fillStyle = `rgba(${fgColor})`;
    context.fillText(
      text,
      width / 2 - textWidth / 2,
      height / 2 + fontsize / 2 - 2
    );
  }
  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function createTextSprite(text) {
  const texture = createTextTexture(text, {
    fontSize: 100,
    font: "Arial Narrow, sans-serif",
    color: [255, 255, 255, 1],
    bgColor: [0, 0, 0, 0]
  });
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  return new THREE.Sprite(material);
}
function createFaceMaterials(faceNames = DEFAULT_FACENAMES) {
  const materials = [
    {
      name: FACES.FRONT,
      map: createTextTexture(faceNames.front, {
        fontSize: 55,
        font: "Arial Narrow, sans-serif",
        color: ["87", "89", "90", "1"]
      })
    },
    {
      name: FACES.RIGHT,
      map: createTextTexture(faceNames.right, {
        fontSize: 55,
        font: "Arial Narrow, sans-serif",
        color: ["87", "89", "90", "1"]
      })
    },
    {
      name: FACES.BACK,
      map: createTextTexture(faceNames.back, {
        fontSize: 55,
        font: "Arial Narrow, sans-serif",
        color: ["87", "89", "90", "1"]
      })
    },
    {
      name: FACES.LEFT,
      map: createTextTexture(faceNames.left, {
        fontSize: 55,
        font: "Arial Narrow, sans-serif",
        color: ["87", "89", "90", "1"]
      })
    },
    {
      name: FACES.TOP,
      map: createTextTexture(faceNames.top, {
        fontSize: 60,
        font: "Arial Narrow, sans-serif",
        color: ["87", "89", "90", "1"]
      })
    },
    {
      name: FACES.BOTTOM,
      map: createTextTexture(faceNames.bottom, {
        fontSize: 48,
        font: "Arial Narrow, sans-serif",
        color: ["87", "89", "90", "1"]
      })
    }
  ];
  return materials;
}
const FACES = {
  TOP: "1",
  FRONT: "2",
  RIGHT: "3",
  BACK: "4",
  LEFT: "5",
  BOTTOM: "6",
  TOP_FRONT_EDGE: "7",
  TOP_RIGHT_EDGE: "8",
  TOP_BACK_EDGE: "9",
  TOP_LEFT_EDGE: "10",
  FRONT_RIGHT_EDGE: "11",
  BACK_RIGHT_EDGE: "12",
  BACK_LEFT_EDGE: "13",
  FRONT_LEFT_EDGE: "14",
  BOTTOM_FRONT_EDGE: "15",
  BOTTOM_RIGHT_EDGE: "16",
  BOTTOM_BACK_EDGE: "17",
  BOTTOM_LEFT_EDGE: "18",
  TOP_FRONT_RIGHT_CORNER: "19",
  TOP_BACK_RIGHT_CORNER: "20",
  TOP_BACK_LEFT_CORNER: "21",
  TOP_FRONT_LEFT_CORNER: "22",
  BOTTOM_FRONT_RIGHT_CORNER: "23",
  BOTTOM_BACK_RIGHT_CORNER: "24",
  BOTTOM_BACK_LEFT_CORNER: "25",
  BOTTOM_FRONT_LEFT_CORNER: "26"
};
const CORNER_FACES = [
  { name: FACES.TOP_FRONT_RIGHT_CORNER },
  { name: FACES.TOP_BACK_RIGHT_CORNER },
  { name: FACES.TOP_BACK_LEFT_CORNER },
  { name: FACES.TOP_FRONT_LEFT_CORNER },
  { name: FACES.BOTTOM_BACK_RIGHT_CORNER },
  { name: FACES.BOTTOM_FRONT_RIGHT_CORNER },
  { name: FACES.BOTTOM_FRONT_LEFT_CORNER },
  { name: FACES.BOTTOM_BACK_LEFT_CORNER }
];
const EDGE_FACES = [
  { name: FACES.TOP_FRONT_EDGE },
  { name: FACES.TOP_RIGHT_EDGE },
  { name: FACES.TOP_BACK_EDGE },
  { name: FACES.TOP_LEFT_EDGE },
  // flip back and front bottom edges
  { name: FACES.BOTTOM_BACK_EDGE },
  { name: FACES.BOTTOM_RIGHT_EDGE },
  { name: FACES.BOTTOM_FRONT_EDGE },
  { name: FACES.BOTTOM_LEFT_EDGE }
];
const EDGE_FACES_SIDE = [
  { name: FACES.FRONT_RIGHT_EDGE },
  { name: FACES.BACK_RIGHT_EDGE },
  { name: FACES.BACK_LEFT_EDGE },
  { name: FACES.FRONT_LEFT_EDGE }
];
class ViewCube extends THREE.Object3D {
  /**
   * Construct one instance of view cube 3d object
   * @param cubeSize Size of area ocupied by view cube
   * @param borderSize Border size of view cube
   * @param isShowOutline Flag to decide whether to show edge of view cube
   * @param faceColor Face color of view cube
   * @param outlineColor Edge color of view cube
   * @param faceNames Texts in each face of view cube
   */
  constructor(cubeSize = 60, borderSize = 5, isShowOutline = true, faceColor = 13421772, outlineColor = 10066329, faceNames = DEFAULT_FACENAMES) {
    super();
    this._cubeSize = cubeSize;
    this._borderSize = borderSize;
    this._isShowOutline = isShowOutline;
    this._faceColor = faceColor;
    this._outlineColor = outlineColor;
    this.build(faceNames);
  }
  /**
   * Free the GPU-related resources allocated by this instance. Call this method whenever this instance
   * is no longer used in your app.
   */
  dispose() {
    this.children.forEach((child) => {
      var _a, _b, _c, _d;
      const mesh = child;
      (_a = mesh.material) == null ? void 0 : _a.dispose();
      (_c = (_b = mesh.material) == null ? void 0 : _b.map) == null ? void 0 : _c.dispose();
      (_d = mesh.geometry) == null ? void 0 : _d.dispose();
    });
  }
  build(faceNames) {
    const faceSize = this._cubeSize - this._borderSize * 2;
    const faceOffset = this._cubeSize / 2;
    const borderSize = this._borderSize;
    const cubeFaces = this.createCubeFaces(faceSize, faceOffset);
    const faceMaterials = createFaceMaterials(faceNames);
    for (const [i, props] of faceMaterials.entries()) {
      const face = cubeFaces.children[i];
      const material = face.material;
      material.color.setHex(this._faceColor);
      material.map = props.map;
      face.name = props.name;
    }
    this.add(cubeFaces);
    const corners = [];
    for (const [i, props] of CORNER_FACES.entries()) {
      const corner = this.createCornerFaces(
        borderSize,
        faceOffset,
        props.name,
        { color: this._faceColor }
      );
      corner.rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(i % 4 * 90)
      );
      corners.push(corner);
    }
    const topCorners = new THREE.Group();
    const bottomCorners = new THREE.Group();
    this.add(topCorners.add(...corners.slice(0, 4)));
    this.add(
      bottomCorners.add(...corners.slice(4)).rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI)
    );
    const edges = [];
    for (const [i, props] of EDGE_FACES.entries()) {
      const edge = this.createHorzEdgeFaces(
        faceSize,
        borderSize,
        faceOffset,
        props.name,
        { color: this._faceColor }
      );
      edge.rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(i % 4 * 90)
      );
      edges.push(edge);
    }
    const topEdges = new THREE.Group();
    const bottomEdges = new THREE.Group();
    this.add(topEdges.add(...edges.slice(0, 4)));
    this.add(
      bottomEdges.add(...edges.slice(4)).rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI)
    );
    const sideEdges = new THREE.Group();
    for (const [i, props] of EDGE_FACES_SIDE.entries()) {
      const edge = this.createVertEdgeFaces(
        borderSize,
        faceSize,
        faceOffset,
        props.name,
        { color: this._faceColor }
      );
      edge.rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(i * 90)
      );
      sideEdges.add(edge);
    }
    this.add(sideEdges);
    if (this._isShowOutline) {
      this.add(this.createCubeOutline(this._cubeSize));
    }
  }
  createFace(size, position, { axis = [0, 1, 0], angle = 0, name = "", matProps = {} } = {}) {
    if (!Array.isArray(size)) size = [size, size];
    const material = new THREE.MeshBasicMaterial(matProps);
    const geometry = new THREE.PlaneGeometry(size[0], size[1]);
    const face = new THREE.Mesh(geometry, material);
    face.name = name;
    face.rotateOnAxis(
      new THREE.Vector3(...axis),
      THREE.MathUtils.degToRad(angle)
    );
    face.position.set(position[0], position[1], position[2]);
    return face;
  }
  createCubeFaces(faceSize, offset) {
    const faces = new THREE.Object3D();
    faces.add(
      this.createFace(faceSize, [0, 0, offset], { axis: [0, 1, 0], angle: 0 })
    );
    faces.add(
      this.createFace(faceSize, [offset, 0, 0], { axis: [0, 1, 0], angle: 90 })
    );
    faces.add(
      this.createFace(faceSize, [0, 0, -offset], {
        axis: [0, 1, 0],
        angle: 180
      })
    );
    faces.add(
      this.createFace(faceSize, [-offset, 0, 0], {
        axis: [0, 1, 0],
        angle: 270
      })
    );
    faces.add(
      this.createFace(faceSize, [0, offset, 0], {
        axis: [1, 0, 0],
        angle: -90
      })
    );
    faces.add(
      this.createFace(faceSize, [0, -offset, 0], {
        axis: [1, 0, 0],
        angle: 90
      })
    );
    return faces;
  }
  createCornerFaces(faceSize, offset, name = "", matProps = {}) {
    const corner = new THREE.Object3D();
    const borderOffset = offset - faceSize / 2;
    corner.add(
      this.createFace(faceSize, [borderOffset, borderOffset, offset], {
        axis: [0, 1, 0],
        angle: 0,
        matProps,
        name
      })
    );
    corner.add(
      this.createFace(faceSize, [offset, borderOffset, borderOffset], {
        axis: [0, 1, 0],
        angle: 90,
        matProps,
        name
      })
    );
    corner.add(
      this.createFace(faceSize, [borderOffset, offset, borderOffset], {
        axis: [1, 0, 0],
        angle: -90,
        matProps,
        name
      })
    );
    return corner;
  }
  createHorzEdgeFaces(w, h, offset, name = "", matProps = {}) {
    const edge = new THREE.Object3D();
    const borderOffset = offset - h / 2;
    edge.add(
      this.createFace([w, h], [0, borderOffset, offset], {
        axis: [0, 1, 0],
        angle: 0,
        name,
        matProps
      })
    );
    edge.add(
      this.createFace([w, h], [0, offset, borderOffset], {
        axis: [1, 0, 0],
        angle: -90,
        name,
        matProps
      })
    );
    return edge;
  }
  createVertEdgeFaces(w, h, offset, name = "", matProps = {}) {
    const edge = new THREE.Object3D();
    const borderOffset = offset - w / 2;
    edge.add(
      this.createFace([w, h], [borderOffset, 0, offset], {
        axis: [0, 1, 0],
        angle: 0,
        name,
        matProps
      })
    );
    edge.add(
      this.createFace([w, h], [offset, 0, borderOffset], {
        axis: [0, 1, 0],
        angle: 90,
        name,
        matProps
      })
    );
    return edge;
  }
  createCubeOutline(size) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const geo = new THREE.EdgesGeometry(geometry);
    const mat = new THREE.LineBasicMaterial({
      color: this._outlineColor,
      linewidth: 1
    });
    const wireframe = new THREE.LineSegments(geo, mat);
    return wireframe;
  }
}
const MAIN_COLOR = 0xf9f9fa;
const HOVER_COLOR = 0xececec;
const OUTLINE_COLOR = 13421772;
const DEFAULT_VIEWCUBE_OPTIONS = {
  pos: ObjectPosition.RIGHT_TOP,
  dimension: 150,
  faceColor: MAIN_COLOR,
  hoverColor: HOVER_COLOR,
  outlineColor: OUTLINE_COLOR,
  faceNames: DEFAULT_FACENAMES
};
class ViewCubeGizmo extends FixedPosGizmo {
  /**
   * Construct one instance of view cube gizmo
   * @param camera Camera used in your canvas
   * @param renderer Renderer used in your canvas
   * @param options Options to customize view cube gizmo
   */
  constructor(camera, renderer, options = DEFAULT_VIEWCUBE_OPTIONS) {
    const mergedOptions = {
      ...DEFAULT_VIEWCUBE_OPTIONS,
      ...options
    };
    super(camera, renderer, options.dimension, options.pos);
    this.cube = new ViewCube(
      2,
      0.2,
      true,
      mergedOptions.faceColor,
      mergedOptions.outlineColor,
      mergedOptions.faceNames
    );
    this.add(this.cube);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseClick = this.handleMouseClick.bind(this);
    this.listen(renderer.domElement);
  }
  /**
   * Free the GPU-related resources allocated by this instance. Call this method whenever this instance
   * is no longer used in your app.
   */
  dispose() {
    this.cube.dispose();
  }
  listen(domElement) {
    domElement.addEventListener("mousemove", this.handleMouseMove);
    domElement.addEventListener("click", this.handleMouseClick);
  }
  handleMouseClick(event) {
    const bbox = this.calculateViewportBbox();
    if (bbox.containsPoint(new THREE.Vector2(event.offsetX, event.offsetY))) {
      const pos = this.calculatePosInViewport(
        event.offsetX,
        event.offsetY,
        bbox
      );
      this.checkSideTouch(pos.x, pos.y);
    }
  }
  handleMouseMove(event) {
    const bbox = this.calculateViewportBbox();
    if (bbox.containsPoint(new THREE.Vector2(event.offsetX, event.offsetY))) {
      const pos = this.calculatePosInViewport(
        event.offsetX,
        event.offsetY,
        bbox
      );
      this.checkSideOver(pos.x, pos.y);
    }
  }
  checkSideTouch(x, y) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.gizmoCamera);
    const intersects = raycaster.intersectObjects(this.cube.children, true);
    if (intersects.length) {
      for (const { object } of intersects) {
        if (object.name) {
          const quaternion = this.getRotation(object.name);
          this.dispatchEvent({
            type: "change",
            quaternion
          });
          break;
        }
      }
    }
  }
  checkSideOver(x, y) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.gizmoCamera);
    const intersects = raycaster.intersectObjects(this.cube.children, true);
    this.cube.traverse(function(obj) {
      if (obj.name) {
        const mesh = obj;
        mesh.material.color.setHex(MAIN_COLOR);
      }
    });
    if (intersects.length) {
      for (const { object } of intersects) {
        if (object.name) {
          object.parent.children.forEach(function(child) {
            if (child.name === object.name) {
              const mesh = child;
              mesh.material.color.setHex(
                HOVER_COLOR
              );
            }
          });
          break;
        }
      }
    }
  }
  getRotation(side) {
    const targetQuaternion = new THREE.Quaternion();
    switch (side) {
      case FACES.FRONT:
        targetQuaternion.setFromEuler(new THREE.Euler());
        break;
      case FACES.RIGHT:
        targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0));
        break;
      case FACES.BACK:
        targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
        break;
      case FACES.LEFT:
        targetQuaternion.setFromEuler(new THREE.Euler(0, -Math.PI * 0.5, 0));
        break;
      case FACES.TOP:
        targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI * 0.5, 0, 0));
        break;
      case FACES.BOTTOM:
        targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));
        break;
      case FACES.TOP_FRONT_EDGE:
        targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI * 0.25, 0, 0));
        break;
      case FACES.TOP_RIGHT_EDGE:
        targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.25, Math.PI * 0.5, 0, "YXZ")
        );
        break;
      case FACES.TOP_BACK_EDGE:
        targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.25, Math.PI, 0, "YXZ")
        );
        break;
      case FACES.TOP_LEFT_EDGE:
        targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.25, -Math.PI * 0.5, 0, "YXZ")
        );
        break;
      case FACES.BOTTOM_FRONT_EDGE:
        targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.25, 0, 0));
        break;
      case FACES.BOTTOM_RIGHT_EDGE:
        targetQuaternion.setFromEuler(
          new THREE.Euler(Math.PI * 0.25, Math.PI * 0.5, 0, "YXZ")
        );
        break;
      case FACES.BOTTOM_BACK_EDGE:
        targetQuaternion.setFromEuler(
          new THREE.Euler(Math.PI * 0.25, Math.PI, 0, "YXZ")
        );
        break;
      case FACES.BOTTOM_LEFT_EDGE:
        targetQuaternion.setFromEuler(
          new THREE.Euler(Math.PI * 0.25, -Math.PI * 0.5, 0, "YXZ")
        );
        break;
      case FACES.FRONT_RIGHT_EDGE:
        targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.25, 0));
        break;
      case FACES.BACK_RIGHT_EDGE:
        targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.75, 0));
        break;
      case FACES.BACK_LEFT_EDGE:
        targetQuaternion.setFromEuler(new THREE.Euler(0, -Math.PI * 0.75, 0));
        break;
      case FACES.FRONT_LEFT_EDGE:
        targetQuaternion.setFromEuler(new THREE.Euler(0, -Math.PI * 0.25, 0));
        break;
      case FACES.TOP_FRONT_RIGHT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.25, -Math.PI * 1.75, 0)
        );
        break;
      case FACES.TOP_BACK_RIGHT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(Math.PI * 0.25, -Math.PI * 1.25, 0)
        );
        break;
      case FACES.TOP_BACK_LEFT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(Math.PI * 0.25, -Math.PI * 0.75, 0)
        );
        break;
      case FACES.TOP_FRONT_LEFT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.25, -Math.PI * 0.25, 0)
        );
        break;
      case FACES.BOTTOM_FRONT_RIGHT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(Math.PI * 0.25, -Math.PI * 1.75, 0)
        );
        break;
      case FACES.BOTTOM_BACK_RIGHT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.25, -Math.PI * 1.25, 0)
        );
        break;
      case FACES.BOTTOM_BACK_LEFT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.25, -Math.PI * 0.75, 0)
        );
        break;
      case FACES.BOTTOM_FRONT_LEFT_CORNER:
        targetQuaternion.setFromEuler(
          new THREE.Euler(Math.PI * 0.25, -Math.PI * 0.25, 0)
        );
        break;
      default:
        console.error(
          `[ViewCubeGizmo]: Invalid face, edge, or corner name '${side}'!`
        );
        break;
    }
    return targetQuaternion;
  }
}
const DEFAULT_AXES_OPTIONS = {
  pos: ObjectPosition.LEFT_BOTTOM,
  size: 100,
  hasZAxis: true
};
class AxesGizmo extends FixedPosGizmo {
  constructor(camera, renderer, options) {
    const mergedOptions = {
      ...DEFAULT_AXES_OPTIONS,
      ...options
    };
    super(camera, renderer, mergedOptions.size, options.pos);
    this.hasZAxis = mergedOptions.hasZAxis;
    const vertices = [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0];
    const colors = [1, 0, 0, 1, 0.6, 0, 0, 1, 0, 0.6, 1, 0];
    if (this.hasZAxis) {
      vertices.push(0, 0, 0, 0, 0, 2);
      colors.push(0, 0, 1, 0, 0.6, 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      toneMapped: false
    });
    this.axes = new THREE.LineSegments(geometry, material);
    this.axes.position.set(-1, -1, -1);
    this.add(this.axes);
    this.xText = createTextSprite("X");
    this.xText.position.set(1.5, -1, -1);
    this.add(this.xText);
    this.yText = createTextSprite("Y");
    this.yText.position.set(-1, 1.5, -1);
    this.add(this.yText);
    if (this.hasZAxis) {
      this.zText = createTextSprite("Z");
      this.zText.position.set(-1, -1, 1.5);
      this.add(this.zText);
    }
  }
  /**
   * Set color of x-axis and y-axis
   * @param xAxisColor color of x-axis
   * @param yAxisColor color of y-axis
   */
  setLineColors(xAxisColor, yAxisColor) {
    const color = new THREE.Color();
    const array = this.axes.geometry.attributes.color.array;
    color.set(xAxisColor);
    color.toArray(array, 0);
    color.toArray(array, 3);
    color.set(yAxisColor);
    color.toArray(array, 6);
    color.toArray(array, 9);
    this.axes.geometry.attributes.color.needsUpdate = true;
    return this;
  }
  /**
   * Set text color
   * @param color text color
   */
  setTextColor(color) {
    this.xText.material.color = color;
    this.yText.material.color = color;
  }
  /**
   * Free the GPU-related resources allocated by this instance. Call this method whenever this instance
   * is no longer used in your app.
   */
  dispose() {
    var _a, _b;
    this.axes.geometry.dispose();
    const material = this.axes.material;
    material.dispose();
    this.xText.geometry.dispose();
    this.xText.material.dispose();
    this.yText.geometry.dispose();
    this.yText.material.dispose();
    if (this.hasZAxis) {
      (_a = this.zText) == null ? void 0 : _a.geometry.dispose();
      (_b = this.zText) == null ? void 0 : _b.material.dispose();
    }
  }
}
class SimpleCameraControls {
  /**
   * Construct one instance of view cube helper
   * @param camera Camera used in your canvas
   * @param renderer Renderer used in your canvas
   * @param options Options to customize view cube helper
   */
  constructor(camera) {
    this.camera = camera;
    this.animating = false;
    this.turnRate = 2 * Math.PI;
    this.target = new THREE.Vector3();
    this.q1 = new THREE.Quaternion();
    this.q2 = new THREE.Quaternion();
    this.radius = 0;
    this.clock = new THREE.Clock();
  }
  /**
   * Set associated obit controls
   * @param controls The associated orbit controls
   */
  setControls(controls) {
    if (!controls) return;
    this.controls = controls;
  }
  /**
   * Animation loop
   */
  update() {
    var _a;
    if (this.animating === false) return;
    const delta = this.clock.getDelta();
    const step = delta * this.turnRate;
    this.q1.rotateTowards(this.q2, step);
    this.camera.position.set(0, 0, 1).applyQuaternion(this.q1).multiplyScalar(this.radius).add(this.target);
    this.camera.quaternion.rotateTowards(this.q2, step);
    this.camera.updateProjectionMatrix();
    (_a = this.controls) == null ? void 0 : _a.update();
    if (this.q1.angleTo(this.q2) <= 1e-5) {
      this.animating = false;
      this.clock.stop();
    }
  }
  /**
   * Fly with the target quaterion
   * @param quaternion
   */
  flyTo(quaternion) {
    const focusPoint = new THREE.Vector3();
    const targetPosition = new THREE.Vector3(0, 0, 1);
    this.radius = this.camera.position.distanceTo(focusPoint);
    targetPosition.applyQuaternion(quaternion).multiplyScalar(this.radius).add(focusPoint);
    const dummy = new THREE.Object3D();
    dummy.position.copy(focusPoint);
    dummy.lookAt(this.camera.position);
    this.q1.copy(dummy.quaternion);
    dummy.lookAt(targetPosition);
    this.q2.copy(dummy.quaternion);
    this.animating = true;
    this.clock.start();
  }
}
export {
  AxesGizmo,
  DEFAULT_AXES_OPTIONS,
  DEFAULT_FACENAMES,
  DEFAULT_VIEWCUBE_OPTIONS,
  FixedPosGizmo,
  ObjectPosition,
  SimpleCameraControls,
  ViewCube,
  ViewCubeGizmo
};
