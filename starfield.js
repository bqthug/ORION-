/* ==========================================================================
   ORION TRAFFIC — interactive starfield
   Canvas 2D, no dependencies. Depth-parallax star field with a bright
   "Orion star" and an occasional, subtle constellation-forming pulse.
   ========================================================================== */

(function () {
  'use strict';

  function initStarfield() {
    var canvas = document.getElementById('starfield');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isCoarse = window.matchMedia('(pointer: coarse)').matches;
    var isSmall = window.innerWidth < 720;
    var isLowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0, height = 0;
    var stars = [];
    var orionStar = null;
    var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    var raf = null;

    // Base star count scales with area and device capability
    var density = isSmall ? 0.09 : 0.14;
    if (isLowPower || isCoarse) density *= 0.55;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      var count = Math.round(width * height * 0.00016 * (density * 10));
      count = Math.max(70, Math.min(count, isSmall ? 160 : 380));
      stars = [];
      for (var i = 0; i < count; i++) {
        var depth = Math.random(); // 0 = far, 1 = near
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          depth: depth,
          r: 0.5 + depth * 1.6,
          baseAlpha: 0.25 + depth * 0.55,
          twinkleSpeed: 0.4 + Math.random() * 1.1,
          twinklePhase: Math.random() * Math.PI * 2,
          flare: Math.random() < 0.02
        });
      }
      orionStar = {
        x: width * (isSmall ? 0.78 : 0.74),
        y: height * (isSmall ? 0.28 : 0.32),
        r: isSmall ? 2.6 : 3.4,
        pulsePhase: 0
      };
    }

    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    function onTouch(e) {
      if (!e.touches || !e.touches.length) return;
      var t = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      targetX = ((t.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((t.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    var t0 = performance.now();

    function draw(now) {
      var elapsed = (now - t0) / 1000;
      mouseX += (targetX - mouseX) * 0.045;
      mouseY += (targetY - mouseY) * 0.045;

      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var parallax = s.depth * 16;
        var px = s.x + mouseX * parallax;
        var py = s.y + mouseY * parallax;

        var twinkle = reduceMotion ? 1 : (0.6 + 0.4 * Math.sin(elapsed * s.twinkleSpeed + s.twinklePhase));
        var alpha = s.baseAlpha * twinkle;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(233,238,255,' + alpha.toFixed(3) + ')';
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (s.flare && !reduceMotion) {
          var flareAlpha = Math.max(0, Math.sin(elapsed * 0.6 + s.twinklePhase)) * 0.5;
          if (flareAlpha > 0.02) {
            ctx.save();
            ctx.globalAlpha = flareAlpha;
            ctx.strokeStyle = 'rgba(150,180,255,0.9)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(px - s.r * 4, py);
            ctx.lineTo(px + s.r * 4, py);
            ctx.moveTo(px, py - s.r * 4);
            ctx.lineTo(px, py + s.r * 4);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Orion star — the brightest point, soft glow
      if (orionStar) {
        var ox = orionStar.x + mouseX * 22;
        var oy = orionStar.y + mouseY * 22;
        var pulse = reduceMotion ? 1 : (0.85 + 0.15 * Math.sin(elapsed * 1.1));

        var glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, 46 * pulse);
        glow.addColorStop(0, 'rgba(150,180,255,0.55)');
        glow.addColorStop(1, 'rgba(150,180,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ox, oy, 46 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(ox, oy, orionStar.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', debounce(resize, 150));
    if (!isCoarse) window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });

    resize();
    raf = requestAnimationFrame(draw);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf) {
        raf = requestAnimationFrame(draw);
      }
    });
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStarfield);
  } else {
    initStarfield();
  }
})();
