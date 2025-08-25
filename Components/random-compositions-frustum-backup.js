// Light frustum system for efficient visibility checking
AFRAME.registerSystem('light-frustum', {
  schema: { throttleMs: { default: 60 } }, // ~16 fps checks
  init() {
    this.targets = new Set();
    this.frustum = new THREE.Frustum();
    this._projView = new THREE.Matrix4();
    this._last = 0;
  },
  register(comp){ this.targets.add(comp); },
  unregister(comp){ this.targets.delete(comp); },
  tick(t) {
    const cam = this.el.camera;
    if (!cam) return;
    if (t - this._last < this.data.throttleMs) return;
    this._last = t;

    // Build frustum from camera (world → clip)
    cam.updateMatrixWorld(true);
    this._projView.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this._projView);

    // Ask components to run their visibility checks
    this.targets.forEach(c => c.__checkVisible(this.frustum));
  }
});

AFRAME.registerComponent('random-compositions', {
  schema: {
    count: {type: 'number', default: 20},
    spread: {type: 'number', default: 50},
    minRadius: {type: 'number', default: 20},
    maxRadius: {type: 'number', default: 50},
    minHeight: {type: 'number', default: 2},
    maxHeight: {type: 'number', default: 8},
    minDist: {type: 'number', default: 20}, // Minimum respawn distance - not closer than 20 from camera
    maxDist: {type: 'number', default: 60}, // Maximum respawn distance
    marginDeg: {type: 'number', default: 15}, // Margin outside FOV for respawn
    cameraSelector: {type: 'string', default: 'a-camera'}
  },

  init: function () {
    this.compositions = []; // Keep track of compositions
    this.camera = null;
    this.frustumSystem = null;
    this._sphere = new THREE.Sphere();
    this._tmpV1 = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpV3 = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    
    // Wait for scene to be ready
    this.el.sceneEl.addEventListener('loaded', () => {
      this.frustumSystem = this.el.sceneEl.systems['light-frustum'];
      this.createCompositions();
      this.registerWithFrustumSystem();
    });
  },

  createCompositions: function () {
    const data = this.data;
    // Monochromatic gray palette similar to the image
    const grayColors = ['#A0A0A0', '#B8B8B8', '#909090', '#C8C8C8', '#888888', '#D0D0D0'];

    for (let i = 0; i < data.count; i++) {
      // Create main entity container
      const entity = document.createElement('a-entity');
      
      // Generate initial position with minimum and maximum radius constraints
      this.randomizeCompositionPosition(entity);
      
      // Create architectural tower-like composition
      this.createTowerComposition(entity, grayColors);
      
      // Add offscreen respawn component
      entity.setAttribute('offscreen-respawn', {
        radius: 3,
        minDist: this.data.minDist,
        maxDist: this.data.maxDist,
        marginDeg: this.data.marginDeg,
        lockY: true,
        yMin: 0,
        yMax: 2,
        randomYawOnly: true
      });
      
      // Listen for respawn event to regenerate composition
      entity.addEventListener('respawned-offscreen', () => {
        this.regenerateComposition(entity, grayColors);
      });
      
      // Add the composition to the scene and track it
      this.el.appendChild(entity);
      this.compositions.push(entity);
    }
  },

  randomizeCompositionPosition: function(entity) {
    const data = this.data;
    
    // Get camera position to ensure minimum distance from camera
    const camera = document.querySelector(data.cameraSelector);
    let cameraPos = {x: 0, y: 0, z: 0}; // Default to origin if camera not found
    if (camera) {
      const camPosition = camera.getAttribute('position');
      if (camPosition) {
        cameraPos = camPosition;
      }
    }
    
    let x, z, distance;
    do {
      x = (Math.random() - 0.5) * data.spread;
      z = (Math.random() - 0.5) * data.spread;
      // Calculate distance from camera position, not from origin
      distance = Math.sqrt(
        Math.pow(x - cameraPos.x, 2) + Math.pow(z - cameraPos.z, 2)
      );
    } while (distance < data.minRadius || distance > data.maxRadius);
    
    const y = 0; // Start at ground level
    entity.setAttribute('position', `${x} ${y} ${z}`);
  },

  regenerateComposition: function(entity, colors) {
    // Clear existing composition
    while (entity.firstChild) {
      entity.removeChild(entity.firstChild);
    }
    
    // Create new tower composition with randomized parameters
    this.createTowerComposition(entity, colors);
    
    // Add random rotation to make it more dynamic
    const rotation = entity.getAttribute('rotation') || {x: 0, y: 0, z: 0};
    rotation.y = Math.random() * 360;
    entity.setAttribute('rotation', rotation);
  },

  createTowerComposition: function(parentEntity, colors) {
    // Base of the tower - wide rectangular base with more variation
    const base = document.createElement('a-entity');
    const baseWidth = 2 + Math.random() * 3; // More variation: 2-5
    const baseHeight = 0.5 + Math.random() * 1.5; // More variation: 0.5-2
    const baseDepth = 2 + Math.random() * 3; // More variation: 2-5
    
    base.setAttribute('geometry', {
      primitive: 'box',
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth
    });
    base.setAttribute('position', `0 ${baseHeight/2} 0`);
    base.setAttribute('material', {
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.7 + Math.random() * 0.3, // Random roughness
      flatShading: true
    });
    parentEntity.appendChild(base);

    // Main tower body - more variation in tapering
    const towerBody = document.createElement('a-entity');
    const towerHeight = 3 + Math.random() * 6; // More variation: 3-9
    const towerWidth = baseWidth * (0.4 + Math.random() * 0.5); // More dramatic tapering
    const towerDepth = baseDepth * (0.4 + Math.random() * 0.5);
    
    towerBody.setAttribute('geometry', {
      primitive: 'box',
      width: towerWidth,
      height: towerHeight,
      depth: towerDepth
    });
    towerBody.setAttribute('position', `0 ${baseHeight + towerHeight/2} 0`);
    towerBody.setAttribute('material', {
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.6 + Math.random() * 0.4,
      flatShading: true
    });
    parentEntity.appendChild(towerBody);

    // Pyramidal top with more variety
    const pyramid = document.createElement('a-entity');
    const pyramidHeight = 1 + Math.random() * 3; // More height variation
    const pyramidRadiusX = Math.max(towerWidth, towerDepth) / 2;
    const pyramidRadiusZ = Math.max(towerWidth, towerDepth) / 2;
    const pyramidRadius = Math.max(pyramidRadiusX, pyramidRadiusZ) * (0.8 + Math.random() * 0.4); // Size variation
    
    pyramid.setAttribute('geometry', {
      primitive: 'cone',
      radiusBottom: pyramidRadius,
      radiusTop: 0,
      height: pyramidHeight,
      segmentsRadial: 4 + Math.floor(Math.random() * 4) // 4-7 segments for variety
    });
    pyramid.setAttribute('position', `0 ${baseHeight + towerHeight + pyramidHeight/2} 0`);
    pyramid.setAttribute('rotation', `0 ${Math.random() * 90} 0`); // Random rotation
    pyramid.setAttribute('material', {
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.5 + Math.random() * 0.5,
      flatShading: true
    });
    parentEntity.appendChild(pyramid);

    // Add 0-4 protruding elements with more variety
    const numProtrusions = Math.floor(Math.random() * 5); // 0-4 protrusions
    
    for (let i = 0; i < numProtrusions; i++) {
      const protrusion = document.createElement('a-entity');
      const protrusionSize = 0.6 + Math.random() * 1.5; // More size variation
      
      // Random position on the tower body
      const protrusionY = baseHeight + Math.random() * towerHeight * 0.9;
      const side = Math.floor(Math.random() * 4); // Which side of the tower
      let protrusionX = 0, protrusionZ = 0;
      
      switch(side) {
        case 0: // Front
          protrusionZ = towerDepth/2 + protrusionSize/2;
          protrusionX = (Math.random() - 0.5) * towerWidth * 0.8;
          break;
        case 1: // Back
          protrusionZ = -(towerDepth/2 + protrusionSize/2);
          protrusionX = (Math.random() - 0.5) * towerWidth * 0.8;
          break;
        case 2: // Left
          protrusionX = -(towerWidth/2 + protrusionSize/2);
          protrusionZ = (Math.random() - 0.5) * towerDepth * 0.8;
          break;
        case 3: // Right
          protrusionX = towerWidth/2 + protrusionSize/2;
          protrusionZ = (Math.random() - 0.5) * towerDepth * 0.8;
          break;
      }
      
      // Random protrusion shape
      const protrusionType = Math.random() < 0.7 ? 'box' : (Math.random() < 0.5 ? 'cylinder' : 'sphere');
      let protrusionGeometry = {};
      
      switch(protrusionType) {
        case 'box':
          protrusionGeometry = {
            primitive: 'box',
            width: protrusionSize,
            height: protrusionSize * (0.7 + Math.random() * 0.6),
            depth: protrusionSize
          };
          break;
        case 'cylinder':
          protrusionGeometry = {
            primitive: 'cylinder',
            radius: protrusionSize * 0.5,
            height: protrusionSize * (0.8 + Math.random() * 0.7)
          };
          break;
        case 'sphere':
          protrusionGeometry = {
            primitive: 'sphere',
            radius: protrusionSize * 0.6
          };
          break;
      }
      
      protrusion.setAttribute('geometry', protrusionGeometry);
      protrusion.setAttribute('position', `${protrusionX} ${protrusionY} ${protrusionZ}`);
      protrusion.setAttribute('material', {
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.8 + Math.random() * 0.2,
        flatShading: true
      });
      
      // Sometimes add pyramid tops to protrusions
      if (Math.random() < 0.6 && protrusionType === 'box') {
        const protrusionPyramid = document.createElement('a-entity');
        const protrusionPyramidHeight = protrusionSize * (0.4 + Math.random() * 0.4);
        const protrusionPyramidRadius = protrusionSize / 2;
        
        protrusionPyramid.setAttribute('geometry', {
          primitive: 'cone',
          radiusBottom: protrusionPyramidRadius,
          radiusTop: 0,
          height: protrusionPyramidHeight,
          segmentsRadial: 4
        });
        protrusionPyramid.setAttribute('position', `${protrusionX} ${protrusionY + protrusionSize/2 + protrusionPyramidHeight/2} ${protrusionZ}`);
        protrusionPyramid.setAttribute('rotation', `0 ${Math.random() * 90} 0`);
        protrusionPyramid.setAttribute('material', {
          color: colors[Math.floor(Math.random() * colors.length)],
          roughness: 0.5 + Math.random() * 0.5,
          flatShading: true
        });
        
        parentEntity.appendChild(protrusionPyramid);
      }
      
      parentEntity.appendChild(protrusion);
    }
  },

  registerWithFrustumSystem: function() {
    // Find the camera
    this.camera = document.querySelector(this.data.cameraSelector);
    if (!this.camera) {
      console.warn('Camera not found for frustum system');
      return;
    }

    console.log('Frustum system ready. Camera found:', this.camera);
    console.log('Compositions count:', this.compositions.length);
  },

  remove: function() {
    // Clean up when component is removed
    if (this.frustumSystem) {
      this.frustumSystem.unregister(this);
    }
  }
});

