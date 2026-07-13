import LegalDocumentScreen from "../../components/LegalDocumentScreen";

const SECTIONS = [
  { title: "1. 목적", body: "본 약관은 서강대학교 AI·SW대학원 커뮤니티 앱이 제공하는 회원 인증, 공지, 일정, 게시판 및 원우회 서비스의 이용 조건을 정합니다." },
  { title: "2. 회원 계정", body: "회원은 본인의 @sogang.ac.kr 이메일로 인증해야 하며 계정과 비밀번호를 안전하게 관리해야 합니다. 타인의 계정을 사용하거나 인증 정보를 양도할 수 없습니다." },
  { title: "3. 커뮤니티 이용", body: "회원은 타인의 권리와 개인정보를 침해하거나 불법·광고·혐오·괴롭힘 콘텐츠를 게시해서는 안 됩니다. 운영진은 신고된 콘텐츠를 검토하고 숨김 또는 삭제할 수 있습니다." },
  { title: "4. 운영 콘텐츠", body: "공지, 일정, FAQ 및 원우회 답변은 운영진이 관리합니다. 외부 링크와 일정은 원문 기관의 변경에 따라 달라질 수 있습니다." },
  { title: "5. 서비스 변경 및 중단", body: "점검, 장애, 학교 정책 변경 또는 불가피한 사유로 서비스의 일부가 변경되거나 일시 중단될 수 있습니다." },
  { title: "6. 문의", body: "서비스 및 콘텐츠 관련 문의는 앱의 원우회 메뉴 또는 운영진에게 전달해주세요." },
];

export default function TermsScreen() {
  return <LegalDocumentScreen title="이용약관" effectiveDate="2026-07-12" sections={SECTIONS} />;
}
