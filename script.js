/* ==========================================================================
   ORION TRAFFIC — site script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  applyConfigLinks();
  initHeaderScroll();
  initNav();
  initReveal();
  initCountUp();
  initFaq();
  renderNews();
  initSmoothAnchors();
  renderArticle();
});

function applyConfigLinks() {
  if (typeof ORION_CONFIG === 'undefined') return;
  if (ORION_CONFIG.telegramUrl) {
    document.querySelectorAll('[data-telegram-link]').forEach(function (a) {
      a.setAttribute('href', ORION_CONFIG.telegramUrl);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  }
  if (ORION_CONFIG.managerUrl) {
    document.querySelectorAll('[data-manager-link]').forEach(function (a) {
      a.setAttribute('href', ORION_CONFIG.managerUrl);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  }
}

function initHeaderScroll() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initNav() {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', function () {
    nav.classList.toggle('is-open');
    toggle.classList.toggle('is-active');
  });
  nav.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.classList.remove('is-active');
    });
  });
}

function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]:not([data-telegram-link]):not([data-manager-link])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      var header = document.querySelector('.site-header');
      var offset = header ? header.offsetHeight + 8 : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
}

function initReveal() {
  var targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(function (el, i) {
    el.style.setProperty('--i', i % 6);
    observer.observe(el);
  });
}

function initCountUp() {
  var targets = document.querySelectorAll('.count-up');
  if (!targets.length || !('IntersectionObserver' in window)) return;

  function animate(el) {
    var raw = el.textContent.trim();
    var match = raw.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
    if (!match) return;

    var prefix = match[1], numStr = match[2], suffix = match[3];
    var hasComma = numStr.indexOf(',') !== -1;
    var decimals = numStr.indexOf('.') !== -1 ? (numStr.split('.')[1] || '').length : 0;
    var target = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(target)) return;

    var duration = 1200;
    var start = null;

    function format(value) {
      var fixed = value.toFixed(decimals);
      if (!hasComma) return fixed;
      var parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }

    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + format(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  targets.forEach(function (el) { observer.observe(el); });
}

function initFaq() {
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      item.closest('.faq-list').querySelectorAll('.faq-item').forEach(function (other) {
        other.classList.remove('is-open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('is-open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });
}

function renderNews() {
  var grid = document.getElementById('news-grid');
  if (!grid || typeof ORION_POSTS === 'undefined') return;

  var html = ORION_POSTS.slice(0, 3).map(function (post) {
    var thumb = post.image
      ? '<img src="' + escapeAttr(post.image) + '" alt="' + escapeHtml(post.title) + '">'
      : '';
    return (
      '<a class="news-card reveal" href="post.html?id=' + encodeURIComponent(post.id) + '">' +
        '<div class="news-thumb">' + thumb + '<span class="news-cat">' + escapeHtml(post.category) + '</span></div>' +
        '<div class="news-body">' +
          '<span class="news-date">' + escapeHtml(post.date) + '</span>' +
          '<h3>' + escapeHtml(post.title) + '</h3>' +
          '<p>' + escapeHtml(post.preview) + '</p>' +
          '<span class="news-link">Читать далее ' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>' +
          '</span>' +
        '</div>' +
      '</a>'
    );
  }).join('');

  grid.innerHTML = html;
  initReveal();
}

function renderArticle() {
  var mount = document.getElementById('article-mount');
  if (!mount || typeof ORION_POSTS === 'undefined') return;

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  var post = ORION_POSTS.find(function (p) { return p.id === id; }) || ORION_POSTS[0];

  if (!post) {
    mount.innerHTML = '<p class="article-body">Публикация не найдена.</p>';
    return;
  }

  document.title = post.title + ' — ORION TRAFFIC';

  var media = post.image
    ? '<div class="article-media reveal"><img src="' + escapeAttr(post.image) + '" alt="' + escapeHtml(post.title) + '"></div>'
    : '<div class="article-media reveal"></div>';

  var bodyHtml = post.body.map(function (para) { return '<p>' + escapeHtml(para) + '</p>'; }).join('');

  var hasTelegramUrl = !!(post.telegramUrl && post.telegramUrl.length);
  var telegramNote = hasTelegramUrl ? '' : ' (ссылка на Telegram ещё не добавлена — укажите её в data/posts.js)';
  var telegramBtn = hasTelegramUrl
    ? '<a href="' + escapeAttr(post.telegramUrl) + '" target="_blank" rel="noopener" class="btn btn-primary">Читать пост в Telegram</a>'
    : '<span class="btn btn-ghost" aria-disabled="true" style="opacity:.5;cursor:not-allowed;">Читать пост в Telegram</span>';

  mount.innerHTML =
    '<a href="index.html#news" class="article-back reveal">&larr; Назад к новостям</a>' +
    '<span class="article-cat reveal">' + escapeHtml(post.category) + '</span>' +
    '<h1 class="reveal">' + escapeHtml(post.title) + '</h1>' +
    '<div class="article-meta reveal">' + escapeHtml(post.date) + '</div>' +
    media +
    '<div class="article-body reveal">' + bodyHtml + '</div>' +
    '<div class="article-cta reveal">' +
      '<p>Читайте полную версию поста в нашем Telegram-канале' + telegramNote + '.</p>' +
      telegramBtn +
    '</div>';

  initReveal();
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
