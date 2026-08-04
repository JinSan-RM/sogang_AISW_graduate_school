export type PrivacyPolicySection = { title: string; body: string };

export const PRIVACY_POLICY_OPERATOR_NAME =
  process.env.EXPO_PUBLIC_OPERATOR_NAME?.trim() || "운영 주체 승인 필요";
export const PRIVACY_POLICY_SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || "지원 이메일 설정 필요";
export const PRIVACY_POLICY_EFFECTIVE_DATE =
  process.env.EXPO_PUBLIC_PRIVACY_EFFECTIVE_DATE?.trim();
export const PRIVACY_POLICY_VERSION =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_VERSION?.trim();

export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    title: "제 1조 (수집 항목)",
    body: `${PRIVACY_POLICY_OPERATOR_NAME}는 회원가입 및 서비스 제공을 위해 이름, 학교 이메일, 기수, 전공, 연락처, 비밀번호를 수집합니다.`,
  },
  {
    title: "제 2조 (수집 목적)",
    body:
      "수집된 개인정보는 회원 식별, 학사 정보 안내, 커뮤니티 서비스 제공, 원우회 운영을 위한 목적으로만 사용됩니다.",
  },
  {
    title: "제 3조 (보유 및 이용기간)",
    body:
      "회원 탈퇴 시 즉시 파기하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.",
  },
  {
    title: "제 4조 (동의 거부 권리)",
    body:
      "개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있으며, 동의하지 않을 경우 서비스 이용이 제한될 수 있습니다.",
  },
];

export function hasReachedPrivacyPolicyEnd({
  contentHeight,
  viewportHeight,
  offsetY,
  threshold = 16,
}: {
  contentHeight: number;
  viewportHeight: number;
  offsetY: number;
  threshold?: number;
}) {
  if (contentHeight <= 0 || viewportHeight <= 0) return false;
  return offsetY + viewportHeight >= contentHeight - threshold;
}
