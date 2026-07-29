import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { z } from "zod";

import BackButton from "../../components/BackButton";
import MediaImage, { MediaImageBackground } from "../../components/MediaImage";
import { API_ORIGIN, adminApi, bannerApi, boardApi, commentApi, eventApi, faqApi, postApi, registrationApi, reportApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import { pickAndUploadBannerImage, pickAndUploadContentImage } from "../../utils/mediaPicker";
import { toAbsoluteMediaUrl } from "../../utils/mediaAccess";
import { formatCohortName } from "../../utils/userLabel";
import type {
  AdminReportItem,
  AdminAuditLog,
  AdminUserItem,
  BannerItem,
  Board,
  EventItem,
  FAQItem,
  MediaAsset,
  MajorOption,
  PostListItem,
  PrivacyPolicyVersion,
  ReportStatus,
  MutualAidStatus,
} from "../../types";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  primary100: "#D5E0FE",
  primary700: "#0B3AC4",
  primary900: "#0B1F56",
  cyan: "#1FA9BD",
  purple: "#6C4FCB",
  success: "#2FA365",
  warning: "#E5A500",
  error: "#D94343",
  bg: "#F7F8FA",
  surface: "#ffffff",
  surfaceAlt: "#F8FAFC",
  border: "#E1E4E9",
  borderStrong: "#C7CDD4",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#8A919C",
};

const RADIUS = {
  button: 6,
  card: 8,
};

const ELEVATION = {
  shadowColor: "#0B1F56",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 1,
};

const eventSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  start_at: z.string().min(1),
  end_at: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;
type AdminSection = "dashboard" | "banners" | "notices" | "boards" | "executives" | "cohortLeaders" | "pastCouncils" | "posts" | "suggestions" | "mutualAid" | "accounts" | "reports" | "faqs" | "events" | "registration";
type BoardScope = "all" | "notices" | "council" | "participation" | "community";
type AdminPostMode = "all" | "notice" | "pinned";
type SuggestionAdminFilter = "received" | "answered" | "all";
type IconName = keyof typeof Ionicons.glyphMap;
type BannerImageSlot = "mobile" | "tablet" | "desktop";
type BannerSaveMessage = { tone: "success" | "error" | "info"; text: string } | null;

type BannerForm = {
  title: string;
  subtitle: string;
  badge_text: string;
  cta_label: string;
  cta_href: string;
  mobile_image_url: string;
  tablet_image_url: string;
  desktop_image_url: string;
  theme: BannerItem["theme"];
  sort_order: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  deadline_at: string;
};

type BoardForm = {
  name: string;
  slug: string;
  category: string;
  board_type: string;
  description: string;
  sort_order: string;
  allow_anonymous: boolean;
  read_permission: string;
  write_permission: string;
  is_active: boolean;
};

type NoticeForm = {
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  show_in_council_activity: boolean;
  deadline_at: string;
};

type ExecutiveFormMember = {
  name: string;
  cohort: string;
  role: string;
  image_url: string;
};

type CohortLeaderForm = {
  cohort: string;
  captain_name: string;
  vice_captain_name: string;
  greeting: string;
  intro: string;
  banner_image_url: string;
  captain_image_url: string;
  vice_captain_image_url: string;
};
type CohortLeaderImageField = "banner_image_url" | "captain_image_url" | "vice_captain_image_url";
type PastCouncilForm = {
  cohort: string;
  president_name: string;
  president_cohort: string;
  vice_president_name: string;
  vice_president_cohort: string;
  intro: string;
  activities_text: string;
  banner_image_url: string;
  president_image_url: string;
  vice_president_image_url: string;
};
type PastCouncilImageField = "banner_image_url" | "president_image_url" | "vice_president_image_url";

type FAQForm = {
  question: string;
  answer: string;
  category: string;
  sort_order: string;
};

const emptyEvent: EventForm = {
  title: "",
  category: "event",
  start_at: "",
  end_at: "",
  location: "",
  description: "",
};

const emptyBanner: BannerForm = {
  title: "",
  subtitle: "",
  badge_text: "SOGANG AI-SW",
  cta_label: "",
  cta_href: "",
  mobile_image_url: "",
  tablet_image_url: "",
  desktop_image_url: "",
  theme: "navy",
  sort_order: "0",
  is_active: true,
  starts_at: "",
  ends_at: "",
  deadline_at: "",
};

const emptyBoard: BoardForm = {
  name: "",
  slug: "",
  category: "community",
  board_type: "post",
  description: "",
  sort_order: "100",
  allow_anonymous: false,
  read_permission: "user",
  write_permission: "user",
  is_active: true,
};

const emptyNotice: NoticeForm = {
  title: "",
  content: "",
  category: "all",
  is_pinned: false,
  show_in_council_activity: false,
  deadline_at: "",
};

const emptyExecutiveMember: ExecutiveFormMember = {
  name: "",
  cohort: "",
  role: "",
  image_url: "",
};

const emptyCohortLeader: CohortLeaderForm = {
  cohort: "",
  captain_name: "",
  vice_captain_name: "",
  greeting: "",
  intro: "",
  banner_image_url: "",
  captain_image_url: "",
  vice_captain_image_url: "",
};

const COHORT_LEADER_IMAGE_FIELDS: { field: CohortLeaderImageField; label: string }[] = [
  { field: "banner_image_url", label: "대표 이미지" },
  { field: "captain_image_url", label: "기장 프로필" },
  { field: "vice_captain_image_url", label: "부기장 프로필" },
];
const emptyPastCouncil: PastCouncilForm = {
  cohort: "", president_name: "", president_cohort: "", vice_president_name: "", vice_president_cohort: "",
  intro: "", activities_text: "", banner_image_url: "", president_image_url: "", vice_president_image_url: "",
};
const PAST_COUNCIL_IMAGE_FIELDS: { field: PastCouncilImageField; label: string }[] = [
  { field: "banner_image_url", label: "대표 이미지" },
  { field: "president_image_url", label: "회장 프로필" },
  { field: "vice_president_image_url", label: "부회장 프로필" },
];

const defaultExecutiveMembers: ExecutiveFormMember[] = [
  { name: "김진산", cohort: "72기", role: "회장", image_url: "" },
  { name: "김유림", cohort: "72기", role: "부회장", image_url: "" },
  { name: "민지서", cohort: "72기", role: "기획국 국장", image_url: "" },
  { name: "김태훈", cohort: "72기", role: "기획국 국원", image_url: "" },
];

const emptyFAQ: FAQForm = {
  question: "",
  answer: "",
  category: "general",
  sort_order: "0",
};

const SECTIONS: { key: AdminSection; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "콘솔", icon: "speedometer-outline" },
  { key: "banners", label: "배너", icon: "albums-outline" },
  { key: "notices", label: "공지사항", icon: "megaphone-outline" },
  { key: "boards", label: "게시판", icon: "grid-outline" },
  { key: "executives", label: "임원진", icon: "people-circle-outline" },
  { key: "cohortLeaders", label: "기장단", icon: "ribbon-outline" },
  { key: "pastCouncils", label: "역대 원우회", icon: "time-outline" },
  { key: "posts", label: "게시글", icon: "document-text-outline" },
  { key: "suggestions", label: "건의사항", icon: "chatbox-ellipses-outline" },
  { key: "mutualAid", label: "상조회", icon: "flower-outline" },
  { key: "accounts", label: "계정", icon: "people-outline" },
  { key: "reports", label: "신고", icon: "flag-outline" },
  { key: "faqs", label: "FAQ", icon: "help-circle-outline" },
  { key: "events", label: "일정", icon: "calendar-outline" },
  { key: "registration", label: "가입 설정", icon: "person-add-outline" },
];

const ADMIN_SECTION_KEYS = SECTIONS.map((item) => item.key);

const BOARD_SCOPE_FILTERS: { key: BoardScope; label: string; categories: string[] }[] = [
  { key: "all", label: "전체", categories: [] },
  { key: "notices", label: "공지사항", categories: ["notices"] },
  { key: "council", label: "원우회", categories: ["council", "gsa"] },
  { key: "participation", label: "참여활동", categories: ["participation", "club", "study", "alumni"] },
  { key: "community", label: "커뮤니티/자료", categories: ["community", "resources"] },
];

const ADMIN_POST_MODE_FILTERS: { key: AdminPostMode; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "notice", label: "공지글" },
  { key: "pinned", label: "고정글" },
];

const NOTICE_CATEGORY_OPTIONS = [
  { value: "all", label: "전체 공지" },
  { value: "academic", label: "학사 공지" },
  { value: "event", label: "행사 공지" },
  { value: "webinar", label: "웨비나/특강 공지" },
  { value: "other", label: "기타 공지" },
] as const;

const EVENT_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const EVENT_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const BOARD_TYPE_LABELS: Record<string, string> = {
  post: "일반",
  notice: "공지",
  calendar: "캘린더",
  album: "앨범",
  resource: "자료",
  activity_certification: "활동인증",
  guide: "가이드",
  faq: "FAQ",
  organization_intro: "조직소개",
  activity_history: "활동내역",
  external_link: "외부링크",
  suggestion: "건의",
  mutual_aid: "상조회",
};

const CATEGORY_LABELS: Record<string, string> = {
  notices: "공지",
  community: "커뮤니티",
  resources: "자료",
  participation: "참여",
  council: "원우회",
  club: "동아리",
  study: "스터디",
  alumni: "동문",
  gsa: "원우회",
};

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사",
  council: "원우회",
  event: "행사",
  exam: "시험",
  external: "외부",
  other: "기타",
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseAdminSection(value?: string | string[]) {
  const raw = firstParam(value);
  return ADMIN_SECTION_KEYS.includes(raw as AdminSection) ? (raw as AdminSection) : null;
}

function parseBoardScope(value?: string | string[]) {
  const raw = firstParam(value);
  return BOARD_SCOPE_FILTERS.some((item) => item.key === raw) ? (raw as BoardScope) : null;
}

const REPORT_STATUS_LABELS: Record<ReportStatus | "all", string> = {
  all: "전체",
  open: "접수",
  reviewing: "검토 중",
  resolved: "처리 완료",
  dismissed: "기각",
};

const REPORT_REASON_LABELS: Record<string, string> = {
  inappropriate: "부적절한 내용",
  spam: "스팸/홍보",
  harassment: "비방/괴롭힘",
  privacy: "개인정보 노출",
  other: "기타",
};

const USER_ROLE_LABELS: Record<AdminUserItem["role"], string> = {
  user: "일반",
  admin: "관리자",
};

const BANNER_IMAGE_SLOTS: { key: BannerImageSlot; label: string; hint: string }[] = [
  { key: "mobile", label: "모바일", hint: "권장 390x180" },
  { key: "tablet", label: "태블릿", hint: "권장 768x260" },
  { key: "desktop", label: "데스크톱", hint: "권장 1200x360" },
];

const BANNER_THEMES: Record<BannerItem["theme"], { bg: string; badge: string; text: string; muted: string; border?: string }> = {
  none: { bg: "#ffffff", badge: COLORS.primary, text: COLORS.text, muted: COLORS.muted, border: COLORS.border },
  blue: { bg: "#2761FF", badge: "#D5E0FE", text: "#ffffff", muted: "#EAF1FF" },
  navy: { bg: "#0B1F56", badge: "#D5E0FE", text: "#ffffff", muted: "#D5E0FE" },
  cyan: { bg: "#1FA9BD", badge: "#E6F9FB", text: "#ffffff", muted: "#E6FBFF" },
  purple: { bg: "#6C4FCB", badge: "#F1EAFB", text: "#ffffff", muted: "#F5EFFF" },
};

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNoticeCategoryValue(value?: string | null) {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw || raw === "all" || raw.includes("전체")) {
    return "all";
  }
  if (raw.includes("academic") || raw.includes("calendar") || raw.includes("학사")) {
    return "academic";
  }
  if (raw.includes("webinar") || raw.includes("특강") || raw.includes("웨비나")) {
    return "webinar";
  }
  if (raw.includes("event") || raw.includes("행사")) {
    return "event";
  }
  if (raw.includes("other") || raw.includes("general") || raw.includes("기타")) {
    return "other";
  }
  return "all";
}

function bannerPosition(banners: BannerItem[], bannerId: number | null) {
  if (!bannerId) {
    return null;
  }
  const index = banners.findIndex((item) => item.id === bannerId);
  return index >= 0 ? index + 1 : null;
}

function nextBannerOrder(banners: BannerItem[]) {
  if (banners.length === 0) {
    return 1;
  }
  return Math.max(...banners.map((item) => item.sort_order ?? 0)) + 1;
}

function bannerFormFromItem(item: BannerItem): BannerForm {
  return {
    title: item.title ?? "",
    subtitle: item.subtitle ?? "",
    badge_text: item.badge_text ?? "",
    cta_label: item.cta_label ?? "",
    cta_href: item.cta_href ?? "",
    mobile_image_url: item.image_urls?.mobile ?? item.image_url ?? "",
    tablet_image_url: item.image_urls?.tablet ?? "",
    desktop_image_url: item.image_urls?.desktop ?? item.image_url ?? "",
    theme: item.theme,
    sort_order: String(item.sort_order ?? 0),
    is_active: item.is_active,
    starts_at: item.starts_at?.slice(0, 16) ?? "",
    ends_at: item.ends_at?.slice(0, 16) ?? "",
    deadline_at: item.deadline_at?.slice(0, 16) ?? "",
  };
}

function executiveMembersFromMetadata(metadata?: Record<string, unknown> | null): ExecutiveFormMember[] {
  const executives = metadata?.executives;
  if (!Array.isArray(executives)) return [];
  return executives.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "";
    const cohort = typeof record.cohort === "string" ? record.cohort : "";
    const role = typeof record.role === "string" ? record.role : "";
    const imageUrl = typeof record.image_url === "string" ? record.image_url : "";
    return name || cohort || role || imageUrl ? [{ name, cohort, role, image_url: imageUrl }] : [];
  });
}

function cohortLeadersFromMetadata(metadata?: Record<string, unknown> | null): CohortLeaderForm[] {
  const leaders = metadata?.cohort_leaders;
  if (!Array.isArray(leaders)) return [];
  return leaders.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const value = (key: keyof CohortLeaderForm) => typeof record[key] === "string" ? record[key] as string : "";
    const parsed: CohortLeaderForm = {
      cohort: value("cohort"),
      captain_name: value("captain_name"),
      vice_captain_name: value("vice_captain_name"),
      greeting: value("greeting"),
      intro: value("intro"),
      banner_image_url: value("banner_image_url"),
      captain_image_url: value("captain_image_url"),
      vice_captain_image_url: value("vice_captain_image_url"),
    };
    return parsed.cohort || parsed.captain_name ? [parsed] : [];
  });
}

function pastCouncilsFromMetadata(metadata?: Record<string, unknown> | null): PastCouncilForm[] {
  const councils = metadata?.past_councils;
  if (!Array.isArray(councils)) return [];
  return councils.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const value = (key: keyof Omit<PastCouncilForm, "activities_text">) => typeof record[key] === "string" ? record[key] as string : "";
    const parsed: PastCouncilForm = {
      cohort: value("cohort"), president_name: value("president_name"), president_cohort: value("president_cohort"),
      vice_president_name: value("vice_president_name"), vice_president_cohort: value("vice_president_cohort"), intro: value("intro"),
      activities_text: Array.isArray(record.activities) ? record.activities.filter((entry): entry is string => typeof entry === "string").join("\n") : "",
      banner_image_url: value("banner_image_url"), president_image_url: value("president_image_url"), vice_president_image_url: value("vice_president_image_url"),
    };
    return parsed.cohort || parsed.president_name ? [parsed] : [];
  });
}

function mediaUrl(value?: string | null) {
  return toAbsoluteMediaUrl(value, API_ORIGIN);
}

