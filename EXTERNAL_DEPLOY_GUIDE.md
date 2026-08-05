# 한곳 Google 인증 외부 배포 안내

이 패키지는 ChatGPT Sites 운영 버전 10의 정상 원본에 `google-auth-only.patch`만 적용한 소스입니다. `packageManager` 필드는 없지만 `pnpm-lock.yaml`과 기존 실행 흐름을 기준으로 pnpm을 사용합니다. `package-lock.json`도 원본 보존을 위해 삭제하지 않았습니다.

## A. 로컬 빌드

1. Windows PowerShell을 엽니다.
2. 프로젝트 폴더로 이동합니다.

   ```powershell
   Set-Location -LiteralPath 'C:\Users\genjo\Documents\Codex\2026-07-24\hangot-google-auth-deploy'
   ```

3. 환경변수 예시를 실제 로컬 파일로 복사합니다.

   ```powershell
   Copy-Item -LiteralPath '.env.local.example' -Destination '.env.local'
   notepad .env.local
   ```

4. `.env.local`에 Supabase URL, anon/publishable key, 최종 `APP_URL`과 선택적인 학교 도메인을 입력합니다. 비밀값을 채팅이나 Git에 넣지 마세요.
5. Node.js 22.13 이상과 pnpm을 준비합니다. pnpm이 없다면 다음을 실행합니다.

   ```powershell
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

6. 준비·검사·의존성 설치·전체 빌드 스크립트를 실행합니다.

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\LOCAL_BUILD_AND_DEPLOY_SETUP.ps1
   ```

7. 직접 실행하려면 다음 명령을 사용할 수 있습니다.

   ```powershell
   pnpm install --frozen-lockfile
   $env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'
   pnpm exec vinext build
   pnpm exec vinext dev
   ```

8. 브라우저에서 표시된 localhost 주소와 `/login`을 열어 `Google 계정으로 로그인` 버튼을 확인합니다. 환경변수가 비어 있으면 안전한 설정 미완료 안내가 표시됩니다.

## B. Supabase 설정

1. Supabase Dashboard에서 프로젝트 URL을 확인합니다.
2. API 설정에서 anon key 또는 publishable key를 확인합니다. service role key는 이 앱에 필요하지 않습니다.
3. `Authentication → Providers → Google`에서 Google Provider를 활성화합니다.
4. Google Cloud에서 발급한 Client ID와 Client Secret을 Supabase Provider 설정에 등록합니다. Client Secret은 Supabase에만 저장합니다.
5. `Authentication → URL Configuration`의 Site URL을 실제 운영 URL로 설정합니다.
6. Redirect URLs에 로컬 주소와 운영 주소를 추가합니다.

   ```text
   http://localhost:3000/auth/callback
   https://배포도메인/auth/callback
   ```

7. 학교 계정만 허용하려면 `ALLOWED_GOOGLE_DOMAIN`에 학교 도메인을 입력합니다. 제한하지 않으려면 빈 값으로 둡니다.
8. Supabase의 익명 로그인은 비활성화합니다.

## C. Google Cloud 설정

1. Google Cloud Console에서 OAuth 동의 화면을 구성합니다.
2. Web application 유형의 OAuth Client를 생성합니다.
3. 승인된 JavaScript Origin에 로컬 주소와 운영 도메인을 등록합니다.
4. 승인된 Redirect URI에는 Supabase Dashboard가 Google Provider 설정에서 안내하는 callback URL을 정확히 등록합니다.
5. 앱 자체의 `/auth/callback`은 Supabase Redirect URL 목록에 등록합니다.
6. Google Client Secret을 소스 코드, `.env.local.example`, GitHub 또는 브라우저용 환경변수에 넣지 않습니다.

## D. GitHub 업로드

1. GitHub에서 비어 있는 새 저장소를 만듭니다.
2. 프로젝트 폴더에서 다음을 순서대로 실행합니다.

   ```powershell
   git init
   git status
   git check-ignore .env.local
   git ls-files -- .env .env.local
   git add .
   git status
   git commit -m "Deploy Hangot with Google authentication"
   git branch -M main
   git remote add origin https://github.com/사용자/저장소.git
   git push -u origin main
   ```

3. `git add` 후 `.env`, `.env.local`, 토큰, Client Secret 또는 service role key가 staged 파일에 없는지 다시 확인합니다.

## E. Vercel 배포

1. Vercel에서 GitHub 저장소를 Import합니다.
2. Framework 자동 감지 결과를 확인합니다. 이 프로젝트는 Next.js 16 기반이지만 vinext/Vite·Cloudflare 구성을 사용하므로 자동 감지가 맞지 않으면 빌드 로그를 확인하고 Cloudflare Workers/Pages 같은 vinext 호환 호스팅을 사용합니다.
3. Build Command는 우선 `pnpm exec vinext build`를 사용합니다. 호스팅 제공자가 Next.js 네이티브 빌드만 지원하면 현재 vinext 설정을 임의로 삭제하지 말고 호환 호스팅을 선택합니다.
4. 다음 환경변수 이름을 Production 환경에 등록합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_URL`
   - 필요 시 `ALLOWED_GOOGLE_DOMAIN`
5. Production 배포를 실행하고 인터넷 URL을 확인합니다.
6. `APP_URL`을 확정된 HTTPS 운영 URL로 갱신합니다.
7. Supabase Site URL·Redirect URL과 Google Cloud Origin 설정도 같은 운영 URL로 갱신한 뒤 재배포합니다.

## F. 실제 로그인 검증

1. `/login`에서 `Google 계정으로 로그인` 버튼이 표시되는지 확인합니다.
2. 버튼을 눌러 Google 계정 선택 화면으로 이동하는지 확인합니다.
3. 인증 후 운영 사이트의 `/auth/callback`으로 복귀하는지 확인합니다.
4. 페이지를 새로 고쳐도 세션이 유지되는지 확인합니다.
5. 세션 만료 전에 갱신 경로가 정상 동작하는지 확인합니다.
6. 로그아웃 후 보호 페이지에 다시 접근할 수 없는지 확인합니다.
7. 최초 사용자 역할이 `student`인지 확인합니다.
8. 학생 계정으로 `/admin`과 관리자 API 접근이 차단되는지 확인합니다.

