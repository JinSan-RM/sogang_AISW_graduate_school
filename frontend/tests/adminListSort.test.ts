import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { isValidElement } from "react";
import ts from "typescript";

import type { AdminDuesPaymentItem, AdminRosterItem, AdminUserItem } from "../types";

const member: AdminUserItem = {
  id: 1, nickname: "홍길동", email: "member@example.test", cohort: "72", major: "AI",
  enrollment_status: "active", is_active: true, role: "user", created_at: "2026-10-01T00:00:00Z",
};
const roster: AdminRosterItem = { id: 2, name: "홍길동", student_number: "A12345", major: "AI" };
const payment: AdminDuesPaymentItem = { ...roster, payment_scope: "ONCE", once_board_id: 3, once_board_name: "스터디 활동인증" };

type Props = {
  children?: unknown;
  label?: string;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  onPress?: () => void;
  onChangeText?: (value: string) => void;
};
type QueryOptions = { queryKey: unknown[]; queryFn: () => unknown };

function loadList(file: string, item: AdminUserItem | AdminRosterItem, platform = "web") {
  const states: unknown[] = [];
  let cursor = 0;
  let query: QueryOptions;
  const compiled = new Map<string, { default: () => unknown }>();
  const native = {
    Platform: { OS: platform }, StyleSheet: { create: (style: unknown) => style },
    ActivityIndicator: "ActivityIndicator", Pressable: "Pressable", ScrollView: "ScrollView", View: "View",
  };
  const request = (params: unknown) => params;

  function load(path: string) {
    const cached = compiled.get(path);
    if (cached) return cached;
    const module = { exports: {} as { default: () => unknown } };
    const requireFile = createRequire(path);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("module", "exports", "require", code)(module, module.exports, (id: string) => {
      if (id === "react-native") return native;
      if (id === "react") return {
        useState(initial: unknown) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial instanceof Function ? initial() : initial;
          return [states[index], (next: unknown) => { states[index] = next instanceof Function ? next(states[index]) : next; }];
        },
        useEffect: () => {},
      };
      if (id === "@expo/vector-icons") return { Ionicons: "Ionicons" };
      if (id === "@tanstack/react-query") return {
        useQueryClient: () => ({}),
        useQuery(options: QueryOptions) {
          query = options;
          return { isSuccess: true, data: { data: [item], pagination: { total: 150, total_pages: 2 } } };
        },
      };
      if (id.endsWith("/AppTypography")) return { AppText: "Text", AppTextInput: "TextInput" };
      if (id.endsWith("/services/api")) return {
        adminApi: { getUsers: request },
        duesPayerApi: { getAdminRoster: request, getAdminPayments: request },
      };
      if (id.endsWith("/hooks/useApi")) return { useBoardsQuery: () => ({}) };
      if (id.endsWith("/utils/adminAlert")) return { useAdminAlert: () => ({}) };
      if (id.endsWith("/AdminWorkspace")) return { useAdminWorkspace: () => ({}) };
      if (id.endsWith("/AdminControls")) return {};
      if (id.endsWith("/AdminColumns")) return { default: "AdminColumns" };
      if (id === "./DuesAdminPrimitives") return { DUES_ADMIN_COLORS: {}, DuesAdminButton: "DuesAdminButton" };
      if (["./DuesPaymentEditor", "./DuesPaymentImportConfirm"].includes(id)) return { default: id };
      if (id.endsWith("/AdminTable")) return load(resolve(dirname(path), `${id}.tsx`));
      if (id.endsWith("/useAdminListSort")) return load(resolve(dirname(path), `${id}.ts`));
      return requireFile(id);
    });
    compiled.set(path, module.exports);
    return module.exports;
  }

  const page = load(resolve(file)).default;
  function walk(node: unknown): Props[] {
    if (Array.isArray(node)) return node.flatMap(walk);
    if (!isValidElement<Props>(node)) return [];
    if (typeof node.type === "function") return walk((node.type as (props: Props) => unknown)(node.props));
    return [node.props, ...walk(node.props.children)];
  }
  function render() {
    cursor = 0;
    const elements = walk(page());
    return {
      elements,
      cacheKey: JSON.stringify(query.queryKey),
      params: query.queryFn(),
      sortButton(label: string) {
        const button = elements.find(element => element.onPress && element.accessibilityLabel?.startsWith(`${label} 정렬`));
        assert.ok(button?.onPress && button.accessibilityLabel, `${label} header should be a sort button`);
        assert.equal(button.accessibilityRole, "button");
        const arrow = walk(button.children).find(element => ["↑", "↓", "↕"].includes(String(element.children)))?.children;
        return { label: button.accessibilityLabel, arrow, click: button.onPress };
      },
      click(label: string) {
        const button = elements.find(element => element.onPress && (
          element.label === label || element.accessibilityLabel === label ||
          (isValidElement<Props>(element.children) && element.children.props.children === label)
        ));
        assert.ok(button?.onPress, `missing ${label} button`);
        button.onPress();
      },
    };
  }
  return { render };
}

