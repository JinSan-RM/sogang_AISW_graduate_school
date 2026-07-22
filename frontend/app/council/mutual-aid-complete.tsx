import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Figma: Screen/Council/MutualAidApply-Complete (node 237:246)
const COLORS = {
  bg: "#FFFFFF", // gray/0
  title: "#15171C", // gray/900
  primary: "#2761FF", // primary/500
  success: "#2E9E5B", // success/500
};

export default function MutualAidCompleteScreen() {
  const insets = useSafeAreaInsets();

  const handleConfirm = () => {
    router.replace("/(tabs)/council");
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
        <Text style={styles.title}>신청이 완료되었어요!</Text>
        <Pressable onPress={handleConfirm} style={styles.button}>
          <Text style={styles.buttonText}>확인</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  title: {
    color: COLORS.title,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "500", // Figma: Inter Medium
  },
  button: {
    width: 280,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8, // radius/sm
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500", // Figma: Inter Medium
  },
});
