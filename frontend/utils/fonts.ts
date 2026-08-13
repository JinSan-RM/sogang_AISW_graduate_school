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

    // fontWeight는 렌더 인자의 원본 스타일에서 읽는다 — 웹에서는 StyleSheet 스타일이
    // className으로 컴파일돼 호스트 요소의 style prop에서 사라지기 때문이다.
    const sourceProps = args[0] as { style?: StyleProp<TextStyle> } | undefined;
    const sourceStyle = (StyleSheet.flatten(sourceProps?.style) ?? {}) as { fontFamily?: string; fontWeight?: unknown };

    // Respect an explicit fontFamily if a caller ever sets one.
    if (sourceStyle.fontFamily) return element;
    const fontFamily = familyForWeight(sourceStyle.fontWeight);

    // react-native-web은 최상위 <Text>를 TextAncestorContext.Provider, LocaleProvider
    // 등으로 감싸서 반환한다. 래퍼(style prop 없음)를 따라 내려가 실제 호스트 요소에
    // fontFamily를 입히고, 다시 원래 래퍼 체인으로 감싼다.
    const chain: React.ReactElement[] = [element];
    let host = element;
    while (
      (host.props as { style?: unknown }).style === undefined &&
      React.isValidElement((host.props as { children?: unknown }).children)
    ) {
      host = (host.props as { children: React.ReactElement }).children;
      chain.push(host);
    }

    const hostStyle = (StyleSheet.flatten((host.props as { style?: StyleProp<TextStyle> }).style) ?? {}) as Record<string, unknown>;
    // React DOM requires the style prop to be an object, so never pass a React
    // Native style array through to the resulting <div>/<span>/<input>.
    let patched = React.cloneElement(host, { style: { ...hostStyle, fontFamily } } as Partial<typeof host.props>);
    for (let index = chain.length - 2; index >= 0; index -= 1) {
      patched = React.cloneElement(chain[index], undefined, patched);
    }
    return patched;
  };
  component.__interPatched = true;
}
