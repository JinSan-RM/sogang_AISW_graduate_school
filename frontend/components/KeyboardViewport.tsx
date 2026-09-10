import { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View, type ViewProps } from "react-native";

// Edge-to-edge Android windows can keep their full height while the IME covers them.
// Reserve that overlap once, around the navigator (or inside a separate native Modal).
export default function KeyboardViewport({ children, style, ...props }: ViewProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === "web") {
    return <View {...props} style={[styles.viewport, style]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      {...props}
      behavior="padding"
      // Android's hide event reports the visible frame height, excluding system bars.
      // Disable avoidance when hidden so those insets never become leftover padding.
      enabled={Platform.OS !== "android" || keyboardVisible}
      style={[styles.viewport, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
});
