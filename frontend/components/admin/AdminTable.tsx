import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import type { AdminListSort } from "../../types";
import { AppText as Text } from "../AppTypography";

type SortField<Key extends string> = { label: string; sortKey: Key };
export type AdminTableColumn<Key extends string = string> = { flex?: number; width?: number } & (
  { label: string; sortKey?: Key } | { sortFields: readonly SortField<Key>[] }
);

type AdminTableProps<Key extends string> = {
  columns: AdminTableColumn<Key>[];
  rows: { key: string | number; cells: ReactNode[] }[];
  minimumWidth?: number;
  emptyContent?: ReactNode;
  sorting?: { order: AdminListSort<Key>; onChange: (key: Key) => void };
};

const headerText = { fontWeight: "600", color: "#6B7280", fontSize: 12 } as const;
const sortLabels = { asc: "오름차순", desc: "내림차순" };
const sortArrows = { asc: "↑", desc: "↓" };

export default function AdminTable<Key extends string>({
  columns, rows, minimumWidth = 700, emptyContent, sorting,
}: AdminTableProps<Key>) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#E1E4E9", borderRadius: 8, overflow: "hidden" }}>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ minWidth: minimumWidth, flexGrow: 1 }}>
          <View style={{ flexDirection: "row", alignItems: sorting ? "center" : undefined, backgroundColor: "#F8FAFC", paddingHorizontal: 16, paddingVertical: 13, gap: 18 }}>
            {columns.map((column, index) => {
              const width = { flex: column.width ? undefined : column.flex ?? 1, width: column.width };
              const fields = "sortFields" in column ? column.sortFields : column.sortKey ? [{ label: column.label, sortKey: column.sortKey }] : [];
              if (!sorting || fields.length === 0) {
                const label = "label" in column ? column.label : fields.map(field => field.label).join(" · ");
                return <Text key={index} style={[width, headerText]}>{label}</Text>;
              }

              return (
                <View key={index} style={[width, { gap: 2 }]}>
                  {fields.map(({ label, sortKey }) => {
                    const current = sorting.order.sort_by === sortKey ? sorting.order.sort_direction : undefined;
                    const next = current === "asc" ? "desc" : "asc";
                    const currentLabel = current ? `현재 ${sortLabels[current]}, ` : "";
                    const active = current ? { color: "#2761FF" } : undefined;
                    return (
                      <Pressable
                        key={sortKey}
                        accessibilityRole="button"
                        accessibilityLabel={`${label} 정렬, ${currentLabel}${sortLabels[next]}으로 변경`}
                        onPress={() => sorting.onChange(sortKey)}
                        style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, minHeight: 24 }}
                      >
                        <Text style={[headerText, active]}>{label}</Text>
                        <Text aria-hidden style={[headerText, active]}>{current ? sortArrows[current] : "↕"}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>
          {rows.map(row => (
            <View key={row.key} style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 16, gap: 18, borderTopWidth: 1, borderColor: "#E1E4E9" }}>
              {columns.map((column, index) => <View key={index} style={{ flex: column.width ? undefined : column.flex ?? 1, width: column.width, minWidth: 0 }}>{row.cells[index]}</View>)}
            </View>
          ))}
          {rows.length === 0 && emptyContent && <View style={{ borderTopWidth: 1, borderColor: "#E1E4E9", padding: 48, alignItems: "center", gap: 12 }}>{emptyContent}</View>}
        </View>
      </ScrollView>
    </View>
  );
}
