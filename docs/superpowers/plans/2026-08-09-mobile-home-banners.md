# Mobile Home Banners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 홈 배너용 640×400 PNG 3종을 제작하고 현재 열린 QA 관리자 화면에 활성 배너로 등록한다.

**Architecture:** 각 배너는 독립된 래스터 이미지 자산으로 생성하며 앱 코드는 변경하지 않는다. 생성 결과는 프로젝트 자산 폴더에 보존하고, 관리자 API를 사용하는 기존 배너 등록 UI로 업로드한 뒤 홈 화면에서 최종 노출을 검증한다.

**Tech Stack:** OpenAI ImageGen, PNG, React Native/Expo 관리자 UI, FastAPI 배너·미디어 API

## Global Constraints

- 각 결과물은 640×400px, 8:5 비율의 PNG다.
- 블루·퍼플 중심의 현대적인 디지털 일러스트 스타일을 사용한다.
- 글자, 로고, 워터마크, 식별 가능한 얼굴을 포함하지 않는다.
- 우측 하단 페이지 표시 영역과 가장자리에는 핵심 피사체를 두지 않는다.
- 기존 앱 코드와 배너 동작은 변경하지 않는다.
- 사용자가 열어둔 QA 관리자 세션에 배너 3개를 활성 상태로 등록한다.

---

### Task 1: 모바일 배너 이미지 3종 생성

**Files:**
- Create: `frontend/assets/banners/home-banner-mobile-ai.png`
- Create: `frontend/assets/banners/home-banner-mobile-community.png`
- Create: `frontend/assets/banners/home-banner-mobile-campus.png`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-09-mobile-home-banner-design.md`
- Produces: 관리자 UI에서 업로드할 수 있는 PNG 파일 3개

- [x] **Step 1: AI 학습 배너 생성**

  ImageGen으로 8:5 가로 구도, 블루 중심 노트북·연결 노드·데이터 흐름 장면을 생성한다. 글자·로고·워터마크·식별 가능한 얼굴은 제외하고 우측 하단을 비운다.

- [x] **Step 2: 커뮤니티 배너 생성**

  ImageGen으로 8:5 가로 구도, 퍼플 중심 추상 인물 실루엣·대화·연결 요소 장면을 생성한다. 글자·로고·워터마크·식별 가능한 얼굴은 제외하고 우측 하단을 비운다.

- [x] **Step 3: 캠퍼스 행사 배너 생성**

  ImageGen으로 8:5 가로 구도, 블루·퍼플 혼합 캠퍼스 공간·달력·행사를 암시하는 장면을 생성한다. 글자·로고·워터마크·식별 가능한 얼굴은 제외하고 우측 하단을 비운다.

- [x] **Step 4: 결과 파일 검증**

  각 파일을 시각 검사하고 파일 형식, 크기, 비율, 금지 요소 부재를 확인한다. 프로젝트 폴더에 위 파일명으로 저장한다.

### Task 2: QA 관리자 배너 등록

**Files:**
- Consume: `frontend/assets/banners/home-banner-mobile-ai.png`
- Consume: `frontend/assets/banners/home-banner-mobile-community.png`
- Consume: `frontend/assets/banners/home-banner-mobile-campus.png`

**Interfaces:**
- Consumes: Task 1의 PNG 파일 3개와 사용자가 열어둔 인증된 QA 관리자 세션
- Produces: 활성 상태의 홈 배너 레코드 3개

- [ ] **Step 1: 관리자 배너 섹션 확인**

  열린 관리자 화면에서 배너 관리 섹션과 현재 등록 목록을 확인한다. 기존 배너는 수정하거나 숨기지 않는다.

- [ ] **Step 2: AI 학습 배너 등록**

  신규 배너를 만들고 모바일 이미지 슬롯에 `home-banner-mobile-ai.png`를 업로드한다. 활성 상태로 저장하고 성공 표시를 확인한다.

- [ ] **Step 3: 커뮤니티 배너 등록**

  신규 배너를 만들고 모바일 이미지 슬롯에 `home-banner-mobile-community.png`를 업로드한다. 활성 상태로 저장하고 성공 표시를 확인한다.

- [ ] **Step 4: 캠퍼스 행사 배너 등록**

  신규 배너를 만들고 모바일 이미지 슬롯에 `home-banner-mobile-campus.png`를 업로드한다. 활성 상태로 저장하고 성공 표시를 확인한다.

- [ ] **Step 5: 관리자 목록 검증**

  배너 목록에 새 항목 3개가 활성 상태로 존재하고 각 항목에 이미지 표시가 있는지 확인한다.

### Task 3: 홈 화면 노출 확인

**Files:**
- No file changes

**Interfaces:**
- Consumes: Task 2에서 등록된 활성 배너 3개
- Produces: QA 홈 캐러셀 노출 검증 결과

- [ ] **Step 1: QA 홈 화면 새로고침**

  인증된 QA 홈 화면을 새로고침해 배너 조회 캐시를 갱신한다.

- [ ] **Step 2: 캐러셀 확인**

  3개 배너가 8:5 비율로 표시되고 페이지 표시가 `1/3`부터 시작하는지 확인한다.

- [ ] **Step 3: 브라우저 오류 확인**

  콘솔 오류가 없고 배너 이미지 요청이 성공하는지 확인한다.
