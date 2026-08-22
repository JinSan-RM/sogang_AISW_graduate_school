import assert from "node:assert/strict";
import test from "node:test";

const introUtilsPromise = import("../utils/councilIntroductions").catch(() => null);

test("임원 프로필은 기존 기장단처럼 사진·이름·기수·직책만 고정 노출한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.fixedCouncilMemberProfile(
      {
        name: "정기장",
        cohort: "",
        role: "기장",
        image_url: "/media/captain.jpg",
        intro: "프로필 카드에는 노출하면 안 되는 임원별 소개입니다.",
      },
      "75기",
    ),
    {
      name: "정기장",
      subtitle: "75기 기장",
      imageUrl: "/media/captain.jpg",
    },
  );
});

test("소개 상세는 대표 이미지와 설명을 승인된 순서로 정규화한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.councilIntroductionContent({
      photoUrls: [" /media/gallery.jpg "],
      bannerImageUrl: "/media/banner.jpg",
      greeting: " 안녕하세요. ",
      intro: " 함께하는 원우회입니다. ",
    }),
    {
      representativeImages: ["/media/gallery.jpg"],
      textSections: [
        { kind: "greeting", text: "안녕하세요." },
        { kind: "intro", text: "함께하는 원우회입니다." },
      ],
    },
  );
});

test("등록된 대표 이미지와 설명이 없으면 임시 상세 영역을 만들지 않는다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.councilIntroductionContent({ photoUrls: [], bannerImageUrl: " ", greeting: "", intro: " " }),
    { representativeImages: [], textSections: [] },
  );
});

test("현재 원우회 소개는 대표 정보와 가변 임원 카드를 그대로 복원한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.currentCouncilFormsFromMetadata({
      council_introductions: [
        {
          title: "제30대 원우회",
          greeting: "안녕하세요, 제30대 원우회입니다.",
          intro: "원우의 연결과 성장을 돕겠습니다.",
          banner_image_url: "/media/council-banner.jpg",
          photo_urls: [],
          members: [
            { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "함께 만들겠습니다." },
            { name: "이국장", cohort: "74기", role: "기획국장", image_url: "", intro: "" },
          ],
        },
      ],
    }),
    [
      {
        title: "제30대 원우회",
        greeting: "안녕하세요, 제30대 원우회입니다.",
        intro: "원우의 연결과 성장을 돕겠습니다.",
        banner_image_url: "/media/council-banner.jpg",
        photo_urls: [],
        members: [
          { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "함께 만들겠습니다." },
          { name: "이국장", cohort: "74기", role: "기획국장", image_url: "", intro: "" },
        ],
      },
    ],
  );
});

test("현재 원우회 화면은 목록 선택 없이 첫 소개를 상세로 바로 노출한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.currentCouncilScreenState({
      council_introductions: [
        {
          title: "제30대 원우회",
          greeting: "안녕하세요, 제30대 원우회입니다.",
          intro: "원우의 연결과 성장을 돕겠습니다.",
          banner_image_url: "/media/current.jpg",
          photo_urls: [],
          members: [
            { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "" },
          ],
        },
        {
          title: "제29대 원우회",
          greeting: "이전 원우회입니다.",
          intro: "이전 소개입니다.",
          banner_image_url: "/media/previous.jpg",
          photo_urls: [],
          members: [],
        },
      ],
    }),
    {
      kind: "detail",
      council: {
        title: "제30대 원우회",
        greeting: "안녕하세요, 제30대 원우회입니다.",
        intro: "원우의 연결과 성장을 돕겠습니다.",
        banner_image_url: "/media/current.jpg",
        photo_urls: [],
        members: [
          { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "" },
        ],
      },
    },
  );
});

test("등록된 현재 원우회가 없으면 상세 대신 빈 상태를 반환한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(introUtils.currentCouncilScreenState({ council_introductions: [] }), { kind: "empty" });
});

test("기장단과 역대 원우회는 마지막 카드를 삭제한 빈 목록도 저장할 수 있다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.equal(introUtils.canSaveCohortLeaderCards([]), true);
  assert.equal(introUtils.canSavePastCouncilCards([]), true);
  assert.equal(introUtils.canSaveCurrentCouncilCards([]), false);
});

