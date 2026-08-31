# Google Sheets 설정

Supabase가 신청 데이터의 유일한 원본입니다. Google Sheets는 관리자가 필요할 때 만드는 운영·보고용 사본이며, Sheet에서 수정한 값은 앱 DB로 돌아오지 않습니다.

## 서버 환경변수

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_APPLICATION_SHEET=신청현황
GOOGLE_SHEETS_QUESTION_SHEET=질문현황
```

credential은 Vercel의 server environment에만 저장합니다. `NEXT_PUBLIC_` 변수, Git, 브라우저 응답 또는 로그에 private key나 access token을 넣지 않습니다.

## Google 설정

1. Google Cloud 프로젝트에서 Google Sheets API를 활성화합니다.
2. Service Account를 생성합니다.
3. 운영 Spreadsheet를 Service Account 이메일에 Editor로 공유합니다.
4. 위 환경변수와 실제 탭 이름을 서버에 등록합니다.

## 동기화 동작

관리자가 `/admin`에서 **Google Sheets 동기화**를 누르면 admin-only API가 Supabase의 최신 applications 스냅샷을 다시 읽습니다. 신청 ID 순서와 제출 시각을 기준으로 결정적으로 정렬한 뒤 신청 Sheet의 앱 관리 범위를 교체합니다.

기본 신청 Sheet에는 신청 ID·신청번호·동아리·상태·처리 시각만 기록합니다. 이름, 학번, 이메일, 사용자 ID, alias, 신청 답변과 검토 의견은 기록하지 않습니다. 모든 셀은 RAW 모드와 formula injection 방어를 사용합니다.

학생 신청, 취소 및 관리자·담당교사 상태 변경은 Google API를 호출하지 않습니다. Sheets 설정 누락이나 장애가 발생해도 Supabase 신청 데이터와 신청 처리 결과에는 영향이 없습니다.

기존 `sync_jobs`는 호환성을 위해 유지하지만 신청 Sheet는 과거 event payload를 재생하지 않습니다. 질문 job은 기존 별도 동기화 경로로 처리합니다.
