export const COMMUNITY_BOARD_SECTIONS = [
  { key: "album", label: "행사 사진첩", slug: "event-album", type: "album", category: "community" },
  { key: "resources", label: "자료공유", slug: "lecture-reviews", type: "resource", category: "resources" },
] as const;

export const PARTICIPATION_GROUPS = [
  { key: "club", label: "동아리", guideSlug: "club-promo", certificationSlug: "club-activity", category: "club" },
  { key: "study", label: "스터디", guideSlug: "study-recruit", certificationSlug: "study-activity", category: "study" },
  { key: "networking", label: "네트워킹", guideSlug: "networking-programs", certificationSlug: "networking-activity", category: "alumni" },
] as const;

export type ParticipationGroupKey = typeof PARTICIPATION_GROUPS[number]["key"];

export const PARTICIPATION_FILTERS = ["안내", "활동 인증"] as const;
export const STUDY_FILTERS = ["모집", "활동 인증"] as const;

export const COUNCIL_MENU_ITEMS = [
  { key: "executives", title: "원우회 임원진 소개", slugs: ["gsa-executives"], category: "gsa", type: "organization_intro" },
  { key: "accounting", title: "회계장부", slugs: ["accounting"], category: "council", type: "external_link" },
  { key: "mutual-aid", title: "원우회 상조회", slugs: ["mutual-aid", "gsa-mutual-aid"], category: "council", type: "mutual_aid" },
  { key: "cohort-leaders", title: "기수별 기장단 소개", slugs: ["gsa-cohort-leaders"], category: "gsa", type: "organization_intro" },
  { key: "past-councils", title: "역대 원우회", slugs: ["gsa-past-councils"], category: "gsa", type: "organization_intro" },
  { key: "suggestions", title: "건의사항", slugs: ["suggestions", "gsa-proposal", "gsa-feedback"], category: "council", type: "suggestion" },
  { key: "faq", title: "자주 묻는 질문", slugs: ["gsa-faq"], href: "/faq", category: "gsa", type: "faq" },
] as const;
