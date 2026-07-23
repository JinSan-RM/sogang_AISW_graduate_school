--
-- PostgreSQL database dump
--

\restrict v5yPXfTYKPmD7pedOb2maBblOnSfJg0Oq3egpbjLRajJSg9e3VMpT8x7TI5Tv4v

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users (id, username, password_hash, nickname, major, phone, company, job_title, "position", email, profile_image_url, role, is_active, created_at, updated_at, cohort, last_login_at, enrollment_status, dues_status, privacy_policy_version, privacy_consented_at) VALUES (1, 'testuser', '$argon2id$v=19$m=65536,t=3,p=2$8Ja83BPAeVBYHPd9ygqweQ$lkak8/Ncg9eRaV3IUbo27Q7YXFw/XR75BLUKassZSs0', '72gi_KimJinsan', 'AI-SW', '010-0000-0000', 'WithWe', 'Dev Lead', NULL, 'test@sogang.ac.kr', NULL, 'admin', true, '2026-07-21 05:48:30.686403', '2026-07-22 13:42:12.652699', '72', '2026-07-22 13:42:12.649572', 'active', 'paid', NULL, NULL);
INSERT INTO public.users (id, username, password_hash, nickname, major, phone, company, job_title, "position", email, profile_image_url, role, is_active, created_at, updated_at, cohort, last_login_at, enrollment_status, dues_status, privacy_policy_version, privacy_consented_at) VALUES (2, 'testmate71', '$argon2id$v=19$m=65536,t=3,p=2$8Ja83BPAeVBYHPd9ygqweQ$lkak8/Ncg9eRaV3IUbo27Q7YXFw/XR75BLUKassZSs0', '김동료', NULL, NULL, NULL, NULL, NULL, 'mate71@sogang.ac.kr', NULL, 'user', true, '2026-07-22 08:38:45.911438', '2026-07-22 08:38:45.911438', '71', NULL, 'active', 'paid', NULL, NULL);


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (1, 3, 1, '2026학년도 2학기 등록 안내', '안녕하세요, AISW 대학원 행정실입니다.

2026학년도 2학기 등록 기간 및 절차를 아래와 같이 안내드립니다.

등록 기간: 2026.07.20 ~ 07.25
등록 방법: 학교 포털 사이트 내 등록 메뉴
문의: 행정실 (02-705-0000)', true, true, 128, 0, 0, '2026-07-20 10:00:00', '2026-07-20 10:00:00', false, 'published', 'academic', NULL, NULL, '2026-07-25 18:00:00');
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (3, 4, 1, 'AISW 신입생 환영회 안내', '신입생 환영회를 개최합니다. 많은 참여 바랍니다.', false, true, 51, 0, 0, '2026-07-19 14:00:00', '2026-07-19 14:00:00', false, 'published', 'event', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (4, 4, 1, '대학원 학술제 참가 신청', '2026 대학원 학술제 참가 신청을 받습니다. 신청 링크는 본문을 참고하세요.', false, true, 39, 0, 0, '2026-07-18 11:00:00', '2026-07-18 11:00:00', false, 'published', 'event', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (5, 3, 1, '2026-2학기 등록금 납부 안내', '등록금 납부 관련 안내입니다. 납부 기한을 확인해 주세요.', false, true, 67, 0, 0, '2026-07-17 16:00:00', '2026-07-17 16:00:00', false, 'published', 'academic', NULL, NULL, '2026-07-31 17:00:00');
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (10, 2, 1, '동문회 리멤버 주소록 안내', '동문회 리멤버 주소록 서비스 이용 안내입니다.', false, true, 27, 0, 0, '2026-07-16 13:00:00', '2026-07-16 13:00:00', false, 'published', 'other', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (7, 2, 1, 'AISW 졸업논문 사전 심사 일정', '2026학년도 2학기 졸업논문 사전 심사 일정을 안내드립니다. 대상자는 기한 내 제출 바랍니다.', false, true, 102, 0, 0, '2026-07-21 09:30:00', '2026-07-22 09:58:16.317115', false, 'published', 'academic', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (9, 2, 1, '대학원 학술제 참가 신청', '2026 대학원 학술제 참가 신청을 받습니다. 신청 링크는 본문을 참고하세요.', false, true, 42, 0, 0, '2026-07-18 11:00:00', '2026-07-22 09:58:19.871819', false, 'published', 'event', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (22, 8, 2, '[김동료] 딥러닝 특강 후기', '다른 사람이 올린 강의후기 글입니다. 신고 메뉴 확인용.', false, false, 46, 5, 0, '2026-07-22 08:16:47.51935', '2026-07-22 09:42:13.002568', false, 'published', '강의후기', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (23, 9, 2, '[김동료] 알고리즘 기말 족보', '다른 사람이 올린 시험족보 글입니다. 신고 메뉴 확인용.
수정 테스트', false, false, 52, 9, 0, '2026-07-22 07:16:47.51935', '2026-07-22 09:28:36.322837', false, 'published', '시험족보', NULL, '2026-07-22 09:28:36.313822', NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (12, 7, 1, '딥러닝 스터디 발표회', '딥러닝 스터디 발표회 현장 사진.', false, false, 33, 3, 0, '2026-06-09 15:00:00', '2026-07-22 03:52:33.841139', false, 'published', NULL, NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (13, 7, 1, '선후배 네트워킹 데이', '선후배 네트워킹 데이 단체 사진.', false, false, 60, 8, 0, '2026-05-28 18:00:00', '2026-07-22 03:52:35.898853', false, 'published', NULL, NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (15, 8, 1, '제목 test', '1111', false, false, 16, 0, 0, '2026-07-22 04:23:32.045186', '2026-07-22 06:33:57.662122', false, 'published', NULL, 'null', '2026-07-22 06:33:57.645716', NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (14, 7, 1, '1학기 정기 총회', '2026학년도 1학기 원우회 정기 총회.', false, false, 25, 2, 0, '2026-04-10 17:00:00', '2026-07-22 09:46:27.832936', false, 'published', NULL, NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (6, 2, 1, '2026학년도 2학기 등록 안내', '안녕하세요, AISW 대학원 행정실입니다.

2026학년도 2학기 등록 기간 및 절차를 안내드립니다.

등록 기간: 2026.07.20 ~ 07.25
등록 방법: 학교 포털 사이트 내 등록 메뉴
문의: 행정실 (02-705-0000)', true, true, 133, 0, 0, '2026-07-20 10:00:00', '2026-07-22 03:44:32.069793', false, 'published', 'academic', NULL, NULL, '2026-07-25 18:00:00');
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (2, 3, 1, 'AISW 졸업논문 사전 심사 일정', '2026학년도 2학기 졸업논문 사전 심사 일정을 안내드립니다. 대상자는 기한 내 제출 바랍니다.', false, true, 85, 0, 0, '2026-07-21 09:30:00', '2026-07-22 03:46:07.508159', false, 'published', 'academic', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (26, 23, 1, '데이터 분석 스터디 동아리', '캐글 대회와 데이터 분석 실습을 진행합니다.
초보자 환영, 멘토링 제공.', false, false, 41, 5, 0, '2026-07-21 10:32:52.003239', '2026-07-22 10:32:52.003239', false, 'published', '상시', '{"application_url": "https://forms.gle/dataclub"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (24, 10, 2, '[김동료] 종합시험 후기 공유', '다른 사람이 올린 종합시험 글입니다. 신고 메뉴 확인용.', false, false, 28, 3, 0, '2026-07-22 06:16:47.51935', '2026-07-22 09:38:53.238427', false, 'published', '종합시험', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (27, 23, 1, '알고리즘 문제풀이 동아리', '매주 코딩테스트 대비 문제풀이 세션을 운영합니다.', false, false, 30, 3, 0, '2026-07-19 10:32:52.003239', '2026-07-22 10:41:20.615529', false, 'published', '마감', '{"application_url": "https://forms.gle/algo"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (25, 23, 1, 'AI 개발 동아리 DevAI', '머신러닝/딥러닝 프로젝트를 함께하는 개발 동아리입니다.
주 1회 정기 모임, 학기말 프로젝트 발표.', false, false, 79, 8, 0, '2026-07-22 08:32:52.003239', '2026-07-22 13:28:01.09938', false, 'published', '모집중', '{"application_url": "https://forms.gle/devai"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (11, 7, 1, '신입생 환영 MT', '2026학년도 신입생 환영 MT 사진첩입니다.', false, false, 54, 5, 0, '2026-06-14 10:00:00', '2026-07-22 03:56:02.581778', false, 'published', NULL, NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (19, 8, 1, '머신러닝 특강 후기 남겨요', '실습 비중이 높아서 좋았어요. 과제는 좀 빡빡한 편입니다.

다음 학기에도 열린다면 추천해요!', false, false, 91, 24, 0, '2026-07-19 11:00:00', '2026-07-22 09:26:20.178544', false, 'published', '강의후기', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (8, 2, 1, 'AISW 신입생 환영회 안내', '신입생 환영회를 개최합니다. 많은 참여 바랍니다.', false, true, 59, 0, 0, '2026-07-19 14:00:00', '2026-07-22 09:58:23.152349', false, 'published', 'event', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (18, 9, 1, '딥러닝 기초 기말고사 족보 공유', '작년 기출 정리해서 올려요. 도움 되셨으면 좋겠습니다.

T/F 문제 50개로 제출되었습니다.', false, false, 124, 24, 0, '2026-07-20 13:00:00', '2026-07-20 13:00:00', false, 'published', '시험족보', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (30, 24, 1, '딥러닝 스터디원 모집', '아아아아아 
관심 있는 분은 댓글로 남겨주시면 따로 연락 드리겠습니다', false, false, 16, 0, 3, '2026-07-22 13:09:20.685371', '2026-07-22 13:29:42.662276', false, 'published', '마감', '{"contact": "010-1234-", "recruitment_status": "closed"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (21, 18, 2, '다른 사람이 쓴 테스트 글', '신고/차단 메뉴 확인용으로 다른 작성자가 올린 글입니다.', false, false, 14, 1, 0, '2026-07-22 08:38:45.911438', '2026-07-22 09:58:43.018437', false, 'published', NULL, NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (20, 10, 1, '종합시험 준비 어떻게 하셨나요?', '선배님들 종합시험 준비 팁이나 자료 있으면 공유해주세요.', false, false, 72, 12, 0, '2026-07-18 15:00:00', '2026-07-22 09:35:10.9031', false, 'published', '종합시험', NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (16, 8, 1, 'test', '11111', false, false, 50, 1, 0, '2026-07-22 06:34:08.154311', '2026-07-22 09:35:53.235746', false, 'published', '강의후기', 'null', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (17, 9, 1, '셤 족보', '1111', false, false, 6, 1, 0, '2026-07-22 06:42:34.530609', '2026-07-22 09:48:06.980838', false, 'published', '시험족보', 'null', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (28, 11, 1, 'AI 개발 동아리 DevAI', '즐거웠씁니다', false, false, 2, 0, 0, '2026-07-22 11:10:59.605963', '2026-07-22 12:28:52.388206', false, 'published', 'AI 개발 동아리 DevAI', '{"bank_account": "1212321323232", "participants": "72기 72gi_KimJinsan", "activity_date": "2026.07.22", "participant_user_ids": "1", "activity_source_post_id": "25"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (29, 11, 1, '데이터 분석 스터디 동아리', 'ㅇㄹㅎㄹㅎㄹ', false, false, 17, 0, 0, '2026-07-22 11:16:15.441345', '2026-07-22 13:27:26.500003', false, 'published', '데이터 분석 스터디 동아리', '{"bank_account": "1232312", "participants": "72기 72gi_KimJinsan", "activity_date": "2026.07.22", "participant_user_ids": "1", "activity_source_post_id": "26"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (31, 12, 1, '딥러닝 스터디원 모집', '행복', false, false, 4, 0, 0, '2026-07-22 13:23:48.14459', '2026-07-22 13:31:06.539255', false, 'published', '딥러닝 스터디원 모집', '{"bank_account": "1111", "participants": "72기 72gi_KimJinsan", "activity_date": "2026.07.22", "participant_user_ids": "1", "activity_source_post_id": "30"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (33, 27, 1, '기수별 멘토링 매칭', '선배 멘토와 후배 멘티를 매칭해주는 프로그램입니다.
학업·취업·생활 고민을 함께 나눠요.', false, false, 33, 4, 0, '2026-07-21 13:34:37.261538', '2026-07-22 13:34:37.261538', false, 'published', '모집중', '{"application_url": "https://forms.gle/mentoring"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (34, 13, 1, '기수별 멘토링 매칭', '오늘 좋은 선배님들 많이 만났어요!', false, false, 1, 0, 0, '2026-07-22 13:37:24.963589', '2026-07-22 13:37:26.896993', false, 'published', '기수별 멘토링 매칭', '{"bank_account": "121212", "participants": "72기 72gi_KimJinsan", "activity_date": "2026.07.22", "participant_user_ids": "1", "activity_source_post_id": "33"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (32, 27, 1, '선후배 네트워킹 데이', '선배와 후배가 자유롭게 어울리며 진로 고민도 나누고 친목도 다지는 자리입니다.
다과와 함께 편안한 분위기에서 진행돼요.', false, false, 50, 6, 0, '2026-07-22 11:34:37.261538', '2026-07-22 13:37:45.591279', false, 'published', '모집중', '{"application_url": "https://forms.gle/networkday"}', NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (35, 14, 1, '2026 상반기 원우회 정기총회', '상반기 정기총회를 개최했습니다. 예산안과 활동 계획을 공유했어요.', false, false, 63, 0, 0, '2026-07-10 18:00:00', '2026-07-22 13:54:41.264774', false, 'published', NULL, NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (36, 14, 1, '신입생 환영 행사 진행', '신입생 환영 행사를 성황리에 마쳤습니다. 많은 참여 감사합니다.', false, false, 75, 0, 0, '2026-06-28 17:00:00', '2026-07-22 13:54:44.551133', false, 'published', NULL, NULL, NULL, NULL);
INSERT INTO public.posts (id, board_id, author_id, title, content, is_pinned, is_notice, view_count, like_count, comment_count, created_at, updated_at, is_anonymous, status, category, metadata, deleted_at, deadline_at) VALUES (37, 14, 1, '원우회 워크숍 개최', '임원진 워크숍을 통해 하반기 운영 방향을 논의했습니다.', false, false, 39, 0, 0, '2026-06-15 14:00:00', '2026-07-22 13:54:46.650982', false, 'published', NULL, NULL, NULL, NULL);


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.comments (id, post_id, author_id, parent_id, content, created_at, updated_at) VALUES (1, 30, 1, NULL, '저도 참여하고 싶어요!!', '2026-07-22 13:09:44.925383', '2026-07-22 13:09:44.925386');
INSERT INTO public.comments (id, post_id, author_id, parent_id, content, created_at, updated_at) VALUES (2, 30, 2, NULL, '저도 참여하고 싶어요! 화요일 시간 괜찮습니다.', '2026-07-22 12:52:57.123194', '2026-07-22 12:52:57.123194');
INSERT INTO public.comments (id, post_id, author_id, parent_id, content, created_at, updated_at) VALUES (3, 30, 2, NULL, '온라인으로 진행되나요? 줌 링크는 어떻게 받나요?', '2026-07-22 13:07:57.123194', '2026-07-22 13:07:57.123194');


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.events (id, title, description, location, category, color, start_at, end_at, created_by, created_at, updated_at) VALUES (1, '2학기 수강신청 마감', '2026학년도 2학기 수강신청이 마감됩니다. 시간 내 반드시 신청을 완료해 주세요.', '학교 포털', 'academic', NULL, '2026-07-22 18:00:00', NULL, 1, '2026-07-22 01:22:27.648738', '2026-07-22 01:22:27.648738');
INSERT INTO public.events (id, title, description, location, category, color, start_at, end_at, created_by, created_at, updated_at) VALUES (2, '신입생 환영회', 'AISW 대학원 신입생 환영회가 열립니다.', '다산관 101호', 'event', NULL, '2026-07-24 19:00:00', '2026-07-24 21:00:00', 1, '2026-07-22 01:22:27.648738', '2026-07-22 01:22:27.648738');
INSERT INTO public.events (id, title, description, location, category, color, start_at, end_at, created_by, created_at, updated_at) VALUES (3, '중간고사 시작', '2학기 중간고사 기간이 시작됩니다.', NULL, 'exam', NULL, '2026-07-28 09:00:00', NULL, 1, '2026-07-22 01:22:27.648738', '2026-07-22 01:22:27.648738');
INSERT INTO public.events (id, title, description, location, category, color, start_at, end_at, created_by, created_at, updated_at) VALUES (4, '원우회 정기총회', '2026학년도 원우회 정기총회.', '학생회관 대회의실', 'council', NULL, '2026-07-25 18:30:00', '2026-07-25 20:00:00', 1, '2026-07-22 01:22:27.648738', '2026-07-22 01:22:27.648738');
INSERT INTO public.events (id, title, description, location, category, color, start_at, end_at, created_by, created_at, updated_at) VALUES (5, '등록금 납부 마감', '2026-2학기 등록금 납부 마감일입니다.', NULL, 'academic', NULL, '2026-07-31 17:00:00', NULL, 1, '2026-07-22 01:22:27.648738', '2026-07-22 01:22:27.648738');


--
-- Data for Name: media_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (1, 1, '01_parser_list.png', '7D_JoEb7oYtxR2_MfUApqR-ph_CIdy__67hpgeBFtSQ.png', 'image/png', 366662, '/uploads/7D_JoEb7oYtxR2_MfUApqR-ph_CIdy__67hpgeBFtSQ.png', 'ready', '2026-07-21 08:03:30.341725', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (2, 1, 'album_mt.png', '-aBFgCTcU6_fQ4SVwdxSd1Xscu5DvNQnq-KQcVFkyPs.png', 'image/png', 2339, '/uploads/-aBFgCTcU6_fQ4SVwdxSd1Xscu5DvNQnq-KQcVFkyPs.png', 'ready', '2026-07-22 03:52:13.872611', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (3, 1, 'album_study.png', 'C0i2l4ayVQ7Qv_BeUGUETkiZQMXGi-addzY9h5YIJyk.png', 'image/png', 2339, '/uploads/C0i2l4ayVQ7Qv_BeUGUETkiZQMXGi-addzY9h5YIJyk.png', 'ready', '2026-07-22 03:52:13.899443', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (4, 1, 'album_network.png', 'L9Qa0Jn0o9T9X0C3vqOlLdsRUW_OD4wpyl9NLAOU2tw.png', 'image/png', 2711, '/uploads/L9Qa0Jn0o9T9X0C3vqOlLdsRUW_OD4wpyl9NLAOU2tw.png', 'ready', '2026-07-22 03:52:13.938367', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (5, 1, 'album_council.png', 'vfKqmIcXBgHGM9QP2SSjMEc2BXIsjVNjpG0185ut_5g.png', 'image/png', 2339, '/uploads/vfKqmIcXBgHGM9QP2SSjMEc2BXIsjVNjpG0185ut_5g.png', 'ready', '2026-07-22 03:52:13.977441', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (6, 1, 'album_11_1.png', 'eAeyH_hPMRHfsJW1ri13-ODFg3xRxXCQV53EgrIe9hM.png', 'image/png', 2338, '/uploads/eAeyH_hPMRHfsJW1ri13-ODFg3xRxXCQV53EgrIe9hM.png', 'ready', '2026-07-22 03:53:47.098236', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (7, 1, 'album_11_2.png', 'PR_rPCOziA8VARHkpCmKVyDQFEdpsjQryyNTOBdkEMU.png', 'image/png', 2339, '/uploads/PR_rPCOziA8VARHkpCmKVyDQFEdpsjQryyNTOBdkEMU.png', 'ready', '2026-07-22 03:53:47.132071', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (8, 1, 'album_11_3.png', 'IrCx2vghtubTVli9hN1QwTXVP19BCWVlBejFO5M4x2A.png', 'image/png', 2338, '/uploads/IrCx2vghtubTVli9hN1QwTXVP19BCWVlBejFO5M4x2A.png', 'ready', '2026-07-22 03:53:47.162033', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (9, 1, 'album_12_1.png', 'DFAcm2dlYqhhelPpkQmz6XxZHnVNAOhzNZqxzF_OEjA.png', 'image/png', 2339, '/uploads/DFAcm2dlYqhhelPpkQmz6XxZHnVNAOhzNZqxzF_OEjA.png', 'ready', '2026-07-22 03:53:47.195388', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (10, 1, 'album_12_2.png', 'TJilkHAIBKYv3dbyHHw_OsW5mtkEWBzmeBCwAcVXF9c.png', 'image/png', 2338, '/uploads/TJilkHAIBKYv3dbyHHw_OsW5mtkEWBzmeBCwAcVXF9c.png', 'ready', '2026-07-22 03:53:47.229429', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (11, 1, 'album_12_3.png', 'ihQm-AyHCIJYH_4K0ly6XuaieQEwQHvXlsvthGlH_HY.png', 'image/png', 2339, '/uploads/ihQm-AyHCIJYH_4K0ly6XuaieQEwQHvXlsvthGlH_HY.png', 'ready', '2026-07-22 03:53:47.262599', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (12, 1, 'album_13_1.png', 'ixPr-xK2rRLdbdqEEru3mmOzAzqXz4LZ6tEYFUb-v0I.png', 'image/png', 2339, '/uploads/ixPr-xK2rRLdbdqEEru3mmOzAzqXz4LZ6tEYFUb-v0I.png', 'ready', '2026-07-22 03:53:47.296563', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (13, 1, 'album_13_2.png', 'V4aHhZdEWlPOQbbKvK1ElONqJ2rbVkm4Ku18XqhSCtM.png', 'image/png', 2338, '/uploads/V4aHhZdEWlPOQbbKvK1ElONqJ2rbVkm4Ku18XqhSCtM.png', 'ready', '2026-07-22 03:53:47.328166', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (14, 1, 'album_13_3.png', 'tfhqE4LSCufz8pGuQ-7eCrZY6Xxoe2T4tDYFfvpasDI.png', 'image/png', 2339, '/uploads/tfhqE4LSCufz8pGuQ-7eCrZY6Xxoe2T4tDYFfvpasDI.png', 'ready', '2026-07-22 03:53:47.358846', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (15, 1, 'album_14_1.png', '6LdiCkPvzcV3SDGJX6ZyHPoeCEqUnfC7S6OXraxVDhE.png', 'image/png', 2339, '/uploads/6LdiCkPvzcV3SDGJX6ZyHPoeCEqUnfC7S6OXraxVDhE.png', 'ready', '2026-07-22 03:53:47.387072', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (16, 1, 'album_14_2.png', 'VIPkF2W1q-1UHnPExsLfIltvESdzZudAie7_XfSawz0.png', 'image/png', 2338, '/uploads/VIPkF2W1q-1UHnPExsLfIltvESdzZudAie7_XfSawz0.png', 'ready', '2026-07-22 03:53:47.417411', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (17, 1, 'album_14_3.png', 'ou5r1qXxxS7Fk8EVIUi0B1Sz8ThsMhNiSNbwaOIk6Wg.png', 'image/png', 2339, '/uploads/ou5r1qXxxS7Fk8EVIUi0B1Sz8ThsMhNiSNbwaOIk6Wg.png', 'ready', '2026-07-22 03:53:47.447138', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (18, 1, 'IMG_3108.png', 'jQId1wAvoLrkEzBKPfxFGS8jIe49qNTgTl7x7yedgak.png', 'image/png', 1135226, '/uploads/jQId1wAvoLrkEzBKPfxFGS8jIe49qNTgTl7x7yedgak.png', 'ready', '2026-07-22 04:23:31.264607', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (19, 1, 'IMG_3104.png', '17HO8BqJxVLnJP0jLUWvvXeX6wuemQlEsdaigmkuE4Q.png', 'image/png', 92248, '/uploads/17HO8BqJxVLnJP0jLUWvvXeX6wuemQlEsdaigmkuE4Q.png', 'ready', '2026-07-22 11:09:32.564368', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (20, 1, 'IMG_3108.png', 'kBr8rQ4WvKYmwLJH2Ackf-O82zeg0lklnMf-kxPXHHs.png', 'image/png', 1135226, '/uploads/kBr8rQ4WvKYmwLJH2Ackf-O82zeg0lklnMf-kxPXHHs.png', 'ready', '2026-07-22 11:09:38.682496', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (21, 1, 'IMG_3104.png', 'OyatxYyiaSsDBPyKOlW5QH5sEpMxhcSVap-4VXWmvaU.png', 'image/png', 92248, '/uploads/OyatxYyiaSsDBPyKOlW5QH5sEpMxhcSVap-4VXWmvaU.png', 'ready', '2026-07-22 11:15:52.192427', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (22, 1, 'IMG_3108.png', 'dZSNb3La-LGzch-QkdAeVt1ewirJPegXApc09CHupB4.png', 'image/png', 1135226, '/uploads/dZSNb3La-LGzch-QkdAeVt1ewirJPegXApc09CHupB4.png', 'ready', '2026-07-22 11:15:56.565907', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (23, 1, 'IMG_3104.png', 'wzA1uu4SZWnmE24qjOWG15sS9RqiOdlgWfEbn3p99Do.png', 'image/png', 92248, '/uploads/wzA1uu4SZWnmE24qjOWG15sS9RqiOdlgWfEbn3p99Do.png', 'ready', '2026-07-22 13:23:32.614863', false);
INSERT INTO public.media_assets (id, owner_id, original_filename, stored_filename, content_type, file_size, url, status, created_at, is_private) VALUES (24, 1, 'IMG_3108 (1).png', 'IYc7ESIvZpgnwbYZXX38gmJki9enN40dJ-bOvvVsLIo.png', 'image/png', 1135226, '/uploads/IYc7ESIvZpgnwbYZXX38gmJki9enN40dJ-bOvvVsLIo.png', 'ready', '2026-07-22 13:36:59.430972', false);


--
-- Data for Name: post_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (1, 11, 2, 0, '2026-07-22 03:52:14.036861');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (2, 12, 3, 0, '2026-07-22 03:52:14.036861');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (3, 13, 4, 0, '2026-07-22 03:52:14.036861');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (4, 14, 5, 0, '2026-07-22 03:52:14.036861');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (5, 11, 6, 1, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (6, 11, 7, 2, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (7, 11, 8, 3, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (8, 12, 9, 1, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (9, 12, 10, 2, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (10, 12, 11, 3, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (11, 13, 12, 1, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (12, 13, 13, 2, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (13, 13, 14, 3, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (14, 14, 15, 1, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (15, 14, 16, 2, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (16, 14, 17, 3, '2026-07-22 03:53:47.535603');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (17, 15, 18, 0, '2026-07-22 04:23:32.059159');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (18, 28, 19, 0, '2026-07-22 11:10:59.623955');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (19, 28, 20, 1, '2026-07-22 11:10:59.623959');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (20, 29, 21, 0, '2026-07-22 11:16:15.453291');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (21, 29, 22, 1, '2026-07-22 11:16:15.453294');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (22, 31, 23, 0, '2026-07-22 13:23:48.15163');
INSERT INTO public.post_attachments (id, post_id, media_id, sort_order, created_at) VALUES (23, 34, 24, 0, '2026-07-22 13:37:24.966188');


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 5, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 5, true);


--
-- Name: media_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.media_assets_id_seq', 24, true);


--
-- Name: post_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.post_attachments_id_seq', 23, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 37, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- PostgreSQL database dump complete
--

\unrestrict v5yPXfTYKPmD7pedOb2maBblOnSfJg0Oq3egpbjLRajJSg9e3VMpT8x7TI5Tv4v


--
-- Test bookmarks (스크랩한 글) for regular test user (id=2)
--
INSERT INTO bookmarks (user_id, post_id, created_at) VALUES
  (2, 18, '2026-06-23 10:00:00'),
  (2, 19, '2026-06-20 14:30:00'),
  (2, 20, '2026-06-15 09:10:00')
ON CONFLICT (user_id, post_id) DO NOTHING;

--
-- Privacy consent dates for test users (개인정보 수집 및 이용 동의)
--
UPDATE users SET privacy_consented_at = '2026-03-02 09:00:00', privacy_policy_version = '2026-07-12' WHERE id = 1 AND privacy_consented_at IS NULL;
UPDATE users SET privacy_consented_at = '2026-03-02 09:15:00', privacy_policy_version = '2026-07-12' WHERE id = 2 AND privacy_consented_at IS NULL;
