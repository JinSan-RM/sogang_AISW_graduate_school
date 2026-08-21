import type { ReactNode } from "react";
import { Text } from "react-native";

import type { Board } from "../../types";
import type { AdminBoardCapability, AdminBoardContentKind } from "../../utils/adminContentManagement";

export type AdminBoardContentPanelProps = {
  board?: Board;
  capability: AdminBoardCapability;
  renderers: Partial<Record<AdminBoardContentKind, () => ReactNode>>;
};

export default function AdminBoardContentPanel({ board, capability, renderers }: AdminBoardContentPanelProps) {
  const render = renderers[capability.kind];
  if (render) return <>{render()}</>;
  return <Text>{board ? `${board.name} 콘텐츠를 관리할 수 없습니다.` : "표시할 콘텐츠가 없습니다."}</Text>;
}
