const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".xls": "application/vnd.ms-excel",
  ".ppt": "application/vnd.ms-powerpoint",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".hwp": "application/x-hwp",
  ".zip": "application/zip",
  ".txt": "text/plain",
  ".ipynb": "application/x-ipynb+json",
};

export function inferDocumentContentType(filename: string, declaredType?: string | null): string {
  const normalizedName = filename.trim().toLowerCase();
  const dotIndex = normalizedName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? normalizedName.slice(dotIndex) : "";
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? (declaredType?.trim() || "application/octet-stream");
}
