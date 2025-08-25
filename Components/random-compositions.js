AFRAME.registerComponent('random-compositions', {
  schema: {
    count: {type: 'number', default: 20},
    spread: {type: 'number', default: 50},
    minRadius: {type: 'number', default: 20},
    maxRadius: {type: 'number', default: 50},
    minHeight: {type: 'number', default: 2},
    maxHeight: {type: 'number', default: 8}
  },

  init: function () {
    this.createCompositions();
  },

  createCompositions: function () {
    const data = this.data;
    // Monochromatic gray palette similar to the image
    const grayColors = ['#A0A0A0', '#B8B8B8', '#909090', '#C8C8C8', '#888888', '#D0D0D0'];

    for (let i = 0; i < data.count; i++) {
      // Create main entity container
      const entity = document.createElement('a-entity');
      
      // Generate position with minimum and maximum radius constraints
      let x, z, distance;
      do {
        x = (Math.random() - 0.5) * data.spread;
        z = (Math.random() - 0.5) * data.spread;
        distance = Math.sqrt(x * x + z * z);
      } while (distance < data.minRadius || distance > data.maxRadius); // Keep generating until within min-max radius range
      
      const y = 0; // Start at ground level
      
      entity.setAttribute('position', `${x} ${y} ${z}`);
      
      // Create architectural tower-like composition
      this.createTowerComposition(entity, grayColors);
      
      // Add the composition to the scene
      this.el.appendChild(entity);
    }
  },

    createTowerComposition: function(parentEntity, colors) {
    // Base of the tower - wide rectangular base
    const base = document.createElement('a-entity');
    const baseWidth = 3 + Math.random() * 2;
    const baseHeight = 1 + Math.random() * 1;
    const baseDepth = 3 + Math.random() * 2;
    
    base.setAttribute('geometry', {
      primitive: 'box',
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth
    });
    base.setAttribute('position', `0 ${baseHeight/2} 0`);
    base.setAttribute('material', {
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.8,
      flatShading: true
    });
    parentEntity.appendChild(base);

    // Main tower body - tapered or straight
    const towerBody = document.createElement('a-entity');
    const towerHeight = 4 + Math.random() * 4;
    const towerWidth = baseWidth * (0.6 + Math.random() * 0.3);
    const towerDepth = baseDepth * (0.6 + Math.random() * 0.3);
    
    towerBody.setAttribute('geometry', {
      primitive: 'box',
      width: towerWidth,
      height: towerHeight,
      depth: towerDepth
    });
    towerBody.setAttribute('position', `0 ${baseHeight + towerHeight/2} 0`);
    towerBody.setAttribute('material', {
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.7,
      flatShading: true
    });
    parentEntity.appendChild(towerBody);

    // Pyramidal top - base matches the original base dimensions exactly
    const pyramid = document.createElement('a-entity');
    const pyramidHeight = 1.5 + Math.random() * 2;
    // Make pyramid base match the exact base dimensions (convert radius to match rectangular base)
    const pyramidRadiusX = baseWidth / 2;
    const pyramidRadiusZ = baseDepth / 2;
    const pyramidRadius = Math.max(pyramidRadiusX, pyramidRadiusZ);
    
    pyramid.setAttribute('geometry', {
      primitive: 'cone',
      radiusBottom: pyramidRadius,
      radiusTop: 0,
      height: pyramidHeight,
      segmentsRadial: 4 // Makes it pyramid-like instead of smooth cone
    });
    pyramid.setAttribute('position', `0 ${baseHeight + towerHeight + pyramidHeight/2} 0`);
    pyramid.setAttribute('rotation', `0 45 0`); // Rotate to make it look more architectural
    pyramid.setAttribute('material', {
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.6,
      flatShading: true
    });
    parentEntity.appendChild(pyramid);

    // Add 1-3 protruding elements (like in the image)
    const numProtrusions = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numProtrusions; i++) {
      const protrusion = document.createElement('a-entity');
      const protrusionSize = 0.8 + Math.random() * 1.2;
      
      // Random position on the tower body
      const protrusionY = baseHeight + Math.random() * towerHeight * 0.8;
      const side = Math.floor(Math.random() * 4); // Which side of the tower
      let protrusionX = 0, protrusionZ = 0;
      
      switch(side) {
        case 0: // Front
          protrusionZ = towerDepth/2 + protrusionSize/2;
          protrusionX = (Math.random() - 0.5) * towerWidth * 0.6;
          break;
        case 1: // Back
          protrusionZ = -(towerDepth/2 + protrusionSize/2);
          protrusionX = (Math.random() - 0.5) * towerWidth * 0.6;
          break;
        case 2: // Left
          protrusionX = -(towerWidth/2 + protrusionSize/2);
          protrusionZ = (Math.random() - 0.5) * towerDepth * 0.6;
          break;
        case 3: // Right
          protrusionX = towerWidth/2 + protrusionSize/2;
          protrusionZ = (Math.random() - 0.5) * towerDepth * 0.6;
          break;
      }
      
      protrusion.setAttribute('geometry', {
        primitive: 'box',
        width: protrusionSize,
        height: protrusionSize,
        depth: protrusionSize
      });
      protrusion.setAttribute('position', `${protrusionX} ${protrusionY} ${protrusionZ}`);
      protrusion.setAttribute('material', {
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.9,
        flatShading: true
      });
      
      // Add pyramid top to each protrusion - aligned with protrusion base
      const protrusionPyramid = document.createElement('a-entity');
      const protrusionPyramidHeight = protrusionSize * 0.6;
      const protrusionPyramidRadius = protrusionSize / 2; // Match the cube's half-width
      
      protrusionPyramid.setAttribute('geometry', {
        primitive: 'cone',
        radiusBottom: protrusionPyramidRadius,
        radiusTop: 0,
        height: protrusionPyramidHeight,
        segmentsRadial: 4
      });
      protrusionPyramid.setAttribute('position', `${protrusionX} ${protrusionY + protrusionSize/2 + protrusionPyramidHeight/2} ${protrusionZ}`);
      protrusionPyramid.setAttribute('rotation', `0 45 0`);
      protrusionPyramid.setAttribute('material', {
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.6,
        flatShading: true
      });
      
      parentEntity.appendChild(protrusion);
      parentEntity.appendChild(protrusionPyramid);
    }
  }
});
