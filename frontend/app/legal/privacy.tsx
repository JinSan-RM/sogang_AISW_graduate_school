import { useQuery } from "@tanstack/react-query";

import LegalDocumentScreen from "../../components/LegalDocumentScreen";
import { registrationApi } from "../../services/api";

const SECTIONS = [
  { title: "1. 수집 항목", body: "필수 항목은 이름, 학교 이메일, 기수, 전공 및 비밀번호입니다. 연락처, 프로필 사진, 회사·직무 정보는 선택 항목입니다. 서비스 이용 과정에서 접속 기록, 게시물, 댓글, 신고 및 알림 정보가 생성될 수 있습니다." },
  { title: "2. 이용 목적", body: "회원 인증, 커뮤니티 운영, 공지·일정 제공, 원우회 업무 처리, 신고 대응, 보안 및 서비스 품질 개선을 위해 개인정보를 이용합니다." },
  { title: "3. 보유 기간", body: "회원 정보는 탈퇴 또는 계정 비활성화 시까지 보유합니다. 분쟁 대응과 법령상 의무가 있는 정보는 필요한 기간 동안 제한적으로 보관할 수 있습니다." },
  { title: "4. 제3자 제공", body: "법령상 요구가 있거나 회원이 별도로 동의한 경우를 제외하고 개인정보를 외부에 제공하지 않습니다." },
  { title: "5. 안전조치", body: "비밀번호는 복구할 수 없는 해시로 저장하고 인증 토큰과 경조사 증빙 파일에 접근 통제를 적용합니다. 운영 권한은 관리자 계정으로 제한합니다." },
  { title: "6. 회원의 권리", body: "회원은 프로필에서 개인정보를 열람·수정할 수 있으며 계정 설정에서 탈퇴를 요청할 수 있습니다. 개인정보 관련 문의는 앱 운영진에게 전달해주세요." },
];

export default function PrivacyScreen() {
  const optionsQuery = useQuery({ queryKey: ["registration-options"], queryFn: registrationApi.getOptions, staleTime: 60_000 });
  const policy = optionsQuery.data?.data.privacy_policy;
  return (
    <LegalDocumentScreen
      title="개인정보 처리방침"
      effectiveDate={policy?.effective_at.slice(0, 10) ?? "2026-07-12"}
      version={policy?.version ?? "2026-07-12"}
      sections={SECTIONS}
    />
  );
}
