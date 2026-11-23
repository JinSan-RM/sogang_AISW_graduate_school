import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText as Text, AppTextInput as TextInput } from "../../AppTypography";
import AdminColumns from "../AdminColumns";
import { ActionButton, COLORS, MajorOptionEditor, Panel, StatusText } from "../AdminControls";
import AdminTable from "../AdminTable";
import { useAdminWorkspace } from "../AdminWorkspace";

type LabeledFieldProps = Pick<ComponentProps<typeof TextInput>, "value" | "onChangeText" | "placeholder" | "inputMode"> & {
  label: string;
};

function LabeledField({ label, ...field }: LabeledFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...field} accessibilityLabel={label} placeholderTextColor="#6B7280" style={styles.input} />
    </View>
  );
}

export default function AdminRegistrationWebPage() {
  const {
    adminMajors, adminMajorsQuery, adminPrivacyPolicy, adminPrivacyPolicyQuery,
    handleCreateMajor, handleSaveMajor, handleSavePrivacyPolicy,
    newMajorName, newMajorOrder, policyEffectiveAt, policyVersion,
    setNewMajorName, setNewMajorOrder, setPolicyEffectiveAt, setPolicyVersion,
  } = useAdminWorkspace();
  const [editingMajorId, setEditingMajorId] = useState<number | null>(null);
  const editingMajor = adminMajors.find(item => item.id === editingMajorId);
  const closeEditor = () => setEditingMajorId(null);

  const majorListFeedback = adminMajorsQuery.isLoading ? (
    <ActivityIndicator color={COLORS.primary} accessibilityLabel="전공 목록 불러오는 중" />
  ) : adminMajorsQuery.isError ? (
    <>
      <Text style={styles.muted}>전공 목록을 불러오지 못했습니다.</Text>
      <ActionButton label="전공 목록 다시 시도" tone="outline" onPress={() => void adminMajorsQuery.refetch()} />
    </>
  ) : <Text style={styles.muted}>등록된 전공이 없습니다.</Text>;

  return (
    <View style={styles.page}>
      <AdminColumns>
        <Panel>
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.heading}>개인정보 처리방침</Text>
            <View style={styles.policyState}>
              <Text style={styles.label}>현재 적용 버전</Text>
              {adminPrivacyPolicyQuery.isLoading ? (
                <ActivityIndicator color={COLORS.primary} accessibilityLabel="정책 버전 불러오는 중" />
              ) : adminPrivacyPolicyQuery.isError ? (
                <>
                  <Text style={styles.muted}>정책 버전을 불러오지 못했습니다.</Text>
                  <View style={styles.action}>
                    <ActionButton label="정책 버전 다시 시도" tone="outline" onPress={() => void adminPrivacyPolicyQuery.refetch()} />
                  </View>
                </>
              ) : (
                <Text style={styles.text}>
                  {adminPrivacyPolicy
                    ? `${adminPrivacyPolicy.version} · ${adminPrivacyPolicy.effective_at.slice(0, 16).replace("T", " ")}`
                    : "현재 적용된 버전이 없습니다."}
                </Text>
              )}
            </View>
            <LabeledField label="정책 버전" value={policyVersion} onChangeText={setPolicyVersion} placeholder="예: 2026-07-12" />
            <LabeledField label="시행일시" value={policyEffectiveAt} onChangeText={setPolicyEffectiveAt} placeholder="YYYY-MM-DDTHH:mm" />
            <View style={styles.action}>
              <ActionButton label="정책 버전 적용" onPress={() => void handleSavePrivacyPolicy()} />
            </View>
          </View>
        </Panel>
        <Panel>
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.heading}>전공 추가</Text>
            <Text style={styles.muted}>활성 전공이 회원가입 선택 목록에 표시됩니다.</Text>
            <LabeledField label="이름" value={newMajorName} onChangeText={setNewMajorName} placeholder="전공명" />
            <LabeledField label="표시 순서" inputMode="numeric" value={newMajorOrder} onChangeText={value => setNewMajorOrder(value.replace(/\D/g, ""))} placeholder="정렬 순서" />
            <View style={styles.action}>
              <ActionButton label="전공 추가" onPress={() => void handleCreateMajor()} />
            </View>
          </View>
        </Panel>
      </AdminColumns>

      <View style={styles.list}>
        <Text accessibilityRole="header" style={styles.heading}>전공 목록</Text>
        <AdminTable
          minimumWidth={560}
          columns={[
            { label: "전공명", flex: 2 },
            { label: "정렬 순서", width: 100 },
            { label: "회원가입 노출", width: 120 },
            { label: "관리", width: 88 },
          ]}
          rows={(adminMajorsQuery.isError ? [] : adminMajors).map(item => ({
            key: item.id,
            cells: [
              <Text key="name" style={styles.text}>{item.name}</Text>,
              <Text key="order" style={styles.text}>{item.sort_order}</Text>,
              <StatusText key="status" active={item.is_active} />,
              <Pressable
                key="edit"
                accessibilityRole="button"
                accessibilityLabel={`${item.name} 전공 수정`}
                onPress={() => setEditingMajorId(item.id)}
                style={styles.editButton}
              >
                <Text style={styles.text}>수정</Text>
              </Pressable>,
            ],
          }))}
          emptyContent={majorListFeedback}
        />
      </View>

      {editingMajor ? (
        <Modal visible transparent animationType="none" onRequestClose={closeEditor}>
          <View style={styles.backdrop}>
            <View accessibilityViewIsModal style={styles.editor}>
              <View style={styles.editorHeader}>
                <Text accessibilityRole="header" style={styles.heading}>전공 수정</Text>
                <ActionButton label="닫기" tone="outline" onPress={closeEditor} />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorContent}>
                <MajorOptionEditor key={editingMajor.id} item={editingMajor} onSave={handleSaveMajor} />
                <Text style={styles.muted}>비활성화해도 해당 전공을 사용 중인 기존 회원의 기록은 유지됩니다.</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 24 },
  form: { gap: 14 },
  field: { gap: 6 },
  input: {
    minHeight: 42, borderWidth: 1, borderColor: "#E1E4E9", borderRadius: 6,
    backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#15171C", fontSize: 13,
  },
  policyState: { backgroundColor: "#F8FAFC", borderRadius: 6, padding: 12, gap: 6 },
  action: { alignSelf: "flex-start" },
  list: { gap: 12 },
  editButton: {
    alignSelf: "flex-start", minHeight: 36, justifyContent: "center", paddingHorizontal: 12,
    borderRadius: 6, borderWidth: 1, borderColor: "#E1E4E9", backgroundColor: "#FFFFFF",
  },
  heading: { color: "#15171C", fontSize: 16, fontWeight: "600" },
  label: { color: "#15171C", fontSize: 13, fontWeight: "600" },
  text: { color: "#15171C", fontSize: 13, lineHeight: 20 },
  muted: { color: "#6B7280", fontSize: 13, lineHeight: 20 },
  backdrop: { flex: 1, alignItems: "flex-end", backgroundColor: "rgba(21,23,28,0.18)" },
  editor: { flex: 1, width: 448, maxWidth: "100%", backgroundColor: "#FFFFFF" },
  editorHeader: {
    padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderColor: "#E1E4E9",
  },
  editorContent: { padding: 20, gap: 12 },
});
