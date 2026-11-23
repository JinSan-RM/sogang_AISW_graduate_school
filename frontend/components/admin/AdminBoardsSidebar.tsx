import { Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "../AppTypography";
import {
  ADMIN_BOARD_GROUPS,
  ADMIN_BOARD_SECTION_DEFINITIONS,
  type AdminBoardSectionKey,
} from "../../utils/adminBoardTree";

type Props = {
  selectedSection: AdminBoardSectionKey | null;
  disabled: boolean;
  onSelect: (section: AdminBoardSectionKey) => void;
};

export default function AdminBoardsSidebar({ selectedSection, disabled, onSelect }: Props) {
  return (
    <View accessibilityLabel="관리 분류" style={styles.sidebar}>
      <Text style={styles.heading}>관리 분류</Text>
      {ADMIN_BOARD_GROUPS.map(group => {
        const sections = ADMIN_BOARD_SECTION_DEFINITIONS.filter(section => section.scope === group.key);
        const selected = sections.some(section => section.key === selectedSection);
        return (
          <View key={group.key} style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={group.label}
              aria-expanded={sections.length > 1 ? selected : undefined}
              aria-current={selected && sections.length === 1 ? "page" : undefined}
              disabled={disabled}
              onPress={() => onSelect(sections[0].key)}
              style={[styles.button, selected && styles.selected]}
            >
              <Text style={[styles.groupLabel, selected && styles.selectedLabel]}>{group.label}</Text>
            </Pressable>
            {selected && sections.length > 1 ? sections.map(section => (
              <Pressable
                key={section.key}
                accessibilityRole="button"
                aria-current={selectedSection === section.key ? "page" : undefined}
                disabled={disabled}
                onPress={() => onSelect(section.key)}
                style={[styles.button, styles.child, selectedSection === section.key && styles.selected]}
              >
                <Text style={[styles.label, selectedSection === section.key && styles.selectedLabel]}>{section.label}</Text>
              </Pressable>
            )) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 210, borderWidth: 1, borderColor: "#E1E4E9", borderRadius: 8,
    backgroundColor: "#FFFFFF", padding: 12, gap: 8, alignSelf: "flex-start",
  },
  heading: { fontSize: 13, fontWeight: "600", padding: 10 },
  group: { gap: 3 },
  button: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 6 },
  child: { marginLeft: 10 },
  selected: { backgroundColor: "#EDF2FE" },
  label: { fontSize: 13, color: "#374151" },
  groupLabel: { fontSize: 13, color: "#374151", fontWeight: "600" },
  selectedLabel: { color: "#2761FF", fontWeight: "600" },
});
