import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("Android 패널은 네이티브 Modal의 닫기 요청으로 화면 BackHandler보다 먼저 닫힌다", () => {
  const code = ts.transpileModule(readFileSync("components/MyPageDrawerOverlay.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const platform of ["android", "ios", "web"]) {
    let closed = 0;
    const exports: { default?: (props: object) => { type: string; props: Record<string, unknown> } } = {};
    const modules: Record<string, unknown> = {
      "react-native": { Modal: "Modal", Platform: { OS: platform } },
      "react/jsx-runtime": { jsx: (type: string, props: object) => ({ type, props }) },
    };
    runInNewContext(code, { exports, require: (name: string) => modules[name] });
    const content = { type: "drawer", props: {} };
    const rendered = exports.default!({ children: content, onClose: () => { closed++; } });
    if (platform === "android") {
      assert.equal(rendered.type, "Modal");
      assert.equal(rendered.props.transparent, true);
      assert.equal(rendered.props.children, content);
      (rendered.props.onRequestClose as () => void)();
      assert.equal(closed, 1);
    } else {
      assert.equal(rendered, content);
      assert.equal(closed, 0);
    }
  }
});
