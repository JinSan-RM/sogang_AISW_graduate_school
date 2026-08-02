import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import LegalDocumentScreen from "../../components/LegalDocumentScreen";
import { useMeQuery } from "../../hooks/useApi";
import { useUserStore } from "../../stores/userStore";

const OPERATOR_NAME = process.env.EXPO_PUBLIC_OPERATOR_NAME?.trim() || "운영 주체 승인 필요";
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || "지원 이메일 설정 필요";
const EFFECTIVE_DATE = process.env.EXPO_PUBLIC_PRIVACY_EFFECTIVE_DATE?.trim();
const POLICY_VERSION = process.env.EXPO_PUBLIC_PRIVACY_POLICY_VERSION?.trim();

const SECTIONS = [
  {
    title: "제 1조 (수집 항목)",
    body: `${OPERATOR_NAME}는 회원가입 및 서비스 제공을 위해 이름, 학교 이메일, 기수, 전공, 연락처, 비밀번호를 수집합니다.`,
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
  // {
  //   title: "5. 계정 삭제와 보존",
  //   body:
  //     "계정 삭제가 완료되면 계정·프로필·인증 정보, 세션, 푸시 토큰, 비공개·초안·숨김 콘텐츠와 비공개 증빙을 삭제합니다. 공개 게시글·댓글과 공개 맥락 유지에 필요한 첨부는 작성자 연결을 제거해 '삭제된 사용자'로 남을 수 있습니다. 법적 보존 또는 백업 만료가 필요한 경우에는 승인된 처리방침에 대상·목적·기간을 구체적으로 고지해야 합니다.",
  // },
  // {
  //   title: "6. 이용자의 권리",
  //   body:
  //     "이용자는 개인정보 열람·정정·삭제와 처리 관련 문의를 지원 창구로 요청할 수 있습니다. 앱 설정 또는 공개 계정 삭제 페이지에서 계정 삭제를 직접 요청할 수 있습니다.",
  // },
  // {
  //   title: "7. 안전성 확보",
  //   body:
  //     "전송 구간 암호화, 비밀번호 해시 저장, 접근 권한 분리, 비공개 파일의 제한된 접근 URL, 세션 폐기와 요청 제한을 적용합니다. 운영 환경의 구체적인 보호조치는 출시 전 운영 검증을 거칩니다.",
  // },
];

export default function PrivacyScreen() {
  const { data } = useMeQuery();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  return (
    <LegalDocumentScreen
      title="개인정보 수집 및 이용 동의"
      effectiveDate={EFFECTIVE_DATE}
      version={POLICY_VERSION}
      consentDate={isAuthenticated && data ? data.data.privacy_consented_at ?? null : undefined}
      sections={SECTIONS}
      footer={
        <View style={styles.footer}>
          <Pressable
            accessibilityHint="계정 삭제 방법과 공개 삭제 요청 양식을 엽니다."
            accessibilityLabel="계정 및 데이터 삭제 안내"
            accessibilityRole="link"
            onPress={() => router.push("/legal/account-deletion")}
            style={({ pressed }) => [styles.deletionLink, pressed ? styles.deletionLinkPressed : null]}
          >
            <Text style={styles.deletionLinkTitle}>계정 및 데이터 삭제</Text>
            <Text style={styles.deletionLinkBody}>
              앱에 로그인할 수 없는 경우에도 웹에서 삭제를 요청할 수 있습니다.
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="지원 및 문의 페이지"
            accessibilityRole="link"
            onPress={() => router.push("/legal/support")}
            style={({ pressed }) => [styles.deletionLink, pressed ? styles.deletionLinkPressed : null]}
          >
            <Text style={styles.deletionLinkTitle}>지원 및 개인정보 문의</Text>
            <Text style={styles.deletionLinkBody}>{SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { gap: 10 },
  deletionLink: {
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 4,
  },
  deletionLinkPressed: { opacity: 0.7 },
  deletionLinkTitle: { color: "#1D4ED8", fontSize: 14, fontWeight: "700" },
  deletionLinkBody: { color: "#4B5563", fontSize: 12, lineHeight: 18 },
});
