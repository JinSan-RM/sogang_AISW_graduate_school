import { resendCountdownLabel } from "./signupVerificationUi";

type PasswordResetResendControlOptions = {
  verificationExpired: boolean;
  verificationAttemptsLocked: boolean;
  isSubmitting: boolean;
  resendCooldown: number;
};

export function passwordResetResendControl(options: PasswordResetResendControlOptions) {
  return {
    visible: !options.verificationExpired && !options.verificationAttemptsLocked,
    disabled: options.isSubmitting || options.resendCooldown > 0,
    label: options.isSubmitting ? "발송 중" : resendCountdownLabel(options.resendCooldown),
  };
}
