import React from "react";
import { StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from "react-native";

// Pretendard: 라틴은 Inter 기반, 한글은 Apple SD Gothic Neo와 같은 메트릭이라
// 피그마 시안(Inter + Mac 한글 폴백)과 같은 모습을 모든 플랫폼에서 재현한다.
// Font assets passed to expo-font's useFonts() in the root layout.
export const APP_FONTS = {
  Pretendard_400Regular: require("../assets/fonts/Pretendard-Regular.otf"),
  Pretendard_500Medium: require("../assets/fonts/Pretendard-Medium.otf"),
  Pretendard_600SemiBold: require("../assets/fonts/Pretendard-SemiBold.otf"),
  Pretendard_700Bold: require("../assets/fonts/Pretendard-Bold.otf"),
  Pretendard_800ExtraBold: require("../assets/fonts/Pretendard-ExtraBold.otf"),
  Pretendard_900Black: require("../assets/fonts/Pretendard-Black.otf"),
};

// The app styles text with numeric fontWeight everywhere (400~900). Each static
// Pretendard face embeds a single weight, so we map fontWeight -> the matching family.
const WEIGHT_TO_FAMILY: Record<string, string> = {
  "100": "Pretendard_400Regular",
  "200": "Pretendard_400Regular",
  "300": "Pretendard_400Regular",
  "400": "Pretendard_400Regular",
  normal: "Pretendard_400Regular",
  "500": "Pretendard_500Medium",
  "600": "Pretendard_600SemiBold",
  "700": "Pretendard_700Bold",
  bold: "Pretendard_700Bold",
  "800": "Pretendard_800ExtraBold",
  "900": "Pretendard_900Black",
};

function familyForWeight(weight: unknown): string {
  if (weight == null) return "Pretendard_400Regular";
  return WEIGHT_TO_FAMILY[String(weight)] ?? "Pretendard_400Regular";
}

// Patches the default <Text> / <TextInput> render so every instance renders with
// the Inter face matching its fontWeight, without touching each screen's styles.
function applyWebFontSmoothing(): void {
  // 피그마는 antialiased로 렌더링한다. 브라우저 기본(subpixel)은 같은 폰트도
  // 더 두껍고 진해 보여서, 웹 렌더링을 피그마와 동일하게 맞춘다.
  if (typeof document === "undefined") return;
  if (document.getElementById("font-smoothing-patch")) return;
  const style = document.createElement("style");
  style.id = "font-smoothing-patch";
  style.textContent = "*{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}";
  document.head.appendChild(style);
}

export function patchDefaultFontFamily(): void {
  applyWebFontSmoothing();
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
    // 각 Pretendard 페이스는 weight "normal"로 등록되므로 fontWeight를 남겨두면
    // 브라우저가 이미 굵은 글리프 위에 인조 볼드를 한 번 더 입힌다(faux bold). 굵기는 fontFamily가 담당한다.
    let patched = React.cloneElement(host, { style: { ...hostStyle, fontFamily, fontWeight: "normal" } } as Partial<typeof host.props>);
    for (let index = chain.length - 2; index >= 0; index -= 1) {
      patched = React.cloneElement(chain[index], undefined, patched);
    }
    return patched;
  };
  component.__interPatched = true;
}