test("소개 카드가 남아 있으면 소개글과 모든 임원의 필수 정보를 검증한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  const member = { name: "김회장", cohort: "75기", role: "회장", image_url: "", intro: "" };
  assert.equal(introUtils.canSaveCohortLeaderCards([{ cohort: "75", greeting: "", intro: "소개", banner_image_url: "", members: [member] }]), true);
  assert.equal(introUtils.canSavePastCouncilCards([{ cohort: "29", greeting: "", intro: "소개", banner_image_url: "", activities: [], members: [member] }]), true);
  assert.equal(introUtils.canSaveCurrentCouncilCards([{ title: "제30대 원우회", greeting: "", intro: "소개", banner_image_url: "", members: [member] }]), true);
  assert.equal(introUtils.canSaveCohortLeaderCards([{ cohort: "75", greeting: "", intro: "", banner_image_url: "", members: [member] }]), false);
  assert.equal(introUtils.canSavePastCouncilCards([{ cohort: "29", greeting: "", intro: "소개", banner_image_url: "", activities: [], members: [{ ...member, role: "" }] }]), false);
});

test("현재 원우회 저장은 한 건만 유지하고 해당 임원만 이전 앱 필드에 기록한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  const current = {
    title: "제30대 원우회",
    greeting: "안녕하세요.",
    intro: "현재 원우회입니다.",
    banner_image_url: "/media/current.jpg",
    photo_urls: [],
    members: [{ name: "김회장", cohort: "75기", role: "회장", image_url: "", intro: "" }],
  };
  const stale = {
    title: "제29대 원우회",
    greeting: "이전 인사말",
    intro: "이전 원우회입니다.",
    banner_image_url: "/media/stale.jpg",
    photo_urls: [],
    members: [{ name: "박회장", cohort: "74기", role: "회장", image_url: "", intro: "" }],
  };

  assert.deepEqual(introUtils.withCurrentCouncilMetadata({ untouched: true }, [current, stale]), {
    untouched: true,
    council_introductions: [current],
    executives: current.members,
  });
});

test("기존 현재 임원진 배열은 한 개의 원우회 소개 카드로 호환된다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.currentCouncilFormsFromMetadata({
      executives: [
        { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "반갑습니다." },
      ],
    }),
    [
      {
        title: "현재 원우회",
        greeting: "",
        intro: "",
        banner_image_url: "",
        photo_urls: [],
        members: [
          { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "반갑습니다." },
        ],
      },
    ],
  );
});

test("새 현재 원우회 카드의 임원이 비어 있으면 기존 임원진을 카드에 복원한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.currentCouncilFormsFromMetadata({
      council_introductions: [{
        title: "제30대 원우회",
        greeting: "안녕하세요.",
        intro: "함께하겠습니다.",
        banner_image_url: "/media/current.jpg",
        photo_urls: [],
        members: [],
      }],
      executives: [
        { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "" },
      ],
    }),
    [{
      title: "제30대 원우회",
      greeting: "안녕하세요.",
      intro: "함께하겠습니다.",
      banner_image_url: "/media/current.jpg",
      photo_urls: [],
      members: [
        { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "" },
      ],
    }],
  );
});

test("소개 카드와 임원 카드는 위아래 이동 후 저장 순서를 그대로 유지한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  const original = ["첫째", "둘째", "셋째"];
  assert.deepEqual(introUtils.moveCouncilIntroductionItem(original, 2, 1), ["첫째", "셋째", "둘째"]);
  assert.deepEqual(introUtils.moveCouncilIntroductionItem(original, 0, 1), ["둘째", "첫째", "셋째"]);
  assert.deepEqual(original, ["첫째", "둘째", "셋째"]);
  assert.deepEqual(introUtils.moveCouncilIntroductionItem(original, 0, -1), original);
  assert.deepEqual(introUtils.moveCouncilIntroductionItem(original, 2, 3), original);
});

test("사용자용 기장단과 역대 원우회 목록은 숫자 기수·대수를 안정적인 내림차순으로 정렬한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  const storedOrder = [
    { cohort: "68기", name: "68기" },
    { cohort: "67", name: "67기" },
    { cohort: "미상", name: "첫 번째 비정형" },
    { cohort: "73기", name: "첫 번째 73기" },
    { cohort: "69대", name: "69대" },
    { cohort: "미정", name: "두 번째 비정형" },
    { cohort: "73대", name: "두 번째 73대" },
  ];

  assert.deepEqual(
    introUtils.sortCouncilCardsDescending(storedOrder).map((item) => item.name),
    ["첫 번째 73기", "두 번째 73대", "69대", "68기", "67기", "첫 번째 비정형", "두 번째 비정형"],
  );
  assert.deepEqual(storedOrder.map((item) => item.name), [
    "68기",
    "67기",
    "첫 번째 비정형",
    "첫 번째 73기",
    "69대",
    "두 번째 비정형",
    "두 번째 73대",
  ]);
});

