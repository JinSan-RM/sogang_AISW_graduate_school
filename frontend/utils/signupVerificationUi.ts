import { formatCountdown } from "./authValidation";


export function signupProgressDotIndex(step: number): number {
  return Math.max(0, step - 1);
}


export function resendAvailableAt(responseReceivedAt: number, resendInSeconds: number): number {
  return responseReceivedAt + resendInSeconds * 1000;
}


// 평상시에는 "재전송 (04:59)"로 붙여 보여준다. 옆에 상태 메시지("새 인증코드가
// 발송되었어요.")가 이미 떠 있을 때는 라벨이 중복이라 남은 시간만 보여준다.
export function resendCountdownLabel(seconds: number, options?: { timerOnly?: boolean }): string {
  if (seconds <= 0) return "재전송";
  return options?.timerOnly ? formatCountdown(seconds) : `재전송 (${formatCountdown(seconds)})`;
}
