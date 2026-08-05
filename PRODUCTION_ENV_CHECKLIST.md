# 운영 환경변수 및 OAuth 체크리스트

`https://<PRODUCTION_DOMAIN>`과 `<SUPABASE_PROJECT_URL>`은 실제 값으로 치환한다. 비밀값은 Git이나 문서에 기록하지 않는다.

## Sites 필수 환경변수

| 이름 | 값/형식 | 공개 여부 | 필수 |
|---|---|---:|---:|
| `NEXT_PUBLIC_SUPABASE_URL` | `<SUPABASE_PROJECT_URL>` | 공개 설정 | 예 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key | 공개 설정 | 예 |
| `APP_URL` | `https://<PRODUCTION_DOMAIN>` | 공개 설정 | 예 |
| `ALLOWED_ORIGIN` | `https://<PRODUCTION_DOMAIN>` | 공개 설정 | 예 |
| `ALLOWED_GOOGLE_DOMAIN` | 허용 학교 도메인, 예: `school.example` | 정책 설정 | 학교 제한 시 필수 |

`SUPABASE_SERVICE_ROLE_KEY`, Google Client Secret, OAuth access/refresh token은 Sites 환경변수로 등록하지 않는다.

## 선택 환경변수: Google Sheets 기능을 실제 사용할 때만

- `GOOGLE_SHEET_CSV_URL`: 동아리 공개 CSV 원본. 없으면 검증된 로컬 JSON을 사용한다.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`: secret로 저장하며 줄바꿈 형식을 배포 환경에서 검증한다.
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_APPLICATION_SHEET` (기본값 `신청현황`)
- `GOOGLE_SHEETS_QUESTION_SHEET` (기본값 `질문현황`)

Sheets를 사용하지 않으면 서비스 계정 세 변수를 모두 비워 두고 관리자 동기화 기능을 운영 절차에서 사용하지 않는다.

## 플랫폼 바인딩

- D1 binding 이름: `DB`
- `.openai/hosting.json`의 `d1`: `DB`
- `DB`는 문자열 환경변수가 아니라 Sites/Cloudflare D1 binding이다.

## Supabase 운영 설정

- Authentication → Providers → Google: 활성화
- Google Client ID와 Client Secret: Supabase Provider에만 저장
- Authentication → URL Configuration → Site URL:
  - `https://<PRODUCTION_DOMAIN>`
- Redirect URLs:
  - `https://<PRODUCTION_DOMAIN>/auth/callback`
  - 로컬 개발을 유지할 경우 `http://localhost:3000/auth/callback`
- 익명 로그인: 비활성화
- Email 또는 기타 불필요한 Provider: 운영 정책에 따라 비활성화
- 허용 학교 도메인은 앱의 `ALLOWED_GOOGLE_DOMAIN`과 Google Workspace/OAuth 정책을 함께 확인

## Google Cloud 운영 설정

- OAuth Client 유형: Web application
- Authorized JavaScript origins:
  - `https://<PRODUCTION_DOMAIN>`
  - 로컬 개발이 필요하면 `http://localhost:3000`
- Authorized redirect URIs:
  - Supabase Dashboard Google Provider가 표시하는 정확한 콜백 URL
  - 일반 형식: `<SUPABASE_PROJECT_URL>/auth/v1/callback`
- 앱의 `/auth/callback`은 Google Cloud Redirect URI가 아니라 Supabase Redirect URL 목록에 등록한다.
- Client Secret을 Git, Sites의 공개 변수, `NEXT_PUBLIC_*`에 넣지 않는다.

## 배포 직전 확인

- [ ] 운영 도메인 HTTPS 확정
- [ ] `APP_URL`과 `ALLOWED_ORIGIN`이 동일 origin
- [ ] Supabase Site URL과 앱 도메인 일치
- [ ] Supabase Redirect URL에 앱 `/auth/callback` 등록
- [ ] Google Cloud Origin에 앱 origin 등록
- [ ] Google Cloud Redirect URI에 Supabase `/auth/v1/callback` 등록
- [ ] service role key 미사용 확인
- [ ] `.env.local`이 staging 대상이 아님
