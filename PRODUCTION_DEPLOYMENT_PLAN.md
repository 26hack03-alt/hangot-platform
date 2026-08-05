# 운영 배포 계획

## 현재 판정

**조건부 NO-GO.** 소스 테스트와 `vinext build`는 통과했지만 다음 항목이 확정되기 전에는 배포하지 않는다.

1. 현재 폴더가 Git 저장소가 아니므로 추적·스테이징 파일과 비밀 파일 제외를 검증할 수 없다.
2. 실제 HTTPS 운영 도메인이 정해지지 않았다.
3. 운영 D1의 데이터베이스 식별자, 백업 가능 여부, 현재 스키마/마이그레이션 상태를 확인하지 않았다.
4. `package-lock.json`과 `pnpm-lock.yaml`이 함께 존재한다. 운영 표준은 pnpm 11.9.0이며 `package-lock.json`은 배포 소스에서 제외한다.

## 패키지 및 빌드 표준

- Node.js: 22.13.0 이상
- 패키지 관리자: pnpm 11.9.0
- 유일한 설치 기준: `pnpm-lock.yaml`
- 설치: `pnpm install --frozen-lockfile`
- 테스트: `pnpm test`
- 빌드: `pnpm run build`
- 빌드 결과: `dist/`

## 정확한 소스 범위

Sites에는 저장소 루트의 다음 소스만 포함한다.

- `app/`, `db/`, `drizzle/`, `public/`, `worker/`, `build/`, `.openai/`
- `package.json`, `pnpm-lock.yaml`
- `vite.config.ts`, `next.config.ts`, `tsconfig.json`, `drizzle.config.ts`
- `postcss.config.mjs`, `eslint.config.mjs`
- 운영 문서 및 필요한 테스트

다음은 배포 소스에서 제외한다.

- `.env`, `.env.*` 실제 값 파일 (`.env.example`만 허용)
- `node_modules/`, `.next/`, `.vinext/`, `dist/`, `.wrangler/`, `out/`, `coverage/`
- `package-lock.json`
- 중첩 복제본 `hangot-google-auth-deploy-package/`
- 로컬 로그, 백업 SQL, 토큰, 개인키, 인증서

## 기존 운영 버전 대비 주요 차이

- Google OAuth 전용 로그인과 서버 세션
- D1 `users`, `applications`, 게시판·질의응답 데이터 구조
- 학생 신청 제출·목록·상세·취소
- 관리자 전체 신청 검토·승인·반려·감사 로그
- 담당 교사 역할 호환(`club_manager`)과 다대다 `teacher_clubs`
- 담당 교사의 배정 동아리 신청만 조회·검토
- `application_number`, `interest_area` 추가

## 실제 작업 순서

1. 빈 Git 저장소를 현재 루트에 초기화하고 `.gitignore` 적용 여부를 확인한다.
2. `git add --dry-run .`과 실제 staging 후 비밀값 및 제외 디렉터리가 없는지 확인한다.
3. pnpm 11.9.0과 Node 22.13 이상에서 `pnpm install --frozen-lockfile`을 실행한다.
4. `pnpm test`, `pnpm run lint`, `pnpm run build`를 모두 통과시킨다.
5. 운영 HTTPS 도메인과 Sites 프로젝트/D1 바인딩 `DB`를 확정한다.
6. `PRODUCTION_ENV_CHECKLIST.md`에 따라 Sites 변수와 Supabase/Google 설정을 준비한다.
7. `PRODUCTION_D1_MIGRATION_PLAN.md`에 따라 운영 D1을 백업하고 스키마를 비교한다.
8. 확인된 미적용 비파괴 마이그레이션만 운영 D1에 적용한다.
9. Sites에 정확한 소스 범위를 배포한다.
10. `POST_DEPLOY_VERIFICATION.md`를 순서대로 수행한다.

## 배포 중단 조건

- Git staging에 `.env.local`, 토큰, 개인키, service role key가 포함됨
- 운영 도메인과 `APP_URL`, `ALLOWED_ORIGIN`이 불일치
- Supabase Site URL 또는 Redirect URL이 운영 URL과 불일치
- 운영 D1 백업을 생성·복원 검증할 수 없음
- 운영 D1 스키마를 확인하지 않고 `0001_anonymous_platform.sql` 실행 예정
- 테스트, lint 또는 build 실패
- D1 binding 이름이 `DB`가 아니거나 실제 DB가 확인되지 않음
- Google 로그인 콜백을 실제 운영 도메인에서 검증할 수 없음
- 관리자/교사 권한 경계 테스트 실패
