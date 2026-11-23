import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, useWindowDimensions } from "react-native";
import { AppText as Text } from "../../AppTypography";
import type { Board, PostListItem } from "../../../types";
import { boardApi } from "../../../services/api";
import { usePostDetail } from "../../../hooks/usePosts";
import { useAdminAlert } from "../../../utils/adminAlert";
import { ADMIN_BOARD_SECTION_DEFINITIONS, adminAppBoardFilters, adminAppSectionBoards, adminBoardSection, adminNoticeEditReady, adminParticipationBoards, type AdminBoardSectionKey, type AdminNoticeCategory } from "../../../utils/adminBoardTree";
import { adminBoardCapability, adminBoardContentControl } from "../../../utils/adminContentManagement";
import { PARTICIPATION_GROUPS } from "../../../utils/memberBoardNavigation";
import { requestWriteLeave, setWriteLeaveGuard } from "../../../stores/writeLeaveGuard";
import { adminBoardSettingsDraft } from "../../../utils/adminBoardSettings";
import AdminBoardSettingsPanel from "../AdminBoardSettingsPanel";
import AdminBoardContentPanel, { AdminBoardTargetQueryState } from "../AdminBoardContentPanel";
import AdminBoardsSidebar from "../AdminBoardsSidebar";
import AdminBoardCreateForm from "../AdminBoardCreateForm";
import AdminBoardPostsTable from "../AdminBoardPostsTable";
import AdminPostRouteState from "../AdminPostRouteState";
import { ActionButton, Chip, Panel } from "../AdminControls";
import { AdminBoardWebTheme, BOARD_WEB_STYLES } from "../AdminBoardTheme";
import { useAdminWorkspace } from "../AdminWorkspace";

