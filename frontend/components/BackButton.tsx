import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text } from "react-native";

type Props = {
  fallback?: string;
  label?: string;
};

export default function BackButton({ fallback = "/(tabs)/home", label = "Back" }: Props) {
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(fallback as never);
      }}
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#dbe3ef",
        backgroundColor: "#ffffff",
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Ionicons name="chevron-back" size={18} color="#112d4e" />
      <Text style={{ color: "#112d4e", fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}
