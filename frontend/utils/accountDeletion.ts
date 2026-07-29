export const ACCOUNT_DELETION_CONFIRMATION = "계정 삭제";

export const ACCOUNT_DELETION_ITEMS = [
  "계정과 이름, 학교 이메일, 기수, 전공, 연락처 등 계정 개인정보가 삭제됩니다.",
  "비공개 게시글·댓글·증빙 파일과 좋아요, 북마크, 검색 기록, 알림, 로그인 세션이 삭제됩니다.",
  "공개 게시글·댓글 본문은 커뮤니티 기록을 위해 작성자 연결을 제거한 상태로 유지됩니다.",
  "유지되는 공개 첨부 파일은 계정과 연결되지 않도록 소유자와 원본 파일명이 익명화됩니다.",
] as const;

export const ACCOUNT_RETENTION_NOTICE =
  "계정 개인정보에 별도의 임의 보존 기간을 두지 않습니다. 공개 게시글·댓글과 그 표시에 필요한 공개 첨부만 작성자를 식별할 수 없도록 익명화해 유지합니다.";

export function isDeletionConfirmationValid(value: string) {
  return value.trim() === ACCOUNT_DELETION_CONFIRMATION;
}

export function isAccountDeletionCodeValid(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function accountDeletionErrorMessage(status?: number, code?: string) {
  if (code === "ADMIN_ACCOUNT_DELETION_FORBIDDEN") {
    return "관리자 계정은 운영 권한과 책임을 다른 관리자에게 이전하고 일반 회원으로 변경한 뒤 삭제할 수 있습니다.";
  }
  if (status === 401) {
    return "로그인 세션이 만료되었습니다. 다시 로그인한 뒤 시도해주세요.";
  }
  if (status === 403 || code === "FORBIDDEN") {
    return "현재 비밀번호가 일치하지 않습니다.";
  }
  if (status === 429 || code === "RATE_LIMITED") {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }
  if (status === 0) {
    return "서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.";
  }
  return "계정 삭제 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function publicAccountDeletionErrorMessage(status?: number, code?: string) {
  if (code === "ADMIN_ACCOUNT_DELETION_FORBIDDEN") {
    return "관리자 계정은 운영 권한과 책임을 이전하고 일반 회원으로 변경한 뒤 삭제할 수 있습니다.";
  }
  if (status === 429 || code === "RATE_LIMITED") {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }
  if (code === "ACCOUNT_DELETION_INVALID" || status === 400) {
    return "요청 정보를 확인할 수 없거나 인증 코드가 만료되었습니다. 이메일, 인증 코드와 비밀번호를 확인해주세요.";
  }
  if (status === 0) {
    return "서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.";
  }
  return "계정 삭제 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}
