AFRAME.registerComponent('sound-effects', {
  init: function () {
    this.scrollSound = null;
    this.shootSound = null;
    this.hitSound = null;
    this.isScrollSoundPlaying = false;
    this.audioInitialized = false;
    this.audioContext = null;
    
    // Wait for scene to be loaded before setting up audio
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.setupAudio(), 100);
      });
    } else {
      setTimeout(() => this.setupAudio(), 100);
    }
    
    // Bind event handlers
    this.onWheel = this.onWheel.bind(this);
    this.onBallShoot = this.onBallShoot.bind(this);
    this.onBallHit = this.onBallHit.bind(this);
    this.onCameraRotating = this.onCameraRotating.bind(this);
    this.onCameraRotationStopped = this.onCameraRotationStopped.bind(this);
    this.initializeAudio = this.initializeAudio.bind(this);
    
    // Add event listeners
    document.addEventListener('wheel', this.onWheel);
    document.addEventListener('ball-shoot', this.onBallShoot);
    document.addEventListener('ball-hit', this.onBallHit);
    document.addEventListener('camera-rotating', this.onCameraRotating);
    document.addEventListener('camera-rotation-stopped', this.onCameraRotationStopped);
    
    // Add user interaction listeners to initialize audio
    document.addEventListener('click', this.initializeAudio);
    document.addEventListener('wheel', this.initializeAudio);
    document.addEventListener('keydown', this.initializeAudio);
    document.addEventListener('touchstart', this.initializeAudio);
  },

  setupAudio: function () {
    // Get audio elements from assets
    this.scrollSound = document.querySelector('#scroll-sound');
    this.shootSound = document.querySelector('#shoot-sound');
    this.hitSound = document.querySelector('#hit-sound');
    
    console.log('Audio elements found:', {
      scroll: !!this.scrollSound,
      shoot: !!this.shootSound,
      hit: !!this.hitSound
    });
    
    // Set audio properties
    if (this.scrollSound) {
      this.scrollSound.loop = true;
      this.scrollSound.volume = 0.7;
      this.scrollSound.playbackRate = 1.0;
      this.scrollSound.preload = 'auto';
    }
    
    if (this.shootSound) {
      this.shootSound.volume = 0.8;
      this.shootSound.preload = 'auto';
    }
    
    if (this.hitSound) {
      this.hitSound.volume = 0.9;
      this.hitSound.preload = 'auto';
    }
  },

  initializeAudio: function () {
    if (this.audioInitialized) return;
    
    console.log('Initializing audio...');
    
    // Create audio context if needed
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Initialize each sound
    const initSound = (sound, name) => {
      if (!sound) return Promise.resolve();
      
      return new Promise((resolve) => {
        sound.load(); // Reload the audio
        sound.play().then(() => {
          sound.pause();
          sound.currentTime = 0;
          console.log(`${name} sound initialized`);
          resolve();
        }).catch(e => {
          console.log(`${name} sound initialization failed:`, e);
          resolve(); // Continue even if one fails
        });
      });
    };
    
    // Initialize all sounds
    Promise.all([
      initSound(this.scrollSound, 'scroll'),
      initSound(this.shootSound, 'shoot'),
      initSound(this.hitSound, 'hit')
    ]).then(() => {
      this.audioInitialized = true;
      console.log('All audio initialized');
    });
  },

  onWheel: function (event) {
    // Keep this for audio initialization only
    if (!this.audioInitialized) {
      this.initializeAudio();
    }
  },

  onCameraRotating: function (event) {
    // Ensure audio is initialized
    if (!this.audioInitialized) {
      this.initializeAudio();
      return;
    }
    
    const rotationSpeed = event.detail.speed;
    
    // Map rotation speed to playback rate (0.8x to 2.0x speed)
    const minPlaybackRate = 0.8;
    const maxPlaybackRate = 2.0;
    // Normalize rotation speed (typical values are 0.01 to 0.1)
    const normalizedSpeed = Math.min(rotationSpeed / 0.05, 1);
    const playbackRate = minPlaybackRate + (normalizedSpeed * (maxPlaybackRate - minPlaybackRate));
    
    if (this.scrollSound && this.audioInitialized) {
      try {
        // Set playback rate based on rotation speed
        this.scrollSound.playbackRate = playbackRate;
        
        // Start playing the grinding sound when camera rotates
        if (!this.isScrollSoundPlaying) {
          this.scrollSound.currentTime = 0;
          this.scrollSound.play().then(() => {
            this.isScrollSoundPlaying = true;
            console.log('Stone grinding sound started - camera rotating with rate:', playbackRate);
          }).catch(e => {
            console.log('Could not play stone grinding sound:', e);
          });
        }
        
      } catch (e) {
        console.log('Camera rotation sound error:', e);
      }
    }
  },

  onCameraRotationStopped: function (event) {
    // Stop the grinding sound when camera stops rotating
    if (this.scrollSound && this.isScrollSoundPlaying) {
      this.scrollSound.pause();
      this.scrollSound.currentTime = 0;
      this.isScrollSoundPlaying = false;
      console.log('Stone grinding sound stopped - camera stopped rotating');
    }
  },

  onBallShoot: function (event) {
    // Ensure audio is initialized
    if (!this.audioInitialized) {
      this.initializeAudio();
      // Add a small delay to let initialization complete
      setTimeout(() => this.playShootSound(), 100);
      return;
    }
    
    this.playShootSound();
  },

  playShootSound: function () {
    if (this.shootSound) {
      try {
        // Clone the audio for overlapping sounds
        const shootSoundClone = this.shootSound.cloneNode();
        shootSoundClone.volume = this.shootSound.volume;
        shootSoundClone.currentTime = 0;
        
        shootSoundClone.play().then(() => {
          console.log('Shoot sound played');
        }).catch(e => {
          console.log('Could not play shoot sound:', e);
          // Fallback to original sound
          this.shootSound.currentTime = 0;
          this.shootSound.play().catch(e2 => {
            console.log('Fallback shoot sound also failed:', e2);
            // Try to reinitialize audio
            this.audioInitialized = false;
            setTimeout(() => this.initializeAudio(), 100);
          });
        });
        
        // Clean up the clone after it finishes
        shootSoundClone.addEventListener('ended', () => {
          shootSoundClone.remove();
        });
        
      } catch (e) {
        console.log('Shoot sound error:', e);
      }
    }
  },

  onBallHit: function (event) {
    // Ensure audio is initialized
    if (!this.audioInitialized) {
      this.initializeAudio();
    }
    
    if (this.hitSound) {
      try {
        // Clone the audio for overlapping sounds
        const hitSoundClone = this.hitSound.cloneNode();
        hitSoundClone.volume = this.hitSound.volume;
        hitSoundClone.currentTime = 0;
        
        hitSoundClone.play().then(() => {
          console.log('Hit sound played');
        }).catch(e => {
          console.log('Could not play hit sound:', e);
          // Fallback to original sound
          this.hitSound.currentTime = 0;
          this.hitSound.play().catch(e2 => {
            console.log('Fallback hit sound also failed:', e2);
          });
        });
        
        // Clean up the clone after it finishes
        hitSoundClone.addEventListener('ended', () => {
          hitSoundClone.remove();
        });
        
      } catch (e) {
        console.log('Hit sound error:', e);
      }
    }
  },

  remove: function () {
    // Clean up event listeners
    document.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('ball-shoot', this.onBallShoot);
    document.removeEventListener('ball-hit', this.onBallHit);
    document.removeEventListener('camera-rotating', this.onCameraRotating);
    document.removeEventListener('camera-rotation-stopped', this.onCameraRotationStopped);
    document.removeEventListener('click', this.initializeAudio);
    document.removeEventListener('wheel', this.initializeAudio);
    document.removeEventListener('keydown', this.initializeAudio);
    document.removeEventListener('touchstart', this.initializeAudio);
    
    // Stop any playing audio
    if (this.scrollSound && this.isScrollSoundPlaying) {
      this.scrollSound.pause();
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
});
