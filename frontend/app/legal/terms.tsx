import LegalDocumentScreen from "../../components/LegalDocumentScreen";
import { useRegistrationOptionsQuery } from "../../hooks/useApi";
import {
  resolvePrivacyPolicyMetadata,
  TERMS_OF_SERVICE_SECTIONS,
} from "../../utils/privacyPolicy";

export default function TermsScreen() {
  const registrationOptionsQuery = useRegistrationOptionsQuery();
  const policyMetadata = resolvePrivacyPolicyMetadata(
    registrationOptionsQuery.data?.data.privacy_policy,
  );
  return (
    <LegalDocumentScreen
      title="이용약관"
      effectiveDate={policyMetadata.effectiveDate}
      version={policyMetadata.version}
      sections={TERMS_OF_SERVICE_SECTIONS}
    />
  );
}
