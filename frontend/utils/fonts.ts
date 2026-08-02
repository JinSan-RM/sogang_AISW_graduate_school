import React from "react";
import { StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from "react-native";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

// Font assets passed to expo-font's useFonts() in the root layout.
export const INTER_FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
};

// The app styles text with numeric fontWeight everywhere (400~900). Each static
// Inter face embeds a single weight, so we map fontWeight -> the matching family.
const WEIGHT_TO_FAMILY: Record<string, string> = {
  "100": "Inter_400Regular",
  "200": "Inter_400Regular",
  "300": "Inter_400Regular",
  "400": "Inter_400Regular",
  normal: "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  bold: "Inter_700Bold",
  "800": "Inter_800ExtraBold",
  "900": "Inter_900Black",
};

function familyForWeight(weight: unknown): string {
  if (weight == null) return "Inter_400Regular";
  return WEIGHT_TO_FAMILY[String(weight)] ?? "Inter_400Regular";
}

// Patches the default <Text> / <TextInput> render so every instance renders with
// the Inter face matching its fontWeight, without touching each screen's styles.
export function patchDefaultFontFamily(): void {
  patchComponent(Text as unknown as PatchableComponent);
  patchComponent(TextInput as unknown as PatchableComponent);
}

type PatchableComponent = {
  render?: (...args: unknown[]) => React.ReactElement | null;
  __interPatched?: boolean;
};

function patchComponent(component: PatchableComponent): void {
  if (!component || component.__interPatched || typeof component.render !== "function") {
    return;
  }

  const originalRender = component.render;
  component.render = function patchedRender(...args: unknown[]) {
    const element = originalRender.apply(this, args);
    if (!element || !React.isValidElement(element)) return element;

    const style = (element.props as { style?: StyleProp<TextStyle> }).style;
    const flattened = (StyleSheet.flatten(style) ?? {}) as { fontFamily?: string; fontWeight?: unknown };

    // Respect an explicit fontFamily if a caller ever sets one.
    if (flattened.fontFamily) return element;

    const fontFamily = familyForWeight(flattened.fontWeight);
    return React.cloneElement(element, {
      // Text/TextInput's patched render can already be returning a host element
      // on web. React DOM requires its style prop to be an object, so never pass
      // the React Native style array through to the resulting <span>/<input>.
      style: { ...flattened, fontFamily },
    } as Partial<typeof element.props>);
  };
  component.__interPatched = true;
}
