import { Pressable, Text, TextInput, View } from "react-native";

import type { AdminBoardSettingsDraft } from "../../utils/adminBoardSettings";
import type { AdminBoardLockedPolicy, AdminBoardSettingKey } from "../../utils/adminContentManagement";
import type { Board } from "../../types";

export type AdminBoardSettingsPanelProps = {
  board: Board;
  draft: AdminBoardSettingsDraft;
  lockedPolicies: readonly AdminBoardLockedPolicy[];
  saving: boolean;
  onChange: (draft: AdminBoardSettingsDraft) => void;
  onSave: () => void;
};

const settingKey: Record<AdminBoardSettingKey, keyof AdminBoardSettingsDraft> = {
  allow_anonymous: "allowAnonymous",
  write_permission: "writePermission",
  read_permission: "readPermission",
};

function Input({
  label,
  value,
  onChangeText,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: "#374151", fontSize: 12, fontWeight: "900" }}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        multiline={multiline}
        onChangeText={onChangeText}
        style={{
          minHeight: multiline ? 96 : 44,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#E1E4E9",
          backgroundColor: editable ? "#ffffff" : "#F8FAFC",
          color: "#111827",
          paddingHorizontal: 12,
          paddingVertical: 10,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function Choice({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), selected }}
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 6,
        borderWidth: 1,
        borderColor: selected ? "#2761FF" : "#E1E4E9",
        backgroundColor: selected ? "#EDF2FE" : "#ffffff",
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <Text style={{ color: selected ? "#2761FF" : "#374151", fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

export default function AdminBoardSettingsPanel({ board, draft, lockedPolicies, saving, onChange, onSave }: AdminBoardSettingsPanelProps) {
  const lockedDraftFields = new Set(
    lockedPolicies
      .map((policy) => policy.settingKey)
      .filter((key): key is AdminBoardSettingKey => key !== null)
      .map((key) => settingKey[key]),
  );

  const update = <Key extends keyof AdminBoardSettingsDraft>(key: Key, value: AdminBoardSettingsDraft[Key]) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8, borderRadius: 8, backgroundColor: "#F8FAFC", padding: 12 }}>
        <Text style={{ color: "#0B1F56", fontWeight: "900" }}>구조 식별자 · 변경 불가</Text>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>slug · {board.slug}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>category · {board.category}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>board_type · {board.board_type}</Text>
      </View>

      {lockedPolicies.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#0B1F56", fontWeight: "900" }}>고정 운영 정책</Text>
          {lockedPolicies.map((policy) => (
            <View key={policy.key} style={{ gap: 3, borderRadius: 8, borderWidth: 1, borderColor: "#D5E0FE", backgroundColor: "#EDF2FE", padding: 10 }}>
              <Text style={{ color: "#0B3AC4", fontWeight: "900" }}>{policy.label}</Text>
              <Text style={{ color: "#374151", fontSize: 12 }}>{policy.reason}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Input label="이름" value={draft.name} editable={!saving} onChangeText={(value) => update("name", value)} />
      <Input label="설명" value={draft.description} multiline editable={!saving} onChangeText={(value) => update("description", value)} />
      <Input label="정렬 순서" value={draft.sortOrder} editable={!saving} onChangeText={(value) => update("sortOrder", value.replace(/[^0-9-]/g, ""))} />

      <View style={{ gap: 7 }}>
        <Text style={{ color: "#374151", fontSize: 12, fontWeight: "900" }}>읽기 권한</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["user", "admin"] as const).map((permission) => (
            <Choice key={permission} label={permission} selected={draft.readPermission === permission} disabled={saving || lockedDraftFields.has("readPermission")} onPress={() => update("readPermission", permission)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 7 }}>
        <Text style={{ color: "#374151", fontSize: 12, fontWeight: "900" }}>쓰기 권한</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["user", "admin"] as const).map((permission) => (
            <Choice key={permission} label={permission} selected={draft.writePermission === permission} disabled={saving || lockedDraftFields.has("writePermission")} onPress={() => update("writePermission", permission)} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label={draft.allowAnonymous ? "익명 허용" : "실명 게시"}
          selected={draft.allowAnonymous}
          disabled={saving || lockedDraftFields.has("allowAnonymous")}
          onPress={() => update("allowAnonymous", !draft.allowAnonymous)}
        />
        <Choice label={draft.isActive ? "활성" : "숨김"} selected={draft.isActive} disabled={saving} onPress={() => update("isActive", !draft.isActive)} />
      </View>

      <Pressable
        disabled={saving}
        onPress={onSave}
        style={{ alignItems: "center", borderRadius: 6, backgroundColor: "#2761FF", opacity: saving ? 0.5 : 1, padding: 12 }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "900" }}>{saving ? "저장 중" : "운영 설정 저장"}</Text>
      </Pressable>
    </View>
  );
}
