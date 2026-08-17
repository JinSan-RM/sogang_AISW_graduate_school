import { useEffect, useState, type ComponentProps } from "react";
import { Image, StyleSheet } from "react-native";

import MediaImage from "./MediaImage";
import { useMediaAccessUrl } from "../hooks/useMediaAccessUrl";
import { imageDimensionsFromLoadEvent } from "../utils/imageDimensions";

type Props = ComponentProps<typeof MediaImage> & {
  fallbackAspectRatio?: number;
  // 원본 비율이 확정되면 알려준다 (공지 세로 이미지 접힘 판정 등에 사용)
  onAspectRatio?: (aspectRatio: number) => void;
};

export default function NaturalAspectMediaImage({ fallbackAspectRatio = 16 / 9, onAspectRatio, onLoad, style, ...props }: Props) {
  const [aspectRatio, setAspectRatio] = useState(fallbackAspectRatio);
  const { uri } = useMediaAccessUrl(props.media);

  const applyAspect = (width: number, height: number) => {
    if (width > 0 && height > 0) {
      const next = width / height;
      setAspectRatio(next);
      onAspectRatio?.(next);
    }
  };

  // 웹에서는 onLoad 이벤트에 원본 크기가 안 실리는 경우가 있어 getSize로 확정 측정한다.
  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled) applyAspect(width, height);
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  return (
    <MediaImage
      {...props}
      onLoad={(event) => {
        const dimensions = imageDimensionsFromLoadEvent(event);
        if (dimensions) {
          applyAspect(dimensions.width, dimensions.height);
        }
        onLoad?.(event);
      }}
      resizeMode="contain"
      style={[styles.image, { aspectRatio }, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: undefined,
    backgroundColor: "#F3F4F6",
  },
});
