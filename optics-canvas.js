/**
 * MIRROR & LENS LAB — Interactive SVG Optical Canvas Renderer
 * 
 * Renders:
 * - Concave spherical mirror & Convex thin lens
 * - Principal axis with metric graduations
 * - Focal points F, C, F1, F2, 2F1, 2F2, Pole P, Optical Centre O
 * - Draggable Object Arrow (distance & height)
 * - Dynamically formed Image Arrow (Real / Virtual / Infinity)
 * - Mathematically exact Paraxial Principal Rays with directional arrows
 * - Dashed Virtual Extensions meeting at virtual image plane
 * - Draggable Physical / Conceptual Screen with image projection & blur
 * - Draggable Cross-Sectional Human Eye with pupil ray tracing & Retinal Image
 * - Live distance dimension brackets
 */

(function (window) {
  'use strict';

  class OpticsCanvas {
    constructor(svgElement, options = {}) {
      this.svg = svgElement;
      this.options = Object.assign({
        width: 1000,
        height: 480,
        scale: 6.0, // pixels per cm
        system: 'concave_mirror',
        showGrid: true,
        showPrincipalRays: true,
        showVirtualExtensions: true,
        showEyeCone: true,
        showScreen: true,
        showDimensions: true,
        animateRays: false,
        zoom: 1.0,
        panX: 0,
        onUpdate: null // Callback when user drags elements
      }, options);

      // System state
      this.u = 12.0;       // cm
      this.f = 20.0;       // cm
      this.ho = 10.0;      // cm
      this.screenDist = 30.0; // cm
      this.eyePos = { x: 260, y: 190 }; // px
      this.accommodation = 1.0;

      // Drag state
      this.activeDrag = null; // 'object', 'screen', 'eye', 'pan'
      this.dragStart = { x: 0, y: 0 };
      this.initialDragVal = null;

      this.initCanvas();
      this.bindEvents();
    }

    initCanvas() {
      this.svg.setAttribute('viewBox', `0 0 ${this.options.width} ${this.options.height}`);
      this.svg.innerHTML = `
        <defs>
          <!-- SVG Filters for glowing rays -->
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#38bdf8" flood-opacity="0.8"/>
          </filter>
          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#fbbf24" flood-opacity="0.8"/>
          </filter>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#34d399" flood-opacity="0.8"/>
          </filter>
          <filter id="glow-pink" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.0" flood-color="#ec4899" flood-opacity="0.9"/>
          </filter>

          <!-- Marker Arrows -->
          <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
          </marker>
          <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24"/>
          </marker>
          <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399"/>
          </marker>
          <marker id="arrow-dim" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#64748b"/>
          </marker>

          <!-- Lens Glass Gradient -->
          <linearGradient id="lens-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.2"/>
            <stop offset="50%" stop-color="#a5f3fc" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.2"/>
          </linearGradient>

          <!-- Mirror Shading Pattern -->
          <pattern id="mirror-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" stroke-width="1.2"/>
          </pattern>
        </defs>

        <g id="viewport-group">
          <g id="grid-layer"></g>
          <g id="axis-layer"></g>
          <g id="dimensions-layer"></g>
          <g id="optical-component-layer"></g>
          <g id="screen-layer"></g>
          <g id="rays-layer"></g>
          <g id="image-layer"></g>
          <g id="object-layer"></g>
          <g id="eye-layer"></g>
        </g>
      `;

      this.viewportGroup = this.svg.querySelector('#viewport-group');
      this.gridLayer = this.svg.querySelector('#grid-layer');
      this.axisLayer = this.svg.querySelector('#axis-layer');
      this.dimensionsLayer = this.svg.querySelector('#dimensions-layer');
      this.opticalLayer = this.svg.querySelector('#optical-component-layer');
      this.screenLayer = this.svg.querySelector('#screen-layer');
      this.raysLayer = this.svg.querySelector('#rays-layer');
      this.imageLayer = this.svg.querySelector('#image-layer');
      this.objectLayer = this.svg.querySelector('#object-layer');
      this.eyeLayer = this.svg.querySelector('#eye-layer');
    }

    /**
     * Compute origin coordinates based on optical system
     */
    getOrigin() {
      const y0 = this.options.height / 2; // Axis vertical center (240px)
      // For concave mirror: pole P is at x = 620px (left side is front, right side is back/virtual)
      // For convex lens: optical center O is at x = 480px (symmetric)
      const x0 = this.options.system === 'concave_mirror' ? 620 : 480;
      return { x0, y0 };
    }

    /**
     * Set simulation parameters and re-render
     */
    setState(params) {
      if (params.system !== undefined) this.options.system = params.system;
      if (params.u !== undefined) this.u = Math.max(1.0, Math.min(80.0, params.u));
      if (params.f !== undefined) this.f = Math.max(5.0, Math.min(45.0, params.f));
      if (params.ho !== undefined) this.ho = Math.max(3.0, Math.min(25.0, params.ho));
      if (params.screenDist !== undefined) this.screenDist = Math.max(2.0, Math.min(80.0, params.screenDist));
      if (params.eyePos !== undefined) this.eyePos = params.eyePos;
      if (params.accommodation !== undefined) this.accommodation = params.accommodation;
      
      // Optional toggles
      if (params.showGrid !== undefined) this.options.showGrid = params.showGrid;
      if (params.showPrincipalRays !== undefined) this.options.showPrincipalRays = params.showPrincipalRays;
      if (params.showVirtualExtensions !== undefined) this.options.showVirtualExtensions = params.showVirtualExtensions;
      if (params.showEyeCone !== undefined) this.options.showEyeCone = params.showEyeCone;
      if (params.showScreen !== undefined) this.options.showScreen = params.showScreen;
      if (params.showDimensions !== undefined) this.options.showDimensions = params.showDimensions;
      if (params.zoom !== undefined) this.options.zoom = params.zoom;
      if (params.panX !== undefined) this.options.panX = params.panX;

      this.render();
    }

    render() {
      const { x0, y0 } = this.getOrigin();
      const scale = this.options.scale * this.options.zoom;
      const isMirror = this.options.system === 'concave_mirror';

      // 1. Calculate Optical Physics
      const optProps = isMirror
        ? window.OpticsEngine.computeConcaveMirror(this.u, this.f, this.ho)
        : window.OpticsEngine.computeConvexLens(this.u, this.f, this.ho);

      const eyeProps = window.OpticsEngine.computeEyeOptics(
        optProps,
        this.eyePos,
        this.accommodation,
        { system: this.options.system, originX: x0, originY: y0, scale: scale }
      );

      const screenProps = window.OpticsEngine.computeScreenOptics(
        optProps,
        this.screenDist,
        this.options.system
      );

      // Apply viewport transform (pan & zoom)
      this.viewportGroup.setAttribute(
        'transform',
        `translate(${this.options.panX}, 0)`
      );

      // Render all layers
      this.renderGrid(x0, y0, scale);
      this.renderPrincipalAxis(x0, y0, scale, optProps);
      this.renderOpticalComponent(x0, y0, scale, optProps);
      this.renderObject(x0, y0, scale);
      this.renderImage(x0, y0, scale, optProps);
      this.renderRays(x0, y0, scale, optProps, eyeProps);
      this.renderScreen(x0, y0, scale, optProps, screenProps);
      this.renderEye(x0, y0, scale, optProps, eyeProps);
      if (this.options.showDimensions) {
        this.renderDimensions(x0, y0, scale, optProps);
      } else {
        this.dimensionsLayer.innerHTML = '';
      }

      return { optProps, eyeProps, screenProps };
    }

    renderGrid(x0, y0, scale) {
      if (!this.options.showGrid) {
        this.gridLayer.innerHTML = '';
        return;
      }
      const w = this.options.width + 400;
      const h = this.options.height;
      const step = scale * 5; // grid line every 5 cm
      let lines = '';

      for (let x = -200; x <= w; x += step) {
        lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#17223b" stroke-width="0.8"/>`;
      }
      for (let y = 0; y <= h; y += step) {
        lines += `<line x1="-200" y1="${y}" x2="${w}" y2="${y}" stroke="#17223b" stroke-width="0.8"/>`;
      }
      this.gridLayer.innerHTML = lines;
    }

    renderPrincipalAxis(x0, y0, scale, optProps) {
      const isMirror = this.options.system === 'concave_mirror';
      let html = '';

      // Main axis line
      html += `
        <line x1="-200" y1="${y0}" x2="${this.options.width + 200}" y2="${y0}" stroke="#475569" stroke-width="1.8" stroke-dasharray="8 4"/>
      `;

      // Axis label
      html += `
        <text x="30" y="${y0 - 12}" fill="#64748b" font-size="11" font-weight="600" letter-spacing="1">PRINCIPAL OPTICAL AXIS</text>
      `;

      if (isMirror) {
        // Points: Pole P, Focus F, Centre of Curvature C
        const fPx = optProps.f * scale;
        const cPx = 2 * optProps.f * scale;

        // Pole P
        html += `
          <circle cx="${x0}" cy="${y0}" r="3.5" fill="#38bdf8"/>
          <text x="${x0 + 8}" y="${y0 + 16}" fill="#94a3b8" font-size="11" font-weight="700">P</text>
        `;

        // Focus F
        html += `
          <circle cx="${x0 - fPx}" cy="${y0}" r="4" fill="#fbbf24"/>
          <text x="${x0 - fPx}" y="${y0 + 18}" fill="#fbbf24" font-size="12" font-weight="800" text-anchor="middle">F</text>
          <text x="${x0 - fPx}" y="${y0 + 30}" fill="#94a3b8" font-size="9" text-anchor="middle">${optProps.f.toFixed(0)}cm</text>
        `;

        // Centre of Curvature C
        html += `
          <circle cx="${x0 - cPx}" cy="${y0}" r="4" fill="#34d399"/>
          <text x="${x0 - cPx}" y="${y0 + 18}" fill="#34d399" font-size="12" font-weight="800" text-anchor="middle">C</text>
          <text x="${x0 - cPx}" y="${y0 + 30}" fill="#94a3b8" font-size="9" text-anchor="middle">2F (${(optProps.f * 2).toFixed(0)}cm)</text>
        `;
      } else {
        // Convex Lens: Centre O, F1, 2F1 (left) and F2, 2F2 (right)
        const fPx = optProps.f * scale;

        // Optical Centre O
        html += `
          <circle cx="${x0}" cy="${y0}" r="3.5" fill="#38bdf8"/>
          <text x="${x0}" y="${y0 + 18}" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle">O</text>
        `;

        // F1 and 2F1 (left)
        html += `
          <circle cx="${x0 - fPx}" cy="${y0}" r="4" fill="#fbbf24"/>
          <text x="${x0 - fPx}" y="${y0 + 18}" fill="#fbbf24" font-size="11" font-weight="800" text-anchor="middle">F₁</text>
          <circle cx="${x0 - 2 * fPx}" cy="${y0}" r="4" fill="#34d399"/>
          <text x="${x0 - 2 * fPx}" y="${y0 + 18}" fill="#34d399" font-size="11" font-weight="800" text-anchor="middle">2F₁</text>
        `;

        // F2 and 2F2 (right)
        html += `
          <circle cx="${x0 + fPx}" cy="${y0}" r="4" fill="#fbbf24"/>
          <text x="${x0 + fPx}" y="${y0 + 18}" fill="#fbbf24" font-size="11" font-weight="800" text-anchor="middle">F₂</text>
          <circle cx="${x0 + 2 * fPx}" cy="${y0}" r="4" fill="#34d399"/>
          <text x="${x0 + 2 * fPx}" y="${y0 + 18}" fill="#34d399" font-size="11" font-weight="800" text-anchor="middle">2F₂</text>
        `;
      }

      this.axisLayer.innerHTML = html;
    }

    renderOpticalComponent(x0, y0, scale, optProps) {
      const isMirror = this.options.system === 'concave_mirror';
      let html = '';

      if (isMirror) {
        // Concave Mirror Arc
        // Radius of curvature R = 2f
        const R_px = Math.max(160, optProps.R * scale);
        const halfH = 140; // Mirror aperture height
        // dx = R - sqrt(R^2 - y^2)
        const dx = R_px - Math.sqrt(Math.max(0, R_px * R_px - halfH * halfH));
        const topX = x0 - dx;
        const botX = x0 - dx;

        // SVG Arc: M (topX, y0 - halfH) A R R 0 0 0 (botX, y0 + halfH)
        html += `
          <g class="mirror-group">
            <!-- Non-reflective hatched backing -->
            <path d="M ${topX} ${y0 - halfH} A ${R_px} ${R_px} 0 0 0 ${botX} ${y0 + halfH} L ${botX + 16} ${y0 + halfH} L ${topX + 16} ${y0 - halfH} Z"
                  fill="url(#mirror-hatch)" opacity="0.6"/>
            <!-- Mirror back border -->
            <path d="M ${topX + 8} ${y0 - halfH} A ${R_px} ${R_px} 0 0 0 ${botX + 8} ${y0 + halfH}"
                  stroke="#334155" stroke-width="4" fill="none"/>
            <!-- Reflective Front Surface -->
            <path d="M ${topX} ${y0 - halfH} A ${R_px} ${R_px} 0 0 0 ${botX} ${y0 + halfH}"
                  stroke="#38bdf8" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <text x="${x0 + 22}" y="${y0 - halfH + 20}" fill="#94a3b8" font-size="11" font-weight="700">CONCAVE MIRROR</text>
            <text x="${x0 + 22}" y="${y0 - halfH + 34}" fill="#64748b" font-size="9">R = ${optProps.R.toFixed(0)}cm</text>
          </g>
        `;
      } else {
        // Biconvex Lens Shape
        const halfH = 140;
        const thickness = 24;

        html += `
          <g class="lens-group">
            <!-- Glass body with soft gradient -->
            <path d="M ${x0} ${y0 - halfH} 
                     Q ${x0 + thickness} ${y0} ${x0} ${y0 + halfH} 
                     Q ${x0 - thickness} ${y0} ${x0} ${y0 - halfH} Z"
                  fill="url(#lens-gradient)" stroke="#38bdf8" stroke-width="2.2"/>
            <!-- Optical Centre vertical reference line -->
            <line x1="${x0}" y1="${y0 - halfH - 10}" x2="${x0}" y2="${y0 + halfH + 10}" 
                  stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>
            <text x="${x0 + 16}" y="${y0 - halfH + 15}" fill="#38bdf8" font-size="11" font-weight="700">CONVEX LENS</text>
            <text x="${x0 + 16}" y="${y0 - halfH + 30}" fill="#64748b" font-size="9">f = ${optProps.f.toFixed(0)}cm</text>
          </g>
        `;
      }

      this.opticalLayer.innerHTML = html;
    }

    renderObject(x0, y0, scale) {
      const objX = x0 - this.u * scale;
      const objTipY = y0 - this.ho * scale;
      const headSize = 10;

      let html = `
        <g class="draggable-target" id="drag-object" data-drag="object">
          <!-- Transparent thick hit area for easy grabbing -->
          <line x1="${objX}" y1="${y0}" x2="${objX}" y2="${objTipY}" stroke="transparent" stroke-width="24"/>
          <circle cx="${objX}" cy="${objTipY}" r="16" fill="transparent"/>

          <!-- Object stem arrow -->
          <line x1="${objX}" y1="${y0}" x2="${objX}" y2="${objTipY}" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
          <!-- Arrowhead -->
          <polygon points="${objX},${objTipY - 4} ${objX - headSize},${objTipY + headSize} ${objX + headSize},${objTipY + headSize}" fill="#38bdf8"/>

          <!-- Drag Handle Indicator at tip -->
          <circle cx="${objX}" cy="${objTipY}" r="5.5" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>

          <!-- Object Base marker -->
          <rect x="${objX - 6}" y="${y0 - 2}" width="12" height="4" fill="#38bdf8" rx="1"/>

          <!-- Label -->
          <text x="${objX}" y="${objTipY - 14}" fill="#e0f2fe" font-size="11" font-weight="700" text-anchor="middle">OBJECT</text>
          <text x="${objX}" y="${objTipY - 2}" fill="#94a3b8" font-size="9.5" text-anchor="middle">u = ${this.u.toFixed(1)}cm</text>
        </g>
      `;

      this.objectLayer.innerHTML = html;
    }

    renderImage(x0, y0, scale, optProps) {
      if (optProps.isAtFocus) {
        // Image at infinity
        this.imageLayer.innerHTML = `
          <g>
            <text x="${this.options.system === 'concave_mirror' ? 100 : this.options.width - 200}" 
                  y="${y0 - 50}" fill="#fbbf24" font-size="13" font-weight="800">
              ⚡ IMAGE AT INFINITY (PARALLEL RAYS)
            </text>
          </g>
        `;
        return;
      }

      const isMirror = this.options.system === 'concave_mirror';
      const imgX = isMirror
        ? x0 - optProps.v * scale
        : x0 + optProps.v * scale;
      const imgTipY = y0 - optProps.hi * scale;
      const isVirtual = optProps.isVirtual;
      const strokeColor = isVirtual ? '#ec4899' : '#22c55e';
      const headSize = Math.min(16, Math.max(7, Math.abs(optProps.hi * scale) * 0.25));

      let headPoints = '';
      if (optProps.hi >= 0) {
        // Upright arrow (pointing up)
        headPoints = `${imgX},${imgTipY - 4} ${imgX - headSize},${imgTipY + headSize} ${imgX + headSize},${imgTipY + headSize}`;
      } else {
        // Inverted arrow (pointing down)
        headPoints = `${imgX},${imgTipY + 4} ${imgX - headSize},${imgTipY - headSize} ${imgX + headSize},${imgTipY - headSize}`;
      }

      let html = `
        <g class="image-group" filter="${isVirtual ? 'url(#glow-pink)' : ''}">
          <!-- Stem line -->
          <line x1="${imgX}" y1="${y0}" x2="${imgX}" y2="${imgTipY}" 
                stroke="${strokeColor}" stroke-width="4.5" 
                stroke-dasharray="${isVirtual ? '6 4' : 'none'}" 
                stroke-linecap="round"/>
          <!-- Head -->
          <polygon points="${headPoints}" fill="${strokeColor}"/>

          <!-- Base marker -->
          <circle cx="${imgX}" cy="${y0}" r="3" fill="${strokeColor}"/>

          <!-- Labels -->
          <text x="${imgX}" y="${optProps.hi >= 0 ? imgTipY - 14 : imgTipY + 22}" 
                fill="${strokeColor}" font-size="11.5" font-weight="800" text-anchor="middle">
            ${isVirtual ? 'EXTERNAL VIRTUAL IMAGE' : 'EXTERNAL REAL IMAGE'}
          </text>
          <text x="${imgX}" y="${optProps.hi >= 0 ? imgTipY - 2 : imgTipY + 34}" 
                fill="#cbd5e1" font-size="9.5" font-weight="600" text-anchor="middle">
            v = ${Math.abs(optProps.v).toFixed(1)}cm | m = ${optProps.m.toFixed(2)}x
          </text>
        </g>
      `;

      this.imageLayer.innerHTML = html;
    }

    renderRays(x0, y0, scale, optProps, eyeProps) {
      if (!this.options.showPrincipalRays) {
        this.raysLayer.innerHTML = '';
        return;
      }

      const isMirror = this.options.system === 'concave_mirror';
      let html = '';

      if (isMirror) {
        const rays = window.OpticsEngine.computeMirrorRays(
          this.u, this.f, this.ho, optProps, scale, x0, y0
        );

        // Ray 1: Parallel to axis -> Reflects through focus F
        // Actual incident: objTip -> hit (x0, objTip.y)
        html += `
          <line x1="${rays.ray1.start.x}" y1="${rays.ray1.start.y}" x2="${rays.ray1.hit.x}" y2="${rays.ray1.hit.y}"
                stroke="#38bdf8" stroke-width="2" marker-mid="url(#arrow-cyan)"/>
        `;
        // Reflected ray passes through F
        if (optProps.isAtFocus) {
          // Parallel reflection
          html += `
            <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="-100" y2="${y0}"
                  stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow-cyan)"/>
          `;
        } else if (optProps.isVirtual) {
          // Diverging reflected ray: goes left (x < x0)
          const dx = rays.F.x - rays.ray1.hit.x;
          const dy = rays.F.y - rays.ray1.hit.y;
          const extX = -100;
          const extY = rays.ray1.hit.y + ((extX - rays.ray1.hit.x) / dx) * dy;
          html += `
            <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="${extX}" y2="${extY}"
                  stroke="#38bdf8" stroke-width="2" marker-mid="url(#arrow-cyan)"/>
          `;
          // Virtual dashed extension goes right to imgTip
          if (this.options.showVirtualExtensions && rays.imgTip) {
            html += `
              <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="${rays.imgTip.x}" y2="${rays.imgTip.y}"
                    stroke="#ec4899" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
            `;
          }
        } else {
          // Real image: reflected passes through F and imgTip
          const extX = Math.min(-50, rays.imgTip.x - 120);
          const slope = (rays.imgTip.y - rays.ray1.hit.y) / (rays.imgTip.x - rays.ray1.hit.x);
          const extY = rays.ray1.hit.y + slope * (extX - rays.ray1.hit.x);
          html += `
            <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="${extX}" y2="${extY}"
                  stroke="#38bdf8" stroke-width="2" marker-mid="url(#arrow-cyan)"/>
          `;
        }

        // Ray 2: Directed towards Focus F -> Reflects parallel to axis
        if (!optProps.isAtFocus) {
          html += `
            <line x1="${rays.ray2.start.x}" y1="${rays.ray2.start.y}" x2="${rays.ray2.hit.x}" y2="${rays.ray2.hit.y}"
                  stroke="#fbbf24" stroke-width="2" marker-mid="url(#arrow-amber)"/>
          `;
          // Reflected ray goes left parallel to axis at y = r2_hit.y
          html += `
            <line x1="${rays.ray2.hit.x}" y1="${rays.ray2.hit.y}" x2="-100" y2="${rays.ray2.hit.y}"
                  stroke="#fbbf24" stroke-width="2" marker-mid="url(#arrow-amber)"/>
          `;
          if (optProps.isVirtual && this.options.showVirtualExtensions && rays.imgTip) {
            html += `
              <line x1="${rays.ray2.hit.x}" y1="${rays.ray2.hit.y}" x2="${rays.imgTip.x}" y2="${rays.ray2.hit.y}"
                    stroke="#ec4899" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
            `;
          }
        }

        // Ray 3: Through Centre C -> Reflects back along itself
        if (Math.abs(this.u - 2 * this.f) > 0.5) {
          html += `
            <line x1="${rays.ray3.start.x}" y1="${rays.ray3.start.y}" x2="${rays.ray3.hit.x}" y2="${rays.ray3.hit.y}"
                  stroke="#34d399" stroke-width="1.8"/>
            <line x1="${rays.ray3.hit.x}" y1="${rays.ray3.hit.y}" x2="${rays.C.x - 60}" y2="${rays.C.y - 60 * rays.ray3.slope}"
                  stroke="#34d399" stroke-width="1.8" marker-mid="url(#arrow-emerald)"/>
          `;
          if (optProps.isVirtual && this.options.showVirtualExtensions && rays.imgTip) {
            html += `
              <line x1="${rays.ray3.hit.x}" y1="${rays.ray3.hit.y}" x2="${rays.imgTip.x}" y2="${rays.imgTip.y}"
                    stroke="#ec4899" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
            `;
          }
        }

        // Ray 4: Through Pole P (originX, originY)
        html += `
          <line x1="${rays.objTip.x}" y1="${rays.objTip.y}" x2="${x0}" y2="${y0}"
                stroke="#a855f7" stroke-width="1.6"/>
        `;
        const reflectedSlope4 = (y0 - rays.objTip.y) / (x0 - rays.objTip.x);
        const refl4_endX = -80;
        const refl4_endY = y0 + reflectedSlope4 * (refl4_endX - x0);
        html += `
          <line x1="${x0}" y1="${y0}" x2="${refl4_endX}" y2="${refl4_endY}"
                stroke="#a855f7" stroke-width="1.6"/>
        `;
        if (optProps.isVirtual && this.options.showVirtualExtensions && rays.imgTip) {
          html += `
            <line x1="${x0}" y1="${y0}" x2="${rays.imgTip.x}" y2="${rays.imgTip.y}"
                  stroke="#ec4899" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
          `;
        }
      } else {
        // Convex Lens Rays
        const rays = window.OpticsEngine.computeLensRays(
          this.u, this.f, this.ho, optProps, scale, x0, y0
        );

        // Ray 1: Parallel to axis -> Refracts through F2 (right focus)
        html += `
          <line x1="${rays.ray1.start.x}" y1="${rays.ray1.start.y}" x2="${rays.ray1.hit.x}" y2="${rays.ray1.hit.y}"
                stroke="#38bdf8" stroke-width="2" marker-mid="url(#arrow-cyan)"/>
        `;
        if (optProps.isAtFocus) {
          // Parallel refraction
          html += `
            <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="${this.options.width + 100}" y2="${rays.ray1.hit.y - 120}"
                  stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow-cyan)"/>
          `;
        } else if (optProps.isVirtual) {
          // Refracted ray diverges to right
          const dx = rays.F2.x - rays.ray1.hit.x;
          const dy = rays.F2.y - rays.ray1.hit.y;
          const extX = this.options.width + 100;
          const extY = rays.ray1.hit.y + ((extX - rays.ray1.hit.x) / dx) * dy;
          html += `
            <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="${extX}" y2="${extY}"
                  stroke="#38bdf8" stroke-width="2" marker-mid="url(#arrow-cyan)"/>
          `;
          // Virtual backward extension to imgTip (left side)
          if (this.options.showVirtualExtensions && rays.imgTip) {
            html += `
              <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="${rays.imgTip.x}" y2="${rays.imgTip.y}"
                    stroke="#ec4899" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
            `;
          }
        } else {
          // Real image: refracted ray passes through F2 and imgTip
          const extX = Math.max(this.options.width + 50, rays.imgTip.x + 120);
          const slope = (rays.imgTip.y - rays.ray1.hit.y) / (rays.imgTip.x - rays.ray1.hit.x);
          const extY = rays.ray1.hit.y + slope * (extX - rays.ray1.hit.x);
          html += `
            <line x1="${rays.ray1.hit.x}" y1="${rays.ray1.hit.y}" x2="${extX}" y2="${extY}"
                  stroke="#38bdf8" stroke-width="2" marker-mid="url(#arrow-cyan)"/>
          `;
        }

        // Ray 2: Through optical centre O (undeviated)
        if (optProps.isAtFocus) {
          html += `
            <line x1="${rays.ray2.start.x}" y1="${rays.ray2.start.y}" x2="${this.options.width + 100}" y2="${y0 + (y0 - rays.ray2.start.y)}"
                  stroke="#34d399" stroke-width="2" marker-mid="url(#arrow-emerald)"/>
          `;
        } else if (optProps.isVirtual) {
          const dx = x0 - rays.ray2.start.x;
          const dy = y0 - rays.ray2.start.y;
          const extX = this.options.width + 100;
          const extY = y0 + ((extX - x0) / dx) * dy;
          html += `
            <line x1="${rays.ray2.start.x}" y1="${rays.ray2.start.y}" x2="${extX}" y2="${extY}"
                  stroke="#34d399" stroke-width="2" marker-mid="url(#arrow-emerald)"/>
          `;
          if (this.options.showVirtualExtensions && rays.imgTip) {
            html += `
              <line x1="${x0}" y1="${y0}" x2="${rays.imgTip.x}" y2="${rays.imgTip.y}"
                    stroke="#ec4899" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
            `;
          }
        } else {
          const extX = Math.max(this.options.width + 50, rays.imgTip.x + 120);
          const slope = (rays.imgTip.y - y0) / (rays.imgTip.x - x0);
          const extY = y0 + slope * (extX - x0);
          html += `
            <line x1="${rays.ray2.start.x}" y1="${rays.ray2.start.y}" x2="${extX}" y2="${extY}"
                  stroke="#34d399" stroke-width="2" marker-mid="url(#arrow-emerald)"/>
          `;
        }

        // Ray 3: Through F1 -> Refracts parallel to axis
        if (!optProps.isAtFocus) {
          html += `
            <line x1="${rays.ray3.start.x}" y1="${rays.ray3.start.y}" x2="${rays.ray3.hit.x}" y2="${rays.ray3.hit.y}"
                  stroke="#fbbf24" stroke-width="2" marker-mid="url(#arrow-amber)"/>
            <line x1="${rays.ray3.hit.x}" y1="${rays.ray3.hit.y}" x2="${this.options.width + 100}" y2="${rays.ray3.hit.y}"
                  stroke="#fbbf24" stroke-width="2" marker-mid="url(#arrow-amber)"/>
          `;
          if (optProps.isVirtual && this.options.showVirtualExtensions && rays.imgTip) {
            html += `
              <line x1="${rays.ray3.hit.x}" y1="${rays.ray3.hit.y}" x2="${rays.imgTip.x}" y2="${rays.ray3.hit.y}"
                    stroke="#ec4899" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
            `;
          }
        }
      }

      this.raysLayer.innerHTML = html;
    }

    renderScreen(x0, y0, scale, optProps, screenProps) {
      if (!this.options.showScreen) {
        this.screenLayer.innerHTML = '';
        return;
      }

      const isMirror = this.options.system === 'concave_mirror';
      // Screen X in pixels:
      // For mirror: physical screen is in front of mirror (x = x0 - screenDist * scale)
      // For lens: screen is placed behind lens at x = x0 + screenDist * scale
      let screenX = isMirror
        ? x0 - this.screenDist * scale
        : x0 + this.screenDist * scale;

      const isGhost = screenProps.isGhostScreen;
      const screenH = 150;
      const screenW = 10;

      let html = `
        <g class="draggable-target" id="drag-screen" data-drag="screen">
          <!-- Hit area -->
          <rect x="${screenX - 12}" y="${y0 - screenH / 2}" width="24" height="${screenH}" fill="transparent"/>

          <!-- Screen Stand & Base -->
          <line x1="${screenX}" y1="${y0 + screenH / 2}" x2="${screenX}" y2="${y0 + screenH / 2 + 30}" stroke="#64748b" stroke-width="3"/>
          <ellipse cx="${screenX}" cy="${y0 + screenH / 2 + 30}" rx="14" ry="4" fill="#334155" stroke="#64748b" stroke-width="1.5"/>

          <!-- Screen Board -->
          <rect x="${screenX - screenW / 2}" y="${y0 - screenH / 2}" width="${screenW}" height="${screenH}"
                fill="${isGhost ? 'rgba(236, 72, 153, 0.15)' : '#1e293b'}"
                stroke="${isGhost ? '#ec4899' : (screenProps.isSharp ? '#22c55e' : '#f59e0b')}"
                stroke-width="2.5"
                stroke-dasharray="${isGhost ? '5 3' : 'none'}"
                rx="2"/>
      `;

      // If screen captures image
      if (screenProps.isSharp && screenProps.capturedImageHeight) {
        const projH = screenProps.capturedImageHeight * scale;
        const arrowDir = optProps.hi >= 0 ? -1 : 1; // 1 = down (inverted), -1 = up
        const projTipY = y0 + arrowDir * projH;

        html += `
          <!-- Sharp Projected Arrow on Screen Surface -->
          <line x1="${screenX}" y1="${y0}" x2="${screenX}" y2="${projTipY}"
                stroke="#22c55e" stroke-width="4" stroke-linecap="round"/>
          <polygon points="${screenX},${projTipY + arrowDir * 4} ${screenX - 5},${projTipY - arrowDir * 6} ${screenX + 5},${projTipY - arrowDir * 6}"
                   fill="#22c55e"/>
          <text x="${screenX}" y="${y0 - screenH / 2 - 16}" fill="#4ade80" font-size="10.5" font-weight="800" text-anchor="middle">
            SHARP IMAGE CAPTURED!
          </text>
        `;
      } else if (!isGhost && !optProps.isAtFocus) {
        // Blurred circle of confusion
        const blurR = Math.min(24, Math.max(5, screenProps.blurRadius));
        html += `
          <circle cx="${screenX}" cy="${y0}" r="${blurR}" fill="#f59e0b" opacity="0.35"/>
          <text x="${screenX}" y="${y0 - screenH / 2 - 16}" fill="#fbbf24" font-size="10" font-weight="700" text-anchor="middle">
            DEFOCUSED (BLURRED)
          </text>
        `;
      } else if (isGhost) {
        html += `
          <text x="${screenX}" y="${y0 - screenH / 2 - 16}" fill="#f472b6" font-size="10" font-weight="800" text-anchor="middle">
            CONCEPTUAL GHOST SCREEN
          </text>
          <text x="${screenX}" y="${y0 - screenH / 2 - 4}" fill="#fbcfe8" font-size="8.5" text-anchor="middle">
            NO LIGHT CONVERGES HERE
          </text>
        `;
      }

      // Position tag
      html += `
          <text x="${screenX}" y="${y0 + screenH / 2 + 44}" fill="#cbd5e1" font-size="10" font-weight="700" text-anchor="middle">
            SCREEN: ${this.screenDist.toFixed(1)}cm
          </text>
        </g>
      `;

      this.screenLayer.innerHTML = html;
    }

    renderEye(x0, y0, scale, optProps, eyeProps) {
      const isMirror = this.options.system === 'concave_mirror';
      const eyeX = this.eyePos.x;
      const eyeY = this.eyePos.y;
      const eyeRadius = 26;

      // The eye orientation:
      // For mirror: looks right towards the mirror (+x direction)
      // For lens: looks left towards the lens (-x direction)
      const lookDir = isMirror ? 1 : -1;

      let html = `
        <g class="draggable-target" id="drag-eye" data-drag="eye">
          <!-- Hit area -->
          <circle cx="${eyeX}" cy="${eyeY}" r="38" fill="transparent"/>

          <!-- Eyeball body (Sclera) -->
          <circle cx="${eyeX}" cy="${eyeY}" r="${eyeRadius}" fill="#0f172a" stroke="#cbd5e1" stroke-width="2.5"/>

          <!-- Retina curve (rear wall inside eyeball) -->
          <path d="M ${eyeX - lookDir * 16} ${eyeY - 20} A ${eyeRadius} ${eyeRadius} 0 0 ${lookDir > 0 ? 0 : 1} ${eyeX - lookDir * 16} ${eyeY + 20}"
                stroke="#f97316" stroke-width="3" fill="none"/>

          <!-- Cornea bulge -->
          <path d="M ${eyeX + lookDir * 20} ${eyeY - 14} Q ${eyeX + lookDir * 32} ${eyeY} ${eyeX + lookDir * 20} ${eyeY + 14}"
                stroke="#38bdf8" stroke-width="2.5" fill="rgba(56, 189, 248, 0.25)"/>

          <!-- Iris / Pupil aperture -->
          <line x1="${eyeX + lookDir * 18}" y1="${eyeY - 14}" x2="${eyeX + lookDir * 18}" y2="${eyeY - 5}" stroke="#475569" stroke-width="3"/>
          <line x1="${eyeX + lookDir * 18}" y1="${eyeY + 5}" x2="${eyeX + lookDir * 18}" y2="${eyeY + 14}" stroke="#475569" stroke-width="3"/>

          <!-- Crystalline Eye Lens -->
          <ellipse cx="${eyeX + lookDir * 10}" cy="${eyeY}" rx="3.5" ry="12" fill="#e2e8f0" stroke="#38bdf8" stroke-width="1.5"/>

          <!-- Eye Drag Handle ring -->
          <circle cx="${eyeX}" cy="${eyeY}" r="4" fill="#38bdf8" opacity="0.6"/>

          <!-- Eye Label -->
          <text x="${eyeX}" y="${eyeY - eyeRadius - 10}" fill="#e2e8f0" font-size="11" font-weight="700" text-anchor="middle">
            OBSERVER'S EYE
          </text>
      `;

      // Retinal Image & Internal Ray Tracing if light reaches eye
      if (eyeProps.lightReachesEye) {
        const pupilX = eyeProps.pupil.x;
        const pupilY = eyeProps.pupil.y;
        const retinaX = eyeProps.retinaX;
        const retH = eyeProps.retinalHeight;
        // Human eye forms an INVERTED real image on the retina!
        const arrowDir = optProps.isUpright ? 1 : -1; // 1 = down, -1 = up
        const retTipY = eyeY + arrowDir * retH;

        html += `
          <!-- Retinal Inverted Real Image -->
          <g filter="${eyeProps.isInFocus ? '' : 'blur(1.5px)'}">
            <line x1="${retinaX}" y1="${eyeY}" x2="${retinaX}" y2="${retTipY}"
                  stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
            <polygon points="${retinaX},${retTipY + arrowDir * 3} ${retinaX - 3},${retTipY - arrowDir * 4} ${retinaX + 3},${retTipY - arrowDir * 4}"
                     fill="#f97316"/>
          </g>
          <text x="${eyeX}" y="${eyeY + eyeRadius + 16}" fill="#f97316" font-size="9" font-weight="800" text-anchor="middle">
            REAL RETINAL IMAGE
          </text>

          <!-- Light rays refracted inside eyeball from pupil to retina -->
          <path d="M ${pupilX} ${pupilY - 4} L ${eyeProps.eyeLensX} ${eyeY - 6} L ${retinaX} ${retTipY}"
                stroke="#fbbf24" stroke-width="1.4" opacity="0.85"/>
          <path d="M ${pupilX} ${pupilY + 4} L ${eyeProps.eyeLensX} ${eyeY + 6} L ${retinaX} ${retTipY}"
                stroke="#fbbf24" stroke-width="1.4" opacity="0.85"/>
        `;

        // Rays entering pupil from optical component (mirror or lens)
        if (this.options.showEyeCone && eyeProps.rayInterception) {
          html += `
            <!-- Light cone entering pupil -->
            <polygon points="${eyeProps.rayInterception.x},${eyeProps.rayInterception.y - 12} 
                             ${eyeProps.rayInterception.x},${eyeProps.rayInterception.y + 12} 
                             ${pupilX},${pupilY + 4} 
                             ${pupilX},${pupilY - 4}"
                     fill="rgba(129, 140, 248, 0.18)" stroke="#818cf8" stroke-width="1" stroke-dasharray="3 2"/>
            <line x1="${eyeProps.rayInterception.x}" y1="${eyeProps.rayInterception.y}" x2="${pupilX}" y2="${pupilY}"
                  stroke="#818cf8" stroke-width="1.8" marker-mid="url(#arrow-dim)"/>
          `;
        }
      } else {
        html += `
          <text x="${eyeX}" y="${eyeY + eyeRadius + 16}" fill="#f59e0b" font-size="8.5" font-weight="700" text-anchor="middle">
            NO RAYS ENTER PUPIL
          </text>
        `;
      }

      html += `</g>`;
      this.eyeLayer.innerHTML = html;
    }

    renderDimensions(x0, y0, scale, optProps) {
      const dimY = y0 + 175;
      const isMirror = this.options.system === 'concave_mirror';
      const objX = x0 - this.u * scale;
      let html = '';

      // Dimension for Object Distance u
      html += `
        <g class="dim-group">
          <!-- Guide lines down from object and optical centre -->
          <line x1="${objX}" y1="${y0}" x2="${objX}" y2="${dimY + 8}" stroke="#475569" stroke-width="1" stroke-dasharray="3 3"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${dimY + 8}" stroke="#475569" stroke-width="1" stroke-dasharray="3 3"/>
          <!-- Dimension horizontal double-arrow line -->
          <line x1="${objX}" y1="${dimY}" x2="${x0}" y2="${dimY}" stroke="#38bdf8" stroke-width="1.5"
                marker-start="url(#arrow-cyan)" marker-end="url(#arrow-cyan)"/>
          <rect x="${(objX + x0) / 2 - 28}" y="${dimY - 9}" width="56" height="18" fill="#0f172a" rx="3"/>
          <text x="${(objX + x0) / 2}" y="${dimY + 4}" fill="#38bdf8" font-size="10" font-weight="700" text-anchor="middle">
            u = ${this.u.toFixed(1)}cm
          </text>
        </g>
      `;

      // Dimension for Focal Length f
      const fPx = optProps.f * scale;
      const fDimY = y0 + 145;
      const fPointX = x0 - fPx;

      html += `
        <g class="dim-group">
          <line x1="${fPointX}" y1="${y0}" x2="${fPointX}" y2="${fDimY + 8}" stroke="#475569" stroke-width="1" stroke-dasharray="3 3"/>
          <line x1="${fPointX}" y1="${fDimY}" x2="${x0}" y2="${fDimY}" stroke="#fbbf24" stroke-width="1.5"
                marker-start="url(#arrow-amber)" marker-end="url(#arrow-amber)"/>
          <rect x="${(fPointX + x0) / 2 - 24}" y="${fDimY - 9}" width="48" height="18" fill="#0f172a" rx="3"/>
          <text x="${(fPointX + x0) / 2}" y="${fDimY + 4}" fill="#fbbf24" font-size="10" font-weight="700" text-anchor="middle">
            f = ${optProps.f.toFixed(1)}cm
          </text>
        </g>
      `;

      // Dimension for Image Distance v if finite
      if (!optProps.isAtFocus) {
        const imgX = isMirror
          ? x0 - optProps.v * scale
          : x0 + optProps.v * scale;
        const vDimY = y0 + 205;
        const minX = Math.min(imgX, x0);
        const maxX = Math.max(imgX, x0);

        html += `
          <g class="dim-group">
            <line x1="${imgX}" y1="${y0}" x2="${imgX}" y2="${vDimY + 8}" stroke="#475569" stroke-width="1" stroke-dasharray="3 3"/>
            <line x1="${minX}" y1="${vDimY}" x2="${maxX}" y2="${vDimY}" 
                  stroke="${optProps.isVirtual ? '#ec4899' : '#22c55e'}" stroke-width="1.5"
                  marker-start="url(#arrow-dim)" marker-end="url(#arrow-dim)"/>
            <rect x="${(minX + maxX) / 2 - 32}" y="${vDimY - 9}" width="64" height="18" fill="#0f172a" rx="3"/>
            <text x="${(minX + maxX) / 2}" y="${vDimY + 4}" 
                  fill="${optProps.isVirtual ? '#ec4899' : '#22c55e'}" font-size="10" font-weight="700" text-anchor="middle">
              v = ${Math.abs(optProps.v).toFixed(1)}cm
            </text>
          </g>
        `;
      }

      this.dimensionsLayer.innerHTML = html;
    }

    /**
     * Mouse & Touch Drag Handling for Direct Manipulation
     */
    bindEvents() {
      const getSvgCoords = (e) => {
        const pt = this.svg.createSVGPoint();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        pt.x = clientX;
        pt.y = clientY;
        const ctm = this.svg.getScreenCTM();
        return pt.matrixTransform(ctm.inverse());
      };

      const onPointerDown = (e) => {
        const target = e.target.closest('[data-drag]');
        if (!target) return;

        const dragType = target.getAttribute('data-drag');
        const coords = getSvgCoords(e);

        this.activeDrag = dragType;
        this.dragStart = coords;

        if (dragType === 'object') {
          this.initialDragVal = { u: this.u, ho: this.ho };
        } else if (dragType === 'screen') {
          this.initialDragVal = { screenDist: this.screenDist };
        } else if (dragType === 'eye') {
          this.initialDragVal = { x: this.eyePos.x, y: this.eyePos.y };
        }

        e.preventDefault();
      };

      const onPointerMove = (e) => {
        if (!this.activeDrag) return;

        const coords = getSvgCoords(e);
        const dx = coords.x - this.dragStart.x;
        const dy = coords.y - this.dragStart.y;
        const scale = this.options.scale * this.options.zoom;
        const isMirror = this.options.system === 'concave_mirror';

        if (this.activeDrag === 'object') {
          // Object moves along x (distance u = (x0 - coords.x) / scale)
          // and y (height ho = (y0 - coords.y) / scale)
          const { x0, y0 } = this.getOrigin();
          const newU = (x0 - coords.x) / scale;
          const newHo = (y0 - coords.y) / scale;

          this.u = Math.max(2.0, Math.min(75.0, newU));
          if (newHo > 2.0 && newHo < 30.0) {
            this.ho = newHo;
          }
        } else if (this.activeDrag === 'screen') {
          const { x0 } = this.getOrigin();
          let newDist = isMirror
            ? (x0 - coords.x) / scale
            : (coords.x - x0) / scale;
          this.screenDist = Math.max(2.0, Math.min(80.0, newDist));
        } else if (this.activeDrag === 'eye') {
          this.eyePos = {
            x: Math.max(20, Math.min(this.options.width - 20, this.initialDragVal.x + dx)),
            y: Math.max(60, Math.min(this.options.height - 60, this.initialDragVal.y + dy))
          };
        }

        this.render();

        if (typeof this.options.onUpdate === 'function') {
          this.options.onUpdate({
            u: this.u,
            ho: this.ho,
            screenDist: this.screenDist,
            eyePos: this.eyePos
          });
        }

        e.preventDefault();
      };

      const onPointerUp = () => {
        this.activeDrag = null;
      };

      // Mouse events
      this.svg.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      // Touch events for mobile/tablet
      this.svg.addEventListener('touchstart', onPointerDown, { passive: false });
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }
  }

  window.OpticsCanvas = OpticsCanvas;
})(window);
