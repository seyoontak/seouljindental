(function () {
  'use strict';
  var menuButton = document.querySelector('.menu-toggle');
  var navigation = document.querySelector('.site-nav');
  if (menuButton && navigation) {
    menuButton.addEventListener('click', function () {
      var open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      menuButton.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
      navigation.classList.toggle('is-open', !open);
    });
  }
  function loadJson(path, render, fallback) {
    fetch(path).then(function (response) { if (!response.ok) throw new Error('load failed'); return response.json(); }).then(render).catch(fallback);
  }
  loadJson('data/hours.json', function (data) {
    var rows = data.hours.map(function (item) { return '<div class="hour-row"><dt>' + item.day + '</dt><dd>' + item.time + '</dd></div>'; }).join('');
    document.getElementById('hours').innerHTML = '<dl>' + rows + '</dl><p class="hour-note">' + data.note + '</p>';
  }, function () { document.getElementById('hours').innerHTML = '<p class="loading">진료시간 정보를 확인해 주세요.</p>'; });
  loadJson('data/notice.json', function (data) {
    var list = data.notices.slice(0, 3).map(function (item) { return '<article class="notice-item"><strong>' + item.title + '</strong><time datetime="' + item.date + '">' + item.date.replaceAll('-', '.') + '</time></article>'; }).join('');
    document.getElementById('notice-list').innerHTML = list || '<p class="loading">등록된 공지사항이 없습니다.</p>';
  }, function () { document.getElementById('notice-list').innerHTML = '<p class="loading">공지사항을 확인해 주세요.</p>'; });
  document.getElementById('year').textContent = new Date().getFullYear();
}());
