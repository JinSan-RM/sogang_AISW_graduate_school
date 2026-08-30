import assert from "node:assert/strict";
import test from "node:test";

type AdminMutationResult<Value> =
  | { status: "success"; value: Value }
  | { status: "partial"; value: Value; secondaryError: unknown }
  | { status: "primary_failure"; primaryError: unknown };

type RunAdminMutation = <Value>(options: {
  primary: () => Promise<Value>;
  secondary?: (value: Value) => Promise<void>;
  afterPrimarySuccess: (value: Value) => Promise<void>;
}) => Promise<AdminMutationResult<Value>>;

async function coordinator(): Promise<RunAdminMutation> {
  const module = await import("../utils/adminMutationCoordinator").catch(() => ({}));
  const run = (module as { runAdminMutation?: RunAdminMutation }).runAdminMutation;
  if (!run) assert.fail("runAdminMutation must coordinate primary, secondary, and cache invalidation");
  return run;
}

test("a secondary failure still invalidates after the committed primary mutation", async () => {
  const run = await coordinator();
  const calls: string[] = [];
  const secondaryError = new Error("pin failed");

  const result = await run({
    primary: async () => {
      calls.push("primary");
      return 42;
    },
    secondary: async (value) => {
      calls.push(`secondary:${value}`);
      throw secondaryError;
    },
    afterPrimarySuccess: async (value) => {
      calls.push(`invalidate:${value}`);
    },
  });

  assert.deepEqual(calls, ["primary", "secondary:42", "invalidate:42"]);
  assert.deepEqual(result, { status: "partial", value: 42, secondaryError });
});

test("a primary failure skips both the secondary mutation and invalidation", async () => {
  const run = await coordinator();
  const calls: string[] = [];
  const primaryError = new Error("delete failed");

  const result = await run({
    primary: async () => {
      calls.push("primary");
      throw primaryError;
    },
    secondary: async () => {
      calls.push("secondary");
    },
    afterPrimarySuccess: async () => {
      calls.push("invalidate");
    },
  });

  assert.deepEqual(calls, ["primary"]);
  assert.deepEqual(result, { status: "primary_failure", primaryError });
});

test("a complete mutation invalidates after the secondary mutation succeeds", async () => {
  const run = await coordinator();
  const calls: string[] = [];

  const result = await run({
    primary: async () => {
      calls.push("primary");
      return 7;
    },
    secondary: async (value) => {
      calls.push(`secondary:${value}`);
    },
    afterPrimarySuccess: async (value) => {
      calls.push(`invalidate:${value}`);
    },
  });

  assert.deepEqual(calls, ["primary", "secondary:7", "invalidate:7"]);
  assert.deepEqual(result, { status: "success", value: 7 });
});
