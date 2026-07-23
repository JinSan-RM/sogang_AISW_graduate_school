import axios from "axios";

export const MAJOR_OPTIONS = ["인공지능", "소프트웨어", "블록체인", "데이터사이언스·인공지능"] as const;

export function composeSchoolEmail(emailId: string) {
  return `${emailId.trim().toLowerCase()}@sogang.ac.kr`;
}

export function emailIdError(emailId: string) {
  const value = emailId.trim();
  if (!value) return "이메일 ID를 입력해주세요.";
  if (!/^[a-zA-Z0-9._%+-]+$/.test(value)) return "올바른 이메일 ID 형식이 아니에요.";
  return null;
}

export function passwordError(password: string) {
  if (!password) return "비밀번호를 입력해주세요.";
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "영문, 숫자, 특수문자를 포함해 8자 이상 입력해주세요.";
  }
  return null;
}

export function phoneError(phone: string) {
  if (!phone) return "연락처를 입력해주세요.";
  if (!/^01[016789]\d{7,8}$/.test(phone)) return "올바른 연락처 형식이 아니에요.";
  return null;
}

export function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function apiErrorCode(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.data?.code as string | undefined;
}

export function apiErrorStatus(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.status;
}
