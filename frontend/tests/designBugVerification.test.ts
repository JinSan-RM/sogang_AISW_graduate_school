import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

const tabLayoutSource = source("app/(tabs)/_layout.tsx");
const homeSource = source("app/(tabs)/home.tsx");
const noticeListSource = source("app/(tabs)/notices.tsx");
const boardSource = source("app/board/[boardId].tsx");
const postDetailSource = source("app/board/post/[postId].tsx");
const postCreateSource = source("app/board/post/create.tsx");
const postEditSource = source("app/board/post/edit/[postId].tsx");
const mutualAidCompleteSource = source("app/council/mutual-aid-complete.tsx");
const searchSource = source("app/search.tsx");
const loginSource = source("app/auth/login.tsx");
const eventsSource = source("app/events.tsx");
const councilSource = source("app/(tabs)/council.tsx");
const schoolEmailSource = source("components/SchoolEmailInput.tsx");
const legalDocumentSource = source("components/LegalDocumentScreen.tsx");
const myPageDrawerSource = source("components/MyPageDrawer.tsx");
const postCardSource = source("components/PostCard.tsx");
const fontSource = source("utils/fonts.ts");
const qaComposeSource = source("../docker-compose.qa.yml");

test("global font patch flattens styles before they reach React DOM", () => {
  assert.match(fontSource, /style: \{ \.\.\.hostStyle, fontFamily \}/);
  assert.doesNotMatch(fontSource, /style: StyleSheet\.flatten\(\[\{ fontFamily \}, style\]\)/);
  assert.doesNotMatch(fontSource, /style: \[\{ fontFamily \}, style\]/);
});

test("QA frontend restart clears Metro before serving updated web styles", () => {
  assert.match(qaComposeSource, /npm run web -- --host lan --clear/);
});

test("QA 인증코드 재전송 제한은 운영과 같은 5분을 유지한다", () => {
  assert.match(qaComposeSource, /EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: "300"/);
  assert.match(qaComposeSource, /PASSWORD_RESET_RESEND_COOLDOWN_SECONDS: "300"/);
});

test("#2 메인 배너는 설정된 목적지로 직접 이동한다", () => {
  assert.match(homeSource, /const linkHref = banner\.cta_href\?\.trim\(\)/);
  assert.match(homeSource, /router\.push\(linkHref as never\)/);
  assert.doesNotMatch(homeSource, /banner\/preview|banner\/detail/);
});

test("#66·67·68 홈과 하단 탭은 디자인 기준 아이콘과 정렬을 사용한다", () => {
  assert.match(tabLayoutSource, /<HomeTabIcon color=\{color\} size=\{22\} \/>/);
  assert.match(tabLayoutSource, /<NoticeTabIcon color=\{color\} size=\{22\} \/>/);
  assert.match(homeSource, /name="chatbubble-outline"/);
  assert.match(homeSource, /name="heart-outline"/);
  assert.match(homeSource, /dayText:[\s\S]*lineHeight: 16/);
  assert.match(homeSource, /dayText:[\s\S]*textAlign: "center"/);
  assert.match(homeSource, /name="chatbubble-outline" size=\{11\}/);
});

test("#5·6·7·11·18 공지와 스터디의 태그 문구 및 상태를 실제 메타데이터에서 만든다", () => {
  assert.match(searchSource, /label: "행사공지"/);
  assert.match(searchSource, /label: "기타공지"/);
  assert.match(postCardSource, /resourceCategoryLabel/);
  assert.match(postDetailSource, /label\.includes\("기타"\).*#F0EEF9.*#5A4C8B/);
  assert.match(postCardSource, /post\.metadata\?\.recruitment_status/);
  assert.match(postDetailSource, /metadata\.recruitment_status/);
});

test("#29·31 상조회 입력 안내는 일반 굵기이고 상세 비고는 증빙서류 바로 앞에 표시된다", () => {
  const noteIndex = postDetailSource.indexOf(">비고</Text>");
  const evidenceIndex = postDetailSource.indexOf(">증빙서류</Text>");
  assert.ok(noteIndex >= 0, "상조회 상세의 비고 부제를 찾을 수 없습니다.");
  assert.ok(evidenceIndex >= 0, "상조회 상세의 증빙서류 부제를 찾을 수 없습니다.");
  assert.ok(noteIndex < evidenceIndex, "비고는 증빙서류보다 먼저 표시되어야 합니다.");
  assert.match(postDetailSource, /!isMutualAidRequest && post\.content\.trim\(\)/);
  assert.match(postCreateSource, /placeholderTextColor="#A6ACB7"/);
  assert.match(postCreateSource, /input:[\s\S]*fontWeight: "400"/);
});

test("#48 완료 화면은 공통 CompletionState를 공유한다", () => {
  assert.match(postCreateSource, /<CompletionState/);
  assert.match(mutualAidCompleteSource, /<CompletionState/);
});

test("#38·39 기본 프로필과 개인정보 동의 상태는 임의 값을 만들지 않는다", () => {
  assert.match(myPageDrawerSource, /name="person"/);
  assert.match(legalDocumentSource, /Boolean\(consentLabel\)/);
  assert.doesNotMatch(legalDocumentSource, /consentLabel \|\|/);
});

test("#59·60·61 로그인 입력은 웹 네이티브 이메일 검증과 기본 포커스 외곽선을 피한다", () => {
  assert.match(schoolEmailSource, /inputMode=\{Platform\.OS === "web" \? "text" : "email"\}/);
  assert.match(schoolEmailSource, /keyboardType=\{Platform\.OS === "web" \? "default" : "email-address"\}/);
  assert.match(schoolEmailSource, /outlineStyle: "none"/);
  assert.match(loginSource, /outlineStyle: "none"/);
});

test("#62·63 공지 목록은 공통 로딩과 중앙 빈 상태 레이아웃을 사용한다", () => {
  assert.match(noticeListSource, /<LoadingState compact \/>/);
  assert.match(eventsSource, /<LoadingState \/>/);
  assert.match(councilSource, /return <LoadingState \/>/);
  assert.match(noticeListSource, /listContentEmpty:[\s\S]*flexGrow: 1/);
  assert.match(noticeListSource, /emptyState:[\s\S]*justifyContent: "center"/);
});

test("#64·65 상세 더보기와 북마크는 디자인 아이콘과 하단 시트를 사용한다", () => {
  assert.match(postDetailSource, /<BookmarkIcon filled=\{isBookmarked\}/);
  assert.match(postDetailSource, /<MoreIcon color=\{COLORS\.text\} \/>/);
  assert.match(postDetailSource, /style=\{styles\.menuSheet\}/);
  assert.match(postDetailSource, /<FlagIcon size=\{20\}/);
  assert.match(postDetailSource, /name="remove-circle-outline"/);
});

test("#71 게시글 수정 화면은 제목과 내용 입력을 게시판 종류와 관계없이 노출한다", () => {
  assert.match(postEditSource, /accessibilityLabel="제목"/);
  assert.match(postEditSource, /accessibilityLabel="내용"/);
  assert.doesNotMatch(postEditSource, /isStudyRecruit \? <Text style=\{styles\.fieldLabel\}>(?:제목|내용)<\/Text>/);

  for (const label of ["모집 상태", "스터디장 연락수단"]) {
    assert.match(postEditSource, new RegExp(`>${label}<`));
  }
});

test("#73 운영진 화면은 실제 데이터만 사용하고 소개 필드를 보존한다", () => {
  assert.doesNotMatch(boardSource, /DEFAULT_EXECUTIVES/);
  assert.doesNotMatch(boardSource, /윤OO/);
  assert.match(boardSource, /member\.intro/);
});
