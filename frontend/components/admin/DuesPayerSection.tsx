import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from "react-native";

import { duesPayerApi } from "../../services/api";
import {
  DUES_DELETE_CONFIRMATION,
  formatDuesImportSummary,
  formatDuesPayer,
  isExactDuesDeleteConfirmation,
} from "../../utils/duesPayers";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  primary900: "#0B1F56",
  error: "#D94343",
  error50: "#FDECEC",
  border: "#E1E4E9",
  borderStrong: "#C7CDD4",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  text: "#111827",
  muted: "#6B7280",
};

type WorkbookFile = File | { uri: string; name: string; type: string };

function apiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : fallback;
}

function pickWebWorkbook() {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    let settled = false;
    const cleanup = () => {
      input.removeEventListener("change", handleChange);
      input.removeEventListener("cancel", handleCancel);
      window.removeEventListener("focus", handleWindowFocus);
      input.remove();
    };
    const settle = (file: File | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(file);
    };
    const handleChange = () => settle(input.files?.[0] ?? null);
    const handleCancel = () => settle(null);
    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) settle(null);
      }, 600);
    };
    input.type = "file";
    input.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    input.style.display = "none";
    input.addEventListener("change", handleChange);
    input.addEventListener("cancel", handleCancel);
    window.addEventListener("focus", handleWindowFocus);
    document.body.appendChild(input);
    input.click();
  });
}

