import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Linking,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { MediaImageBackground } from "../../components/MediaImage";
import { useMyPageDrawer } from "../../components/MyPageDrawer";
import { useBoardsQuery } from "../../hooks/useApi";
import { API_ORIGIN, bannerApi, eventApi, notificationApi, postApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import type { BannerItem, Board, EventItem, PostListItem } from "../../types";
import { toAbsoluteMediaUrl } from "../../utils/mediaAccess";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  primary100: "#D5E0FE",
  primary900: "#0B1F56",
  cyan: "#1FA9BD",
  purple: "#6C4FCB",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E1E4E9",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#A6ACB7",
};

const CARD_ELEVATION = {
  shadowColor: "#0B1F56",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 1,
};

const BANNER_THEMES: Record<BannerItem["theme"], { bg: string; badge: string; text: string; muted: string; border?: string }> = {
  none: { bg: "#FFFFFF", badge: COLORS.primary, text: COLORS.text, muted: COLORS.muted, border: COLORS.border },
  blue: { bg: "#2761FF", badge: "#D5E0FE", text: "#FFFFFF", muted: "#EAF1FF" },
  navy: { bg: "#0B1F56", badge: "#D8E4FF", text: "#FFFFFF", muted: "#C9DAFF" },
  cyan: { bg: "#1FA9BD", badge: "#E6F9FB", text: "#FFFFFF", muted: "#E6FBFF" },
  purple: { bg: "#6C4FCB", badge: "#F1EAFB", text: "#FFFFFF", muted: "#F5EFFF" },
};

const NOTICE_BOARD_SLUGS = ["all-notices", "academic-notices", "general-notices", "webinar-notices"];
const POPULAR_BOARD_SLUGS = ["community-major", "free-board", "lecture-reviews", "mutual-aid"];
const ALBUM_BOARD_SLUGS = ["activity-history", "event-album", "photo-album", "student-council"];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MOBILE_WEB_WIDTH = 405;
const HORIZONTAL_PADDING = 20;
const ALBUM_CARD_WIDTH = 120;
const ALBUM_CARD_GAP = 10;
const HOME_ALBUM_LIMIT = 10;
const ALBUM_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#2761FF", "#8EC9FF"],
  ["#5B49C8", "#B7A4F8"],
  ["#0E7B60", "#4DBB91"],
];

type IconName = keyof typeof Ionicons.glyphMap;

function mediaUrl(value?: string | null) {
  return toAbsoluteMediaUrl(value, API_ORIGIN);
}