const accountsPath = "components/admin/pages/AdminAccountsPage.tsx";
const rosterPath = "components/admin/DuesRosterSection.tsx";
const paymentsPath = "components/admin/DuesPaymentSection.tsx";

for (const [name, path, row, header, key, direction] of [
  ["accounts", accountsPath, member, "가입일", "created_at", "desc"],
  ["roster", rosterPath, roster, "이름", "name", "asc"],
  ["payments", paymentsPath, payment, "이름", "name", "asc"],
] as const) {
  test(`${name} requests the legacy default until its active header is pressed`, () => {
    const page = loadList(path, row);
    const initial = page.render();
    const button = initial.sortButton(header);
    assert.match(button.label, direction === "asc" ? /현재 오름차순/ : /현재 내림차순/);
    assert.equal(button.arrow, direction === "asc" ? "↑" : "↓");
    assert.deepEqual(initial.params, {
      q: undefined, ...(name === "accounts" ? { is_active: undefined } : {}),
      page: 1, size: name === "accounts" ? 20 : 100,
    });

    button.click();
    const inverted = page.render();
    const flippedButton = inverted.sortButton(header);
    assert.match(flippedButton.label, direction === "asc" ? /현재 내림차순/ : /현재 오름차순/);
    assert.equal(flippedButton.arrow, direction === "asc" ? "↓" : "↑");
    assert.deepEqual(inverted.params, { ...initial.params as object, sort_by: key, sort_direction: direction === "asc" ? "desc" : "asc" });
    assert.notEqual(inverted.cacheKey, initial.cacheKey);

    flippedButton.click();
    assert.deepEqual(page.render().params, { ...initial.params as object, sort_by: key, sort_direction: direction });
  });
}

test("switching account sort fields preserves the applied search and status and fetches page one", () => {
  const page = loadList(accountsPath, member);
  let view = page.render();
  view.elements.find(element => element.accessibilityLabel === "회원 검색")!.onChangeText!("  홍  ");
  view = page.render();
  view.click("검색");
  page.render().click("활성");
  page.render().click("다음");
  view = page.render();
  assert.equal((view.params as { page: number }).page, 2);

  const emailHeader = view.sortButton("이메일");
  assert.equal(emailHeader.arrow, "↕");
  emailHeader.click();
  view = page.render();
  assert.deepEqual(view.params, { q: "홍", is_active: true, page: 1, size: 20, sort_by: "email", sort_direction: "asc" });
  assert.match(view.sortButton("이메일").label, /현재 오름차순/);
  for (const header of ["이름", "기수", "전공", "재학 상태", "계정 상태", "가입일", "최근 접속"]) view.sortButton(header);
  assert.ok(!view.elements.some(element => element.onPress && element.accessibilityLabel?.startsWith("관리 정렬")));
});

test("payment headers send sort keys for the derived payment scope and linked activity board", () => {
  const page = loadList(paymentsPath, payment);
  page.render().sortButton("납부 범위").click();
  const scope = page.render();
  assert.deepEqual(scope.params, { q: undefined, page: 1, size: 100, sort_by: "payment_scope", sort_direction: "asc" });
  scope.sortButton("활동인증 게시판").click();
  const board = page.render();
  assert.deepEqual(board.params, { q: undefined, page: 1, size: 100, sort_by: "once_board_name", sort_direction: "asc" });
  assert.notEqual(board.cacheKey, scope.cacheKey);
});

test("native roster and payment lists keep their existing query parameters", () => {
  for (const [path, row] of [[rosterPath, roster], [paymentsPath, payment]] as const) {
    const view = loadList(path, row, "android").render();
    assert.deepEqual(view.params, { q: undefined, page: 1, size: 100 });
  }
});
