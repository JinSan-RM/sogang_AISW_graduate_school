import type { Board } from "../types";

export type AdminBoardSettingsDraft = {
  name: string;
  description: string;
  sortOrder: string;
  allowAnonymous: boolean;
  readPermission: string;
  writePermission: string;
  isActive: boolean;
};

export type AdminBoardSettingsPayload = {
  name: string;
  description?: string;
  sort_order: number;
  allow_anonymous: boolean;
  read_permission: string;
  write_permission: string;
  is_active: boolean;
};

export function adminBoardSettingsDraft(board: Board): AdminBoardSettingsDraft {
  return {
    name: board.name,
    description: board.description ?? "",
    sortOrder: String(board.sort_order),
    allowAnonymous: board.allow_anonymous,
    readPermission: board.read_permission,
    writePermission: board.write_permission,
    isActive: board.is_active ?? true,
  };
}

export function adminBoardSettingsPayload(draft: AdminBoardSettingsDraft): AdminBoardSettingsPayload {
  const sortOrder = Number.parseInt(draft.sortOrder, 10);
  if (!draft.name.trim() || !Number.isFinite(sortOrder)) {
    throw new Error("INVALID_BOARD_SETTINGS");
  }

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    sort_order: sortOrder,
    allow_anonymous: draft.allowAnonymous,
    read_permission: draft.readPermission,
    write_permission: draft.writePermission,
    is_active: draft.isActive,
  };
}

const EXTERNAL_LINK_KEYS = ["notion_url", "external_url", "url", "link"] as const;

export function externalLinkMetadata(board: Board, url: string): Record<string, unknown> {
  const metadata = { ...(board.metadata ?? {}) };
  const existingKey = EXTERNAL_LINK_KEYS.find((key) => typeof metadata[key] === "string");
  metadata[existingKey ?? "external_url"] = url;
  return metadata;
}

export function validateExternalHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return null;
  } catch {
    // Fall through to the same validation message for malformed URLs.
  }
  return "http 또는 https 주소를 입력하세요.";
}