// ==========================================
// Component: respawn entity to a random off-screen place on exit
// ==========================================
AFRAME.registerComponent('offscreen-respawn', {
  schema: {
    radius: {type: 'number', default: 0},   // set >0 to skip geometry bounds
    minDist:{type: 'number', default: 15},
    maxDist:{type: 'number', default: 60},
    marginDeg:{type: 'number', default: 15},
    lockY: {default: false},
    yMin:  {type: 'number', default: 0.4},
    yMax:  {type: 'number', default: 1.8},
    randomYawOnly: {default: true}
  },

  init(){
    this._inView = false;
    this._sphere = new THREE.Sphere();
    this._tmpV1 = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpV3 = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._boundsMesh = null;
    this._baseCenter = null;
    this._baseRadius = 0;

    // Reference the light-frustum system explicitly
    this.lf = this.el.sceneEl.systems['light-frustum'];

    // Optional bounds discovery (once)
    const ready = () => { this._setupBoundsOnce(); };
    if (this.el.getObject3D('mesh')) ready();
    this.el.addEventListener('object3dset', e => { if (e.detail.type === 'mesh') ready(); });
    this.el.addEventListener('model-loaded', ready);

    if (this.lf) this.lf.register(this);
  },

  remove(){ if (this.lf) this.lf.unregister(this); },

  _setupBoundsOnce(){
    if (this.data.radius > 0) return;
    let m = null;
    this.el.object3D.traverse(n => { if (!m && n.isMesh && n.geometry) m = n; });
    if (!m) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (g.boundingSphere) {
      this._boundsMesh = m;
      this._baseCenter = g.boundingSphere.center.clone();
      this._baseRadius = g.boundingSphere.radius;
    }
  },

  __getWorldSphere(out){
    if (this.data.radius > 0) {
      this.el.object3D.getWorldPosition(this._tmpV1);
      out.center.copy(this._tmpV1);
      out.radius = this.data.radius;
      return out;
    }
    if (this._boundsMesh && this._baseCenter) {
      const m = this._boundsMesh;
      // world center
      this._tmpV1.copy(this._baseCenter).applyMatrix4(m.matrixWorld);
      // world uniform scale
      m.getWorldScale(this._tmpScale);
      const s = Math.max(this._tmpScale.x, this._tmpScale.y, this._tmpScale.z);
      out.center.copy(this._tmpV1);
      out.radius = this._baseRadius * s;
      return out;
    }
    if (!this._box) this._box = new THREE.Box3();
    this._box.setFromObject(this.el.object3D);
    if (this._box.isEmpty()) {
      this.el.object3D.getWorldPosition(this._tmpV1);
      out.center.copy(this._tmpV1);
      out.radius = 0.5;
    } else {
      this._box.getBoundingSphere(out);
    }
    return out;
  },

  __checkVisible(frustum){
    const s = this.__getWorldSphere(this._sphere);
    const visible = frustum.intersectsSphere(s);

    if (visible && !this._inView) {
      this._inView = true;
      this.el.emit('enter-view');
    } else if (!visible && this._inView) {
      this._inView = false;
      this.el.emit('exit-view');
      this.__respawnOffscreen();
    }
  },

  __respawnOffscreen(){
    const scene = this.el.sceneEl;
    const cam = scene && scene.camera;
    if (!cam || !this.lf) return;

    // Camera world-space orientation and position
    cam.getWorldQuaternion(this._tmpQuat);
    const camFwd = this._tmpV1.set(0,0,-1).applyQuaternion(this._tmpQuat).normalize();
    const camPos = this._tmpV2;
    cam.getWorldPosition(camPos);

    const halfFovRad = THREE.MathUtils.degToRad(cam.fov * 0.5);
    const marginRad  = THREE.MathUtils.degToRad(this.data.marginDeg);
    const cosLimit   = Math.cos(halfFovRad + marginRad);

    const minD = Math.max(this.data.minDist, cam.near + 0.5);
    const maxD = Math.min(this.data.maxDist, cam.far * 0.9);

    let placed = false;
    for (let i = 0; i < 12 && !placed; i++) {
      // random direction
      const dir = this._randUnit(this._tmpV3);
      if (camFwd.dot(dir) > cosLimit) { i--; continue; } // still in FOV, retry

      const dist = THREE.MathUtils.lerp(minD, maxD, Math.random());
      const pos = dir.multiplyScalar(dist).add(camPos);

      if (this.data.lockY) pos.y = THREE.MathUtils.clamp(pos.y, this.data.yMin, this.data.yMax);

      // apply position + rotation
      this.el.object3D.position.copy(pos);
      if (this.data.randomYawOnly) {
        const yaw = Math.random() * 360;
        this.el.object3D.rotation.set(0, THREE.MathUtils.degToRad(yaw), 0);
      } else {
        this.el.object3D.rotation.set(
          THREE.MathUtils.degToRad(Math.random()*360),
          THREE.MathUtils.degToRad(Math.random()*360),
          THREE.MathUtils.degToRad(Math.random()*360)
        );
      }

      // verify off-screen
      this.__getWorldSphere(this._sphere);
      placed = !this.lf.frustum.intersectsSphere(this._sphere);
    }

    if (!placed) {
      // guaranteed off-screen: directly behind camera at maxD
      const pos = this._tmpV3.copy(camPos).addScaledVector(camFwd, -maxD);
      if (this.data.lockY) pos.y = THREE.MathUtils.clamp(pos.y, this.data.yMin, this.data.yMax);
      this.el.object3D.position.copy(pos);
    }

    this.el.emit('respawned-offscreen');
  },

  _randUnit(out){
    out.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
    if (out.lengthSq() < 1e-6) out.set(1,0,0);
    return out.normalize();
  }
});
