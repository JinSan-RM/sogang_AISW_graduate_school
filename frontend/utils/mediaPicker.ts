import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { mediaApi } from "../services/api";
import type { MediaAsset } from "../types";
import { inferDocumentContentType } from "./documentFiles";
import { selectAndUploadProfileImage } from "./profileImagePicker";

type UploadProgress = (progress: number) => void;

function fileNameFromUri(uri: string, fallback: string) {
  const name = uri.split("/").pop()?.split("?")[0];
  return name || fallback;
}

async function uploadPickedFile(
  file: File | { uri: string; name: string; type: string },
  onProgress?: UploadProgress,
  isPrivate = false
) {
  const response = await mediaApi.upload(file, onProgress, isPrivate);
  return response.data;
}

function pickLocalFiles({ accept, multiple }: { accept?: string; multiple?: boolean }) {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("focus", handleWindowFocus);
      input.removeEventListener("change", handleChange);
      input.removeEventListener("cancel", handleCancel);
      input.remove();
    };

    const settle = (files: File[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(files);
    };

    const handleChange = () => {
      settle(Array.from(input.files ?? []));
    };

    const handleCancel = () => {
      settle([]);
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          settle([]);
        }
      }, 600);
    };

    input.type = "file";
    input.accept = accept ?? "";
    input.multiple = Boolean(multiple);
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0";

    input.addEventListener("change", handleChange);
    input.addEventListener("cancel", handleCancel);
    window.addEventListener("focus", handleWindowFocus);
    document.body.appendChild(input);
    input.click();
  });
}

export async function pickAndUploadDocuments(onProgress?: UploadProgress, isPrivate = false): Promise<MediaAsset[]> {
  if (Platform.OS === "web") {
    const files = await pickLocalFiles({ multiple: true });
    return Promise.all(
      files.map((file) => {
        const type = inferDocumentContentType(file.name, file.type);
        const normalizedFile = file.type === type
          ? file
          : new File([file], file.name, { type, lastModified: file.lastModified });
        return uploadPickedFile(normalizedFile, onProgress, isPrivate);
      })
    );
  }

  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) {
    return [];
  }

  const uploaded: MediaAsset[] = [];
  for (const asset of result.assets) {
    uploaded.push(
      await uploadPickedFile(
        {
          uri: asset.uri,
          name: asset.name || fileNameFromUri(asset.uri, "upload"),
          type: inferDocumentContentType(
            asset.name || fileNameFromUri(asset.uri, "upload"),
            asset.mimeType,
          ),
        },
        onProgress,
        isPrivate
      )
    );
  }
  return uploaded;
}

export async function pickAndUploadImages(onProgress?: UploadProgress): Promise<MediaAsset[]> {
  if (Platform.OS === "web") {
    const files = await pickLocalFiles({ accept: "image/*", multiple: true });
    return Promise.all(files.map((file) => uploadPickedFile(file, onProgress)));
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("MEDIA_PERMISSION_DENIED");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: true,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
  });
  if (result.canceled) {
    return [];
  }

  const uploaded: MediaAsset[] = [];
  for (const asset of result.assets) {
    uploaded.push(
      await uploadPickedFile(
        {
          uri: asset.uri,
          name: asset.fileName || fileNameFromUri(asset.uri, "album-image.jpg"),
          type: asset.mimeType || "image/jpeg",
        },
        onProgress
      )
    );
  }
  return uploaded;
}

export async function pickAndUploadImage(onProgress?: UploadProgress): Promise<MediaAsset | null> {
  return selectAndUploadProfileImage({
    platform: Platform.OS,
    pickWebFile: async () => {
      const [file] = await pickLocalFiles({ accept: "image/*" });
      return file ?? null;
    },
    requestNativePermission: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return permission.granted;
    },
    pickNativeImage: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      return result.canceled ? null : result.assets[0] ?? null;
    },
    upload: (file) => uploadPickedFile(file, onProgress),
  });
}

export async function pickAndUploadBannerImage(onProgress?: UploadProgress): Promise<MediaAsset | null> {
  if (Platform.OS === "web") {
    const [file] = await pickLocalFiles({ accept: "image/*" });
    return file ? uploadPickedFile(file, onProgress) : null;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("MEDIA_PERMISSION_DENIED");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
  });
  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    return null;
  }
  return uploadPickedFile(
    {
      uri: asset.uri,
      name: asset.fileName || fileNameFromUri(asset.uri, "banner-image.jpg"),
      type: asset.mimeType || "image/jpeg",
    },
    onProgress
  );
}

export async function pickAndUploadContentImage(onProgress?: UploadProgress): Promise<MediaAsset | null> {
  return pickAndUploadBannerImage(onProgress);
}
