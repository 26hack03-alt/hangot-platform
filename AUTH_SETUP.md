# 한곳 Google OAuth 설정

실제 키나 비밀값은 이 문서, 소스 코드 또는 Git에 기록하지 않습니다.

1. Google Cloud Console에서 OAuth 동의 화면과 웹 애플리케이션 Client ID를 생성합니다.
2. Google 승인 Redirect URI에는 Supabase가 안내하는 `/auth/v1/callback` 주소를 등록합니다.
3. Supabase Dashboard → Authentication → Providers → Google에서 Client ID와 Client Secret을 등록합니다.
4. Supabase URL Configuration의 Site URL을 운영 주소로 설정합니다.
5. Redirect URLs에 로컬 및 운영 주소의 `/auth/callback`을 추가합니다.
6. `.env.example`의 변수 이름을 로컬 및 Sites 런타임 환경에 등록합니다.
7. 학교 계정만 허용하려면 `ALLOWED_GOOGLE_DOMAIN`에 `@` 없는 도메인을 입력합니다. 비워두면 제한하지 않습니다.
8. 로그인, callback, 새로고침 후 세션 유지, 로그아웃을 검사합니다.
9. 새 사용자의 D1 `users.role`이 `student`인지 확인합니다.
10. 학생의 `/admin`, `/manager` 접근과 관리자 API 호출이 차단되는지 검사합니다.

Google Client Secret은 Supabase Provider 설정에만 저장합니다. 일반 로그인에는 service role key가 필요하지 않습니다.