function pickBannerImage(banner: BannerItem | undefined, width: number) {
  if (!banner) {
    return null;
  }
  if (width >= 900) {
    return mediaUrl(banner.image_urls?.desktop ?? banner.image_urls?.tablet ?? banner.image_urls?.mobile ?? banner.image_url);
  }
  if (width >= 600) {
    return mediaUrl(banner.image_urls?.tablet ?? banner.image_urls?.desktop ?? banner.image_urls?.mobile ?? banner.image_url);
  }
  return mediaUrl(banner.image_urls?.mobile ?? banner.image_urls?.tablet ?? banner.image_urls?.desktop ?? banner.image_url);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function monthDayLabel(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateOfMonth = String(date.getDate()).padStart(2, "0");
  return `${month}.${dateOfMonth}.(${day})`;
}

function yearMonthDayLabel(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateOfMonth = String(date.getDate()).padStart(2, "0");
  const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${year}.${month}.${dateOfMonth}(${day})`;
}

function noticeCategoryLabel(value?: string | null) {
  const category = value?.trim().toLowerCase();
  if (!category || category === "all") return "공지";
  if (category.includes("academic") || category.includes("학사")) return "학사공지";
  if (category.includes("event") || category.includes("행사")) return "행사공지";
  if (category.includes("webinar") || category.includes("특강")) return "특강공지";
  return value?.trim() || "공지";
}

function noticeDotColor(value?: string | null) {
  const category = value?.trim().toLowerCase() ?? "";
  if (category.includes("event") || category.includes("webinar") || category.includes("행사") || category.includes("특강")) {
    return "#E25576";
  }
  return COLORS.primary;
}

function shortDateTime(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${date.getMonth() + 1}.${date.getDate()} ${hour}:${minute}`;
}

function dDayLabel(value?: string | null) {
  if (!value) return "";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((targetDay.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "마감";
  if (days === 0) return "D-day";
  return `D-${days}`;
}

function flattenBoards(groups?: { boards: Board[] }[]) {
  return groups?.flatMap((group) => group.boards) ?? [];
}

function findBoardId(boards: Board[], slugs: string[], fallbackCategory?: string) {
  for (const slug of slugs) {
    const board = boards.find((item) => item.slug === slug);
    if (board) {
      return board.id;
    }
  }
  if (fallbackCategory) {
    return boards.find((item) => item.category === fallbackCategory)?.id;
  }
  return boards[0]?.id;
}

function thumbnailUrl(post: PostListItem) {
  if (post.thumbnail_url) {
    return mediaUrl(post.thumbnail_url);
  }
  const metadata = post.metadata ?? {};
  const keys = ["thumbnail_url", "image_url", "cover_url"];
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string") {
      return mediaUrl(value);
    }
  }
  return null;
}

function eventDays(events: EventItem[], month: Date) {
  const days = new Set<number>();
  for (const event of events) {
    const date = new Date(event.start_at);
    if (!Number.isNaN(date.getTime()) && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()) {
      days.add(date.getDate());
    }
  }
  return days;
}

function buildMonthCells(month: Date, activeDay: number, markedDays: Set<number>) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: { key: string; day?: number; active?: boolean; marked?: boolean }[] = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push({ key: `blank-${index}` });
  }
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push({ key: `day-${day}`, day, active: day === activeDay, marked: markedDays.has(day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-${cells.length}` });
  }
  return cells;
}

function getHomeContentWidth(windowWidth: number) {
  const shellWidth = Platform.OS === "web" ? Math.min(windowWidth, MOBILE_WEB_WIDTH) : windowWidth;
  return Math.max(280, shellWidth - HORIZONTAL_PADDING * 2);
}

function IconButton({ icon, label, hasBadge = false, onPress }: { icon: IconName; label: string; hasBadge?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={24} color={COLORS.muted} />
      {hasBadge ? <View style={styles.notificationBadge} /> : null}
    </Pressable>
  );
}

function SectionHeader({ title, actionLabel = "더보기", onPress }: { title: string; actionLabel?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.moreButton}>
          <Text style={styles.moreText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function HomeEmptyState({ type }: { type: "notices" | "popular" | "album" }) {
  const content = {
    notices: {
      icon: "calendar-outline" as IconName,
      title: "등록된 공지사항이 없어요",
      description: "새로운 공지가 등록되면 알려드릴게요",
    },
    popular: {
      icon: "calendar-outline" as IconName,
      title: "인기 게시글이 아직 없어요",
      description: "곧 다양한 게시글이 채워질 거예요",
    },
    album: {
      icon: "camera-outline" as IconName,
      title: "행사 사진첩이 아직 없어요",
      description: "새로운 행사 사진이 등록되면 알려드릴게요",
    },
  }[type];

  return (
    <View style={styles.emptyState}>
      <Ionicons name={content.icon} size={32} color="#AAB2BF" />
      <Text style={styles.emptyStateTitle}>{content.title}</Text>
      <Text style={styles.emptyStateDescription}>{content.description}</Text>
    </View>
  );
}

function HomeErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cloud-offline-outline" size={30} color="#AAB2BF" />
      <Text style={styles.emptyStateTitle}>{label}을 불러오지 못했습니다.</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

function HomeBanner({
  banner,
  index,
  total,
  width,
}: {
  banner?: BannerItem;
  index: number;
  total: number;
  width: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const theme = BANNER_THEMES[banner?.theme ?? "navy"];
  const isPlain = banner?.theme === "none";
  const imageUrl = pickBannerImage(banner, Platform.OS === "web" ? MOBILE_WEB_WIDTH : windowWidth);
  const title = banner?.title;
  const description = banner?.subtitle ?? "";
  const deadline = banner?.deadline_at ? `${shortDateTime(banner.deadline_at)} 마감` : "";
  const badge = banner?.badge_text ?? dDayLabel(banner?.deadline_at);
  const pageTotal = Math.max(total, 1);
  const pageIndex = Math.min(index + 1, pageTotal);
  const linkHref = banner?.cta_href?.trim();
  const handlePress = () => {
    if (!linkHref) {
      return;
    }
    if (/^https?:\/\//i.test(linkHref)) {
      Linking.openURL(linkHref);
      return;
    }
    router.push(linkHref as never);
  };
  const gradientColors: readonly [string, string, string] = isPlain
    ? ["rgba(255,255,255,0)", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]
    : imageUrl
    ? ["rgba(7,20,74,0.82)", "rgba(20,55,174,0.74)", "rgba(39,97,255,0.68)"]
    : ["#07144A", "#1437AE", "#2761FF"];

  const content = (
    <View style={[styles.bannerContent, imageUrl && !isPlain ? styles.bannerImageOverlay : null]}>
      {!isPlain ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={gradientColors}
            locations={[0, 0.48, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          />
        </>
      ) : null}
      <View style={styles.bannerTopRow}>
        {badge ? (
          <View style={styles.bannerBadge}>
            <Ionicons name="location-outline" size={13} color={theme.badge} />
            <Text style={[styles.bannerBadgeText, { color: theme.badge }]} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
      <View style={styles.bannerTextBlock}>
        {title ? (
          <Text style={[styles.bannerTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text style={[styles.bannerSubtitle, !title ? { marginTop: 0 } : null, { color: theme.muted }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.bannerBottomRow}>
        {deadline ? <Text style={[styles.bannerDate, { color: theme.muted }]}>{deadline}</Text> : <View />}
        <View style={[styles.bannerPager, isPlain ? styles.plainBannerPager : null]}>
          <Text style={[styles.bannerPagerText, isPlain ? styles.plainBannerPagerText : null]}>{pageIndex}/{pageTotal}</Text>
        </View>
      </View>
    </View>
  );

  const bannerView = imageUrl ? (
    <MediaImageBackground
      media={{ url: imageUrl }}
      imageStyle={styles.bannerImage}
      style={[styles.banner, isPlain ? styles.plainBanner : null, { width, backgroundColor: theme.bg, borderColor: theme.border ?? "transparent" }]}
    >
      {content}
    </MediaImageBackground>
  ) : (
    <View style={[styles.banner, isPlain ? styles.plainBanner : null, { width, backgroundColor: theme.bg, borderColor: theme.border ?? "transparent" }]}>{content}</View>
  );

  if (!linkHref) {
    return bannerView;
  }

  return (
    <Pressable accessibilityRole="link" accessibilityLabel={banner?.title ?? "배너 바로가기"} onPress={handlePress}>
      {bannerView}
    </Pressable>
  );
}

function HomeBannerCarousel({ banners }: { banners: BannerItem[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const bannerWidth = measuredWidth || getHomeContentWidth(windowWidth);
  const carouselItems = banners;
  const carouselCount = carouselItems.length;
  const isSwipeable = carouselItems.length > 1;
  const snapInterval = bannerWidth + 12;

  useEffect(() => {
    if (currentIndex < carouselCount) {
      return;
    }
    setCurrentIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [carouselCount, currentIndex]);

  useEffect(() => {
    if (!isSwipeable || measuredWidth <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((index) => {
        const nextIndex = (index + 1) % carouselCount;
        scrollRef.current?.scrollTo({ x: nextIndex * snapInterval, animated: true });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [carouselCount, isSwipeable, measuredWidth, snapInterval]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isSwipeable) {
      return;
    }
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    setCurrentIndex(Math.max(0, Math.min(nextIndex, carouselCount - 1)));
  };

  if (carouselItems.length === 0) {
    return (
      <View style={[styles.emptyRow, { marginBottom: 6 }]}>
        <Text style={styles.emptyText}>현재 등록된 홈 배너가 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      bounces={false}
      decelerationRate="fast"
      disableIntervalMomentum
      pagingEnabled={false}
      scrollEnabled={isSwipeable}
      showsHorizontalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={isSwipeable ? snapInterval : undefined}
      onLayout={(event: LayoutChangeEvent) => setMeasuredWidth(event.nativeEvent.layout.width)}
      onMomentumScrollEnd={handleMomentumEnd}
      style={styles.bannerCarousel}
      contentContainerStyle={styles.bannerCarouselContent}
    >
      {carouselItems.map((item, index) => (
        <HomeBanner
          key={item.id}
          banner={item}
          index={index}
          total={carouselItems.length}
          width={bannerWidth}
        />
      ))}
    </ScrollView>
  );
}

function NoticeList({
  posts,
  loading,
  isError,
  onRetry,
  boardId,
}: {
  posts: PostListItem[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  boardId?: number;
}) {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (isError) {
    return <HomeErrorState label="공지사항" onRetry={onRetry} />;
  }

  const rows = posts.slice(0, 2);
  if (!rows.length) {
    return <HomeEmptyState type="notices" />;
  }

  return (
    <View style={styles.noticeList}>
      {rows.map((post, index) => (
        <Pressable
          key={post.id}
          onPress={() => router.push(`/board/post/${post.id}` as never)}
          style={[styles.noticeRow, index === rows.length - 1 ? styles.noticeRowLast : null]}
        >
          <View style={[styles.noticeDot, { backgroundColor: noticeDotColor(post.category) }]} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle} numberOfLines={1}>
              {post.title}
            </Text>
            <Text style={styles.noticeMeta} numberOfLines={1}>
              {noticeCategoryLabel(post.category)} · {yearMonthDayLabel(post.created_at)}
              {post.deadline_at ? ` · ${dDayLabel(post.deadline_at)}` : ""}
            </Text>
          </View>
          {boardId ? null : <Ionicons name="remove" size={0} color={COLORS.subtle} />}
        </Pressable>
      ))}
    </View>
  );
}

function CalendarCard({ events, month }: { events: EventItem[]; month: Date }) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const visibleEvents = events;
  const activeDay = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth() ? today.getDate() : 1;
  const markedDays = eventDays(visibleEvents, month);
  const cells = buildMonthCells(month, activeDay, markedDays);
  const nextEvent = [...visibleEvents]
    .filter((event) => {
      const date = new Date(event.start_at);
      return !Number.isNaN(date.getTime()) && new Date(date.getFullYear(), date.getMonth(), date.getDate()) >= todayStart;
    })
    .sort((left, right) => +new Date(left.start_at) - +new Date(right.start_at))[0];

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => router.push("/events/calendar" as never)} style={styles.calendarArrow}>
          <Ionicons name="chevron-back" size={15} color={COLORS.subtle} />
        </Pressable>
        <Text style={styles.calendarMonth}>{monthLabel(month)}</Text>
        <Pressable onPress={() => router.push("/events/calendar" as never)} style={styles.calendarArrow}>
          <Ionicons name="chevron-forward" size={15} color={COLORS.subtle} />
        </Pressable>
      </View>
      <View style={styles.calendarGrid}>
        {WEEKDAYS.map((day, index) => (
          <Text key={day} style={[styles.weekday, index === 0 ? styles.weekdaySunday : null]}>
            {day}
          </Text>
        ))}
        {cells.map((cell) => (
          <Pressable
            key={cell.key}
            accessibilityLabel={cell.day ? `${month.getMonth() + 1}월 ${cell.day}일 일정 보기` : undefined}
            disabled={!cell.day}
            onPress={() => {
              if (!cell.day) return;
              const selectedDate = new Date(month.getFullYear(), month.getMonth(), cell.day);
              router.push(`/events/day/${dateKey(selectedDate)}` as never);
            }}
            style={styles.dayCell}
          >
            {cell.day ? (
              <View style={[styles.dayBadge, cell.active ? styles.dayBadgeActive : cell.marked ? styles.dayBadgeMarked : null]}>
                <Text style={[styles.dayText, cell.active ? styles.dayTextActive : cell.marked ? styles.dayTextMarked : null]}>{cell.day}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => (nextEvent ? router.push(`/events/${nextEvent.id}` as never) : router.push("/events" as never))}
        style={styles.nextEvent}
      >
        <View style={styles.eventDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nextEventTitle} numberOfLines={1}>
            {nextEvent ? `${monthDayLabel(nextEvent.start_at)} · ${nextEvent.title}` : "예정된 일정이 없습니다"}
          </Text>
        </View>
        {nextEvent ? <Text style={styles.nextEventDday}>{dDayLabel(nextEvent.start_at)}</Text> : null}
      </Pressable>
    </View>
  );
}

function PopularPosts({ posts, compact }: { posts: PostListItem[]; compact: boolean }) {
  const rows = posts.slice(0, 2);
  if (!rows.length) {
    return <HomeEmptyState type="popular" />;
  }

  return (
    <View style={[styles.popularGrid, compact ? styles.popularGridCompact : null]}>
      {rows.map((post) => (
        <Pressable key={post.id} onPress={() => router.push(`/board/post/${post.id}` as never)} style={styles.popularCard}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText} numberOfLines={1}>
              {post.category || "커뮤니티"}
            </Text>
          </View>
          <Text style={styles.popularTitle} numberOfLines={2}>
            {post.title}
          </Text>
          <View style={styles.postStats}>
            <Ionicons name="chatbubble-outline" size={13} color={COLORS.muted} />
            <Text style={styles.statText}>{post.comment_count}</Text>
            <Ionicons name="heart" size={13} color={COLORS.muted} />
            <Text style={styles.statText}>{post.like_count}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function AlbumStrip({ posts }: { posts: PostListItem[] }) {
  const rows = posts.slice(0, HOME_ALBUM_LIMIT);
  if (!rows.length) {
    return <HomeEmptyState type="album" />;
  }

  return (
    <ScrollView
      horizontal
      bounces={false}
      decelerationRate="fast"
      disableIntervalMomentum
      scrollEnabled={rows.length > 2}
      showsHorizontalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={ALBUM_CARD_WIDTH + ALBUM_CARD_GAP}
      contentContainerStyle={styles.albumContent}
    >
      {rows.map((post, index) => {
        const image = thumbnailUrl(post);
        return (
          <Pressable key={post.id} onPress={() => router.push(`/board/post/${post.id}` as never)} style={styles.albumCard}>
            {image ? (
              <MediaImageBackground
                media={{ id: post.thumbnail_media_id, url: image }}
                imageStyle={styles.albumImage}
                style={styles.albumImageBox}
              />
            ) : (
              <LinearGradient
                colors={ALBUM_GRADIENTS[index % ALBUM_GRADIENTS.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.albumFallback}
              >
                <Ionicons name="camera-outline" size={26} color="#DDE7FF" />
              </LinearGradient>
            )}
            <Text style={styles.albumTitle} numberOfLines={2}>
              {post.title}
            </Text>
            <Text style={styles.albumMeta}>{yearMonthDayLabel(post.created_at)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const { openDrawer } = useMyPageDrawer();
  const month = useMemo(() => new Date(), []);
  const compact = false;
  const monthStart = dateKey(new Date(month.getFullYear(), month.getMonth(), 1));
  const monthEnd = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const {
    data: boardGroups,
    isError: boardsError,
    isLoading: boardsLoading,
    refetch: refetchBoards,
  } = useBoardsQuery();
  const boards = useMemo(() => flattenBoards(boardGroups?.data), [boardGroups?.data]);
  const noticeBoardId = useMemo(() => findBoardId(boards, NOTICE_BOARD_SLUGS, "notices"), [boards]);
  const popularBoardId = useMemo(() => findBoardId(boards, POPULAR_BOARD_SLUGS, "community"), [boards]);
  const albumBoardId = useMemo(() => findBoardId(boards, ALBUM_BOARD_SLUGS, "participation"), [boards]);

  const bannersQuery = useQuery({
    queryKey: ["banners", "home"],
    queryFn: () => bannerApi.getBanners({ placement: "home" }),
  });
  const noticesQuery = useQuery({
    queryKey: ["home", "notices", noticeBoardId],
    queryFn: () => postApi.getPosts(noticeBoardId ?? 0, 1, 3, { sort: "latest" }),
    enabled: Boolean(noticeBoardId),
  });
  const eventsQuery = useQuery({
    queryKey: ["home", "events", monthStart, monthEnd],
    queryFn: () => eventApi.getEvents({ from_date: monthStart, to_date: monthEnd }),
  });
  const popularQuery = useQuery({
    queryKey: ["home", "popular", popularBoardId],
    queryFn: () => postApi.getPosts(popularBoardId ?? 0, 1, 2, { sort: "popular" }),
    enabled: Boolean(popularBoardId),
  });
  const albumQuery = useQuery({
    queryKey: ["home", "album", albumBoardId],
    queryFn: () => postApi.getPosts(albumBoardId ?? 0, 1, HOME_ALBUM_LIMIT, { sort: "latest" }),
    enabled: Boolean(albumBoardId),
  });
  const notificationQuery = useQuery({
    queryKey: ["notifications", "home-badge"],
    queryFn: () => notificationApi.getNotifications(1, 100),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const banners = bannersQuery.data?.data ?? [];
  const notices = noticesQuery.data?.data ?? [];
  const events = eventsQuery.data?.data ?? [];
  const popularPosts = popularQuery.data?.data ?? [];
  const albumPosts = albumQuery.data?.data ?? [];
  const hasUnreadNotifications = (notificationQuery.data?.data ?? []).some((notification) => !notification.is_read);
  const displayName = user?.nickname || "서강인";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 21) }]}
    >
      <View style={styles.header}>
        <View style={styles.greetingWrap}>
          <Text style={styles.greeting} numberOfLines={1}>
            안녕하세요, {displayName}님 👋
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="notifications-outline" label="알림" hasBadge={hasUnreadNotifications} onPress={() => router.push("/notifications" as never)} />
          <IconButton icon="person-circle-outline" label="마이페이지" onPress={() => (isAuthenticated ? openDrawer() : router.push("/auth/login" as never))} />
        </View>
      </View>

      {bannersQuery.isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : bannersQuery.isError ? (
        <HomeErrorState label="홈 배너" onRetry={() => void bannersQuery.refetch()} />
      ) : (
        <HomeBannerCarousel banners={banners} />
      )}

      <SectionHeader title="공지사항" onPress={() => router.push("/(tabs)/notices" as never)} />
      <NoticeList
        posts={notices}
        loading={noticesQuery.isLoading || boardsLoading}
        isError={boardsError || noticesQuery.isError}
        onRetry={() => void Promise.all([refetchBoards(), noticesQuery.refetch()])}
        boardId={noticeBoardId}
      />

      <SectionHeader title="서강생활 일정" />
      {eventsQuery.isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : eventsQuery.isError ? (
        <HomeErrorState label="일정" onRetry={() => void eventsQuery.refetch()} />
      ) : (
        <CalendarCard events={events} month={month} />
      )}

      <SectionHeader title="🔥 인기 게시글" onPress={() => router.push((popularBoardId ? `/board/${popularBoardId}` : "/(tabs)/boards") as never)} />
      {popularQuery.isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : boardsError || popularQuery.isError ? (
        <HomeErrorState label="인기 게시글" onRetry={() => void Promise.all([refetchBoards(), popularQuery.refetch()])} />
      ) : (
        <PopularPosts posts={popularPosts} compact={compact} />
      )}

      <SectionHeader title="📸 행사 사진첩" onPress={() => router.push((albumBoardId ? `/board/${albumBoardId}` : "/(tabs)/boards") as never)} />
      {albumQuery.isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : boardsError || albumQuery.isError ? (
        <HomeErrorState label="행사 사진첩" onRetry={() => void Promise.all([refetchBoards(), albumQuery.refetch()])} />
      ) : (
        <AlbumStrip posts={albumPosts} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 21,
    paddingBottom: 28,
  },
  header: {
    height: 57,
    justifyContent: "flex-end",
    marginBottom: 18,
  },
  eyebrow: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  greetingWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  greeting: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 24,
  },
  headerActions: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    gap: 16,
  },
  iconButton: {
    position: "relative",
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.bg,
    backgroundColor: "#E25576",
  },
  bannerCarousel: {
    width: "100%",
    overflow: "visible",
  },
  bannerCarouselContent: {
    gap: 12,
  },
  banner: {
    minHeight: 200,
    borderRadius: 16,
    borderWidth: 0,
    overflow: "hidden",
    ...CARD_ELEVATION,
  },
  plainBanner: {
    borderWidth: 1,
  },
  bannerImage: {
    borderRadius: 16,
  },
  bannerImageOverlay: {
    backgroundColor: "rgba(11,31,86,0.62)",
  },
  bannerGradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  bannerContent: {
    flex: 1,
    minHeight: 200,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  bannerBadgeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  bannerPager: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bannerPagerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "400",
  },
  plainBannerPager: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  plainBannerPagerText: {
    color: COLORS.muted,
  },
  bannerTextBlock: {
    marginTop: 8,
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: "500",
    lineHeight: 27,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    fontWeight: "400",
  },
  bannerBottomRow: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bannerDate: {
    fontSize: 13,
    fontWeight: "400",
  },
  bannerCta: {
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bannerCtaText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "500",
  },
  moreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
  },
  moreText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
  },
  loadingBox: {
    minHeight: 126,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyRow: {
    minHeight: 54,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  emptyStateTitle: {
    color: "#2C3038",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
    marginTop: 8,
  },
  emptyStateDescription: {
    color: "#8A919C",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 8,
  },
  retryButton: {
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  noticeList: {
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    overflow: "hidden",
  },
  noticeRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 0,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
  },
  noticeRowLast: {
    borderBottomWidth: 0,
  },
  noticeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  noticeContent: {
    flex: 1,
    minWidth: 0,
  },
  noticeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  noticeMeta: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "400",
    marginTop: 4,
  },
  calendarCard: {
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  calendarArrow: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonth: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  calendarLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  calendarLinkText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  weekday: {
    width: "14.285%",
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 12,
  },
  weekdaySunday: {
    color: "#993556",
  },
  dayCell: {
    width: "14.285%",
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  dayBadgeMarked: {
    backgroundColor: "#E6F1FB",
  },
  dayText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
  },
  dayTextActive: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  dayTextMarked: {
    color: "#0C447C",
    fontWeight: "500",
  },
  nextEvent: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F3",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 0,
    backgroundColor: "transparent",
    padding: 0,
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  nextEventTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
  },
  nextEventDday: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  nextEventMeta: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 2,
  },
  popularGrid: {
    flexDirection: "row",
    gap: 10,
  },
  popularGridCompact: {
    flexDirection: "column",
  },
  popularCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  categoryPill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: 8,
    backgroundColor: "#E6F1FB",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryPillText: {
    color: "#0C447C",
    fontSize: 11,
    fontWeight: "400",
  },
  popularTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 8,
  },
  popularPreview: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    flex: 1,
  },
  postStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  statText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "400",
    marginRight: 8,
  },
  albumContent: {
    gap: 10,
    paddingRight: 20,
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
  },
  albumImageBox: {
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.primary100,
  },
  albumImage: {
    borderRadius: 8,
  },
  albumFallback: {
    height: 120,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  albumTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
    marginTop: 6,
  },
  albumMeta: {
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: "400",
    marginTop: 4,
  },
});
