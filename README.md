# 서울진치과 정적 홈페이지

Cloudflare Pages에 바로 배포할 수 있는 정적 홈페이지입니다. 빌드 단계나 서버가 필요하지 않습니다.

## 배포

Cloudflare Pages에서 이 저장소를 연결한 뒤 **Build command**는 비워두고, **Build output directory**는 `/`로 설정하세요.

## 운영 정보 수정

- 진료시간: `data/hours.json`
- 공지사항: `data/notice.json`
- 본문·연락처·지도 링크: `index.html`
- 디자인: `assets/css/style.css`

현재 canonical URL과 sitemap의 `seouljindental.pages.dev` 주소는 실제 연결할 도메인으로 교체하세요. 네이버 지도 링크는 주소 검색 링크로 구성되어 있어, 플레이스 등록 후 정확한 플레이스 URL로 바꾸면 됩니다.
