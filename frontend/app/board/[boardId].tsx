import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, FlatList, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MediaImage, { MediaImageBackground } from "../../components/MediaImage";
import LoadingState from "../../components/LoadingState";
import PostCard from "../../components/PostCard";
import { useBoardsQuery } from "../../hooks/useApi";
import { useBoardPosts, useMultiBoardPosts } from "../../hooks/usePosts";
import { API_ORIGIN } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import type { Board, PostListItem } from "../../types";
import { boardParentRoute, postDetailRoute } from "../../utils/appRoutes";
import { formatBoardDate } from "../../utils/dateFormat";
import { toAbsoluteMediaUrl } from "../../utils/mediaAccess";
import { pastCouncilActivitiesFromMetadata } from "../../utils/pastCouncil";
import {
  RESOURCE_ALL_SLUGS,
  RESOURCE_FILTERS,
  RESOURCE_FILTER_SLUGS,
  resourceFilterAfterNavigation,
} from "../../utils/resourceBoards";
import type { ResourceFilter } from "../../utils/resourceBoards";
import { formatCohortName } from "../../utils/userLabel";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#8A919C",
  divider: "#EEF0F3",
  surface: "#FFFFFF",
  page: "#FFFFFF",
  danger: "#B91C1C",
  danger50: "#FFF1F2",
};

const BOARD_DISPLAY: Record<string, { name: string; description?: string }> = {
  "all-notices": { name: "공지사항" },
  "academic-notices": { name: "공지사항" },
  "event-notices": { name: "공지사항" },
  "academic-calendar": { name: "일정" },
  "webinar-notices": { name: "공지사항" },
  "event-album": { name: "커뮤니티" },
  "lecture-reviews": { name: "커뮤니티" },
  "exam-archive": { name: "커뮤니티" },
  "comprehensive-exam": { name: "커뮤니티" },
  "graduation-thesis": { name: "커뮤니티" },
  "club-activity": { name: "참여활동" },
  "study-activity": { name: "참여활동" },
  "networking-activity": { name: "참여활동" },
  "study-recruit": { name: "참여활동" },
  "club-promo": { name: "참여활동" },
  "club-apply": { name: "참여활동" },
  "alumni-directory": { name: "참여활동" },
  "networking-programs": { name: "참여활동" },
  "alumni-photo": { name: "참여활동" },
  "gsa-executives": { name: "원우회 임원진 소개" },
  "gsa-cohort-leaders": { name: "기수별 기장단 소개" },
  "gsa-past-councils": { name: "역대 원우회" },
  "council-activity": { name: "원우회 활동내역" },
  "gsa-activity": { name: "원우회 활동내역" },
  suggestions: { name: "건의사항" },
  "mutual-aid": { name: "원우회 상조회" },
  accounting: { name: "회계장부" },
};

const NOTICE_FILTERS = ["전체", "학사공지", "행사공지"];
const STUDY_FILTERS = ["모집", "활동 인증"];
const PARTICIPATION_FILTERS = ["안내", "활동 인증"];
const PARTICIPATION_GROUPS = [
  { key: "club", label: "동아리", guideSlug: "club-promo", certificationSlug: "club-activity" },
  { key: "study", label: "스터디", guideSlug: "study-recruit", certificationSlug: "study-activity" },
  { key: "networking", label: "네트워킹", guideSlug: "networking-programs", certificationSlug: "networking-activity" },
] as const;
const ALBUM_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#2761FF", "#86C8FF"],
  ["#5B49C8", "#B7A4F8"],
  ["#0E7B60", "#55C69A"],
  ["#B94A2F", "#F39A7D"],
];
type IconName = keyof typeof Ionicons.glyphMap;
type SectionTab = {
  label: string;
  active: boolean;
  target?: Board;
  initialFilter?: ResourceFilter;
};
type ExecutiveMember = {
  name: string;
  cohort?: string;
  role: string;
  imageUrl?: string;
  intro?: string;
};
type CohortLeaderSummary = {
  id: string;
  cohort: string;
  captain: string;
  viceCaptain?: string;
  greeting?: string;
  intro: string;
  bannerImageUrl?: string;
  captainImageUrl?: string;
  viceCaptainImageUrl?: string;
};
type PastCouncilSummary = {
  id: string;
  cohort: string;
  presidentName: string;
  presidentCohort?: string;
  vicePresidentName?: string;
  vicePresidentCohort?: string;
  intro?: string;
  bannerImageUrl?: string;
  presidentImageUrl?: string;
  vicePresidentImageUrl?: string;
  activities: { date?: string; title: string }[];
};

function flattenBoards(groups?: { boards: Board[] }[]) {
  return groups?.flatMap((group) => group.boards) ?? [];
}

function getBoardDisplay(board?: Board | null) {
  if (!board) {
    return { name: "게시판", description: undefined };
  }
  return BOARD_DISPLAY[board.slug] ?? { name: board.name, description: board.description };
}

function filterOptions(board?: Board | null) {
  if (!board) return ["전체"];
  const groupKey = participationGroupKey(board);
  if (board.board_type === "notice") return NOTICE_FILTERS;
  if (board.board_type === "resource") return RESOURCE_FILTERS;
  if (groupKey === "study") return STUDY_FILTERS;
  if (board.board_type === "activity_certification") return PARTICIPATION_FILTERS;
  if (groupKey) return PARTICIPATION_FILTERS;
  return ["전체"];
}

function defaultFilterForBoard(board?: Board | null, requestedFilter?: ResourceFilter) {
  if (!board) return "전체";
  if (board.board_type === "resource") return resourceFilterAfterNavigation(board, requestedFilter);
  if (board.board_type === "activity_certification") return "활동 인증";
  if (participationGroupKey(board) === "study") return "모집";
  if (participationGroupKey(board)) return "안내";
  return "전체";
}

