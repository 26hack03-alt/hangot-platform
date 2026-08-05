# 운영 D1 마이그레이션 계획

## 원칙

운영 D1은 이번 점검에서 변경하지 않았다. 원격 DB의 현재 스키마와 적용 이력을 확인하기 전에는 “미적용 파일”을 확정할 수 없다. 파일명만 보고 전체를 재실행하지 않는다.

## 파일별 위험도

| 순서 | 파일 | 목적 | 기존 운영 DB 위험 |
|---:|---|---|---|
| 0000 | `0000_fair_rawhide_kid.sql` | 폐기된 초기 신원 기반 구조 | 높음: 현 구조와 충돌. 운영 적용 금지 |
| 0001 | `0001_anonymous_platform.sql` | 현재 플랫폼 초기 baseline | 치명적: 여러 테이블을 DROP. 데이터가 있는 운영 DB에 재실행 금지 |
| 0002 | `0002_ensure_users.sql` | users/인덱스 존재 보장 | 낮음이나 기존 열 구조가 다르면 해결하지 못함 |
| 0003 | `0003_application_number.sql` | `public_id` → `application_number` | 중간: 현재 열 상태 확인 없이 실행하면 실패 |
| 0004 | `0004_application_interest_area.sql` | `interest_area` 추가 | 낮음: 이미 열이 있으면 실패 |
| 0005 | `0005_teacher_clubs.sql` | 교사-동아리 다대다 배정 | 낮음: 이미 테이블이 있으면 실패 |

## 신규 빈 운영 D1

완전히 빈 DB임을 증명한 경우에만 다음 순서를 사용한다. `0000`은 사용하지 않는다.

1. `0001_anonymous_platform.sql`
2. `0002_ensure_users.sql`
3. `0003_application_number.sql`
4. `0004_application_interest_area.sql`
5. `0005_teacher_clubs.sql`

## 기존 운영 D1

먼저 다음을 조회해 상태별로 필요한 파일만 선택한다.

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
PRAGMA table_info('users');
PRAGMA table_info('applications');
PRAGMA table_info('teacher_clubs');
SELECT name, sql FROM sqlite_master WHERE type='index' ORDER BY name;
```

- `applications.application_number`가 있고 `public_id`가 없으면 `0003`은 이미 적용된 것으로 간주한다.
- `interest_area`가 있으면 `0004`를 실행하지 않는다.
- `teacher_clubs`와 `teacher_clubs_teacher_club_unique`가 있으면 `0005`를 실행하지 않는다.
- 현재 운영 DB에 데이터가 하나라도 있으면 `0001`을 실행하지 않는다.

## 백업 절차

실제 운영 Wrangler 설정과 데이터베이스 이름을 먼저 확정한다. 아래 명령은 초안이며 이번 단계에서는 실행하지 않는다.

```powershell
New-Item -ItemType Directory -Force -Path .\backups
pnpm exec wrangler d1 export <PRODUCTION_DATABASE_NAME> --remote --config <PRODUCTION_WRANGLER_CONFIG> --output ".\backups\production-before-migration-YYYYMMDD-HHMMSS.sql"
```

백업 후 다음을 확인한다.

- 파일 크기가 0보다 큼
- `CREATE TABLE users`, `CREATE TABLE applications` 포함
- 주요 테이블별 행 수를 별도 기록
- 복원용 빈 임시 D1에서 import 검증 가능 여부 확인
- 백업 SQL은 Git staging에서 제외하고 접근 제한된 위치로 이동

## 적용 명령 초안

`<MIGRATION_FILE>`에는 사전 조회로 미적용이 확인된 파일 하나만 넣는다.

```powershell
pnpm exec wrangler d1 execute <PRODUCTION_DATABASE_NAME> --remote --config <PRODUCTION_WRANGLER_CONFIG> --file ".\drizzle\<MIGRATION_FILE>"
```

각 파일 적용 후 즉시 schema와 행 수를 재확인하고 다음 파일로 진행한다. 여러 SQL을 한 번에 묶지 않는다.

## 현재 확정 가능한 미적용 목록

확정 불가. 원격 D1 조회를 수행하지 않았기 때문이다. 후보는 운영 상태에 따라 `0002`~`0005`이며, `0000`은 금지하고 `0001`은 빈 DB 전용이다.

## 중단 조건

- 백업 실패 또는 백업 파일 검증 실패
- 실제 운영 DB 식별자/바인딩 불명
- `applications` 열 상태와 마이그레이션 예상이 불일치
- 운영 DB에 데이터가 있는데 `0001` 실행이 필요해 보임
- 외래키 검사 실패
- 적용 직후 주요 테이블 행 수 감소
