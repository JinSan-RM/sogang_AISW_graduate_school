import { Image, ImageBackground, type ImageBackgroundProps, type ImageProps, View, type ViewStyle } from "react-native";

import { useMediaAccessUrl } from "../hooks/useMediaAccessUrl";
import type { MediaReference } from "../utils/mediaAccess";

type Props = Omit<ImageProps, "source"> & {
  media?: MediaReference | null;
};

export default function MediaImage({ media, style, onError, ...props }: Props) {
  const { uri, refresh } = useMediaAccessUrl(media);

  if (!uri) {
    return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style as ViewStyle} />;
  }

  return (
    <Image
      {...props}
      onError={(event) => {
        onError?.(event);
        void refresh();
      }}
      source={{ uri }}
      style={style}
    />
  );
}

type BackgroundProps = Omit<ImageBackgroundProps, "source"> & {
  media?: MediaReference | null;
};

export function MediaImageBackground({ media, style, imageStyle, onError, children, ...props }: BackgroundProps) {
  const { uri, refresh } = useMediaAccessUrl(media);

  if (!uri) {
    return (
      <View style={style as ViewStyle}>
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      {...props}
      imageStyle={imageStyle}
      onError={(event) => {
        onError?.(event);
        void refresh();
      }}
      source={{ uri }}
      style={style}
    >
      {children}
    </ImageBackground>
  );
}
