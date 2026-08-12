import { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
};

export const SCHOOL_EMAIL_DOMAIN = "@sogang.ac.kr";

export default function SchoolEmailInput({ value, onChangeText, placeholder = "이메일 ID", hasError = false }: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, isFocused && !hasError ? styles.containerFocused : null, hasError ? styles.containerError : null]}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        inputMode={Platform.OS === "web" ? "text" : "email"}
        keyboardType={Platform.OS === "web" ? "default" : "email-address"}
        maxLength={64}
        onBlur={() => setIsFocused(false)}
        onChangeText={(next) => onChangeText(next.replace(/@.*$/, "").replace(/\s/g, ""))}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor="#A6ACB7"
        style={[styles.input, { outlineStyle: "none" } as never]}
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
    minHeight: 44, // Figma: h-44
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
    borderWidth: 0.5, // Figma: 0.5px border
    borderColor: "#E1E4E9",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  containerError: {
    borderColor: "#D64545", // error/500 (Figma)
    backgroundColor: "#FFF5F5",
  },
  containerFocused: {
    borderColor: "#2761FF",
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: "#15171C",
    fontSize: 14,
    fontWeight: "400", // Figma: Inter Regular
    paddingLeft: 14, // Figma: padding 12px 8px 12px 14px
    paddingRight: 8,
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
