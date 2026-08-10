/* ==========================================================================
   서울진치과 — main.js
   1) 모바일 메뉴 토글
   2) data/hours.json  → 진료시간 표
   3) data/notice.json → 공지사항 목록
   빌드 도구 없이 브라우저에서 바로 동작합니다.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  지도 설정
   *
   *  keyId 를 채우면 네이버 지도로 표시됩니다. 비워두면 기본 지도가
   *  그대로 보이므로, 키가 없어도 사이트는 정상 동작합니다.
   *
   *  Key ID 발급: https://console.ncloud.com
   *    Services > Application Service > Maps > Application 등록
   *    -> Web Dynamic Map 체크, 서비스 URL에 배포 도메인 등록
   *  (자세한 순서는 README 8번 참고)
   * ------------------------------------------------------------------ */
  var NAVER_MAP = {
    keyId: 'rc06wq3mk8',                       // 예: 'abcd1234efgh'
    lat: 37.37300,                   // 경기도 안양시 동안구 경수대로 562
    lng: 126.95820,
    zoom: 17,
    label: '서울진치과 <b>2F</b>'
  };

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

  /* --- 4. 네이버 지도 (Key ID가 있을 때만) --------------------------------- */

  function initNaverMap() {
    var canvas = $('#naverMap');
    var fallback = $('#mapFallback');
    if (!canvas || !NAVER_MAP.keyId) { return; }   // 키가 없으면 기본 지도 유지

    var script = document.createElement('script');
    script.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId='
               + encodeURIComponent(NAVER_MAP.keyId);

    // 인증 실패(도메인 미등록, 잘못된 키 등) 시 네이버가 호출하는 콜백.
    // 빈 지도가 남지 않도록 기본 지도로 되돌린다.
    window.navermap_authFailure = function () {
      console.error('[서울진치과] 네이버 지도 인증에 실패했습니다. '
                  + '콘솔에 등록한 서비스 URL과 Key ID를 확인해 주세요.');
      revert();
    };

    function revert() {
      canvas.hidden = true;
      if (fallback) { fallback.hidden = false; }
    }

    script.onload = function () {
      if (!window.naver || !window.naver.maps) { revert(); return; }

      // 지도를 만들기 전에 먼저 보이게 해야 한다.
      // display:none 상태에서는 네이버가 컨테이너 크기를 0으로 재서
      // 타일이 하나도 그려지지 않는다. 기본 지도가 아직 위를 덮고 있으므로
      // 이 시점에 화면이 깜빡이지는 않는다.
      canvas.hidden = false;

      var pos = new naver.maps.LatLng(NAVER_MAP.lat, NAVER_MAP.lng);
      var map = new naver.maps.Map(canvas, {
        center: pos,
        zoom: NAVER_MAP.zoom,
        scaleControl: false,
        mapDataControl: false,
        logoControlOptions: { position: naver.maps.Position.BOTTOM_LEFT }
      });

      new naver.maps.Marker({
        position: pos,
        map: map,
        title: '서울진치과',
        icon: {
          content: '<div class="map-marker">' + NAVER_MAP.label + '</div>',
          anchor: new naver.maps.Point(0, 0)
        }
      });

      // 타일이 실제로 그려진 뒤에 기본 지도를 치운다.
      naver.maps.Event.once(map, 'init', function () {
        naver.maps.Event.trigger(map, 'resize');
        if (fallback) { fallback.hidden = true; }
      });
    };

    script.onerror = function () {
      console.error('[서울진치과] 네이버 지도를 불러오지 못했습니다. 기본 지도를 표시합니다.');
      revert();
    };

    document.head.appendChild(script);
  }

  /* --- 초기화 -------------------------------------------------------------- */

  initMenu();
  initNaverMap();
  loadJSON('data/hours.json').then(renderHours);
  loadJSON('data/notice.json').then(renderNotice);
})();
