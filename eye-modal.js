/**
 * MIRROR & LENS LAB — Retina Zoom & Eye Accommodation Modal
 * 
 * Provides an enlarged anatomical cross-section of the human eye:
 * - Cornea
 * - Pupil / Iris
 * - Crystalline Eye Lens (dynamic curvature based on accommodation)
 * - Retina & Fovea
 * - Optic Nerve
 * - Refracted light rays inside eyeball
 * - Real, Inverted Retinal Image
 * - Dynamic Accommodation / Focus Slider with real-time blur/sharp convergence
 */

(function (window) {
  'use strict';

  class EyeModal {
    constructor() {
      this.modalOverlay = null;
      this.accommodation = 1.0; // 1.0 = sharp focus
      this.optProps = null;
      this.system = 'concave_mirror';
      this.svgElement = null;

      this.initModalDOM();
    }

    initModalDOM() {
      // Check if modal container already exists
      let existing = document.getElementById('retina-zoom-modal');
      if (existing) {
        this.modalOverlay = existing;
        return;
      }

      const modalHtml = `
        <div id="retina-zoom-modal" class="modal-overlay">
          <div class="modal-dialog">
            <div class="modal-header">
              <div class="modal-title">
                <span>👁️</span> RETINA ZOOM & EYE ACCOMMODATION LAB
              </div>
              <button class="modal-close-btn" id="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <!-- Enlarged Eye Cross-Section Canvas -->
              <div class="eye-zoom-canvas-wrap">
                <svg id="eye-zoom-svg" viewBox="0 0 800 320" width="100%" height="100%">
                  <!-- Rendered dynamically -->
                </svg>
              </div>

              <!-- Interactive Accommodation Controls & Readout -->
              <div class="eye-modal-controls">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong style="color:#ffffff; font-size:13px;">EYE FOCUS / ACCOMMODATION (Ciliary Lens Power)</strong>
                    <div style="font-size:11.5px; color:#94a3b8;">
                      Adjust the crystalline lens curvature to focus incoming light rays onto the retina.
                    </div>
                  </div>
                  <div id="eye-modal-status-badge" class="status-pill pill-real">
                    IMAGE IN FOCUS
                  </div>
                </div>

                <div class="slider-unit" style="margin-top:6px;">
                  <div class="slider-label-row">
                    <span class="slider-name">Optical Power of Eye Lens</span>
                    <span class="slider-val" id="eye-acc-val">58.0 D (Optimal)</span>
                  </div>
                  <input type="range" id="modal-eye-acc-slider" min="0.75" max="1.25" step="0.01" value="1.0">
                  <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b;">
                    <span>Under-Accommodated (Flat Lens)</span>
                    <span>Correctly Focused (Retina)</span>
                    <span>Over-Accommodated (Thick Lens)</span>
                  </div>
                </div>
              </div>

              <!-- Educational Scientific Insight -->
              <div class="edu-highlight-box" style="margin:0;">
                <div style="display:flex; align-items:flex-start; gap:8px;">
                  <span style="font-size:16px;">💡</span>
                  <div>
                    <strong style="color:#38bdf8;">FUNDAMENTAL OPTICAL PRINCIPLE:</strong>
                    <p style="margin-top:4px; font-size:12.5px; line-height:1.5; color:#cbd5e1;">
                      The external optical component (concave mirror or convex lens) forms a <strong>virtual image</strong> whose rays diverge away from the apparent image position. 
                      When these diverging rays enter your eye, the <strong>cornea and crystalline eye lens</strong> act as an internal convergent optical system, refracting the rays so they converge onto the <strong>retina</strong>.
                      Therefore, your eye forms a separate, <strong>real, inverted retinal image</strong> that your optic nerve transmits to your brain!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      this.modalOverlay = document.getElementById('retina-zoom-modal');
      this.svgElement = document.getElementById('eye-zoom-svg');

      // Bind close buttons
      const closeBtn = document.getElementById('modal-close-btn');
      closeBtn.addEventListener('click', () => this.close());
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) this.close();
      });

      // Bind accommodation slider
      const accSlider = document.getElementById('modal-eye-acc-slider');
      accSlider.addEventListener('input', (e) => {
        this.accommodation = parseFloat(e.target.value);
        this.updateAccommodationUI();
        this.renderEyeZoom();
      });
    }

    open(optProps, system, accommodation = 1.0) {
      this.optProps = optProps;
      this.system = system;
      this.accommodation = accommodation;

      const accSlider = document.getElementById('modal-eye-acc-slider');
      if (accSlider) accSlider.value = this.accommodation;

      this.updateAccommodationUI();
      this.modalOverlay.classList.add('active');
      this.renderEyeZoom();
    }

    close() {
      this.modalOverlay.classList.remove('active');
    }

    updateAccommodationUI() {
      const badge = document.getElementById('eye-modal-status-badge');
      const valLabel = document.getElementById('eye-acc-val');
      const focusError = Math.abs(this.accommodation - 1.0);
      const isSharp = focusError < 0.04;
      const diopters = (58.0 * this.accommodation).toFixed(1);

      if (valLabel) {
        valLabel.textContent = `${diopters} D (${isSharp ? 'In Focus' : (this.accommodation < 1.0 ? 'Under-focused' : 'Over-focused')})`;
      }

      if (badge) {
        if (isSharp) {
          badge.className = 'status-pill pill-real';
          badge.textContent = 'IMAGE IN FOCUS';
        } else {
          badge.className = 'status-pill pill-virtual';
          badge.textContent = 'IMAGE OUT OF FOCUS';
        }
      }
    }

    renderEyeZoom() {
      if (!this.svgElement) return;

      const w = 800;
      const h = 320;
      const centerY = h / 2; // 160
      const eyeCenterX = 560; // Center of eyeball sphere
      const eyeRadius = 120; // 240px diameter eyeball

      // Eyeball Key Points
      const corneaApexX = eyeCenterX - eyeRadius - 38; // 402
      const pupilX = eyeCenterX - eyeRadius + 14;      // 454
      const eyeLensX = eyeCenterX - eyeRadius + 32;    // 472
      const retinaApexX = eyeCenterX + eyeRadius;      // 680

      // Lens thickness depends on accommodation
      // Accommodation > 1.0 => thicker, steeper curvature
      // Accommodation < 1.0 => flatter lens
      const lensRx = 7 + (this.accommodation - 1.0) * 10;
      const lensRy = 48;

      // Focus plane offset based on accommodation:
      // When acc = 1.0, focal point is right on retinaApexX (680)
      // When acc < 1.0 (under-focused / hyperopia), rays converge BEHIND retina
      // When acc > 1.0 (over-focused / myopia), rays converge IN FRONT OF retina
      const focusPointX = retinaApexX - (this.accommodation - 1.0) * 180;
      const focusError = Math.abs(this.accommodation - 1.0);
      const isSharp = focusError < 0.04;

      // Incoming Rays starting from left (simulating light coming from external image/mirror/lens)
      const raySourceX = 40;
      const rayTopY = centerY - 65;
      const rayMidY = centerY;
      const rayBotY = centerY + 65;

      // Retinal Image Height
      const retArrowH = 38;
      // Retinal image is always inverted relative to viewed object!
      // If external virtual image is upright (m > 0), retinal image points DOWN
      const retinalTipY = isSharp ? centerY + retArrowH : centerY + retArrowH;

      let html = `
        <defs>
          <!-- Blur filter for out-of-focus retinal image -->
          <filter id="modal-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${Math.max(0.1, focusError * 8.0)}"/>
          </filter>
        </defs>

        <!-- Eyeball Background Chamber (Vitreous Humor) -->
        <circle cx="${eyeCenterX}" cy="${centerY}" r="${eyeRadius}" fill="#0b1329" stroke="#334155" stroke-width="3"/>

        <!-- Optic Nerve Exit at rear -->
        <path d="M ${eyeCenterX + eyeRadius - 10} ${centerY - 22} 
                 Q ${eyeCenterX + eyeRadius + 45} ${centerY - 10} ${eyeCenterX + eyeRadius + 75} ${centerY - 16}
                 L ${eyeCenterX + eyeRadius + 75} ${centerY + 16}
                 Q ${eyeCenterX + eyeRadius + 45} ${centerY + 10} ${eyeCenterX + eyeRadius - 10} ${centerY + 22}"
              fill="#1e293b" stroke="#475569" stroke-width="2"/>
        <text x="${eyeCenterX + eyeRadius + 8}" y="${centerY + 34}" fill="#64748b" font-size="9" font-weight="700">OPTIC NERVE</text>

        <!-- Retina Layer (Inner rear curve, sensitized photoreceptors) -->
        <path d="M ${eyeCenterX + 20} ${centerY - eyeRadius + 22} 
                 A ${eyeRadius - 4} ${eyeRadius - 4} 0 0 1 ${eyeCenterX + 20} ${centerY + eyeRadius - 22}"
              fill="none" stroke="#f97316" stroke-width="5" stroke-linecap="round"/>
        <!-- Fovea indicator -->
        <circle cx="${retinaApexX - 4}" cy="${centerY}" r="5" fill="#eab308"/>
        <text x="${retinaApexX - 10}" y="${centerY - 16}" fill="#f97316" font-size="10" font-weight="800" text-anchor="end">RETINA (FOVEA)</text>

        <!-- Sclera Outer Shell -->
        <path d="M ${eyeCenterX - eyeRadius + 18} ${centerY - eyeRadius + 8} 
                 A ${eyeRadius} ${eyeRadius} 0 1 1 ${eyeCenterX - eyeRadius + 18} ${centerY + eyeRadius - 8}"
              fill="none" stroke="#94a3b8" stroke-width="3"/>

        <!-- Cornea (Transparent anterior bulge) -->
        <path d="M ${eyeCenterX - eyeRadius + 18} ${centerY - 68} 
                 C ${corneaApexX} ${centerY - 45}, ${corneaApexX} ${centerY + 45}, ${eyeCenterX - eyeRadius + 18} ${centerY + 68}"
              fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="3.5"/>
        <text x="${corneaApexX - 6}" y="${centerY - 48}" fill="#38bdf8" font-size="10" font-weight="700" text-anchor="end">CORNEA</text>

        <!-- Iris (Aperture diaphragm) -->
        <line x1="${pupilX}" y1="${centerY - 64}" x2="${pupilX}" y2="${centerY - 22}" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
        <line x1="${pupilX}" y1="${centerY + 64}" x2="${pupilX}" y2="${centerY + 22}" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
        <text x="${pupilX}" y="${centerY - 72}" fill="#94a3b8" font-size="9.5" font-weight="700" text-anchor="middle">IRIS / PUPIL</text>

        <!-- Crystalline Eye Lens (Flexible Biconvex) -->
        <ellipse cx="${eyeLensX}" cy="${centerY}" rx="${lensRx}" ry="${lensRy}" 
                 fill="rgba(248, 250, 252, 0.4)" stroke="#e2e8f0" stroke-width="2.5"/>
        <text x="${eyeLensX}" y="${centerY - lensRy - 12}" fill="#e2e8f0" font-size="10" font-weight="700" text-anchor="middle">EYE LENS</text>

        <!-- Ciliary Zonules holding lens -->
        <line x1="${eyeLensX}" y1="${centerY - lensRy}" x2="${eyeLensX}" y2="${centerY - eyeRadius + 12}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="2 2"/>
        <line x1="${eyeLensX}" y1="${centerY + lensRy}" x2="${eyeLensX}" y2="${centerY + eyeRadius - 12}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="2 2"/>

        <!-- INCOMING LIGHT RAYS FROM EXTERNAL OPTICAL SYSTEM -->
        <!-- Upper incoming ray -->
        <line x1="${raySourceX}" y1="${rayTopY}" x2="${corneaApexX + 10}" y2="${centerY - 18}" 
              stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="${corneaApexX + 10}" y1="${centerY - 18}" x2="${eyeLensX}" y2="${centerY - 16}" 
              stroke="#fbbf24" stroke-width="2.2"/>

        <!-- Middle incoming ray -->
        <line x1="${raySourceX}" y1="${rayMidY}" x2="${corneaApexX}" y2="${centerY}" 
              stroke="#38bdf8" stroke-width="2.2"/>
        <line x1="${corneaApexX}" y1="${centerY}" x2="${eyeLensX}" y2="${centerY}" 
              stroke="#38bdf8" stroke-width="2.2"/>

        <!-- Lower incoming ray -->
        <line x1="${raySourceX}" y1="${rayBotY}" x2="${corneaApexX + 10}" y2="${centerY + 18}" 
              stroke="#34d399" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="${corneaApexX + 10}" y1="${centerY + 18}" x2="${eyeLensX}" y2="${centerY + 16}" 
              stroke="#34d399" stroke-width="2.2"/>

        <!-- Incoming rays label -->
        <text x="${raySourceX + 20}" y="${rayTopY - 14}" fill="#fbbf24" font-size="10.5" font-weight="700">
          DIVERGING LIGHT FROM EXTERNAL VIRTUAL IMAGE
        </text>

        <!-- REFRACTED CONVERGING RAYS INSIDE EYEBALL -->
        <!-- Rays converge towards focusPointX -->
        <line x1="${eyeLensX}" y1="${centerY - 16}" x2="${focusPointX}" y2="${centerY + retArrowH}" 
              stroke="#fbbf24" stroke-width="2.2"/>
        <line x1="${eyeLensX}" y1="${centerY}" x2="${focusPointX}" y2="${centerY}" 
              stroke="#38bdf8" stroke-width="2"/>
        <line x1="${eyeLensX}" y1="${centerY + 16}" x2="${focusPointX}" y2="${centerY - retArrowH}" 
              stroke="#34d399" stroke-width="2.2"/>
      `;

      // Draw Retinal Image on the retina surface
      html += `
        <!-- REAL, INVERTED RETINAL IMAGE -->
        <g filter="${isSharp ? '' : 'url(#modal-blur)'}">
          <line x1="${retinaApexX - 4}" y1="${centerY}" x2="${retinaApexX - 4}" y2="${retinalTipY}" 
                stroke="#f97316" stroke-width="4.5" stroke-linecap="round"/>
          <polygon points="${retinaApexX - 4},${retinalTipY + 4} 
                           ${retinaApexX - 9},${retinalTipY - 8} 
                           ${retinaApexX + 1},${retinalTipY - 8}" 
                   fill="#f97316"/>
        </g>
        <!-- Retinal Arrow Label -->
        <text x="${retinaApexX - 22}" y="${retinalTipY + 18}" fill="#f97316" font-size="11" font-weight="800" text-anchor="end">
          ${isSharp ? 'REAL INVERTED RETINAL IMAGE (IN FOCUS)' : 'BLURRED RETINAL IMAGE (OUT OF FOCUS)'}
        </text>
      `;

      // If focal point doesn't coincide with retina, draw focal plane marker
      if (!isSharp) {
        html += `
          <!-- Focal plane indicator -->
          <line x1="${focusPointX}" y1="${centerY - 50}" x2="${focusPointX}" y2="${centerY + 50}" 
                stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4 3"/>
          <text x="${focusPointX}" y="${centerY - 56}" fill="#f87171" font-size="9" font-weight="700" text-anchor="middle">
            FOCAL PLANE (${this.accommodation < 1.0 ? 'BEHIND RETINA' : 'IN FRONT OF RETINA'})
          </text>
        `;
      }

      this.svgElement.innerHTML = html;
    }
  }

  window.EyeModal = EyeModal;
})(window);
