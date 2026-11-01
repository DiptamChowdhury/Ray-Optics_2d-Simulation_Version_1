/**
 * MIRROR & LENS LAB — Optical Mathematics & Physics Calculation Engine
 * 
 * Implements paraxial optics for:
 * 1. Concave Spherical Mirror (Reflection)
 * 2. Convex Thin Lens (Refraction)
 * 3. Human Eye Optical System & Retinal Imaging
 * 4. Screen Projection & Diffuse Blur Modeling
 * 
 * Sign Convention:
 * - Real-is-positive convention internally and externally.
 * - Object distance u > 0 for real objects.
 * - Focal length f > 0 for concave mirror and convex lens.
 * - Image distance v > 0 for real images; v < 0 for virtual images.
 * - Magnification m = -v / u:
 *     m > 0: upright image (virtual)
 *     m < 0: inverted image (real)
 *     |m| > 1: enlarged
 *     |m| = 1: same size
 *     |m| < 1: diminished
 */

(function (window) {
  'use strict';

  const OpticsEngine = {
    // Tolerances and limits
    EPSILON: 0.1, // cm tolerance around focal point u = f
    MAX_IMAGE_DISTANCE: 2500, // cm clamping for numerical stability

    /**
     * Compute optics for a Concave Mirror
     * @param {number} u - Object distance in cm (u > 0)
     * @param {number} f - Focal length in cm (f > 0)
     * @param {number} ho - Object height in cm (ho > 0)
     * @returns {Object} Image properties and classification
     */
    computeConcaveMirror: function (u, f, ho) {
      const R = 2 * f; // Radius of curvature
      const diff = u - f;
      const isAtFocus = Math.abs(diff) < this.EPSILON;

      if (isAtFocus) {
        return {
          system: 'concave_mirror',
          u: u,
          f: f,
          R: R,
          ho: ho,
          isAtFocus: true,
          v: Infinity,
          m: Infinity,
          hi: Infinity,
          isReal: false,
          isVirtual: false,
          isUpright: null,
          caseName: 'CASE D: Object at Focal Point F (u = f)',
          description: 'Reflected paraxial rays emerge parallel. Image forms at infinity.',
          screenStatus: 'Rays are parallel; no finite image forms on a screen.'
        };
      }

      // 1/f = 1/u + 1/v  =>  v = (f * u) / (u - f)
      let v = (f * u) / diff;
      v = Math.max(-this.MAX_IMAGE_DISTANCE, Math.min(this.MAX_IMAGE_DISTANCE, v));

      // Magnification m = -v / u = f / (f - u)
      const m = -v / u;
      const hi = m * ho;
      const isReal = v > 0;
      const isVirtual = v < 0;
      const isUpright = m > 0;
      const absM = Math.abs(m);

      let sizeDesc = 'Same Size';
      if (Math.abs(absM - 1.0) > 0.03) {
        sizeDesc = absM > 1.0 ? 'Enlarged' : 'Diminished';
      }

      let caseName = '';
      let description = '';
      let locationDesc = '';

      if (isVirtual) {
        caseName = 'CASE E: Object inside Focal Length (u < f)';
        description = 'An enlarged, upright virtual image is formed behind the mirror. Reflected rays diverge, and their backward extensions meet behind the mirror.';
        locationDesc = `${Math.abs(v).toFixed(1)} cm behind mirror (virtual)`;
      } else if (Math.abs(u - R) < 0.2) {
        caseName = 'CASE B: Object at Centre of Curvature C (u = 2f)';
        description = 'A real, inverted image of the exact same size forms at the centre of curvature C.';
        locationDesc = `At C (${v.toFixed(1)} cm in front of mirror)`;
      } else if (u > R) {
        caseName = 'CASE A: Object beyond Centre of Curvature C (u > 2f)';
        description = 'A real, inverted, diminished image forms between F and C in front of the mirror.';
        locationDesc = `Between F and C (${v.toFixed(1)} cm in front of mirror)`;
      } else {
        caseName = 'CASE C: Object between F and C (f < u < 2f)';
        description = 'A real, inverted, enlarged image forms beyond C in front of the mirror.';
        locationDesc = `Beyond C (${v.toFixed(1)} cm in front of mirror)`;
      }

      return {
        system: 'concave_mirror',
        u: u,
        f: f,
        R: R,
        ho: ho,
        isAtFocus: false,
        v: v,
        m: m,
        hi: hi,
        isReal: isReal,
        isVirtual: isVirtual,
        isUpright: isUpright,
        absM: absM,
        sizeDesc: sizeDesc,
        caseName: caseName,
        description: description,
        locationDesc: locationDesc,
        screenStatus: isReal
          ? `Real image can be captured sharply on a screen at ${v.toFixed(1)} cm in front of mirror.`
          : 'Virtual image cannot be captured sharply on a screen (rays do not converge there).'
      };
    },

    /**
     * Compute optics for a Convex Thin Lens
     * @param {number} u - Object distance in cm (u > 0)
     * @param {number} f - Focal length in cm (f > 0)
     * @param {number} ho - Object height in cm (ho > 0)
     * @returns {Object} Image properties and classification
     */
    computeConvexLens: function (u, f, ho) {
      const diff = u - f;
      const isAtFocus = Math.abs(diff) < this.EPSILON;

      if (isAtFocus) {
        return {
          system: 'convex_lens',
          u: u,
          f: f,
          R: null,
          ho: ho,
          isAtFocus: true,
          v: Infinity,
          m: Infinity,
          hi: Infinity,
          isReal: false,
          isVirtual: false,
          isUpright: null,
          caseName: 'CASE D: Object at First Focus F1 (u = f)',
          description: 'Refracted paraxial rays emerge parallel. Image forms at infinity.',
          screenStatus: 'Refracted rays are parallel; no finite image forms on a screen.'
        };
      }

      // 1/f = 1/u + 1/v  =>  v = (f * u) / (u - f)
      let v = (f * u) / diff;
      v = Math.max(-this.MAX_IMAGE_DISTANCE, Math.min(this.MAX_IMAGE_DISTANCE, v));

      // Magnification m = -v / u = f / (f - u)
      const m = -v / u;
      const hi = m * ho;
      const isReal = v > 0;
      const isVirtual = v < 0;
      const isUpright = m > 0;
      const absM = Math.abs(m);

      let sizeDesc = 'Same Size';
      if (Math.abs(absM - 1.0) > 0.03) {
        sizeDesc = absM > 1.0 ? 'Enlarged' : 'Diminished';
      }

      let caseName = '';
      let description = '';
      let locationDesc = '';

      if (isVirtual) {
        caseName = 'CASE E: Object inside Focal Length (u < f)';
        description = 'An enlarged, upright virtual image is formed on the same side of the lens as the object. Refracted rays diverge, and their backward extensions meet on the object side.';
        locationDesc = `${Math.abs(v).toFixed(1)} cm on object side (virtual)`;
      } else if (Math.abs(u - 2 * f) < 0.2) {
        caseName = 'CASE B: Object at 2F1 (u = 2f)';
        description = 'A real, inverted image of the exact same size forms at 2F2 on the opposite side of the lens.';
        locationDesc = `At 2F2 (${v.toFixed(1)} cm behind lens)`;
      } else if (u > 2 * f) {
        caseName = 'CASE A: Object beyond 2F1 (u > 2f)';
        description = 'A real, inverted, diminished image forms between F2 and 2F2 on the opposite side of the lens.';
        locationDesc = `Between F2 and 2F2 (${v.toFixed(1)} cm behind lens)`;
      } else {
        caseName = 'CASE C: Object between F1 and 2F1 (f < u < 2f)';
        description = 'A real, inverted, enlarged image forms beyond 2F2 on the opposite side of the lens.';
        locationDesc = `Beyond 2F2 (${v.toFixed(1)} cm behind lens)`;
      }

      return {
        system: 'convex_lens',
        u: u,
        f: f,
        R: null,
        ho: ho,
        isAtFocus: false,
        v: v,
        m: m,
        hi: hi,
        isReal: isReal,
        isVirtual: isVirtual,
        isUpright: isUpright,
        absM: absM,
        sizeDesc: sizeDesc,
        caseName: caseName,
        description: description,
        locationDesc: locationDesc,
        screenStatus: isReal
          ? `Real image can be captured sharply on a screen at ${v.toFixed(1)} cm on the opposite side of the lens.`
          : 'Virtual image cannot be captured sharply on a screen (rays do not converge there).'
      };
    },

    /**
     * Compute paraxial rays for Concave Mirror
     * Returns geometry points for:
     * - Ray 1: Parallel to axis, reflects through focus F
     * - Ray 2: Directed towards/through focus F, reflects parallel to axis
     * - Ray 3: Directed through centre of curvature C, reflects back on itself
     * - Ray 4: Directed to Pole P, reflects with equal angle
     * Plus dashed virtual extensions for virtual image or continuation past focus for real image.
     */
    computeMirrorRays: function (u, f, ho, optProps, canvasScale, originX, originY) {
      // Coordinates in pixels
      // Mirror pole is at (originX, originY)
      // Mirror reflective face points LEFT (x < originX is in front of mirror)
      const P = { x: originX, y: originY };
      const F = { x: originX - f * canvasScale, y: originY };
      const C = { x: originX - 2 * f * canvasScale, y: originY };
      const objTip = { x: originX - u * canvasScale, y: originY - ho * canvasScale };
      const objBase = { x: originX - u * canvasScale, y: originY };

      let imgTip = null;
      let imgBase = null;

      if (!optProps.isAtFocus) {
        // v is in front of mirror if positive (x = originX - v * scale), or behind if negative (x = originX - v * scale)
        const imgX = originX - optProps.v * canvasScale;
        const imgY = originY - optProps.hi * canvasScale;
        imgTip = { x: imgX, y: imgY };
        imgBase = { x: imgX, y: originY };
      }

      // Paraxial mirror aperture height in pixels
      const mirrorHeightPx = 140;

      // Ray 1: Parallel to principal axis -> hits mirror at (originX, objTip.y) -> reflects through F
      const r1_hit = { x: originX, y: objTip.y };
      // Ray 1 reflected line passes through r1_hit and F
      const dx1 = F.x - r1_hit.x;
      const dy1 = F.y - r1_hit.y;
      const slope1 = dy1 / (dx1 || 0.001);

      // Ray 2: Directed through F -> hits mirror at (originX, imgTip ? imgTip.y : (originY - 2*ho*canvasScale))
      // Mathematically: line from objTip through F hits x = originX at y = originY - optProps.hi * canvasScale
      let r2_hitY = originY - (optProps.isAtFocus ? (originY - ho * canvasScale) : optProps.hi * canvasScale);
      // Clamp hit within reasonable mirror aperture for visual neatness
      r2_hitY = Math.max(originY - mirrorHeightPx, Math.min(originY + mirrorHeightPx, r2_hitY));
      const r2_hit = { x: originX, y: r2_hitY };

      // Ray 3: Through C -> passes through C and hits mirror
      // Line from objTip through C hits mirror at x = originX
      const dx3 = C.x - objTip.x;
      const dy3 = C.y - objTip.y;
      const slope3 = dy3 / (dx3 || 0.001);
      const r3_hitY = objTip.y + slope3 * (originX - objTip.x);
      const r3_hit = { x: originX, y: Math.max(originY - mirrorHeightPx, Math.min(originY + mirrorHeightPx, r3_hitY)) };

      // Ray 4: Through Pole P (originX, originY) -> angle of reflection = angle of incidence
      const r4_hit = { x: originX, y: originY };

      return {
        P: P,
        F: F,
        C: C,
        objTip: objTip,
        objBase: objBase,
        imgTip: imgTip,
        imgBase: imgBase,
        ray1: {
          start: objTip,
          hit: r1_hit,
          slopeReflected: slope1,
          throughF: F
        },
        ray2: {
          start: objTip,
          hit: r2_hit,
          throughF: F
        },
        ray3: {
          start: objTip,
          hit: r3_hit,
          throughC: C,
          slope: slope3
        },
        ray4: {
          start: objTip,
          hit: r4_hit
        }
      };
    },

    /**
     * Compute paraxial rays for Convex Lens
     * Returns geometry points for:
     * - Ray 1: Parallel to axis, refracts through F2 (right focus)
     * - Ray 2: Through optical centre O, continues undeviated
     * - Ray 3: Through F1 (left focus), refracts parallel to axis
     */
    computeLensRays: function (u, f, ho, optProps, canvasScale, originX, originY) {
      const O = { x: originX, y: originY };
      const F1 = { x: originX - f * canvasScale, y: originY };
      const F2 = { x: originX + f * canvasScale, y: originY };
      const twoF1 = { x: originX - 2 * f * canvasScale, y: originY };
      const twoF2 = { x: originX + 2 * f * canvasScale, y: originY };
      const objTip = { x: originX - u * canvasScale, y: originY - ho * canvasScale };
      const objBase = { x: originX - u * canvasScale, y: originY };

      let imgTip = null;
      let imgBase = null;

      if (!optProps.isAtFocus) {
        // For lens: Real image is on right (originX + v * scale), Virtual image is on left (originX + v * scale with v < 0)
        const imgX = originX + optProps.v * canvasScale;
        const imgY = originY - optProps.hi * canvasScale;
        imgTip = { x: imgX, y: imgY };
        imgBase = { x: imgX, y: originY };
      }

      // Ray 1: Parallel to axis hits lens plane at (originX, objTip.y)
      const r1_hit = { x: originX, y: objTip.y };

      // Ray 2: Through optical centre O (originX, originY)
      const r2_hit = { x: originX, y: originY };

      // Ray 3: Directed through F1 hits lens plane at y = originY - optProps.hi * canvasScale
      let r3_hitY = originY - (optProps.isAtFocus ? (originY - ho * canvasScale) : optProps.hi * canvasScale);
      const lensHeightPx = 140;
      r3_hitY = Math.max(originY - lensHeightPx, Math.min(originY + lensHeightPx, r3_hitY));
      const r3_hit = { x: originX, y: r3_hitY };

      return {
        O: O,
        F1: F1,
        F2: F2,
        twoF1: twoF1,
        twoF2: twoF2,
        objTip: objTip,
        objBase: objBase,
        imgTip: imgTip,
        imgBase: imgBase,
        ray1: {
          start: objTip,
          hit: r1_hit,
          throughF2: F2
        },
        ray2: {
          start: objTip,
          hit: r2_hit
        },
        ray3: {
          start: objTip,
          hit: r3_hit,
          throughF1: F1
        }
      };
    },

    /**
     * Compute Observer Eye light reception and retinal image
     * 
     * Determines whether light from the object (via the mirror or lens)
     * enters the observer's pupil, and calculates the resulting real, inverted
     * retinal image formed on the eye's retina.
     * 
     * @param {Object} optProps - External optical properties from computeConcaveMirror/computeConvexLens
     * @param {Object} eyePos - { x, y } in canvas pixels
     * @param {number} accommodation - Eye focus diopter power factor (0.8 to 1.2, default 1.0)
     * @param {Object} sysContext - { system, originX, originY, scale }
     */
    computeEyeOptics: function (optProps, eyePos, accommodation, sysContext) {
      const { system, originX, originY, scale } = sysContext;
      const isMirror = system === 'concave_mirror';

      // Eye pupil position (front of eye)
      // For mirror: observer looks towards the mirror (+x direction), pupil is on the left edge of eye
      // For lens: observer is on the right looking towards lens (-x direction), pupil is on left edge of eye
      const pupilOffset = isMirror ? 26 : -26;
      const pupil = {
        x: eyePos.x + pupilOffset,
        y: eyePos.y
      };

      // Pupil aperture size in pixels
      const pupilRadius = 7;

      // Effective source of rays entering the eye:
      // If external image is virtual, rays diverge as if coming from the external virtual image (imgTip)
      // If external image is real, rays converge at real image and then diverge past it
      // If at focus, rays are parallel
      let apparentSource = null;
      let lightReachesEye = false;
      let angleAlignment = false;
      let rayInterception = null;

      if (optProps.isAtFocus) {
        // Parallel rays emerge
        // For mirror: reflected rays travel left (x < originX)
        // For lens: refracted rays travel right (x > originX)
        if (isMirror) {
          lightReachesEye = eyePos.x < originX - 30 && Math.abs(eyePos.y - originY) < 120;
        } else {
          lightReachesEye = eyePos.x > originX + 30 && Math.abs(eyePos.y - originY) < 120;
        }
        apparentSource = {
          x: isMirror ? -9999 : 9999,
          y: originY
        };
      } else {
        const imgX = isMirror
          ? originX - optProps.v * scale
          : originX + optProps.v * scale;
        const imgY = originY - optProps.hi * scale;
        apparentSource = { x: imgX, y: imgY };

        if (isMirror) {
          // Observer must be in front of mirror (x < originX)
          const inFront = eyePos.x < originX - 20;

          if (optProps.isVirtual) {
            // Virtual image is behind mirror (imgX > originX).
            // Line from apparentSource (imgTip) to pupil crosses mirror plane at x = originX.
            // Check if that line crosses within mirror physical aperture.
            const dx = pupil.x - apparentSource.x;
            const dy = pupil.y - apparentSource.y;
            if (Math.abs(dx) > 1) {
              const t = (originX - apparentSource.x) / dx;
              const yCross = apparentSource.y + t * dy;
              const mirrorAperture = 120; // px
              const hitsMirror = Math.abs(yCross - originY) <= mirrorAperture;
              // Observer must be facing mirror and in the reflected cone
              lightReachesEye = inFront && hitsMirror && t >= 0 && t <= 1;
              rayInterception = { x: originX, y: yCross };
            }
          } else {
            // Real image is in front of mirror (imgX < originX).
            // Rays converge at real image, then diverge towards x < imgX.
            // Or if eye is between mirror and real image, eye intercepts converging cone.
            const dx = pupil.x - originX;
            const dy = pupil.y - originY;
            lightReachesEye = inFront && (eyePos.x < imgX || eyePos.x > imgX - 350) && Math.abs(dy) < 130;
            rayInterception = { x: originX, y: originY - optProps.hi * 0.5 * scale };
          }
        } else {
          // Convex lens: Observer must be behind lens (x > originX)
          const behindLens = eyePos.x > originX + 20;

          if (optProps.isVirtual) {
            // Virtual image is on object side (left of lens, imgX < originX).
            // Line from virtual image to pupil crosses lens plane at x = originX.
            const dx = pupil.x - apparentSource.x;
            const dy = pupil.y - apparentSource.y;
            if (Math.abs(dx) > 1) {
              const t = (originX - apparentSource.x) / dx;
              const yCross = apparentSource.y + t * dy;
              const lensAperture = 120; // px
              const hitsLens = Math.abs(yCross - originY) <= lensAperture;
              lightReachesEye = behindLens && hitsLens && t >= 0 && t <= 1;
              rayInterception = { x: originX, y: yCross };
            }
          } else {
            // Real image is on right of lens (imgX > originX).
            // Eye can see it if placed beyond the image plane (x > imgX) looking back towards lens.
            const dx = pupil.x - imgX;
            const dy = pupil.y - imgY;
            lightReachesEye = behindLens && eyePos.x > imgX + 20 && Math.abs(pupil.y - originY) < 140;
            rayInterception = { x: originX, y: originY - optProps.hi * 0.5 * scale };
          }
        }
      }

      // Retinal Image Calculation:
      // The eye's cornea and crystalline lens refract incoming rays to form an image on the retina.
      // Eye anatomy (cross-section):
      // Eyeball diameter approx 50 px.
      // Lens center at eyePos.x + (isMirror ? 12 : -12).
      // Retina at back wall: eyePos.x + (isMirror ? -22 : 22).
      // Standard human eye produces a REAL, INVERTED image on the retina!
      // Inversion is opposite to whatever orientation entered the pupil.
      // If external image is upright (m > 0), retinal image is inverted!
      // If external image is inverted (m < 0), retinal image is upright relative to axis (inverted relative to viewed image)!
      
      const eyeLensX = eyePos.x + (isMirror ? 10 : -10);
      const retinaX = eyePos.x + (isMirror ? -22 : 22);

      // Distance from apparent source to eye
      const distToEye = Math.abs(pupil.x - (apparentSource ? apparentSource.x : originX));
      
      // Ideal accommodation factor for this distance
      // When accommodation == 1.0, eye focuses sharply on retina
      const focusError = Math.abs(accommodation - 1.0);
      const isInFocus = focusError < 0.08;
      const blurRadius = focusError * 8.0; // px blur

      // Retinal image height (scaled proportionally to visual angle subtended at pupil)
      // theta = ho / u or hi / v
      let retinalHeight = 16;
      if (apparentSource && distToEye > 10) {
        const visualAngle = Math.abs(optProps.hi * scale) / distToEye;
        retinalHeight = Math.max(8, Math.min(30, visualAngle * 35));
      }

      // Retinal image orientation: Inverted relative to what enters the eye
      // For upright external virtual image, retinal image points opposite!
      const retinalOrientation = optProps.isUpright ? 'Inverted (Arrow points down)' : 'Upright (Arrow points up)';

      return {
        pupil: pupil,
        eyeLensX: eyeLensX,
        retinaX: retinaX,
        lightReachesEye: lightReachesEye,
        isInFocus: isInFocus,
        accommodation: accommodation,
        blurRadius: blurRadius,
        retinalHeight: retinalHeight,
        retinalOrientation: retinalOrientation,
        apparentSource: apparentSource,
        rayInterception: rayInterception,
        visibilityText: lightReachesEye
          ? 'LIGHT REACHES THE EYE — IMAGE VISIBLE'
          : 'THE REQUIRED RAYS DO NOT REACH THE EYE',
        focusText: isInFocus
          ? 'IMAGE IN FOCUS (Crisp Retinal Image)'
          : 'IMAGE OUT OF FOCUS (Accommodation Mismatch)'
      };
    },

    /**
     * Compute physical / conceptual screen behavior
     * 
     * Distinguishes:
     * - Real Image: Converging paraxial rays intersect at image plane v.
     *   A physical screen placed at s = v captures a crisp, projected image.
     *   Displaced screen receives a defocused blur circle.
     * - Virtual Image: Rays diverge.
     *   A conceptual ghost screen placed at apparent image position receives NO converging rays.
     *   Cannot form a sharp image.
     * 
     * @param {Object} optProps - Properties from computeConcaveMirror / computeConvexLens
     * @param {number} screenDist - Position of screen in cm (relative to mirror pole or lens optical centre)
     * @param {string} system - 'concave_mirror' or 'convex_lens'
     */
    computeScreenOptics: function (optProps, screenDist, system) {
      const isMirror = system === 'concave_mirror';
      const isVirtual = optProps.isVirtual;
      const isAtFocus = optProps.isAtFocus;

      if (isAtFocus) {
        return {
          isAtFocus: true,
          screenDist: screenDist,
          isSharp: false,
          blurRadius: 10,
          capturedImageHeight: null,
          isGhostScreen: false,
          message: 'Reflected/refracted rays are parallel; screen displays an evenly illuminated area with no sharp focus.'
        };
      }

      if (isVirtual) {
        // Apparent image is at |v| cm behind mirror or on object side
        const imgDist = Math.abs(optProps.v);
        const distDiff = Math.abs(screenDist - imgDist);
        const isAtApparentPlane = distDiff < 1.0;

        return {
          isAtFocus: false,
          isVirtual: true,
          isGhostScreen: true,
          screenDist: screenDist,
          isSharp: false,
          blurRadius: 12,
          capturedImageHeight: null,
          isAtApparentPlane: isAtApparentPlane,
          message: isAtApparentPlane
            ? 'THE VIRTUAL IMAGE IS VISIBLE TO THE EYE, BUT CANNOT BE PROJECTED SHARPLY AT ITS APPARENT IMAGE POSITION. (Actual rays diverge; no light converges here).'
            : 'Conceptual screen placed away from apparent image plane. Rays diverge away from this plane.'
        };
      }

      // Real Image Case:
      // Real image plane is at v cm in front of mirror (or behind lens)
      const distDiff = Math.abs(screenDist - optProps.v);
      const isSharp = distDiff < 0.8;
      // Blur circle increases linearly with distance from focus plane
      const blurRadius = Math.min(22, distDiff * 1.5);
      // Screen captures inverted arrow of height proportional to magnification
      const capturedImageHeight = Math.abs(optProps.hi);

      return {
        isAtFocus: false,
        isVirtual: false,
        isGhostScreen: false,
        screenDist: screenDist,
        isSharp: isSharp,
        distDiff: distDiff,
        blurRadius: blurRadius,
        capturedImageHeight: capturedImageHeight,
        message: isSharp
          ? `REAL IMAGE SHARPLY PROJECTED ON SCREEN! (At plane v = ${optProps.v.toFixed(1)} cm, inverted, ${optProps.sizeDesc}).`
          : `DEFOCUSED ON SCREEN (Offset by ${distDiff.toFixed(1)} cm from sharp plane at ${optProps.v.toFixed(1)} cm).`
      };
    }
  };

  window.OpticsEngine = OpticsEngine;
})(window);
