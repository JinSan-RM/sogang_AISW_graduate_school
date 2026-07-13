import { StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
};

export const SCHOOL_EMAIL_DOMAIN = "@sogang.ac.kr";

export default function SchoolEmailInput({ value, onChangeText, placeholder = "이메일 ID", hasError = false }: Props) {
  return (
    <View style={[styles.container, hasError ? styles.containerError : null]}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        maxLength={64}
        onChangeText={(next) => onChangeText(next.replace(/@.*$/, "").replace(/\s/g, ""))}
        placeholder={placeholder}
        placeholderTextColor="#A0A7B2"
        style={styles.input}
        value={value}
      />
      <View style={styles.divider} />
      <View style={styles.domainBox}>
        <Text style={styles.domain}>{SCHOOL_EMAIL_DOMAIN}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  containerError: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF5F5",
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 14,
  },
  divider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  domainBox: {
    minWidth: 128,
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
  },
  domain: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "800",
  },
});
