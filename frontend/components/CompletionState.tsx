import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  onConfirm: () => void;
  buttonLabel?: string;
};

export default function CompletionState({ title, onConfirm, buttonLabel = "확인" }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={26} color="#2E9E5B" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Pressable accessibilityRole="button" onPress={onConfirm} style={styles.button}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  iconCircle: {
    // Figma: 64px 프레임 안 12.5% 인셋 → 48px 원, 테두리 4px
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#2E9E5B",
    borderRadius: 24,
    margin: 8,
  },
  title: {
    color: "#15171C",
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 32,
    textAlign: "center",
  },
  button: {
    width: 280,
    maxWidth: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#2761FF",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
});
