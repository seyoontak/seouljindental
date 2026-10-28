#!/usr/bin/env python3
"""data/*.json 내용을 index.html 에 '정적 HTML'로 미리 채워 넣는다.

왜 필요한가
  진료시간·공지는 main.js 가 브라우저에서 JSON을 읽어 그린다.
  그런데 네이버 검색로봇(Yeti)과 ChatGPT 검색로봇(OAI-SearchBot) 등은
  자바스크립트를 실행하지 않거나 제한적으로만 실행하므로,
  HTML 원문에 없는 내용은 '없는 내용'으로 본다.
  이 스크립트는 같은 내용을 HTML 원문에도 박아 넣는다.
  (브라우저에서는 main.js 가 JSON을 다시 읽어 덮어쓰므로 화면은 똑같다.)

채워 넣는 곳 (index.html 의 표시 주석 사이)
  <!-- prerender:hours -->   ... <!-- /prerender:hours -->    진료시간 표
  <!-- prerender:notice -->  ... <!-- /prerender:notice -->   공지사항
  <!-- prerender:faq -->     ... <!-- /prerender:faq -->      자주 묻는 질문
  <!-- prerender:jsonld -->  ... <!-- /prerender:jsonld -->   구조화 데이터
                                (clinic.json + 진료시간 + FAQ)
그리고 sitemap.xml 의 <lastmod> 를 오늘 날짜로 바꾼다.

사용법 (저장소 루트에서)
  python3 tools/prerender.py
"""
import datetime
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'


def load(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


def esc(text):
    return html.escape(str(text or ''), quote=True)


def render_hours(hours):
    rows = []
    for item in hours.get('items', []):
        cls = ' class="is-closed"' if item.get('closed') else ''
        rows.append(f'<tr{cls}><td>{esc(item.get("day"))}</td><td>{esc(item.get("time"))}</td></tr>')
    lunch = hours.get('lunch')
    if isinstance(lunch, dict):
        small = f'<small>{esc(lunch["note"])}</small>' if lunch.get('note') else ''
        rows.append(f'<tr class="is-lunch"><td>점심시간</td><td><span>{esc(lunch.get("time"))}</span>{small}</td></tr>')
    return '\n'.join(rows)


def render_notice(notice):
    items = notice.get('items', [])
    if not items:
        return '<p class="fallback">등록된 공지사항이 없습니다.</p>'
    out = []
    for item in items:
        head = ''
        if item.get('tag'):
            head += f'<span class="notice-tag">{esc(item["tag"])}</span>'
        head += f'<h3 class="notice-title">{esc(item.get("title"))}</h3>'
        if item.get('date'):
            head += (f'<time class="notice-date" datetime="{esc(item["date"])}">'
                     f'{esc(item["date"].replace("-", "."))}</time>')
        body = f'<p class="notice-body">{esc(item["body"])}</p>' if item.get('body') else ''
        out.append(f'<article class="notice-item"><div class="notice-head">{head}</div>{body}</article>')
    return '\n'.join(out)


def render_faq(faq):
    return '\n'.join(
        f'<details class="faq-item"><summary>{esc(i["q"])}</summary><p>{esc(i["a"])}</p></details>'
        for i in faq.get('items', [])
    )


def opening_hours(hours):
    specs = []
    for item in hours.get('items', []):
        if item.get('closed') or not item.get('dayOfWeek'):
            continue
        m = re.match(r'\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', item.get('time', ''))
        if not m:
            raise SystemExit(f'hours.json: 시간 형식을 읽을 수 없습니다 → {item}')
        specs.append({
            '@type': 'OpeningHoursSpecification',
            'dayOfWeek': item['dayOfWeek'],
            'opens': m.group(1).zfill(5),
            'closes': m.group(2).zfill(5),
        })
    return specs


def render_jsonld(clinic, hours, faq):
    clinic = dict(clinic)
    context = clinic.pop('@context', 'https://schema.org')
    clinic['openingHoursSpecification'] = opening_hours(hours)
    graph = [clinic]
    if faq.get('items'):
        graph.append({
            '@type': 'FAQPage',
            '@id': 'https://seouljindental.com/#faq',
            'about': {'@id': clinic.get('@id')},
            'mainEntity': [
                {'@type': 'Question', 'name': i['q'],
                 'acceptedAnswer': {'@type': 'Answer', 'text': i['a']}}
                for i in faq['items']
            ],
        })
    body = json.dumps({'@context': context, '@graph': graph}, ensure_ascii=False, indent=2)
    return f'<script type="application/ld+json">\n{body}\n</script>'


def fill(text, name, content):
    pattern = re.compile(rf'(<!-- prerender:{name} -->)(.*?)(<!-- /prerender:{name} -->)', re.S)
    if not pattern.search(text):
        raise SystemExit(f'index.html 에서 prerender:{name} 표시를 찾을 수 없습니다.')
    return pattern.sub(lambda m: f'{m.group(1)}\n{content}\n{m.group(3)}', text, count=1)


def main():
    hours, notice, faq, clinic = load('hours.json'), load('notice.json'), load('faq.json'), load('clinic.json')

    index = ROOT / 'index.html'
    text = index.read_text(encoding='utf-8')
    text = fill(text, 'hours', render_hours(hours))
    text = fill(text, 'notice', render_notice(notice))
    text = fill(text, 'faq', render_faq(faq))
    text = fill(text, 'jsonld', render_jsonld(clinic, hours, faq))
    # 진료시간 아래 안내 문구 (main.js 의 hoursNote 와 같은 내용)
    text = re.sub(r'(<p class="hours-note" id="hoursNote">)(.*?)(</p>)',
                  lambda m: m.group(1) + esc(hours.get('note')) + m.group(3), text, count=1, flags=re.S)
    index.write_text(text, encoding='utf-8')

    sitemap = ROOT / 'sitemap.xml'
    today = datetime.date.today().isoformat()
    sitemap.write_text(re.sub(r'<lastmod>[^<]*</lastmod>', f'<lastmod>{today}</lastmod>',
                              sitemap.read_text(encoding='utf-8')), encoding='utf-8')

    print('index.html / sitemap.xml 갱신 완료')


if __name__ == '__main__':
    main()
