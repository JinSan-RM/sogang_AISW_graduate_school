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

test("홈 동문회 주소록은 게시판 설정이 없어도 지정된 리맴버 링크를 사용한다", async () => {
  const resolveLink = await directoryLinkResolver();

  assert.deepEqual(resolveLink([]), {
    status: "ready",
    url: "https://app.rmbr.in/SPbmZjUxRzb",
  });
});

test("홈 동문회 주소록은 게시판 활성 상태와 관리자 링크보다 지정된 리맴버 링크를 우선한다", async () => {
  const resolveLink = await directoryLinkResolver();

  assert.deepEqual(
    resolveLink([
      {
        slug: "alumni-directory",
        is_active: false,
        metadata: { external_url: "https://wrong.example.com/alumni" },
      },
    ]),
    { status: "ready", url: "https://app.rmbr.in/SPbmZjUxRzb" },
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
