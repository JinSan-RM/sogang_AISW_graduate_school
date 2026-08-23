import assert from "node:assert/strict";
import test from "node:test";

type DirectoryBoard = {
  slug: string;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
};

type DirectoryLinkState =
  | { status: "ready"; url: string }
  | { status: "missing" }
  | { status: "invalid" };

type DirectoryLinkResolver = (boards: DirectoryBoard[]) => DirectoryLinkState;
type DirectoryErrorReason = "missing" | "invalid" | "open_failed";
type DirectoryErrorMessageResolver = (reason: DirectoryErrorReason) => string;

async function directoryLinkResolver() {
  const module = await import("../utils/homeAlumniDirectory").catch(() => ({}));
  const resolver = (module as { homeAlumniDirectoryLink?: DirectoryLinkResolver }).homeAlumniDirectoryLink;
  if (!resolver) assert.fail("homeAlumniDirectoryLink must be exported");
  return resolver;
}

async function directoryErrorMessageResolver() {
  const module = await import("../utils/homeAlumniDirectory").catch(() => ({}));
  const resolver = (module as { homeAlumniDirectoryErrorMessage?: DirectoryErrorMessageResolver }).homeAlumniDirectoryErrorMessage;
  if (!resolver) assert.fail("homeAlumniDirectoryErrorMessage must be exported");
  return resolver;
}

test("홈 동문회 주소록은 활성 alumni-directory에 관리자가 입력한 HTTPS 링크를 사용한다", async () => {
  const resolveLink = await directoryLinkResolver();

  assert.deepEqual(
    resolveLink([
      { slug: "networking-programs", is_active: true, metadata: { external_url: "https://wrong.example.com" } },
      { slug: "alumni-directory", is_active: true, metadata: { external_url: "  https://remember.example.com/alumni  " } },
    ]),
    { status: "ready", url: "https://remember.example.com/alumni" },
  );
});

test("홈 동문회 주소록은 누락 링크와 잘못된 링크를 구분한다", async () => {
  const resolveLink = await directoryLinkResolver();

  assert.deepEqual(
    resolveLink([{ slug: "alumni-directory", is_active: false, metadata: { external_url: "https://remember.example.com/alumni" } }]),
    { status: "missing" },
  );
  assert.deepEqual(
    resolveLink([{ slug: "alumni-directory", is_active: true, metadata: { external_url: "javascript:alert(1)" } }]),
    { status: "invalid" },
  );
});

test("앞선 링크 키가 비었거나 잘못돼도 뒤의 유효한 HTTP(S) 링크를 사용한다", async () => {
  const resolveLink = await directoryLinkResolver();

  assert.deepEqual(
    resolveLink([{
      slug: "alumni-directory",
      is_active: true,
      metadata: {
        notion_url: " ",
        external_url: "javascript:alert(1)",
        url: " https://directory.example.com/alumni ",
      },
    }]),
    { status: "ready", url: "https://directory.example.com/alumni" },
  );
});

test("주소록 오류 안내는 누락·잘못된 형식·열기 실패를 제공자명 없이 구분한다", async () => {
  const resolveMessage = await directoryErrorMessageResolver();
  const messages = {
    missing: resolveMessage("missing"),
    invalid: resolveMessage("invalid"),
    open_failed: resolveMessage("open_failed"),
  };

  assert.deepEqual(messages, {
    missing: "관리자 페이지에서 주소록 링크를 등록해 주세요.",
    invalid: "등록된 주소록 링크 형식이 올바르지 않습니다. 관리자 페이지에서 주소를 확인해 주세요.",
    open_failed: "등록된 주소록 링크를 열 수 없습니다. 주소를 확인해 주세요.",
  });
  for (const message of Object.values(messages)) {
    assert.doesNotMatch(message, /리멤버/);
  }
});
