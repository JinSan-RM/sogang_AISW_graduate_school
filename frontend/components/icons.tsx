import Svg, { Circle, Path } from "react-native-svg";

// 디자인에서 받은 SVG 원본을 그대로 옮긴 것. 하드코딩된 색만 color prop으로 바꿨다.
// ponytail: clipPath(전체 영역을 덮는 rect)는 no-op이라 생략했다.
const MUTED = "#6B7280";
const TAB_INACTIVE = "#9CA3AF";

type IconProps = { size?: number; color?: string };

export function BellIcon({ size = 24, color = MUTED, hasBadge = false }: IconProps & { hasBadge?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 2.5C7.5 2.5 6 4.5 6 7V9.5C6 10.5 5.5 11.5 4.5 12.3H15.5C14.5 11.5 14 10.5 14 9.5V7C14 4.5 12.5 2.5 10 2.5Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M8 14.5C8 15.0304 8.21071 15.5391 8.58579 15.9142C8.96086 16.2893 9.46957 16.5 10 16.5C10.5304 16.5 11.0391 16.2893 11.4142 15.9142C11.7893 15.5391 12 15.0304 12 14.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {hasBadge ? <Circle cx={16.5} cy={3.5} r={2.9} fill="#2761FF" stroke="white" strokeWidth={1.2} /> : null}
    </Svg>
  );
}

