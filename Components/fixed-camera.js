AFRAME.registerComponent('fixed-camera', {
  schema: {
    height: {type: 'number', default: 10},
    fov: {type: 'number', default: 30},
    maxRotation: {type: 'number', default: 8}, // Reduced rotation range
    terrainSelector: {type: 'string', default: '[terrain]'}
  },

  init: function () {
    this.data = this.data;
    this.scrollRotation = 0;
    this.targetScrollRotation = 0;
    this.baseNoiseScale = 0.05;
    
    // New displacement system
    this.displacementValue = 10; // Current displacement value
    this.displacementThreshold = 20; // Max displacement when going up
    this.displacementMin = 1; // Min displacement when going down
    this.displacementDirection = 1; // 1 for increasing, -1 for decreasing
    this.isScrollingUp = true; // Track scroll direction
    this.displacementSpeed = 0.3; // Speed of displacement change
    
    // Set camera position and FOV
    this.el.setAttribute('position', `0 ${this.data.height} 0`);
    this.el.setAttribute('camera', 'fov', this.data.fov);
    this.el.setAttribute('camera', 'far', 1000);
    
    // Find terrain entity
    this.terrainEl = document.querySelector(this.data.terrainSelector);
    
    // Bind event handlers
    this.onWheel = this.onWheel.bind(this);
    
    // Add event listeners (removed mouse events)
    document.addEventListener('wheel', this.onWheel, { passive: false });
    
    // Disable all default controls
    this.el.removeAttribute('wasd-controls');
    this.el.removeAttribute('look-controls');
  },

  onWheel: function (event) {
    event.preventDefault();
    
    // Add Y-axis rotation based on scroll direction
    this.targetScrollRotation += event.deltaY * 0.1;
    
    // Determine scroll direction and update displacement cycling
    if (event.deltaY < 0) {
      // Scrolling UP
      if (!this.isScrollingUp) {
        // Direction changed from down to up - reverse breathing direction
        this.displacementDirection *= -1;
        this.isScrollingUp = true;
      }
      
      if (this.displacementDirection === 1) {
        // Going up towards threshold
        this.displacementValue += this.displacementSpeed;
        if (this.displacementValue >= this.displacementThreshold) {
          this.displacementValue = this.displacementThreshold;
          this.displacementDirection = -1; // Now go down to 0
        }
      } else {
        // Going down towards 0
        this.displacementValue -= this.displacementSpeed;
        if (this.displacementValue <= 0) {
          this.displacementValue = 0;
          this.displacementDirection = 1; // Now go back up to threshold
        }
      }
    } else {
      // Scrolling DOWN
      if (this.isScrollingUp) {
        // Direction changed from up to down - reverse breathing direction
        this.displacementDirection *= -1;
        this.isScrollingUp = false;
      }
      
      if (this.displacementDirection === 1) {
        // Going up towards threshold
        this.displacementValue += this.displacementSpeed;
        if (this.displacementValue >= this.displacementThreshold) {
          this.displacementValue = this.displacementThreshold;
          this.displacementDirection = -1; // Now go down to 0
        }
      } else {
        // Going down towards 0
        this.displacementValue -= this.displacementSpeed;
        if (this.displacementValue <= 0) {
          this.displacementValue = 0;
          this.displacementDirection = 1; // Now go back up to threshold
        }
      }
    }
    
    // Update terrain immediately
    if (this.terrainEl) {
      this.terrainEl.setAttribute('terrain', {
        displacementScale: this.displacementValue,
        noiseScale: this.baseNoiseScale
      });
    }
  },

  tick: function (time, timeDelta) {
    // Keep camera locked to center position
    const currentPos = this.el.getAttribute('position');
    if (currentPos.x !== 0 || currentPos.z !== 0 || currentPos.y !== this.data.height) {
      this.el.setAttribute('position', `0 ${this.data.height} 0`);
    }
    
    // Smooth interpolation for scroll rotation only
    const lerpFactor = 0.1;
    this.scrollRotation += (this.targetScrollRotation - this.scrollRotation) * lerpFactor;
    
    // Camera rotation - X-axis fixed at -10 degrees, Y-axis from scroll
    this.el.setAttribute('rotation', `-10 ${this.scrollRotation} 0`);
  },

  remove: function () {
    // Clean up event listeners
    document.removeEventListener('wheel', this.onWheel);
  }
});
