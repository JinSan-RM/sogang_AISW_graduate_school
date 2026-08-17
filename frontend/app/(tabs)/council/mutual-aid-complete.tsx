import { router } from "expo-router";
import CompletionState from "../../../components/CompletionState";

export default function MutualAidCompleteScreen() {
  return <CompletionState title="신청이 완료되었어요!" onConfirm={() => router.replace("/(tabs)/council")} />;
}
