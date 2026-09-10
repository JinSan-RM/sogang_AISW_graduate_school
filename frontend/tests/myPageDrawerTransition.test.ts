import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import * as navigation from "../utils/myPageNavigation";

type Element = { type: string; props: Record<string, unknown> };
type Context = { openDrawer: () => void; closeDrawer: () => void; returnToDrawer: () => void;
  settingsDidLayout: (route: string) => void };

function nodes(tree: unknown): Element[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  const node = tree as Element;
  return [node, ...nodes(node.props?.children)];
}

function harness(origin = "/home") {
  let pathname = origin;
  let index = 0;
  const slots: unknown[] = [];
  const effects: (() => void)[] = [];
  const calls: string[] = [];
  const timers: (() => void)[] = [];
  const animations: { toValue: number; done?: (result: { finished: boolean }) => void }[] = [];
  const slot = (initial: () => unknown) => {
    const current = index++;
    if (!(current in slots)) slots[current] = initial();
    return current;
  };
  const jsx = (type: string, props: Element["props"]) => ({ type, props });
  class Value {
    constructor(public value: number) {}
    setValue(value: number) { this.value = value; }
    interpolate() { return 1; }
    stopAnimation() {}
  }
  const modules: Record<string, unknown> = {
    react: {
      createContext: () => ({ Provider: "Provider" }),
      useContext: () => undefined,
      useState: (initial: unknown) => { const i = slot(() => initial); return [slots[i], (value: unknown) => { slots[i] = value; }]; },
      useRef: (initial: unknown) => slots[slot(() => ({ current: initial }))],
      useEffect: (effect: () => void) => { effects.push(effect); },
      useMemo: (factory: () => unknown) => factory(),
      useCallback: (callback: unknown) => callback,
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Platform: { OS: "android" }, View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView",
      StyleSheet: { create: (styles: unknown) => styles }, useWindowDimensions: () => ({ width: 400 }),
      PanResponder: { create: () => ({ panHandlers: {} }) },
      Animated: { Value, View: "AnimatedView", timing: (_value: Value, config: { toValue: number }) => ({
        start: (done?: (result: { finished: boolean }) => void) => animations.push({ toValue: config.toValue, done }),
      }) },
    },
    "expo-router": { usePathname: () => pathname, router: {
      push: (route: string) => calls.push(`push:${route}`), navigate: (route: string) => calls.push(`navigate:${route}`),
    } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24 }) },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "../hooks/useApi": { useMeQuery: () => ({ data: { data: { nickname: "프로필" } } }) },
    "../hooks/useAndroidTabBack": { useAndroidTabBack: () => {} },
    "../stores/userStore": { useUserStore: (select: (state: object) => unknown) => select({ isAuthenticated: true }) },
    "../services/api": {}, "../utils/pushTokenStorage": {},
    "../utils/myPageNavigation": navigation,
    "./ProfileAvatar": { default: "Avatar" }, "./icons": { BackIcon: "BackIcon" },
    "./MyPageDrawerOverlay": { default: "Overlay" },
  };
  const exports = {} as { MyPageDrawerProvider: (props: object) => Element };
  const code = ts.transpileModule(readFileSync("components/MyPageDrawer.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, { exports, require: (name: string) => {
    assert.ok(name in modules, name); return modules[name];
  }, setTimeout: (callback: () => void) => timers.push(callback) });
  let tree: Element;
  const render = () => {
    index = 0;
    tree = exports.MyPageDrawerProvider({ children: jsx("Navigator", {}) });
    for (const effect of effects.splice(0)) effect();
  };
  render();
  return {
    calls, timers, animations, render,
    context: () => tree.props.value as Context,
    overlay: () => nodes(tree).find((node) => node.type === "Overlay"),
    path: (path: string) => { pathname = path; render(); },
    press(label: string) {
      const button = nodes(tree).find((node) => node.type === "Pressable" &&
        nodes(node).some((child) => child.type === "Text" && child.props.children === label));
      assert.ok(button, label);
      (button.props.onPress as () => void)();
      render();
    },
    open() {
      (tree.props.value as Context).openDrawer();
      render();
      for (const animation of animations.splice(0)) animation.done?.({ finished: true });
      render();
    },
  };
}

for (const [label, route] of [["프로필", "/settings/profile"], ["알림 설정", "/settings/notifications"], ["계정 설정", "/settings/account"]]) {
  test(`${label}: 같은 화면에서 연 패널은 재이동이나 새 배치를 기다리지 않는다`, () => {
    const h = harness(route);
    h.open();
    h.press(label);
    assert.equal(h.overlay(), undefined);
    assert.deepEqual(h.calls, []);
    assert.equal(h.animations.length, 0);
    assert.equal(h.timers.length, 0);
  });

  test(`${label}: 이동 중 패널을 닫지 않고 목적 화면의 배치를 기다린다`, () => {
    const h = harness("/participation");
    h.open();
    h.press(label);
    assert.ok(h.overlay());
    assert.deepEqual(h.calls, [`push:${route}`]);
    assert.equal(h.animations.length, 0);
    assert.equal(h.timers.length, 0);
    h.press(label); // Repeated taps cannot stack navigation while covered.
    assert.equal(h.calls.length, 1);
    h.context().settingsDidLayout("/settings/password");
    h.render();
    assert.ok(h.overlay());
    h.path(route);
    h.context().settingsDidLayout(route);
    h.render();
    assert.equal(h.overlay(), undefined);
    h.context().returnToDrawer();
    h.render();
    const overlay = h.overlay()!;
    assert.ok(overlay);
    assert.equal(h.animations.length, 0); // Do not slide in over the underlying tab.
    assert.deepEqual(h.calls, [`push:${route}`]);
    (overlay.props.onShow as () => void)();
    assert.deepEqual(h.calls, [`push:${route}`, "navigate:/(tabs)/participation"]);
    (overlay.props.onShow as () => void)();
    assert.equal(h.calls.length, 2);
    h.path("/participation");
    assert.ok(h.overlay());
    h.context().closeDrawer();
    assert.equal(h.animations.length, 1); // Explicit close still slides away.
  });
}
