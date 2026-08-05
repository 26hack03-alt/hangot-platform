# Google Sheets 설정

Google Sheets는 원본 저장소가 아니라 운영 확인·통계·백업용입니다. DB 저장 성공 후 `sync_jobs`에 작업이 생성되며, 동기화 실패가 신청을 취소하지 않습니다.

필요한 서버 환경변수:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_APPLICATION_SHEET=신청현황
GOOGLE_SHEETS_CLUB_STATS_SHEET=동아리통계
GOOGLE_SHEETS_BOARD_STATS_SHEET=게시판통계
GOOGLE_SHEETS_QUESTION_SHEET=질문현황
GOOGLE_SHEETS_ERROR_SHEET=동기화오류
ALLOWED_ORIGIN=
```

Google Cloud에서 Sheets API를 활성화하고 서비스 계정에 대상 스프레드시트 편집 권한을 부여합니다. 키는 Sites 환경변수에만 저장하고 Git·브라우저·시트에 넣지 않습니다. 관리자는 `/admin`에서 실패 작업을 재시도합니다. 첫 번째 열의 원본 데이터 ID로 행을 갱신하여 중복을 방지하며 `=`, `+`, `-`, `@`로 시작하는 값은 수식으로 실행되지 않게 처리합니다.
