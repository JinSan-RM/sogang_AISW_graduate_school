type DirectoryBoard = {
  slug: string;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
};

export const HOME_ALUMNI_DIRECTORY_URL = "https://app.rmbr.in/SPbmZjUxRzb";

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

export function homeAlumniDirectoryLink(_boards: DirectoryBoard[]): HomeAlumniDirectoryLink {
  return { status: "ready", url: HOME_ALUMNI_DIRECTORY_URL };
}
