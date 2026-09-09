import type { ReactNode } from "react";
import { Modal, Platform } from "react-native";

export default function MyPageDrawerOverlay({ children, onClose }: {
  children: ReactNode;
  onClose: () => void;
}) {
  if (Platform.OS !== "android") return children;

  // Native Modal consumes system Back before any underlying screen listener.
  return (
    <Modal transparent statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {children}
    </Modal>
  );
}
