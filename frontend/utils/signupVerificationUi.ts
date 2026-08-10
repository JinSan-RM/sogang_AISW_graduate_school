import { formatCountdown } from "./authValidation";


export function signupProgressDotIndex(step: number): number {
  return Math.max(0, step - 1);
}


export function resendAvailableAt(responseReceivedAt: number, resendInSeconds: number): number {
  return responseReceivedAt + resendInSeconds * 1000;
}


export function resendCountdownLabel(seconds: number): string {
  return seconds > 0 ? `재전송 (${formatCountdown(seconds)})` : "재전송";
}
