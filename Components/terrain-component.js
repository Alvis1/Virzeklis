AFRAME.registerComponent('terrain', {
  schema: {
  width: {type: 'number', default: 1000},
  height: {type: 'number', default: 1000},
  widthSegments: {type: 'number', default: 128},
  heightSegments: {type: 'number', default: 128},
  displacementScale: {type: 'number', default: 10},
  noiseScale: {type: 'number', default: 0.05},
  noiseOffset: {type: 'vec2', default: {x: 0, y: 0}}
  },

  init: function () {
  const data = this.data;
  this.noiseOffset = {x: 0, y: 0};
    const geometry = new THREE.PlaneGeometry(
      data.width, 
      data.height, 
      data.widthSegments, 
      data.heightSegments
    );

    // Create vertex shader for displacement
    const vertexShader = `
      uniform float displacementScale;
      uniform float noiseScale;
      uniform float terrainWidth;
      uniform vec2 noiseOffset;
      varying vec2 vUv;
      varying float vDisplacement;

      // Optimized 2D noise function
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Optimized distance calculation - use squared distance to avoid sqrt
        vec2 centerOffset = uv - 0.5;
        float distanceSquared = dot(centerOffset, centerOffset) * terrainWidth * terrainWidth;
        
        // Pre-calculated constants
        const float minDistanceSquared = 1600.0; // 40.0 * 40.0
        const float maxDistanceSquared = 14400.0; // 120.0 * 120.0
        
        float displacementFactor = 0.0;
        if (distanceSquared > minDistanceSquared) {
          // Use squared distance for smoother transition
          float transitionFactor = smoothstep(minDistanceSquared, maxDistanceSquared, distanceSquared);
          displacementFactor = 0.1 + 0.9 * transitionFactor;
        }
        
        // Optimized noise calculation - pre-calculate scaled position
        vec2 noisePos = (pos.xy + noiseOffset) * noiseScale;
        float noiseValue = noise(noisePos) + noise(noisePos * 2.0) * 0.5;
        
        // Apply displacement
        float displacement = noiseValue * displacementFactor * displacementScale;
        pos.z += displacement;
        vDisplacement = displacement;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    // Create fragment shader for terrain coloring with wireframe overlay
    const fragmentShader = `
      varying vec2 vUv;
      varying float vDisplacement;

      void main() {
        // Pre-defined color constants
        const vec3 lowColor = vec3(1.0, 1.0, 1.0);   // Dark green for low areas
        const vec3 highColor = vec3(0.0, 0.0, 0.0);  // Brown for high areas
        const float invRange = 0.05; // 1.0 / 20.0 - pre-calculated
        
        // Optimized height normalization
        float normalizedHeight = clamp((vDisplacement + 10.0) * invRange, 0.0, 1.0);
        vec3 color = mix(lowColor, highColor, normalizedHeight);
        
        // Grid removed - use base terrain color only
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        displacementScale: { value: data.displacementScale },
        noiseScale: { value: data.noiseScale },
        terrainWidth: { value: data.width },
        noiseOffset: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.DoubleSide
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    
    this.el.setObject3D('mesh', mesh);
    this.material = material;
    // Listen for mouse wheel to pan noise
    window.addEventListener('wheel', (e) => {
      // Always pan in negative X direction regardless of scroll direction
  this.noiseOffset.x -= Math.abs((e.deltaX * 0.05 + e.deltaY * 0.05)); // 5x faster than previous
      this.noiseOffset.y = 0;
      if (this.material) {
        this.material.uniforms.noiseOffset.value.set(this.noiseOffset.x, this.noiseOffset.y);
      }
    });
  },

  // Removed tick function since time uniform is no longer used

  update: function (oldData) {
    // Update shader uniforms when component data changes
    if (this.material) {
      if (oldData.displacementScale !== this.data.displacementScale) {
        this.material.uniforms.displacementScale.value = this.data.displacementScale;
      }
      if (oldData.noiseScale !== this.data.noiseScale) {
        this.material.uniforms.noiseScale.value = this.data.noiseScale;
      }
      if (oldData.noiseOffset !== this.data.noiseOffset) {
        this.material.uniforms.noiseOffset.value.set(this.data.noiseOffset.x, this.data.noiseOffset.y);
      }
    }
  }
});