type Selection={section:AdminBoardSectionKey|null;boardId:number|null;noticeCategory?:AdminNoticeCategory};
export default function AdminBoardsWebPage() {
  const workspace=useAdminWorkspace();
  const router=useRouter();
  const params=useLocalSearchParams<{editNoticeId?:string;createNoticeBoardId?:string;section?:string}>();
  const editNoticeId=Number(params.editNoticeId);
  const requestedNotice=usePostDetail(editNoticeId,Number.isSafeInteger(editNoticeId)&&editNoticeId>0,true);
  const adminAlert = useAdminAlert();
  const queryClient=useQueryClient();
  const {width}=useWindowDimensions();
  const [selection,setSelection]=useState<Selection>(()=>{
    if(params.section==="posts")return {section:null,boardId:null};
    const board=workspace.boards.find(item=>item.id===workspace.boardManagementBoardId);
    return {section:board?adminBoardSection(board):"notices",boardId:board?.id??null};
  });
  const [panel,setPanel]=useState<"inventory"|"settings"|"create"|"notice"|null>(null);
  const [busy,setBusy]=useState(false);
  const [pendingNotice,setPendingNotice]=useState<Pick<PostListItem,"id"|"board_id">|null>(null);
  const [pendingCreateBoard,setPendingCreateBoard]=useState<number|null>(null);
  const handledNoticeIntent=useRef<string|null>(null);
  const [noticeIntentError,setNoticeIntentError]=useState(false);
  const expectedBoard=useRef<number|null>(workspace.boardManagementBoardId);
  const {boards}=workspace;
  const section=ADMIN_BOARD_SECTION_DEFINITIONS.find(item=>item.key===selection.section);
  const groupedBoards=adminAppSectionBoards(selection.section,boards);
  const filters=adminAppBoardFilters(selection.section,groupedBoards);
  const isParticipation=PARTICIPATION_GROUPS.some(group=>group.key===selection.section);
  const participation=adminParticipationBoards(selection.section,boards);
  const target=selection.boardId?boards.find(board=>board.id===selection.boardId):groupedBoards[0];
  const isMemberBoard=!selection.boardId||groupedBoards.some(board=>board.id===selection.boardId);
  const showAllPosts=selection.section===null&&selection.boardId===null;
  const label=(isMemberBoard?section?.label:target?.name)??(showAllPosts?"전체 게시글":"게시판");
  const locked=workspace.managedNavigationLocked||busy;
  const isTable=selection.section==="notices"||selection.section==="resources"||isParticipation||["aggregate-posts","posts","album","activity-certification","resource","activity-history","guide"].includes(adminBoardCapability(target).kind);
  const choose=(nextSection:AdminBoardSectionKey|null,boardId:number|null,noticeCategory?:Selection["noticeCategory"])=>{
    if(locked)return;
    const proceed=()=>{
      const board=boardId?boards.find(item=>item.id===boardId):adminAppSectionBoards(nextSection,boards)[0];
      expectedBoard.current=board?.id??null;
      setSelection({section:nextSection,boardId,noticeCategory});setPanel(null);
      if(board)workspace.openManagedBoard(board.slug);else workspace.handleBoardManagementScopeChange("all");
      if(params.section==="posts")router.setParams({section:undefined});
    };
    if(!requestWriteLeave(proceed))proceed();
  };
  useEffect(()=>{
    if(workspace.boardManagementBoardId!==expectedBoard.current){
      expectedBoard.current=workspace.boardManagementBoardId;
      const board=boards.find(b=>b.id===workspace.boardManagementBoardId);
      setSelection({section:board?adminBoardSection(board):params.section==="posts"?null:"notices",boardId:board?.id??null});setPanel(null);
    }
  },[workspace.boardManagementBoardId,boards,params.section]);
  const refresh=()=>Promise.all([queryClient.invalidateQueries({queryKey:["admin-boards"]}),queryClient.invalidateQueries({queryKey:["boards"]}),queryClient.invalidateQueries({queryKey:["admin-posts"]}),queryClient.invalidateQueries({queryKey:["admin-audit-logs"]}),queryClient.invalidateQueries({queryKey:["admin-main"]})]);
  const archive=(board:Board)=>adminAlert.alert("게시판 숨기기",`‘${board.name}’과 하위 게시판을 숨김 처리합니다. 게시글·댓글은 보존되며 ‘게시판 설정’에서 복원할 수 있습니다.`,[
    {text:"취소",style:"cancel"},{text:"숨김 처리",style:"destructive",onPress:()=>{void (async()=>{setBusy(true);try{await boardApi.removeAdminBoard(board.id);await refresh();setPanel("inventory");}catch{adminAlert.alert("처리 실패","게시판을 숨길 수 없습니다.");}finally{setBusy(false);}})();}},
  ]);
  const restore=async(board:Board)=>{setBusy(true);try{await boardApi.updateAdminBoard(board.id,{is_active:true});await refresh();}catch{adminAlert.alert("복원 실패","상위 게시판이 숨겨져 있다면 먼저 복원해 주세요.");}finally{setBusy(false);}};
  const openCreate=()=>{if(locked)return;const proceed=()=>setPanel("create");if(!requestWriteLeave(proceed))proceed();};
  const setWorkspaceBusy=workspace.setPageOperationPending;
  useEffect(()=>{setWorkspaceBusy(busy);return()=>setWorkspaceBusy(false);},[busy,setWorkspaceBusy]);
  const noticeEdit=useCallback((post:Pick<PostListItem,"id"|"board_id">)=>{const board=boards.find(b=>b.id===post.board_id);if(!board||locked)return;expectedBoard.current=board.id;workspace.openManagedBoard(board.slug);setBusy(true);setPendingNotice(post);},[boards,locked,workspace]);
  useEffect(()=>{
    const post=requestedNotice.data?.data;
    const intent=params.editNoticeId?`edit:${params.editNoticeId}`:params.createNoticeBoardId?`create:${params.createNoticeBoardId}`:null;
    if(!intent||handledNoticeIntent.current===intent||locked||!workspace.boardsQuery.isSuccess)return;
    const board=boards.find(item=>item.id===(params.editNoticeId?post?.board_id:Number(params.createNoticeBoardId)));
    if(!board||board.board_type!=="notice"||params.editNoticeId&&!post)return;
    handledNoticeIntent.current=intent;
    setSelection({section:adminBoardSection(board),boardId:board.id});
    if(params.editNoticeId&&post)noticeEdit(post);
    else {expectedBoard.current=board.id;workspace.openManagedBoard(board.slug);setPendingCreateBoard(board.id);}
  },[params.editNoticeId,params.createNoticeBoardId,requestedNotice.data,boards,locked,workspace,router,noticeEdit]);
  const noticeLoad=useRef(workspace.handleEditNotice);noticeLoad.current=workspace.handleEditNotice;
  const managedId=workspace.boardManagementBoardId, noticeId=workspace.selectedNoticeBoardId, tab=workspace.boardManagementTab;
  useEffect(()=>{
    if(!pendingCreateBoard||!adminNoticeEditReady(pendingCreateBoard,managedId,noticeId,tab))return;
    workspace.startWebNoticeDraft(selection.noticeCategory);setPanel("notice");setPendingCreateBoard(null);
    if(params.createNoticeBoardId)router.setParams({createNoticeBoardId:undefined});
  },[pendingCreateBoard,managedId,noticeId,tab,workspace,router,selection.noticeCategory,params.createNoticeBoardId]);
  useEffect(()=>{
    if(!pendingNotice||!adminNoticeEditReady(pendingNotice.board_id,managedId,noticeId,tab))return;
    let cancelled=false;
    void noticeLoad.current(pendingNotice).then(success=>{if(!cancelled){
      if(success){setPanel("notice");if(params.editNoticeId)router.setParams({editNoticeId:undefined});}
      else if(params.editNoticeId)setNoticeIntentError(true);
      setBusy(false);setPendingNotice(null);
    }});
    return()=>{cancelled=true;};
  },[pendingNotice,managedId,noticeId,tab,params.editNoticeId,router]);
  const createPost=(board:Board|undefined=target)=>{
    if(!board||board.is_active===false||locked)return;
    if(board.board_type==="notice"){
      if(adminNoticeEditReady(board.id,managedId,noticeId,tab)){
        workspace.startWebNoticeDraft(selection.noticeCategory);setPanel("notice");
      }else{
        expectedBoard.current=board.id;workspace.openManagedBoard(board.slug);setPendingCreateBoard(board.id);
      }
    }else router.push({pathname:"/admin/boards/create",params:{boardId:String(board.id)}} as never);
  };
  const noticeBaseline=useRef<string|null>(null);
  const noticeDraft=useRef(workspace.noticeEditorDraft);noticeDraft.current=workspace.noticeEditorDraft;
  useEffect(()=>{noticeBaseline.current=panel==="notice"?noticeDraft.current:null;},[panel]);
  const dirty=(panel==="notice"&&workspace.noticeHasContent&&noticeBaseline.current!==null&&noticeBaseline.current!==workspace.noticeEditorDraft)
    ||(panel==="settings"&&Boolean(target&&workspace.boardSettingsDraft&&JSON.stringify(workspace.boardSettingsDraft)!==JSON.stringify(adminBoardSettingsDraft(target))));
  useEffect(()=>{
    if(!dirty)return;
    setWriteLeaveGuard(proceed=>adminAlert.alert("작성 내용 확인","저장하지 않은 내용을 닫을까요?",[{text:"계속 작성",style:"cancel"},{text:"닫기",onPress:()=>{workspace.resetNoticeForm();if(target)workspace.setBoardSettingsDraft(adminBoardSettingsDraft(target));setWriteLeaveGuard(null);proceed();}}]));
    const beforeUnload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",beforeUnload);
    return ()=>{setWriteLeaveGuard(null);window.removeEventListener("beforeunload",beforeUnload);};
  },[dirty,workspace,target,adminAlert]);
  const closePanel=()=>{if(locked)return;const proceed=()=>{setPanel(null);workspace.resetNoticeForm();workspace.handleBoardManagementTabChange("content");};if(!requestWriteLeave(proceed))proceed();};
  const openSettings=()=>{
    if(!target||locked)return;
    expectedBoard.current=target.id;
    workspace.openManagedBoard(target.slug,"settings");
    setPanel("settings");
  };
  const settings=target&&target.id===managedId&&workspace.boardSettingsDraft?<>
    <Text style={{fontSize:14,color:"#374151",fontWeight:"600"}}>{target.name}</Text>
    <AdminBoardSettingsPanel board={target} draft={workspace.boardSettingsDraft} lockedPolicies={workspace.selectedBoardCapability.lockedPolicies} saving={workspace.boardSettingsSaving} onChange={workspace.setBoardSettingsDraft} onSave={()=>void workspace.handleSaveBoardSettings()} />
    <View style={{marginTop:20,paddingTop:20,borderTopWidth:1,borderColor:"#E1E4E9"}}><ActionButton label={target.is_active===false?"게시판 복원":"게시판 숨기기"} tone="outline" disabled={locked} onPress={()=>target.is_active===false?void restore(target):archive(target)} /></View>
  </>:<Text>운영 설정을 변경할 세부 게시판을 선택하세요.</Text>;
  const listIds=showAllPosts?null:selection.boardId?[selection.boardId]:(isParticipation?groupedBoards.slice(0,1):groupedBoards).map(board=>board.id);
  const intentRequested=Boolean(params.editNoticeId||params.createNoticeBoardId);
  const intentLoading=intentRequested&&(workspace.boardsQuery.isPending||Boolean(params.editNoticeId&&requestedNotice.isLoading));
  const intentBoardId=params.editNoticeId?requestedNotice.data?.data.board_id:Number(params.createNoticeBoardId);
  const intentFailed=intentRequested&&(noticeIntentError||workspace.boardsQuery.isError||Boolean(params.editNoticeId&&requestedNotice.isError)
    ||!intentLoading&&workspace.boardsQuery.isSuccess&&!boards.some(board=>board.id===intentBoardId&&board.board_type==="notice"));
  if(intentLoading||intentFailed)return <AdminPostRouteState loading={intentLoading} onRetry={()=>{
    handledNoticeIntent.current=null;setNoticeIntentError(false);
    if(params.editNoticeId)void requestedNotice.refetch();
    void workspace.boardsQuery.refetch();
  }} />;
  return <AdminBoardWebTheme><View style={{flexDirection:width>=1000?"row":"column",gap:24,alignItems:"stretch"}}>
    <AdminBoardsSidebar selectedSection={selection.section} disabled={locked||!workspace.boardsQuery.isSuccess} onSelect={section=>choose(section,null)} />
    <View style={{flex:1,minWidth:0,gap:20}}>
      <View style={{flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <Text style={{fontSize:21,fontWeight:"600",color:"#111827"}}>{panel==="inventory"?"게시판 설정":panel==="create"?"새 게시판":panel==="settings"?"운영 설정":panel==="notice"?"공지 작성·수정":label}</Text>
        <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{panel?<ActionButton label="목록으로" tone="outline" disabled={locked} onPress={closePanel} />:<>
          <ActionButton label="게시판 설정" tone="outline" disabled={locked||!workspace.boardsQuery.isSuccess} onPress={()=>setPanel("inventory")} />
          <ActionButton label="새 게시판" tone="outline" disabled={locked||!workspace.boardsQuery.isSuccess} onPress={openCreate} />
          {target?<ActionButton label="운영 설정" tone="outline" disabled={locked} onPress={openSettings} />:null}
          {participation?<>
            {participation.certification&&selection.boardId!==participation.certification.id?<ActionButton label="활동 인증 보기" tone="outline" disabled={locked} onPress={()=>choose(selection.section,participation.certification!.id)} />:null}
            {participation.certification&&selection.boardId===participation.certification.id?<ActionButton label="활동 인증 작성" tone="outline" disabled={locked} onPress={()=>createPost(participation.certification)} />:null}
            {selection.boardId&&target&&target.id!==participation.guide?.id&&target.id!==participation.certification?.id&&target.is_active!==false?<ActionButton label={adminBoardContentControl(target).createLabel??"글 작성"} disabled={locked} onPress={()=>createPost(target)} />:null}
            {participation.guide?<ActionButton label={participation.createLabel} disabled={locked} onPress={()=>createPost(participation.guide)} />:null}
          </>:isTable&&target&&target.is_active!==false&&(selection.section||selection.boardId)?<ActionButton label={adminBoardContentControl(target).createLabel??"글 작성"} disabled={locked} onPress={()=>createPost()} />:null}
        </>}</View>
      </View>
      <AdminBoardTargetQueryState status={workspace.boardsQuery.isPending?"loading":workspace.boardsQuery.isError?"error":"aggregate"} onRetry={()=>void workspace.boardsQuery.refetch()} />
      {panel==="inventory"?<Panel>
        <label style={{display:"flex",flexDirection:"column",gap:8,fontSize:13,color:"#374151",maxWidth:400}}>
          게시판 선택
          <select
            value=""
            disabled={locked}
            style={{fontFamily:"inherit",fontSize:13,padding:10,border:"1px solid #E1E4E9",borderRadius:6,background:"white",color:"#374151"}}
            onChange={event=>{const board=boards.find(item=>item.id===Number(event.target.value));if(board)choose(adminBoardSection(board),board.id);}}
          >
            <option value="" disabled>게시판을 선택하세요</option>
            {boards.map(board=><option key={board.id} value={board.id}>{board.name}{board.is_active===false?" (비노출)":""}</option>)}
          </select>
        </label>
      </Panel>:panel==="create"?<Panel><AdminBoardCreateForm boards={boards} initialSection={selection.section??"resources"} initialParent={target?.is_active===false?null:selection.boardId} onBusy={setBusy} onCreated={board=>{expectedBoard.current=board.id;workspace.acceptCreatedBoard(board);setSelection({section:adminBoardSection(board),boardId:board.id});setPanel(null);}} /></Panel>:panel==="settings"?<Panel>{settings}</Panel>:panel==="notice"?workspace.renderNoticeEditor():<>
        {participation?.guide?<Text style={{fontSize:12,lineHeight:18,color:"#6B7280"}}>등록한 {participation.activityName}를 ‘운영 중’으로 설정하면 회원이 활동 인증 대상으로 선택할 수 있습니다. 운영 상태는 등록·수정 화면에서 변경합니다.</Text>:null}
        {section&&filters.length>0?<View style={BOARD_WEB_STYLES.tabs}>
          {filters.map(filter=><Chip key={filter.label} label={filter.label}
            active={(selection.boardId??(isParticipation?target?.id??null:null))===filter.boardId&&selection.noticeCategory===filter.noticeCategory}
            onPress={()=>choose(section.key,filter.boardId,filter.noticeCategory)} />)}
        </View>:null}
        {selection.boardId&&target?.is_active===false?<Panel><Text style={{color:"#6B7280"}}>숨긴 게시판입니다. 기존 콘텐츠는 보존되어 있습니다.</Text><ActionButton label="게시판 복원" tone="outline" disabled={locked} onPress={()=>void restore(target)} /></Panel>:null}
        {isTable?<AdminBoardPostsTable key={JSON.stringify(selection)} boards={boards} boardIds={listIds} noticeCategory={selection.noticeCategory} onNoticeEdit={post=>void noticeEdit(post)} />:target?<AdminBoardContentPanel board={target} capability={adminBoardCapability(target)} renderers={workspace.managedContentRenderers} />:<Panel><Text>등록된 게시판이 없습니다.</Text></Panel>}
      </>}
    </View>
  </View></AdminBoardWebTheme>;
}
