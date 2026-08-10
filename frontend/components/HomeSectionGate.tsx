import type { ReactNode } from "react";

export default function HomeSectionGate({ visible, children }: { visible: boolean; children: ReactNode }) {
  return visible ? children : null;
}
