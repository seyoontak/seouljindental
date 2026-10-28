#!/usr/bin/env bash
# 홈페이지를 고쳐 배포한 뒤 실행하면, 네이버·빙(Bing)에 "바뀌었으니 다시 수집해 달라"고 즉시 알린다.
# IndexNow 는 한 곳에 보내면 참여 검색엔진(네이버, Bing 등)에 함께 전달된다.
# Bing 색인은 ChatGPT 검색·Copilot 답변의 주요 출처이기도 하다.
#
# 사용법 (저장소 루트에서, 배포가 끝난 뒤):  bash tools/indexnow.sh
# 키 파일(루트의 eb68a018a5e087c3e0a1280828e72d7c.txt)을 지우거나 이름을 바꾸면 동작하지 않는다.
set -euo pipefail
KEY=eb68a018a5e087c3e0a1280828e72d7c
HOST=seouljindental.com
URLS=(https://seouljindental.com/)

# 네이버: POST 형식은 422(Invalid urls)로 거절되어 주소마다 GET 으로 보낸다.
for URL in "${URLS[@]}"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -G https://searchadvisor.naver.com/indexnow \
    --data-urlencode "url=$URL" --data-urlencode "key=$KEY")
  echo "네이버 $URL → HTTP $CODE   (200·202 이면 접수됨)"
done

# IndexNow 공용 (Bing 등 참여 검색엔진에 함께 전달)
LIST=$(printf '"%s",' "${URLS[@]}"); LIST="[${LIST%,}]"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":$LIST}")
echo "Bing 등 (api.indexnow.org) → HTTP $CODE   (200·202 이면 접수됨)"
