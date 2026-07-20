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
        placeholderTextColor="#A6ACB7"
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
    minHeight: 48,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E1E4E9",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  containerError: {
    borderColor: "#D64545", // error/500 (Figma)
    backgroundColor: "#FFF5F5",
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: "#15171C",
    fontSize: 14,
    fontWeight: "400", // Figma: Inter Regular
    paddingHorizontal: 14,
  },
  divider: {
    width: 1,
    backgroundColor: "#E1E4E9",
  },
  domainBox: {
    width: 130,
    justifyContent: "center",
    paddingLeft: 10,
    paddingRight: 14,
    backgroundColor: "#F5F5F5",
  },
  domain: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "400", // Figma: Inter Regular
  },
});