test("기장단은 새 임원 배열을 우선하고 기존 기장·부기장 데이터도 임원 카드로 변환한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.cohortLeaderFormsFromMetadata({
      cohort_leaders: [
        {
          cohort: "75",
          greeting: "75기입니다.",
          intro: "함께해요.",
          banner_image_url: "/media/75.jpg",
          photo_urls: [],
          members: [
            { name: "정기장", cohort: "75기", role: "기장", image_url: "/media/captain.jpg", intro: "" },
            { name: "김총무", cohort: "75기", role: "총무", image_url: "", intro: "" },
            { name: "박홍보", cohort: "75기", role: "홍보", image_url: "", intro: "" },
          ],
        },
        {
          cohort: "74",
          captain_name: "이기장",
          vice_captain_name: "최부기장",
          greeting: "74기입니다.",
          intro: "반갑습니다.",
          captain_image_url: "/media/legacy-captain.jpg",
          vice_captain_image_url: "/media/legacy-vice.jpg",
        },
      ],
    }),
    [
      {
        cohort: "75",
        greeting: "75기입니다.",
        intro: "함께해요.",
        banner_image_url: "/media/75.jpg",
        photo_urls: [],
        members: [
          { name: "정기장", cohort: "75기", role: "기장", image_url: "/media/captain.jpg", intro: "" },
          { name: "김총무", cohort: "75기", role: "총무", image_url: "", intro: "" },
          { name: "박홍보", cohort: "75기", role: "홍보", image_url: "", intro: "" },
        ],
      },
      {
        cohort: "74",
        greeting: "74기입니다.",
        intro: "반갑습니다.",
        banner_image_url: "",
        photo_urls: [],
        members: [
          { name: "이기장", cohort: "74기", role: "기장", image_url: "/media/legacy-captain.jpg", intro: "" },
          { name: "최부기장", cohort: "74기", role: "부기장", image_url: "/media/legacy-vice.jpg", intro: "" },
        ],
      },
    ],
  );
});

test("역대 원우회는 인사말과 가변 임원을 복원하고 기존 회장·부회장도 호환한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  assert.deepEqual(
    introUtils.pastCouncilFormsFromMetadata({
      past_councils: [
        {
          cohort: "29",
          greeting: "제29대 원우회입니다.",
          intro: "함께한 기록입니다.",
          banner_image_url: "/media/29.jpg",
          photo_urls: [],
          activities: [{ date: "25.05.05", title: "이임식" }],
          members: [
            { name: "박회장", cohort: "70기", role: "회장", image_url: "/media/past-president.jpg", intro: "" },
            { name: "윤국장", cohort: "69기", role: "사무국장", image_url: "", intro: "기록을 담당했습니다." },
          ],
        },
        {
          cohort: "28",
          president_name: "김회장",
          president_cohort: "69",
          vice_president_name: "한부회장",
          vice_president_cohort: "69기",
          intro: "기존 소개입니다.",
          president_image_url: "/media/legacy-president.jpg",
        },
      ],
    }),
    [
      {
        cohort: "29",
        greeting: "제29대 원우회입니다.",
        intro: "함께한 기록입니다.",
        banner_image_url: "/media/29.jpg",
        photo_urls: [],
        activities: [{ date: "25.05.05", title: "이임식" }],
        members: [
          { name: "박회장", cohort: "70기", role: "회장", image_url: "/media/past-president.jpg", intro: "" },
          { name: "윤국장", cohort: "69기", role: "사무국장", image_url: "", intro: "기록을 담당했습니다." },
        ],
      },
      {
        cohort: "28",
        greeting: "",
        intro: "기존 소개입니다.",
        banner_image_url: "",
        photo_urls: [],
        activities: [],
        members: [
          { name: "김회장", cohort: "69기", role: "회장", image_url: "/media/legacy-president.jpg", intro: "" },
          { name: "한부회장", cohort: "69기", role: "부회장", image_url: "", intro: "" },
        ],
      },
    ],
  );
});

