# 데이터베이스 설정

Cloudflare D1 바인딩 이름은 `.openai/hosting.json`의 `DB`입니다.

마이그레이션은 순서대로 적용합니다.

1. `drizzle/0000_fair_rawhide_kid.sql`
2. `drizzle/0001_anonymous_platform.sql`

두 번째 마이그레이션은 이전 개인정보형 실험 테이블을 제거하고 익명 플랫폼 스키마로 교체합니다. 운영 데이터가 이미 있는 환경에서는 적용 전에 별도 백업과 학교 담당자의 승인이 필요합니다.

주요 테이블은 `users`, `clubs`, `applications`, `posts`, `post_comments`, `questions`, `answers`, `audit_logs`, `sync_jobs`입니다. 이름·학번·이메일·전화번호 열은 없습니다.
