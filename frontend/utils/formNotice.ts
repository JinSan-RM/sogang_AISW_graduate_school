export type FormNotice = Readonly<{
  title: string;
  message: string;
}>;

export function createFormNotice(title: string, message: string): FormNotice {
  return { title, message };
}

export function requiredFieldNotice(label: string): FormNotice {
  return createFormNotice("필수 항목", `${label} 항목을 입력하세요.`);
}
