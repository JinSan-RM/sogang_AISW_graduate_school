import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "./AppTypography";
import MediaImage from "./MediaImage";
import PersonListCard from "./PersonListCard";
import { pollApi } from "../services/api";
import { useUserStore } from "../stores/userStore";
import type { NoticePoll, NoticePollQuestion } from "../types";
import { pollCacheKey, pollOptionLabel, validPollAnswers } from "../utils/noticePoll";
import { pollQuestionAcceptsVote } from "../utils/noticePollUsability";
import { formatCohortName } from "../utils/userLabel";

function Button({label, onPress, disabled = false}: {label: string; onPress: () => void | Promise<void>; disabled?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}}
    disabled={disabled} onPress={onPress} style={styles.button}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

export default function NoticePollCard({postId}: {postId: number; poll?: NoticePoll}) {
  const userId = useUserStore(state => state.userId);
  const client = useQueryClient();
  const query = useQuery({queryKey: pollCacheKey(userId, postId), queryFn: () => pollApi.get(postId),
    enabled: userId !== null, refetchInterval: 30_000});
  if (!query.data) return <View style={styles.container}>{query.isError ? <>
    <Text style={styles.error}>투표를 불러오지 못했습니다.</Text><Button label="투표 다시 불러오기" onPress={() => {void query.refetch();}} />
  </> : <ActivityIndicator color="#2761FF" />}</View>;
  const poll = query.data.data;
  return <View style={styles.cards}>{poll.questions.map(question =>
    <QuestionCard key={`${userId}:${postId}:${JSON.stringify([question.id, question.title, question.kind, question.allow_multiple,
      question.options.map(o => [o.id, o.label, o.media_id]), question.is_closed ?? poll.is_closed])}`}
      poll={poll} question={question} postId={postId} userId={userId}
      refresh={async () => {await query.refetch();}} onSaved={async next => {
        await client.cancelQueries({queryKey: pollCacheKey(userId, postId), exact: true});
        client.setQueryData(pollCacheKey(userId, postId), {status: "success", data: next});
        await Promise.all([
          client.invalidateQueries({queryKey: pollCacheKey(userId, postId), exact: true}),
          client.invalidateQueries({queryKey: ["notice-poll-participants", userId, postId]}),
          client.invalidateQueries({queryKey: ["post", postId]}),
        ]);
      }} />)}</View>;
}

