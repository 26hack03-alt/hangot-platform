# 한곳 외부 배포 체크리스트

- [ ] 기존 동아리 목록·검색·필터·상세·AI 추천·비교 기능이 보존됨
- [ ] 신청·게시판·질의응답·관리자 기능과 기존 디자인이 보존됨
- [ ] 로그인 화면에 `Google 계정으로 로그인` 버튼이 존재함
- [ ] 익명 로그인 버튼과 API가 제거됨
- [ ] 실제 `.env`와 `.env.local`이 커밋에 포함되지 않음
- [ ] Supabase service role key, Google Client Secret, access token과 refresh token이 커밋에 포함되지 않음
- [ ] `LOCAL_BUILD_AND_DEPLOY_SETUP.ps1` 전체 빌드가 성공함
- [ ] Supabase Redirect URL이 실제 `/auth/callback` URL과 일치함
- [ ] `APP_URL`이 최종 HTTPS 운영 URL과 일치함
- [ ] Supabase Google Provider가 활성화됨
- [ ] 실제 Google 로그인에 성공함
- [ ] 새로고침 후 세션이 유지됨
- [ ] 로그아웃에 성공함
- [ ] 학생 계정의 `/admin` 접근이 차단됨
- [ ] 운영 URL에서 메인 페이지와 로그인 페이지에 접속 가능함

