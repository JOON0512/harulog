# 하루로그

오늘 할 일을 적고, 친구의 하루도 보는 작은 웹앱.

날짜별로 할 일을 기록하고 완료 표시를 남깁니다. 각 기록은 나만 보거나 친구에게 공개할 수 있고, 친구 코드로 서로 요청을 수락하면 공개한 기록을 함께 볼 수 있습니다.

React · TypeScript · vinext · Cloudflare D1

## Run

Node.js 22.13 이상.

```sh
npm ci
npm run build
```

새 로컬 데이터베이스를 한 번 초기화한 뒤 개발 서버를 엽니다.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_milky_sauron.sql
npm run dev
```

로컬 로그인은 개발용 가상 계정을 사용합니다. 배포 환경은 Sites의 ChatGPT 인증 프록시와 D1이 필요하며, `.openai/hosting.json`의 예시 프로젝트 ID를 바꿔야 합니다.

## Code

- `app/harulog.tsx` — 달력, 할 일, 친구 화면
- `app/api/[resource]/route.ts` — 인증과 API
- `lib/store.ts` — 기록과 친구 관계 조회
- `db/schema.ts`, `drizzle/` — 데이터베이스 스키마

```sh
npx tsc --noEmit
node tests/api-security.mjs
```

API 테스트는 `HARULOG_TEST_URL`로 지정한 로컬 미리보기에서 실행합니다. 서버 실행 조건은 [테스트 파일](tests/api-security.mjs) 상단을 참고하세요.
