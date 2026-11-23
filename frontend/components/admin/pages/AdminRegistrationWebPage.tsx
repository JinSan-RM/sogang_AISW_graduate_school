import { useEffect, useState, type ComponentProps } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { MajorOption } from "../../../types";
import { AppText as Text, AppTextInput as TextInput } from "../../AppTypography";
import { BOARD_WEB_COLORS as colors, BOARD_WEB_STYLES } from "../AdminBoardTheme";
import AdminTable from "../AdminTable";
import { useAdminWorkspace } from "../AdminWorkspace";

const sections = [["majors", "전공 관리"], ["privacy", "개인정보 처리방침"]] as const;

type LabeledFieldProps = Pick<ComponentProps<typeof TextInput>, "value" | "onChangeText" | "placeholder" | "inputMode"> & {
  label: string;
};

function LabeledField({ label, ...field }: LabeledFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...field} accessibilityLabel={label} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

function FormButton({ label, onPress, primary = false, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.button, primary && styles.primaryButton]}
    >
      <Text style={primary ? styles.primaryText : styles.text}>{label}</Text>
    </Pressable>
  );
}

function MajorEditor({ item, onClose }: { item: MajorOption; onClose: () => void }) {
  const { handleSaveMajor } = useAdminWorkspace();
  const [name, setName] = useState(item.name);
  const [order, setOrder] = useState(String(item.sort_order));
  const [visible, setVisible] = useState(item.is_active);

  useEffect(() => {
    setName(item.name);
    setOrder(String(item.sort_order));
    setVisible(item.is_active);
  }, [item.name, item.sort_order, item.is_active]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.editor}>
          <View style={styles.editorHeader}>
            <Text accessibilityRole="header" style={styles.editorTitle}>전공 수정</Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorContent}>
            <LabeledField label="전공명" value={name} onChangeText={setName} placeholder="전공명" />
            <LabeledField label="표시 순서" value={order} onChangeText={value => setOrder(value.replace(/\D/g, ""))} placeholder="정렬 순서" inputMode="numeric" />
            <View style={styles.field}>
              <Text style={styles.label}>회원가입 노출</Text>
              <View style={styles.choices}>
                {([[true, "노출"], [false, "숨김"]] as const).map(([value, label]) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    aria-pressed={visible === value}
                    onPress={() => setVisible(value)}
                    style={[styles.button, visible === value && styles.selectedChoice]}
                  >
                    <Text style={visible === value ? styles.selectedText : styles.muted}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Text style={styles.muted}>숨김으로 바꿔도 해당 전공을 사용 중인 기존 회원의 기록은 유지됩니다.</Text>
          </ScrollView>
          <View style={styles.editorFooter}>
            <FormButton label="닫기" onPress={onClose} />
            <FormButton
              label="전공 저장"
              primary
              onPress={() => void handleSaveMajor(item.id, { name: name.trim(), sort_order: Number(order || 0), is_active: visible })}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminRegistrationWebPage() {
  const {
    adminMajors, adminMajorsQuery, adminPrivacyPolicy, adminPrivacyPolicyQuery,
    handleCreateMajor, handleSavePrivacyPolicy,
    newMajorName, newMajorOrder, policyEffectiveAt, policyVersion,
    setNewMajorName, setNewMajorOrder, setPolicyEffectiveAt, setPolicyVersion,
  } = useAdminWorkspace();
  const [section, setSection] = useState<typeof sections[number][0]>("majors");
  const [editingMajorId, setEditingMajorId] = useState<number | null>(null);
  const editingMajor = adminMajors.find(item => item.id === editingMajorId);
  const closeEditor = () => setEditingMajorId(null);

  const majorListFeedback = adminMajorsQuery.isLoading ? (
    <ActivityIndicator color={colors.primary} accessibilityLabel="전공 목록 불러오는 중" />
  ) : adminMajorsQuery.isError ? (
    <>
      <Text style={styles.muted}>전공 목록을 불러오지 못했습니다.</Text>
      <FormButton label="전공 목록 다시 시도" onPress={() => void adminMajorsQuery.refetch()} />
    </>
  ) : <Text style={styles.muted}>등록된 전공이 없습니다.</Text>;

  return (
    <View style={styles.page}>
      <View accessibilityRole="tablist" style={BOARD_WEB_STYLES.tabs}>
        {sections.map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            aria-selected={section === value}
            onPress={() => setSection(value)}
            style={[styles.tab, section === value && styles.selectedTab]}
          >
            <Text style={section === value ? styles.selectedText : styles.muted}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {section === "majors" ? (
        <>
          <View style={styles.group}>
            <View style={styles.toolbar}>
              <View style={styles.majorName}>
                <LabeledField label="전공명" value={newMajorName} onChangeText={setNewMajorName} placeholder="전공명" />
              </View>
              <View style={styles.majorOrder}>
                <LabeledField label="표시 순서" inputMode="numeric" value={newMajorOrder} onChangeText={value => setNewMajorOrder(value.replace(/\D/g, ""))} placeholder="정렬 순서" />
              </View>
              <FormButton label="전공 추가" primary onPress={() => void handleCreateMajor()} />
            </View>
            <Text style={styles.muted}>노출 상태인 전공이 회원가입 선택 목록에 표시됩니다.</Text>
          </View>
          <View style={styles.group}>
            <Text accessibilityRole="header" style={styles.heading}>전공 목록</Text>
            <AdminTable
              minimumWidth={410}
              columns={[
                { label: "전공명", flex: 2 },
                { label: "표시 순서", width: 72 },
                { label: "회원가입 노출", width: 100 },
                { label: "관리", width: 68 },
              ]}
              rows={(adminMajorsQuery.isError ? [] : adminMajors).map(item => ({
                key: item.id,
                cells: [
                  <Text key="name" style={styles.text}>{item.name}</Text>,
                  <Text key="order" style={styles.text}>{item.sort_order}</Text>,
                  <Text key="status" style={[styles.badge, item.is_active && styles.visibleBadge]}>{item.is_active ? "노출" : "숨김"}</Text>,
                  <FormButton key="edit" label="수정" accessibilityLabel={`${item.name} 전공 수정`} onPress={() => setEditingMajorId(item.id)} />,
                ],
              }))}
              emptyContent={majorListFeedback}
            />
          </View>
          {editingMajor && <MajorEditor key={editingMajor.id} item={editingMajor} onClose={closeEditor} />}
        </>
      ) : (
        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.heading}>현재 적용 버전</Text>
          {adminPrivacyPolicyQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.action} accessibilityLabel="정책 버전 불러오는 중" />
          ) : adminPrivacyPolicyQuery.isError ? (
            <View style={styles.group}>
              <Text style={styles.muted}>정책 버전을 불러오지 못했습니다.</Text>
              <View style={styles.action}>
                <FormButton label="정책 버전 다시 시도" onPress={() => void adminPrivacyPolicyQuery.refetch()} />
              </View>
            </View>
          ) : (
            <Text style={styles.text}>
              {adminPrivacyPolicy
                ? `${adminPrivacyPolicy.version} · ${adminPrivacyPolicy.effective_at.slice(0, 16).replace("T", " ")}`
                : "현재 적용된 버전이 없습니다."}
            </Text>
          )}
          <View style={styles.toolbar}>
            <View style={styles.policyField}>
              <LabeledField label="정책 버전" value={policyVersion} onChangeText={setPolicyVersion} placeholder="예: 2026-07-12" />
            </View>
            <View style={styles.policyField}>
              <LabeledField label="시행일시" value={policyEffectiveAt} onChangeText={setPolicyEffectiveAt} placeholder="YYYY-MM-DDTHH:mm" />
            </View>
            <FormButton label="정책 버전 적용" primary onPress={() => void handleSavePrivacyPolicy()} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 24 },
  group: { gap: 12 },
  tab: { paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  selectedTab: { borderBottomColor: colors.primary },
  toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 8 },
  majorName: { width: 260, maxWidth: "100%" },
  majorOrder: { width: 110, maxWidth: "100%" },
  policyField: { width: 190, maxWidth: "100%" },
  field: { gap: 7 },
  input: {
    minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 6,
    backgroundColor: colors.surface, paddingHorizontal: 12, color: colors.text, fontSize: 13,
  },
  action: { alignSelf: "flex-start" },
  button: {
    alignSelf: "flex-start", minHeight: 36, alignItems: "center", justifyContent: "center", paddingHorizontal: 14,
    borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  primaryButton: { alignSelf: "auto", minHeight: 42, borderColor: colors.primary, backgroundColor: colors.primary },
  primaryText: { color: colors.surface, fontSize: 13, fontWeight: "600" },
  heading: { color: colors.text, fontSize: 15, fontWeight: "600" },
  label: { color: colors.muted, fontSize: 13 },
  text: { color: colors.text, fontSize: 13, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  selectedText: { color: colors.primary, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  badge: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    fontSize: 11, color: colors.muted, backgroundColor: "#F3F4F6",
  },
  visibleBadge: { color: "#168A72", backgroundColor: "#EDF8F4" },
  backdrop: { flex: 1, flexDirection: "row", justifyContent: "flex-end", backgroundColor: "rgba(21,23,28,0.18)" },
  editor: { width: 520, maxWidth: "100%", backgroundColor: colors.surface, borderLeftWidth: 1, borderColor: colors.border },
  editorHeader: {
    padding: 24, borderBottomWidth: 1, borderColor: colors.border,
  },
  editorTitle: { color: colors.text, fontSize: 18, fontWeight: "600" },
  editorContent: { padding: 24, gap: 16 },
  choices: { flexDirection: "row", gap: 10 },
  selectedChoice: { borderColor: colors.primary, backgroundColor: "#EDF2FE" },
  editorFooter: {
    padding: 24, borderTopWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8,
  },
});
