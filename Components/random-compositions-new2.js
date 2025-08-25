// Simple time-based composition repositioning system
AFRAME.registerComponent('random-compositions', {
  schema: {
    count: {type: 'number', default: 20},
    spread: {type: 'number', default: 50},
    minRadius: {type: 'number', default: 20},
    maxRadius: {type: 'number', default: 50},
    minHeight: {type: 'number', default: 2},
    maxHeight: {type: 'number', default: 8},
    minDist: {type: 'number', default: 20}, // Minimum distance from camera
    maxDist: {type: 'number', default: 60}, // Maximum distance from camera
    repositionInterval: {type: 'number', default: 4000}, // Check every 4 seconds
    repositionChance: {type: 'number', default: 0.15}, // 15% chance per check
    cameraSelector: {type: 'string', default: 'a-camera'}
  },

  init: function () {
    this.compositions = []; // Keep track of compositions
    this.camera = null;
    this.lastRepositionTime = 0;
    
    // Wait for scene to be ready
    this.el.sceneEl.addEventListener('loaded', () => {
      this.createCompositions();
      this.findCamera();
      this.startRepositionSystem();
    });
  },

  createCompositions: function () {
    const data = this.data;
    // Monochromatic gray palette similar to the image
    const grayColors = ['#A0A0A0', '#B8B8B8', '#909090', '#C8C8C8', '#888888', '#D0D0D0'];

    for (let i = 0; i < data.count; i++) {
      // Create main entity container
      const entity = document.createElement('a-entity');
      
      // Generate initial position with minimum distance from camera
      this.repositionComposition(entity);
      
      // Create architectural tower-like composition
      this.createTowerComposition(entity, grayColors);
      
      // Add timestamp for repositioning logic
      entity.userData = {
        lastRepositioned: Date.now(),
        compositionId: i
      };
      
      // Add the composition to the scene and track it
      this.el.appendChild(entity);
      this.compositions.push(entity);
    }
    
    console.log(`Created ${data.count} compositions`);
  },

  repositionComposition: function(entity) {
    const data = this.data;
    
    // Get camera position
    let cameraPos = {x: 0, y: 10, z: 0}; // Default camera position
    if (this.camera) {
      const camPosition = this.camera.getAttribute('position');
      if (camPosition) {
        cameraPos = camPosition;
      }
    }
    
    let x, z, distance;
    let attempts = 0;
    do {
      // Generate random position in a wider area
      x = (Math.random() - 0.5) * data.spread * 2;
      z = (Math.random() - 0.5) * data.spread * 2;
      // Calculate distance from camera position
      distance = Math.sqrt(
        Math.pow(x - cameraPos.x, 2) + Math.pow(z - cameraPos.z, 2)
      );
      attempts++;
    } while ((distance < data.minRadius || distance > data.maxRadius) && attempts < 50);
    
    const y = 0; // Start at ground level
    entity.setAttribute('position', `${x} ${y} ${z}`);
    
    console.log(`Positioned composition at (${x.toFixed(1)}, ${y}, ${z.toFixed(1)}), distance: ${distance.toFixed(1)}`);
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
    
    // Update timestamp
    if (entity.userData) {
      entity.userData.lastRepositioned = Date.now();
    }
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

  findCamera: function() {
    this.camera = document.querySelector(this.data.cameraSelector);
    if (!this.camera) {
      console.warn('Camera not found for repositioning system');
      return;
    }
    console.log('Camera found for repositioning system:', this.camera);
  },

  startRepositionSystem: function() {
    if (!this.camera) {
      console.warn('Cannot start repositioning system: camera not found');
      return;
    }

    // Use A-Frame's tick system for regular checks
    this.el.sceneEl.addEventListener('tick', (event) => {
      this.checkRepositioning(event.detail.time);
    });
    
    console.log('Repositioning system started');
  },

  checkRepositioning: function(time) {
    if (!this.camera || this.compositions.length === 0) return;
    
    // Only check every repositionInterval milliseconds
    if (time - this.lastRepositionTime < this.data.repositionInterval) return;
    this.lastRepositionTime = time;
    
    const cameraPos = this.camera.getAttribute('position');
    if (!cameraPos) return;
    
    const grayColors = ['#A0A0A0', '#B8B8B8', '#909090', '#C8C8C8', '#888888', '#D0D0D0'];
    
    // Check each composition
    this.compositions.forEach((composition, index) => {
      if (!composition.parentNode) return; // Skip if removed from scene
      
      const pos = composition.getAttribute('position');
      if (!pos) return;
      
      // Calculate distance from camera
      const distance = Math.sqrt(
        Math.pow(pos.x - cameraPos.x, 2) + 
        Math.pow(pos.z - cameraPos.z, 2)
      );
      
      // Check if composition should be repositioned
      let shouldReposition = false;
      
      // Force reposition if too close to camera
      if (distance < this.data.minDist) {
        shouldReposition = true;
        console.log(`Composition ${index} too close (${distance.toFixed(1)} < ${this.data.minDist}), repositioning`);
      }
      // Random chance to reposition compositions that are far away
      else if (distance > this.data.maxRadius && Math.random() < this.data.repositionChance) {
        shouldReposition = true;
        console.log(`Composition ${index} randomly selected for repositioning (distance: ${distance.toFixed(1)})`);
      }
      // Occasional random repositioning for variety
      else if (Math.random() < this.data.repositionChance * 0.3) {
        shouldReposition = true;
        console.log(`Composition ${index} randomly repositioned for variety`);
      }
      
      if (shouldReposition) {
        this.repositionComposition(composition);
        this.regenerateComposition(composition, grayColors);
      }
    });
  },

  remove: function() {
    // Clean up when component is removed
    console.log('Random compositions component removed');
  }
});
