# 배포 후 필수 검증

## 공개 화면

- [ ] `/` 200 응답, 동아리 목록·검색·필터 동작
- [ ] 동아리 상세와 AI 추천 동작
- [ ] `/login`에서 Google 로그인 버튼 표시
- [ ] 정적 자산과 모바일 레이아웃 정상

## Google OAuth와 세션

- [ ] 운영 Google 계정 선택 화면으로 이동
- [ ] Supabase callback 후 `https://<PRODUCTION_DOMAIN>/auth/callback` 복귀
- [ ] 학교 도메인 제한이 의도대로 동작
- [ ] 새 사용자의 D1 role이 `student`
- [ ] 새로고침 후 세션 유지
- [ ] 로그아웃 후 보호 페이지 접근 차단
- [ ] 쿠키가 운영에서 Secure, HttpOnly, SameSite=Lax

## 학생 신청

- [ ] 신청 페이지 비로그인 접근 시 로그인 이동
- [ ] 정상 신청 제출과 `applicationNumber` 표시
- [ ] 동일 동아리 중복 신청 409와 안전한 문구
- [ ] 내 신청 목록·상세에 본인 데이터만 표시
- [ ] 허용 상태 취소 성공, 승인·반려·취소 상태 재취소 차단
- [ ] 이메일, Google ID, auth_user_id 미노출

## 관리자

- [ ] student/teacher의 `/admin` 및 관리자 API 접근 차단
- [ ] admin 전체 신청 조회·검색·필터
- [ ] 상태 변경과 검토 의견 저장
- [ ] `reviewed_by` 및 audit log 생성
- [ ] 교사 역할 지정·해제
- [ ] 담당 동아리 배정·중복 차단·해제

## 담당 교사

- [ ] teacher가 `/teacher/applications` 접근
- [ ] 배정 동아리 신청만 목록에 표시
- [ ] 비담당 신청 상세 404
- [ ] 비담당 신청 상태 변경 차단
- [ ] 담당 신청 검토·대기·승인·반려
- [ ] 학생 상세에 상태·검토 의견·검토 시각 반영

## D1 및 보안

- [ ] D1 binding `DB` 정상
- [ ] `users`, `applications`, `audit_logs`, `teacher_clubs` 존재
- [ ] `(user_id, club_id)` 신청 중복 제약 존재
- [ ] `(teacher_user_id, club_id)` 배정 중복 제약 존재
- [ ] 서버 오류 응답에 SQL, stack, DB 경로 없음
- [ ] Sites 변수에 service role key 또는 Google Client Secret 없음

## 모니터링 및 롤백

- [ ] 최초 30분 동안 401/403/409/500 응답 비율 확인
- [ ] OAuth callback 실패 로그 확인
- [ ] D1 쓰기 오류와 외래키 오류 확인
- [ ] 치명적 오류 시 신규 트래픽 중단, 직전 Sites 버전 롤백
- [ ] 데이터 이상 시 쓰기 기능 중단 후 사전 D1 백업 기준으로 복구 판단

하나라도 인증 우회, 타인 신청 노출, 비담당 교사 접근, D1 데이터 감소가 발견되면 즉시 배포를 중단하거나 롤백한다.
