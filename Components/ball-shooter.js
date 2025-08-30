AFRAME.registerComponent('ball-shooter', {
  init: function () {
    this.ballCount = 0;
    this.hitCount = 0; // Track number of successful hits
    this.hitCompositions = new Set(); // Track which compositions have been hit
    this.shootingInterval = null;
    this.minShootingDelay = 2000; // Minimum 2 seconds
    this.maxShootingDelay = 4000; // Maximum 4 seconds
    
    // Create hit counter UI
    this.createHitCounter();
    
    // Start automatic shooting
    this.startAutomaticShooting();
  },

  createHitCounter: function () {
    // Create a UI overlay for the hit counter
    const counterDiv = document.createElement('div');
    counterDiv.id = 'hit-counter';
    counterDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: black;
      font-family: 'Arial', sans-serif;
      font-size: 48px;
      font-weight: bold;
      z-index: 1000;
      text-align: center;
      text-shadow: 
        -1px -1px 0 white,
        1px -1px 0 white,
        -1px 1px 0 white,
        1px 1px 0 white,
        -2px 0 0 white,
        2px 0 0 white,
        0 -2px 0 white,
        0 2px 0 white;
    `;
    
    // Create countdown bar container
    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      width: 200px;
      height: 12px;
      background: white;
      margin: 10px auto 0;
      position: relative;
      border: 2px solid white;
    `;
    
    // Create countdown bar
    const countdownBar = document.createElement('div');
    countdownBar.id = 'countdown-bar';
    countdownBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: black;
      transition: none;
      position: absolute;
      top: 0;
      left: 0;
    `;
    
    barContainer.appendChild(countdownBar);
    counterDiv.innerHTML = `<span id="hit-number">0</span>`;
    counterDiv.appendChild(barContainer);
    document.body.appendChild(counterDiv);
    
    this.counterElement = counterDiv;
    this.hitNumberElement = document.getElementById('hit-number');
    this.countdownBarElement = document.getElementById('countdown-bar');
  },

  updateHitCounter: function () {
    if (this.hitNumberElement) {
      this.hitNumberElement.textContent = this.hitCount;
    }
  },

  startAutomaticShooting: function () {
    // Shoot immediately
    this.shootBall();
    
    // Schedule next shots with random timing between 2-4 seconds
    const scheduleNextShot = () => {
      const randomDelay = this.minShootingDelay + Math.random() * (this.maxShootingDelay - this.minShootingDelay);
      
      // Start countdown animation
      this.startCountdown(randomDelay);
      
      setTimeout(() => {
        this.shootBall();
        scheduleNextShot(); // Schedule the next one
      }, randomDelay);
    };
    
    scheduleNextShot();
  },

  startCountdown: function (duration) {
    if (!this.countdownBarElement) return;
    
    // Reset bar to 0%
    this.countdownBarElement.style.width = '0%';
    
    const startTime = Date.now();
    
    const updateBar = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const percentage = progress * 100;
      
      if (this.countdownBarElement) {
        this.countdownBarElement.style.width = percentage + '%';
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateBar);
      }
    };
    
    requestAnimationFrame(updateBar);
  },

  shootBall: function () {
    // Get camera (parent element)
    const camera = this.el.parentEl;
    const cameraPosition = camera.getAttribute('position');
    
    // Get the camera's world transform to calculate proper forward direction
    const cameraObject3D = camera.object3D;
    
    // Calculate starting position (3 units below camera)
    const startPosition = {
      x: cameraPosition.x,
      y: cameraPosition.y - 3,
      z: cameraPosition.z
    };
    
    // Create the ball with proper camera direction
    this.createBall(startPosition, cameraObject3D);
  },

  remove: function () {
    // Clean up when component is removed
    if (this.shootingInterval) {
      clearInterval(this.shootingInterval);
    }
    if (this.counterElement && this.counterElement.parentNode) {
      this.counterElement.parentNode.removeChild(this.counterElement);
    }
  },

  createBall: function (startPosition, cameraObject3D) {
    const scene = document.querySelector('a-scene');
    const ball = document.createElement('a-sphere');
    
    // Ball properties
    ball.setAttribute('radius', '0.2');
    ball.setAttribute('material', {
      color: '#0066ff',
      emissive: '#0044aa',
      emissiveIntensity: 0.5
    });
    ball.setAttribute('position', startPosition);
    
    // Add OBB collider to the ball for collision detection
    ball.setAttribute('obb-collider', {
      size: 0.4 // Slightly larger than radius for reliable detection
    });
    
    // Give the ball a unique ID
    ball.id = 'ball-' + this.ballCount++;
    ball.setAttribute('class', 'ball');
    
    // Listen for collision events
    ball.addEventListener('obbcollisionstarted', (event) => {
      this.handleBallCollision(ball, event.detail.withEl);
    });
    
    // Add to scene
    scene.appendChild(ball);
    
    // Calculate trajectory using camera's 3D object
    this.animateBall(ball, startPosition, cameraObject3D);
  },

  animateBall: function (ball, startPosition, cameraObject3D) {
    // Random distance between 5-60 units
    const distance = 5 + Math.random() * 55;
    
    // Get the camera's forward direction using Three.js
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(cameraObject3D.quaternion);
    
    // Add random deviation (-10 to +10 degrees) to the shooting direction
    const deviationAngle = (Math.random() - 0.5) * 20; // -10 to +10 degrees
    const deviationRad = deviationAngle * Math.PI / 180; // Convert to radians
    
    // Apply horizontal deviation (rotate around Y-axis)
    const cos = Math.cos(deviationRad);
    const sin = Math.sin(deviationRad);
    const deviatedForward = new THREE.Vector3(
      forward.x * cos + forward.z * sin,
      forward.y,
      -forward.x * sin + forward.z * cos
    );
    
    // Calculate end position using deviated forward vector
    const endPosition = {
      x: startPosition.x + (deviatedForward.x * distance),
      y: 0, // Land on ground
      z: startPosition.z + (deviatedForward.z * distance)
    };
    
    // Calculate arc peak (midpoint with height)
    const arcHeight = 5 + Math.random() * 5; // Random arc height between 5-10
    const midPosition = {
      x: startPosition.x + (deviatedForward.x * distance * 0.5),
      y: startPosition.y + arcHeight,
      z: startPosition.z + (deviatedForward.z * distance * 0.5)
    };
    
    // Animate the ball through the arc
    this.animateArc(ball, startPosition, midPosition, endPosition);
  },

  animateArc: function (ball, start, mid, end) {
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    let animationActive = true;
    
    const animate = () => {
      if (!animationActive || !ball.parentNode) {
        return; // Stop animation if ball was removed
      }
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        // Animation complete - remove ball
        if (ball.parentNode) {
          ball.parentNode.removeChild(ball);
        }
        return;
      }
      
      // Quadratic Bezier curve calculation
      const t = progress;
      const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * mid.x + t * t * end.x;
      const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * mid.y + t * t * end.y;
      const z = (1 - t) * (1 - t) * start.z + 2 * (1 - t) * t * mid.z + t * t * end.z;
      
      ball.setAttribute('position', { x: x, y: y, z: z });
      
      // Add some rotation for visual effect
      ball.setAttribute('rotation', { 
        x: progress * 360, 
        y: progress * 180, 
        z: progress * 90 
      });
      
      requestAnimationFrame(animate);
    };
    
    // Store animation control function on ball
    ball.stopAnimation = () => {
      animationActive = false;
    };
    
    animate();
  },

  handleBallCollision: function (ball, collidedWithElement) {
    // Stop the ball animation
    if (ball.stopAnimation) {
      ball.stopAnimation();
    }
    
    // Find the composition that was hit
    const composition = this.findCompositionFromElement(collidedWithElement);
    if (composition) {
      // Check if this composition has already been hit
      const compositionId = this.getCompositionId(composition);
      
      if (!this.hitCompositions.has(compositionId)) {
        // This is a new hit - count it and change appearance
        this.hitCompositions.add(compositionId);
        this.makeCompositionEmitBlue(composition);
        
        // Increment hit counter only for new hits
        this.hitCount++;
        this.updateHitCounter();
      }
      // If already hit, the ball still disappears but no score/visual change
    }
    
    // Remove the ball immediately
    if (ball.parentNode) {
      ball.parentNode.removeChild(ball);
    }
  },

  getCompositionId: function (composition) {
    // Create a unique identifier for the composition
    // Use its position and a timestamp-based ID if it doesn't have one
    if (!composition.id) {
      const position = composition.getAttribute('position');
      composition.id = `composition-${Math.round(position.x * 100)}-${Math.round(position.z * 100)}-${Date.now()}`;
    }
    return composition.id;
  },

  findCompositionFromElement: function (element) {
    // Walk up the DOM tree to find the composition container
    let current = element;
    while (current && current !== document.querySelector('a-scene')) {
      // Check if this element has the random-compositions component or is a child of it
      if (current.hasAttribute && current.hasAttribute('random-compositions')) {
        return current;
      }
      // Check if parent has random-compositions
      if (current.parentElement && current.parentElement.hasAttribute && 
          current.parentElement.hasAttribute('random-compositions')) {
        return current; // This is the composition entity
      }
      current = current.parentElement;
    }
    return element; // Fallback to the element itself
  },

  makeCompositionEmitBlue: function (composition) {
    // Find all mesh objects within this composition (both Pamats and Vidus)
    const meshElements = composition.querySelectorAll('a-obj-model');
    
    meshElements.forEach(meshElement => {
      // Change material to emit blue light like the ball
      meshElement.setAttribute('material', {
        color: '#0066ff',
        emissive: '#0044aa',
        emissiveIntensity: 0.8,
        roughness: 0.3,
        flatShading: true
      });
    });
    
    // Add a glowing effect with a light component
    const glowLight = document.createElement('a-light');
    glowLight.setAttribute('type', 'point');
    glowLight.setAttribute('color', '#0066ff');
    glowLight.setAttribute('intensity', '2');
    glowLight.setAttribute('distance', '10');
    glowLight.setAttribute('position', '0 2 0');
    glowLight.setAttribute('class', 'collision-glow');
    
    // Remove any existing glow lights first
    const existingGlow = composition.querySelector('.collision-glow');
    if (existingGlow) {
      existingGlow.parentNode.removeChild(existingGlow);
    }
    
    composition.appendChild(glowLight);
  }
});