test("저장 메타데이터는 새 가변 임원과 이전 앱용 고정 필드를 함께 기록한다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  const currentCards = [
    {
      title: "제30대 원우회",
      greeting: "안녕하세요.",
      intro: "소개입니다.",
      banner_image_url: "/media/current.jpg",
      photo_urls: [],
      members: [
        { name: "김회장", cohort: "75기", role: "회장", image_url: "/media/president.jpg", intro: "" },
        { name: "이국장", cohort: "74기", role: "기획국장", image_url: "", intro: "" },
      ],
    },
  ];
  const cohortCards = [
    {
      cohort: "75기",
      greeting: "안녕하세요.",
      intro: "소개입니다.",
      banner_image_url: "/media/75.jpg",
      photo_urls: [],
      members: [
        { name: "김총무", cohort: "75기", role: "총무", image_url: "", intro: "" },
        { name: "이부기장", cohort: "75기", role: "부기장", image_url: "/media/vice.jpg", intro: "" },
        { name: "정기장", cohort: "75기", role: "기장", image_url: "/media/captain.jpg", intro: "" },
      ],
    },
  ];
  const pastCards = [
    {
      cohort: "29대",
      greeting: "제29대입니다.",
      intro: "소개입니다.",
      banner_image_url: "/media/29.jpg",
      photo_urls: [],
      activities: [{ date: "25.05.05", title: "이임식" }],
      members: [
        { name: "윤국장", cohort: "69기", role: "사무국장", image_url: "", intro: "" },
        { name: "이부회장", cohort: "70기", role: "부회장", image_url: "/media/past-vice.jpg", intro: "" },
        { name: "박회장", cohort: "70기", role: "회장", image_url: "/media/past-president.jpg", intro: "" },
      ],
    },
  ];

  assert.deepEqual(introUtils.withCurrentCouncilMetadata({ untouched: true }, currentCards), {
    untouched: true,
    council_introductions: currentCards,
    executives: currentCards[0].members,
  });
  assert.deepEqual(introUtils.withCohortLeaderMetadata({ untouched: true }, cohortCards), {
    untouched: true,
    cohort_leaders: [
      {
        cohort: "75",
        greeting: "안녕하세요.",
        intro: "소개입니다.",
        banner_image_url: "/media/75.jpg",
        photo_urls: [],
        members: cohortCards[0].members,
        captain_name: "정기장",
        vice_captain_name: "이부기장",
        captain_image_url: "/media/captain.jpg",
        vice_captain_image_url: "/media/vice.jpg",
      },
    ],
  });
  assert.deepEqual(introUtils.withPastCouncilMetadata({ untouched: true }, pastCards), {
    untouched: true,
    past_councils: [
      {
        cohort: "29",
        greeting: "제29대입니다.",
        intro: "소개입니다.",
        banner_image_url: "/media/29.jpg",
        photo_urls: [],
        activities: [{ date: "25.05.05", title: "이임식" }],
        members: pastCards[0].members,
        president_name: "박회장",
        president_cohort: "70",
        vice_president_name: "이부회장",
        vice_president_cohort: "70",
        president_image_url: "/media/past-president.jpg",
        vice_president_image_url: "/media/past-vice.jpg",
      },
    ],
  });
});

test("부대표 역할이 없으면 다른 임원을 legacy 부대표로 기록하지 않는다", async () => {
  const introUtils = await introUtilsPromise;
  assert.ok(introUtils, "원우회 소개 메타데이터 변환기가 필요합니다.");

  const cohortMetadata = introUtils.withCohortLeaderMetadata({}, [
    {
      cohort: "75기",
      greeting: "",
      intro: "",
      banner_image_url: "",
      photo_urls: [],
      members: [
        { name: "김총무", cohort: "75기", role: "총무", image_url: "/media/treasurer.jpg", intro: "" },
        { name: "정기장", cohort: "75기", role: "기장", image_url: "/media/captain.jpg", intro: "" },
      ],
    },
  ]);
  const pastMetadata = introUtils.withPastCouncilMetadata({}, [
    {
      cohort: "29대",
      greeting: "",
      intro: "",
      banner_image_url: "",
      photo_urls: [],
      activities: [],
      members: [
        { name: "윤국장", cohort: "69기", role: "사무국장", image_url: "/media/director.jpg", intro: "" },
        { name: "박회장", cohort: "70기", role: "회장", image_url: "/media/president.jpg", intro: "" },
      ],
    },
  ]);

  assert.equal(cohortMetadata.cohort_leaders[0].vice_captain_name, "");
  assert.equal(cohortMetadata.cohort_leaders[0].vice_captain_image_url, "");
  assert.equal(pastMetadata.past_councils[0].vice_president_name, "");
  assert.equal(pastMetadata.past_councils[0].vice_president_cohort, "");
  assert.equal(pastMetadata.past_councils[0].vice_president_image_url, "");
});
