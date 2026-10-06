/* ==========================================================================
   ORION TRAFFIC — case-system.js
   ==========================================================================
   Отдельный, самостоятельный модуль блока "Кейсы".

   ПОЧЕМУ ОН ОТДЕЛЬНЫЙ:
   Раньше рендер кейсов был одной из многих функций внутри script.js,
   вызываемых по очереди в одном обработчике DOMContentLoaded. Если ЛЮБАЯ
   функция, вызванная РАНЬШЕ инициализации кейсов, падала с ошибкой —
   весь остальной код в этом обработчике (включая кейсы) просто не
   выполнялся, и блок оставался пустым без всякой связи с данными кейсов.

   Этот файл не зависит от script.js. У него собственный обработчик
   DOMContentLoaded, поэтому блок "Кейсы" рендерится независимо от того,
   что происходит в остальном JavaScript сайта — и наоборот, ошибка в
   данных кейсов никак не повлияет на остальной сайт.

   ЧТО ЭТОТ ФАЙЛ ГАРАНТИРУЕТ:
   - если data/cases.js не подключился или содержит синтаксическую
     ошибку — в консоли понятное сообщение, а на странице аккуратное
     состояние вместо пустоты;
   - если ORION_CASES — не массив или пустой массив — тоже понятное
     состояние, а не пустой блок;
   - один "сломанный" кейс (без id/title) пропускается с предупреждением
     в консоли, но не ломает остальные кейсы;
   - отсутствие gallery, chart, link, description, result, image —
     никогда не ломает кейс, просто соответствующий элемент не рисуется;
   - если изображение не загрузилось (404, опечатка в пути) — вместо
     сломанной иконки показывается аккуратная заглушка, кейс не ломается;
   - любая непредвиденная ошибка во время рендера перехватывается и не
     "роняет" весь блок молча.
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    try {
      initCases();
    } catch (err) {
      // Последняя линия защиты: даже непредвиденная ошибка не должна
      // привести к молчаливому пустому блоку.
      console.error('[ORION cases] Непредвиденная ошибка при инициализации блока кейсов:', err);
      var detailFallback = document.getElementById('case-detail');
      if (detailFallback) {
        detailFallback.innerHTML = '<div class="case-state">Не удалось загрузить кейсы. Подробности — в консоли браузера (F12).</div>';
      }
    }
  });

  function initCases() {
    var orbit = document.getElementById('case-orbit-nodes');
    var tabs = document.getElementById('case-tabs');
    var detail = document.getElementById('case-detail');

    // На этой странице нет блока кейсов (например, post.html) — это
    // нормально, просто ничего не делаем.
    if (!detail) return;

    if (!orbit) {
      console.error('[ORION cases] Не найден контейнер #case-orbit-nodes. Проверьте разметку секции #cases в index.html — она должна содержать <div id="case-orbit-nodes"></div>.');
    }

    function showState(message) {
      detail.innerHTML = '<div class="case-state">' + escapeHtml(message) + '</div>';
      if (orbit) orbit.innerHTML = '';
      if (tabs) tabs.innerHTML = '';
    }

    // ---- 1. Проверяем, что данные вообще загрузились ----------------------

    if (typeof ORION_CASES === 'undefined') {
      console.error(
        '[ORION cases] Переменная ORION_CASES не найдена.\n' +
        'Проверьте:\n' +
        '  1) что в index.html подключён <script src="data/cases.js"> ДО case-system.js;\n' +
        '  2) что файл data/cases.js действительно существует по этому пути;\n' +
        '  3) что в data/cases.js нет синтаксической ошибки — откройте вкладку\n' +
        '     Console в DevTools: при синтаксической ошибке браузер покажет её\n' +
        '     отдельным сообщением с именем файла data/cases.js и номером строки.'
      );
      showState('Кейсы временно недоступны.');
      return;
    }

    if (!Array.isArray(ORION_CASES)) {
      console.error('[ORION cases] ORION_CASES должен быть массивом объектов. Сейчас это: ' + typeof ORION_CASES + '. Проверьте data/cases.js.');
      showState('Кейсы временно недоступны.');
      return;
    }

    // ---- 2. Проверяем и нормализуем каждый кейс по отдельности ------------
    // Один некорректный объект не должен ломать остальные.

    var cases = [];
    ORION_CASES.forEach(function (raw, i) {
      var normalized = normalizeCase(raw, i);
      if (!normalized) {
        console.warn('[ORION cases] Кейс #' + (i + 1) + ' пропущен — отсутствует обязательное поле id или title.', raw);
        return;
      }
      cases.push(normalized);
    });

    if (!cases.length) {
      showState('Кейсы скоро появятся здесь.');
      return;
    }

    // ---- 3. Рендерим ---------------------------------------------------

    renderCaseSystem(cases, orbit, tabs, detail);
  }

  // Приводит "сырой" объект кейса к безопасной форме. Отсутствующие
  // необязательные поля получают пустые значения по умолчанию, поэтому
  // дальше по коду не нужно на каждом шагу проверять их существование.
  function normalizeCase(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.id || !raw.title) return null;

    var stats = Array.isArray(raw.stats)
      ? raw.stats
          .filter(function (s) { return s && (s.label != null || s.value != null); })
          .map(function (s) { return { label: String(s.label || ''), value: String(s.value || '') }; })
      : [];

    var gallery = Array.isArray(raw.gallery)
      ? raw.gallery.filter(function (src) { return !!src; }).map(String)
      : [];

    var chart = Array.isArray(raw.chart)
      ? raw.chart.filter(function (p) { return p && p.value != null && !isNaN(Number(p.value)); })
      : [];

    return {
      id: String(raw.id),
      code: raw.code ? String(raw.code) : String(index + 1).padStart(2, '0'),
      title: String(raw.title),
      platform: raw.platform ? String(raw.platform) : '',
      description: raw.description ? String(raw.description) : '',
      result: raw.result ? String(raw.result) : '',
      period: raw.period ? String(raw.period) : '',
      stats: stats,
      image: raw.image ? String(raw.image) : '',
      gallery: gallery,
      chart: chart,
      link: raw.link ? String(raw.link) : ''
    };
  }

  function renderCaseSystem(cases, orbit, tabs, detail) {
    var positions = [
      { top: '4%', left: '50%' },
      { top: '50%', left: '92%' },
      { top: '88%', left: '18%' },
      { top: '30%', left: '8%' },
      { top: '78%', left: '80%' }
    ];

    var activeIndex = 0;
    detail.style.transition = 'opacity .3s ease';

    // Орбитальные точки (десктоп)
    if (orbit) {
      orbit.innerHTML = '';
      cases.forEach(function (c, i) {
        var pos = positions[i % positions.length];
        var btn = document.createElement('button');
        btn.className = 'case-node' + (i === 0 ? ' is-active' : '');
        btn.style.top = pos.top;
        btn.style.left = pos.left;
        btn.dataset.index = String(i);
        btn.setAttribute('aria-label', 'Показать ' + c.title);
        btn.textContent = c.code;
        btn.addEventListener('click', function () { setActive(i); });
        orbit.appendChild(btn);
      });
    }

    // Вкладки (мобильная версия)
    if (tabs) {
      tabs.innerHTML = '';
      cases.forEach(function (c, i) {
        var btn = document.createElement('button');
        btn.className = 'case-tab' + (i === 0 ? ' is-active' : '');
        btn.dataset.index = String(i);
        btn.textContent = c.code;
        btn.addEventListener('click', function () { setActive(i); });
        tabs.appendChild(btn);
      });
    }

    function setActive(index) {
      if (index === activeIndex || !cases[index]) return;
      activeIndex = index;
      if (orbit) {
        orbit.querySelectorAll('.case-node').forEach(function (n) {
          n.classList.toggle('is-active', parseInt(n.dataset.index, 10) === index);
        });
      }
      if (tabs) {
        tabs.querySelectorAll('.case-tab').forEach(function (n) {
          n.classList.toggle('is-active', parseInt(n.dataset.index, 10) === index);
        });
      }
      detail.style.opacity = 0;
      setTimeout(function () {
        renderDetail(cases[index]);
        detail.style.opacity = 1;
      }, 180);
    }

    renderDetail(cases[0]);

    function renderDetail(c) {
      var statsHtml = c.stats.map(function (s) {
        return '<div><div class="stat-num">' + escapeHtml(s.value) + '</div><div class="stat-label">' + escapeHtml(s.label) + '</div></div>';
      }).join('');

      var mediaHtml = c.image
        ? '<div class="case-media"><img data-fallback-code="' + escapeAttr(c.code) + '" src="' + escapeAttr(c.image) + '" alt="' + escapeHtml(c.title) + '"></div>'
        : '<div class="case-media case-media-placeholder"><span>' + escapeHtml(c.code) + '</span></div>';

      var galleryHtml = '';
      if (c.gallery.length) {
        galleryHtml = '<div class="case-gallery">' + c.gallery.map(function (src) {
          return '<div class="case-gallery-item"><img src="' + escapeAttr(src) + '" alt="' + escapeHtml(c.title) + ' — скриншот"></div>';
        }).join('') + '</div>';
      }

      var chartHtml = '';
      if (c.chart.length) {
        var max = Math.max.apply(null, c.chart.map(function (p) { return Number(p.value) || 0; })) || 1;
        chartHtml = '<div class="case-chart">' + c.chart.map(function (p) {
          var h = Math.max(6, Math.round((Number(p.value) || 0) / max * 100));
          return '<div class="case-chart-bar-wrap"><div class="case-chart-bar" style="height:' + h + '%"></div><span>' + escapeHtml(p.label) + '</span></div>';
        }).join('') + '</div>';
      }

      var resultHtml = c.result ? '<div class="case-result">' + escapeHtml(c.result) + '</div>' : '';
      var descriptionHtml = c.description ? '<p>' + escapeHtml(c.description) + '</p>' : '';
      var linkHtml = c.link ? '<a href="' + escapeAttr(c.link) + '" target="_blank" rel="noopener" class="case-link">Подробнее →</a>' : '';
      var metaHtml = (c.platform || c.period)
        ? '<span class="case-detail-tag">' + [c.platform, c.period].filter(Boolean).map(escapeHtml).join(' · ') + '</span>'
        : '';

      detail.innerHTML =
        mediaHtml +
        metaHtml +
        '<h3>' + escapeHtml(c.title) + '</h3>' +
        resultHtml +
        descriptionHtml +
        (statsHtml ? '<div class="case-detail-stats">' + statsHtml + '</div>' : '') +
        chartHtml +
        galleryHtml +
        linkHtml;

      // Если изображение не загрузится — заменяем его на аккуратную
      // заглушку вместо сломанной иконки браузера. Ошибка одной картинки
      // никак не влияет на остальной кейс.
      detail.querySelectorAll('img').forEach(function (img) {
        img.addEventListener('error', function onError() {
          var wrap = img.closest('.case-media, .case-gallery-item');
          if (!wrap) return;
          if (wrap.classList.contains('case-media')) {
            wrap.classList.add('case-media-placeholder');
            var span = document.createElement('span');
            span.textContent = img.dataset.fallbackCode || '';
            img.remove();
            wrap.appendChild(span);
          } else {
            // Миниатюра в галерее — просто скрываем её, остальная
            // галерея и весь кейс остаются рабочими.
            wrap.classList.add('is-broken');
          }
        }, { once: true });
      });
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }
})();