function categoryForFilter(filter: string, board?: Board | null) {
  if (board?.board_type === "activity_certification" || participationGroupKey(board)) {
    return undefined;
  }
  if (board?.board_type === "resource") {
    return filter === "전체" || RESOURCE_FILTER_SLUGS[filter] ? undefined : filter;
  }
  return filter === "전체" || filter === "모집" || filter === "안내" ? undefined : filter;
}

function findBoardBySlug(boards: Board[], slug: string) {
  return boards.find((item) => item.slug === slug);
}

function participationGroupKey(board?: Board | null) {
  if (!board) return null;
  if (board.slug.includes("club") || board.category === "club") return "club";
  if (board.slug.includes("study") || board.category === "study") return "study";
  if (board.slug.includes("networking") || board.slug.includes("alumni") || board.category === "alumni") return "networking";
  return null;
}

function sectionTabs(board: Board | undefined, boards: Board[]): SectionTab[] {
  if (!board) return [];
  const isCommunityResource = board.slug === "event-album" || board.board_type === "resource" || board.category === "resources";
  if (isCommunityResource) {
    return [
      { label: "행사 사진첩", active: board.slug === "event-album", target: findBoardBySlug(boards, "event-album") },
      {
        label: "자료공유",
        active: board.board_type === "resource" || board.category === "resources",
        target: findBoardBySlug(boards, "lecture-reviews") ?? boards.find((item) => item.board_type === "resource"),
        initialFilter: "전체",
      },
    ];
  }

  const groupKey = participationGroupKey(board);
  if (groupKey) {
    const isCertificationMode = board.board_type === "activity_certification";
    return PARTICIPATION_GROUPS.map((item) => ({
      label: item.label,
      active: item.key === groupKey,
      target: findBoardBySlug(boards, isCertificationMode ? item.certificationSlug : item.guideSlug),
    }));
  }
  return [];
}

function IconButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={24} color={COLORS.text} />
    </Pressable>
  );
}

function imageUrl(value?: string | null) {
  return toAbsoluteMediaUrl(value, API_ORIGIN);
}

function compactPreview(post: PostListItem) {
  const title = post.title.trim();
  const preview = post.content_preview.trim();
  const withoutDuplicateTitle = preview.startsWith(title) ? preview.slice(title.length).trim() : preview;
  return withoutDuplicateTitle
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && line !== title) ?? "";
}

function metadataString(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function executivesFromMetadata(metadata: Record<string, unknown> | null | undefined): ExecutiveMember[] {
  const executives = metadata?.executives;
  if (!Array.isArray(executives)) {
    return [];
  }

  const parsed = executives
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const cohort = typeof record.cohort === "string" ? record.cohort.trim() : "";
      const role = typeof record.role === "string" ? record.role.trim() : "";
      const imageUrl = typeof record.image_url === "string" ? record.image_url.trim() : undefined;
      const intro = typeof record.intro === "string" ? record.intro.trim() : undefined;
      return name && role ? { name, cohort: cohort || undefined, role, imageUrl, intro } : null;
    })
    .filter(Boolean) as ExecutiveMember[];

  return parsed;
}