function parseSort(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function dateOnlyValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function timeOnlyValue(value?: string | null, fallback = "09:00") {
  if (!value) {
    return fallback;
  }
  const [, time = ""] = value.split("T");
  return time || fallback;
}

function makeDateTimeValue(date: Date, time: string) {
  return `${dateOnlyValue(date)}T${time.trim() || "09:00"}`;
}

function parseDateTimeValue(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthLabelValue(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildAdminCalendarCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: { key: string; date?: Date }[] = [];
  for (let index = 0; index < firstDay; index += 1) {
    cells.push({ key: `blank-${index}` });
  }
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push({ key: `day-${day}`, date: new Date(month.getFullYear(), month.getMonth(), day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-${cells.length}` });
  }
  return cells;
}

function sameDate(left: Date | null, right?: Date) {
  if (!left || !right) {
    return false;
  }
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: RADIUS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
        padding: 16,
        ...ELEVATION,
      }}
    >
      {children}
    </View>
  );
}

function Field({
  value,
  onChangeText,
  placeholder,
  multiline,
  editable = true,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <TextInput
      editable={editable}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8b97a9"
      style={{
        minHeight: multiline ? 108 : 44,
        borderRadius: RADIUS.button,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: editable ? COLORS.surface : COLORS.surfaceAlt,
        color: COLORS.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        textAlignVertical: multiline ? "top" : "center",
      }}
      value={value}
    />
  );
}

function EventDateTimePicker({
  label,
  value,
  onChange,
  fallbackTime,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  fallbackTime: string;
}) {
  const selectedDate = parseDateTimeValue(value);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const [timeOpen, setTimeOpen] = useState(false);

  useEffect(() => {
    const nextSelectedDate = parseDateTimeValue(value);
    if (nextSelectedDate) {
      setVisibleMonth(new Date(nextSelectedDate.getFullYear(), nextSelectedDate.getMonth(), 1));
    }
  }, [value]);

  const cells = buildAdminCalendarCells(visibleMonth);
  const time = timeOnlyValue(value, fallbackTime);

  const changeMonth = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDate = (date: Date) => {
    onChange(makeDateTimeValue(date, time));
  };

  const changeTime = (nextTime: string) => {
    const baseDate = selectedDate ?? visibleMonth;
    onChange(makeDateTimeValue(baseDate, nextTime));
    setTimeOpen(false);
  };

  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontWeight: "900" }}>{label}</Text>
          <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>
            {value ? value.replace("T", " ") : "달력에서 날짜를 선택하세요."}
          </Text>
        </View>
        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable hitSlop={8} onPress={() => changeMonth(-1)} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </Pressable>
        <Text style={{ color: COLORS.primary900, fontSize: 16, fontWeight: "900" }}>{monthLabelValue(visibleMonth)}</Text>
        <Pressable hitSlop={8} onPress={() => changeMonth(1)} style={{ padding: 6 }}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {EVENT_WEEKDAYS.map((day, index) => (
          <Text
            key={`${label}-${day}`}
            style={{
              width: `${100 / 7}%`,
              textAlign: "center",
              color: index === 0 ? COLORS.error : COLORS.muted,
              fontSize: 12,
              fontWeight: "900",
              paddingVertical: 5,
            }}
          >
            {day}
          </Text>
        ))}
        {cells.map((cell) => {
          const selected = sameDate(selectedDate, cell.date);
          return (
            <Pressable
              key={`${label}-${cell.key}`}
              disabled={!cell.date}
              onPress={() => cell.date && selectDate(cell.date)}
              style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 4 }}
            >
              {cell.date ? (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: selected ? 0 : 1,
                    borderColor: COLORS.border,
                    backgroundColor: selected ? COLORS.primary : COLORS.surface,
                  }}
                >
                  <Text style={{ color: selected ? "#ffffff" : COLORS.text, fontWeight: "900" }}>{cell.date.getDate()}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: COLORS.muted, fontWeight: "900" }}>시간</Text>
        <View style={{ flex: 1, gap: 8 }}>
          <Pressable
            onPress={() => setTimeOpen((current) => !current)}
            style={{
              minHeight: 44,
              borderRadius: RADIUS.button,
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: COLORS.surface,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text style={{ color: COLORS.text, fontWeight: "900" }}>{time}</Text>
            <Ionicons name={timeOpen ? "chevron-up" : "chevron-down"} size={18} color={COLORS.muted} />
          </Pressable>
          {timeOpen ? (
            <View
              style={{
                borderRadius: RADIUS.button,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.surface,
                padding: 8,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {EVENT_TIME_OPTIONS.map((option) => {
                const selected = option === time;
                return (
                  <Pressable
                    key={`${label}-${option}`}
                    onPress={() => changeTime(option)}
                    style={{
                      width: "23%",
                      minHeight: 34,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: RADIUS.button,
                      borderWidth: 1,
                      borderColor: selected ? COLORS.primary : COLORS.border,
                      backgroundColor: selected ? COLORS.primary50 : COLORS.surfaceAlt,
                    }}
                  >
                    <Text style={{ color: selected ? COLORS.primary : COLORS.text, fontSize: 12, fontWeight: "900" }}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  tone = "primary",
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: "primary" | "outline" | "danger" | "muted";
  disabled?: boolean;
}) {
  const background =
    tone === "primary" ? COLORS.primary : tone === "danger" ? COLORS.error : tone === "muted" ? COLORS.surfaceAlt : COLORS.surface;
  const borderColor = tone === "outline" || tone === "muted" ? COLORS.border : background;
  const color = tone === "primary" || tone === "danger" ? "#ffffff" : tone === "muted" ? COLORS.muted : COLORS.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
        borderRadius: RADIUS.button,
        borderWidth: 1,
        borderColor,
        backgroundColor: background,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 12,
        paddingVertical: 11,
      }}
    >
      {icon ? <Ionicons name={icon} size={17} color={color} /> : null}
      <Text style={{ color, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function MajorOptionEditor({
  item,
  onSave,
}: {
  item: MajorOption;
  onSave: (majorId: number, payload: { name: string; sort_order: number; is_active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [sortOrder, setSortOrder] = useState(String(item.sort_order));
  const [isActive, setIsActive] = useState(item.is_active);

  useEffect(() => {
    setName(item.name);
    setSortOrder(String(item.sort_order));
    setIsActive(item.is_active);
  }, [item.id, item.is_active, item.name, item.sort_order]);

  return (
    <Panel>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ flex: 1, color: COLORS.primary900, fontSize: 16, fontWeight: "900" }}>{item.name}</Text>
          <Chip active={isActive} label={isActive ? "활성" : "비활성"} onPress={() => setIsActive((current) => !current)} tone={isActive ? "success" : "muted"} />
        </View>
        <Field value={name} onChangeText={setName} placeholder="전공명" />
        <Field value={sortOrder} onChangeText={(value) => setSortOrder(value.replace(/\D/g, ""))} placeholder="정렬 순서" />
        <ActionButton
          icon="save-outline"
          label="전공 저장"
          onPress={() => void onSave(item.id, { name: name.trim(), sort_order: Number(sortOrder || 0), is_active: isActive })}
        />
      </View>
    </Panel>
  );
}

function Chip({
  label,
  active,
  onPress,
  tone = "primary",
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const toneColor =
    tone === "success" ? COLORS.success : tone === "warning" ? COLORS.warning : tone === "danger" ? COLORS.error : tone === "muted" ? COLORS.muted : COLORS.primary;
  const activeBg =
    tone === "success"
      ? "#EAF7EF"
      : tone === "warning"
        ? "#FFF7D9"
        : tone === "danger"
          ? "#FDECEC"
          : tone === "muted"
            ? COLORS.surfaceAlt
            : COLORS.primary50;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={{
        borderRadius: RADIUS.button,
        borderWidth: 1,
        borderColor: active ? toneColor : COLORS.border,
        backgroundColor: active ? activeBg : COLORS.surface,
        paddingHorizontal: 10,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: active ? toneColor : COLORS.muted, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function StatusText({ active, activeLabel = "노출", inactiveLabel = "숨김" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return <Chip active label={active ? activeLabel : inactiveLabel} tone={active ? "success" : "danger"} />;
}

function BannerImageControl({
  label,
  hint,
  value,
  uploading,
  onChangeText,
  onUpload,
}: {
  label: string;
  hint: string;
  value: string;
  uploading: boolean;
  onChangeText: (value: string) => void;
  onUpload: () => void;
}) {
  const fileName = value ? value.split("/").pop() : "";
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, padding: 12, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontWeight: "900" }}>{label}</Text>
          <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text>
        </View>
        <ActionButton
          icon="cloud-upload-outline"
          label={uploading ? "업로드 중" : "파일 업로드"}
          onPress={onUpload}
          tone={value ? "outline" : "primary"}
          disabled={uploading}
        />
      </View>
      {fileName ? <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "800" }}>{fileName}</Text> : null}
      <Field value={value} onChangeText={onChangeText} placeholder={`${label} 이미지 URL`} />
    </View>
  );
}

function BannerPreview({ form, index = 0, total = 1 }: { form: BannerForm; index?: number; total?: number }) {
  const theme = BANNER_THEMES[form.theme];
  const imageUrl = mediaUrl(cleanOptional(form.mobile_image_url) ?? cleanOptional(form.tablet_image_url) ?? cleanOptional(form.desktop_image_url));
  const isPlain = form.theme === "none";
  const title = cleanOptional(form.title);
  const subtitle = cleanOptional(form.subtitle);
  const badge = cleanOptional(form.badge_text);
  const pageTotal = Math.max(total, 1);
  const pageIndex = Math.min(index + 1, pageTotal);

  const content = (
    <View
      style={{
        minHeight: 162,
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: imageUrl && !isPlain ? "rgba(11,31,86,0.62)" : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        {badge ? (
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="sparkles-outline" size={13} color={theme.badge} />
            <Text style={{ color: theme.badge, fontSize: 12, fontWeight: "900" }} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View
          style={{
            minWidth: 38,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: isPlain ? 1 : 0,
            borderColor: isPlain ? COLORS.border : "transparent",
            backgroundColor: isPlain ? COLORS.surfaceAlt : "rgba(255,255,255,0.18)",
            paddingHorizontal: 9,
          }}
        >
          <Text style={{ color: isPlain ? COLORS.muted : "#ffffff", fontSize: 12, fontWeight: "900" }}>{pageIndex}/{pageTotal}</Text>
        </View>
      </View>
      <View>
        {title ? (
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: "900", lineHeight: 31 }} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: title ? 7 : 0 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "800" }}>앱 홈 상단 미리보기</Text>
        {form.cta_label.trim() ? (
          <View
            style={{
              borderRadius: RADIUS.button,
              borderWidth: isPlain ? 1 : 0,
              borderColor: isPlain ? COLORS.border : "transparent",
              backgroundColor: isPlain ? COLORS.surfaceAlt : "rgba(255,255,255,0.18)",
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: isPlain ? COLORS.text : "#ffffff", fontSize: 12, fontWeight: "900" }}>{form.cta_label.trim()}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: COLORS.primary900, fontSize: 13, fontWeight: "900" }}>홈 배너 미리보기</Text>
      {imageUrl ? (
        <MediaImageBackground
          media={{ url: imageUrl }}
          imageStyle={{ borderRadius: RADIUS.card }}
          style={{
            borderRadius: RADIUS.card,
            overflow: "hidden",
            borderWidth: isPlain ? 1 : 0,
            borderColor: theme.border ?? "transparent",
            backgroundColor: theme.bg,
            ...ELEVATION,
          }}
        >
          {content}
        </MediaImageBackground>
      ) : (
        <View
          style={{
            borderRadius: RADIUS.card,
            overflow: "hidden",
            borderWidth: isPlain ? 1 : 0,
            borderColor: theme.border ?? "transparent",
            backgroundColor: theme.bg,
            ...ELEVATION,
          }}
        >
          {content}
        </View>
      )}
    </View>
  );
}

function BannerCard({
  item,
  position,
  selected,
  onEdit,
  onHide,
}: {
  item: BannerItem;
  position: number;
  selected?: boolean;
  onEdit: (item: BannerItem) => void;
  onHide: (item: BannerItem) => void;
}) {
  return (
    <View
      style={{
        borderRadius: RADIUS.card,
        borderWidth: 1,
        borderColor: selected ? COLORS.primary : COLORS.border,
        backgroundColor: selected ? COLORS.primary50 : COLORS.surface,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Chip active label={`${position}번째 배너`} tone="primary" />
        <StatusText active={item.is_active} />
        <Chip active label={item.theme} />
        {item.image_urls?.mobile || item.image_urls?.tablet || item.image_urls?.desktop || item.image_url ? (
          <Chip active label="이미지" tone="success" />
        ) : null}
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>순서 {item.sort_order}</Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{item.title || "이미지 배너"}</Text>
      {item.subtitle ? <Text style={{ color: COLORS.muted, lineHeight: 20 }}>{item.subtitle}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ActionButton icon="create-outline" label={selected ? "수정 중" : "선택/수정"} onPress={() => onEdit(item)} tone={selected ? "primary" : "outline"} />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton icon="eye-off-outline" label="숨김" onPress={() => onHide(item)} tone="danger" disabled={!item.is_active} />
        </View>
      </View>
    </View>
  );
}

function NoticeCard({
  item,
  onEdit,
  onPinToggle,
  onDelete,
}: {
  item: PostListItem;
  onEdit: (item: PostListItem) => void;
  onPinToggle: (item: PostListItem) => void;
  onDelete: (item: PostListItem) => void;
}) {
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {item.is_pinned ? <Chip active label="고정" tone="warning" /> : <Chip label="일반" tone="muted" />}
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{formatDate(item.created_at)}</Text>
      </View>
      <Pressable onPress={() => router.push(`/board/post/${item.id}` as never)}>
        <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ color: COLORS.muted, lineHeight: 20, marginTop: 4 }} numberOfLines={2}>
          {item.content_preview}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ActionButton icon="create-outline" label="수정" onPress={() => onEdit(item)} tone="outline" />
        <ActionButton icon={item.is_pinned ? "remove-circle-outline" : "pin-outline"} label={item.is_pinned ? "고정 해제" : "고정"} onPress={() => onPinToggle(item)} tone="outline" />
        <ActionButton icon="trash-outline" label="삭제" onPress={() => onDelete(item)} tone="danger" />
      </View>
    </View>
  );
}

function ShortcutCard({
  title,
  description,
  icon,
  meta,
  onPress,
}: {
  title: string;
  description: string;
  icon: IconName;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: RADIUS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
        padding: 14,
        gap: 10,
        ...ELEVATION,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: RADIUS.button,
            backgroundColor: COLORS.primary50,
          }}
        >
          <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{title}</Text>
          <Text style={{ color: COLORS.muted, lineHeight: 19, marginTop: 3 }}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
      </View>
      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "900" }}>{meta}</Text>
    </Pressable>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <View style={{ flex: 1, minWidth: 132, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14 }}>
      <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "900" }}>{label}</Text>
      <Text style={{ color: COLORS.primary900, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{value}</Text>
      <Text style={{ color: COLORS.subtle, fontSize: 12, marginTop: 4 }}>{hint}</Text>
    </View>
  );
}

function AdminPostCard({
  item,
  onPinToggle,
  onDelete,
}: {
  item: PostListItem;
  onPinToggle: (item: PostListItem) => void;
  onDelete: (item: PostListItem) => void;
}) {
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Chip active label={item.board_name ?? `게시판 ${item.board_id}`} />
        {item.is_notice ? <Chip active label="공지" tone="warning" /> : null}
        {item.is_pinned ? <Chip active label="고정" tone="success" /> : null}
        {item.is_anonymous ? <Chip active label="익명" tone="muted" /> : null}
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{formatDate(item.created_at)}</Text>
      </View>
      <Pressable onPress={() => router.push(`/board/post/${item.id}` as never)}>
        <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ color: COLORS.muted, lineHeight: 20, marginTop: 4 }} numberOfLines={2}>
          {item.content_preview}
        </Text>
      </Pressable>
      <Text style={{ color: COLORS.muted, fontSize: 12 }}>
        작성자 {item.author_nickname} · 댓글 {item.comment_count} · 추천 {item.like_count} · 첨부 {item.attachment_count ?? 0}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ActionButton icon="open-outline" label="열기" onPress={() => router.push(`/board/post/${item.id}` as never)} tone="outline" />
        <ActionButton icon="create-outline" label="수정" onPress={() => router.push(`/board/post/edit/${item.id}` as never)} tone="outline" />
        <ActionButton icon={item.is_pinned ? "remove-circle-outline" : "pin-outline"} label={item.is_pinned ? "고정 해제" : "고정"} onPress={() => onPinToggle(item)} tone="outline" />
        <ActionButton icon="trash-outline" label="삭제" onPress={() => onDelete(item)} tone="danger" />
      </View>
    </View>
  );
}

const MUTUAL_AID_ADMIN_STATUS: Record<MutualAidStatus, { label: string; tone: "primary" | "success" | "danger" }> = {
  processing: { label: "처리중", tone: "primary" },
  completed: { label: "처리 완료", tone: "success" },
  rejected: { label: "반려", tone: "danger" },
};

function MutualAidAdminCard({ item }: { item: PostListItem }) {
  const request = item.mutual_aid;
  const status = MUTUAL_AID_ADMIN_STATUS[request?.status ?? "processing"];
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Chip active label={status.label} tone={status.tone} />
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{item.title}</Text>
      <Text style={{ color: COLORS.muted, fontSize: 13 }}>
        신청자 {formatCohortName(item.author_cohort, item.author_nickname)}
        {request ? ` · ${request.event_type} · ${request.event_date} · ${request.relation}` : ""}
      </Text>
      {request?.rejection_reason ? (
        <View style={{ borderRadius: RADIUS.button, backgroundColor: "#FDECEF", padding: 10 }}>
          <Text style={{ color: COLORS.error, fontSize: 12, fontWeight: "900" }}>반려 사유</Text>
          <Text style={{ color: COLORS.text, lineHeight: 19, marginTop: 4 }}>{request.rejection_reason}</Text>
        </View>
      ) : null}
      <ActionButton
        icon="open-outline"
        label={request?.status === "processing" ? "검토 · 처리" : "신청 상세 보기"}
        onPress={() => router.push(`/board/post/${item.id}` as never)}
      />
    </View>
  );
}

function SuggestionAdminCard({ item }: { item: PostListItem }) {
  const answered = item.suggestion?.status === "answered";
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Chip active label={answered ? "답변완료" : "대기중"} tone={answered ? "success" : "warning"} />
        <Chip active label="익명" tone="muted" />
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{item.title}</Text>
      {item.content_preview ? <Text style={{ color: COLORS.muted, lineHeight: 20 }} numberOfLines={3}>{item.content_preview}</Text> : null}
      {item.suggestion?.admin_reply ? (
        <View style={{ borderRadius: RADIUS.button, backgroundColor: COLORS.primary50, padding: 10 }}>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "900" }}>원우회 답변</Text>
          <Text style={{ color: COLORS.text, lineHeight: 19, marginTop: 4 }} numberOfLines={3}>{item.suggestion.admin_reply}</Text>
        </View>
      ) : null}
      <ActionButton
        icon={answered ? "create-outline" : "chatbox-ellipses-outline"}
        label={answered ? "답변 확인 · 수정" : "답변 작성"}
        onPress={() => router.push(`/board/post/${item.id}` as never)}
      />
    </View>
  );
}

function BoardCard({ item, onEdit }: { item: Board; onEdit: (item: Board) => void }) {
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <StatusText active={Boolean(item.is_active)} />
        <Chip active label={BOARD_TYPE_LABELS[item.board_type] ?? item.board_type} />
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{CATEGORY_LABELS[item.category] ?? item.category}</Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{item.name}</Text>
      <Text style={{ color: COLORS.muted }}>{item.slug}</Text>
      {item.description ? <Text style={{ color: COLORS.muted, lineHeight: 20 }}>{item.description}</Text> : null}
      <Text style={{ color: COLORS.muted, fontSize: 12 }}>
        읽기 {item.read_permission} / 쓰기 {item.write_permission} / 순서 {item.sort_order}
      </Text>
      <ActionButton icon="settings-outline" label="게시판 수정" onPress={() => onEdit(item)} tone="outline" />
    </View>
  );
}

function UserCard({
  item,
  onRoleToggle,
  onActiveToggle,
  onEligibilityChange,
}: {
  item: AdminUserItem;
  onRoleToggle: (item: AdminUserItem) => void;
  onActiveToggle: (item: AdminUserItem) => void;
  onEligibilityChange: (
    item: AdminUserItem,
    payload: Partial<Pick<AdminUserItem, "enrollment_status" | "dues_status">>
  ) => void;
}) {
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <StatusText active={item.is_active} activeLabel="활성" inactiveLabel="비활성" />
        <Chip active={item.role === "admin"} label={USER_ROLE_LABELS[item.role]} />
        {item.cohort ? <Text style={{ color: COLORS.muted, fontSize: 12 }}>{item.cohort}기</Text> : null}
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{item.nickname}</Text>
      <Text style={{ color: COLORS.muted }}>{item.email}</Text>
      {item.major ? <Text style={{ color: COLORS.muted }}>전공: {item.major}</Text> : null}
      {item.privacy_policy_version && item.privacy_consented_at ? (
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>
          개인정보 동의: v{item.privacy_policy_version} · {item.privacy_consented_at.slice(0, 16).replace("T", " ")}
        </Text>
      ) : (
        <Text style={{ color: COLORS.subtle, fontSize: 12 }}>개인정보 동의 기록: 없음(기존 계정)</Text>
      )}
      <View style={{ gap: 6 }}>
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>재학 상태</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {([
            ["active", "재학"],
            ["leave", "휴학"],
            ["graduated", "졸업"],
          ] as const).map(([value, label]) => (
            <Chip
              key={value}
              active={item.enrollment_status === value}
              label={label}
              onPress={() => onEligibilityChange(item, { enrollment_status: value })}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>회비 상태</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {([
            ["paid", "납부"],
            ["unpaid", "미납"],
            ["exempt", "면제"],
          ] as const).map(([value, label]) => (
            <Chip
              key={value}
              active={item.dues_status === value}
              label={label}
              onPress={() => onEligibilityChange(item, { dues_status: value })}
            />
          ))}
        </View>
      </View>
      <Text style={{ color: COLORS.muted, fontSize: 12 }}>가입 {formatDate(item.created_at)} / 최근 {formatDate(item.last_login_at)}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ActionButton label={item.role === "admin" ? "일반 전환" : "관리자 지정"} onPress={() => onRoleToggle(item)} tone="outline" />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton label={item.is_active ? "비활성화" : "복구"} onPress={() => onActiveToggle(item)} tone={item.is_active ? "danger" : "primary"} />
        </View>
      </View>
    </View>
  );
}

function ReportCard({
  report,
  onStatusChange,
  onDeleteTarget,
}: {
  report: AdminReportItem;
  onStatusChange: (report: AdminReportItem, status: ReportStatus) => void;
  onDeleteTarget: (report: AdminReportItem) => void;
}) {
  const targetLabel = report.target_type === "post" ? "게시글" : "댓글";
  const canOpenTarget = report.target.post_id && !report.target.target_deleted;
  const canDeleteTarget = report.target.target_exists && !report.target.target_deleted;

  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Chip active label={`${targetLabel} 신고`} tone="danger" />
        <Chip active label={REPORT_STATUS_LABELS[report.status]} />
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{formatDate(report.created_at)}</Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }} numberOfLines={2}>
        {report.target.title ?? "삭제되었거나 찾을 수 없는 대상"}
      </Text>
      {report.target.content_preview ? (
        <Text style={{ color: COLORS.muted, lineHeight: 20 }} numberOfLines={3}>
          {report.target.content_preview}
        </Text>
      ) : null}
      <Text style={{ color: COLORS.text, fontWeight: "800" }}>사유: {REPORT_REASON_LABELS[report.reason] ?? report.reason}</Text>
      {report.detail ? <Text style={{ color: COLORS.muted, lineHeight: 20 }}>상세: {report.detail}</Text> : null}
      <Text style={{ color: COLORS.muted }}>
        신고자 {report.reporter_nickname} / 작성자 {report.target.author_nickname ?? "알 수 없음"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["open", "reviewing", "resolved", "dismissed"] as const).map((status) => (
          <Chip key={status} active={report.status === status} label={REPORT_STATUS_LABELS[status]} onPress={() => onStatusChange(report, status)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ActionButton
            label="대상 보기"
            onPress={() => {
              if (report.target.post_id) {
                router.push(`/board/post/${report.target.post_id}` as never);
              }
            }}
            tone="outline"
            disabled={!canOpenTarget}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton label="대상 삭제" onPress={() => onDeleteTarget(report)} tone="danger" disabled={!canDeleteTarget} />
        </View>
      </View>
    </View>
  );
}

function FAQCard({ item, onEdit, onDelete }: { item: FAQItem; onEdit: (item: FAQItem) => void; onDelete: (item: FAQItem) => void }) {
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <StatusText active={item.is_active} />
        {item.category ? <Chip active label={item.category} /> : null}
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>순서 {item.sort_order}</Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{item.question}</Text>
      <Text style={{ color: COLORS.muted, lineHeight: 20 }} numberOfLines={4}>
        {item.answer}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ActionButton label="수정" onPress={() => onEdit(item)} tone="outline" />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton label="숨김" onPress={() => onDelete(item)} tone="danger" />
        </View>
      </View>
    </View>
  );
}

function EventCard({ event, onEdit }: { event: EventItem; onEdit: (event: EventItem) => void }) {
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "900" }}>
          {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
        </Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{event.title}</Text>
      <Text style={{ color: COLORS.muted }}>{formatDate(event.start_at)}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ActionButton label="수정" onPress={() => onEdit(event)} tone="outline" />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton label="보기" onPress={() => router.push(`/events/${event.id}` as never)} tone="outline" />
        </View>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const params = useLocalSearchParams<{ editEventId?: string; section?: string; scope?: string }>();
  const editEventIdParam = firstParam(params.editEventId);
  const editEventId = editEventIdParam ? Number(editEventIdParam) : null;
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();
  const [section, setSection] = useState<AdminSection>(parseAdminSection(params.section) ?? "dashboard");
  const [boardScope, setBoardScope] = useState<BoardScope>(parseBoardScope(params.scope) ?? "all");
  const [postSearch, setPostSearch] = useState("");
  const [appliedPostSearch, setAppliedPostSearch] = useState("");
  const [postBoardId, setPostBoardId] = useState<number | null>(null);
  const [postMode, setPostMode] = useState<AdminPostMode>("all");
  const [mutualAidFilter, setMutualAidFilter] = useState<MutualAidStatus | "all">("processing");
  const [suggestionFilter, setSuggestionFilter] = useState<SuggestionAdminFilter>("received");
  const [reportStatus, setReportStatus] = useState<ReportStatus | "all">("open");
  const [userSearch, setUserSearch] = useState("");
  const [appliedUserSearch, setAppliedUserSearch] = useState("");
  const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBanner);
  const [bannerUploadSlot, setBannerUploadSlot] = useState<BannerImageSlot | null>(null);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaveMessage, setBannerSaveMessage] = useState<BannerSaveMessage>(null);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [boardForm, setBoardForm] = useState<BoardForm>(emptyBoard);
  const [selectedNoticeBoardId, setSelectedNoticeBoardId] = useState<number | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [noticeForm, setNoticeForm] = useState<NoticeForm>(emptyNotice);
  const [noticeAttachments, setNoticeAttachments] = useState<MediaAsset[]>([]);
  const [noticeMetadata, setNoticeMetadata] = useState<Record<string, unknown>>({});
  const [noticeUploading, setNoticeUploading] = useState(false);
  const [noticeUploadProgress, setNoticeUploadProgress] = useState(0);
  const [executiveMembers, setExecutiveMembers] = useState<ExecutiveFormMember[]>([]);
  const [executiveUploadingIndex, setExecutiveUploadingIndex] = useState<number | null>(null);
  const [executivesSaving, setExecutivesSaving] = useState(false);
  const [cohortLeaders, setCohortLeaders] = useState<CohortLeaderForm[]>([]);
  const [cohortLeaderUploading, setCohortLeaderUploading] = useState<{ index: number; field: CohortLeaderImageField } | null>(null);
  const [cohortLeadersSaving, setCohortLeadersSaving] = useState(false);
  const [pastCouncils, setPastCouncils] = useState<PastCouncilForm[]>([]);
  const [pastCouncilUploading, setPastCouncilUploading] = useState<{ index: number; field: PastCouncilImageField } | null>(null);
  const [pastCouncilsSaving, setPastCouncilsSaving] = useState(false);
  const [editingFAQId, setEditingFAQId] = useState<number | null>(null);
  const [faqForm, setFAQForm] = useState<FAQForm>(emptyFAQ);
  const [newMajorName, setNewMajorName] = useState("");
  const [newMajorOrder, setNewMajorOrder] = useState("50");
  const [policyVersion, setPolicyVersion] = useState("");
  const [policyEffectiveAt, setPolicyEffectiveAt] = useState("");

  const isAdmin = user?.role === "admin";

  const bannersQuery = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => bannerApi.getBanners({ include_inactive: true }),
    enabled: isAdmin,
  });
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: adminApi.getStats,
    enabled: isAdmin && section === "dashboard",
  });
  const auditLogsQuery = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => adminApi.getAuditLogs({ size: 8 }),
    enabled: isAdmin && section === "dashboard",
  });
  const boardsQuery = useQuery({
    queryKey: ["admin-boards"],
    queryFn: () => boardApi.getAdminBoards(),
    enabled: isAdmin,
  });
  const eventsQuery = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => eventApi.getEvents(),
    enabled: isAdmin,
  });
  const adminEventList = eventsQuery.data?.data ?? [];
  const editEventExists = Boolean(editEventId) && adminEventList.some((event) => event.id === editEventId);
  const editEventMissing = eventsQuery.isSuccess && Boolean(editEventId) && !editEventExists;
  const editEventQuery = useQuery({
    queryKey: ["event", editEventId],
    queryFn: () => eventApi.getEvent(editEventId ?? 0),
    enabled: isAdmin && editEventExists,
    retry: false,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-reports", reportStatus],
    queryFn: () => reportApi.getAdminReports({ status: reportStatus, size: 50 }),
    enabled: isAdmin,
  });
  const usersQuery = useQuery({
    queryKey: ["admin-users", appliedUserSearch],
    queryFn: () => adminApi.getUsers({ q: appliedUserSearch.trim() || undefined, size: 100 }),
    enabled: isAdmin,
  });
  const faqsQuery = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: () => faqApi.getFAQs({ include_inactive: true }),
    enabled: isAdmin,
  });
  const adminMajorsQuery = useQuery({
    queryKey: ["admin-registration-majors"],
    queryFn: registrationApi.getAdminMajors,
    enabled: isAdmin && section === "registration",
  });
  const adminPrivacyPolicyQuery = useQuery({
    queryKey: ["admin-registration-privacy-policy"],
    queryFn: registrationApi.getAdminPrivacyPolicy,
    enabled: isAdmin && section === "registration",
  });
  const noticePostsQuery = useQuery({
    queryKey: ["admin-notices", selectedNoticeBoardId],
    queryFn: () => postApi.getPosts(selectedNoticeBoardId ?? 0, 1, 50, { sort: "latest" }),
    enabled: isAdmin && Boolean(selectedNoticeBoardId),
  });
  const adminPostsQuery = useQuery({
    queryKey: ["admin-posts", appliedPostSearch, postBoardId, postMode],
    queryFn: () =>
      postApi.getAdminPosts({
        page: 1,
        size: 50,
        q: appliedPostSearch.trim() || undefined,
        board_id: postBoardId ?? undefined,
        is_notice: postMode === "notice" ? true : undefined,
        is_pinned: postMode === "pinned" ? true : undefined,
      }),
    enabled: isAdmin && (section === "dashboard" || section === "posts"),
  });
  const mutualAidPostsQuery = useQuery({
    queryKey: ["admin-mutual-aid"],
    queryFn: () => postApi.getAdminPosts({ page: 1, size: 100, board_type: "mutual_aid" }),
    enabled: isAdmin && (section === "dashboard" || section === "mutualAid"),
  });
  const suggestionPostsQuery = useQuery({
    queryKey: ["admin-suggestions"],
    queryFn: () => postApi.getAdminPosts({ page: 1, size: 100, board_type: "suggestion" }),
    enabled: isAdmin && (section === "dashboard" || section === "suggestions"),
  });

  const noticeBoards = useMemo(
    () => (boardsQuery.data?.data ?? []).filter((board) => board.board_type === "notice" && board.is_active !== false),
    [boardsQuery.data?.data]
  );
  const executivesBoard = useMemo(
    () => (boardsQuery.data?.data ?? []).find((board) => board.slug === "gsa-executives"),
    [boardsQuery.data?.data]
  );
  const cohortLeadersBoard = useMemo(
    () => (boardsQuery.data?.data ?? []).find((board) => board.slug === "gsa-cohort-leaders"),
    [boardsQuery.data?.data]
  );
  const pastCouncilsBoard = useMemo(
    () => (boardsQuery.data?.data ?? []).find((board) => board.slug === "gsa-past-councils"),
    [boardsQuery.data?.data]
  );

  const { control, handleSubmit, reset } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: emptyEvent,
  });

  useEffect(() => {
    if (!selectedNoticeBoardId && noticeBoards[0]) {
      setSelectedNoticeBoardId(noticeBoards[0].id);
    }
  }, [noticeBoards, selectedNoticeBoardId]);

  useEffect(() => {
    const nextSection = parseAdminSection(params.section);
    if (nextSection) {
      setSection(nextSection);
    }
    const nextScope = parseBoardScope(params.scope);
    if (nextScope) {
      setBoardScope(nextScope);
    }
  }, [params.scope, params.section]);

  useEffect(() => {
    if (!editEventMissing) {
      return;
    }
    setSection("events");
    reset(emptyEvent);
    router.replace({ pathname: "/admin", params: { section: "events" } } as never);
  }, [editEventMissing, reset]);

  useEffect(() => {
    const event = editEventQuery.data?.data;
    if (!event) {
      return;
    }
    setSection("events");
    reset({
      title: event.title,
      category: event.category,
      start_at: event.start_at.slice(0, 16),
      end_at: event.end_at?.slice(0, 16) ?? "",
      location: event.location ?? "",
      description: event.description ?? "",
    });
  }, [editEventQuery.data?.data, reset]);

  useEffect(() => {
    const currentBanners = bannersQuery.data?.data ?? [];
    if (editingBannerId || bannerForm.sort_order !== "0" || currentBanners.length === 0) {
      return;
    }
    setBannerForm((current) => ({ ...current, sort_order: String(nextBannerOrder(currentBanners)) }));
  }, [bannerForm.sort_order, bannersQuery.data?.data, editingBannerId]);

  useEffect(() => {
    const policy = adminPrivacyPolicyQuery.data?.data;
    if (!policy) {
      return;
    }
    setPolicyVersion(policy.version);
    setPolicyEffectiveAt(policy.effective_at.slice(0, 16));
  }, [adminPrivacyPolicyQuery.data?.data]);

  useEffect(() => {
    if (!executivesBoard) return;
    const parsed = executiveMembersFromMetadata(executivesBoard.metadata);
    setExecutiveMembers(parsed.length > 0 ? parsed : defaultExecutiveMembers.map((item) => ({ ...item })));
  }, [executivesBoard]);

  useEffect(() => {
    if (!cohortLeadersBoard) return;
    setCohortLeaders(cohortLeadersFromMetadata(cohortLeadersBoard.metadata));
  }, [cohortLeadersBoard]);

  useEffect(() => {
    if (!pastCouncilsBoard) return;
    setPastCouncils(pastCouncilsFromMetadata(pastCouncilsBoard.metadata));
  }, [pastCouncilsBoard]);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
        <BackButton fallback="/(tabs)/settings" />
        <View style={{ marginTop: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: "#F7B8B8", backgroundColor: "#FDECEC", padding: 18 }}>
          <Text style={{ color: COLORS.error, fontSize: 18, fontWeight: "900" }}>관리자 권한이 필요합니다</Text>
          <Text style={{ color: COLORS.muted, lineHeight: 21, marginTop: 8 }}>이 화면은 관리자 API 권한으로만 사용할 수 있습니다.</Text>
        </View>
      </View>
    );
  }

  const banners = bannersQuery.data?.data ?? [];
  const sortedBanners = [...banners].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.id - right.id);
  const boards = boardsQuery.data?.data ?? [];
  const reports = reportsQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const faqs = faqsQuery.data?.data ?? [];
  const adminMajors: MajorOption[] = adminMajorsQuery.data?.data ?? [];
  const adminPrivacyPolicy: PrivacyPolicyVersion | undefined = adminPrivacyPolicyQuery.data?.data;
  const events = adminEventList;
  const noticePosts = noticePostsQuery.data?.data ?? [];
  const adminPosts = adminPostsQuery.data?.data ?? [];
  const mutualAidPosts = mutualAidPostsQuery.data?.data ?? [];
  const visibleMutualAidPosts = mutualAidFilter === "all"
    ? mutualAidPosts
    : mutualAidPosts.filter((item) => item.mutual_aid?.status === mutualAidFilter);
  const processingMutualAidCount = mutualAidPosts.filter((item) => item.mutual_aid?.status === "processing").length;
  const suggestionPosts = suggestionPostsQuery.data?.data ?? [];
  const visibleSuggestionPosts = suggestionFilter === "all"
    ? suggestionPosts
    : suggestionPosts.filter((item) => item.suggestion?.status === suggestionFilter);
  const pendingSuggestionCount = suggestionPosts.filter((item) => item.suggestion?.status !== "answered").length;
  const adminPostTotal = adminPostsQuery.data?.pagination?.total ?? adminPosts.length;
  const stats = statsQuery.data?.data;
  const auditLogs: AdminAuditLog[] = auditLogsQuery.data?.data ?? [];
  const selectedNoticeBoard = noticeBoards.find((board) => board.id === selectedNoticeBoardId);
  const boardScopeFilter = BOARD_SCOPE_FILTERS.find((item) => item.key === boardScope) ?? BOARD_SCOPE_FILTERS[0];
  const visibleBoards =
    boardScopeFilter.key === "all" ? boards : boards.filter((board) => boardScopeFilter.categories.includes(board.category));
  const activeBannerCount = banners.filter((item) => item.is_active).length;
  const councilBoardCount = boards.filter((board) => ["council", "gsa"].includes(board.category)).length;
  const clubPromoBoard = boards.find((board) => board.slug === "club-promo");
  const networkingProgramsBoard = boards.find((board) => board.slug === "networking-programs");
  const selectedBannerPosition = bannerPosition(sortedBanners, editingBannerId);
  const nextBannerPosition = sortedBanners.length + 1;
  const suggestedBannerOrder = nextBannerOrder(sortedBanners);
  const previewBannerPosition = editingBannerId ? selectedBannerPosition ?? 1 : nextBannerPosition;
  const previewBannerTotal = editingBannerId ? Math.max(sortedBanners.length, 1) : nextBannerPosition;
  const openAdminSection = (nextSection: AdminSection, nextScope?: BoardScope) => {
    setSection(nextSection);
    if (nextScope) {
      setBoardScope(nextScope);
    }
  };
  const dispatchEventReminders = async () => {
    try {
      const response = await adminApi.dispatchEventReminders();
      Alert.alert("D-day 알림 처리 완료", `${response.data.created}개의 알림을 생성했습니다.`);
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    } catch {
      Alert.alert("처리 실패", "D-day 알림 작업을 실행하지 못했습니다.");
    }
  };

  const handleCreateMajor = async () => {
    if (!newMajorName.trim()) {
      Alert.alert("입력 확인", "전공명을 입력해주세요.");
      return;
    }
    try {
      await registrationApi.createMajor({ name: newMajorName.trim(), sort_order: Number(newMajorOrder || 0) });
      setNewMajorName("");
      setNewMajorOrder(String((adminMajors.length + 2) * 10));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-registration-majors"] }),
        queryClient.invalidateQueries({ queryKey: ["registration-options"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
    } catch {
      Alert.alert("저장 실패", "같은 이름의 전공이 있는지 확인해주세요.");
    }
  };

  const handleSaveMajor = async (
    majorId: number,
    payload: { name: string; sort_order: number; is_active: boolean }
  ) => {
    if (!payload.name) {
      Alert.alert("입력 확인", "전공명을 입력해주세요.");
      return;
    }
    try {
      await registrationApi.updateMajor(majorId, payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-registration-majors"] }),
        queryClient.invalidateQueries({ queryKey: ["registration-options"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
    } catch {
      Alert.alert("저장 실패", "중복 전공명 또는 최소 1개의 활성 전공 조건을 확인해주세요.");
    }
  };

  const handleSavePrivacyPolicy = async () => {
    if (!policyVersion.trim() || !policyEffectiveAt) {
      Alert.alert("입력 확인", "정책 버전과 시행일시를 입력해주세요.");
      return;
    }
    try {
      await registrationApi.updatePrivacyPolicy({
        version: policyVersion.trim(),
        effective_at: policyEffectiveAt,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-registration-privacy-policy"] }),
        queryClient.invalidateQueries({ queryKey: ["registration-options"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
      Alert.alert("저장 완료", "신규 회원가입에 적용할 개인정보 처리방침 버전을 변경했습니다.");
    } catch {
      Alert.alert("저장 실패", "정책 버전과 시행일시를 확인해주세요.");
    }
  };
  const syncPushReceipts = async () => {
    try {
      const response = await adminApi.syncPushReceipts();
      Alert.alert("푸시 영수증 확인", `확인 ${response.data.checked}건 · 성공 ${response.data.delivered}건 · 실패 ${response.data.failed}건`);
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch {
      Alert.alert("처리 실패", "푸시 영수증을 확인하지 못했습니다.");
    }
  };

  const resetBannerForm = () => {
    setEditingBannerId(null);
    setBannerForm({ ...emptyBanner, sort_order: String(suggestedBannerOrder) });
    setBannerSaveMessage({ tone: "info", text: `${nextBannerPosition}번째 배너를 새로 등록합니다.` });
  };

  const handleEditBanner = (item: BannerItem) => {
    setEditingBannerId(item.id);
    setBannerForm(bannerFormFromItem(item));
    const position = bannerPosition(sortedBanners, item.id);
    setBannerSaveMessage({ tone: "info", text: `${position ?? "-"}번째 배너를 수정 중입니다.` });
  };

  const handleUploadBannerImage = async (slot: BannerImageSlot) => {
    try {
      setBannerUploadSlot(slot);
      const uploaded = await pickAndUploadBannerImage();
      if (!uploaded?.url) {
        return;
      }
      const field = `${slot}_image_url` as keyof Pick<
        BannerForm,
        "mobile_image_url" | "tablet_image_url" | "desktop_image_url"
      >;
      setBannerForm((current) => ({ ...current, [field]: uploaded.url ?? "" }));
    } catch {
      Alert.alert("업로드 실패", "배너 이미지 파일을 업로드할 수 없습니다.");
    } finally {
      setBannerUploadSlot(null);
    }
  };

  const handleSaveBanner = async () => {
    if (bannerSaving) {
      return;
    }

    const rawImageUrls = {
      mobile: cleanOptional(bannerForm.mobile_image_url),
      tablet: cleanOptional(bannerForm.tablet_image_url),
      desktop: cleanOptional(bannerForm.desktop_image_url),
    };
    const imageUrls = Object.fromEntries(
      Object.entries(rawImageUrls).filter((entry): entry is [string, string] => Boolean(entry[1]))
    );
    const primaryImage = imageUrls.desktop ?? imageUrls.tablet ?? imageUrls.mobile;
    const payload = {
      placement: "home" as const,
      title: cleanNullable(bannerForm.title),
      subtitle: cleanNullable(bannerForm.subtitle),
      badge_text: cleanNullable(bannerForm.badge_text),
      cta_label: cleanNullable(bannerForm.cta_label),
      cta_href: cleanNullable(bannerForm.cta_href),
      image_url: primaryImage ?? null,
      image_urls: Object.keys(imageUrls).length > 0 ? imageUrls : null,
      theme: bannerForm.theme,
      sort_order: parseSort(bannerForm.sort_order),
      is_active: bannerForm.is_active,
      starts_at: cleanNullable(bannerForm.starts_at),
      ends_at: cleanNullable(bannerForm.ends_at),
      deadline_at: cleanNullable(bannerForm.deadline_at),
    };

    try {
      setBannerSaving(true);
      setBannerSaveMessage({ tone: "info", text: "배너를 저장하는 중입니다." });
      let savedBanner: BannerItem;
      if (editingBannerId) {
        const response = await bannerApi.updateBanner(editingBannerId, payload);
        savedBanner = response.data;
      } else {
        const response = await bannerApi.createBanner(payload);
        savedBanner = response.data;
      }
      setEditingBannerId(savedBanner.id);
      setBannerForm(bannerFormFromItem(savedBanner));
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      const savedPosition = editingBannerId ? selectedBannerPosition : nextBannerPosition;
      setBannerSaveMessage({
        tone: "success",
        text: `${savedPosition ?? "-"}번째 배너가 ${editingBannerId ? "저장" : "등록"}되었습니다.`,
      });
      Alert.alert("저장 완료", "배너가 저장되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "배너 입력 정보를 확인하세요.";
      setBannerSaveMessage({ tone: "error", text: `저장 실패: ${message}` });
      Alert.alert("저장 실패", "배너 입력 정보를 확인하세요.");
    } finally {
      setBannerSaving(false);
    }
  };

  const handleHideBanner = (item: BannerItem) => {
    Alert.alert("배너 숨김", "이 배너를 홈에서 숨길까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "숨김",
        style: "destructive",
        onPress: async () => {
          try {
            await bannerApi.deleteBanner(item.id);
            queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
            queryClient.invalidateQueries({ queryKey: ["banners"] });
            if (editingBannerId === item.id) {
              setBannerForm((current) => ({ ...current, is_active: false }));
            }
            const position = bannerPosition(sortedBanners, item.id);
            setBannerSaveMessage({ tone: "success", text: `${position ?? "-"}번째 배너를 숨김 처리했습니다.` });
          } catch {
            setBannerSaveMessage({ tone: "error", text: "배너를 숨길 수 없습니다." });
            Alert.alert("처리 실패", "배너를 숨길 수 없습니다.");
          }
        },
      },
    ]);
  };

  const resetBoardForm = () => {
    setEditingBoardId(null);
    setBoardForm(emptyBoard);
  };

  const handleEditBoard = (item: Board) => {
    setEditingBoardId(item.id);
    setBoardForm({
      name: item.name,
      slug: item.slug,
      category: item.category,
      board_type: item.board_type,
      description: item.description ?? "",
      sort_order: String(item.sort_order ?? 0),
      allow_anonymous: item.allow_anonymous,
      read_permission: item.read_permission,
      write_permission: item.write_permission,
      is_active: item.is_active !== false,
    });
  };

  const handleSaveBoard = async () => {
    if (!boardForm.name.trim() || !boardForm.slug.trim() || !boardForm.category.trim()) {
      Alert.alert("게시판 확인", "이름, 슬러그, 카테고리를 입력하세요.");
      return;
    }

    const payload = {
      name: boardForm.name.trim(),
      slug: boardForm.slug.trim(),
      category: boardForm.category.trim(),
      board_type: boardForm.board_type,
      description: cleanOptional(boardForm.description),
      sort_order: parseSort(boardForm.sort_order),
      allow_anonymous: boardForm.allow_anonymous,
      read_permission: boardForm.read_permission,
      write_permission: boardForm.write_permission,
      is_active: boardForm.is_active,
    };

    try {
      if (editingBoardId) {
        const { slug: _slug, ...updatePayload } = payload;
        await boardApi.updateAdminBoard(editingBoardId, updatePayload);
      } else {
        await boardApi.createAdminBoard(payload);
      }
      resetBoardForm();
      queryClient.invalidateQueries({ queryKey: ["admin-boards"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      Alert.alert("저장 완료", "게시판 설정이 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "슬러그 중복 또는 입력값을 확인하세요.");
    }
  };

  const resetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeForm(emptyNotice);
    setNoticeAttachments([]);
    setNoticeMetadata({});
    setNoticeUploadProgress(0);
  };

  const handleEditNotice = async (item: PostListItem) => {
    try {
      const detail = await postApi.getPostDetail(item.id);
      setEditingNoticeId(item.id);
      setNoticeForm({
        title: detail.data.title,
        content: detail.data.content,
        category: normalizeNoticeCategoryValue(detail.data.category),
        is_pinned: detail.data.is_pinned,
        show_in_council_activity: detail.data.metadata?.show_in_council_activity === true,
        deadline_at: detail.data.deadline_at?.slice(0, 16) ?? "",
      });
      setNoticeAttachments(detail.data.attachments ?? []);
      setNoticeMetadata(detail.data.metadata ?? {});
    } catch {
      Alert.alert("불러오기 실패", "공지 상세를 불러올 수 없습니다.");
    }
  };

  const handleUploadNoticeImage = async () => {
    if (noticeUploading) {
      return;
    }
    try {
      setNoticeUploading(true);
      setNoticeUploadProgress(0);
      const uploaded = await pickAndUploadContentImage(setNoticeUploadProgress);
      if (uploaded) {
        setNoticeAttachments((current) => (current.some((item) => item.id === uploaded.id) ? current : [...current, uploaded]));
      }
    } catch {
      Alert.alert("이미지 업로드 실패", "이미지 파일을 다시 선택해주세요.");
    } finally {
      setNoticeUploading(false);
    }
  };

  const handleSaveNotice = async () => {
    if (!selectedNoticeBoardId) {
      Alert.alert("공지 확인", "공지 게시판을 선택하세요.");
      return;
    }
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      Alert.alert("공지 확인", "제목과 내용을 입력하세요.");
      return;
    }
    if (noticeForm.show_in_council_activity && !noticeAttachments.some((attachment) => attachment.content_type.startsWith("image/"))) {
      Alert.alert("원우회 활동내역", "활동내역에 표시할 공지에는 사진을 1장 이상 첨부하세요.");
      return;
    }

    const payload = {
      title: noticeForm.title.trim(),
      content: noticeForm.content.trim(),
      category: cleanOptional(noticeForm.category),
      is_anonymous: false,
      attachment_ids: noticeAttachments.map((attachment) => attachment.id),
      metadata: {
        ...noticeMetadata,
        show_in_council_activity: noticeForm.show_in_council_activity,
      },
      deadline_at: cleanNullable(noticeForm.deadline_at),
    };

    try {
      if (editingNoticeId) {
        await postApi.updatePost(editingNoticeId, payload);
        await postApi.setPin(editingNoticeId, noticeForm.is_pinned);
      } else {
        const response = await postApi.createPost(selectedNoticeBoardId, payload);
        if (noticeForm.is_pinned) {
          await postApi.setPin(response.data.id, true);
        }
      }
      resetNoticeForm();
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      Alert.alert("저장 완료", "공지사항이 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "공지사항 입력 정보를 확인하세요.");
    }
  };

  const handlePinNotice = async (item: PostListItem) => {
    try {
      await postApi.setPin(item.id, !item.is_pinned);
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch {
      Alert.alert("처리 실패", "공지 고정 상태를 변경할 수 없습니다.");
    }
  };

  const handleDeleteNotice = (item: PostListItem) => {
    Alert.alert("공지 삭제", "이 공지사항을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await postApi.deletePost(item.id);
            queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
            queryClient.invalidateQueries({ queryKey: ["posts"] });
          } catch {
            Alert.alert("삭제 실패", "공지사항을 삭제할 수 없습니다.");
          }
        },
      },
    ]);
  };

  const updateExecutiveMember = (index: number, patch: Partial<ExecutiveFormMember>) => {
    setExecutiveMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const handleUploadExecutiveImage = async (index: number) => {
    if (executiveUploadingIndex !== null) return;
    try {
      setExecutiveUploadingIndex(index);
      const uploaded = await pickAndUploadContentImage();
      if (uploaded?.url) {
        updateExecutiveMember(index, { image_url: uploaded.url });
      }
    } catch {
      Alert.alert("사진 업로드 실패", "임원진 프로필 이미지를 다시 선택해주세요.");
    } finally {
      setExecutiveUploadingIndex(null);
    }
  };

  const handleSaveExecutives = async () => {
    if (!executivesBoard) {
      Alert.alert("임원진 저장", "gsa-executives 게시판을 찾을 수 없습니다.");
      return;
    }
    const normalized = executiveMembers.map((item) => ({
      name: item.name.trim(),
      cohort: item.cohort.trim(),
      role: item.role.trim(),
      image_url: item.image_url.trim(),
    }));
    if (normalized.length === 0 || normalized.some((item) => !item.name || !item.cohort || !item.role)) {
      Alert.alert("임원진 저장", "모든 임원진의 이름, 기수, 직책을 입력하세요.");
      return;
    }
    try {
      setExecutivesSaving(true);
      await boardApi.updateAdminBoard(executivesBoard.id, {
        metadata: {
          ...(executivesBoard.metadata ?? {}),
          executives: normalized,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-boards"] }),
        queryClient.invalidateQueries({ queryKey: ["boards"] }),
      ]);
      Alert.alert("저장 완료", "원우회 임원진 소개가 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "임원진 소개를 저장할 수 없습니다.");
    } finally {
      setExecutivesSaving(false);
    }
  };

  const updateCohortLeader = (index: number, patch: Partial<CohortLeaderForm>) => {
    setCohortLeaders((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const handleUploadCohortLeaderImage = async (index: number, field: CohortLeaderImageField) => {
    if (cohortLeaderUploading) return;
    try {
      setCohortLeaderUploading({ index, field });
      const uploaded = await pickAndUploadContentImage();
      if (uploaded?.url) updateCohortLeader(index, { [field]: uploaded.url });
    } catch {
      Alert.alert("사진 업로드 실패", "기장단 이미지를 다시 선택해주세요.");
    } finally {
      setCohortLeaderUploading(null);
    }
  };

  const handleSaveCohortLeaders = async () => {
    if (!cohortLeadersBoard) {
      Alert.alert("기장단 저장", "gsa-cohort-leaders 게시판을 찾을 수 없습니다.");
      return;
    }
    const normalized = cohortLeaders.map((item) => ({
      cohort: item.cohort.trim().replace(/기$/, ""),
      captain_name: item.captain_name.trim(),
      vice_captain_name: item.vice_captain_name.trim(),
      greeting: item.greeting.trim(),
      intro: item.intro.trim(),
      banner_image_url: item.banner_image_url.trim(),
      captain_image_url: item.captain_image_url.trim(),
      vice_captain_image_url: item.vice_captain_image_url.trim(),
    }));
    if (normalized.length === 0 || normalized.some((item) => !item.cohort || !item.captain_name || !item.intro)) {
      Alert.alert("기장단 저장", "각 기수의 기수, 기장 이름, 소개글을 입력하세요.");
      return;
    }
    try {
      setCohortLeadersSaving(true);
      await boardApi.updateAdminBoard(cohortLeadersBoard.id, {
        metadata: { ...(cohortLeadersBoard.metadata ?? {}), cohort_leaders: normalized },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-boards"] }),
        queryClient.invalidateQueries({ queryKey: ["boards"] }),
      ]);
      Alert.alert("저장 완료", "기수별 기장단 소개가 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "기장단 소개를 저장할 수 없습니다.");
    } finally {
      setCohortLeadersSaving(false);
    }
  };

  const updatePastCouncil = (index: number, patch: Partial<PastCouncilForm>) => {
    setPastCouncils((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };
  const handleUploadPastCouncilImage = async (index: number, field: PastCouncilImageField) => {
    if (pastCouncilUploading) return;
    try {
      setPastCouncilUploading({ index, field });
      const uploaded = await pickAndUploadContentImage();
      if (uploaded?.url) updatePastCouncil(index, { [field]: uploaded.url });
    } catch {
      Alert.alert("사진 업로드 실패", "역대 원우회 이미지를 다시 선택해주세요.");
    } finally {
      setPastCouncilUploading(null);
    }
  };
  const handleSavePastCouncils = async () => {
    if (!pastCouncilsBoard) {
      Alert.alert("역대 원우회 저장", "gsa-past-councils 게시판을 찾을 수 없습니다.");
      return;
    }
    const normalized = pastCouncils.map((item) => ({
      cohort: item.cohort.trim().replace(/기$/, ""), president_name: item.president_name.trim(), president_cohort: item.president_cohort.trim().replace(/기$/, ""),
      vice_president_name: item.vice_president_name.trim(), vice_president_cohort: item.vice_president_cohort.trim().replace(/기$/, ""), intro: item.intro.trim(),
      activities: item.activities_text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), banner_image_url: item.banner_image_url.trim(),
      president_image_url: item.president_image_url.trim(), vice_president_image_url: item.vice_president_image_url.trim(),
    }));
    if (normalized.length === 0 || normalized.some((item) => !item.cohort || !item.president_name)) {
      Alert.alert("역대 원우회 저장", "각 원우회의 대수와 회장 이름을 입력하세요.");
      return;
    }
    try {
      setPastCouncilsSaving(true);
      await boardApi.updateAdminBoard(pastCouncilsBoard.id, { metadata: { ...(pastCouncilsBoard.metadata ?? {}), past_councils: normalized } });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-boards"] }), queryClient.invalidateQueries({ queryKey: ["boards"] })]);
      Alert.alert("저장 완료", "역대 원우회 정보가 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "역대 원우회 정보를 저장할 수 없습니다.");
    } finally {
      setPastCouncilsSaving(false);
    }
  };

  const handlePinAdminPost = async (item: PostListItem) => {
    try {
      await postApi.setPin(item.id, !item.is_pinned);
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch {
      Alert.alert("처리 실패", "게시글 고정 상태를 변경할 수 없습니다.");
    }
  };

  const handleDeleteAdminPost = (item: PostListItem) => {
    Alert.alert("게시글 삭제", "이 게시글을 삭제할까요? 삭제 후 사용자 화면에서 보이지 않습니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await postApi.deletePost(item.id);
            queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
            queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
            queryClient.invalidateQueries({ queryKey: ["posts"] });
          } catch {
            Alert.alert("삭제 실패", "게시글을 삭제할 수 없습니다.");
          }
        },
      },
    ]);
  };

  const handleReportStatus = async (report: AdminReportItem, status: ReportStatus) => {
    try {
      await reportApi.updateAdminReport(report.id, { status });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    } catch {
      Alert.alert("처리 실패", "신고 상태를 변경할 수 없습니다.");
    }
  };

  const handleDeleteTarget = (report: AdminReportItem) => {
    const targetLabel = report.target_type === "post" ? "게시글" : "댓글";
    Alert.alert(`${targetLabel} 삭제`, `신고된 ${targetLabel}을 삭제하고 처리 완료로 표시할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            if (report.target_type === "post") {
              await postApi.deletePost(report.target.post_id ?? report.target_id);
            } else {
              await commentApi.deleteComment(report.target_id);
            }
            await reportApi.updateAdminReport(report.id, { status: "resolved" });
            queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            Alert.alert("처리 완료", `${targetLabel}을 삭제했습니다.`);
          } catch {
            Alert.alert("삭제 실패", `신고된 ${targetLabel}을 삭제할 수 없습니다.`);
          }
        },
      },
    ]);
  };

  const handleUserRoleToggle = (item: AdminUserItem) => {
    const nextRole = item.role === "admin" ? "user" : "admin";
    Alert.alert("권한 변경", `${item.nickname}님을 ${USER_ROLE_LABELS[nextRole]} 권한으로 변경할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "변경",
        onPress: async () => {
          try {
            await adminApi.updateUser(item.id, { role: nextRole });
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          } catch {
            Alert.alert("변경 실패", "회원 권한을 변경할 수 없습니다.");
          }
        },
      },
    ]);
  };

  const handleUserActiveToggle = (item: AdminUserItem) => {
    const nextActive = !item.is_active;
    Alert.alert("회원 상태 변경", `${item.nickname}님 계정을 ${nextActive ? "복구" : "비활성화"}할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: nextActive ? "복구" : "비활성화",
        style: nextActive ? "default" : "destructive",
        onPress: async () => {
          try {
            await adminApi.updateUser(item.id, { is_active: nextActive });
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          } catch {
            Alert.alert("변경 실패", "회원 상태를 변경할 수 없습니다.");
          }
        },
      },
    ]);
  };

  const handleUserEligibilityChange = async (
    item: AdminUserItem,
    payload: Partial<Pick<AdminUserItem, "enrollment_status" | "dues_status">>
  ) => {
    try {
      await adminApi.updateUser(item.id, payload);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      Alert.alert("변경 실패", "회원의 재학·회비 상태를 변경할 수 없습니다.");
    }
  };

  const resetFAQForm = () => {
    setEditingFAQId(null);
    setFAQForm(emptyFAQ);
  };

  const handleEditFAQ = (item: FAQItem) => {
    setEditingFAQId(item.id);
    setFAQForm({
      question: item.question,
      answer: item.answer,
      category: item.category ?? "general",
      sort_order: String(item.sort_order ?? 0),
    });
  };

  const handleSaveFAQ = async () => {
    const question = faqForm.question.trim();
    const answer = faqForm.answer.trim();
    if (!question || !answer) {
      Alert.alert("FAQ 확인", "질문과 답변을 입력하세요.");
      return;
    }

    const payload = {
      question,
      answer,
      category: faqForm.category.trim() || undefined,
      sort_order: parseSort(faqForm.sort_order),
      is_active: true,
    };

    try {
      if (editingFAQId) {
        await faqApi.updateFAQ(editingFAQId, payload);
      } else {
        await faqApi.createFAQ(payload);
      }
      resetFAQForm();
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      Alert.alert("저장 완료", "FAQ가 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "FAQ 입력 정보를 확인하세요.");
    }
  };

  const handleDeleteFAQ = (item: FAQItem) => {
    Alert.alert("FAQ 숨김", "이 FAQ를 사용자 화면에서 숨길까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "숨김",
        style: "destructive",
        onPress: async () => {
          try {
            await faqApi.deleteFAQ(item.id);
            queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
            queryClient.invalidateQueries({ queryKey: ["faqs"] });
          } catch {
            Alert.alert("처리 실패", "FAQ를 숨길 수 없습니다.");
          }
        },
      },
    ]);
  };

  const onSubmitEvent = async (values: EventForm) => {
    const eventUpdateId = editEventQuery.data?.data?.id ?? null;
    if (editEventId && !eventUpdateId) {
      Alert.alert("일정 확인", "이미 삭제되었거나 없는 일정입니다. 목록에서 다시 선택해주세요.");
      setSection("events");
      reset(emptyEvent);
      router.replace({ pathname: "/admin", params: { section: "events" } } as never);
      return;
    }

    const startDate = new Date(values.start_at);
    const endDate = values.end_at ? new Date(values.end_at) : null;
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      Alert.alert("일정 시간 확인", "날짜를 선택하고 시간은 HH:mm 형식으로 입력해주세요.");
      return;
    }

    const payload = {
      title: values.title,
      category: values.category,
      start_at: startDate.toISOString(),
      end_at: endDate ? endDate.toISOString() : undefined,
      location: cleanOptional(values.location ?? ""),
      description: cleanOptional(values.description ?? ""),
    };

    try {
      if (eventUpdateId) {
        await eventApi.updateEvent(eventUpdateId, payload);
        router.replace({ pathname: "/admin", params: { section: "events" } } as never);
      } else {
        await eventApi.createEvent(payload);
      }
      reset(emptyEvent);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("저장 완료", "일정이 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "일정 입력 정보를 확인하세요.");
    }
  };

  const handleEditEvent = (event: EventItem) => {
    setSection("events");
    router.push({ pathname: "/admin", params: { editEventId: String(event.id) } } as never);
  };

  const deleteEventFromList = async (event: EventItem) => {
    try {
      await eventApi.deleteEvent(event.id);
      if (editEventId === event.id) {
        reset(emptyEvent);
        router.replace({ pathname: "/admin", params: { section: "events" } } as never);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("삭제 완료", "일정이 삭제되었습니다.");
    } catch {
      Alert.alert("삭제 실패", "이미 삭제되었거나 일정을 삭제할 수 없습니다.");
    }
  };

  const handleDeleteEventFromList = (event: EventItem) => {
    if (Platform.OS === "web") {
      const ok = window.confirm(`"${event.title}" 일정을 삭제할까요?`);
      if (ok) {
        void deleteEventFromList(event);
      }
      return;
    }

    Alert.alert("일정 삭제", `"${event.title}" 일정을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => void deleteEventFromList(event),
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ gap: 14 }}>
        <BackButton fallback="/(tabs)/settings" />
        <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.primary700, backgroundColor: COLORS.primary900, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary100} />
            <Text style={{ color: COLORS.primary100, fontSize: 12, fontWeight: "800", letterSpacing: 0 }}>AI·SW APP</Text>
          </View>
          <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", marginTop: 8 }}>관리자 페이지</Text>
          <Text style={{ color: "#D5E0FE", lineHeight: 20, marginTop: 6 }}>
            배너, 공지사항, 원우회 페이지, 게시글과 운영 콘텐츠를 한곳에서 관리합니다.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {SECTIONS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setSection(item.key)}
              style={{
                minWidth: 92,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                borderRadius: RADIUS.button,
                borderWidth: 1,
                borderColor: section === item.key ? COLORS.primary : COLORS.borderStrong,
                backgroundColor: section === item.key ? COLORS.primary50 : COLORS.surface,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons name={item.icon} size={17} color={section === item.key ? COLORS.primary : COLORS.muted} />
              <Text style={{ color: section === item.key ? COLORS.primary : COLORS.text, fontWeight: "900" }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {section === "dashboard" ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>운영 바로가기</Text>
            <ShortcutCard
              icon="albums-outline"
              title="배너 등록 · 미리보기"
              description="홈 화면에 노출되는 배너 이미지를 등록하고 모바일 미리보기를 확인합니다."
              meta={`노출 ${activeBannerCount}개 / 전체 ${banners.length}개`}
              onPress={() => openAdminSection("banners")}
            />
            <ShortcutCard
              icon="megaphone-outline"
              title="공지사항 등록"
              description="학사공지, 행사공지 등 관리자 전용 공지 게시판에 새 공지를 작성합니다."
              meta={`${noticeBoards.length}개 공지 게시판 관리`}
              onPress={() => openAdminSection("notices")}
            />
            <ShortcutCard
              icon="people-circle-outline"
              title="원우회 페이지 관리"
              description="원우회 임원진, 활동내역, 회계장부, FAQ 같은 원우회 메뉴 게시판을 관리합니다."
              meta={`${councilBoardCount}개 원우회 게시판 설정`}
              onPress={() => openAdminSection("boards", "council")}
            />
            <ShortcutCard
              icon="ribbon-outline"
              title="기수별 기장단 등록"
              description="기장·부기장 이름, 소개글과 대표·프로필 이미지를 관리자 전용으로 등록합니다."
              meta={`${cohortLeaders.length}개 기수 등록`}
              onPress={() => openAdminSection("cohortLeaders")}
            />
            <ShortcutCard
              icon="time-outline"
              title="역대 원우회 관리"
              description="역대 원우회 임원진, 소개와 활동내역을 별도 관리합니다."
              meta={`${pastCouncils.length}개 원우회 등록`}
              onPress={() => openAdminSection("pastCouncils")}
            />
            <ShortcutCard
              icon="document-text-outline"
              title="전체 게시글 관리"
              description="전체 게시글을 검색하고 고정, 수정, 삭제 같은 운영 작업을 처리합니다."
              meta={`${adminPostTotal}개 게시글 조회`}
              onPress={() => openAdminSection("posts")}
            />
            <ShortcutCard
              icon="flower-outline"
              title="상조회 신청 처리"
              description="신청 내용과 비공개 증빙서류를 확인하고 처리 완료 또는 반려로 변경합니다."
              meta={`처리 대기 ${processingMutualAidCount}건`}
              onPress={() => openAdminSection("mutualAid")}
            />
            <ShortcutCard
              icon="chatbox-ellipses-outline"
              title="건의사항 답변"
              description="익명 건의사항을 확인하고 원우회 공식 답변을 등록합니다."
              meta={`답변 대기 ${pendingSuggestionCount}건`}
              onPress={() => openAdminSection("suggestions")}
            />
            <ShortcutCard
              icon="people-outline"
              title="동아리 게시글 등록"
              description="대표 사진과 가입 신청 링크를 포함한 동아리 소개 글을 등록합니다."
              meta={clubPromoBoard ? "관리자 전용 게시판" : "동아리 게시판 확인 필요"}
              onPress={() => {
                if (clubPromoBoard) {
                  router.push({ pathname: "/board/post/create", params: { boardId: String(clubPromoBoard.id) } } as never);
                }
              }}
            />
            <ShortcutCard
              icon="git-network-outline"
              title="네트워킹 게시글 등록"
              description="대표 사진과 참가 신청 링크를 포함한 네트워킹 안내 글을 등록합니다."
              meta={networkingProgramsBoard ? "관리자 전용 게시판" : "네트워킹 게시판 확인 필요"}
              onPress={() => {
                if (networkingProgramsBoard) {
                  router.push({ pathname: "/board/post/create", params: { boardId: String(networkingProgramsBoard.id) } } as never);
                }
              }}
            />
            <ShortcutCard
              icon="notifications-outline"
              title="D-day 알림 실행"
              description="오늘과 내일 일정을 확인해 중복 없이 D-day/D-1 알림을 생성합니다."
              meta="스케줄러 수동 실행"
              onPress={() => void dispatchEventReminders()}
            />
            <ShortcutCard
              icon="cloud-done-outline"
              title="푸시 전송 결과 확인"
              description="Expo Push 영수증을 동기화하고 만료된 기기 토큰을 비활성화합니다."
              meta={`전송 실패 ${stats?.push_failed ?? 0}건`}
              onPress={() => void syncPushReceipts()}
            />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <MetricCard label="전체 회원" value={stats?.users_total ?? users.length} hint={`최근 30일 ${stats?.users_active_30d ?? 0}명`} />
              <MetricCard label="전체 게시글" value={stats?.posts ?? adminPostTotal} hint={`공지 ${stats?.notices ?? 0}개`} />
              <MetricCard label="전체 댓글" value={stats?.comments ?? 0} hint="삭제 제외 운영 지표" />
              <MetricCard label="미처리 신고" value={stats?.open_reports ?? 0} hint={`푸시 실패 ${stats?.push_failed ?? 0}건`} />
            </View>

            <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900", marginTop: 4 }}>최근 운영 기록</Text>
            {auditLogsQuery.isLoading ? <ActivityIndicator /> : null}
            {!auditLogsQuery.isLoading && auditLogs.length === 0 ? (
              <Panel><Text style={{ color: COLORS.muted }}>아직 기록된 관리자 작업이 없습니다.</Text></Panel>
            ) : null}
            {auditLogs.map((item) => (
              <Panel key={item.id}>
                <View style={{ gap: 5 }}>
                  <Text style={{ color: COLORS.text, fontWeight: "900" }}>{item.action}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 13 }}>
                    {item.actor_nickname} · {item.target_type}{item.target_id ? ` #${item.target_id}` : ""}
                  </Text>
                  <Text style={{ color: COLORS.subtle, fontSize: 12 }}>{formatDate(item.created_at)}</Text>
                </View>
              </Panel>
            ))}

            <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900", marginTop: 4 }}>최근 게시글</Text>
            {adminPostsQuery.isLoading ? <ActivityIndicator /> : null}
            {!adminPostsQuery.isLoading && adminPosts.length === 0 ? (
              <Panel>
                <Text style={{ color: COLORS.muted }}>표시할 게시글이 없습니다.</Text>
              </Panel>
            ) : null}
            {adminPosts.slice(0, 5).map((item) => (
              <AdminPostCard key={item.id} item={item} onPinToggle={handlePinAdminPost} onDelete={handleDeleteAdminPost} />
            ))}
          </View>
        ) : null}

        {section === "banners" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>배너 작업 선택</Text>
                    <Text style={{ color: COLORS.muted, lineHeight: 20, marginTop: 4 }}>
                      {editingBannerId
                        ? `${selectedBannerPosition ?? "-"}번째 배너를 수정 중입니다.`
                        : `${nextBannerPosition}번째 배너를 새로 등록합니다.`}
                    </Text>
                  </View>
                  <ActionButton icon="add-outline" label="신규 배너" onPress={resetBannerForm} tone={editingBannerId ? "outline" : "primary"} />
                </View>
                <Text style={{ color: COLORS.subtle, fontSize: 12, fontWeight: "800" }}>
                  순서 숫자가 낮을수록 홈에서 먼저 보입니다. 같은 순서는 등록 ID 순서로 정렬됩니다.
                </Text>
                {sortedBanners.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                    {sortedBanners.map((item, index) => {
                      const selected = editingBannerId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => handleEditBanner(item)}
                          style={{
                            width: 178,
                            borderRadius: RADIUS.card,
                            borderWidth: 1,
                            borderColor: selected ? COLORS.primary : COLORS.border,
                            backgroundColor: selected ? COLORS.primary50 : COLORS.surfaceAlt,
                            padding: 12,
                            gap: 7,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <Text style={{ color: selected ? COLORS.primary : COLORS.text, fontSize: 13, fontWeight: "900" }}>
                              {index + 1}번째 배너
                            </Text>
                            <StatusText active={item.is_active} />
                          </View>
                          <Text style={{ color: COLORS.text, fontWeight: "900" }} numberOfLines={1}>
                            {item.title || "이미지 배너"}
                          </Text>
                          <Text style={{ color: COLORS.muted, fontSize: 12 }} numberOfLines={1}>
                            순서 {item.sort_order ?? 0} · {item.theme}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={{ color: COLORS.muted }}>등록된 배너가 없습니다. 신규 배너를 먼저 등록하세요.</Text>
                )}
              </View>
            </Panel>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>
                  {editingBannerId ? `${selectedBannerPosition ?? "-"}번째 배너 수정` : `${nextBannerPosition}번째 홈 배너 등록`}
                </Text>
                {bannerSaveMessage ? (
                  <View
                    style={{
                      borderRadius: RADIUS.button,
                      borderWidth: 1,
                      borderColor:
                        bannerSaveMessage.tone === "success"
                          ? "#B9E5C8"
                          : bannerSaveMessage.tone === "error"
                            ? "#F7B8B8"
                            : COLORS.primary100,
                      backgroundColor:
                        bannerSaveMessage.tone === "success"
                          ? "#EAF7EF"
                          : bannerSaveMessage.tone === "error"
                            ? "#FDECEC"
                            : COLORS.primary50,
                      padding: 10,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          bannerSaveMessage.tone === "success"
                            ? COLORS.success
                            : bannerSaveMessage.tone === "error"
                              ? COLORS.error
                              : COLORS.primary,
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      {bannerSaveMessage.text}
                    </Text>
                  </View>
                ) : null}
                <Field value={bannerForm.title} onChangeText={(value) => setBannerForm((current) => ({ ...current, title: value }))} placeholder="배너 제목" />
                <Field value={bannerForm.subtitle} onChangeText={(value) => setBannerForm((current) => ({ ...current, subtitle: value }))} placeholder="설명" multiline />
                <Field value={bannerForm.badge_text} onChangeText={(value) => setBannerForm((current) => ({ ...current, badge_text: value }))} placeholder="배지 문구" />
                <View style={{ gap: 6 }}>
                  <Text style={{ color: COLORS.text, fontWeight: "900" }}>노출 및 마감 일정</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>형식: 2026-07-31T18:00</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Field value={bannerForm.starts_at} onChangeText={(value) => setBannerForm((current) => ({ ...current, starts_at: value }))} placeholder="노출 시작" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field value={bannerForm.ends_at} onChangeText={(value) => setBannerForm((current) => ({ ...current, ends_at: value }))} placeholder="노출 종료" />
                    </View>
                  </View>
                  <Field value={bannerForm.deadline_at} onChangeText={(value) => setBannerForm((current) => ({ ...current, deadline_at: value }))} placeholder="배너 대상 마감일" />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field value={bannerForm.cta_label} onChangeText={(value) => setBannerForm((current) => ({ ...current, cta_label: value }))} placeholder="버튼 문구" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field value={bannerForm.cta_href} onChangeText={(value) => setBannerForm((current) => ({ ...current, cta_href: value }))} placeholder="링크 예: /faq" />
                  </View>
                </View>
                <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: "900" }}>공지글 연결</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>게시글을 선택하면 배너 링크가 자동 입력됩니다.</Text>
                    </View>
                    {bannerForm.cta_href ? <Chip active label={bannerForm.cta_href} tone="primary" /> : null}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                    {noticeBoards.map((board) => (
                      <Chip
                        key={board.id}
                        active={selectedNoticeBoardId === board.id}
                        label={board.name}
                        onPress={() => setSelectedNoticeBoardId(board.id)}
                      />
                    ))}
                  </ScrollView>
                  {noticePostsQuery.isLoading ? <ActivityIndicator /> : null}
                  {!noticePostsQuery.isLoading && noticePosts.length === 0 ? (
                    <Text style={{ color: COLORS.muted, fontSize: 13 }}>선택한 공지 게시판에 게시글이 없습니다.</Text>
                  ) : null}
                  <View style={{ gap: 8 }}>
                    {noticePosts.slice(0, 6).map((item) => {
                      const href = `/board/post/${item.id}`;
                      const selected = bannerForm.cta_href === href;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setBannerForm((current) => ({ ...current, cta_href: href }))}
                          style={{
                            borderRadius: RADIUS.button,
                            borderWidth: 1,
                            borderColor: selected ? COLORS.primary : COLORS.border,
                            backgroundColor: selected ? COLORS.primary50 : COLORS.surface,
                            padding: 10,
                            gap: 4,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons name={selected ? "checkmark-circle" : "document-text-outline"} size={16} color={selected ? COLORS.primary : COLORS.muted} />
                            <Text style={{ flex: 1, color: selected ? COLORS.primary : COLORS.text, fontWeight: "900" }} numberOfLines={1}>
                              {item.title}
                            </Text>
                          </View>
                          <Text style={{ color: COLORS.muted, fontSize: 12 }} numberOfLines={1}>
                            {selectedNoticeBoard?.name ?? item.board_name ?? "공지"} · {formatDate(item.created_at)} · {href}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  {BANNER_IMAGE_SLOTS.map((slot) => {
                    const field = `${slot.key}_image_url` as keyof Pick<
                      BannerForm,
                      "mobile_image_url" | "tablet_image_url" | "desktop_image_url"
                    >;
                    return (
                      <BannerImageControl
                        key={slot.key}
                        label={slot.label}
                        hint={slot.hint}
                        value={bannerForm[field]}
                        uploading={bannerUploadSlot === slot.key}
                        onUpload={() => handleUploadBannerImage(slot.key)}
                        onChangeText={(value) => setBannerForm((current) => ({ ...current, [field]: value }))}
                      />
                    );
                  })}
                </View>
                <BannerPreview form={bannerForm} index={previewBannerPosition - 1} total={previewBannerTotal} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["none", "navy", "blue", "cyan", "purple"] as const).map((theme) => (
                    <Chip key={theme} active={bannerForm.theme === theme} label={theme} onPress={() => setBannerForm((current) => ({ ...current, theme }))} />
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field value={bannerForm.sort_order} onChangeText={(value) => setBannerForm((current) => ({ ...current, sort_order: value }))} placeholder="순서" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label={bannerForm.is_active ? "홈에 표시" : "홈에서 숨김"}
                      icon={bannerForm.is_active ? "eye-outline" : "eye-off-outline"}
                      onPress={() => setBannerForm((current) => ({ ...current, is_active: !current.is_active }))}
                      tone={bannerForm.is_active ? "primary" : "muted"}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      icon="save-outline"
                      label={bannerSaving ? "저장 중" : editingBannerId ? "배너 저장" : "배너 등록"}
                      onPress={handleSaveBanner}
                      disabled={bannerSaving}
                    />
                  </View>
                  {editingBannerId ? (
                    <View style={{ flex: 1 }}>
                      <ActionButton label="취소" onPress={resetBannerForm} tone="outline" />
                    </View>
                  ) : null}
                </View>
              </View>
            </Panel>
            {bannersQuery.isLoading ? <ActivityIndicator /> : null}
            {sortedBanners.map((item, index) => (
              <BannerCard
                key={item.id}
                item={item}
                position={index + 1}
                selected={editingBannerId === item.id}
                onEdit={handleEditBanner}
                onHide={handleHideBanner}
              />
            ))}
          </View>
        ) : null}

        {section === "notices" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>
                  {editingNoticeId ? "공지사항 수정" : "공지사항 등록"}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {noticeBoards.map((board) => (
                    <Chip
                      key={board.id}
                      active={selectedNoticeBoardId === board.id}
                      label={board.name}
                      onPress={() => setSelectedNoticeBoardId(board.id)}
                    />
                  ))}
                </ScrollView>
                <Field value={noticeForm.title} onChangeText={(value) => setNoticeForm((current) => ({ ...current, title: value }))} placeholder="공지 제목" />
                <Field value={noticeForm.content} onChangeText={(value) => setNoticeForm((current) => ({ ...current, content: value }))} placeholder="공지 내용" multiline />
                <View style={{ gap: 6 }}>
                  <Text style={{ color: COLORS.text, fontWeight: "900" }}>신청·접수 마감</Text>
                  <Field value={noticeForm.deadline_at} onChangeText={(value) => setNoticeForm((current) => ({ ...current, deadline_at: value }))} placeholder="2026-07-31T18:00 (선택)" />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ color: COLORS.text, fontWeight: "900" }}>분류</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {NOTICE_CATEGORY_OPTIONS.map((option) => (
                      <Chip
                        key={option.value}
                        active={noticeForm.category === option.value}
                        label={option.label}
                        onPress={() => setNoticeForm((current) => ({ ...current, category: option.value }))}
                      />
                    ))}
                  </View>
                </View>
                <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: "900" }}>공지 이미지</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>
                        본문에 함께 표시할 이미지를 첨부합니다.
                      </Text>
                    </View>
                    <ActionButton
                      icon="image-outline"
                      label={noticeUploading ? `업로드 ${noticeUploadProgress || 0}%` : "이미지 첨부"}
                      onPress={handleUploadNoticeImage}
                      tone={noticeAttachments.length > 0 ? "outline" : "primary"}
                      disabled={noticeUploading}
                    />
                  </View>
                  {noticeAttachments.length === 0 ? (
                    <Text style={{ color: COLORS.muted, fontSize: 13 }}>아직 첨부된 이미지가 없습니다.</Text>
                  ) : null}
                  {noticeAttachments.map((attachment) => {
                    const url = mediaUrl(attachment.url);
                    const isImage = attachment.content_type?.startsWith("image/");
                    return (
                      <View
                        key={attachment.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: RADIUS.button,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          backgroundColor: COLORS.surface,
                          padding: 10,
                        }}
                      >
                        {isImage && url ? (
                          <MediaImage media={attachment} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.primary50 }} />
                        ) : (
                          <View style={{ width: 56, height: 56, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary50 }}>
                            <Ionicons name="document-attach-outline" size={22} color={COLORS.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: COLORS.text, fontWeight: "900" }} numberOfLines={1}>
                            {attachment.original_filename}
                          </Text>
                          <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>
                            {Math.ceil((attachment.file_size ?? 0) / 1024)} KB
                          </Text>
                        </View>
                        <Pressable hitSlop={8} onPress={() => setNoticeAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                          <Ionicons name="close-circle" size={22} color={COLORS.subtle} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: noticeForm.show_in_council_activity ? COLORS.primary : COLORS.border, backgroundColor: noticeForm.show_in_council_activity ? COLORS.primary50 : COLORS.surfaceAlt, padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: "900" }}>원우회 활동내역 연동</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>
                        이 공지의 사진과 본문을 원우회 활동내역 목록·상세에도 표시합니다.
                      </Text>
                    </View>
                    <ActionButton
                      icon={noticeForm.show_in_council_activity ? "checkmark-circle" : "ellipse-outline"}
                      label={noticeForm.show_in_council_activity ? "연동함" : "연동 안 함"}
                      onPress={() => setNoticeForm((current) => ({ ...current, show_in_council_activity: !current.show_in_council_activity }))}
                      tone={noticeForm.show_in_council_activity ? "primary" : "outline"}
                    />
                  </View>
                  {noticeForm.show_in_council_activity && noticeAttachments.length === 0 ? (
                    <Text style={{ color: "#B45309", fontSize: 12, fontWeight: "800" }}>연동하려면 공지 이미지를 1장 이상 첨부해야 합니다.</Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label={noticeForm.is_pinned ? "상단 고정" : "일반 공지"}
                      icon="pin-outline"
                      onPress={() => setNoticeForm((current) => ({ ...current, is_pinned: !current.is_pinned }))}
                      tone={noticeForm.is_pinned ? "primary" : "outline"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ActionButton icon="save-outline" label={editingNoticeId ? "공지 저장" : "공지 등록"} onPress={handleSaveNotice} />
                  </View>
                </View>
                {editingNoticeId ? <ActionButton label="수정 취소" onPress={resetNoticeForm} tone="outline" /> : null}
              </View>
            </Panel>
            <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>
              {selectedNoticeBoard?.name ?? "공지 게시판"} 목록
            </Text>
            {noticePostsQuery.isLoading ? <ActivityIndicator /> : null}
            {!noticePostsQuery.isLoading && noticePosts.length === 0 ? (
              <Panel>
                <Text style={{ color: COLORS.muted }}>표시할 공지사항이 없습니다.</Text>
              </Panel>
            ) : null}
            {noticePosts.map((item) => (
              <NoticeCard key={item.id} item={item} onEdit={handleEditNotice} onPinToggle={handlePinNotice} onDelete={handleDeleteNotice} />
            ))}
          </View>
        ) : null}

        {section === "boards" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>
                  {editingBoardId ? "게시판 수정" : "게시판 등록"}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field value={boardForm.name} onChangeText={(value) => setBoardForm((current) => ({ ...current, name: value }))} placeholder="게시판 이름" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field value={boardForm.slug} onChangeText={(value) => setBoardForm((current) => ({ ...current, slug: value }))} placeholder="slug" editable={!editingBoardId} />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field value={boardForm.category} onChangeText={(value) => setBoardForm((current) => ({ ...current, category: value }))} placeholder="카테고리" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field value={boardForm.sort_order} onChangeText={(value) => setBoardForm((current) => ({ ...current, sort_order: value }))} placeholder="순서" />
                  </View>
                </View>
                <Field value={boardForm.description} onChangeText={(value) => setBoardForm((current) => ({ ...current, description: value }))} placeholder="설명" multiline />
                <Text style={{ color: COLORS.muted, fontWeight: "800" }}>게시판 유형</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(BOARD_TYPE_LABELS).map(([value, label]) => (
                    <Chip key={value} active={boardForm.board_type === value} label={label} onPress={() => setBoardForm((current) => ({ ...current, board_type: value }))} />
                  ))}
                </View>
                <Text style={{ color: COLORS.muted, fontWeight: "800" }}>권한</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["user", "admin"] as const).map((permission) => (
                    <Chip key={`read-${permission}`} active={boardForm.read_permission === permission} label={`읽기 ${permission}`} onPress={() => setBoardForm((current) => ({ ...current, read_permission: permission }))} />
                  ))}
                  {(["user", "admin"] as const).map((permission) => (
                    <Chip key={`write-${permission}`} active={boardForm.write_permission === permission} label={`쓰기 ${permission}`} onPress={() => setBoardForm((current) => ({ ...current, write_permission: permission }))} />
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label={boardForm.allow_anonymous ? "익명 허용" : "실명 게시"}
                      onPress={() => setBoardForm((current) => ({ ...current, allow_anonymous: !current.allow_anonymous }))}
                      tone={boardForm.allow_anonymous ? "primary" : "outline"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label={boardForm.is_active ? "활성" : "숨김"}
                      onPress={() => setBoardForm((current) => ({ ...current, is_active: !current.is_active }))}
                      tone={boardForm.is_active ? "primary" : "muted"}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ActionButton icon="save-outline" label={editingBoardId ? "게시판 저장" : "게시판 등록"} onPress={handleSaveBoard} />
                  </View>
                  {editingBoardId ? (
                    <View style={{ flex: 1 }}>
                      <ActionButton label="취소" onPress={resetBoardForm} tone="outline" />
                    </View>
                  ) : null}
                </View>
              </View>
            </Panel>
            {boardsQuery.isLoading ? <ActivityIndicator /> : null}
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>게시판 설정 범위</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  공지사항, 원우회, 참여활동, 커뮤니티/자료 게시판을 묶음별로 확인하고 권한과 노출 상태를 조정합니다.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                  {BOARD_SCOPE_FILTERS.map((item) => (
                    <Chip
                      key={item.key}
                      active={boardScope === item.key}
                      label={item.label}
                      onPress={() => setBoardScope(item.key)}
                    />
                  ))}
                </ScrollView>
              </View>
            </Panel>
            {!boardsQuery.isLoading && visibleBoards.length === 0 ? (
              <Panel>
                <Text style={{ color: COLORS.muted }}>표시할 게시판이 없습니다.</Text>
              </Panel>
            ) : null}
            {visibleBoards.map((item) => (
              <BoardCard key={item.id} item={item} onEdit={handleEditBoard} />
            ))}
          </View>
        ) : null}

        {section === "executives" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>원우회 임원진 소개 관리</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  이름, 기수, 직책과 프로필 이미지를 등록하면 원우회 임원진 소개 화면에 바로 반영됩니다.
                </Text>
              </View>
            </Panel>
            {!executivesBoard ? (
              <Panel>
                <Text style={{ color: COLORS.error, fontWeight: "800" }}>gsa-executives 게시판을 찾을 수 없습니다.</Text>
              </Panel>
            ) : null}
            {executiveMembers.map((member, index) => {
              const previewUrl = mediaUrl(member.image_url);
              return (
                <Panel key={`executive-${index}`}>
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      {previewUrl ? (
                        <MediaImage media={{ url: member.image_url }} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary50 }} />
                      ) : (
                        <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary50 }}>
                          <Ionicons name="person" size={30} color={COLORS.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 8 }}>
                        <ActionButton
                          icon="image-outline"
                          label={executiveUploadingIndex === index ? "업로드 중" : "프로필 사진"}
                          onPress={() => void handleUploadExecutiveImage(index)}
                          disabled={executiveUploadingIndex !== null}
                          tone="outline"
                        />
                        {member.image_url ? (
                          <ActionButton label="사진 삭제" onPress={() => updateExecutiveMember(index, { image_url: "" })} tone="danger" />
                        ) : null}
                      </View>
                    </View>
                    <Field value={member.name} onChangeText={(value) => updateExecutiveMember(index, { name: value })} placeholder="이름" />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Field value={member.cohort} onChangeText={(value) => updateExecutiveMember(index, { cohort: value })} placeholder="기수 예: 72기" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field value={member.role} onChangeText={(value) => updateExecutiveMember(index, { role: value })} placeholder="직책" />
                      </View>
                    </View>
                    <ActionButton
                      icon="trash-outline"
                      label="임원 삭제"
                      onPress={() => setExecutiveMembers((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      tone="danger"
                    />
                  </View>
                </Panel>
              );
            })}
            <Panel>
              <View style={{ gap: 8 }}>
                <ActionButton
                  icon="person-add-outline"
                  label="임원 추가"
                  onPress={() => setExecutiveMembers((current) => [...current, { ...emptyExecutiveMember }])}
                  tone="outline"
                />
                <ActionButton
                  icon="save-outline"
                  label={executivesSaving ? "저장 중" : "임원진 소개 저장"}
                  onPress={() => void handleSaveExecutives()}
                  disabled={executivesSaving || executiveUploadingIndex !== null || !executivesBoard}
                />
              </View>
            </Panel>
          </View>
        ) : null}

        {section === "cohortLeaders" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>기수별 기장단 소개 관리</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  관리자만 등록·수정할 수 있습니다. 기수, 기장·부기장, 인사말과 소개 이미지가 원우회 기장단 화면에 반영됩니다.
                </Text>
              </View>
            </Panel>
            {!cohortLeadersBoard ? (
              <Panel><Text style={{ color: COLORS.error, fontWeight: "800" }}>gsa-cohort-leaders 게시판을 찾을 수 없습니다.</Text></Panel>
            ) : null}
            {cohortLeaders.map((leader, index) => (
              <Panel key={`cohort-leader-${index}`}>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: COLORS.primary900, fontSize: 16, fontWeight: "900" }}>{leader.cohort || "새 기수"} 기장단</Text>
                  <Field value={leader.cohort} onChangeText={(value) => updateCohortLeader(index, { cohort: value })} placeholder="기수 예: 75" />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}><Field value={leader.captain_name} onChangeText={(value) => updateCohortLeader(index, { captain_name: value })} placeholder="기장 이름" /></View>
                    <View style={{ flex: 1 }}><Field value={leader.vice_captain_name} onChangeText={(value) => updateCohortLeader(index, { vice_captain_name: value })} placeholder="부기장 이름" /></View>
                  </View>
                  <Field value={leader.greeting} onChangeText={(value) => updateCohortLeader(index, { greeting: value })} placeholder="인사말 예: 안녕하세요, 75기 기장 홍길동입니다!" />
                  <Field value={leader.intro} onChangeText={(value) => updateCohortLeader(index, { intro: value })} placeholder="기장단 소개글" multiline />
                  {COHORT_LEADER_IMAGE_FIELDS.map(({ field, label }) => {
                    const previewUrl = mediaUrl(leader[field]);
                    const uploading = cohortLeaderUploading?.index === index && cohortLeaderUploading.field === field;
                    return (
                      <View key={field} style={{ gap: 8 }}>
                        <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "900" }}>{label}</Text>
                        {previewUrl ? (
                          <MediaImage
                            media={{ url: leader[field] }}
                            style={field === "banner_image_url" ? { width: "100%", aspectRatio: 2.2, borderRadius: 8, backgroundColor: COLORS.primary50 } : { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary50 }}
                          />
                        ) : null}
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <ActionButton icon="image-outline" label={uploading ? "업로드 중" : `${label} 등록`} onPress={() => void handleUploadCohortLeaderImage(index, field)} disabled={Boolean(cohortLeaderUploading)} tone="outline" />
                          </View>
                          {leader[field] ? (
                            <View style={{ flex: 1 }}><ActionButton label="삭제" onPress={() => updateCohortLeader(index, { [field]: "" })} tone="danger" /></View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                  <ActionButton icon="trash-outline" label="이 기수 삭제" onPress={() => setCohortLeaders((current) => current.filter((_, itemIndex) => itemIndex !== index))} tone="danger" />
                </View>
              </Panel>
            ))}
            <Panel>
              <View style={{ gap: 8 }}>
                <ActionButton icon="person-add-outline" label="기수 추가" onPress={() => setCohortLeaders((current) => [...current, { ...emptyCohortLeader }])} tone="outline" />
                <ActionButton icon="save-outline" label={cohortLeadersSaving ? "저장 중" : "기장단 소개 저장"} onPress={() => void handleSaveCohortLeaders()} disabled={cohortLeadersSaving || Boolean(cohortLeaderUploading) || !cohortLeadersBoard} />
              </View>
            </Panel>
          </View>
        ) : null}

        {section === "pastCouncils" ? (
          <View style={{ gap: 12 }}>
            <Panel><View style={{ gap: 8 }}><Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>역대 원우회 관리</Text><Text style={{ color: COLORS.muted, lineHeight: 20 }}>FAQ 및 현재 임원진과 분리된 관리자 전용 영역입니다. 대수별 임원진, 소개와 활동내역을 등록합니다.</Text></View></Panel>
            {!pastCouncilsBoard ? <Panel><Text style={{ color: COLORS.error, fontWeight: "800" }}>DB 마이그레이션 후 gsa-past-councils 게시판을 사용할 수 있습니다.</Text></Panel> : null}
            {pastCouncils.map((council, index) => (
              <Panel key={`past-council-${index}`}>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: COLORS.primary900, fontSize: 16, fontWeight: "900" }}>{council.cohort || "새 역대 원우회"} 원우회</Text>
                  <Field value={council.cohort} onChangeText={(value) => updatePastCouncil(index, { cohort: value })} placeholder="원우회 대수 예: 29" />
                  <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Field value={council.president_name} onChangeText={(value) => updatePastCouncil(index, { president_name: value })} placeholder="회장 이름" /></View><View style={{ flex: 1 }}><Field value={council.president_cohort} onChangeText={(value) => updatePastCouncil(index, { president_cohort: value })} placeholder="회장 기수" /></View></View>
                  <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Field value={council.vice_president_name} onChangeText={(value) => updatePastCouncil(index, { vice_president_name: value })} placeholder="부회장 이름" /></View><View style={{ flex: 1 }}><Field value={council.vice_president_cohort} onChangeText={(value) => updatePastCouncil(index, { vice_president_cohort: value })} placeholder="부회장 기수" /></View></View>
                  <Field value={council.intro} onChangeText={(value) => updatePastCouncil(index, { intro: value })} placeholder="원우회 소개글" multiline />
                  <Field value={council.activities_text} onChangeText={(value) => updatePastCouncil(index, { activities_text: value })} placeholder={'활동내역을 한 줄에 하나씩 입력\n예: 25.05.05 기말 세미나 개최'} multiline />
                  {PAST_COUNCIL_IMAGE_FIELDS.map(({ field, label }) => {
                    const previewUrl = mediaUrl(council[field]);
                    const uploading = pastCouncilUploading?.index === index && pastCouncilUploading.field === field;
                    return <View key={field} style={{ gap: 7 }}><Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "900" }}>{label}</Text>{previewUrl ? <MediaImage media={{ url: council[field] }} style={field === "banner_image_url" ? { width: "100%", aspectRatio: 2.2, borderRadius: 8 } : { width: 72, height: 72, borderRadius: 36 }} /> : null}<View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><ActionButton icon="image-outline" label={uploading ? "업로드 중" : `${label} 등록`} onPress={() => void handleUploadPastCouncilImage(index, field)} disabled={Boolean(pastCouncilUploading)} tone="outline" /></View>{council[field] ? <View style={{ flex: 1 }}><ActionButton label="삭제" onPress={() => updatePastCouncil(index, { [field]: "" })} tone="danger" /></View> : null}</View></View>;
                  })}
                  <ActionButton icon="trash-outline" label="이 원우회 삭제" onPress={() => setPastCouncils((current) => current.filter((_, itemIndex) => itemIndex !== index))} tone="danger" />
                </View>
              </Panel>
            ))}
            <Panel><View style={{ gap: 8 }}><ActionButton icon="add-circle-outline" label="역대 원우회 추가" onPress={() => setPastCouncils((current) => [...current, { ...emptyPastCouncil }])} tone="outline" /><ActionButton icon="save-outline" label={pastCouncilsSaving ? "저장 중" : "역대 원우회 저장"} onPress={() => void handleSavePastCouncils()} disabled={pastCouncilsSaving || Boolean(pastCouncilUploading) || !pastCouncilsBoard} /></View></Panel>
          </View>
        ) : null}

        {section === "posts" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>전체 게시글 관리</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  게시판 전체 글을 검색하고, 관리자 권한으로 열기, 수정, 고정, 삭제를 처리합니다.
                </Text>
                <ActionButton
                  icon="add-circle-outline"
                  label="동아리 게시글 등록"
                  disabled={!clubPromoBoard}
                  onPress={() => {
                    if (clubPromoBoard) {
                      router.push({ pathname: "/board/post/create", params: { boardId: String(clubPromoBoard.id) } } as never);
                    }
                  }}
                />
                <ActionButton
                  icon="git-network-outline"
                  label="네트워킹 게시글 등록"
                  disabled={!networkingProgramsBoard}
                  onPress={() => {
                    if (networkingProgramsBoard) {
                      router.push({ pathname: "/board/post/create", params: { boardId: String(networkingProgramsBoard.id) } } as never);
                    }
                  }}
                />
                <Field value={postSearch} onChangeText={setPostSearch} placeholder="제목, 내용, 작성자, 게시판명 검색" />
                <ActionButton icon="search-outline" label="검색" onPress={() => setAppliedPostSearch(postSearch)} />
                <Text style={{ color: COLORS.muted, fontWeight: "800" }}>게시판</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                  <Chip active={postBoardId === null} label="전체 게시판" onPress={() => setPostBoardId(null)} />
                  {boards.map((board) => (
                    <Chip
                      key={board.id}
                      active={postBoardId === board.id}
                      label={board.name}
                      onPress={() => setPostBoardId(board.id)}
                    />
                  ))}
                </ScrollView>
                <Text style={{ color: COLORS.muted, fontWeight: "800" }}>상태 필터</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {ADMIN_POST_MODE_FILTERS.map((item) => (
                    <Chip key={item.key} active={postMode === item.key} label={item.label} onPress={() => setPostMode(item.key)} />
                  ))}
                </View>
                <Text style={{ color: COLORS.subtle, fontSize: 12, fontWeight: "800" }}>
                  총 {adminPostTotal}개 게시글
                </Text>
              </View>
            </Panel>
            {adminPostsQuery.isLoading ? <ActivityIndicator /> : null}
            {!adminPostsQuery.isLoading && adminPosts.length === 0 ? (
              <Panel>
                <Text style={{ color: COLORS.muted }}>표시할 게시글이 없습니다.</Text>
              </Panel>
            ) : null}
            {adminPosts.map((item) => (
              <AdminPostCard key={item.id} item={item} onPinToggle={handlePinAdminPost} onDelete={handleDeleteAdminPost} />
            ))}
          </View>
        ) : null}

        {section === "mutualAid" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>상조회 신청 관리</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  신청 상세에서 증빙서류를 확인한 후 처리 완료 또는 반려를 선택합니다. 반려 시 사유 입력이 필수입니다.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {([
                    ["processing", "처리중"],
                    ["completed", "처리 완료"],
                    ["rejected", "반려"],
                    ["all", "전체"],
                  ] as const).map(([value, label]) => (
                    <Chip key={value} active={mutualAidFilter === value} label={label} onPress={() => setMutualAidFilter(value)} />
                  ))}
                </View>
                <Text style={{ color: COLORS.subtle, fontSize: 12, fontWeight: "800" }}>
                  처리 대기 {processingMutualAidCount}건 · 전체 {mutualAidPosts.length}건
                </Text>
              </View>
            </Panel>
            {mutualAidPostsQuery.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
            {!mutualAidPostsQuery.isLoading && visibleMutualAidPosts.length === 0 ? (
              <Panel><Text style={{ color: COLORS.muted }}>해당 상태의 상조회 신청이 없습니다.</Text></Panel>
            ) : null}
            {visibleMutualAidPosts.map((item) => <MutualAidAdminCard key={item.id} item={item} />)}
          </View>
        ) : null}

        {section === "suggestions" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>건의사항 답변 관리</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  작성자는 익명으로 유지됩니다. 상세 화면에서 공식 답변을 입력하면 답변완료로 처리되고 작성자에게 알림이 전송됩니다.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {([['received', '대기중'], ['answered', '답변완료'], ['all', '전체']] as const).map(([value, label]) => (
                    <Chip key={value} active={suggestionFilter === value} label={label} onPress={() => setSuggestionFilter(value)} />
                  ))}
                </View>
                <Text style={{ color: COLORS.subtle, fontSize: 12, fontWeight: "800" }}>
                  답변 대기 {pendingSuggestionCount}건 · 전체 {suggestionPosts.length}건
                </Text>
              </View>
            </Panel>
            {suggestionPostsQuery.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
            {!suggestionPostsQuery.isLoading && visibleSuggestionPosts.length === 0 ? (
              <Panel><Text style={{ color: COLORS.muted }}>해당 상태의 건의사항이 없습니다.</Text></Panel>
            ) : null}
            {visibleSuggestionPosts.map((item) => <SuggestionAdminCard key={item.id} item={item} />)}
          </View>
        ) : null}

        {section === "accounts" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>계정 컨트롤</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  `sogang.ac.kr` 메일 인증을 완료한 계정의 권한과 활성 상태를 관리합니다.
                </Text>
                <Field value={userSearch} onChangeText={setUserSearch} placeholder="이메일, 닉네임, 기수 검색" />
                <ActionButton icon="search-outline" label="검색" onPress={() => setAppliedUserSearch(userSearch)} />
              </View>
            </Panel>
            {usersQuery.isLoading ? <ActivityIndicator /> : null}
            {!usersQuery.isLoading && users.length === 0 ? (
              <Panel>
                <Text style={{ color: COLORS.muted }}>표시할 회원이 없습니다.</Text>
              </Panel>
            ) : null}
            {users.map((item) => (
              <UserCard
                key={item.id}
                item={item}
                onRoleToggle={handleUserRoleToggle}
                onActiveToggle={handleUserActiveToggle}
                onEligibilityChange={handleUserEligibilityChange}
              />
            ))}
          </View>
        ) : null}

        {section === "reports" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>신고 관리</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((status) => (
                    <Chip key={status} active={reportStatus === status} label={REPORT_STATUS_LABELS[status]} onPress={() => setReportStatus(status)} />
                  ))}
                </View>
              </View>
            </Panel>
            {reportsQuery.isLoading ? <ActivityIndicator /> : null}
            {!reportsQuery.isLoading && reports.length === 0 ? (
              <Panel>
                <Text style={{ color: COLORS.muted }}>표시할 신고가 없습니다.</Text>
              </Panel>
            ) : null}
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} onStatusChange={handleReportStatus} onDeleteTarget={handleDeleteTarget} />
            ))}
          </View>
        ) : null}

        {section === "faqs" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>
                  {editingFAQId ? "FAQ 수정" : "FAQ 등록"}
                </Text>
                <Field value={faqForm.question} onChangeText={(value) => setFAQForm((current) => ({ ...current, question: value }))} placeholder="질문" />
                <Field value={faqForm.answer} onChangeText={(value) => setFAQForm((current) => ({ ...current, answer: value }))} placeholder="답변" multiline />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field value={faqForm.category} onChangeText={(value) => setFAQForm((current) => ({ ...current, category: value }))} placeholder="분류" />
                  </View>
                  <View style={{ width: 92 }}>
                    <Field value={faqForm.sort_order} onChangeText={(value) => setFAQForm((current) => ({ ...current, sort_order: value }))} placeholder="순서" />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ActionButton icon="save-outline" label={editingFAQId ? "FAQ 저장" : "FAQ 등록"} onPress={handleSaveFAQ} />
                  </View>
                  {editingFAQId ? (
                    <View style={{ flex: 1 }}>
                      <ActionButton label="취소" onPress={resetFAQForm} tone="outline" />
                    </View>
                  ) : null}
                </View>
              </View>
            </Panel>
            {faqsQuery.isLoading ? <ActivityIndicator /> : null}
            {faqs.map((item) => (
              <FAQCard key={item.id} item={item} onEdit={handleEditFAQ} onDelete={handleDeleteFAQ} />
            ))}
          </View>
        ) : null}

        {section === "registration" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>개인정보 처리방침 버전</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  신규 회원은 저장 시점의 활성 버전에 동의해야 하며, 동의 시각과 버전이 계정에 기록됩니다.
                </Text>
                {adminPrivacyPolicy ? (
                  <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: "900" }}>
                    현재 적용: v{adminPrivacyPolicy.version} · {adminPrivacyPolicy.effective_at.slice(0, 16).replace("T", " ")}
                  </Text>
                ) : null}
                <Field value={policyVersion} onChangeText={setPolicyVersion} placeholder="정책 버전 (예: 2026-07-12)" />
                <Field value={policyEffectiveAt} onChangeText={setPolicyEffectiveAt} placeholder="시행일시 (YYYY-MM-DDTHH:mm)" />
                <ActionButton icon="shield-checkmark-outline" label="정책 버전 적용" onPress={() => void handleSavePrivacyPolicy()} />
              </View>
            </Panel>

            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>전공 추가</Text>
                <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                  활성 전공만 회원가입 선택 목록에 노출됩니다. 기존 회원이 사용 중인 전공은 비활성화해도 기록이 유지됩니다.
                </Text>
                <Field value={newMajorName} onChangeText={setNewMajorName} placeholder="전공명" />
                <Field value={newMajorOrder} onChangeText={(value) => setNewMajorOrder(value.replace(/\D/g, ""))} placeholder="정렬 순서" />
                <ActionButton icon="add-outline" label="전공 추가" onPress={() => void handleCreateMajor()} />
              </View>
            </Panel>

            {adminMajorsQuery.isLoading || adminPrivacyPolicyQuery.isLoading ? <ActivityIndicator /> : null}
            {adminMajorsQuery.isError || adminPrivacyPolicyQuery.isError ? (
              <Panel><Text style={{ color: COLORS.error, fontWeight: "800" }}>가입 설정을 불러오지 못했습니다.</Text></Panel>
            ) : null}
            {adminMajors.map((item) => (
              <MajorOptionEditor key={item.id} item={item} onSave={handleSaveMajor} />
            ))}
          </View>
        ) : null}

        {section === "events" ? (
          <View style={{ gap: 12 }}>
            <Panel>
              <View style={{ gap: 10 }}>
                <Text style={{ color: COLORS.primary900, fontSize: 18, fontWeight: "900" }}>
                  {editEventId ? "일정 수정" : "일정 등록"}
                </Text>
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => <Field onChangeText={field.onChange} placeholder="일정 제목" value={field.value ?? ""} />}
                />
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <View style={{ gap: 7 }}>
                      <Text style={{ color: COLORS.text, fontWeight: "900" }}>일정 분류</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => (
                          <Chip key={value} active={field.value === value} label={label} onPress={() => field.onChange(value)} />
                        ))}
                      </View>
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="start_at"
                  render={({ field }) => (
                    <EventDateTimePicker label="시작일시" value={field.value ?? ""} onChange={field.onChange} fallbackTime="09:00" />
                  )}
                />
                <Controller
                  control={control}
                  name="end_at"
                  render={({ field }) => (
                    <EventDateTimePicker label="종료일시" value={field.value ?? ""} onChange={field.onChange} fallbackTime="11:00" />
                  )}
                />
                <Controller
                  control={control}
                  name="location"
                  render={({ field }) => <Field onChangeText={field.onChange} placeholder="장소" value={field.value ?? ""} />}
                />
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => <Field multiline onChangeText={field.onChange} placeholder="상세 설명" value={field.value ?? ""} />}
                />
                <ActionButton icon="save-outline" label={editEventId ? "일정 저장" : "일정 등록"} onPress={handleSubmit(onSubmitEvent)} />
              </View>
            </Panel>
            {eventsQuery.isLoading ? <ActivityIndicator /> : null}
            {events.map((event) => (
              <View key={event.id} style={{ gap: 8 }}>
                <EventCard event={event} onEdit={handleEditEvent} />
                <ActionButton icon="trash-outline" label="일정 삭제" onPress={() => handleDeleteEventFromList(event)} tone="danger" />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
