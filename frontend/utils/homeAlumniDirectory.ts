type DirectoryBoard = {
  slug: string;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
};

const EXTERNAL_LINK_KEYS = ["notion_url", "external_url", "url", "link"] as const;

export type HomeAlumniDirectoryLink =
  | { status: "ready"; url: string }
  | { status: "missing" }
  | { status: "invalid" };

export type HomeAlumniDirectoryErrorReason = Exclude<HomeAlumniDirectoryLink["status"], "ready"> | "open_failed";

export function homeAlumniDirectoryErrorMessage(reason: HomeAlumniDirectoryErrorReason) {
  if (reason === "missing") {
    return "관리자 페이지에서 주소록 링크를 등록해 주세요.";
  }
  if (reason === "invalid") {
    return "등록된 주소록 링크 형식이 올바르지 않습니다. 관리자 페이지에서 주소를 확인해 주세요.";
  }
  return "등록된 주소록 링크를 열 수 없습니다. 주소를 확인해 주세요.";
}

export function homeAlumniDirectoryLink(boards: DirectoryBoard[]): HomeAlumniDirectoryLink {
  const board = boards.find((item) => item.slug === "alumni-directory" && item.is_active !== false);
  if (!board) return { status: "missing" };

  const candidates = EXTERNAL_LINK_KEYS
    .map((key) => board?.metadata?.[key])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (candidates.length === 0) return { status: "missing" };

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return { status: "ready", url: candidate };
      }
    } catch {
      // 다음 호환 metadata 키에 유효한 주소가 있는지 계속 확인한다.
    }
  }

  return { status: "invalid" };
}