async function pickWorkbook(): Promise<WorkbookFile | null> {
  if (Platform.OS === "web") return pickWebWorkbook();
  const result = await DocumentPicker.getDocumentAsync({
    type: XLSX_MIME,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || "원우회비.xlsx",
    type: asset.mimeType || XLSX_MIME,
  };
}

function Button({
  label,
  onPress,
  tone = "primary",
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "outline" | "danger";
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const filled = tone !== "outline";
  const backgroundColor = disabled
    ? COLORS.borderStrong
    : tone === "danger"
      ? COLORS.error
      : filled
        ? COLORS.primary
        : COLORS.surface;
  const foreground = tone === "outline" ? COLORS.primary : COLORS.surface;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: disabled ? COLORS.borderStrong : tone === "danger" ? COLORS.error : COLORS.primary,
        backgroundColor,
        paddingHorizontal: 14,
      }}
    >
      {icon ? <Ionicons name={icon} size={17} color={foreground} /> : null}
      <Text style={{ color: foreground, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

export default function DuesPayerSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const payersQuery = useQuery({
    queryKey: ["admin-dues-payers", appliedSearch, page],
    queryFn: () => duesPayerApi.getAdminPayers({ q: appliedSearch || undefined, page, size: 100 }),
  });
  const payers = payersQuery.data?.data ?? [];
  const pagination = payersQuery.data?.pagination;

  const importWorkbook = async () => {
    const file = await pickWorkbook();
    if (!file) return;
    setUploading(true);
    try {
      const response = await duesPayerApi.importWorkbook(file);
      await queryClient.invalidateQueries({ queryKey: ["admin-dues-payers"] });
      Alert.alert("업로드 완료", formatDuesImportSummary(response.data));
    } catch (error) {
      Alert.alert(
        "업로드 실패",
        apiErrorMessage(error, "엑셀 형식을 확인해 주세요. 명단은 변경되지 않았습니다."),
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteAll = async () => {
    if (!isExactDuesDeleteConfirmation(deleteConfirmation)) return;
    setDeleting(true);
    try {
      const response = await duesPayerApi.deleteAll(deleteConfirmation);
      await queryClient.invalidateQueries({ queryKey: ["admin-dues-payers"] });
      Alert.alert("삭제 완료", `${response.data.deleted}명의 원우회비 명부를 삭제했습니다.`);
      setDeleteStep(0);
      setDeleteConfirmation("");
      setPage(1);
    } catch (error) {
      Alert.alert("삭제 실패", apiErrorMessage(error, "원우회비 명부를 삭제하지 못했습니다."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16, gap: 12 }}>
        <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>원우회비 납부자 명부</Text>
        <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
          회원 계정과 분리된 명부입니다. 엑셀의 각 행을 이름 전공 학번 순서로 읽고, 학번을 기준으로 신규 추가하거나 기존 정보를 수정합니다.
        </Text>
        <View style={{ borderRadius: 6, backgroundColor: COLORS.primary50, padding: 12, gap: 4 }}>
          <Text style={{ color: COLORS.primary900, fontWeight: "900" }}>업로드 규칙</Text>
          <Text style={{ color: COLORS.primary900, fontSize: 13, lineHeight: 19 }}>
            헤더 없이 이름 전공 학번 3열을 사용합니다. 빈 값, A+숫자 5자리가 아닌 학번, 파일 안의 중복 학번이 하나라도 있으면 전체 업로드를 거절합니다.
          </Text>
        </View>
        <Button
          icon="cloud-upload-outline"
          label={uploading ? "업로드 중..." : "원우회비 엑셀 업로드"}
          onPress={() => void importWorkbook()}
          disabled={uploading || deleting}
        />
      </View>

      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16, gap: 10 }}>
        <Text style={{ color: COLORS.text, fontWeight: "900" }}>납부자 검색</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            setAppliedSearch(search.trim());
            setPage(1);
          }}
          placeholder="이름 또는 학번 검색"
          placeholderTextColor={COLORS.muted}
          style={{ minHeight: 44, borderRadius: 6, borderWidth: 1, borderColor: COLORS.borderStrong, paddingHorizontal: 12, color: COLORS.text }}
        />
        <Button
          icon="search-outline"
          label="검색"
          onPress={() => {
            setAppliedSearch(search.trim());
            setPage(1);
          }}
        />
        <Text style={{ color: COLORS.muted, fontSize: 13 }}>총 {pagination?.total ?? 0}명</Text>
      </View>

      {payersQuery.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      {payersQuery.isError ? <Text style={{ color: COLORS.error }}>명부를 불러오지 못했습니다.</Text> : null}
      {!payersQuery.isLoading && !payersQuery.isError && payers.length === 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16 }}>
          <Text style={{ color: COLORS.muted }}>검색되는 원우회비 납부자가 없습니다.</Text>
        </View>
      ) : null}
      {payers.map((payer) => (
        <View key={payer.id} style={{ borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 5 }}>
          <Text style={{ color: COLORS.text, fontWeight: "900" }}>{formatDuesPayer(payer)}</Text>
        </View>
      ))}

      {(pagination?.total_pages ?? 0) > 1 ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Button label="이전" tone="outline" disabled={page <= 1} onPress={() => setPage((current) => Math.max(1, current - 1))} />
          <Text style={{ color: COLORS.text, fontWeight: "800" }}>{page} / {pagination?.total_pages}</Text>
          <Button label="다음" tone="outline" disabled={page >= (pagination?.total_pages ?? 1)} onPress={() => setPage((current) => current + 1)} />
        </View>
      ) : null}

      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#F7B8B8", backgroundColor: COLORS.error50, padding: 16, gap: 10 }}>
        <Text style={{ color: COLORS.error, fontSize: 17, fontWeight: "900" }}>명부 전체 삭제</Text>
        {deleteStep === 0 ? (
          <Button label="전체 삭제 시작" tone="danger" onPress={() => setDeleteStep(1)} disabled={uploading} />
        ) : null}
        {deleteStep === 1 ? (
          <>
            <Text style={{ color: COLORS.error, lineHeight: 20 }}>
              정말 삭제하시겠습니까? 삭제한 명부는 복원할 수 없고, 다시 사용하려면 엑셀로 재등록해야 합니다.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Button label="취소" tone="outline" onPress={() => setDeleteStep(0)} /></View>
              <View style={{ flex: 1 }}><Button label="삭제 확인 계속" tone="danger" onPress={() => setDeleteStep(2)} /></View>
            </View>
          </>
        ) : null}
        {deleteStep === 2 ? (
          <>
            <Text style={{ color: COLORS.error, lineHeight: 20 }}>
              마지막 확인입니다. 아래 입력란에 {DUES_DELETE_CONFIRMATION}를 정확히 입력하세요.
            </Text>
            <TextInput
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder={DUES_DELETE_CONFIRMATION}
              placeholderTextColor={COLORS.muted}
              style={{ minHeight: 44, borderRadius: 6, borderWidth: 1, borderColor: COLORS.error, backgroundColor: COLORS.surface, paddingHorizontal: 12, color: COLORS.text }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Button label="취소" tone="outline" onPress={() => { setDeleteStep(0); setDeleteConfirmation(""); }} /></View>
              <View style={{ flex: 1 }}>
                <Button
                  label={deleting ? "삭제 중..." : "진짜 삭제"}
                  tone="danger"
                  disabled={deleting || !isExactDuesDeleteConfirmation(deleteConfirmation)}
                  onPress={() => void deleteAll()}
                />
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
