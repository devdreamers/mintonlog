# MintonLog — 배드민턴 대회 이력 관리 웹 설계

**날짜:** 2026-05-17
**상태:** 승인됨

---

## 개요

여러 배드민턴 앱에 흩어진 대회 이력을 한 곳에 모아 관리하고, 수상 실적을 보기 좋게 보여주는 반응형 웹 애플리케이션. 스크린샷을 업로드하면 Claude Vision AI가 대회 정보를 자동 파싱하고, 사용자가 확인/수정 후 저장한다.

**대상 사용자:** 본인 (편집), 소수 지인 (링크 열람)

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 15 App Router (SSR + API Routes) |
| 스타일 | Tailwind CSS |
| 인증 | Supabase Auth (Google OAuth) |
| 데이터베이스 | Supabase PostgreSQL |
| 파일 스토리지 | Supabase Storage |
| AI 파싱 | Claude Haiku Vision API (Anthropic SDK) |
| 배포 | Vercel |

---

## 페이지 구조

### 1. `/` — 메인 페이지 (공개, SSR)
- 상단 스탯 카드: 금/은/동 메달 수, 총 출전 횟수
- 연도·종목 필터 칩 (가로 스크롤)
- 대회 카드 리스트: 메달 뱃지 + 대회명 + 날짜·종목·장소 + 순위
- 연도별 섹션 구분 헤더
- 로그인 사용자에게만 우하단 FAB(+) 버튼 노출

### 2. `/[id]` — 대회 상세 페이지 (공개, SSR)
- 대회 기본 정보 (명칭, 날짜, 종목, 부수, 최종 순위, 장소)
- 원본 스크린샷 표시
- 경기별 스코어 타임라인 (라운드 순서대로)
  - 라운드명, 상대, 게임별 스코어 (21-15 / 18-21 / 21-18), 승/패
- 로그인 사용자에게만 편집/경기 추가 버튼 노출

### 3. `/add` — 대회 추가 (로그인 필요)
**Step 1: 업로드**
- 이미지 드래그&드롭 또는 파일 선택
- 배드민턴 앱 스크린샷, 결과표 사진 모두 허용

**Step 2: AI 파싱 확인**
- 원본 스크린샷 미리보기
- Claude Vision이 추출한 필드 표시:
  - 보라 테두리: 신뢰도 높음 (자동 채움)
  - 노랑 테두리: 신뢰도 낮음 (사용자 확인 필요)
- 수정 가능한 폼 필드: 대회명, 날짜, 종목, 부수/조, 순위/결과, 장소(선택), 메모(선택)
- 파싱 실패 시 빈 폼으로 폴백

**Step 3: 저장**

### 4. `/login` — Google 로그인 (리다이렉트 시 자동 진입)

---

## 데이터 모델

### `tournaments` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| created_at | timestamptz | 생성 시각 |
| name | text | 대회명 |
| date | date | 대회 날짜 |
| event | text | 종목 (남복/여복/혼복/단/여단) |
| category | text | 부수/조 (예: B조, A부) |
| placement | text | 최종 결과 (예: 1위, 8강) |
| venue | text | 장소 (nullable) |
| note | text | 메모 (nullable) |
| screenshot_url | text | Supabase Storage URL |

### `matches` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| tournament_id | uuid | FK → tournaments |
| round | text | 라운드명 (예: 8강, 준결승, 결승) |
| opponent | text | 상대 이름/팀 (nullable) |
| result | text | win / loss |
| scores | jsonb | 게임별 스코어 배열 |

**scores JSONB 예시:**
```json
[
  { "game": 1, "us": 21, "them": 15 },
  { "game": 2, "us": 18, "them": 21 },
  { "game": 3, "us": 21, "them": 18 }
]
```

---

## Claude Vision 파싱

- **모델:** claude-haiku-4-5 (빠르고 저렴, Vision 지원)
- **입력:** 스크린샷 base64 + 한국어 프롬프트
- **출력 JSON 스키마:**
  ```json
  {
    "name": "대회명",
    "date": "YYYY-MM-DD",
    "event": "남복|여복|혼복|단|여단",
    "category": "B조",
    "placement": "1위",
    "confidence": { "name": 0.95, "date": 0.9, "event": 0.85, "category": 0.6, "placement": 0.95 }
  }
  ```
- **신뢰도 임계값:** 0.7 미만이면 노랑 경고 표시
- **실패 처리:** JSON 파싱 실패 또는 모든 필드 신뢰도 낮음 → 빈 폼으로 폴백, 토스트 메시지

---

## 인증 & 권한

| 사용자 | 권한 |
|--------|------|
| 비로그인 | `/`, `/[id]` 읽기 전용 |
| 로그인 (본인) | 모든 페이지, 생성/수정/삭제 |

- Google OAuth 단일 계정
- `/add` 접근 시 미로그인이면 `/login`으로 리다이렉트

---

## 배포 & 환경변수

**배포:** Vercel (자동 CI/CD, GitHub 연동)

**필요한 환경변수:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## 스탯 계산 로직

메인 페이지 스탯 카드는 `tournaments` 테이블을 쿼리해 계산:
- 금: `placement = '1위'` 또는 `placement ILIKE '%우승%'`
- 은: `placement = '2위'` 또는 `placement ILIKE '%준우승%'`
- 동: `placement = '3위'` 또는 `placement ILIKE '%3위%'`
- 출전: 전체 행 수

---

## 스코프 외 (v1 미포함)

- 다중 사용자 / 팀원 계정
- 대회 앱 API 직접 연동
- 통계 그래프/차트
- PWA / 푸시 알림