function QuestionCard({postId, userId, poll, question, onSaved, refresh}: {postId: number; userId: number | null; poll: NoticePoll;
  question: NoticePollQuestion; onSaved: (poll: NoticePoll) => Promise<void>; refresh: () => Promise<void>}) {
  const isClosed = question.is_closed ?? poll.is_closed;
  const savedChoice = poll.my_answers.find(a => a.question_id === question.id)?.option_ids ?? [];
  const hasVoted = question.has_voted ?? savedChoice.length > 0;
  const count = question.participant_count ?? poll.participant_count;
  const canVote = pollQuestionAcceptsVote(poll, question);
  const [editing, setEditing] = useState(!hasVoted && canVote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [people, setPeople] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const selecting = editing && canVote;
  const submit = async (optionId: number) => {
    if (sending.current || !selecting || !validPollAnswers(poll, {[question.id]: [optionId]})) return;
    sending.current = true; setSaving(true); setError("");
    try {
      const response = await pollApi.vote(postId, poll.revision, [{question_id: question.id, option_ids: [optionId]}]);
      if (!mounted.current) return;
      await onSaved(response.data);
      if (mounted.current) setEditing(false);
    } catch (issue) {
      if (mounted.current) {
        setError((issue as {response?: {data?: {message?: string}}}).response?.data?.message ?? "투표를 저장하지 못했습니다. 다시 시도해 주세요.");
        await refresh();
      }
    } finally {sending.current = false; if (mounted.current) setSaving(false);}
  };
  return <View style={styles.container}>
    <View style={styles.titleRow}>
      <Text style={styles.questionTitle}>{question.title}</Text>
      {isClosed ? <Text style={styles.closedBadge}>마감</Text> : null}
    </View>
    {isClosed ? <Text style={styles.muted}>마감됨</Text> : null}
    <View style={styles.options}>{question.options.map(option => {
      const selected = savedChoice.includes(option.id);
      const percentage = count > 0 ? Math.min(100, Math.max(0, option.vote_count / count * 100)) : 0;
      const disabled = !selecting || saving;
      return <Pressable key={option.id} accessibilityLabel={`${question.title} · ${option.label}`}
        accessibilityRole="radio" accessibilityState={{checked: selected, disabled, busy: saving}}
        aria-checked={selected} aria-disabled={disabled} disabled={disabled}
        {...(Platform.OS === "web" ? {onKeyDown: (event: {key: string; preventDefault: () => void; stopPropagation: () => void}) => {
          // RN Web does not activate radio roles on Space or Enter.
          if (!disabled && [" ", "Spacebar", "Enter"].includes(event.key)) {
            event.preventDefault(); event.stopPropagation(); return submit(option.id);
          }
        }} : {})}
        onPress={() => submit(option.id)} style={[styles.option, selected && styles.selectedOption]}>
        <View pointerEvents="none" style={[styles.bar, {width: `${percentage}%`}]} />
        <View pointerEvents="none" style={styles.optionContent}>
          {selected ? <Ionicons name="checkmark" size={14} color="#2761FF" /> : null}
          {option.media_id ? <MediaImage media={{id: option.media_id}} style={styles.legacyImage} resizeMode="cover" /> : null}
          <Text style={styles.optionLabel}>{pollOptionLabel(option.label, question.kind)}</Text>
          <Text style={styles.count}>{option.vote_count}명</Text>
        </View>
      </Pressable>;
    })}</View>
    <View style={styles.footer}>
      <Text style={styles.muted}>{count}명 참여</Text>
      {saving ? <ActivityIndicator size="small" color="#2761FF" accessibilityLabel="투표 저장 중" />
        : hasVoted || isClosed || !canVote ? <Pressable accessibilityRole="button" accessibilityLabel={`참여자 보기 · ${count}명 참여`}
          onPress={() => setPeople(true)} style={styles.peopleButton}>
          <Text style={styles.peopleLabel}>참여자 보기 ›</Text>
        </Pressable> : null}
    </View>
    {canVote && hasVoted && !selecting ? <Button label="다시 투표하기" disabled={saving}
      onPress={() => {setEditing(true); setError("");}} /> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {people ? <Participants key={`${userId}:${postId}:${question.id}`} postId={postId} userId={userId}
      question={question} onClose={() => setPeople(false)} /> : null}
  </View>;
}

function Participants({postId, userId, question, onClose}: {postId: number; userId: number | null;
  question: NoticePollQuestion; onClose: () => void}) {
  const [optionId, setOptionId] = useState(question.options[0]?.id);
  const {height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="참여자 창 닫기" onPress={onClose} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.sheet, {maxHeight: Math.min(height * .85, height - insets.top - 12), paddingBottom: Math.max(insets.bottom, 16)}]}
        accessibilityViewIsModal>
        <Pressable accessibilityRole="button" accessibilityLabel="참여자 닫기" onPress={onClose} style={styles.handleButton}>
          <View style={styles.handle} />
        </Pressable>
        <Text style={styles.sheetTitle}>참여자</Text>
        <View accessibilityRole="tablist" style={styles.tabs}>{question.options.map(option =>
          <Pressable key={option.id} accessibilityRole="tab" accessibilityLabel={`${pollOptionLabel(option.label, question.kind)} ${option.vote_count}명`}
            accessibilityState={{selected: optionId === option.id}} aria-selected={optionId === option.id}
            onPress={() => setOptionId(option.id)} style={[styles.tab, optionId === option.id && styles.activeTab]}>
            <Text style={[styles.tabLabel, optionId === option.id && styles.activeTabLabel]}>
              {pollOptionLabel(option.label, question.kind)} {option.vote_count}
            </Text>
          </Pressable>)}</View>
        <PeopleList key={optionId} postId={postId} userId={userId} question={question} optionId={optionId} />
      </View>
    </View>
  </Modal>;
}

function PeopleList({postId, userId, question, optionId}: {postId: number; userId: number | null;
  question: NoticePollQuestion; optionId?: number}) {
  const loadingMore = useRef(false);
  const query = useInfiniteQuery({queryKey: ["notice-poll-participants", userId, postId, question.id, optionId, "voted"],
    queryFn: ({pageParam}) => pollApi.participants(postId, pageParam, optionId, question.id),
    initialPageParam: 1, getNextPageParam: last => last.pagination && last.pagination.page < last.pagination.total_pages
      ? last.pagination.page + 1 : undefined,
    enabled: userId !== null && optionId !== undefined, refetchInterval: 10_000});
  const members = [...new Map(query.data?.pages.flatMap(page => page.data).map(member => [member.user_id, member])).values()];
  const loadMore = async () => {
    if (!query.hasNextPage || query.isFetching || loadingMore.current) return;
    loadingMore.current = true;
    try {await query.fetchNextPage();} finally {loadingMore.current = false;}
  };
  return <ScrollView style={styles.peopleScroll} contentContainerStyle={styles.peopleContent} showsVerticalScrollIndicator={false}
    scrollEventThrottle={100} onScroll={event => {
      const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 120) return loadMore();
    }}>
    {members.map(member => <PersonListCard key={member.user_id} variant="poll" badge=""
      avatar={<Ionicons name="person" size={22} color="#FFF" />}
      name={formatCohortName(member.cohort, member.nickname)} caption={member.major || undefined} />)}
    {query.isError ? <View style={styles.loadState}><Text accessibilityRole="alert" style={styles.error}>참여자를 불러오지 못했습니다.</Text>
      <Button label="참여자 다시 불러오기" onPress={() => {if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch();}} /></View>
      : !query.data || query.isFetchingNextPage ? <ActivityIndicator color="#2761FF" style={styles.loadState} />
        : !members.length ? <Text style={[styles.muted, styles.loadState]}>아직 참여자가 없습니다.</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  cards: {gap: 16, marginTop: 22},
  container: {padding: 16, borderWidth: 1, borderColor: "#E5E8EE", borderRadius: 10, backgroundColor: "#FFF"},
  titleRow: {flexDirection: "row", alignItems: "center", gap: 8},
  questionTitle: {flexShrink: 1, fontSize: 14, lineHeight: 21, fontWeight: "600", color: "#15171C"},
  closedBadge: {fontSize: 10, lineHeight: 16, color: "#7B8291", backgroundColor: "#F3F4F6", paddingHorizontal: 6, borderRadius: 8},
  muted: {fontSize: 11, color: "#7B8291", lineHeight: 18},
  options: {marginTop: 10, gap: 10},
  option: {minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "transparent", backgroundColor: "#F3F4F6", overflow: "hidden", justifyContent: "center", outlineColor: "#2761FF"},
  selectedOption: {borderColor: "#2761FF"},
  bar: {position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#D5DFFF", borderRadius: 6},
  optionContent: {flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10},
  optionLabel: {flex: 1, color: "#15171C", fontSize: 13, lineHeight: 20},
  legacyImage: {width: 32, height: 32, borderRadius: 4},
  count: {fontSize: 11, lineHeight: 18, color: "#737B8B"},
  footer: {minHeight: 38, flexDirection: "row", justifyContent: "space-between", alignItems: "center"},
  peopleButton: {minHeight: 44, justifyContent: "center", paddingLeft: 12},
  peopleLabel: {fontSize: 11, lineHeight: 18, color: "#2761FF"},
  button: {paddingVertical: 10, paddingHorizontal: 12, minHeight: 40, borderRadius: 7, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center"},
  buttonText: {fontSize: 12, lineHeight: 18, color: "#7B8291"},
  error: {fontSize: 12, color: "#B91C1C", lineHeight: 20, marginTop: 8},
  backdrop: {flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(0,0,0,.12)"},
  sheet: {width: "100%", maxWidth: 420, backgroundColor: "#FFF", borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden", paddingHorizontal: 20},
  handleButton: {minHeight: 28, alignItems: "center", justifyContent: "center"},
  handle: {width: 32, height: 4, borderRadius: 2, backgroundColor: "#D3D7DD"},
  sheetTitle: {fontSize: 14, lineHeight: 21, fontWeight: "600", color: "#15171C", marginBottom: 8},
  tabs: {flexDirection: "row", borderBottomWidth: 1, borderColor: "#EFF0F3"},
  tab: {flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", borderBottomWidth: 2, borderColor: "transparent"},
  activeTab: {borderColor: "#2761FF"},
  tabLabel: {fontSize: 13, lineHeight: 20, color: "#A1A8B7"}, activeTabLabel: {color: "#15171C"},
  peopleScroll: {flexGrow: 0, flexShrink: 1},
  peopleContent: {paddingTop: 16, gap: 8},
  loadState: {paddingVertical: 16},
});
