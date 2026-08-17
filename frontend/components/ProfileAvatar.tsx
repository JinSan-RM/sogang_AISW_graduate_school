import MediaImage from "./MediaImage";
import { DefaultAvatarIcon } from "./icons";
import { profileAvatarPresentation } from "../utils/profileAvatar";

type Props = {
  mediaId?: number | null;
  mediaUrl?: string | null;
  size?: number;
};

export default function ProfileAvatar({ mediaId, mediaUrl, size = 52 }: Props) {
  const presentation = profileAvatarPresentation(mediaId, mediaUrl);
  if (presentation.kind === "image") {
    return (
      <MediaImage
        media={presentation.media}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#E6F1FB" }}
      />
    );
  }
  return <DefaultAvatarIcon size={size} />;
}