function cleanPostTitle(title: string) {
  return title.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function extractCohort(title: string, content: string) {
  const source = `${title}\n${content}`;
  const match = source.match(/(\d{2})\s*기/);
  return match ? `${match[1]}기` : "기수";
}

function extractLeaderName(content: string, cohort: string) {
  const escapedCohort = cohort.replace("기", "\\s*기");
  const namePattern = "([가-힣]{2,4})(?=입니다|[\\s(),.!?]|$)";
  const patterns = [
    new RegExp(`기장(?:\\s*[:：\\-]|\\s+)\\s*(?:${escapedCohort}\\s*)?${namePattern}`),
    new RegExp(`${escapedCohort}\\s*기장\\s+${namePattern}`),
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function extractViceLeaderName(content: string, cohort: string) {
  const escapedCohort = cohort.replace("기", "\\s*기");
  const namePattern = "([가-힣]{2,4})(?=입니다|[\\s(),.!?]|$)";
  const patterns = [
    new RegExp(`부기장(?:\\s*[:：\\-]|\\s+)\\s*(?:${escapedCohort}\\s*)?${namePattern}`),
    new RegExp(`${escapedCohort}\\s*부기장\\s+${namePattern}`),
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function firstMeaningfulParagraph(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#&\s]+/, "").trim())
    .filter(Boolean);
  return lines.find((line) => !line.includes("기장단 소개") && !line.includes("[구성]")) ?? "";
}

function cohortLeaderSummaries(posts: PostListItem[], metadata?: Record<string, unknown> | null) {
  const configured = metadata?.cohort_leaders;
  if (Array.isArray(configured)) {
    const parsed = configured.flatMap((item, index): CohortLeaderSummary[] => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const rawCohort = typeof record.cohort === "string" ? record.cohort.trim() : "";
      const captain = typeof record.captain_name === "string" ? record.captain_name.trim() : "";
      if (!rawCohort || !captain) return [];
      const cohort = rawCohort.endsWith("기") ? rawCohort : `${rawCohort}기`;
      const stringValue = (key: string) => typeof record[key] === "string" && record[key].trim() ? record[key].trim() : undefined;
      return [{
        id: `configured-${cohort}-${index}`,
        cohort,
        captain,
        viceCaptain: stringValue("vice_captain_name"),
        greeting: stringValue("greeting"),
        intro: stringValue("intro") ?? "",
        bannerImageUrl: stringValue("banner_image_url"),
        captainImageUrl: stringValue("captain_image_url"),
        viceCaptainImageUrl: stringValue("vice_captain_image_url"),
      }];
    });
    if (parsed.length > 0) {
      return parsed.sort((a, b) => Number.parseInt(b.cohort, 10) - Number.parseInt(a.cohort, 10));
    }
  }

  return posts
    .map((post) => {
      const content = post.content_preview || post.title;
      const cohort = extractCohort(post.title, content);
      const captain = extractLeaderName(content, cohort) || cleanPostTitle(post.title).replace(/^안녕하세요[!,.\s]*/, "").slice(0, 4) || "기장";
      return {
        id: `legacy-${post.id}`,
        cohort,
        captain,
        viceCaptain: extractViceLeaderName(content, cohort),
        intro: firstMeaningfulParagraph(content),
      };
    })
    .sort((a, b) => Number.parseInt(b.cohort, 10) - Number.parseInt(a.cohort, 10));
}

function CohortLeaderScreen({
  board,
  posts,
  isLoading,
  isError,
  onRetry,
  onBack,
  topInset,
}: {
  board?: Board | null;
  posts: PostListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onBack: () => void;
  topInset: number;
}) {
  const [selected, setSelected] = useState<CohortLeaderSummary | null>(null);
  const leaders = useMemo(() => cohortLeaderSummaries(posts, board?.metadata), [board?.metadata, posts]);

  useEffect(() => {
    setSelected(null);
  }, [posts]);

  const headerTitle = selected ? `${selected.cohort} 기장단` : "기수별 기장단 소개";
  const handleBack = () => {
    if (selected) {
      setSelected(null);
      return;
    }
    onBack();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(topInset, 10) }]}>
        <IconButton icon="chevron-back" label="뒤로" onPress={handleBack} />
        <Text style={styles.appBarTitle}>{headerTitle}</Text>
        <View style={styles.iconButton} />
      </View>
      {isLoading ? (
        <LoadingState />
      ) : selected ? (
        <ScrollView style={styles.executiveScroller} contentContainerStyle={styles.cohortDetailContent}>
          {imageUrl(selected.bannerImageUrl) ? (
            <MediaImage media={{ url: selected.bannerImageUrl }} style={styles.cohortBanner} />
          ) : (
            <View style={styles.cohortBannerFallback} />
          )}
          {selected.greeting ? <Text style={styles.cohortGreeting}>{selected.greeting}</Text> : null}
          {selected.intro ? <Text style={styles.cohortIntroText}>{selected.intro}</Text> : null}
          <View style={styles.executiveCard}>
            {imageUrl(selected.captainImageUrl) ? (
              <MediaImage media={{ url: selected.captainImageUrl }} style={styles.executiveAvatarImage} />
            ) : <View style={styles.executiveAvatar}><Ionicons name="person" size={20} color={COLORS.primary} /></View>}
            <View style={styles.executiveText}>
              <Text style={styles.executiveName}>{selected.captain}</Text>
              <Text style={styles.executiveRole}>{selected.cohort} 기장</Text>
            </View>
          </View>
          {selected.viceCaptain ? (
            <View style={styles.executiveCard}>
              {imageUrl(selected.viceCaptainImageUrl) ? (
                <MediaImage media={{ url: selected.viceCaptainImageUrl }} style={styles.executiveAvatarImage} />
              ) : <View style={styles.executiveAvatar}><Ionicons name="person" size={20} color={COLORS.primary} /></View>}
              <View style={styles.executiveText}>
                <Text style={styles.executiveName}>{selected.viceCaptain}</Text>
                <Text style={styles.executiveRole}>{selected.cohort} 부기장</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.executiveContent, leaders.length === 0 ? styles.emptyContent : null]}
          ListEmptyComponent={
            isError ? (
              <Pressable onPress={onRetry} style={styles.errorBox}>
                <Text style={styles.errorTitle}>기장단 정보를 불러오지 못했습니다.</Text>
                <Text style={styles.errorText}>탭해서 다시 시도하세요.</Text>
              </Pressable>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>기장단 정보가 없습니다.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item)} style={styles.cohortCard}>
              <View style={styles.cohortBadge}>
                <Text style={styles.cohortBadgeText}>{item.cohort}</Text>
              </View>
              <View style={styles.executiveText}>
                <Text style={styles.executiveRole}>기장</Text>
                <Text style={styles.executiveName}>{item.captain}{item.viceCaptain ? " 외 1명" : ""}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function pastCouncilsFromMetadata(metadata?: Record<string, unknown> | null): PastCouncilSummary[] {
  const councils = metadata?.past_councils;
  if (!Array.isArray(councils)) return [];
  return councils.flatMap((item, index): PastCouncilSummary[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const value = (key: string) => typeof record[key] === "string" ? (record[key] as string).trim() : "";
    const cohort = value("cohort");
    const presidentName = value("president_name");
    if (!cohort || !presidentName) return [];
    return [{
      id: `past-${cohort}-${index}`,
      cohort: cohort.endsWith("기") ? cohort : `${cohort}기`,
      presidentName,
      presidentCohort: value("president_cohort") || undefined,
      vicePresidentName: value("vice_president_name") || undefined,
      vicePresidentCohort: value("vice_president_cohort") || undefined,
      intro: value("intro") || undefined,
      bannerImageUrl: value("banner_image_url") || undefined,
      presidentImageUrl: value("president_image_url") || undefined,
      vicePresidentImageUrl: value("vice_president_image_url") || undefined,
      activities: pastCouncilActivitiesFromMetadata(record.activities),
    }];
  }).sort((a, b) => Number.parseInt(b.cohort, 10) - Number.parseInt(a.cohort, 10));
}

function PastCouncilScreen({ board, topInset, onBack }: { board?: Board | null; topInset: number; onBack: () => void }) {
  const councils = useMemo(() => pastCouncilsFromMetadata(board?.metadata), [board?.metadata]);
  const [selected, setSelected] = useState<PastCouncilSummary | null>(null);
  const [tab, setTab] = useState<"members" | "activities">("members");
  const handleBack = () => selected ? setSelected(null) : onBack();
  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(topInset, 10) }]}>
        <IconButton icon="chevron-back" label="뒤로" onPress={handleBack} />
        <Text style={styles.appBarTitle}>{selected ? `${selected.cohort} 원우회` : "역대 원우회"}</Text>
        <View style={styles.iconButton} />
      </View>
      {selected ? (
        <ScrollView style={styles.executiveScroller} contentContainerStyle={styles.cohortDetailContent}>
          <View style={styles.pastCouncilTabs}>
            {([['members', '임원진 소개'], ['activities', '활동내역']] as const).map(([key, label]) => (
              <Pressable key={key} onPress={() => setTab(key)} style={[styles.pastCouncilTab, tab === key ? styles.pastCouncilTabActive : null]}>
                <Text style={[styles.pastCouncilTabText, tab === key ? styles.pastCouncilTabTextActive : null]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {tab === "members" ? (
            <>
              {[{ name: selected.presidentName, cohort: selected.presidentCohort, role: "회장", image: selected.presidentImageUrl }, { name: selected.vicePresidentName, cohort: selected.vicePresidentCohort, role: "부회장", image: selected.vicePresidentImageUrl }].filter((member) => member.name).map((member) => (
                <View key={member.role} style={styles.executiveCard}>
                  {imageUrl(member.image) ? <MediaImage media={{ url: member.image }} style={styles.executiveAvatarImage} /> : <View style={styles.executiveAvatar}><Ionicons name="person" size={20} color={COLORS.primary} /></View>}
                  <View style={styles.executiveText}><Text style={styles.executiveName}>{member.name}</Text><Text style={styles.executiveRole}>{[member.cohort, member.role].filter(Boolean).join(" ")}</Text></View>
                </View>
              ))}
            </>
          ) : (
            <>
              {selected.activities.length > 0 ? selected.activities.map((activity, index) => (
                <View key={`${activity.title}-${index}`} style={styles.pastActivityItem}>
                  {activity.date ? <Text style={styles.pastActivityDate}>{formatBoardDate(activity.date)}</Text> : null}
                  <Text style={styles.pastActivityTitle}>{activity.title}</Text>
                </View>
              )) : <View style={styles.emptyBox}><Text style={styles.emptyText}>등록된 활동내역이 없습니다.</Text></View>}
            </>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={councils}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.executiveContent, councils.length === 0 ? styles.emptyContent : null]}
          ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyText}>등록된 역대 원우회가 없습니다.</Text></View>}
          renderItem={({ item }) => (
            <Pressable onPress={() => { setSelected(item); setTab("members"); }} style={styles.cohortCard}>
              <View style={styles.cohortBadge}><Text style={styles.cohortBadgeText}>{item.cohort}</Text></View>
              <View style={styles.executiveText}><Text style={styles.executiveRole}>회장</Text><Text style={styles.executiveName}>{[item.presidentCohort, item.presidentName].filter(Boolean).join(" ")}</Text></View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function participationBadgeLabel(post: PostListItem, board?: Board | null) {
  const raw = post.category?.trim();
  if (board?.slug === "study-recruit") {
    const recruitmentStatus = String(post.metadata?.recruitment_status ?? raw ?? "").toLowerCase();
    return recruitmentStatus.includes("closed") || recruitmentStatus.includes("마감") ? "마감" : "진행중";
  }
  if (raw) return raw.length <= 8 ? raw : "동아리 홍보";
  if (board?.slug === "club-promo") return "모집중";
  return "안내";
}

function ExecutiveIntroScreen({ board, topInset, onBack }: { board?: Board | null; topInset: number; onBack: () => void }) {
  const executives = executivesFromMetadata(board?.metadata);

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(topInset, 10) }]}>
        <IconButton icon="chevron-back" label="뒤로" onPress={onBack} />
        <Text style={styles.appBarTitle}>원우회 임원진 소개</Text>
        <View style={styles.iconButton} />
      </View>
      <ScrollView style={styles.executiveScroller} contentContainerStyle={styles.executiveContent}>
        {executives.length === 0 ? (
          <View style={styles.executiveEmptyState}>
            <Ionicons name="people-outline" size={32} color="#AAB2BF" />
            <Text style={styles.executiveEmptyTitle}>등록된 임원진 정보가 없어요</Text>
            <Text style={styles.executiveEmptyDescription}>관리자에서 임원진 정보를 등록해주세요</Text>
          </View>
        ) : null}
        {executives.map((member) => (
          <View key={`${member.name}-${member.role}`} style={styles.executiveCard}>
            {imageUrl(member.imageUrl) ? (
              <MediaImage media={{ url: member.imageUrl }} style={styles.executiveAvatarImage} />
            ) : (
              <View style={styles.executiveAvatar}>
                <Ionicons name="person" size={22} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.executiveText}>
              <Text style={styles.executiveName}>
                {[member.name, member.cohort].filter(Boolean).join(" · ")}
              </Text>
              <Text style={styles.executiveRole}>{member.role}</Text>
              {member.intro ? <Text style={styles.executiveIntro}>{member.intro}</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function CouncilActivityHistoryScreen({
  posts,
  isLoading,
  isError,
  onRetry,
  onBack,
  originBoardId,
  topInset,
}: {
  posts: PostListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onBack: () => void;
  originBoardId: number;
  topInset: number;
}) {
  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(topInset, 10) }]}>
        <IconButton icon="chevron-back" label="뒤로" onPress={onBack} />
        <Text style={styles.appBarTitle}>원우회 활동내역</Text>
        <View style={styles.iconButton} />
      </View>
      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.councilActivityContent, posts.length === 0 ? styles.emptyContent : null]}
          ListEmptyComponent={
            isError ? (
              <Pressable onPress={onRetry} style={styles.errorBox}>
                <Text style={styles.errorTitle}>활동내역을 불러오지 못했습니다.</Text>
                <Text style={styles.errorText}>탭해서 다시 시도하세요.</Text>
              </Pressable>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>활동내역이 없습니다.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(postDetailRoute(item.id, originBoardId) as never)} style={styles.councilActivityRow}>
              <View style={styles.councilActivityText}>
                <Text style={styles.councilActivityDate}>{formatBoardDate(item.created_at)}</Text>
                <Text numberOfLines={1} style={styles.councilActivityTitle}>
                  {item.title}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function AccountingExternalScreen({ board, topInset, onBack }: { board?: Board | null; topInset: number; onBack: () => void }) {
  const accountingUrl = metadataString(board?.metadata, ["notion_url", "external_url", "url", "link"]);
  const openAccounting = () => {
    if (!accountingUrl) {
      Alert.alert("회계장부 링크", "관리자 페이지에서 Notion 링크를 등록해 주세요.");
      return;
    }
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(accountingUrl);
      return;
    }
    Linking.openURL(accountingUrl);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(topInset, 10) }]}>
        <IconButton icon="chevron-back" label="뒤로" onPress={onBack} />
        <Text style={styles.appBarTitle}>회계장부</Text>
        <View style={styles.iconButton} />
      </View>
      <View style={styles.accountingContent}>
        <View style={styles.accountingIcon}>
          <Ionicons name="card-outline" size={28} color={COLORS.subtle} />
        </View>
        <Text style={styles.accountingTitle}>회계장부는 외부 페이지에서 관리하고 있어요</Text>
        <Text style={styles.accountingDescription}>
          {"원우회 회비 입출금 내역을 투명하게 공개하고 있어요.\n아래 버튼을 누르면 외부 회계장부 페이지로 연결돼요."}
        </Text>
        <Pressable onPress={openAccounting} style={styles.accountingButton}>
          <Text style={styles.accountingButtonText}>회계장부 보러가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

type BoardPostsScreenProps = {
  initialBoardId?: number;
  isTabRoot?: boolean;
};

function AlbumTile({ post, index, onPress }: { post: PostListItem; index: number; onPress: (postId: number) => void }) {
  const gradient = ALBUM_GRADIENTS[index % ALBUM_GRADIENTS.length];
  const thumbnailUrl = imageUrl(post.thumbnail_url);
  return (
    <Pressable onPress={() => onPress(post.id)} style={styles.albumTile}>
      {thumbnailUrl ? (
        <MediaImageBackground media={{ id: post.thumbnail_media_id, url: thumbnailUrl }} imageStyle={styles.albumImage} style={styles.albumThumb}>
          <View style={styles.albumScrim} />
          <View style={styles.albumCountPill}>
            <Text style={styles.albumCountText}>{post.attachment_count || 1}장</Text>
          </View>
        </MediaImageBackground>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.albumThumb}>
          <View style={styles.albumCountPill}>
            <Text style={styles.albumCountText}>{post.attachment_count || 1}장</Text>
          </View>
        </LinearGradient>
      )}
      <Text numberOfLines={1} style={styles.albumTitle}>
        {post.title}
      </Text>
      <Text style={styles.albumDate}>{formatBoardDate(post.created_at)}</Text>
    </Pressable>
  );
}

function guideBadgeTone(label: string) {
  if (label.includes("상시")) return { bg: "#EEEDFE", fg: "#3C3489" };
  if (label.includes("마감")) return { bg: "#F0F0EE", fg: "#5B5B57" };
  return { bg: "#E6F1FB", fg: "#0C447C" };
}

function ParticipationGuideTile({ post, board, index, onPress }: { post: PostListItem; board?: Board | null; index: number; onPress: (postId: number) => void }) {
  const gradient = ALBUM_GRADIENTS[index % ALBUM_GRADIENTS.length];
  const thumbnailUrl = imageUrl(post.thumbnail_url);
  const preview = compactPreview(post);
  const badge = participationBadgeLabel(post, board);
  const tone = guideBadgeTone(badge);

  return (
    <Pressable onPress={() => onPress(post.id)} style={styles.guideCard}>
      {thumbnailUrl ? (
        <MediaImageBackground media={{ id: post.thumbnail_media_id, url: thumbnailUrl }} imageStyle={styles.guideImage} style={styles.guideThumb}>
          <View style={styles.guideScrim} />
        </MediaImageBackground>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.guideThumb} />
      )}
      <View style={styles.guideBody}>
        <View style={[styles.guidePill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.guidePillText, { color: tone.fg }]}>{badge}</Text>
        </View>
        <Text numberOfLines={2} style={styles.guideTitle}>
          {post.title}
        </Text>
        {preview ? (
          <Text numberOfLines={2} style={styles.guidePreview}>
            {preview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ActivityTile({ post, index, onPress }: { post: PostListItem; index: number; onPress: (postId: number) => void }) {
  const gradient = ALBUM_GRADIENTS[index % ALBUM_GRADIENTS.length];
  const preview = post.title.trim() || compactPreview(post);
  const thumbnailUrl = imageUrl(post.thumbnail_url);
  const activityDate =
    typeof post.metadata?.activity_date === "string" && post.metadata.activity_date.trim()
      ? post.metadata.activity_date
      : post.created_at;

  return (
    <Pressable onPress={() => onPress(post.id)} style={styles.activityCard}>
      {thumbnailUrl ? (
        <MediaImageBackground media={{ id: post.thumbnail_media_id, url: thumbnailUrl }} imageStyle={styles.activityImage} style={styles.activityThumb}>
          <View style={styles.activityScrim} />
        </MediaImageBackground>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activityThumb} />
      )}
      <View style={styles.activityBody}>
        <View style={styles.activityPill}>
          <Text style={styles.activityPillText}>{post.category || "활동 인증"}</Text>
        </View>
        {preview ? (
          <Text numberOfLines={2} style={styles.activityPreview}>
            {preview}
          </Text>
        ) : null}
        <Text style={styles.activityDate}>
          {`${formatCohortName(post.author_cohort, post.author_nickname)} · ${formatBoardDate(activityDate)}`}
        </Text>
      </View>
    </Pressable>
  );
}

// ponytail: embedded (initialBoardId) == rendered inside a tab screen, so it must stay a tab root
// and switch boards via state instead of router.replace, which would leave the (tabs) group and hide the tab bar.
export default function BoardPostsScreen({ initialBoardId, isTabRoot = initialBoardId !== undefined }: BoardPostsScreenProps = {}) {
  const params = useLocalSearchParams<{ boardId: string }>();
  const insets = useSafeAreaInsets();
  const routeBoardId = Number(params.boardId);
  const [embeddedBoardId, setEmbeddedBoardId] = useState(initialBoardId);
  const boardId = embeddedBoardId ?? routeBoardId;
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("전체");
  const requestedBoardFilterRef = useRef<ResourceFilter | undefined>(undefined);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const user = useUserStore((state) => state.user);

  const { data: boardsRes } = useBoardsQuery();
  const boards = useMemo(() => flattenBoards(boardsRes?.data), [boardsRes?.data]);
  const board = useMemo(() => boards.find((item) => item.id === boardId), [boardId, boards]);
  const display = getBoardDisplay(board);
  const filters = filterOptions(board);
  const isAlbum = board?.board_type === "album";
  const isActivityCards = board?.board_type === "activity_certification";
  const isMutualAid = board?.board_type === "mutual_aid";
  const isSuggestion = board?.board_type === "suggestion";
  const isStudyRecruit = board?.slug === "study-recruit";
  const isParticipationGuideCards = Boolean(participationGroupKey(board)) && !isActivityCards && !isStudyRecruit;
  const tabs = sectionTabs(board, boards);
  const canWriteBoard = !board || board.write_permission !== "admin" || user?.role === "admin";
  const canShowCreateButton = canWriteBoard && board?.board_type !== "notice" && board?.board_type !== "album" && (!isParticipationGuideCards || board?.slug === "study-recruit");
  const isResourceAll = board?.board_type === "resource" && selectedFilter === "전체";
  const isCouncilActivityHistory = board?.slug === "council-activity" || board?.slug === "gsa-activity";
  const resourceBoardIds = useMemo(
    () => RESOURCE_ALL_SLUGS.map((slug) => findBoardBySlug(boards, slug)?.id).filter((id): id is number => typeof id === "number"),
    [boards]
  );
  const noticeBoardIds = useMemo(
    () => isCouncilActivityHistory ? boards.filter((item) => item.board_type === "notice").map((item) => item.id) : [],
    [boards, isCouncilActivityHistory]
  );

  const boardPostsQuery = useBoardPosts(boardId, {
    q: query || undefined,
    category: categoryForFilter(selectedFilter, board),
    sort: "latest",
  });
  const resourceAllQuery = useMultiBoardPosts(resourceBoardIds, {
    q: query || undefined,
    sort: "latest",
  });
  const councilNoticeQuery = useMultiBoardPosts(noticeBoardIds, { sort: "latest" });

  const data = boardPostsQuery.data;
  const isLoading = isResourceAll ? resourceAllQuery.isLoading : boardPostsQuery.isLoading;
  const isError = isResourceAll ? resourceAllQuery.isError : boardPostsQuery.isError;
  const refetch = isResourceAll ? resourceAllQuery.refetch : boardPostsQuery.refetch;
  const fetchNextPage = boardPostsQuery.fetchNextPage;
  const hasNextPage = isResourceAll ? false : boardPostsQuery.hasNextPage;
  const isFetchingNextPage = isResourceAll ? false : boardPostsQuery.isFetchingNextPage;
  const posts = isResourceAll
    ? [...(resourceAllQuery.data ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : data?.pages.flatMap((page) => page.data) ?? [];
  const linkedCouncilNotices = (councilNoticeQuery.data ?? []).filter((item) => item.metadata?.show_in_council_activity === true);
  const councilActivityPosts = [...new Map([...linkedCouncilNotices, ...posts].map((item) => [item.id, item])).values()]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  useEffect(() => {
    if (initialBoardId) {
      setEmbeddedBoardId(initialBoardId);
    }
  }, [initialBoardId]);

  useEffect(() => {
    if (!board) return;
    const requestedFilter = requestedBoardFilterRef.current;
    requestedBoardFilterRef.current = undefined;
    setSelectedFilter(defaultFilterForBoard(board, requestedFilter));
  }, [board]);

  const navigateToBoard = (target?: Board, requestedFilter?: ResourceFilter) => {
    if (!target) return;
    if (target.id === boardId) {
      requestedBoardFilterRef.current = undefined;
      if (requestedFilter) setSelectedFilter(requestedFilter);
      return;
    }

    requestedBoardFilterRef.current = requestedFilter;
    if (requestedFilter) setSelectedFilter(requestedFilter);
    if (isTabRoot) {
      setEmbeddedBoardId(target.id);
      return;
    }

    router.replace(`/board/${target.id}` as never);
  };

  const exitBoardDepth = useCallback(() => {
    if (isTabRoot) return;
    router.replace(boardParentRoute(board) as never);
  }, [board, isTabRoot]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || isTabRoot) return undefined;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        exitBoardDepth();
        return true;
      });
      return () => subscription.remove();
    }, [exitBoardDepth, isTabRoot])
  );

  const handleFilterPress = (item: string) => {
    const groupKey = participationGroupKey(board);
    if (groupKey) {
      const group = PARTICIPATION_GROUPS.find((entry) => entry.key === groupKey);
      const targetSlug = item === "활동 인증" ? group?.certificationSlug : group?.guideSlug;
      setSelectedFilter(item);
      navigateToBoard(targetSlug ? findBoardBySlug(boards, targetSlug) : undefined);
      return;
    }

    setSelectedFilter(item);
    if (board?.board_type === "resource" && item === "전체") {
      return;
    }

    const resourceSlug = board?.board_type === "resource" ? RESOURCE_FILTER_SLUGS[item] : undefined;
    if (resourceSlug) {
      navigateToBoard(findBoardBySlug(boards, resourceSlug));
    }
  };

  const openCreate = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    router.push({ pathname: "/board/post/create", params: { boardId: String(boardId), category: selectedFilter !== "전체" ? selectedFilter : "" } });
  };

  if (board?.slug === "accounting") {
    return <AccountingExternalScreen board={board} topInset={insets.top} onBack={exitBoardDepth} />;
  }

  if (board?.slug === "gsa-executives") {
    return <ExecutiveIntroScreen board={board} topInset={insets.top} onBack={exitBoardDepth} />;
  }

  if (board?.slug === "gsa-cohort-leaders") {
    return (
      <CohortLeaderScreen
        board={board}
        posts={posts}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        topInset={insets.top}
        onBack={exitBoardDepth}
      />
    );
  }

  if (board?.slug === "gsa-past-councils") {
    return <PastCouncilScreen board={board} topInset={insets.top} onBack={exitBoardDepth} />;
  }

  if (board?.slug === "council-activity" || board?.slug === "gsa-activity") {
    return (
      <CouncilActivityHistoryScreen
        posts={councilActivityPosts}
        isLoading={isLoading || councilNoticeQuery.isLoading}
        isError={isError || councilNoticeQuery.isError}
        onRetry={() => void Promise.all([refetch(), councilNoticeQuery.refetch()])}
        originBoardId={boardId}
        topInset={insets.top}
        onBack={exitBoardDepth}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        {showSearch ? (
          <>
            <IconButton
              icon="chevron-back"
              label="검색 닫기"
              onPress={() => {
                setShowSearch(false);
                setQuery("");
                setQueryInput("");
              }}
            />
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#A6ACB7" />
              <TextInput
                autoFocus
                value={queryInput}
                onChangeText={setQueryInput}
                onSubmitEditing={() => setQuery(queryInput.trim())}
                returnKeyType="search"
                placeholder="검색어를 입력하세요"
                placeholderTextColor="#A6ACB7"
                style={[styles.searchBarInput, { outlineStyle: "none" } as never]}
              />
            </View>
          </>
        ) : (
          <>
            {isTabRoot ? (
              <View style={styles.iconButton} />
            ) : (
              <IconButton icon="chevron-back" label="뒤로" onPress={exitBoardDepth} />
            )}
            <Text style={styles.appBarTitle}>{display.name}</Text>
            <IconButton icon="search-outline" label="검색" onPress={() => setShowSearch(true)} />
          </>
        )}
      </View>

      {!showSearch && tabs.length > 0 ? (
        <View style={styles.sectionTabs}>
          {tabs.map((item) => (
            <Pressable key={item.label} onPress={() => navigateToBoard(item.target, item.initialFilter)} style={[styles.sectionTab, item.active ? styles.sectionTabActive : null]}>
              <Text style={[styles.sectionTabText, item.active ? styles.sectionTabTextActive : null]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {filters.length > 1 ? (
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          bounces={false}
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((item) => {
            const active = selectedFilter === item;
            return (
              <Pressable key={item} onPress={() => handleFilterPress(item)} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          key={isAlbum ? "album" : isParticipationGuideCards ? "participation-guide" : isActivityCards ? "activity" : "list"}
          numColumns={isAlbum ? 2 : 1}
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            isAlbum ? styles.albumContent : isParticipationGuideCards ? styles.guideContent : isActivityCards ? styles.cardContent : styles.listContent,
            posts.length === 0 ? styles.emptyContent : null,
          ]}
          columnWrapperStyle={isAlbum ? styles.albumRow : undefined}
          ListEmptyComponent={
            isError ? (
              <Pressable onPress={() => void refetch()} style={styles.errorBox}>
                <Text style={styles.errorTitle}>게시글을 불러오지 못했습니다.</Text>
                <Text style={styles.errorText}>탭해서 다시 시도하세요.</Text>
              </Pressable>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={32} color="#AAB2BF" />
                <Text style={styles.emptyText}>
                  {query ? "검색 결과가 없어요" : isMutualAid ? "등록된 상조회 신청이 없어요" : isSuggestion ? "등록된 건의사항이 없어요" : board?.slug === "study-recruit" ? "모집 중인 스터디가 없어요" : isParticipationGuideCards ? (participationGroupKey(board) === "networking" ? "등록된 네트워킹이 없어요" : "등록된 동아리가 없어요") : isAlbum ? "등록된 사진이 없어요" : "아직 게시물이 없어요"}
                </Text>
                <Text style={styles.emptySubText}>
                  {query ? "다른 검색어로 다시 시도해보세요" : isMutualAid ? "경조사 발생 시 신청해보세요" : isSuggestion ? "원우회에 건의하고 싶은 내용을 남겨보세요" : board?.slug === "study-recruit" ? "첫 스터디를 모집해보세요" : isParticipationGuideCards ? (participationGroupKey(board) === "networking" ? "새로운 네트워킹이 등록되면 알려드릴게요" : "새로운 동아리가 등록되면 알려드릴게요") : isAlbum ? "행사 사진이 등록되면 알려드릴게요" : "첫 게시글을 남겨보세요"}
                </Text>
              </View>
            )
          }
          renderItem={({ item, index }) => {
            const itemBoard = boards.find((candidate) => candidate.id === item.board_id) ?? board;
            return isAlbum ? (
              <AlbumTile post={item} index={index} onPress={(postId) => router.push(postDetailRoute(postId, boardId) as never)} />
            ) : isParticipationGuideCards ? (
              <ParticipationGuideTile post={item} board={itemBoard} index={index} onPress={(postId) => router.push(postDetailRoute(postId, boardId) as never)} />
            ) : isActivityCards ? (
              <ActivityTile post={item} index={index} onPress={(postId) => router.push(postDetailRoute(postId, boardId) as never)} />
            ) : (
              <PostCard post={item} boardType={itemBoard?.board_type} boardSlug={itemBoard?.slug} onPress={(postId) => router.push(postDetailRoute(postId, boardId) as never)} />
            );
          }}
          onEndReached={() => {
            if (hasNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={COLORS.primary} /> : null}
        />
      )}

      {canShowCreateButton ? (
        <Pressable onPress={openCreate} style={styles.fab}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },
  appBarTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "500",
  },
  searchBar: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7F8FA",
    borderRadius: 999,
    paddingHorizontal: 16,
    marginLeft: 4,
  },
  searchBarInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
  },
  sectionTabs: {
    height: 46,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E4E9",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
  },
  sectionTab: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sectionTabActive: {
    borderBottomColor: COLORS.text,
  },
  sectionTabText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "400",
  },
  sectionTabTextActive: {
    color: COLORS.text,
    fontWeight: "500",
  },
  filterWrap: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  filterScroller: {
    height: 56,
    flexGrow: 0,
  },
  filterContent: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  filterChip: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "#E1E4E9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: "#15171C",
    backgroundColor: "#15171C",
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingBottom: 92,
  },
  albumContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 92,
  },
  albumRow: {
    gap: 10,
  },
  albumTile: {
    flex: 1,
    maxWidth: "50%",
    marginBottom: 12,
  },
  albumThumb: {
    position: "relative",
    aspectRatio: 1.05,
    justifyContent: "flex-end",
    borderRadius: 10,
    overflow: "hidden",
    padding: 10,
  },
  albumImage: {
    borderRadius: 10,
  },
  albumScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.08)",
  },
  albumCountPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  albumCountText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "500",
  },
  albumTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },
  albumDate: {
    color: "#A6ACB7",
    fontSize: 11,
    fontWeight: "400",
    marginTop: 4,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 92,
  },
  guideContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  guideCard: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E1E4E9",
  },
  guideThumb: {
    position: "relative",
    width: "100%",
    aspectRatio: 1.565,
    overflow: "hidden",
  },
  guideImage: {},
  guideScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.06)",
  },
  guideBody: {
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  guidePill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  guidePillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "400",
  },
  guideTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    marginTop: 8,
  },
  guidePreview: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 20,
    marginTop: 8,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E1E4E9",
  },
  activityThumb: {
    position: "relative",
    aspectRatio: 2.05,
    borderRadius: 8,
    overflow: "hidden",
  },
  activityImage: {
    borderRadius: 8,
  },
  activityScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.06)",
  },
  activityBody: {
    paddingTop: 8,
  },
  activityPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#E6F1FB",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activityPillText: {
    color: "#0C447C",
    fontSize: 11,
    fontWeight: "400",
  },
  activityTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 7,
  },
  activityPreview: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 20,
    marginTop: 8,
  },
  activityDate: {
    color: "#A6ACB7",
    fontSize: 12,
    fontWeight: "400",
    marginTop: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  accountingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 34,
    paddingTop: 78,
    paddingBottom: 40,
  },
  accountingIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  accountingTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  accountingDescription: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 14,
  },
  accountingButton: {
    minWidth: 146,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    marginTop: 20,
  },
  accountingButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  executiveScroller: {
    flex: 1,
  },
  executiveContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  executiveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#E1E4E9",
    backgroundColor: COLORS.surface,
    padding: 14,
    marginBottom: 10,
  },
  executiveAvatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#E8F5FF",
  },
  executiveAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5FF",
  },
  executiveText: {
    flex: 1,
    minWidth: 0,
  },
  executiveName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500", // Figma 229:11
  },
  executiveRole: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  councilActivityContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  executiveIntro: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 6,
  },
  executiveEmptyState: {
    flex: 1,
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  executiveEmptyTitle: {
    color: "#2C3038",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
    marginTop: 8,
  },
  executiveEmptyDescription: {
    color: "#8A919C",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 8,
  },
  councilActivityRow: {
    minHeight: 60,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingVertical: 12,
  },
  councilActivityText: {
    flex: 1,
    minWidth: 0,
  },
  councilActivityDate: {
    color: "#A6ACB7",
    fontSize: 11,
    fontWeight: "400",
    marginBottom: 4,
  },
  councilActivityTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  cohortCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10, // Figma 62:46 card
    borderWidth: 1,
    borderColor: "#E1E4E9",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  cohortBadge: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#E6F1FB", // Figma 62:46 badge
    marginRight: 12,
  },
  cohortBadgeText: {
    color: "#0C447C",
    fontSize: 13,
    fontWeight: "500", // Figma: Medium
  },
  cohortDetailContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  cohortBanner: {
    marginHorizontal: -20, // full-bleed (cancel content padding)
    marginTop: -14,
    height: 180, // Figma 134:28 대표 사진
    backgroundColor: COLORS.primary50,
    marginBottom: 16,
  },
  cohortBannerFallback: {
    marginHorizontal: -20,
    marginTop: -14,
    height: 180,
    backgroundColor: "#85B7EB", // Figma 대표 사진 placeholder
    marginBottom: 16,
  },
  pastCouncilTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: 16,
  },
  pastCouncilTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  pastCouncilTabActive: { borderBottomColor: COLORS.text },
  pastCouncilTabText: { color: COLORS.muted, fontSize: 14, fontWeight: "400" }, // Figma 232 서브탭
  pastCouncilTabTextActive: { color: COLORS.text, fontWeight: "500" },
  pastActivityItem: { gap: 4, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#EAECEF", width: "100%" }, // Figma 232:40
  pastActivityDate: { color: "#A6ACB7", fontSize: 12, fontWeight: "400" },
  pastActivityTitle: { color: COLORS.text, fontSize: 15, fontWeight: "400" },
  cohortGreeting: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400", // Figma: Regular
    lineHeight: 23,
  },
  cohortIntroText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400", // Figma: Regular
    lineHeight: 23,
    marginTop: 14,
    marginBottom: 4,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#2C3038",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
    marginTop: 8,
  },
  emptySubText: {
    color: "#8A919C",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 8,
  },
  errorBox: {
    margin: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: COLORS.danger50,
    padding: 16,
  },
  errorTitle: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "900",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    shadowColor: "#0B1F56",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
});
