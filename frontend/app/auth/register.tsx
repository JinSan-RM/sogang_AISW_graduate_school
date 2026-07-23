import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SchoolEmailInput from "../../components/SchoolEmailInput";
import { authApi, registrationApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import type { AuthSession } from "../../types";
import {
  apiErrorCode,
  composeSchoolEmail,
  emailIdError,
  formatCountdown,
  passwordError,
  phoneError,
} from "../../utils/authValidation";

const COLORS = {
  primary: "#2761FF", // primary/500
  primary50: "#EDF2FE",
  text: "#15171C", // gray/900 (Figma)
  muted: "#6B7280", // gray/600
  subtle: "#A6ACB7", // placeholder
  tertiary: "#8A919C", // gray/500, text/tertiary
  border: "#E1E4E9", // border/default
  danger: "#D64545", // error/500 (Figma)
  success: "#22A163",
  bg: "#FFFFFF",
};

type FieldErrors = Partial<Record<"email" | "code" | "nickname" | "cohort" | "major" | "phone" | "password" | "passwordConfirm" | "consent" | "form", string>>;
type VerificationMessage = { type: "success" | "error"; text: string } | null;
type VerificationFailureState = "expired" | "attempts" | null;

function StepDots({ step }: { step: number }) {
  return (
    <View style={styles.stepDots}>
      {[0, 1, 2].map((item) => <View key={item} style={[styles.stepDot, step === item ? styles.stepDotActive : null]} />)}
    </View>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  ) : null;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const setSession = useUserStore((state) => state.setSession);
  const [step, setStep] = useState(0);
  const [emailId, setEmailId] = useState("");
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const verificationExpiresAtRef = useRef(0);
  const resendAvailableAtRef = useRef(0);
  const [verificationMessage, setVerificationMessage] = useState<VerificationMessage>(null);
  const [verificationFailureState, setVerificationFailureState] = useState<VerificationFailureState>(null);
  const [nickname, setNickname] = useState("");
  const [cohort, setCohort] = useState("");
  const [major, setMajor] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [consented, setConsented] = useState(false);
  const [majorModalVisible, setMajorModalVisible] = useState(false);
  const [profileValidationAttempted, setProfileValidationAttempted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [createdSession, setCreatedSession] = useState<AuthSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrationOptionsQuery = useQuery({
    queryKey: ["registration-options"],
    queryFn: registrationApi.getOptions,
    staleTime: 60_000,
  });
  const majorOptions = registrationOptionsQuery.data?.data.majors ?? [];
  const privacyPolicy = registrationOptionsQuery.data?.data.privacy_policy;

  const email = composeSchoolEmail(emailId);

  useEffect(() => {
    if (step !== 1) return;
    const updateTimers = () => {
      const now = Date.now();
      setCountdown(Math.max(0, Math.ceil((verificationExpiresAtRef.current - now) / 1000)));
      setResendCooldown(Math.max(0, Math.ceil((resendAvailableAtRef.current - now) / 1000)));
    };
    updateTimers();
    const timer = setInterval(updateTimers, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const goBack = () => {
    if (step === 1 || step === 2) {
      setErrors({});
      setVerificationMessage(null);
      setStep((value) => value - 1);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/auth/login");
  };

  const requestCode = async (resend = false) => {
    const emailError = emailIdError(emailId);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    try {
      setIsSubmitting(true);
      setErrors({});
      setVerificationMessage(null);
      const response = await authApi.requestRegisterVerification({ email });
      if (response.data.email_sent === false) {
        setErrors({ email: "인증 메일을 발송하지 못했어요. 잠시 후 다시 시도해주세요." });
        return;
      }
      setCode("");
      setVerificationToken("");
      const requestedAt = Date.now();
      verificationExpiresAtRef.current = requestedAt + response.data.expires_in * 1000;
      const resendIn = response.data.resend_in ?? response.data.expires_in;
      resendAvailableAtRef.current = requestedAt + resendIn * 1000;
      setCountdown(response.data.expires_in);
      setResendCooldown(resendIn);
      setStep(1);
      setVerificationFailureState(null);
      setVerificationMessage({ type: "success", text: resend ? "새 인증코드가 발송되었어요." : "인증코드가 발송되었어요." });
    } catch (error) {
      const errorCode = apiErrorCode(error);
      const message =
        errorCode === "CONFLICT"
          ? "이미 가입된 이메일이에요."
          : errorCode === "VERIFICATION_RESEND_COOLDOWN"
            ? "인증코드는 5분 후 다시 요청할 수 있어요."
            : "인증코드를 발송하지 못했어요. 잠시 후 다시 시도해주세요.";
      if (resend) {
        setVerificationMessage({ type: "error", text: message });
      } else {
        setErrors({ email: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (Date.now() >= verificationExpiresAtRef.current) {
      setVerificationFailureState("expired");
      setErrors({ code: "인증 시간이 만료되었어요. 재전송을 눌러주세요." });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setVerificationFailureState(null);
      setErrors({ code: "인증코드 6자리를 입력해주세요." });
      return;
    }
    try {
      setIsSubmitting(true);
      setErrors({});
      const response = await authApi.verifyRegisterEmail({ email, code });
      setVerificationToken(response.data.verification_token);
      setVerificationMessage(null);
      setStep(2);
    } catch (error) {
      const errorCode = apiErrorCode(error);
      const message =
        errorCode === "VERIFICATION_EXPIRED"
          ? "인증 시간이 만료되었어요. 재전송을 눌러주세요."
          : errorCode === "VERIFICATION_ATTEMPTS_EXCEEDED"
            ? "인증 시도 횟수를 초과했어요. 잠시 후 다시 시도해주세요."
            : "인증코드가 일치하지 않아요.";
      setErrors({ code: message });
      setVerificationFailureState(
        errorCode === "VERIFICATION_EXPIRED"
          ? "expired"
          : errorCode === "VERIFICATION_ATTEMPTS_EXCEEDED"
            ? "attempts"
            : null
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateProfile = () => {
    setProfileValidationAttempted(true);
    const nextErrors: FieldErrors = {};
    if (!nickname.trim()) nextErrors.nickname = "이름을 입력해주세요.";
    if (!/^\d{1,3}$/.test(cohort)) nextErrors.cohort = "기수는 숫자만 입력해주세요.";
    if (!major) nextErrors.major = "전공을 선택해주세요.";
    const nextPhoneError = phoneError(phone);
    if (nextPhoneError) nextErrors.phone = nextPhoneError;
    const nextPasswordError = passwordError(password);
    if (nextPasswordError) nextErrors.password = nextPasswordError;
    if (!passwordConfirm) nextErrors.passwordConfirm = "비밀번호를 다시 입력해주세요.";
    else if (password !== passwordConfirm) nextErrors.passwordConfirm = "비밀번호가 일치하지 않아요.";
    if (!consented) nextErrors.consent = "개인정보 수집 및 이용 동의가 필요해요.";
    if (!privacyPolicy) nextErrors.consent = "개인정보 처리방침 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const register = async () => {
    if (!verificationToken) {
      setErrors({ form: "학교 이메일 인증을 다시 진행해주세요." });
      setStep(0);
      return;
    }
    if (!validateProfile()) return;
    try {
      setIsSubmitting(true);
      const response = await authApi.register({
        verification_token: verificationToken,
        password,
        nickname: nickname.trim(),
        cohort,
        major,
        phone,
        privacy_policy_version: privacyPolicy?.version ?? "",
        privacy_consent: consented,
      });
      setCreatedSession(response.data);
      setErrors({});
      setStep(3);
    } catch (error) {
      const errorCode = apiErrorCode(error);
      if (errorCode === "PRIVACY_POLICY_VERSION_MISMATCH") {
        setConsented(false);
        await registrationOptionsQuery.refetch();
        setErrors({ consent: "개인정보 처리방침이 변경되었어요. 내용을 확인하고 다시 동의해주세요." });
        return;
      }
      if (errorCode === "VALIDATION_ERROR") {
        setMajor("");
        await registrationOptionsQuery.refetch();
        setErrors({ major: "현재 선택할 수 있는 전공을 다시 선택해주세요." });
        return;
      }
      setErrors({
        nickname: errorCode === "NICKNAME_CONFLICT" ? "이미 사용 중인 이름이에요." : undefined,
        form: errorCode === "NICKNAME_CONFLICT" ? undefined : "회원가입을 완료하지 못했어요. 입력 정보와 인증 상태를 확인해주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const complete = () => {
    if (createdSession) setSession(createdSession);
    router.replace("/(tabs)/home");
  };

  const isProfileFormValid =
    Boolean(nickname.trim()) &&
    /^\d{1,3}$/.test(cohort) &&
    Boolean(major) &&
    majorOptions.some((item) => item.name === major) &&
    !phoneError(phone) &&
    !passwordError(password) &&
    Boolean(passwordConfirm) &&
    password === passwordConfirm &&
    consented &&
    Boolean(privacyPolicy);
  const registerDisabled =
    isSubmitting ||
    (profileValidationAttempted && (!isProfileFormValid || Boolean(errors.form) || Boolean(errors.nickname)));
  const verificationExpired =
    step === 1 && verificationExpiresAtRef.current > 0 && countdown <= 0;
  const verificationAttemptsLocked = verificationFailureState === "attempts" && !verificationExpired;
  const codeError = verificationExpired
    ? "인증 시간이 만료되었어요. 재전송을 눌러주세요."
    : errors.code;

  return (
    <View style={styles.screen}>
      {step !== 3 ? (
        <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
          <Pressable accessibilityLabel="뒤로" onPress={goBack} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.appBarTitle}>회원가입</Text>
          <View style={styles.iconButton} />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.completeContent}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#2E9E5B" />
          <Text style={styles.completeTitle}>가입이 완료되었어요!</Text>
          <Pressable onPress={complete} style={[styles.primaryButton, styles.completeButton]}>
            <Text style={styles.primaryButtonText}>홈으로 가기</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.scroller} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <StepDots step={step} />

          {step === 0 ? (
            <>
              <Text style={styles.heading}>학교 이메일을 인증해주세요</Text>
              <View style={styles.field}>
                <Text style={styles.label}>학교 이메일</Text>
                <SchoolEmailInput
                  value={emailId}
                  onChangeText={(value) => { setEmailId(value); setErrors({}); }}
                  hasError={Boolean(errors.email)}
                />
                <FieldError message={errors.email} />
              </View>
              <Pressable disabled={isSubmitting} onPress={() => void requestCode(false)} style={[styles.primaryButton, isSubmitting ? styles.disabledButton : null]}>
                <Text style={styles.primaryButtonText}>{isSubmitting ? "발송 중" : "인증코드 받기"}</Text>
              </Pressable>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Text style={styles.heading}>인증코드를 입력해주세요</Text>
              <Text style={styles.helper}>{email}로 발송되었어요</Text>
              <View style={styles.field}>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) => {
                    setCode(value.replace(/\D/g, ""));
                    if (!verificationAttemptsLocked) {
                      setErrors({});
                      setVerificationFailureState(null);
                    }
                  }}
                  placeholder="인증코드 6자리"
                  placeholderTextColor={COLORS.tertiary}
                  style={[styles.input, codeError ? styles.inputError : null, verificationAttemptsLocked ? styles.verificationLockedInput : null]}
                  value={code}
                />
              </View>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  {codeError ? (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
                      <Text style={styles.errorText}>{codeError}</Text>
                    </View>
                  ) : verificationMessage?.type === "success" ? (
                    <View style={styles.successRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#3B6D11" />
                      <Text style={styles.successText}>{verificationMessage.text}</Text>
                    </View>
                  ) : null}
                </View>
                {resendCooldown > 0 && !verificationExpired ? (
                  <Text style={styles.timerText}>{formatCountdown(countdown)}</Text>
                ) : (
                  <Pressable disabled={isSubmitting} onPress={() => void requestCode(true)} hitSlop={8}>
                    <Text style={styles.resendLink}>{isSubmitting ? "발송 중" : "재전송"}</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                disabled={isSubmitting || verificationAttemptsLocked}
                onPress={verifyCode}
                style={[styles.primaryButton, isSubmitting ? styles.disabledButton : null, verificationAttemptsLocked ? styles.validationDisabledButton : null]}
              >
                <Text style={styles.primaryButtonText}>{isSubmitting ? "확인 중" : "다음"}</Text>
              </Pressable>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={styles.heading}>기본 정보를 입력해주세요</Text>
              <View style={styles.field}>
                <Text style={styles.label}>이름</Text>
                <TextInput value={nickname} onChangeText={(value) => { setNickname(value); setErrors((current) => ({ ...current, nickname: undefined, form: undefined })); }} placeholder="이름" placeholderTextColor={COLORS.tertiary} style={[styles.input, errors.nickname ? styles.profileInputError : null]} />
                <FieldError message={errors.nickname} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>기수</Text>
                <TextInput value={cohort} onChangeText={(value) => { setCohort(value.replace(/\D/g, "").slice(0, 3)); setErrors((current) => ({ ...current, cohort: undefined })); }} keyboardType="number-pad" placeholder="숫자만 입력 (예: 72)" placeholderTextColor={COLORS.tertiary} style={[styles.input, errors.cohort ? styles.profileInputError : null]} />
                <FieldError message={errors.cohort} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>전공</Text>
                <Pressable onPress={() => setMajorModalVisible(true)} style={[styles.selectField, errors.major ? styles.profileInputError : null]}>
                  <Text style={[styles.selectText, !major ? styles.selectPlaceholder : null]}>{major || "전공 선택"}</Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.subtle} />
                </Pressable>
                <FieldError message={errors.major} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>연락처</Text>
                <TextInput value={phone} onChangeText={(value) => { setPhone(value.replace(/\D/g, "").slice(0, 11)); setErrors((current) => ({ ...current, phone: undefined })); }} keyboardType="phone-pad" placeholder="숫자만 입력 (예: 01012345678)" placeholderTextColor={COLORS.tertiary} style={[styles.input, errors.phone ? styles.profileInputError : null]} />
                <FieldError message={errors.phone} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput value={password} onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })); }} secureTextEntry placeholder="비밀번호" placeholderTextColor={COLORS.tertiary} style={[styles.input, errors.password ? styles.profileInputError : null]} />
                {errors.password ? <FieldError message={errors.password} /> : <Text style={styles.passwordHelper}>영문, 숫자, 특수문자 포함 8자 이상</Text>}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput value={passwordConfirm} onChangeText={(value) => { setPasswordConfirm(value); setErrors((current) => ({ ...current, passwordConfirm: undefined })); }} secureTextEntry placeholder="비밀번호 확인" placeholderTextColor={COLORS.tertiary} style={[styles.input, errors.passwordConfirm ? styles.profileInputError : null]} />
                <FieldError message={errors.passwordConfirm} />
              </View>
              <Pressable disabled={!privacyPolicy} onPress={() => { setConsented((value) => !value); setErrors((current) => ({ ...current, consent: undefined })); }} style={styles.consentRow}>
                <View style={[styles.checkBox, consented ? styles.checkBoxActive : null]}>{consented ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}</View>
                <Text style={styles.consentText}>개인정보 수집 및 이용 동의 (필수){privacyPolicy ? ` · v${privacyPolicy.version}` : ""}</Text>
              </Pressable>
              <View style={styles.legalLinks}>
                <Pressable onPress={() => router.push("/legal/terms")}><Text style={styles.legalLinkText}>이용약관 보기</Text></Pressable>
                <Pressable onPress={() => router.push("/legal/privacy")}><Text style={styles.legalLinkText}>개인정보 처리방침 보기</Text></Pressable>
              </View>
              <FieldError message={errors.consent} />
              <FieldError message={errors.form} />
              <Pressable disabled={registerDisabled} onPress={register} style={[styles.primaryButton, registerDisabled ? styles.validationDisabledButton : null]}>
                <Text style={styles.primaryButtonText}>{isSubmitting ? "가입 중" : "가입하기"}</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal animationType="slide" transparent visible={majorModalVisible} onRequestClose={() => setMajorModalVisible(false)}>
        <Pressable onPress={() => setMajorModalVisible(false)} style={styles.modalBackdrop}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>전공 선택</Text>
            {majorOptions.map((option) => (
              <Pressable key={option.id} onPress={() => { setMajor(option.name); setErrors((current) => ({ ...current, major: undefined })); setMajorModalVisible(false); }} style={styles.modalOption}>
                <Text style={[styles.modalOptionText, major === option.name ? styles.modalOptionTextSelected : null]}>{option.name}</Text>
                {major === option.name ? <Ionicons name="checkmark" size={16} color={COLORS.primary} /> : null}
              </Pressable>
            ))}
            {registrationOptionsQuery.isLoading ? <Text style={styles.modalStateText}>전공 목록을 불러오는 중이에요.</Text> : null}
            {registrationOptionsQuery.isError ? <Text style={styles.errorText}>전공 목록을 불러오지 못했어요.</Text> : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  appBar: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingBottom: 12 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  appBarTitle: { color: COLORS.text, fontSize: 18, fontWeight: "500" }, // Figma: Inter Medium
  scroller: { flex: 1 },
  content: { gap: 20, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }, // Figma body: pt28 pb24
  stepDots: { flexDirection: "row", gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DDE2EA" },
  stepDotActive: { backgroundColor: COLORS.primary },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: "500", lineHeight: 28 }, // Figma: Inter Medium 20/28
  helper: { color: COLORS.tertiary, fontSize: 13, fontWeight: "400" }, // Figma: Regular 13, gray/500
  field: { gap: 6 }, // Figma label→input gap
  label: { color: COLORS.text, fontSize: 14, fontWeight: "500" }, // Figma: Inter Medium
  input: { minHeight: 44, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.bg, color: COLORS.text, fontSize: 14, fontWeight: "400", paddingHorizontal: 14, paddingVertical: 12 }, // Figma: 44h, border 0.5, Regular
  inputError: { borderColor: COLORS.danger },
  profileInputError: { borderColor: COLORS.danger, backgroundColor: "#FFF5F5" },
  verificationLockedInput: { backgroundColor: "#FFF5F5" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8, marginTop: -12 },
  statusLeft: { flexShrink: 1, minWidth: 0 },
  timerText: { color: COLORS.primary, fontSize: 13, fontWeight: "500" }, // Figma: Medium 13, primary/500
  resendLink: { color: COLORS.primary, fontSize: 13, fontWeight: "500" }, // Figma: Medium 13, primary/500
  errorText: { flexShrink: 1, color: COLORS.danger, fontSize: 12, fontWeight: "400", lineHeight: 18 }, // Figma: error/500 Regular 12
  successText: { color: "#3B6D11", fontSize: 12, fontWeight: "400", lineHeight: 18 }, // Figma: success green Regular 12
  successRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  passwordHelper: { color: COLORS.subtle, fontSize: 12, fontWeight: "400", lineHeight: 18 }, // Figma: Regular 12
  selectField: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 15 },
  selectText: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  selectPlaceholder: { color: COLORS.subtle },
  primaryButton: { height: 48, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: COLORS.primary }, // Figma: 48h
  disabledButton: { opacity: 0.55 },
  validationDisabledButton: { backgroundColor: "#D1D5DB" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" }, // Figma: Inter Medium
  resendButton: { alignSelf: "center", paddingVertical: 4, paddingHorizontal: 8 },
  resendText: { color: COLORS.primary, fontSize: 13, fontWeight: "400" }, // Figma: Regular 13, primary/500
  resendTextDisabled: { color: COLORS.subtle },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  checkBox: { width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 5, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg }, // Figma: 20, radius 5
  checkBoxActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  consentText: { color: COLORS.text, fontSize: 14, fontWeight: "400" }, // Figma: Regular 14
  legalLinks: { flexDirection: "row", flexWrap: "wrap", gap: 14, paddingLeft: 30, marginTop: -4 },
  legalLinkText: { color: COLORS.primary, fontSize: 12, fontWeight: "800", textDecorationLine: "underline" },
  completeContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 }, // Figma: gap 16
  completeTitle: { color: COLORS.text, fontSize: 24, fontWeight: "500" }, // Figma: Inter Medium 24
  completeButton: { width: 280, alignSelf: "center" }, // Figma: w-280
  modalBackdrop: { flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(17,24,39,0.42)" },
  modalCard: { width: "100%", maxWidth: 405, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  modalHandle: { width: 36, height: 4, alignSelf: "center", borderRadius: 2, backgroundColor: "#C7CCD4", marginBottom: 16 }, // Figma handle
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "600", marginBottom: 8 }, // Figma: SemiBold 18
  modalOption: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#EAECEF" }, // Figma divider
  modalOptionText: { color: COLORS.text, fontSize: 15, fontWeight: "400" }, // Figma: Regular 15
  modalOptionTextSelected: { color: COLORS.primary, fontWeight: "500" }, // Figma: selected = primary Medium
  modalStateText: { color: COLORS.muted, fontSize: 13, fontWeight: "700", paddingVertical: 14 },
});
