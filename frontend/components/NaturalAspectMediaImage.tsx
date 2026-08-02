import { useState, type ComponentProps } from "react";
import { StyleSheet } from "react-native";

import MediaImage from "./MediaImage";
import { imageDimensionsFromLoadEvent } from "../utils/imageDimensions";

type Props = ComponentProps<typeof MediaImage> & {
  fallbackAspectRatio?: number;
};

export default function NaturalAspectMediaImage({ fallbackAspectRatio = 16 / 9, onLoad, style, ...props }: Props) {
  const [aspectRatio, setAspectRatio] = useState(fallbackAspectRatio);

  return (
    <MediaImage
      {...props}
      onLoad={(event) => {
        const dimensions = imageDimensionsFromLoadEvent(event);
        if (dimensions) {
          setAspectRatio(dimensions.width / dimensions.height);
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
