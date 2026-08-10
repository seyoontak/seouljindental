/* ==========================================================================
   서울진치과 — main.js
   1) 모바일 메뉴 토글
   2) data/hours.json  → 진료시간 표
   3) data/notice.json → 공지사항 목록
   빌드 도구 없이 브라우저에서 바로 동작합니다.
   ========================================================================== */
(function () {
  'use strict';

  /* --- 유틸 --------------------------------------------------------------- */

  var $ = function (sel) { return document.querySelector(sel); };

  /** XSS 방지를 위해 항상 textContent로만 값을 넣는다. */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text != null) { node.textContent = text; }
    return node;
  }

  /** 2026-08-07 → 2026.08.07 */
  function formatDate(value) {
    if (!value) { return ''; }
    return String(value).replace(/-/g, '.');
  }

  /** JSON 파일을 읽어온다. 실패하면 null을 반환한다. */
  function loadJSON(path) {
    return fetch(path, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) { throw new Error(path + ' → HTTP ' + res.status); }
        return res.json();
      })
      .catch(function (err) {
        console.error('[서울진치과] 데이터를 불러오지 못했습니다:', err);
        return null;
      });
  }

  /* --- 1. 모바일 메뉴 ------------------------------------------------------ */

  function initMenu() {
    var toggle = $('#menuToggle');
    var nav = $('#mobileNav');
    if (!toggle || !nav) { return; }

    function setOpen(open) {
      nav.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }

    toggle.addEventListener('click', function () {
      setOpen(nav.hidden);
    });

    // 메뉴 항목을 누르면 닫는다.
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) { setOpen(false); }
    });

    // ESC로 닫기
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !nav.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });

    // PC 폭으로 넓어지면 열린 상태를 초기화한다.
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) { setOpen(false); }
    });
  }

  /* --- 2. 진료시간 (data/hours.json) --------------------------------------- */

  function renderHours(data) {
    var body = $('#hoursBody');
    var note = $('#hoursNote');
    if (!body) { return; }

    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      body.innerHTML = '';
      var errRow = el('tr');
      var errCell = el('td', 'fallback', '진료시간은 031-452-1162로 문의해 주세요.');
      errCell.colSpan = 2;
      errRow.appendChild(errCell);
      body.appendChild(errRow);
      return;
    }

    var frag = document.createDocumentFragment();

    data.items.forEach(function (item) {
      var row = el('tr', item.closed ? 'is-closed' : '');
      row.appendChild(el('td', '', item.day || ''));
      row.appendChild(el('td', '', item.time || ''));
      frag.appendChild(row);
    });

    body.innerHTML = '';
    body.appendChild(frag);

    if (note) {
      note.textContent = [data.lunch, data.note].filter(Boolean).join(' · ');
    }
  }

  /* --- 3. 공지사항 (data/notice.json) -------------------------------------- */

  function renderNotice(data) {
    var list = $('#noticeList');
    if (!list) { return; }

    var items = data && Array.isArray(data.items) ? data.items : [];

    if (items.length === 0) {
      list.innerHTML = '';
      list.appendChild(el('p', 'fallback', '등록된 공지사항이 없습니다.'));
      return;
    }

    var frag = document.createDocumentFragment();

    items.forEach(function (item) {
      var article = el('article', 'notice-item');
      var head = el('div', 'notice-head');

      if (item.tag) { head.appendChild(el('span', 'notice-tag', item.tag)); }
      head.appendChild(el('h3', 'notice-title', item.title || ''));

      if (item.date) {
        var time = el('time', 'notice-date', formatDate(item.date));
        time.setAttribute('datetime', item.date);
        head.appendChild(time);
      }

      article.appendChild(head);
      if (item.body) { article.appendChild(el('p', 'notice-body', item.body)); }
      frag.appendChild(article);
    });

    list.innerHTML = '';
    list.appendChild(frag);
  }

  /* --- 초기화 -------------------------------------------------------------- */

  initMenu();
  loadJSON('data/hours.json').then(renderHours);
  loadJSON('data/notice.json').then(renderNotice);
})();
