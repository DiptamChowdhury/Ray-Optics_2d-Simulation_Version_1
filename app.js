/**
 * MIRROR & LENS LAB — Main Application Controller
 * 
 * Coordinates:
 * - Optical system switching (Concave Mirror / Convex Lens / Compare Both)
 * - State synchronization between Sliders, SVG Direct Manipulation & Telemetry
 * - Presets (See My Enlarged Face, Magnifying Glass, Screen Tests, etc.)
 * - 10-Stage Guided Learning Mode
 * - Dynamic Educational Explanation Engine
 * - Eye Retina Zoom Modal Dialog
 */

(function (window) {
  'use strict';

  class OpticsApp {
    constructor() {
      this.currentSystem = 'concave_mirror'; // 'concave_mirror' | 'convex_lens' | 'compare_both'
      this.isCompareMode = false;
      this.syncCompareU = true;

      // Independent states preserved across switcher
      this.mirrorState = {
        u: 12.0,
        f: 20.0,
        ho: 10.0,
        screenDist: 30.0,
        eyePos: { x: 260, y: 190 },
        accommodation: 1.0
      };

      this.lensState = {
        u: 12.0,
        f: 20.0,
        ho: 10.0,
        screenDist: 30.0,
        eyePos: { x: 680, y: 190 },
        accommodation: 1.0
      };

      // Display options
      this.options = {
        showGrid: true,
        showPrincipalRays: true,
        showVirtualExtensions: true,
        showEyeCone: true,
        showScreen: true,
        showDimensions: true,
        zoom: 1.0
      };

      // Guided Tour State
      this.isTourActive = false;
      this.tourCurrentStep = 0;
      this.tourSteps = this.getTourStepDefinitions();

      // Canvas instances
      this.mainCanvas = null;
      this.compareMirrorCanvas = null;
      this.compareLensCanvas = null;
      this.eyeModal = null;

      this.init();
    }

    init() {
      // 1. Initialize Eye Modal
      this.eyeModal = new window.EyeModal();

      // 2. Initialize Main Single Canvas
      const svgMain = document.getElementById('optics-canvas-main');
      if (svgMain) {
        this.mainCanvas = new window.OpticsCanvas(svgMain, {
          system: this.currentSystem,
          onUpdate: (dragData) => this.handleCanvasDragUpdate(dragData)
        });
      }

      // 3. Initialize Compare Mode Canvases
      const svgCompMirror = document.getElementById('compare-canvas-mirror');
      const svgCompLens = document.getElementById('compare-canvas-lens');
      if (svgCompMirror && svgCompLens) {
        this.compareMirrorCanvas = new window.OpticsCanvas(svgCompMirror, {
          system: 'concave_mirror',
          onUpdate: (dragData) => {
            Object.assign(this.mirrorState, dragData);
            if (this.syncCompareU) this.lensState.u = this.mirrorState.u;
            this.syncUIFromState();
          }
        });
        this.compareLensCanvas = new window.OpticsCanvas(svgCompLens, {
          system: 'convex_lens',
          onUpdate: (dragData) => {
            Object.assign(this.lensState, dragData);
            if (this.syncCompareU) this.mirrorState.u = this.lensState.u;
            this.syncUIFromState();
          }
        });
      }

      // 4. Bind DOM UI controls
      this.bindSystemSwitcher();
      this.bindSliders();
      this.bindToggles();
      this.bindPresets();
      this.bindTour();
      this.bindModalButtons();
      this.bindZoomControls();

      // 5. Initial sync & render
      this.loadSystem(this.currentSystem);
    }

    getCurrentActiveState() {
      return this.currentSystem === 'concave_mirror' ? this.mirrorState : this.lensState;
    }

    /**
     * Switch between Concave Mirror, Convex Lens, and Compare Both
     */
    loadSystem(systemName) {
      this.currentSystem = systemName;
      this.isCompareMode = systemName === 'compare_both';

      const singleStage = document.getElementById('single-stage-container');
      const compareStage = document.getElementById('compare-stage-container');
      const navMirror = document.getElementById('nav-mirror-btn');
      const navLens = document.getElementById('nav-lens-btn');
      const navCompare = document.getElementById('nav-compare-btn');

      // Update Top Nav button styling
      navMirror.classList.toggle('active', systemName === 'concave_mirror');
      navLens.classList.toggle('active', systemName === 'convex_lens');
      navCompare.classList.toggle('compare-active', systemName === 'compare_both');

      if (this.isCompareMode) {
        if (singleStage) singleStage.style.display = 'none';
        if (compareStage) compareStage.style.display = 'grid';
        this.renderCompareCanvases();
      } else {
        if (singleStage) singleStage.style.display = 'block';
        if (compareStage) compareStage.style.display = 'none';

        const state = this.getCurrentActiveState();
        this.mainCanvas.setState({
          system: this.currentSystem,
          u: state.u,
          f: state.f,
          ho: state.ho,
          screenDist: state.screenDist,
          eyePos: state.eyePos,
          accommodation: state.accommodation,
          ...this.options
        });
      }

      this.updatePresetsDeckVisibility();
      this.syncUIFromState();
    }

    /**
     * Render both side-by-side canvases in Compare Mode
     */
    renderCompareCanvases() {
      if (this.compareMirrorCanvas && this.compareLensCanvas) {
        this.compareMirrorCanvas.setState({
          system: 'concave_mirror',
          u: this.mirrorState.u,
          f: this.mirrorState.f,
          ho: this.mirrorState.ho,
          screenDist: this.mirrorState.screenDist,
          eyePos: this.mirrorState.eyePos,
          accommodation: this.mirrorState.accommodation,
          ...this.options
        });

        this.compareLensCanvas.setState({
          system: 'convex_lens',
          u: this.lensState.u,
          f: this.lensState.f,
          ho: this.lensState.ho,
          screenDist: this.lensState.screenDist,
          eyePos: this.lensState.eyePos,
          accommodation: this.lensState.accommodation,
          ...this.options
        });
      }
    }

    /**
     * Callback when user drags elements on canvas
     */
    handleCanvasDragUpdate(dragData) {
      const state = this.getCurrentActiveState();
      Object.assign(state, dragData);
      this.syncUIFromState();
    }

    /**
     * Update sliders, value badges, telemetry deck & educational text
     */
    syncUIFromState() {
      const state = this.getCurrentActiveState();
      const isMirror = this.currentSystem === 'concave_mirror';

      // Update Slider DOM inputs & text values
      const sliderU = document.getElementById('slider-u');
      const valU = document.getElementById('val-u');
      if (sliderU) sliderU.value = state.u;
      if (valU) valU.textContent = `${state.u.toFixed(1)} cm`;

      const sliderF = document.getElementById('slider-f');
      const valF = document.getElementById('val-f');
      if (sliderF) sliderF.value = state.f;
      if (valF) valF.textContent = `${state.f.toFixed(1)} cm`;

      const sliderHo = document.getElementById('slider-ho');
      const valHo = document.getElementById('val-ho');
      if (sliderHo) sliderHo.value = state.ho;
      if (valHo) valHo.textContent = `${state.ho.toFixed(1)} cm`;

      const sliderScreen = document.getElementById('slider-screen');
      const valScreen = document.getElementById('val-screen');
      if (sliderScreen) sliderScreen.value = state.screenDist;
      if (valScreen) valScreen.textContent = `${state.screenDist.toFixed(1)} cm`;

      const sliderEyeX = document.getElementById('slider-eye-x');
      const valEyeX = document.getElementById('val-eye-x');
      if (sliderEyeX) sliderEyeX.value = state.eyePos.x;
      if (valEyeX) valEyeX.textContent = `${state.eyePos.x.toFixed(0)} px`;

      const sliderEyeY = document.getElementById('slider-eye-y');
      const valEyeY = document.getElementById('val-eye-y');
      if (sliderEyeY) sliderEyeY.value = state.eyePos.y;
      if (valEyeY) valEyeY.textContent = `${state.eyePos.y.toFixed(0)} px`;

      // Recalculate optical telemetry
      const optProps = isMirror
        ? window.OpticsEngine.computeConcaveMirror(state.u, state.f, state.ho)
        : window.OpticsEngine.computeConvexLens(state.u, state.f, state.ho);

      const eyeProps = window.OpticsEngine.computeEyeOptics(
        optProps,
        state.eyePos,
        state.accommodation,
        {
          system: this.currentSystem,
          originX: isMirror ? 620 : 480,
          originY: 240,
          scale: 6.0 * this.options.zoom
        }
      );

      const screenProps = window.OpticsEngine.computeScreenOptics(
        optProps,
        state.screenDist,
        this.currentSystem
      );

      // Update On-Canvas Alerts
      this.updateCanvasAlerts(optProps, eyeProps, screenProps);

      // Update Telemetry Panel
      this.updateTelemetryDeck(optProps, eyeProps, screenProps);

      // Update Dynamic Educational Explanation
      this.updateEducationalExplanation(optProps, eyeProps, screenProps);
    }

    updateCanvasAlerts(optProps, eyeProps, screenProps) {
      const eyeAlert = document.getElementById('canvas-eye-alert');
      const screenAlert = document.getElementById('canvas-screen-alert');

      if (eyeAlert) {
        eyeAlert.className = eyeProps.lightReachesEye
          ? 'canvas-eye-alert visible-ok'
          : 'canvas-eye-alert visible-miss';
        eyeAlert.innerHTML = `
          <span>${eyeProps.lightReachesEye ? '👁️' : '⚠️'}</span>
          <span>${eyeProps.visibilityText}</span>
        `;
      }

      if (screenAlert) {
        if (screenProps.isGhostScreen) {
          screenAlert.className = 'canvas-screen-alert ghost-note';
          screenAlert.innerHTML = `
            <span>👻</span>
            <span><strong>CONCEPTUAL SCREEN:</strong> Virtual image cannot form on screen (rays diverge).</span>
          `;
        } else if (screenProps.isSharp) {
          screenAlert.className = 'canvas-screen-alert sharp-ok';
          screenAlert.innerHTML = `
            <span>🎯</span>
            <span><strong>SCREEN CAPTURE:</strong> Real image sharply focused at ${optProps.v.toFixed(1)} cm!</span>
          `;
        } else {
          screenAlert.className = 'canvas-screen-alert';
          screenAlert.innerHTML = `
            <span>ℹ️</span>
            <span><strong>SCREEN STATUS:</strong> ${screenProps.message}</span>
          `;
        }
      }
    }

    updateTelemetryDeck(optProps, eyeProps, screenProps) {
      const isMirror = this.currentSystem === 'concave_mirror';

      // Telemetry fields
      const elSys = document.getElementById('tel-system');
      const elU = document.getElementById('tel-u');
      const elF = document.getElementById('tel-f');
      const elR = document.getElementById('tel-r');
      const elV = document.getElementById('tel-v');
      const elHo = document.getElementById('tel-ho');
      const elHi = document.getElementById('tel-hi');
      const elM = document.getElementById('tel-m');
      const elType = document.getElementById('tel-type');
      const elOrient = document.getElementById('tel-orient');
      const elSize = document.getElementById('tel-size');
      const elLoc = document.getElementById('tel-loc');
      const elScreen = document.getElementById('tel-screen');

      if (elSys) elSys.textContent = isMirror ? 'Concave Mirror' : 'Convex Lens';
      if (elU) elU.textContent = `${optProps.u.toFixed(1)} cm`;
      if (elF) elF.textContent = `${optProps.f.toFixed(1)} cm`;
      if (elR) elR.textContent = isMirror ? `${optProps.R.toFixed(1)} cm` : 'N/A (Thin Lens)';
      if (elHo) elHo.textContent = `${optProps.ho.toFixed(1)} cm`;

      if (optProps.isAtFocus) {
        if (elV) elV.textContent = 'Infinity (Parallel)';
        if (elHi) elHi.textContent = 'Infinity';
        if (elM) elM.textContent = 'Infinity';
        if (elType) elType.innerHTML = '<span class="val-tag">Infinity</span>';
        if (elOrient) elOrient.textContent = 'Undefined';
        if (elSize) elSize.textContent = 'Undefined';
        if (elLoc) elLoc.textContent = 'At Infinity';
      } else {
        if (elV) elV.textContent = `${optProps.v.toFixed(1)} cm`;
        if (elHi) elHi.textContent = `${Math.abs(optProps.hi).toFixed(1)} cm`;
        if (elM) elM.textContent = `${optProps.m.toFixed(2)}x`;
        if (elType) {
          elType.innerHTML = optProps.isVirtual
            ? '<span class="val-tag tag-virtual">EXTERNAL VIRTUAL IMAGE</span>'
            : '<span class="val-tag tag-real">EXTERNAL REAL IMAGE</span>';
        }
        if (elOrient) {
          elOrient.innerHTML = optProps.isUpright
            ? '<span class="tag-upright">Upright (m > 0)</span>'
            : '<span class="tag-inverted">Inverted (m < 0)</span>';
        }
        if (elSize) elSize.textContent = optProps.sizeDesc;
        if (elLoc) elLoc.textContent = optProps.locationDesc;
      }

      if (elScreen) elScreen.textContent = optProps.screenStatus;

      // Eye & Retina Telemetry
      const elEyeLight = document.getElementById('tel-eye-light');
      const elEyeAcc = document.getElementById('tel-eye-acc');
      const elEyeFocus = document.getElementById('tel-eye-focus');
      const elRetinaOrient = document.getElementById('tel-retina-orient');
      const elRetinaType = document.getElementById('tel-retina-type');
      const elEyeVisible = document.getElementById('tel-eye-visible');

      if (elEyeLight) {
        elEyeLight.innerHTML = eyeProps.lightReachesEye
          ? '<span style="color:#4ade80; font-weight:700;">YES (Pupil Receives Light)</span>'
          : '<span style="color:#f59e0b; font-weight:700;">NO (Outside Reflected/Refracted Cone)</span>';
      }
      if (elEyeAcc) elEyeAcc.textContent = `${(58 * eyeProps.accommodation).toFixed(1)} D (Power)`;
      if (elEyeFocus) {
        elEyeFocus.innerHTML = eyeProps.isInFocus
          ? '<span style="color:#4ade80;">Sharp In-Focus</span>'
          : '<span style="color:#f472b6;">Blurred (Defocus)</span>';
      }
      if (elRetinaOrient) elRetinaOrient.textContent = eyeProps.retinalOrientation;
      if (elRetinaType) {
        elRetinaType.innerHTML = '<span class="val-tag" style="background:#f9731633; color:#f97316; font-weight:800;">REAL RETINAL IMAGE</span>';
      }
      if (elEyeVisible) {
        elEyeVisible.textContent = eyeProps.lightReachesEye ? 'Visible to Observer' : 'Not Visible';
      }
    }

    updateEducationalExplanation(optProps, eyeProps, screenProps) {
      const eduTitle = document.getElementById('edu-case-title');
      const eduBody = document.getElementById('edu-case-body');
      if (!eduTitle || !eduBody) return;

      eduTitle.textContent = optProps.caseName;

      let explanation = `<p>${optProps.description}</p>`;

      if (optProps.isVirtual) {
        const sysLabel = this.currentSystem === 'concave_mirror' ? 'concave mirror' : 'convex lens';
        explanation += `
          <div class="edu-highlight-box">
            <strong>WHY CAN YOU SEE YOUR ENLARGED IMAGE IF A SCREEN CANNOT FORM IT?</strong>
            <p style="margin-top:6px;">
              The ${sysLabel} causes the actual light rays to diverge. 
              Because the rays do not actually intersect at the apparent image position, a physical screen placed there cannot form a sharp image.
              However, when you place your <strong>eye</strong> in the path of these diverging rays, your <strong>eye lens focuses the light onto your retina</strong>, creating a <strong>real, inverted retinal image</strong>.
              Your brain perceives the light as originating from behind the mirror (or behind the lens) as an <strong>enlarged, upright virtual image</strong>!
            </p>
          </div>
        `;
      } else if (optProps.isReal) {
        explanation += `
          <div class="edu-highlight-box">
            <strong>REAL IMAGE FORMATION & SCREEN CAPTURE:</strong>
            <p style="margin-top:6px;">
              Here, actual light rays converge at the real image plane (${optProps.v.toFixed(1)} cm). 
              If you place an opaque screen at this exact plane, the converging light strikes the screen and reflects diffusely into space, projecting a sharp, inverted image that anyone in the room can see.
            </p>
          </div>
        `;
      }

      eduBody.innerHTML = explanation;
    }

    updatePresetsDeckVisibility() {
      const mirrorPresets = document.getElementById('presets-mirror-group');
      const lensPresets = document.getElementById('presets-lens-group');
      if (mirrorPresets && lensPresets) {
        if (this.currentSystem === 'concave_mirror') {
          mirrorPresets.style.display = 'flex';
          lensPresets.style.display = 'none';
        } else if (this.currentSystem === 'convex_lens') {
          mirrorPresets.style.display = 'none';
          lensPresets.style.display = 'flex';
        } else {
          // Compare mode: show both
          mirrorPresets.style.display = 'flex';
          lensPresets.style.display = 'flex';
        }
      }
    }

    bindSystemSwitcher() {
      document.getElementById('nav-mirror-btn').addEventListener('click', () => {
        this.loadSystem('concave_mirror');
      });

      document.getElementById('nav-lens-btn').addEventListener('click', () => {
        this.loadSystem('convex_lens');
      });

      document.getElementById('nav-compare-btn').addEventListener('click', () => {
        this.loadSystem('compare_both');
      });
    }

    bindSliders() {
      const handleSliderInput = (prop, parseFn = parseFloat) => (e) => {
        const val = parseFn(e.target.value);
        const state = this.getCurrentActiveState();

        if (prop === 'eyeX') {
          state.eyePos.x = val;
        } else if (prop === 'eyeY') {
          state.eyePos.y = val;
        } else {
          state[prop] = val;
        }

        if (this.isCompareMode && prop === 'u' && this.syncCompareU) {
          this.mirrorState.u = val;
          this.lensState.u = val;
        }

        if (this.isCompareMode) {
          this.renderCompareCanvases();
        } else {
          this.mainCanvas.setState({ [prop]: val, eyePos: state.eyePos });
        }

        this.syncUIFromState();
      };

      document.getElementById('slider-u').addEventListener('input', handleSliderInput('u'));
      document.getElementById('slider-f').addEventListener('input', handleSliderInput('f'));
      document.getElementById('slider-ho').addEventListener('input', handleSliderInput('ho'));
      document.getElementById('slider-screen').addEventListener('input', handleSliderInput('screenDist'));
      document.getElementById('slider-eye-x').addEventListener('input', handleSliderInput('eyeX'));
      document.getElementById('slider-eye-y').addEventListener('input', handleSliderInput('eyeY'));
    }

    bindToggles() {
      const bindToggle = (id, optKey) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', (e) => {
            this.options[optKey] = e.target.checked;
            if (this.isCompareMode) {
              this.renderCompareCanvases();
            } else {
              this.mainCanvas.setState({ [optKey]: e.target.checked });
            }
          });
        }
      };

      bindToggle('toggle-grid', 'showGrid');
      bindToggle('toggle-principal-rays', 'showPrincipalRays');
      bindToggle('toggle-virtual-ext', 'showVirtualExtensions');
      bindToggle('toggle-eye-cone', 'showEyeCone');
      bindToggle('toggle-screen', 'showScreen');
      bindToggle('toggle-dimensions', 'showDimensions');
    }

    bindPresets() {
      const applyPreset = (sys, config) => {
        if (this.currentSystem !== sys && this.currentSystem !== 'compare_both') {
          this.loadSystem(sys);
        }
        const state = sys === 'concave_mirror' ? this.mirrorState : this.lensState;
        Object.assign(state, config);

        if (this.isCompareMode) {
          this.renderCompareCanvases();
        } else {
          this.mainCanvas.setState({
            system: this.currentSystem,
            ...state,
            ...this.options
          });
        }
        this.syncUIFromState();
      };

      // Concave Mirror Presets
      // 1. See My Enlarged Face (Section 8)
      document.getElementById('preset-mirror-face').addEventListener('click', () => {
        applyPreset('concave_mirror', {
          u: 12.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 30.0,
          eyePos: { x: 260, y: 190 },
          accommodation: 1.0
        });
      });

      // 2. Virtual Image Screen Test
      document.getElementById('preset-mirror-screen-test').addEventListener('click', () => {
        applyPreset('concave_mirror', {
          u: 10.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 20.0,
          eyePos: { x: 280, y: 190 },
          accommodation: 1.0
        });
      });

      // 3. Real Image
      document.getElementById('preset-mirror-real').addEventListener('click', () => {
        applyPreset('concave_mirror', {
          u: 50.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 33.3,
          eyePos: { x: 140, y: 190 },
          accommodation: 1.0
        });
      });

      // 4. Same Size Image (u = 2f)
      document.getElementById('preset-mirror-same-size').addEventListener('click', () => {
        applyPreset('concave_mirror', {
          u: 40.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 40.0,
          eyePos: { x: 120, y: 190 },
          accommodation: 1.0
        });
      });

      // 5. Object at Focus
      document.getElementById('preset-mirror-focus').addEventListener('click', () => {
        applyPreset('concave_mirror', {
          u: 20.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 30.0,
          eyePos: { x: 220, y: 190 },
          accommodation: 1.0
        });
      });

      // 6. Diminished Image
      document.getElementById('preset-mirror-diminished').addEventListener('click', () => {
        applyPreset('concave_mirror', {
          u: 60.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 30.0,
          eyePos: { x: 100, y: 190 },
          accommodation: 1.0
        });
      });

      // 7. Eye and Retina Experiment
      document.getElementById('preset-mirror-eye-exp').addEventListener('click', () => {
        applyPreset('concave_mirror', {
          u: 14.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 46.7,
          eyePos: { x: 240, y: 180 },
          accommodation: 1.0
        });
      });

      // Convex Lens Presets
      // 1. Magnifying Glass (Section 9)
      document.getElementById('preset-lens-magnifying').addEventListener('click', () => {
        applyPreset('convex_lens', {
          u: 12.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 30.0,
          eyePos: { x: 680, y: 190 },
          accommodation: 1.0
        });
      });

      // 2. Virtual Image Screen Test
      document.getElementById('preset-lens-screen-test').addEventListener('click', () => {
        applyPreset('convex_lens', {
          u: 10.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 20.0,
          eyePos: { x: 660, y: 190 },
          accommodation: 1.0
        });
      });

      // 3. Diminished Real Image
      document.getElementById('preset-lens-diminished').addEventListener('click', () => {
        applyPreset('convex_lens', {
          u: 50.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 33.3,
          eyePos: { x: 860, y: 190 },
          accommodation: 1.0
        });
      });

      // 4. Same Size Real Image (u = 2f)
      document.getElementById('preset-lens-same-size').addEventListener('click', () => {
        applyPreset('convex_lens', {
          u: 40.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 40.0,
          eyePos: { x: 880, y: 190 },
          accommodation: 1.0
        });
      });

      // 5. Enlarged Real Image
      document.getElementById('preset-lens-enlarged').addEventListener('click', () => {
        applyPreset('convex_lens', {
          u: 28.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 70.0,
          eyePos: { x: 920, y: 190 },
          accommodation: 1.0
        });
      });

      // 6. Object at Focus
      document.getElementById('preset-lens-focus').addEventListener('click', () => {
        applyPreset('convex_lens', {
          u: 20.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 30.0,
          eyePos: { x: 700, y: 190 },
          accommodation: 1.0
        });
      });

      // 7. Eye and Retina Experiment
      document.getElementById('preset-lens-eye-exp').addEventListener('click', () => {
        applyPreset('convex_lens', {
          u: 14.0,
          f: 20.0,
          ho: 10.0,
          screenDist: 46.7,
          eyePos: { x: 720, y: 180 },
          accommodation: 1.0
        });
      });

      // Global Quick Action Buttons
      const btnScreenTest = document.getElementById('btn-try-screen-test');
      if (btnScreenTest) {
        btnScreenTest.addEventListener('click', () => {
          const sys = this.currentSystem === 'compare_both' ? 'concave_mirror' : this.currentSystem;
          applyPreset(sys, { u: 10.0, f: 20.0, ho: 10.0, screenDist: 20.0 });
        });
      }

      const btnRealImage = document.getElementById('btn-try-real-image');
      if (btnRealImage) {
        btnRealImage.addEventListener('click', () => {
          const sys = this.currentSystem === 'compare_both' ? 'concave_mirror' : this.currentSystem;
          applyPreset(sys, { u: 50.0, f: 20.0, ho: 10.0, screenDist: 33.3 });
        });
      }

      const btnReset = document.getElementById('btn-reset-exp');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          this.mirrorState = {
            u: 12.0,
            f: 20.0,
            ho: 10.0,
            screenDist: 30.0,
            eyePos: { x: 260, y: 190 },
            accommodation: 1.0
          };
          this.lensState = {
            u: 12.0,
            f: 20.0,
            ho: 10.0,
            screenDist: 30.0,
            eyePos: { x: 680, y: 190 },
            accommodation: 1.0
          };
          this.loadSystem(this.currentSystem);
        });
      }
    }

    bindModalButtons() {
      const zoomBtn = document.getElementById('btn-zoom-eye');
      if (zoomBtn) {
        zoomBtn.addEventListener('click', () => {
          const state = this.getCurrentActiveState();
          const optProps = this.currentSystem === 'concave_mirror'
            ? window.OpticsEngine.computeConcaveMirror(state.u, state.f, state.ho)
            : window.OpticsEngine.computeConvexLens(state.u, state.f, state.ho);
          this.eyeModal.open(optProps, this.currentSystem, state.accommodation);
        });
      }

      const explainBtn = document.getElementById('btn-explain-now');
      if (explainBtn) {
        explainBtn.addEventListener('click', () => {
          const eduPanel = document.getElementById('educational-panel');
          if (eduPanel) {
            eduPanel.scrollIntoView({ behavior: 'smooth' });
            eduPanel.style.outline = '2px solid #38bdf8';
            setTimeout(() => eduPanel.style.outline = 'none', 1600);
          }
        });
      }
    }

    bindZoomControls() {
      const btnIn = document.getElementById('btn-zoom-in');
      const btnOut = document.getElementById('btn-zoom-out');
      const btnResetView = document.getElementById('btn-zoom-reset');

      if (btnIn) {
        btnIn.addEventListener('click', () => {
          this.options.zoom = Math.min(1.8, this.options.zoom + 0.15);
          this.mainCanvas.setState({ zoom: this.options.zoom });
          this.syncUIFromState();
        });
      }
      if (btnOut) {
        btnOut.addEventListener('click', () => {
          this.options.zoom = Math.max(0.65, this.options.zoom - 0.15);
          this.mainCanvas.setState({ zoom: this.options.zoom });
          this.syncUIFromState();
        });
      }
      if (btnResetView) {
        btnResetView.addEventListener('click', () => {
          this.options.zoom = 1.0;
          this.mainCanvas.setState({ zoom: 1.0, panX: 0 });
          this.syncUIFromState();
        });
      }
    }

    /**
     * 10-Stage Guided Learning Mode
     */
    getTourStepDefinitions() {
      return [
        {
          stage: 1,
          title: 'Stage 1: The Concave Mirror Setup',
          desc: 'Select the Concave Mirror. Notice the optical axis, Pole P, Focal point F, and Centre of Curvature C.',
          action: () => {
            this.loadSystem('concave_mirror');
            this.mirrorState.u = 50.0;
            this.mirrorState.f = 20.0;
            this.mainCanvas.setState(this.mirrorState);
          }
        },
        {
          stage: 2,
          title: 'Stage 2: Move Inside the Focal Length',
          desc: 'Bring the object close to the mirror so that object distance u is less than focal length f (u < f).',
          action: () => {
            this.mirrorState.u = 12.0;
            this.mainCanvas.setState(this.mirrorState);
          }
        },
        {
          stage: 3,
          title: 'Stage 3: Observe the Virtual Image',
          desc: 'Notice an ENLARGED, UPRIGHT virtual image appearing behind the mirror. Notice that m > 1 and v < 0.',
          action: () => {
            this.mirrorState.u = 12.0;
            this.mainCanvas.setState(this.mirrorState);
          }
        },
        {
          stage: 4,
          title: 'Stage 4: Trace Diverging Rays & Virtual Extensions',
          desc: 'Solid lines represent actual light reflected away from the mirror. Dashed lines are backward extensions meeting behind the mirror.',
          action: () => {
            this.options.showPrincipalRays = true;
            this.options.showVirtualExtensions = true;
            this.mainCanvas.setState(this.options);
          }
        },
        {
          stage: 5,
          title: 'Stage 5: Position the Human Eye',
          desc: 'Position the observer’s eye in front of the mirror where the reflected diverging cone of light enters the pupil.',
          action: () => {
            this.mirrorState.eyePos = { x: 260, y: 190 };
            this.mainCanvas.setState(this.mirrorState);
          }
        },
        {
          stage: 6,
          title: 'Stage 6: Zoom into Eye — Retinal Image Formation',
          desc: 'The eye lens takes the diverging light and converges it to form a REAL, INVERTED image on the retina!',
          action: () => {
            const optProps = window.OpticsEngine.computeConcaveMirror(this.mirrorState.u, this.mirrorState.f, this.mirrorState.ho);
            this.eyeModal.open(optProps, 'concave_mirror', 1.0);
          }
        },
        {
          stage: 7,
          title: 'Stage 7: Screen Test with Virtual Image',
          desc: 'Place a screen at the virtual image position. The screen CANNOT capture an image because rays do not actually converge there!',
          action: () => {
            this.eyeModal.close();
            this.mirrorState.screenDist = 30.0;
            this.mainCanvas.setState(this.mirrorState);
          }
        },
        {
          stage: 8,
          title: 'Stage 8: Transition to a Real Image',
          desc: 'Move the object beyond the focal point (u > f). Now actual rays converge and form a real, inverted image captured sharply on screen!',
          action: () => {
            this.mirrorState.u = 50.0;
            this.mirrorState.screenDist = 33.3;
            this.mainCanvas.setState(this.mirrorState);
          }
        },
        {
          stage: 9,
          title: 'Stage 9: Switch to the Convex Lens',
          desc: 'Switch to the Convex Lens. Notice the difference: lenses REFRACT light through both sides instead of reflecting.',
          action: () => {
            this.loadSystem('convex_lens');
            this.lensState.u = 50.0;
            this.lensState.f = 20.0;
            this.lensState.screenDist = 33.3;
            this.mainCanvas.setState(this.lensState);
          }
        },
        {
          stage: 10,
          title: 'Stage 10: The Magnifying Glass Experiment',
          desc: 'Place object inside the focal length of the convex lens (u < f). The lens forms an enlarged virtual image that your eye focuses onto the retina!',
          action: () => {
            this.lensState.u = 12.0;
            this.lensState.eyePos = { x: 680, y: 190 };
            this.mainCanvas.setState(this.lensState);
          }
        }
      ];
    }

    bindTour() {
      const btnStartTour = document.getElementById('btn-start-tour');
      const banner = document.getElementById('guided-tour-banner');
      const btnPrev = document.getElementById('tour-btn-prev');
      const btnNext = document.getElementById('tour-btn-next');
      const btnExit = document.getElementById('tour-btn-exit');

      if (btnStartTour) {
        btnStartTour.addEventListener('click', () => {
          this.isTourActive = true;
          this.tourCurrentStep = 0;
          banner.classList.remove('hidden');
          this.loadTourStep(0);
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          if (this.tourCurrentStep < this.tourSteps.length - 1) {
            this.tourCurrentStep++;
            this.loadTourStep(this.tourCurrentStep);
          }
        });
      }

      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          if (this.tourCurrentStep > 0) {
            this.tourCurrentStep--;
            this.loadTourStep(this.tourCurrentStep);
          }
        });
      }

      if (btnExit) {
        btnExit.addEventListener('click', () => {
          this.isTourActive = false;
          banner.classList.add('hidden');
        });
      }
    }

    loadTourStep(index) {
      const step = this.tourSteps[index];
      if (!step) return;

      const badge = document.getElementById('tour-step-badge');
      const title = document.getElementById('tour-step-title');
      const desc = document.getElementById('tour-step-desc');
      const btnPrev = document.getElementById('tour-btn-prev');
      const btnNext = document.getElementById('tour-btn-next');

      if (badge) badge.textContent = `Stage ${step.stage} of ${this.tourSteps.length}`;
      if (title) title.textContent = step.title;
      if (desc) desc.textContent = step.desc;

      if (btnPrev) btnPrev.disabled = index === 0;
      if (btnNext) btnNext.textContent = index === this.tourSteps.length - 1 ? 'Finish Tour' : 'Next Stage →';

      step.action();
      this.syncUIFromState();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.app = new OpticsApp();
  });
})(window);