export function ProfileIcon({ size = 24, color = MUTED }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M9.99999 10.2C11.7673 10.2 13.2 8.7673 13.2 6.99999C13.2 5.23268 11.7673 3.79999 9.99999 3.79999C8.23268 3.79999 6.79999 5.23268 6.79999 6.99999C6.79999 8.7673 8.23268 10.2 9.99999 10.2Z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path d="M3.5 17C3.5 13.5 6.4 11 10 11C13.6 11 16.5 13.5 16.5 17" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function HomeTabIcon({ size = 22, color = TAB_INACTIVE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M18.6 15.9745V10.9954V10.9947C18.6 10.5156 18.6 10.2759 18.535 10.0529C18.4775 9.85516 18.3826 9.66763 18.2547 9.49852C18.1104 9.3077 17.9095 9.14985 17.5074 8.83406L12.7074 5.06472C11.9608 4.47842 11.5875 4.18531 11.1674 4.07381C10.7972 3.97556 10.4028 3.97556 10.0326 4.07381C9.6127 4.18525 9.23977 4.4781 8.49398 5.06376L8.49275 5.06472L3.69275 8.83406L3.69179 8.83481C3.2903 9.1501 3.08941 9.30785 2.94519 9.49852C2.81728 9.66763 2.72252 9.85516 2.66495 10.0529C2.59998 10.2761 2.59998 10.5158 2.59998 10.9954V15.9745C2.59998 16.8108 2.59998 17.2289 2.75222 17.5587C2.9552 17.9985 3.34478 18.348 3.83484 18.5302C4.20238 18.6668 4.66832 18.6668 5.60021 18.6668C6.53209 18.6668 6.9978 18.6668 7.36534 18.5302C7.8554 18.348 8.24464 17.9985 8.44763 17.5587C8.59987 17.2289 8.59998 16.8107 8.59998 15.9744V15.0769C8.59998 14.0856 9.49541 13.282 10.6 13.282C11.7045 13.282 12.6 14.0856 12.6 15.0769V15.9744C12.6 16.8107 12.6 17.2289 12.7522 17.5587C12.9552 17.9985 13.3448 18.348 13.8348 18.5302C14.2024 18.6668 14.6683 18.6668 15.6002 18.6668C16.5321 18.6668 16.9978 18.6668 17.3653 18.5302C17.8554 18.348 18.2446 17.9985 18.4476 17.5587C18.5999 17.2289 18.6 16.8108 18.6 15.9745Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NoticeTabIcon({ size = 22, color = TAB_INACTIVE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M10.6267 8.27273C10.1927 8.27273 9.34489 8.27273 7.71099 8.27273C3.82968 8.27273 3.82963 14.2727 7.71099 14.2727C8.13024 14.2727 8.49773 14.2727 8.81975 14.2727C9.75272 14.2727 10.3041 14.2727 10.6267 14.2727M10.6267 8.27273C11.2236 8.27273 11.0377 8.27273 11.0377 8.27273C14.4425 8.06071 18.8 5 18.8 5V17C18.8 17 14.1601 14.2403 11.0377 14.2727C11.0377 14.2727 11.2237 14.2727 10.6267 14.2727M10.6267 8.27273V14.2727"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8.29999 15C8.3455 16.5655 9.29999 17.5 9.29999 17.5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CommunityTabIcon({ size = 22, color = TAB_INACTIVE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M17 16L13 16L11 18L9 16L5 16C3.89543 16 3 15.1046 3 14L3 7C3 5.89543 3.89543 5 5 5L17 5C18.1046 5 19 5.89543 19 7L19 14C19 15.1046 18.1046 16 17 16Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M6 12H12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M6 9H16" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// 빈 상태(등록된 공지사항이 없어요)용 캘린더.
export function EmptyCalendarIcon({ size = 32, color = "#A6ACB7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M25.3333 6.66663H6.66667C5.19391 6.66663 4 7.86053 4 9.33329V25.3333C4 26.8061 5.19391 28 6.66667 28H25.3333C26.8061 28 28 26.8061 28 25.3333V9.33329C28 7.86053 26.8061 6.66663 25.3333 6.66663Z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M21.3333 4V9.33333M10.6667 4V9.33333M4 13.3333H28" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// 원본 SVG(69x39)에 "원우회" 라벨 텍스트 패스가 함께 있어서 아이콘 패스만 옮겼다.
// 좌표를 다시 그리는 대신 viewBox로 아이콘 영역만 잘라내 stroke 두께(1.55833)를 원본 그대로 유지한다.
export function CouncilTabIcon({ size = 22, color = "#A6ACB7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="22.5 0.5 22 22" fill="none">
      <Path
        d="M31.65 10.0834C33.1688 10.0834 34.4 8.85216 34.4 7.33337C34.4 5.81459 33.1688 4.58337 31.65 4.58337C30.1312 4.58337 28.9 5.81459 28.9 7.33337C28.9 8.85216 30.1312 10.0834 31.65 10.0834Z"
        stroke={color}
        strokeWidth={1.55833}
      />
      <Path
        d="M38.9834 10.5417C40.249 10.5417 41.275 9.51569 41.275 8.25004C41.275 6.98439 40.249 5.95837 38.9834 5.95837C37.7177 5.95837 36.6917 6.98439 36.6917 8.25004C36.6917 9.51569 37.7177 10.5417 38.9834 10.5417Z"
        stroke={color}
        strokeWidth={1.55833}
      />
      <Path
        d="M25.2333 18.3334C25.2333 15.3084 28.075 12.8334 31.65 12.8334C35.225 12.8334 38.0667 15.3084 38.0667 18.3334"
        stroke={color}
        strokeWidth={1.55833}
        strokeLinecap="round"
      />
      <Path d="M37.6083 13.0167C39.9917 13.4751 41.7333 15.2167 41.7333 18.3334" stroke={color} strokeWidth={1.55833} strokeLinecap="round" />
    </Svg>
  );
}

// 이 아이콘만 stroke가 아니라 fill 기반이다 (디자인 원본 그대로).
export function ParticipationTabIcon({ size = 22, color = TAB_INACTIVE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4.16667 18.3333C3.70833 18.3333 3.31597 18.1701 2.98958 17.8437C2.66319 17.5173 2.5 17.125 2.5 16.6666V4.99996C2.5 4.54163 2.66319 4.14926 2.98958 3.82288C3.31597 3.49649 3.70833 3.33329 4.16667 3.33329H5V1.66663H6.66667V3.33329H13.3333V1.66663H15V3.33329H15.8333C16.2917 3.33329 16.684 3.49649 17.0104 3.82288C17.3368 4.14926 17.5 4.54163 17.5 4.99996V16.6666C17.5 17.125 17.3368 17.5173 17.0104 17.8437C16.684 18.1701 16.2917 18.3333 15.8333 18.3333H4.16667ZM4.16667 16.6666H15.8333V8.33329H4.16667V16.6666ZM4.16667 6.66663H15.8333V4.99996H4.16667V6.66663ZM5.83333 11.6666V9.99996H14.1667V11.6666H5.83333ZM5.83333 15V13.3333H11.6667V15H5.83333Z"
        fill={color}
      />
    </Svg>
  );
}

// 더보기(케밥) 아이콘 — 디자인 원본 4x18, 세로 점 3개.
export function MoreIcon({ size = 18, color = "#15171C" }: IconProps) {
  return (
    <Svg width={(size * 4) / 18} height={size} viewBox="0 0 4 18" fill="none">
      <Circle cx={2} cy={2} r={2} fill={color} />
      <Circle cx={2} cy={9} r={2} fill={color} />
      <Circle cx={2} cy={16} r={2} fill={color} />
    </Svg>
  );
}

// 북마크 아이콘 — 디자인 원본 20x20, stroke 1.6. filled면 같은 패스를 채운다.
export function BookmarkIcon({ size = 20, color = "#15171C", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M6 3.7998H14C14.6627 3.7998 15.2002 4.33726 15.2002 5V14.8809C15.2002 15.0499 15.0035 15.1426 14.873 15.0352L10.5088 11.4414L10 11.0225L9.49121 11.4414L5.12695 15.0352C4.99648 15.1426 4.7998 15.0499 4.7998 14.8809V5C4.7998 4.33726 5.33726 3.7998 6 3.7998Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

// 활동 사진 업로드 카메라 아이콘 — 디자인 원본 26x26. (0-면적 fill 패스는 생략)
export function CameraAddIcon({ size = 26, color = "#A6ACB7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path d="M21 8H5C3.89543 8 3 8.89543 3 10V20C3 21.1046 3.89543 22 5 22H21C22.1046 22 23 21.1046 23 20V10C23 8.89543 22.1046 8 21 8Z" stroke={color} strokeWidth={1.6} />
      <Path d="M9 8L10.5 5.5H15.5L17 8" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M13 18.5C14.933 18.5 16.5 16.933 16.5 15C16.5 13.067 14.933 11.5 13 11.5C11.067 11.5 9.5 13.067 9.5 15C9.5 16.933 11.067 18.5 13 18.5Z" stroke={color} strokeWidth={1.6} />
      <Path d="M19 11V14M17.5 12.5H20.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}
