export type NativeImageAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export type NativeImageUpload = {
  uri: string;
  name: string;
  type: string;
};

type ProfileImagePickerDependencies<T> = {
  platform: string;
  pickWebFile: () => Promise<File | null>;
  requestNativePermission: () => Promise<boolean>;
  pickNativeImage: () => Promise<NativeImageAsset | null>;
  upload: (file: File | NativeImageUpload) => Promise<T>;
};

function fileNameFromUri(uri: string) {
  return uri.split("/").pop()?.split("?")[0] || "profile-image.jpg";
}

export async function selectAndUploadProfileImage<T>({
  platform,
  pickWebFile,
  requestNativePermission,
  pickNativeImage,
  upload,
}: ProfileImagePickerDependencies<T>): Promise<T | null> {
  if (platform === "web") {
    const file = await pickWebFile();
    return file ? upload(file) : null;
  }

  if (!(await requestNativePermission())) {
    throw new Error("MEDIA_PERMISSION_DENIED");
  }

  const asset = await pickNativeImage();
  if (!asset) return null;

  return upload({
    uri: asset.uri,
    name: asset.fileName || fileNameFromUri(asset.uri),
    type: asset.mimeType || "image/jpeg",
  });
}
