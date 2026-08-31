import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMediaAccessUrl } from "../hooks/useMediaAccessUrl";
import type { MediaReference } from "../utils/mediaAccess";
import { imageDimensionsFromLoadEvent, type ImageDimensions } from "../utils/imageDimensions";
import {
  activityImageFrame,
  activityImageOrientation,
  resolveActivityImageRule,
  type ActivityImageLayout,
} from "../utils/activityImageLayout";
import MediaImage from "./MediaImage";

type Props = {
  layout: ActivityImageLayout;
  media: MediaReference;
};

const FALLBACK_ASPECT_RATIO = 16 / 9;

export default function ActivityCertificationMediaImage({ layout, media }: Props) {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const [dimensions, setDimensions] = useState<ImageDimensions>();
  const [viewerVisible, setViewerVisible] = useState(false);
  const { uri } = useMediaAccessUrl(media);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) setDimensions({ width, height });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const orientation = dimensions
    ? activityImageOrientation(dimensions.width, dimensions.height)
    : "default";
  const rule = resolveActivityImageRule(layout, orientation);
  const frame = dimensions
    ? activityImageFrame(
        layout,
        orientation,
        dimensions.width,
        dimensions.height,
        containerWidth,
      )
    : undefined;
  const fallbackWidth = containerWidth > 0
    ? Math.min(containerWidth, rule.max_width ?? containerWidth)
    : undefined;
  const fallbackHeight = rule.height;
  const viewerAspectRatio = dimensions
    ? dimensions.width / dimensions.height
    : FALLBACK_ASPECT_RATIO;

  const openViewer = (event: GestureResponderEvent) => {
    event.stopPropagation();
    setViewerVisible(true);
  };

  return (
    <>
      <View
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        style={styles.container}
      >
        <View
          style={[
            styles.frame,
            frame
              ? { width: frame.width, height: frame.height }
              : fallbackHeight !== null
                ? { width: fallbackWidth ?? "100%", height: fallbackHeight }
                : { width: fallbackWidth ?? "100%", aspectRatio: FALLBACK_ASPECT_RATIO },
          ]}
        >
          <MediaImage
            media={media}
            onLoad={(event) => {
              const nextDimensions = imageDimensionsFromLoadEvent(event);
              if (nextDimensions) setDimensions(nextDimensions);
            }}
            resizeMode={frame?.fit ?? rule.fit}
            style={styles.image}
          />
          {frame?.showViewer ? (
            <View pointerEvents="box-none" style={styles.expandOverlay}>
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.9)", "#FFFFFF"]}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <Pressable
                accessibilityLabel="사진 전체보기"
                accessibilityRole="button"
                onPress={openViewer}
                style={({ pressed }) => [styles.expandButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.expandButtonText}>사진 전체보기</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
        statusBarTranslucent
        visible={viewerVisible}
      >
        <View style={[styles.viewer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.viewerHeader}>
            <View style={styles.viewerHeaderSpacer} />
            <Text style={styles.viewerTitle}>사진 전체보기</Text>
            <Pressable
              accessibilityLabel="사진 전체보기 닫기"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setViewerVisible(false)}
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
            >
              <Ionicons color="#FFFFFF" name="close" size={28} />
            </Pressable>
          </View>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.viewerContent}
            showsVerticalScrollIndicator
          >
            <MediaImage
              media={media}
              resizeMode="contain"
              style={[styles.viewerImage, { aspectRatio: viewerAspectRatio }]}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  frame: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  expandOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: 112,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 18,
  },
  expandButton: {
    minHeight: 38,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E5EA",
    borderRadius: 999,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
  },
  expandButtonText: {
    color: "#15171C",
    fontSize: 14,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.7,
  },
  viewer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  viewerHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#242424",
    paddingHorizontal: 16,
  },
  viewerHeaderSpacer: {
    width: 40,
  },
  viewerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  viewerContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: undefined,
    backgroundColor: "#000000",
  },
});
