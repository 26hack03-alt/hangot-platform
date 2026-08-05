# 운영 D1 수동 마이그레이션 Manifest

## 자동 적용 정책

- 운영 D1 migration은 모두 자동 적용 금지다.
- `build/sites-vite-plugin.ts`는 `drizzle/`을 `dist/.openai`에 복사하지 않는다.
- 빌드나 Sites 배포만으로 `0000`~`0005`가 원격 D1에 전달·실행되지 않는다.
- 원본 SQL은 이력 보존을 위해 `drizzle/`에 유지한다.
- 원격 변경은 백업과 스키마 확인 후 사람이 선택한 파일을 명시적 `wrangler d1 execute --remote --file` 명령으로 실행할 때만 가능하다.
- 로컬 D1은 원본 `drizzle/` 파일로 계속 수동 적용할 수 있다.

## 파일별 검토표

| 파일 | 목적 | 기존 DB 적용 | 빈 DB 전용 | 파괴 가능성 | 적용 전 조건 |
|---|---|---|---|---|---|
| `0000_fair_rawhide_kid.sql` | 폐기된 초기 신원 기반 모델 | 금지 | 사용하지 않음 | 높음: 현재 구조와 충돌 | 운영 자동·수동 적용 금지 |
| `0001_anonymous_platform.sql` | 현재 플랫폼 baseline | 금지 | 예 | 치명적: 핵심 테이블 DROP | 완전히 빈 신규 DB임을 증명한 경우만 검토 |
| `0002_ensure_users.sql` | users/인덱스 존재 보장 | 조건부 | 아니오 | 낮음 | users 열·제약 호환 확인 |
| `0003_application_number.sql` | `public_id` → `application_number` | 조건부 | 아니오 | 중간 | `public_id` 존재, 새 열 부재 확인 |
| `0004_application_interest_area.sql` | `interest_area` 추가 | 조건부 | 아니오 | 낮음 | 열 부재 확인 |
| `0005_teacher_clubs.sql` | 교사-동아리 다대다 연결 | 조건부 | 아니오 | 낮음 | 테이블·인덱스 부재와 users FK 확인 |

## 자동 적용 금지 파일

- `0000_fair_rawhide_kid.sql`
- `0001_anonymous_platform.sql`
- 원격 스키마 확인 전 `0002`~`0005` 전체

## 원격 스키마 확인 후 선택

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
PRAGMA table_info('users');
PRAGMA table_info('applications');
PRAGMA table_info('teacher_clubs');
SELECT name, sql FROM sqlite_master WHERE type='index' ORDER BY name;
PRAGMA foreign_key_check;
```

- 데이터가 있는 운영 DB에는 `0000`, `0001`을 선택하지 않는다.
- `application_number`가 있으면 `0003`을 선택하지 않는다.
- `interest_area`가 있으면 `0004`를 선택하지 않는다.
- `teacher_clubs`가 있으면 `0005`를 선택하지 않는다.
- 예상과 다른 구조가 있으면 중단하고 별도 비파괴 migration을 새 번호로 작성한다.

## 명시적 수동 적용 형식

아래 명령은 원격 DB 이름·운영 설정·백업이 확정된 후에만 사용한다. 이번 작업에서는 실행하지 않는다.

```powershell
pnpm exec wrangler d1 execute <PRODUCTION_DATABASE_NAME> --remote --config <PRODUCTION_WRANGLER_CONFIG> --file ".\drizzle\<REVIEWED_MIGRATION_FILE>"
```

한 번에 한 파일만 실행하고 매 파일 뒤에 스키마·외래키·주요 테이블 행 수를 확인한다.

## 복구 및 중단 기준

1. 적용 전 `wrangler d1 export --remote` 전체 백업을 생성·검증한다.
2. 주요 테이블별 행 수를 기록한다.
3. 적용 후 행 수 감소, FK 오류, 인증/신청 500 오류가 생기면 쓰기를 중단한다.
4. 직전 Sites 버전으로 롤백하고 검증된 백업을 기준으로 복구한다.

즉시 중단 조건:

- 운영 DB 식별자 또는 binding 불명
- 백업 생성·검증 실패
- `dist/.openai/drizzle`이 다시 생성됨
- 데이터가 있는 DB에 `0001` 실행 예정
- schema가 migration 전제와 다름
- `PRAGMA foreign_key_check` 실패 또는 주요 행 수 감소
