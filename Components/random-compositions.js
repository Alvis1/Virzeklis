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
    count: {type: 'number', default: 10},
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
    
    // Safety check variables
    this.lastSafetyCheck = 0;
    this.safetyCheckInterval = 5000; // Check every 5 seconds for stuck compositions
    
    // Mouse scroll rotation variables
    this.pamatObjects = []; // Track all Pamats objects for rotation
    this.scrollRotationAmount = 5; // Degrees to rotate per scroll
    
    // Wait for scene to be ready
    this.el.sceneEl.addEventListener('loaded', () => {
      this.frustumSystem = this.el.sceneEl.systems['light-frustum'];
      this.createCompositions();
      this.registerWithFrustumSystem();
      this.startSafetySystem();
      this.setupScrollRotation();
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
    // Define available assets
    const pamatAssets = ['pamats-01', 'pamats-02', 'pamats-03', 'pamats-04'];
    const vidusAssets = ['vidus-01', 'vidus-02', 'vidus-03'];
    
    // Scale factor for all objects (much smaller to match original size)
    const globalScale = 0.5;
    
    // Array to track Pamats positions for collision detection
    const pamatPositions = [];
    const minDistance = 15; // Minimum distance between Pamats objects
    
    // Create exactly 1 Pamats base object per composition
    const numPamatsBase = 1; // Only one Pamats per composition
    
    for (let baseIndex = 0; baseIndex < numPamatsBase; baseIndex++) {
      // Create base Pamats object
      const base = document.createElement('a-obj-model');
      const baseAssetId = pamatAssets[Math.floor(Math.random() * pamatAssets.length)];
      base.setAttribute('src', `#${baseAssetId}`);
      
      // Pamats scaling rules: X and Z from 3-5, Y from 5-15
      const baseScaleX = 3 + Math.random() * 2; // 3 to 5
      const baseScaleY = 5 + Math.random() * 10; // 5 to 15
      const baseScaleZ = 3 + Math.random() * 2; // 3 to 5
      base.setAttribute('scale', `${baseScaleX} ${baseScaleY} ${baseScaleZ}`);
      
      // Pamats rotation rules: random rotation on all axes, -15 to 15 degrees each
      const baseRotX = (Math.random() - 0.5) * 30; // -15 to 15 degrees
      const baseRotY = (Math.random() - 0.5) * 30; // -15 to 15 degrees
      const baseRotZ = (Math.random() - 0.5) * 30; // -15 to 15 degrees
      base.setAttribute('rotation', `${baseRotX} ${baseRotY} ${baseRotZ}`);
      
      // Find a position that doesn't overlap with existing Pamats
      let baseX, baseZ, validPosition = false;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        // Generate random position
        baseX = (Math.random() - 0.5) * 20 * globalScale;
        baseZ = (Math.random() - 0.5) * 20 * globalScale;
        
        // Check distance from all existing Pamats
        validPosition = true;
        for (let i = 0; i < pamatPositions.length; i++) {
          const existingPos = pamatPositions[i];
          const distance = Math.sqrt(
            Math.pow(baseX - existingPos.x, 2) + 
            Math.pow(baseZ - existingPos.z, 2)
          );
          
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          // If we can't find a valid position after many attempts, use the last generated position
          validPosition = true;
        }
        
      } while (!validPosition);
      
      // Store this position for future collision checks
      pamatPositions.push({x: baseX, z: baseZ});
      
      base.setAttribute('position', `${baseX} 0 ${baseZ}`);
      base.setAttribute('material', {
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.7 + Math.random() * 0.3,
        flatShading: true,
        emissive: '#ff0000',
        emissiveIntensity: 0.2
      });
      parentEntity.appendChild(base);
      
      // Track this Pamats object for scroll rotation
      this.pamatObjects.push({
        element: base,
        randomAxis: Math.floor(Math.random() * 3), // 0=X, 1=Y, 2=Z
        rotationDirection: 1 // 1 for positive, -1 for negative
      });

      // Stack 1-3 Vidus objects on this Pamats base as children
      const numVidusOnThisBase = 1 + Math.floor(Math.random() * 3); // 1-3 Vidus objects per base
      
      // Estimate the height of the base object (assuming standard OBJ proportions)
      // We'll use the Y scale as a rough approximation of height
      const estimatedBaseHeight = baseScaleY * 0.1; // Rough estimate, adjust if needed
      
      for (let vidusIndex = 0; vidusIndex < numVidusOnThisBase; vidusIndex++) {
        const vidusElement = document.createElement('a-obj-model');
        const vidusAssetId = vidusAssets[Math.floor(Math.random() * vidusAssets.length)];
        vidusElement.setAttribute('src', `#${vidusAssetId}`);
        
        // Vidus scaling rules: independent random scale from 1 to 1.5
        const vidusScaleX = 1 + Math.random() * 0.5; // 1.0 to 1.5
        const vidusScaleZ = 1 + Math.random() * 0.5; // 1.0 to 1.5
        const vidusScaleY = 1 + Math.random() * 0.5; // 1.0 to 1.5
        vidusElement.setAttribute('scale', `${vidusScaleX} ${vidusScaleY} ${vidusScaleZ}`);
        
        // Vidus objects: no rotation - always upright
        vidusElement.setAttribute('rotation', '0 0 0');
        
        // Position Vidus objects relative to the base (as children, positions are relative)
        // Stack them vertically but not higher than the base object
        const stackHeight = (vidusIndex / numVidusOnThisBase) * estimatedBaseHeight;
        
        // Center Vidus objects on X and Z axes (no random offset)
        const vidusX = 0; // Centered on X
        const vidusZ = 0; // Centered on Z
        const vidusY = stackHeight;
        
        vidusElement.setAttribute('position', `${vidusX} ${vidusY} ${vidusZ}`);
        vidusElement.setAttribute('material', {
          color: colors[Math.floor(Math.random() * colors.length)],
          roughness: 0.6 + Math.random() * 0.4,
          flatShading: true,
          emissive: '#ff0000',
          emissiveIntensity: 0.2
        });
        
        // Add Vidus as child of the Pamats base
        base.appendChild(vidusElement);
      }
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

  startSafetySystem: function() {
    // Add a safety system that periodically checks for compositions too close to camera
    this.el.sceneEl.addEventListener('tick', (event) => {
      this.performSafetyCheck(event.detail.time);
    });
    console.log('Safety system started - will check every', this.safetyCheckInterval, 'ms');
  },

  performSafetyCheck: function(time) {
    if (!this.camera || this.compositions.length === 0) return;
    
    // Only check every safetyCheckInterval milliseconds
    if (time - this.lastSafetyCheck < this.safetyCheckInterval) return;
    this.lastSafetyCheck = time;
    
    const cameraPos = this.camera.getAttribute('position');
    if (!cameraPos) return;
    
    console.log('Performing safety check...');
    
    const grayColors = ['#A0A0A0', '#B8B8B8', '#909090', '#C8C8C8', '#888888', '#D0D0D0'];
    let repositionedCount = 0;
    
    // Check each composition for distance from camera
    this.compositions.forEach((composition, index) => {
      if (!composition.parentNode) return; // Skip if removed from scene
      
      const pos = composition.getAttribute('position');
      if (!pos) return;
      
      // Calculate distance from camera
      const distance = Math.sqrt(
        Math.pow(pos.x - cameraPos.x, 2) + 
        Math.pow(pos.z - cameraPos.z, 2)
      );
      
      // If composition is too close, force reposition it
      if (distance < this.data.minDist) {
        console.log(`Safety check: Composition ${index} too close (${distance.toFixed(1)} < ${this.data.minDist}), repositioning`);
        this.forceRepositionComposition(composition, grayColors);
        repositionedCount++;
      }
    });
    
    if (repositionedCount > 0) {
      console.log(`Safety check complete: repositioned ${repositionedCount} compositions`);
    }
  },

  forceRepositionComposition: function(entity, colors) {
    // Force reposition a composition that's too close to camera
    this.randomizeCompositionPosition(entity);
    this.regenerateComposition(entity, colors);
    console.log('Forced repositioning completed for composition');
  },

  setupScrollRotation: function() {
    // Add mouse wheel event listener for rotating Pamats objects
    const handleScroll = (event) => {
      event.preventDefault();
      
      // Determine scroll direction (positive = scroll up, negative = scroll down)
      const scrollDirection = event.deltaY > 0 ? 1 : -1;
      const rotationAmount = this.scrollRotationAmount * scrollDirection;
      
      // Rotate each Pamats object on its assigned random axis
      this.pamatObjects.forEach(pamatObj => {
        const currentRotation = pamatObj.element.getAttribute('rotation') || {x: 0, y: 0, z: 0};
        
        // Calculate the actual rotation amount considering direction
        const actualRotationAmount = rotationAmount * pamatObj.rotationDirection;
        
        // Apply rotation to the random axis with direction reversal at limits
        switch(pamatObj.randomAxis) {
          case 0: // X-axis
            let newRotX = currentRotation.x + actualRotationAmount;
            if (newRotX >= 45 || newRotX <= -45) {
              pamatObj.rotationDirection *= -1; // Reverse direction
              newRotX = Math.max(-45, Math.min(45, newRotX)); // Clamp to limits
            }
            currentRotation.x = newRotX;
            break;
          case 1: // Y-axis
            let newRotY = currentRotation.y + actualRotationAmount;
            if (newRotY >= 45 || newRotY <= -45) {
              pamatObj.rotationDirection *= -1; // Reverse direction
              newRotY = Math.max(-45, Math.min(45, newRotY)); // Clamp to limits
            }
            currentRotation.y = newRotY;
            break;
          case 2: // Z-axis
            let newRotZ = currentRotation.z + actualRotationAmount;
            if (newRotZ >= 45 || newRotZ <= -45) {
              pamatObj.rotationDirection *= -1; // Reverse direction
              newRotZ = Math.max(-45, Math.min(45, newRotZ)); // Clamp to limits
            }
            currentRotation.z = newRotZ;
            break;
        }
        
        pamatObj.element.setAttribute('rotation', currentRotation);
      });
    };
    
    // Add event listener to the scene canvas
    const canvas = this.el.sceneEl.canvas;
    if (canvas) {
      canvas.addEventListener('wheel', handleScroll, { passive: false });
    }
    
    console.log('Scroll rotation setup complete for', this.pamatObjects.length, 'Pamats objects');
  },

  remove: function() {
    // Clean up when component is removed
    if (this.frustumSystem) {
      this.frustumSystem.unregister(this);
    }
    
    // Remove scroll event listener
    const canvas = this.el.sceneEl.canvas;
    if (canvas) {
      canvas.removeEventListener('wheel', this.handleScroll);
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
    this._lastDistanceCheck = 0;
    this._distanceCheckInterval = 2000; // Check distance every 2 seconds

    // Reference the light-frustum system explicitly
    this.lf = this.el.sceneEl.systems['light-frustum'];

    // Optional bounds discovery (once)
    const ready = () => { this._setupBoundsOnce(); };
    if (this.el.getObject3D('mesh')) ready();
    this.el.addEventListener('object3dset', e => { if (e.detail.type === 'mesh') ready(); });
    this.el.addEventListener('model-loaded', ready);

    if (this.lf) this.lf.register(this);
    
    // Start distance-based checking as backup
    this.el.sceneEl.addEventListener('tick', (event) => {
      this._checkDistanceFromCamera(event.detail.time);
    });
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

  _checkDistanceFromCamera(time) {
    // Backup distance-based check in case frustum system fails
    if (!this.lf || time - this._lastDistanceCheck < this._distanceCheckInterval) return;
    this._lastDistanceCheck = time;
    
    const scene = this.el.sceneEl;
    const cam = scene && scene.camera;
    if (!cam) return;
    
    // Get camera and object positions
    const camPos = this._tmpV2;
    cam.getWorldPosition(camPos);
    
    const objPos = this._tmpV1;
    this.el.object3D.getWorldPosition(objPos);
    
    // Calculate distance (ignore Y difference for ground-level compositions)
    const distance = Math.sqrt(
      Math.pow(objPos.x - camPos.x, 2) + 
      Math.pow(objPos.z - camPos.z, 2)
    );
    
    // If too close, force respawn
    if (distance < this.data.minDist) {
      console.log(`Distance check: Object too close (${distance.toFixed(1)} < ${this.data.minDist}), respawning`);
      this._inView = false; // Force to not in view
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

    // Ensure minimum distance is always at least 20
    const minD = Math.max(this.data.minDist, 20, cam.near + 0.5);
    const maxD = Math.min(this.data.maxDist, cam.far * 0.9);

    let placed = false;
    for (let i = 0; i < 20 && !placed; i++) { // Increased attempts from 12 to 20
      // random direction
      const dir = this._randUnit(this._tmpV3);
      if (camFwd.dot(dir) > cosLimit) { i--; continue; } // still in FOV, retry

      const dist = THREE.MathUtils.lerp(minD, maxD, Math.random());
      const pos = dir.multiplyScalar(dist).add(camPos);

      if (this.data.lockY) pos.y = THREE.MathUtils.clamp(pos.y, this.data.yMin, this.data.yMax);

      // Verify the distance is safe before placing
      const finalDistance = Math.sqrt(
        Math.pow(pos.x - camPos.x, 2) + 
        Math.pow(pos.z - camPos.z, 2)
      );
      
      if (finalDistance < 20) { // Force minimum 20 unit distance
        i--; // Don't count this attempt
        continue;
      }

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
      // Enhanced fallback: place at a safe distance in multiple possible directions
      const safeDistance = Math.max(30, maxD); // Ensure at least 30 units away
      const fallbackDirections = [
        {x: 1, z: 0},   // Right
        {x: -1, z: 0},  // Left  
        {x: 0, z: 1},   // Forward
        {x: 0, z: -1},  // Back
        {x: 1, z: 1},   // Diagonal
        {x: -1, z: -1}, // Diagonal
        {x: 1, z: -1},  // Diagonal
        {x: -1, z: 1}   // Diagonal
      ];
      
      const randomDir = fallbackDirections[Math.floor(Math.random() * fallbackDirections.length)];
      const pos = this._tmpV3.set(
        camPos.x + randomDir.x * safeDistance,
        this.data.lockY ? THREE.MathUtils.clamp(camPos.y, this.data.yMin, this.data.yMax) : camPos.y,
        camPos.z + randomDir.z * safeDistance
      );
      
      this.el.object3D.position.copy(pos);
      console.log(`Fallback positioning: placed at distance ${safeDistance} from camera`);
    }

    this.el.emit('respawned-offscreen');
  },

  _randUnit(out){
    out.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
    if (out.lengthSq() < 1e-6) out.set(1,0,0);
    return out.normalize();
  }
});
