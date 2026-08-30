export type AdminMutationResult<Value> =
  | { status: "success"; value: Value }
  | { status: "partial"; value: Value; secondaryError: unknown }
  | { status: "primary_failure"; primaryError: unknown };

export async function runAdminMutation<Value>({
  primary,
  secondary,
  afterPrimarySuccess,
}: {
  primary: () => Promise<Value>;
  secondary?: (value: Value) => Promise<void>;
  afterPrimarySuccess: (value: Value) => Promise<void>;
}): Promise<AdminMutationResult<Value>> {
  let value: Value;
  try {
    value = await primary();
  } catch (primaryError) {
    return { status: "primary_failure", primaryError };
  }

  let secondaryError: unknown;
  try {
    await secondary?.(value);
  } catch (error) {
    secondaryError = error;
  }

  await afterPrimarySuccess(value);
  return secondaryError === undefined
    ? { status: "success", value }
    : { status: "partial", value, secondaryError };
}
