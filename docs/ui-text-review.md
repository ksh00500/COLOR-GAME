# Tango UI 문구 전체 검토본

- 다시 생성: `node scripts/extract-ui-copy.mjs`
- 번역 원문: 862개
- 코드 직접 표시 문구: 149개
- 동적 조합 문구 후보: 14개
- 번역 사전 누락 호출: 0개
- 검토 방법: 각 항목의 `수정안:` 뒤에 원하는 문구를 적거나, 유지할 항목에는 `유지`라고 적어 주세요.
- 이 파일은 검토용 자동 생성물입니다. 앱 코드는 이 파일을 직접 읽지 않습니다.

## 1. 우선 확인이 필요한 동적 문구

### R-001 리플레이 수 표시

- 현재 형식: `{{turn}} TURN · +{{earnedScore}} PT{{removalLabel}}`
- 현재 제거 라벨: 제거 대기 상태이면 항상 ` · 득점 연결`
- 문제 재현: 보드가 가득 차 마지막 색을 제거하는 0점 수에도 `+0 PT · 득점 연결`로 표시됨
- 코드 위치: `apps/web/src/pages/ReplayPage.tsx:194`
- 수정안:

### R-002 리플레이 시작 위치

- 현재 형식: `{{turn}} TURN · 시작 위치`
- 코드 위치: `apps/web/src/pages/ReplayPage.tsx:192`
- 수정안:

### R-003 리플레이 종료 위치

- 현재 형식: `대전 종료`
- 조건: 마지막 수 이후
- 코드 위치: `apps/web/src/pages/ReplayPage.tsx:154`
- 수정안:

## 2. 번역 사전의 한국어 원문

아래 항목은 웹과 Android 앱이 함께 사용하는 한국어 기준 문구입니다. `사용 위치 없음`은 동적 오류 코드이거나 현재 화면에서 직접 호출되지 않는 항목일 수 있습니다.

### T-0001

- 현재: 또는
- 위치: `apps/web/src/i18n.ts:8`
- 사용: `apps/web/src/pages/AccountPage.tsx:342`
- 수정안:

### T-0002

- 현재: Tango에서 사용할 닉네임을 정해주세요.
- 위치: `apps/web/src/i18n.ts:9`
- 사용: `apps/web/src/pages/AccountPage.tsx:350`
- 수정안:

### T-0003

- 현재: Google 계정으로 시작
- 위치: `apps/web/src/i18n.ts:10`
- 사용: `apps/web/src/pages/AccountPage.tsx:363`
- 수정안:

### T-0004

- 현재: 이미 같은 이메일의 Tango 계정이 있습니다.
- 위치: `apps/web/src/i18n.ts:11`
- 사용: `apps/web/src/pages/AccountPage.tsx:369`
- 수정안:

### T-0005

- 현재: 기존 비밀번호를 확인하면 Google 계정을 안전하게 연결합니다.
- 위치: `apps/web/src/i18n.ts:12`
- 사용: `apps/web/src/pages/AccountPage.tsx:370`
- 수정안:

### T-0006

- 현재: Google 계정 연결
- 위치: `apps/web/src/i18n.ts:13`
- 사용: `apps/web/src/pages/AccountPage.tsx:376`, `apps/web/src/pages/AccountPage.tsx:559`
- 수정안:

### T-0007

- 현재: Google 계정이 연결되어 있습니다.
- 위치: `apps/web/src/i18n.ts:14`
- 사용: 사용 위치 없음
- 수정안:

### T-0008

- 현재: Google 계정을 연결하면 더 간편하게 로그인할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:15`
- 사용: 사용 위치 없음
- 수정안:

### T-0009

- 현재: 연결 해제
- 위치: `apps/web/src/i18n.ts:16`
- 사용: `apps/web/src/pages/AccountPage.tsx:546`
- 수정안:

### T-0010

- 현재: Google 로그인을 다시 사용할 수 없으며 모든 데이터가 즉시 삭제됩니다.
- 위치: `apps/web/src/i18n.ts:17`
- 사용: `apps/web/src/pages/AccountPage.tsx:591`
- 수정안:

### T-0011

- 현재: GOOGLE_SIGN_IN_UNAVAILABLE
- 위치: `apps/web/src/i18n.ts:18`
- 사용: 사용 위치 없음
- 수정안:

### T-0012

- 현재: GOOGLE_SIGN_IN_FAILED
- 위치: `apps/web/src/i18n.ts:19`
- 사용: 사용 위치 없음
- 수정안:

### T-0013

- 현재: GOOGLE_SIGN_IN_CANCELED
- 위치: `apps/web/src/i18n.ts:20`
- 사용: 사용 위치 없음
- 수정안:

### T-0014

- 현재: INVALID_GOOGLE_TOKEN
- 위치: `apps/web/src/i18n.ts:21`
- 사용: 사용 위치 없음
- 수정안:

### T-0015

- 현재: GOOGLE_ALREADY_LINKED
- 위치: `apps/web/src/i18n.ts:22`
- 사용: 사용 위치 없음
- 수정안:

### T-0016

- 현재: LAST_AUTH_METHOD
- 위치: `apps/web/src/i18n.ts:23`
- 사용: 사용 위치 없음
- 수정안:

### T-0017

- 현재: 시행일: 2026년 7월 1일
- 위치: `apps/web/src/i18n.ts:24`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:18`
- 수정안:

### T-0018

- 현재: Tango는 계정 이용 시 이메일, 선택적으로 해시 처리된 비밀번호, Google 계정 식별자, 닉네임, 아바타, 레이팅, 전적, 출석 기록, 컬러 칩 잔액과 원장, 보유·장착·찜한 스킨, 파편·상자·제작 결과와 쿠폰 수령 기록을 처리합니다. 서비스 운영과 반복 보상 방지를 위해 서명된 익명 게스트 식별자, 접속 경로, 브라우저 정보를 처리할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:25`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:22`
- 수정안:

### T-0019

- 현재: 전송 구간은 HTTPS로 보호하며 비밀번호는 원문으로 저장하지 않습니다. Google 로그인을 선택하면 Google이 인증을 처리하며, 서버와 데이터베이스 운영을 위해 Amazon Web Services 인프라를 사용합니다.
- 위치: `apps/web/src/i18n.ts:26`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:37`
- 수정안:

### T-0020

- 현재: 플레이
- 위치: `apps/web/src/i18n.ts:27`
- 사용: `apps/web/src/components/AppSidebar.tsx:34`
- 수정안:

### T-0021

- 현재: 일반
- 위치: `apps/web/src/i18n.ts:28`
- 사용: `apps/web/src/components/AppSidebar.tsx:35`, `apps/web/src/pages/MatchmakingPage.tsx:171`
- 수정안:

### T-0022

- 현재: 경쟁
- 위치: `apps/web/src/i18n.ts:29`
- 사용: `apps/web/src/components/AppSidebar.tsx:36`, `apps/web/src/pages/MatchmakingPage.tsx:171`
- 수정안:

### T-0023

- 현재: 사설방
- 위치: `apps/web/src/i18n.ts:30`
- 사용: `apps/web/src/components/AppSidebar.tsx:37`
- 수정안:

### T-0024

- 현재: 리더보드
- 위치: `apps/web/src/i18n.ts:31`
- 사용: `apps/web/src/components/AppSidebar.tsx:39`
- 수정안:

### T-0025

- 현재: 계정
- 위치: `apps/web/src/i18n.ts:32`
- 사용: `apps/web/src/pages/LobbyPage.tsx:198`
- 수정안:

### T-0026

- 현재: 개인정보
- 위치: `apps/web/src/i18n.ts:33`
- 사용: `apps/web/src/components/AppSidebar.tsx:44`
- 수정안:

### T-0027

- 현재: 개인정보 처리방침
- 위치: `apps/web/src/i18n.ts:34`
- 사용: `apps/web/src/pages/AccountPage.tsx:564`, `apps/web/src/pages/PrivacyPage.tsx:17`
- 수정안:

### T-0028

- 현재: 패치노트
- 위치: `apps/web/src/i18n.ts:35`
- 사용: `apps/web/src/components/AppSidebar.tsx:41`, `apps/web/src/pages/LobbyPage.tsx:141`, `apps/web/src/pages/PatchNotesPage.tsx:21`
- 수정안:

### T-0029

- 현재: 패치노트 목록
- 위치: `apps/web/src/i18n.ts:36`
- 사용: `apps/web/src/pages/PatchNotesPage.tsx:25`
- 수정안:

### T-0030

- 현재: 설정
- 위치: `apps/web/src/i18n.ts:37`
- 사용: `apps/web/src/components/AppSidebar.tsx:30`, `apps/web/src/components/AppSidebar.tsx:45`, `apps/web/src/pages/GamePage.tsx:332`, `apps/web/src/pages/OnlineRoomPage.tsx:776`
- 수정안:

### T-0031

- 현재: 게임 설정
- 위치: `apps/web/src/i18n.ts:38`
- 사용: `apps/web/src/components/SettingsPanel.tsx:94`
- 수정안:

### T-0032

- 현재: 색 선택 키
- 위치: `apps/web/src/i18n.ts:39`
- 사용: `apps/web/src/components/SettingsPanel.tsx:182`
- 수정안:

### T-0033

- 현재: 세 색상에 사용할 단축키를 직접 지정합니다.
- 위치: `apps/web/src/i18n.ts:40`
- 사용: `apps/web/src/components/SettingsPanel.tsx:183`
- 수정안:

### T-0034

- 현재: 기본값 복원
- 위치: `apps/web/src/i18n.ts:41`
- 사용: `apps/web/src/components/SettingsPanel.tsx:194`
- 수정안:

### T-0035

- 현재: 1번 색
- 위치: `apps/web/src/i18n.ts:42`
- 사용: 사용 위치 없음
- 수정안:

### T-0036

- 현재: 2번 색
- 위치: `apps/web/src/i18n.ts:43`
- 사용: 사용 위치 없음
- 수정안:

### T-0037

- 현재: 3번 색
- 위치: `apps/web/src/i18n.ts:44`
- 사용: 사용 위치 없음
- 수정안:

### T-0038

- 현재: {slot} 단축키 변경
- 위치: `apps/web/src/i18n.ts:45`
- 사용: `apps/web/src/components/SettingsPanel.tsx:212`
- 수정안:

### T-0039

- 현재: 키 입력 대기
- 위치: `apps/web/src/i18n.ts:46`
- 사용: `apps/web/src/components/SettingsPanel.tsx:214`
- 수정안:

### T-0040

- 현재: 변경할 칸을 누른 다음 원하는 키를 입력하세요.
- 위치: `apps/web/src/i18n.ts:47`
- 사용: `apps/web/src/components/SettingsPanel.tsx:221`
- 수정안:

### T-0041

- 현재: 숫자 또는 영문 키만 사용할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:48`
- 사용: 사용 위치 없음
- 수정안:

### T-0042

- 현재: 이미 다른 색에 사용 중인 키입니다.
- 위치: `apps/web/src/i18n.ts:49`
- 사용: 사용 위치 없음
- 수정안:

### T-0043

- 현재: 현재 단축키: {keys}
- 위치: `apps/web/src/i18n.ts:50`
- 사용: `apps/web/src/components/ColorPicker.tsx:26`
- 수정안:

### T-0044

- 현재: 언어
- 위치: `apps/web/src/i18n.ts:51`
- 사용: `apps/web/src/components/SettingsPanel.tsx:103`
- 수정안:

### T-0045

- 현재: 브라우저 언어를 자동으로 사용합니다.
- 위치: `apps/web/src/i18n.ts:52`
- 사용: `apps/web/src/components/SettingsPanel.tsx:104`
- 수정안:

### T-0046

- 현재: 자동
- 위치: `apps/web/src/i18n.ts:53`
- 사용: 사용 위치 없음
- 수정안:

### T-0047

- 현재: 화면 테마
- 위치: `apps/web/src/i18n.ts:54`
- 사용: `apps/web/src/components/SettingsPanel.tsx:122`
- 수정안:

### T-0048

- 현재: 선택한 값은 이 기기에 저장됩니다.
- 위치: `apps/web/src/i18n.ts:55`
- 사용: `apps/web/src/components/SettingsPanel.tsx:123`
- 수정안:

### T-0049

- 현재: 시스템
- 위치: `apps/web/src/i18n.ts:56`
- 사용: 사용 위치 없음
- 수정안:

### T-0050

- 현재: 라이트
- 위치: `apps/web/src/i18n.ts:57`
- 사용: 사용 위치 없음
- 수정안:

### T-0051

- 현재: 다크
- 위치: `apps/web/src/i18n.ts:58`
- 사용: 사용 위치 없음
- 수정안:

### T-0052

- 현재: 색약 대응 팔레트
- 위치: `apps/web/src/i18n.ts:59`
- 사용: `apps/web/src/components/SettingsPanel.tsx:142`
- 수정안:

### T-0053

- 현재: 색상 간 명도와 대비를 넓힙니다.
- 위치: `apps/web/src/i18n.ts:60`
- 사용: `apps/web/src/components/SettingsPanel.tsx:143`
- 수정안:

### T-0054

- 현재: 타일 도형 표시
- 위치: `apps/web/src/i18n.ts:61`
- 사용: `apps/web/src/components/SettingsPanel.tsx:156`
- 수정안:

### T-0055

- 현재: 색약 대응 팔레트를 켰을 때만 원, 삼각형, 사각형을 표시합니다.
- 위치: `apps/web/src/i18n.ts:62`
- 사용: `apps/web/src/components/SettingsPanel.tsx:157`
- 수정안:

### T-0056

- 현재: 효과음
- 위치: `apps/web/src/i18n.ts:63`
- 사용: `apps/web/src/components/SettingsPanel.tsx:168`
- 수정안:

### T-0057

- 현재: 애니메이션
- 위치: `apps/web/src/i18n.ts:64`
- 사용: 사용 위치 없음
- 수정안:

### T-0058

- 현재: 전체
- 위치: `apps/web/src/i18n.ts:65`
- 사용: 사용 위치 없음
- 수정안:

### T-0059

- 현재: 감소
- 위치: `apps/web/src/i18n.ts:66`
- 사용: 사용 위치 없음
- 수정안:

### T-0060

- 현재: 끄기
- 위치: `apps/web/src/i18n.ts:67`
- 사용: 사용 위치 없음
- 수정안:

### T-0061

- 현재: 게임 연출 속도
- 위치: `apps/web/src/i18n.ts:68`
- 사용: `apps/web/src/components/SettingsPanel.tsx:228`
- 수정안:

### T-0062

- 현재: 기본
- 위치: `apps/web/src/i18n.ts:69`
- 사용: `apps/web/src/components/SettingsPanel.tsx:237`
- 수정안:

### T-0063

- 현재: 빠름
- 위치: `apps/web/src/i18n.ts:70`
- 사용: `apps/web/src/components/SettingsPanel.tsx:244`
- 수정안:

### T-0064

- 현재: 색을 이어 점수를 완성하세요
- 위치: `apps/web/src/i18n.ts:71`
- 사용: `apps/web/src/pages/LobbyPage.tsx:120`
- 수정안:

### T-0065

- 현재: 5×5 보드에서 같은 색 3개 이상을 만들면 점수를 얻습니다.
- 위치: `apps/web/src/i18n.ts:72`
- 사용: `apps/web/src/pages/LobbyPage.tsx:121`
- 수정안:

### T-0066

- 현재: 시작하세요
- 위치: `apps/web/src/i18n.ts:73`
- 사용: 사용 위치 없음
- 수정안:

### T-0067

- 현재: AI 대전을 시작하세요
- 위치: `apps/web/src/i18n.ts:74`
- 사용: 사용 위치 없음
- 수정안:

### T-0068

- 현재: 튜토리얼 보기
- 위치: `apps/web/src/i18n.ts:75`
- 사용: `apps/web/src/pages/LobbyPage.tsx:140`
- 수정안:

### T-0069

- 현재: 튜토리얼 닫기
- 위치: `apps/web/src/i18n.ts:76`
- 사용: 사용 위치 없음
- 수정안:

### T-0070

- 현재: 계정 연결됨
- 위치: `apps/web/src/i18n.ts:77`
- 사용: `apps/web/src/pages/LobbyPage.tsx:200`
- 수정안:

### T-0071

- 현재: 로그인하면 더 좋아요
- 위치: `apps/web/src/i18n.ts:78`
- 사용: `apps/web/src/pages/LobbyPage.tsx:200`
- 수정안:

### T-0072

- 현재: 전적과 출석을 확인하세요
- 위치: `apps/web/src/i18n.ts:79`
- 사용: `apps/web/src/pages/LobbyPage.tsx:201`
- 수정안:

### T-0073

- 현재: 로그인하고 랭크 기록을 저장하세요
- 위치: `apps/web/src/i18n.ts:80`
- 사용: `apps/web/src/pages/LobbyPage.tsx:201`
- 수정안:

### T-0074

- 현재: 경쟁전, 리더보드, 출석 보상은 계정과 함께 기록됩니다.
- 위치: `apps/web/src/i18n.ts:81`
- 사용: 사용 위치 없음
- 수정안:

### T-0075

- 현재: 계정 보기
- 위치: `apps/web/src/i18n.ts:82`
- 사용: 사용 위치 없음
- 수정안:

### T-0076

- 현재: 온라인 매칭
- 위치: `apps/web/src/i18n.ts:83`
- 사용: 사용 위치 없음
- 수정안:

### T-0077

- 현재: AI 대전
- 위치: `apps/web/src/i18n.ts:84`
- 사용: 사용 위치 없음
- 수정안:

### T-0078

- 현재: 일반 게임
- 위치: `apps/web/src/i18n.ts:85`
- 사용: 사용 위치 없음
- 수정안:

### T-0079

- 현재: 경쟁 게임
- 위치: `apps/web/src/i18n.ts:86`
- 사용: 사용 위치 없음
- 수정안:

### T-0080

- 현재: 바로 시작
- 위치: `apps/web/src/i18n.ts:87`
- 사용: `apps/web/src/pages/LobbyPage.tsx:189`
- 수정안:

### T-0081

- 현재: 방 만들기
- 위치: `apps/web/src/i18n.ts:88`
- 사용: `apps/web/src/pages/LobbyPage.tsx:189`
- 수정안:

### T-0082

- 현재: 매칭
- 위치: `apps/web/src/i18n.ts:89`
- 사용: `apps/web/src/pages/LobbyPage.tsx:189`
- 수정안:

### T-0083

- 현재: 나
- 위치: `apps/web/src/i18n.ts:90`
- 사용: `apps/web/src/pages/LobbyPage.tsx:178`
- 수정안:

### T-0084

- 현재: 랜덤
- 위치: `apps/web/src/i18n.ts:91`
- 사용: `apps/web/src/pages/LobbyPage.tsx:178`
- 수정안:

### T-0085

- 현재: 실시간
- 위치: `apps/web/src/i18n.ts:92`
- 사용: `apps/web/src/pages/LobbyPage.tsx:210`
- 수정안:

### T-0086

- 현재: 일간
- 위치: `apps/web/src/i18n.ts:93`
- 사용: `apps/web/src/components/EconomyQuestGrid.tsx:64`, `apps/web/src/pages/LobbyPage.tsx:214`
- 수정안:

### T-0087

- 현재: 월간
- 위치: `apps/web/src/i18n.ts:94`
- 사용: `apps/web/src/pages/LobbyPage.tsx:218`
- 수정안:

### T-0088

- 현재: 가볍게 만나는 일반 게임
- 위치: `apps/web/src/i18n.ts:95`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:151`
- 수정안:

### T-0089

- 현재: 레이팅이 걸린 경쟁 게임
- 위치: `apps/web/src/i18n.ts:96`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:151`
- 수정안:

### T-0090

- 현재: 서버 연결 중
- 위치: `apps/web/src/i18n.ts:97`
- 사용: 사용 위치 없음
- 수정안:

### T-0091

- 현재: 매칭을 시작할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:98`
- 사용: 사용 위치 없음
- 수정안:

### T-0092

- 현재: 상대를 찾는 중입니다.
- 위치: `apps/web/src/i18n.ts:99`
- 사용: 사용 위치 없음
- 수정안:

### T-0093

- 현재: 매칭 취소
- 위치: `apps/web/src/i18n.ts:100`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:177`
- 수정안:

### T-0094

- 현재: 일반 매칭 시작
- 위치: `apps/web/src/i18n.ts:101`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:180`
- 수정안:

### T-0095

- 현재: 경쟁 매칭 시작
- 위치: `apps/web/src/i18n.ts:102`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:180`
- 수정안:

### T-0096

- 현재: 대기 중
- 위치: `apps/web/src/i18n.ts:103`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:161`, `apps/web/src/pages/OnlineRoomPage.tsx:715`
- 수정안:

### T-0097

- 현재: 준비됨
- 위치: `apps/web/src/i18n.ts:104`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:161`
- 수정안:

### T-0098

- 현재: 현재 대기 {seconds}초
- 위치: `apps/web/src/i18n.ts:105`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:165`
- 수정안:

### T-0099

- 현재: 예상 약 {seconds}초
- 위치: `apps/web/src/i18n.ts:106`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:166`
- 수정안:

### T-0100

- 현재: 예상 시간 계산 중
- 위치: `apps/web/src/i18n.ts:107`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:166`
- 수정안:

### T-0101

- 현재: 게스트
- 위치: `apps/web/src/i18n.ts:108`
- 사용: 사용 위치 없음
- 수정안:

### T-0102

- 현재: {segment} 최근 {count}건 기준
- 위치: `apps/web/src/i18n.ts:109`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:169`
- 수정안:

### T-0103

- 현재: 전체 {mode} 최근 {count}건 기준
- 위치: `apps/web/src/i18n.ts:110`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:171`
- 수정안:

### T-0104

- 현재: 표본이 쌓이기 전 기본 예상치입니다.
- 위치: `apps/web/src/i18n.ts:111`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:172`
- 수정안:

### T-0105

- 현재: 최근 실제 매칭 시간을 기준으로 계산한 예상치입니다.
- 위치: `apps/web/src/i18n.ts:112`
- 사용: 사용 위치 없음
- 수정안:

### T-0106

- 현재: 닉네임
- 위치: `apps/web/src/i18n.ts:113`
- 사용: `apps/web/src/pages/AccountPage.tsx:323`, `apps/web/src/pages/AccountPage.tsx:352`
- 수정안:

### T-0107

- 현재: 사용할 플레이어 정보
- 위치: `apps/web/src/i18n.ts:114`
- 사용: 사용 위치 없음
- 수정안:

### T-0108

- 현재: 사설방 닉네임
- 위치: `apps/web/src/i18n.ts:115`
- 사용: 사용 위치 없음
- 수정안:

### T-0109

- 현재: 게스트 닉네임은 이 기기에서 자동으로 정해집니다.
- 위치: `apps/web/src/i18n.ts:116`
- 사용: 사용 위치 없음
- 수정안:

### T-0110

- 현재: Tango 계정의 닉네임을 사용합니다.
- 위치: `apps/web/src/i18n.ts:117`
- 사용: 사용 위치 없음
- 수정안:

### T-0111

- 현재: 아바타
- 위치: `apps/web/src/i18n.ts:118`
- 사용: `apps/web/src/pages/AccountPage.tsx:327`
- 수정안:

### T-0112

- 현재: 새 사설방 만들기
- 위치: `apps/web/src/i18n.ts:119`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:694`
- 수정안:

### T-0113

- 현재: 초대 코드
- 위치: `apps/web/src/i18n.ts:120`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:700`
- 수정안:

### T-0114

- 현재: 참가
- 위치: `apps/web/src/i18n.ts:121`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:704`
- 수정안:

### T-0115

- 현재: 초대 링크 공유
- 위치: `apps/web/src/i18n.ts:122`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:721`
- 수정안:

### T-0116

- 현재: 관전 링크 공유
- 위치: `apps/web/src/i18n.ts:123`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:722`, `apps/web/src/pages/OnlineRoomPage.tsx:872`, `apps/web/src/pages/SpectatePage.tsx:82`
- 수정안:

### T-0117

- 현재: 준비 완료
- 위치: `apps/web/src/i18n.ts:124`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:725`
- 수정안:

### T-0118

- 현재: 준비 취소
- 위치: `apps/web/src/i18n.ts:125`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:725`
- 수정안:

### T-0119

- 현재: 내 차례
- 위치: `apps/web/src/i18n.ts:126`
- 사용: `apps/web/src/pages/GamePage.tsx:313`, `apps/web/src/pages/OnlineRoomPage.tsx:747`
- 수정안:

### T-0120

- 현재: 대전 종료
- 위치: `apps/web/src/i18n.ts:127`
- 사용: `apps/web/src/pages/GamePage.tsx:311`, `apps/web/src/pages/OnlineRoomPage.tsx:745`
- 수정안:

### T-0121

- 현재: 로비
- 위치: `apps/web/src/i18n.ts:128`
- 사용: `apps/web/src/pages/GamePage.tsx:324`, `apps/web/src/pages/OnlineRoomPage.tsx:767`
- 수정안:

### T-0122

- 현재: 규칙
- 위치: `apps/web/src/i18n.ts:129`
- 사용: `apps/web/src/pages/GamePage.tsx:331`, `apps/web/src/pages/OnlineRoomPage.tsx:775`
- 수정안:

### T-0123

- 현재: 관전 공유
- 위치: `apps/web/src/i18n.ts:130`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:774`
- 수정안:

### T-0124

- 현재: 대전 포기
- 위치: `apps/web/src/i18n.ts:131`
- 사용: `apps/web/src/pages/GamePage.tsx:391`, `apps/web/src/pages/OnlineRoomPage.tsx:842`
- 수정안:

### T-0125

- 현재: 대전 리플레이 보기
- 위치: `apps/web/src/i18n.ts:132`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:910`
- 수정안:

### T-0126

- 현재: 로그인
- 위치: `apps/web/src/i18n.ts:133`
- 사용: `apps/web/src/pages/AccountPage.tsx:307`, `apps/web/src/pages/AccountPage.tsx:340`, `apps/web/src/pages/LobbyPage.tsx:204`, `apps/web/src/pages/StorePage.tsx:266`
- 수정안:

### T-0127

- 현재: 회원가입
- 위치: `apps/web/src/i18n.ts:134`
- 사용: `apps/web/src/pages/AccountPage.tsx:308`
- 수정안:

### T-0128

- 현재: 이메일
- 위치: `apps/web/src/i18n.ts:135`
- 사용: `apps/web/src/pages/AccountPage.tsx:312`
- 수정안:

### T-0129

- 현재: 비밀번호
- 위치: `apps/web/src/i18n.ts:136`
- 사용: `apps/web/src/pages/AccountPage.tsx:316`
- 수정안:

### T-0130

- 현재: 계정 만들기
- 위치: `apps/web/src/i18n.ts:137`
- 사용: `apps/web/src/pages/AccountPage.tsx:340`
- 수정안:

### T-0131

- 현재: Tango 계정 삭제
- 위치: `apps/web/src/i18n.ts:138`
- 사용: 사용 위치 없음
- 수정안:

### T-0132

- 현재: 로그인한 뒤 비밀번호를 확인하면 계정과 연결된 데이터를 삭제할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:139`
- 사용: 사용 위치 없음
- 수정안:

### T-0133

- 현재: 계정 삭제
- 위치: `apps/web/src/i18n.ts:140`
- 사용: `apps/web/src/pages/AccountPage.tsx:566`
- 수정안:

### T-0134

- 현재: 계정을 영구 삭제할까요?
- 위치: `apps/web/src/i18n.ts:141`
- 사용: `apps/web/src/pages/AccountPage.tsx:578`
- 수정안:

### T-0135

- 현재: 계정, 출석 기록, 연결된 경기 기록과 리플레이가 삭제되며 복구할 수 없습니다.
- 위치: `apps/web/src/i18n.ts:142`
- 사용: 사용 위치 없음
- 수정안:

### T-0136

- 현재: 현재 비밀번호
- 위치: `apps/web/src/i18n.ts:143`
- 사용: `apps/web/src/pages/AccountPage.tsx:372`, `apps/web/src/pages/AccountPage.tsx:555`, `apps/web/src/pages/AccountPage.tsx:582`
- 수정안:

### T-0137

- 현재: 취소
- 위치: `apps/web/src/i18n.ts:144`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:687`, `apps/web/src/components/TilePalettePanel.tsx:725`, `apps/web/src/pages/AccountPage.tsx:595`, `apps/web/src/pages/StorePage.tsx:770`
- 수정안:

### T-0138

- 현재: 삭제 처리 중
- 위치: `apps/web/src/i18n.ts:145`
- 사용: 사용 위치 없음
- 수정안:

### T-0139

- 현재: 영구 삭제
- 위치: `apps/web/src/i18n.ts:146`
- 사용: 사용 위치 없음
- 수정안:

### T-0140

- 현재: 계정이 삭제되었습니다.
- 위치: `apps/web/src/i18n.ts:147`
- 사용: 사용 위치 없음
- 수정안:

### T-0141

- 현재: 계정 삭제 요청을 처리하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:148`
- 사용: 사용 위치 없음
- 수정안:

### T-0142

- 현재: INVALID_PASSWORD
- 위치: `apps/web/src/i18n.ts:149`
- 사용: 사용 위치 없음
- 수정안:

### T-0143

- 현재: ACCOUNT_IN_ACTIVE_MATCH
- 위치: `apps/web/src/i18n.ts:150`
- 사용: 사용 위치 없음
- 수정안:

### T-0144

- 현재: 시행일: 2026년 6월 28일
- 위치: `apps/web/src/i18n.ts:151`
- 사용: 사용 위치 없음
- 수정안:

### T-0145

- 현재: 수집하는 정보
- 위치: `apps/web/src/i18n.ts:152`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:21`
- 수정안:

### T-0146

- 현재: Tango는 계정 이용 시 이메일, 해시 처리된 비밀번호, 닉네임, 아바타, 레이팅, 전적, 출석 기록을 처리합니다. 서비스 운영을 위해 익명 방문 식별자, 접속 경로, 브라우저 정보를 처리할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:153`
- 사용: 사용 위치 없음
- 수정안:

### T-0147

- 현재: 이용 목적
- 위치: `apps/web/src/i18n.ts:154`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:25`
- 수정안:

### T-0148

- 현재: 수집한 정보는 로그인, 온라인 대전, 전적과 리더보드, 출석 기능, 서비스 안정성 확인에만 사용합니다.
- 위치: `apps/web/src/i18n.ts:155`
- 사용: 사용 위치 없음
- 수정안:

### T-0149

- 현재: 보관과 삭제
- 위치: `apps/web/src/i18n.ts:156`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:29`
- 수정안:

### T-0150

- 현재: 계정 정보는 회원 탈퇴 전까지 보관합니다. 계정을 삭제하면 계정 정보, 출석 기록, 계정과 연결된 경기 기록과 리플레이가 삭제되며 복구할 수 없습니다. 계정과 연결되지 않은 집계형 매칭 시간과 익명 방문 통계는 서비스 운영 목적으로 남을 수 있습니다.
- 위치: `apps/web/src/i18n.ts:157`
- 사용: 사용 위치 없음
- 수정안:

### T-0151

- 현재: 계정 삭제 요청
- 위치: `apps/web/src/i18n.ts:158`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:32`
- 수정안:

### T-0152

- 현재: 보호와 처리 위탁
- 위치: `apps/web/src/i18n.ts:159`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:36`
- 수정안:

### T-0153

- 현재: 전송 구간은 HTTPS로 보호하며 비밀번호는 원문으로 저장하지 않습니다. 서버와 데이터베이스 운영을 위해 Amazon Web Services 인프라를 사용합니다.
- 위치: `apps/web/src/i18n.ts:160`
- 사용: 사용 위치 없음
- 수정안:

### T-0154

- 현재: 문의
- 위치: `apps/web/src/i18n.ts:161`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:40`
- 수정안:

### T-0155

- 현재: 지원 이메일은 정식 출시 전에 이 페이지와 Play Store 등록 정보에 추가됩니다.
- 위치: `apps/web/src/i18n.ts:162`
- 사용: 사용 위치 없음
- 수정안:

### T-0156

- 현재: 로그아웃
- 위치: `apps/web/src/i18n.ts:163`
- 사용: `apps/web/src/pages/AccountPage.tsx:565`
- 수정안:

### T-0157

- 현재: 레이팅
- 위치: `apps/web/src/i18n.ts:164`
- 사용: `apps/web/src/pages/AccountPage.tsx:390`
- 수정안:

### T-0158

- 현재: 경기
- 위치: `apps/web/src/i18n.ts:165`
- 사용: `apps/web/src/pages/AccountPage.tsx:392`
- 수정안:

### T-0159

- 현재: 승
- 위치: `apps/web/src/i18n.ts:166`
- 사용: `apps/web/src/pages/AccountPage.tsx:399`, `apps/web/src/pages/AccountPage.tsx:453`
- 수정안:

### T-0160

- 현재: 패
- 위치: `apps/web/src/i18n.ts:167`
- 사용: `apps/web/src/pages/AccountPage.tsx:400`, `apps/web/src/pages/AccountPage.tsx:454`
- 수정안:

### T-0161

- 현재: 연속 출석
- 위치: `apps/web/src/i18n.ts:168`
- 사용: 사용 위치 없음
- 수정안:

### T-0162

- 현재: 최장 출석
- 위치: `apps/web/src/i18n.ts:169`
- 사용: 사용 위치 없음
- 수정안:

### T-0163

- 현재: 최근 전적
- 위치: `apps/web/src/i18n.ts:170`
- 사용: `apps/web/src/pages/AccountPage.tsx:432`
- 수정안:

### T-0164

- 현재: 리플레이
- 위치: `apps/web/src/i18n.ts:171`
- 사용: `apps/web/src/pages/AccountPage.tsx:476`
- 수정안:

### T-0165

- 현재: 리플레이를 불러오는 중입니다.
- 위치: `apps/web/src/i18n.ts:172`
- 사용: 사용 위치 없음
- 수정안:

### T-0166

- 현재: 현재 수 공유
- 위치: `apps/web/src/i18n.ts:173`
- 사용: `apps/web/src/pages/ReplayPage.tsx:169`
- 수정안:

### T-0167

- 현재: 돌아가기
- 위치: `apps/web/src/i18n.ts:174`
- 사용: `apps/web/src/pages/ReplayPage.tsx:168`
- 수정안:

### T-0168

- 현재: 게임 시작
- 위치: `apps/web/src/i18n.ts:175`
- 사용: `apps/web/src/pages/ReplayPage.tsx:194`
- 수정안:

### T-0169

- 현재: 처음
- 위치: `apps/web/src/i18n.ts:176`
- 사용: `apps/web/src/pages/ReplayPage.tsx:225`
- 수정안:

### T-0170

- 현재: 이전 수
- 위치: `apps/web/src/i18n.ts:177`
- 사용: `apps/web/src/pages/ReplayPage.tsx:226`
- 수정안:

### T-0171

- 현재: 다음 수
- 위치: `apps/web/src/i18n.ts:178`
- 사용: `apps/web/src/pages/ReplayPage.tsx:227`
- 수정안:

### T-0172

- 현재: 마지막
- 위치: `apps/web/src/i18n.ts:179`
- 사용: `apps/web/src/pages/ReplayPage.tsx:228`
- 수정안:

### T-0173

- 현재: 리플레이 보기
- 위치: `apps/web/src/i18n.ts:180`
- 사용: `apps/web/src/pages/SpectatePage.tsx:84`
- 수정안:

### T-0174

- 현재: 경기 시작을 기다리는 중입니다.
- 위치: `apps/web/src/i18n.ts:181`
- 사용: 사용 위치 없음
- 수정안:

### T-0175

- 현재: 주요 메뉴
- 위치: `apps/web/src/i18n.ts:182`
- 사용: `apps/web/src/components/AppSidebar.tsx:23`, `apps/web/src/components/AppSidebar.tsx:27`
- 수정안:

### T-0176

- 현재: 설정 닫기
- 위치: `apps/web/src/i18n.ts:183`
- 사용: `apps/web/src/components/SettingsPanel.tsx:96`
- 수정안:

### T-0177

- 현재: 준비중
- 위치: `apps/web/src/i18n.ts:184`
- 사용: `apps/web/src/pages/LobbyPage.tsx:163`
- 수정안:

### T-0178

- 현재: 친구와 같은 색을 두고, 서로 다른 순간을 노리세요.
- 위치: `apps/web/src/i18n.ts:185`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:642`
- 수정안:

### T-0179

- 현재: 초대 코드를 공유하세요
- 위치: `apps/web/src/i18n.ts:186`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:716`
- 수정안:

### T-0180

- 현재: {name} 차례
- 위치: `apps/web/src/i18n.ts:187`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:748`
- 수정안:

### T-0181

- 현재: 서버가 수를 검증합니다.
- 위치: `apps/web/src/i18n.ts:188`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:820`
- 수정안:

### T-0182

- 현재: 상대의 수를 기다리는 중입니다.
- 위치: `apps/web/src/i18n.ts:189`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:820`
- 수정안:

### T-0183

- 현재: 상대 수를 기다리는 중입니다.
- 위치: `apps/web/src/i18n.ts:190`
- 사용: `apps/web/src/pages/GamePage.tsx:371`
- 수정안:

### T-0184

- 현재: 상대 차례
- 위치: `apps/web/src/i18n.ts:191`
- 사용: `apps/web/src/pages/GamePage.tsx:316`
- 수정안:

### T-0185

- 현재: 상대가 마지막으로 둔 칸
- 위치: `apps/web/src/i18n.ts:192`
- 사용: `apps/web/src/components/GameBoard.tsx:124`
- 수정안:

### T-0186

- 현재: 색상을 고르고 빈칸에 놓으세요.
- 위치: `apps/web/src/i18n.ts:193`
- 사용: `apps/web/src/pages/GamePage.tsx:371`
- 수정안:

### T-0187

- 현재: 게스트 플레이어
- 위치: `apps/web/src/i18n.ts:194`
- 사용: `apps/web/src/pages/GamePage.tsx:387`, `apps/web/src/pages/OnlineRoomPage.tsx:813`, `apps/web/src/pages/OnlineRoomPage.tsx:839`
- 수정안:

### T-0188

- 현재: 내 계정
- 위치: `apps/web/src/i18n.ts:195`
- 사용: `apps/web/src/pages/GamePage.tsx:387`, `apps/web/src/pages/OnlineRoomPage.tsx:839`
- 수정안:

### T-0189

- 현재: 게임을 포기하시겠습니까?
- 위치: `apps/web/src/i18n.ts:196`
- 사용: `apps/web/src/pages/GamePage.tsx:401`, `apps/web/src/pages/OnlineRoomPage.tsx:852`
- 수정안:

### T-0190

- 현재: 현재 대전은 패배로 종료됩니다.
- 위치: `apps/web/src/i18n.ts:197`
- 사용: `apps/web/src/pages/GamePage.tsx:402`
- 수정안:

### T-0191

- 현재: 계속하기
- 위치: `apps/web/src/i18n.ts:198`
- 사용: `apps/web/src/components/AttendanceCheckInModal.tsx:115`, `apps/web/src/pages/GamePage.tsx:404`, `apps/web/src/pages/OnlineRoomPage.tsx:855`
- 수정안:

### T-0192

- 현재: 기권하기
- 위치: `apps/web/src/i18n.ts:199`
- 사용: `apps/web/src/pages/GamePage.tsx:408`, `apps/web/src/pages/OnlineRoomPage.tsx:856`
- 수정안:

### T-0193

- 현재: 타일 색상 선택
- 위치: `apps/web/src/i18n.ts:200`
- 사용: `apps/web/src/components/ColorPicker.tsx:23`
- 수정안:

### T-0194

- 현재: 버건디
- 위치: `apps/web/src/i18n.ts:201`
- 사용: 사용 위치 없음
- 수정안:

### T-0195

- 현재: 네이비
- 위치: `apps/web/src/i18n.ts:202`
- 사용: 사용 위치 없음
- 수정안:

### T-0196

- 현재: 딥그린
- 위치: `apps/web/src/i18n.ts:203`
- 사용: 사용 위치 없음
- 수정안:

### T-0197

- 현재: 5×5 게임 보드
- 위치: `apps/web/src/i18n.ts:204`
- 사용: `apps/web/src/components/GameBoard.tsx:107`
- 수정안:

### T-0198

- 현재: {row}행 {col}열 빈칸, {color} 배치
- 위치: `apps/web/src/i18n.ts:205`
- 사용: `apps/web/src/components/GameBoard.tsx:122`
- 수정안:

### T-0199

- 현재: {row}행 {col}열 {color} 타일
- 위치: `apps/web/src/i18n.ts:206`
- 사용: `apps/web/src/components/GameBoard.tsx:123`
- 수정안:

### T-0200

- 현재: 연결을 완성하세요
- 위치: `apps/web/src/i18n.ts:207`
- 사용: `apps/web/src/components/HelpPanel.tsx:25`
- 수정안:

### T-0201

- 현재: 도움말 닫기
- 위치: `apps/web/src/i18n.ts:208`
- 사용: `apps/web/src/components/HelpPanel.tsx:27`
- 수정안:

### T-0202

- 현재: 공용 색상
- 위치: `apps/web/src/i18n.ts:209`
- 사용: `apps/web/src/components/HelpPanel.tsx:30`, `apps/web/src/components/TutorialPanel.tsx:248`
- 수정안:

### T-0203

- 현재: 세 색상은 양쪽 모두 자유롭게 사용합니다.
- 위치: `apps/web/src/i18n.ts:210`
- 사용: `apps/web/src/components/HelpPanel.tsx:30`
- 수정안:

### T-0204

- 현재: 마지막 한 수
- 위치: `apps/web/src/i18n.ts:211`
- 사용: `apps/web/src/components/HelpPanel.tsx:31`, `apps/web/src/components/TutorialPanel.tsx:248`
- 수정안:

### T-0205

- 현재: 연결을 완성한 플레이어가 점수를 얻습니다.
- 위치: `apps/web/src/i18n.ts:212`
- 사용: `apps/web/src/components/HelpPanel.tsx:31`
- 수정안:

### T-0206

- 현재: 방향별 합산
- 위치: `apps/web/src/i18n.ts:213`
- 사용: `apps/web/src/components/HelpPanel.tsx:32`
- 수정안:

### T-0207

- 현재: 한 타일로 가로와 세로를 만들면 두 점수를 모두 받습니다.
- 위치: `apps/web/src/i18n.ts:214`
- 사용: `apps/web/src/components/HelpPanel.tsx:32`
- 수정안:

### T-0208

- 현재: 보드 포화
- 위치: `apps/web/src/i18n.ts:215`
- 사용: `apps/web/src/components/HelpPanel.tsx:33`
- 수정안:

### T-0209

- 현재: 득점 없이 보드가 꽉 차면 마지막에 둔 색 타일만 사라집니다.
- 위치: `apps/web/src/i18n.ts:216`
- 사용: `apps/web/src/components/HelpPanel.tsx:33`
- 수정안:

### T-0210

- 현재: 득점에 사용된 타일은 제거되며, 중력과 연쇄 콤보는 없습니다.
- 위치: `apps/web/src/i18n.ts:217`
- 사용: `apps/web/src/components/HelpPanel.tsx:40`
- 수정안:

### T-0211

- 현재: 승리
- 위치: `apps/web/src/i18n.ts:218`
- 사용: 사용 위치 없음
- 수정안:

### T-0212

- 현재: 패배
- 위치: `apps/web/src/i18n.ts:219`
- 사용: 사용 위치 없음
- 수정안:

### T-0213

- 현재: 무승부
- 위치: `apps/web/src/i18n.ts:220`
- 사용: 사용 위치 없음
- 수정안:

### T-0214

- 현재: 전체 턴
- 위치: `apps/web/src/i18n.ts:221`
- 사용: `apps/web/src/components/ResultPanel.tsx:81`
- 수정안:

### T-0215

- 현재: 게임 시간
- 위치: `apps/web/src/i18n.ts:222`
- 사용: `apps/web/src/components/ResultPanel.tsx:82`
- 수정안:

### T-0216

- 현재: 메인으로
- 위치: `apps/web/src/i18n.ts:223`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:904`
- 수정안:

### T-0217

- 현재: 다시 하기
- 위치: `apps/web/src/i18n.ts:224`
- 사용: 사용 위치 없음
- 수정안:

### T-0218

- 현재: 새 방 만들기
- 위치: `apps/web/src/i18n.ts:225`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:898`
- 수정안:

### T-0219

- 현재: 완료
- 위치: `apps/web/src/i18n.ts:226`
- 사용: 사용 위치 없음
- 수정안:

### T-0220

- 현재: 처음 한 판을 위한 빠른 안내
- 위치: `apps/web/src/i18n.ts:227`
- 사용: `apps/web/src/components/TutorialPanel.tsx:205`
- 수정안:

### T-0221

- 현재: 빈칸에 색을 놓기
- 위치: `apps/web/src/i18n.ts:228`
- 사용: 사용 위치 없음
- 수정안:

### T-0222

- 현재: 내 차례에는 세 가지 공용 색상 중 하나를 고르고 5×5 보드의 빈칸에 둡니다.
- 위치: `apps/web/src/i18n.ts:229`
- 사용: 사용 위치 없음
- 수정안:

### T-0223

- 현재: 3개 이상 연결하기
- 위치: `apps/web/src/i18n.ts:230`
- 사용: 사용 위치 없음
- 수정안:

### T-0224

- 현재: 가로, 세로, 대각선으로 같은 색 3개 이상을 완성하면 점수를 얻고 해당 타일이 제거됩니다.
- 위치: `apps/web/src/i18n.ts:231`
- 사용: 사용 위치 없음
- 수정안:

### T-0225

- 현재: 상대 수 이어받기
- 위치: `apps/web/src/i18n.ts:232`
- 사용: 사용 위치 없음
- 수정안:

### T-0226

- 현재: 상대가 남긴 패턴도 내 수로 완성할 수 있습니다. 상대 턴이 끝나면 알림 효과가 내 차례를 알려줍니다.
- 위치: `apps/web/src/i18n.ts:233`
- 사용: 사용 위치 없음
- 수정안:

### T-0227

- 현재: 목표 점수 먼저 달성
- 위치: `apps/web/src/i18n.ts:234`
- 사용: 사용 위치 없음
- 수정안:

### T-0228

- 현재: 7점을 먼저 만들면 승리합니다. 득점 없이 보드가 꽉 차면 마지막에 둔 색 타일만 사라지고 대전은 계속됩니다.
- 위치: `apps/web/src/i18n.ts:235`
- 사용: 사용 위치 없음
- 수정안:

### T-0229

- 현재: 플레이 중
- 위치: `apps/web/src/i18n.ts:236`
- 사용: 사용 위치 없음
- 수정안:

### T-0230

- 현재: 색 선택
- 위치: `apps/web/src/i18n.ts:237`
- 사용: 사용 위치 없음
- 수정안:

### T-0231

- 현재: 건너뛰기
- 위치: `apps/web/src/i18n.ts:238`
- 사용: `apps/web/src/components/TutorialPanel.tsx:208`
- 수정안:

### T-0232

- 현재: 이전
- 위치: `apps/web/src/i18n.ts:239`
- 사용: `apps/web/src/components/TutorialPanel.tsx:292`, `apps/web/src/pages/StorePage.tsx:499`
- 수정안:

### T-0233

- 현재: 시작하기
- 위치: `apps/web/src/i18n.ts:240`
- 사용: `apps/web/src/components/TutorialPanel.tsx:305`
- 수정안:

### T-0234

- 현재: 다음
- 위치: `apps/web/src/i18n.ts:241`
- 사용: `apps/web/src/components/TutorialPanel.tsx:305`, `apps/web/src/pages/StorePage.tsx:508`
- 수정안:

### T-0235

- 현재: 나중에는 게임 화면의 규칙 버튼에서 핵심 규칙을 다시 볼 수 있습니다.
- 위치: `apps/web/src/i18n.ts:242`
- 사용: `apps/web/src/components/TutorialPanel.tsx:308`
- 수정안:

### T-0236

- 현재: 수순을 앞뒤로 이동하고 원하는 장면의 링크를 공유할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:243`
- 사용: `apps/web/src/pages/ReplayPage.tsx:165`
- 수정안:

### T-0237

- 현재: 현재 {turn}턴을 관전하고 있습니다.
- 위치: `apps/web/src/i18n.ts:244`
- 사용: `apps/web/src/pages/SpectatePage.tsx:79`
- 수정안:

### T-0238

- 현재: 대전이 종료되었습니다.
- 위치: `apps/web/src/i18n.ts:245`
- 사용: `apps/web/src/pages/SpectatePage.tsx:79`
- 수정안:

### T-0239

- 현재: 팔레트 티어와 순위를 확인하세요.
- 위치: `apps/web/src/i18n.ts:246`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:72`
- 수정안:

### T-0240

- 현재: 경쟁 게임 결과로 팔레트가 채워집니다. 보라 팔레트를 완성한 상위 50명은 무지개 팔레트를 얻습니다.
- 위치: `apps/web/src/i18n.ts:247`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:73`
- 수정안:

### T-0241

- 현재: 티어 순서
- 위치: `apps/web/src/i18n.ts:248`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:79`
- 수정안:

### T-0242

- 현재: 전체 순위
- 위치: `apps/web/src/i18n.ts:249`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:105`, `apps/web/src/pages/LeaderboardPage.tsx:109`
- 수정안:

### T-0243

- 현재: 빈 팔레트
- 위치: `apps/web/src/i18n.ts:250`
- 사용: 사용 위치 없음
- 수정안:

### T-0244

- 현재: 레드
- 위치: `apps/web/src/i18n.ts:251`
- 사용: 사용 위치 없음
- 수정안:

### T-0245

- 현재: 오렌지
- 위치: `apps/web/src/i18n.ts:252`
- 사용: 사용 위치 없음
- 수정안:

### T-0246

- 현재: 옐로
- 위치: `apps/web/src/i18n.ts:253`
- 사용: 사용 위치 없음
- 수정안:

### T-0247

- 현재: 그린
- 위치: `apps/web/src/i18n.ts:254`
- 사용: 사용 위치 없음
- 수정안:

### T-0248

- 현재: 블루
- 위치: `apps/web/src/i18n.ts:255`
- 사용: 사용 위치 없음
- 수정안:

### T-0249

- 현재: 보라
- 위치: `apps/web/src/i18n.ts:256`
- 사용: 사용 위치 없음
- 수정안:

### T-0250

- 현재: 무지개
- 위치: `apps/web/src/i18n.ts:257`
- 사용: 사용 위치 없음
- 수정안:

### T-0251

- 현재: {wins}승 {losses}패 · {rate}%
- 위치: `apps/web/src/i18n.ts:258`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:123`
- 수정안:

### T-0252

- 현재: 팔레트 티어 {tier}, 레이팅 {rating}
- 위치: `apps/web/src/i18n.ts:259`
- 사용: `apps/web/src/components/RankBadge.tsx:106`
- 수정안:

### T-0253

- 현재: 팔레트 티어 {tier} · {rating}
- 위치: `apps/web/src/i18n.ts:260`
- 사용: `apps/web/src/components/RankBadge.tsx:107`
- 수정안:

### T-0254

- 현재: 경쟁 게임은 로그인한 플레이어만 참가할 수 있습니다. 결과는 레이팅과 전적에 반영됩니다.
- 위치: `apps/web/src/i18n.ts:261`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:154`
- 수정안:

### T-0255

- 현재: 매칭 큐에 들어가면 부담 없이 다른 플레이어와 자동으로 방이 만들어집니다.
- 위치: `apps/web/src/i18n.ts:262`
- 사용: `apps/web/src/pages/MatchmakingPage.tsx:155`
- 수정안:

### T-0256

- 현재: 상대 턴 알림과 게임 효과음을 켜거나 끕니다.
- 위치: `apps/web/src/i18n.ts:263`
- 사용: `apps/web/src/components/SettingsPanel.tsx:169`
- 수정안:

### T-0257

- 현재: 움직임과 전환 효과의 강도를 조절합니다.
- 위치: `apps/web/src/i18n.ts:264`
- 사용: 사용 위치 없음
- 수정안:

### T-0258

- 현재: 빠름은 효과를 없애지 않고 시간을 줄입니다.
- 위치: `apps/web/src/i18n.ts:265`
- 사용: `apps/web/src/components/SettingsPanel.tsx:229`
- 수정안:

### T-0259

- 현재: 전적과 레이팅은 계정에 저장됩니다.
- 위치: `apps/web/src/i18n.ts:266`
- 사용: 사용 위치 없음
- 수정안:

### T-0260

- 현재: 경쟁 게임은 로그인한 플레이어만 참가할 수 있습니다. 계정에는 전적, 레이팅, 최근 경기 기록이 저장됩니다.
- 위치: `apps/web/src/i18n.ts:267`
- 사용: 사용 위치 없음
- 수정안:

### T-0261

- 현재: {days}일
- 위치: `apps/web/src/i18n.ts:268`
- 사용: 사용 위치 없음
- 수정안:

### T-0262

- 현재: 아직 기록된 경기가 없습니다.
- 위치: `apps/web/src/i18n.ts:269`
- 사용: `apps/web/src/pages/AccountPage.tsx:459`
- 수정안:

### T-0263

- 현재: 게임을 준비하고 있습니다
- 위치: `apps/web/src/i18n.ts:270`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:615`
- 수정안:

### T-0264

- 현재: 매칭으로 돌아가기
- 위치: `apps/web/src/i18n.ts:271`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:623`
- 수정안:

### T-0265

- 현재: 방을 만들면 6자리 초대 코드가 생성됩니다. 두 플레이어가 모두 준비하면 서버가 선공, 턴, 점수, 승패를 처리합니다.
- 위치: `apps/web/src/i18n.ts:272`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:643`
- 수정안:

### T-0266

- 현재: 온라인 상대
- 위치: `apps/web/src/i18n.ts:273`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:814`
- 수정안:

### T-0267

- 현재: 연결 끊김
- 위치: `apps/web/src/i18n.ts:274`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:811`
- 수정안:

### T-0268

- 현재: 현재 온라인 대전은 패배로 종료됩니다.
- 위치: `apps/web/src/i18n.ts:275`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:853`
- 수정안:

### T-0269

- 현재: Tango 초대
- 위치: `apps/web/src/i18n.ts:276`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:568`, `apps/web/src/pages/OnlineRoomPage.tsx:584`
- 수정안:

### T-0270

- 현재: Tango 관전
- 위치: `apps/web/src/i18n.ts:277`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:568`, `apps/web/src/pages/OnlineRoomPage.tsx:584`, `apps/web/src/pages/SpectatePage.tsx:53`
- 수정안:

### T-0271

- 현재: Tango 리플레이
- 위치: `apps/web/src/i18n.ts:278`
- 사용: `apps/web/src/pages/ReplayPage.tsx:129`
- 수정안:

### T-0272

- 현재: 초대 링크로 대전에 참가하세요.
- 위치: `apps/web/src/i18n.ts:279`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:569`, `apps/web/src/pages/OnlineRoomPage.tsx:585`
- 수정안:

### T-0273

- 현재: 진행 중인 대전을 함께 보세요.
- 위치: `apps/web/src/i18n.ts:280`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:569`, `apps/web/src/pages/OnlineRoomPage.tsx:585`, `apps/web/src/pages/SpectatePage.tsx:53`
- 수정안:

### T-0274

- 현재: {step}번째 수를 확인해 보세요.
- 위치: `apps/web/src/i18n.ts:281`
- 사용: `apps/web/src/pages/ReplayPage.tsx:130`
- 수정안:

### T-0275

- 현재: 초대 링크를 복사했습니다.
- 위치: `apps/web/src/i18n.ts:282`
- 사용: 사용 위치 없음
- 수정안:

### T-0276

- 현재: 관전 링크를 복사했습니다.
- 위치: `apps/web/src/i18n.ts:283`
- 사용: 사용 위치 없음
- 수정안:

### T-0277

- 현재: 현재 수의 공유 링크를 복사했습니다.
- 위치: `apps/web/src/i18n.ts:284`
- 사용: 사용 위치 없음
- 수정안:

### T-0278

- 현재: 공유했습니다.
- 위치: `apps/web/src/i18n.ts:285`
- 사용: 사용 위치 없음
- 수정안:

### T-0279

- 현재: 공유를 완료하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:286`
- 사용: 사용 위치 없음
- 수정안:

### T-0280

- 현재: 관전 서버에 연결하는 중입니다.
- 위치: `apps/web/src/i18n.ts:287`
- 사용: 사용 위치 없음
- 수정안:

### T-0281

- 현재: 관전할 방을 찾지 못했습니다.
- 위치: `apps/web/src/i18n.ts:288`
- 사용: 사용 위치 없음
- 수정안:

### T-0282

- 현재: 관전 서버에 연결하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:289`
- 사용: 사용 위치 없음
- 수정안:

### T-0283

- 현재: 리플레이를 불러오지 못했습니다.
- 위치: `apps/web/src/i18n.ts:290`
- 사용: 사용 위치 없음
- 수정안:

### T-0284

- 현재: 플레이어 1
- 위치: `apps/web/src/i18n.ts:291`
- 사용: `apps/web/src/pages/ReplayPage.tsx:174`, `apps/web/src/pages/SpectatePage.tsx:89`
- 수정안:

### T-0285

- 현재: 플레이어 2
- 위치: `apps/web/src/i18n.ts:292`
- 사용: `apps/web/src/pages/ReplayPage.tsx:233`, `apps/web/src/pages/SpectatePage.tsx:106`
- 수정안:

### T-0286

- 현재: 리플레이 수순
- 위치: `apps/web/src/i18n.ts:293`
- 사용: `apps/web/src/pages/ReplayPage.tsx:203`
- 수정안:

### T-0287

- 현재: 재생
- 위치: `apps/web/src/i18n.ts:294`
- 사용: `apps/web/src/pages/ReplayPage.tsx:155`
- 수정안:

### T-0288

- 현재: 일시정지
- 위치: `apps/web/src/i18n.ts:295`
- 사용: `apps/web/src/pages/ReplayPage.tsx:152`
- 수정안:

### T-0289

- 현재: 처음부터 재생
- 위치: `apps/web/src/i18n.ts:296`
- 사용: `apps/web/src/pages/ReplayPage.tsx:154`
- 수정안:

### T-0290

- 현재: 재생 속도
- 위치: `apps/web/src/i18n.ts:297`
- 사용: `apps/web/src/pages/ReplayPage.tsx:210`
- 수정안:

### T-0291

- 현재: 득점 연결
- 위치: `apps/web/src/i18n.ts:298`
- 사용: `apps/web/src/pages/ReplayPage.tsx:195`
- 수정안:

### T-0292

- 현재: 온라인 대전 정보
- 위치: `apps/web/src/i18n.ts:299`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:803`
- 수정안:

### T-0293

- 현재: 대전 정보
- 위치: `apps/web/src/i18n.ts:300`
- 사용: `apps/web/src/pages/GamePage.tsx:358`
- 수정안:

### T-0294

- 현재: 연결 점수
- 위치: `apps/web/src/i18n.ts:301`
- 사용: `apps/web/src/components/HelpPanel.tsx:35`, `apps/web/src/components/TutorialPanel.tsx:266`
- 수정안:

### T-0295

- 현재: {points}점
- 위치: `apps/web/src/i18n.ts:302`
- 사용: `apps/web/src/components/HelpPanel.tsx:36`, `apps/web/src/components/HelpPanel.tsx:37`, `apps/web/src/components/HelpPanel.tsx:38`, `apps/web/src/components/TutorialPanel.tsx:267`, `apps/web/src/components/TutorialPanel.tsx:268`, `apps/web/src/components/TutorialPanel.tsx:269`
- 수정안:

### T-0296

- 현재: {score}/{target}점
- 위치: `apps/web/src/i18n.ts:303`
- 사용: `apps/web/src/components/PlayerCard.tsx:53`
- 수정안:

### T-0297

- 현재: {seconds}초 남음
- 위치: `apps/web/src/i18n.ts:304`
- 사용: `apps/web/src/components/PlayerCard.tsx:61`
- 수정안:

### T-0298

- 현재: AI 대전 설정
- 위치: `apps/web/src/i18n.ts:305`
- 사용: `apps/web/src/pages/LobbyPage.tsx:146`
- 수정안:

### T-0299

- 현재: Easy·Normal·Hard 세 가지 AI 난이도를 플레이할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:306`
- 사용: 사용 위치 없음
- 수정안:

### T-0300

- 현재: 아직 준비중입니다.
- 위치: `apps/web/src/i18n.ts:307`
- 사용: `apps/web/src/pages/LobbyPage.tsx:156`, `apps/web/src/pages/LobbyPage.tsx:157`
- 수정안:

### T-0301

- 현재: 선공 설정
- 위치: `apps/web/src/i18n.ts:308`
- 사용: `apps/web/src/pages/LobbyPage.tsx:169`
- 수정안:

### T-0302

- 현재: 선공
- 위치: `apps/web/src/i18n.ts:309`
- 사용: `apps/web/src/pages/LobbyPage.tsx:170`
- 수정안:

### T-0303

- 현재: 게임 모드
- 위치: `apps/web/src/i18n.ts:310`
- 사용: `apps/web/src/pages/LobbyPage.tsx:133`, `apps/web/src/pages/LobbyPage.tsx:137`, `apps/web/src/pages/LobbyPage.tsx:184`
- 수정안:

### T-0304

- 현재: 접속자 현황
- 위치: `apps/web/src/i18n.ts:311`
- 사용: `apps/web/src/pages/LobbyPage.tsx:208`
- 수정안:

### T-0305

- 현재: 숫자키 1 · 2 · 3
- 위치: `apps/web/src/i18n.ts:312`
- 사용: 사용 위치 없음
- 수정안:

### T-0306

- 현재: 숫자키 1 · 2 · 3 또는 Q · W · E
- 위치: `apps/web/src/i18n.ts:313`
- 사용: 사용 위치 없음
- 수정안:

### T-0307

- 현재: 핵심 규칙 먼저 보기
- 위치: `apps/web/src/i18n.ts:314`
- 사용: 사용 위치 없음
- 수정안:

### T-0308

- 현재: 세 색상은 공용이며, 연결을 완성한 플레이어가 점수를 얻습니다. 한 수가 여러 방향을 완성하면 점수도 함께 합산됩니다.
- 위치: `apps/web/src/i18n.ts:315`
- 사용: 사용 위치 없음
- 수정안:

### T-0309

- 현재: 세 색상은 모두 공용입니다
- 위치: `apps/web/src/i18n.ts:316`
- 사용: 사용 위치 없음
- 수정안:

### T-0310

- 현재: 이 게임에는 내 색과 상대 색이 따로 없습니다. 빨강, 파랑, 초록은 양쪽 플레이어가 모두 사용할 수 있어요.
- 위치: `apps/web/src/i18n.ts:317`
- 사용: 사용 위치 없음
- 수정안:

### T-0311

- 현재: 상대가 둔 색도 내가 이어서 점수를 낼 수 있습니다.
- 위치: `apps/web/src/i18n.ts:318`
- 사용: 사용 위치 없음
- 수정안:

### T-0312

- 현재: 색을 고르는 순간부터 상대의 흐름까지 같이 보세요.
- 위치: `apps/web/src/i18n.ts:319`
- 사용: 사용 위치 없음
- 수정안:

### T-0313

- 현재: 점수는 마지막 한 수가 가져갑니다
- 위치: `apps/web/src/i18n.ts:320`
- 사용: 사용 위치 없음
- 수정안:

### T-0314

- 현재: 이미 놓인 타일이 누구 것이었는지는 중요하지 않습니다. 연결을 완성하는 마지막 한 수를 둔 플레이어가 점수를 얻습니다.
- 위치: `apps/web/src/i18n.ts:321`
- 사용: 사용 위치 없음
- 수정안:

### T-0315

- 현재: 상대가 빨강 2개를 만들어도, 내가 빨강을 하나 더 놓아 3개를 만들면 내가 1점입니다.
- 위치: `apps/web/src/i18n.ts:322`
- 사용: 사용 위치 없음
- 수정안:

### T-0316

- 현재: 가로, 세로, 대각선을 연결하세요
- 위치: `apps/web/src/i18n.ts:323`
- 사용: 사용 위치 없음
- 수정안:

### T-0317

- 현재: 같은 색을 가로, 세로, 대각선 중 한 방향으로 3개 이상 연결하면 점수가 납니다.
- 위치: `apps/web/src/i18n.ts:324`
- 사용: 사용 위치 없음
- 수정안:

### T-0318

- 현재: 3개 연결은 1점, 4개 연결은 2점, 5개 연결은 4점입니다.
- 위치: `apps/web/src/i18n.ts:325`
- 사용: 사용 위치 없음
- 수정안:

### T-0319

- 현재: 한 수로 여러 방향을 동시에 만들 수 있습니다
- 위치: `apps/web/src/i18n.ts:326`
- 사용: 사용 위치 없음
- 수정안:

### T-0320

- 현재: 방금 둔 타일 하나가 가로와 세로, 또는 대각선까지 동시에 완성하면 각 방향의 점수를 모두 받습니다.
- 위치: `apps/web/src/i18n.ts:327`
- 사용: 사용 위치 없음
- 수정안:

### T-0321

- 현재: 예를 들어 가로 3개와 세로 3개를 한 번에 만들면 1점 + 1점 = 2점입니다.
- 위치: `apps/web/src/i18n.ts:328`
- 사용: 사용 위치 없음
- 수정안:

### T-0322

- 현재: 득점에 사용된 타일은 사라집니다
- 위치: `apps/web/src/i18n.ts:329`
- 사용: 사용 위치 없음
- 수정안:

### T-0323

- 현재: 점수에 사용된 타일은 보드에서 제거됩니다. 위에 있던 타일이 떨어지는 중력이나 자동 연쇄 콤보는 없습니다.
- 위치: `apps/web/src/i18n.ts:330`
- 사용: 사용 위치 없음
- 수정안:

### T-0324

- 현재: 사라진 빈칸은 다음 턴부터 다시 사용할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:331`
- 사용: 사용 위치 없음
- 수정안:

### T-0325

- 현재: 보드가 꽉 차면 마지막 색이 정리됩니다
- 위치: `apps/web/src/i18n.ts:332`
- 사용: 사용 위치 없음
- 수정안:

### T-0326

- 현재: 아무도 점수를 내지 못한 채 보드가 꽉 차면, 마지막에 둔 색과 같은 타일만 사라집니다.
- 위치: `apps/web/src/i18n.ts:333`
- 사용: 사용 위치 없음
- 수정안:

### T-0327

- 현재: 마지막으로 파랑을 뒀다면 보드 위의 파랑 타일들이 제거되고 게임이 계속됩니다.
- 위치: `apps/web/src/i18n.ts:334`
- 사용: 사용 위치 없음
- 수정안:

### T-0328

- 현재: 먼저 7점을 만들면 승리합니다
- 위치: `apps/web/src/i18n.ts:335`
- 사용: 사용 위치 없음
- 수정안:

### T-0329

- 현재: 상대가 만든 흐름을 읽고 마지막 한 수를 가져가세요. 먼저 7점에 도달하는 플레이어가 승리합니다.
- 위치: `apps/web/src/i18n.ts:336`
- 사용: 사용 위치 없음
- 수정안:

### T-0330

- 현재: 상대의 색까지 내 전략이 되는 순간, Tango가 시작됩니다.
- 위치: `apps/web/src/i18n.ts:337`
- 사용: 사용 위치 없음
- 수정안:

### T-0331

- 현재: 예시
- 위치: `apps/web/src/i18n.ts:338`
- 사용: `apps/web/src/components/TutorialPanel.tsx:215`
- 수정안:

### T-0332

- 현재: 예시 상황
- 위치: `apps/web/src/i18n.ts:339`
- 사용: `apps/web/src/components/TutorialPanel.tsx:245`
- 수정안:

### T-0333

- 현재: 승리 조건
- 위치: `apps/web/src/i18n.ts:340`
- 사용: `apps/web/src/components/TutorialPanel.tsx:245`
- 수정안:

### T-0334

- 현재: 가득 차기 직전
- 위치: `apps/web/src/i18n.ts:341`
- 사용: 사용 위치 없음
- 수정안:

### T-0335

- 현재: 마지막 색 제거 후
- 위치: `apps/web/src/i18n.ts:342`
- 사용: `apps/web/src/components/TutorialPanel.tsx:229`
- 수정안:

### T-0336

- 현재: 튜토리얼 진행도
- 위치: `apps/web/src/i18n.ts:343`
- 사용: `apps/web/src/components/TutorialPanel.tsx:274`
- 수정안:

### T-0337

- 현재: 튜토리얼
- 위치: `apps/web/src/i18n.ts:344`
- 사용: `apps/web/src/components/SettingsPanel.tsx:251`
- 수정안:

### T-0338

- 현재: 튜토리얼 다시 보기
- 위치: `apps/web/src/i18n.ts:345`
- 사용: `apps/web/src/components/SettingsPanel.tsx:262`
- 수정안:

### T-0339

- 현재: 게임 방법과 점수 규칙을 처음부터 다시 확인합니다.
- 위치: `apps/web/src/i18n.ts:346`
- 사용: `apps/web/src/components/SettingsPanel.tsx:252`
- 수정안:

### T-0340

- 현재: {step}단계로 이동
- 위치: `apps/web/src/i18n.ts:347`
- 사용: `apps/web/src/components/TutorialPanel.tsx:280`
- 수정안:

### T-0341

- 현재: {name} 플레이어가 목표 점수에 먼저 도달했습니다.
- 위치: `apps/web/src/i18n.ts:348`
- 사용: 사용 위치 없음
- 수정안:

### T-0342

- 현재: 첫 게임 안내
- 위치: `apps/web/src/i18n.ts:349`
- 사용: 사용 위치 없음
- 수정안:

### T-0343

- 현재: 규칙은 여기
- 위치: `apps/web/src/i18n.ts:350`
- 사용: 사용 위치 없음
- 수정안:

### T-0344

- 현재: 점수표와 보드 포화 규칙을 언제든 다시 볼 수 있어요.
- 위치: `apps/web/src/i18n.ts:351`
- 사용: 사용 위치 없음
- 수정안:

### T-0345

- 현재: 빈칸을 클릭
- 위치: `apps/web/src/i18n.ts:352`
- 사용: 사용 위치 없음
- 수정안:

### T-0346

- 현재: 고른 색을 5×5 보드의 빈칸에 놓습니다.
- 위치: `apps/web/src/i18n.ts:353`
- 사용: 사용 위치 없음
- 수정안:

### T-0347

- 현재: 세 색은 둘 다 사용할 수 있고 숫자키 1·2·3도 됩니다.
- 위치: `apps/web/src/i18n.ts:354`
- 사용: 사용 위치 없음
- 수정안:

### T-0348

- 현재: AI · 쉬운 전술
- 위치: `apps/web/src/i18n.ts:355`
- 사용: 사용 위치 없음
- 수정안:

### T-0349

- 현재: AI · 학습 모델
- 위치: `apps/web/src/i18n.ts:356`
- 사용: 사용 위치 없음
- 수정안:

### T-0350

- 현재: 계정 요청을 처리하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:357`
- 사용: 사용 위치 없음
- 수정안:

### T-0351

- 현재: 리더보드를 불러오지 못했습니다.
- 위치: `apps/web/src/i18n.ts:358`
- 사용: 사용 위치 없음
- 수정안:

### T-0352

- 현재: 팔레트 티어 구성
- 위치: `apps/web/src/i18n.ts:359`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:76`
- 수정안:

### T-0353

- 현재: 매칭 서버에 연결하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:360`
- 사용: 사용 위치 없음
- 수정안:

### T-0354

- 현재: 경쟁 게임은 로그인이 필요합니다.
- 위치: `apps/web/src/i18n.ts:361`
- 사용: 사용 위치 없음
- 수정안:

### T-0355

- 현재: 매칭에 참가하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:362`
- 사용: 사용 위치 없음
- 수정안:

### T-0356

- 현재: 매칭을 취소했습니다.
- 위치: `apps/web/src/i18n.ts:363`
- 사용: 사용 위치 없음
- 수정안:

### T-0357

- 현재: REQUEST_FAILED
- 위치: `apps/web/src/i18n.ts:364`
- 사용: 사용 위치 없음
- 수정안:

### T-0358

- 현재: DATABASE_DISABLED
- 위치: `apps/web/src/i18n.ts:365`
- 사용: 사용 위치 없음
- 수정안:

### T-0359

- 현재: ACCOUNT_EXISTS
- 위치: `apps/web/src/i18n.ts:366`
- 사용: 사용 위치 없음
- 수정안:

### T-0360

- 현재: INVALID_CREDENTIALS
- 위치: `apps/web/src/i18n.ts:367`
- 사용: 사용 위치 없음
- 수정안:

### T-0361

- 현재: UNAUTHORIZED
- 위치: `apps/web/src/i18n.ts:368`
- 사용: 사용 위치 없음
- 수정안:

### T-0362

- 현재: PROFILE_NOT_FOUND
- 위치: `apps/web/src/i18n.ts:369`
- 사용: 사용 위치 없음
- 수정안:

### T-0363

- 현재: REPLAY_NOT_FOUND
- 위치: `apps/web/src/i18n.ts:370`
- 사용: 사용 위치 없음
- 수정안:

### T-0364

- 현재: LOGIN_REQUIRED
- 위치: `apps/web/src/i18n.ts:371`
- 사용: 사용 위치 없음
- 수정안:

### T-0365

- 현재: ROOM_NOT_FOUND
- 위치: `apps/web/src/i18n.ts:372`
- 사용: 사용 위치 없음
- 수정안:

### T-0366

- 현재: ROOM_FULL
- 위치: `apps/web/src/i18n.ts:373`
- 사용: 사용 위치 없음
- 수정안:

### T-0367

- 현재: PLAYER_NOT_IN_ROOM
- 위치: `apps/web/src/i18n.ts:374`
- 사용: 사용 위치 없음
- 수정안:

### T-0368

- 현재: NOT_YOUR_TURN
- 위치: `apps/web/src/i18n.ts:375`
- 사용: 사용 위치 없음
- 수정안:

### T-0369

- 현재: CELL_NOT_EMPTY
- 위치: `apps/web/src/i18n.ts:376`
- 사용: 사용 위치 없음
- 수정안:

### T-0370

- 현재: TURN_TIME_EXPIRED
- 위치: `apps/web/src/i18n.ts:377`
- 사용: 사용 위치 없음
- 수정안:

### T-0371

- 현재: 레이팅 {rating} 미만
- 위치: `apps/web/src/i18n.ts:378`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:92`
- 수정안:

### T-0372

- 현재: 레이팅 {rating}+
- 위치: `apps/web/src/i18n.ts:379`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:95`
- 수정안:

### T-0373

- 현재: 레이팅 {rating}+ · 상위 {count}명
- 위치: `apps/web/src/i18n.ts:380`
- 사용: `apps/web/src/pages/LeaderboardPage.tsx:94`
- 수정안:

### T-0374

- 현재: 첫 번째 색을 채웁니다.
- 위치: `apps/web/src/i18n.ts:381`
- 사용: 사용 위치 없음
- 수정안:

### T-0375

- 현재: 두 번째 색을 채웁니다.
- 위치: `apps/web/src/i18n.ts:382`
- 사용: 사용 위치 없음
- 수정안:

### T-0376

- 현재: 세 번째 색을 채웁니다.
- 위치: `apps/web/src/i18n.ts:383`
- 사용: 사용 위치 없음
- 수정안:

### T-0377

- 현재: 네 번째 색을 채웁니다.
- 위치: `apps/web/src/i18n.ts:384`
- 사용: 사용 위치 없음
- 수정안:

### T-0378

- 현재: 다섯 번째 색을 채웁니다.
- 위치: `apps/web/src/i18n.ts:385`
- 사용: 사용 위치 없음
- 수정안:

### T-0379

- 현재: 여섯 번째 색을 채웁니다.
- 위치: `apps/web/src/i18n.ts:386`
- 사용: 사용 위치 없음
- 수정안:

### T-0380

- 현재: 일곱 색을 모두 채웁니다.
- 위치: `apps/web/src/i18n.ts:387`
- 사용: 사용 위치 없음
- 수정안:

### T-0381

- 현재: 처음 시작하면 이 상태입니다.
- 위치: `apps/web/src/i18n.ts:388`
- 사용: 사용 위치 없음
- 수정안:

### T-0382

- 현재: 보라 완성 후 랭킹 보상입니다.
- 위치: `apps/web/src/i18n.ts:389`
- 사용: 사용 위치 없음
- 수정안:

### T-0383

- 현재: 매칭 정보를 찾지 못했습니다. 다시 매칭을 시작해 주세요.
- 위치: `apps/web/src/i18n.ts:390`
- 사용: 사용 위치 없음
- 수정안:

### T-0384

- 현재: 온라인 서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해 주세요.
- 위치: `apps/web/src/i18n.ts:391`
- 사용: 사용 위치 없음
- 수정안:

### T-0385

- 현재: 매칭 정보를 동기화하고 있습니다.
- 위치: `apps/web/src/i18n.ts:392`
- 사용: 사용 위치 없음
- 수정안:

### T-0386

- 현재: 게임 서버에 연결하고 있습니다.
- 위치: `apps/web/src/i18n.ts:393`
- 사용: 사용 위치 없음
- 수정안:

### T-0387

- 현재: 게임 서버와 다시 연결하고 있습니다.
- 위치: `apps/web/src/i18n.ts:394`
- 사용: 사용 위치 없음
- 수정안:

### T-0388

- 현재: 방 생성 중
- 위치: `apps/web/src/i18n.ts:395`
- 사용: 사용 위치 없음
- 수정안:

### T-0389

- 현재: 방 참가 중
- 위치: `apps/web/src/i18n.ts:396`
- 사용: 사용 위치 없음
- 수정안:

### T-0390

- 현재: 준비 상태 변경 중
- 위치: `apps/web/src/i18n.ts:397`
- 사용: 사용 위치 없음
- 수정안:

### T-0391

- 현재: 수 전송 중
- 위치: `apps/web/src/i18n.ts:398`
- 사용: 사용 위치 없음
- 수정안:

### T-0392

- 현재: 기권 처리 중
- 위치: `apps/web/src/i18n.ts:399`
- 사용: 사용 위치 없음
- 수정안:

### T-0393

- 현재: 경기를 유지한 채 링크를 복사할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:400`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:873`
- 수정안:

### T-0394

- 현재: 공유 링크
- 위치: `apps/web/src/i18n.ts:401`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:876`
- 수정안:

### T-0395

- 현재: 닫기
- 위치: `apps/web/src/i18n.ts:402`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:575`, `apps/web/src/pages/OnlineRoomPage.tsx:882`
- 수정안:

### T-0396

- 현재: 링크 복사
- 위치: `apps/web/src/i18n.ts:403`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:883`
- 수정안:

### T-0397

- 현재: 공유 링크를 직접 선택해 복사해 주세요.
- 위치: `apps/web/src/i18n.ts:404`
- 사용: 사용 위치 없음
- 수정안:

### T-0398

- 현재: 새로운 변경사항
- 위치: `apps/web/src/i18n.ts:405`
- 사용: 사용 위치 없음
- 수정안:

### T-0399

- 현재: 패치노트 닫기
- 위치: `apps/web/src/i18n.ts:406`
- 사용: `apps/web/src/components/PatchNotesPanel.tsx:351`
- 수정안:

### T-0400

- 현재: 업데이트 기록을 버전별로 확인할 수 있습니다. 항목을 누르면 상세 내용이 열립니다.
- 위치: `apps/web/src/i18n.ts:407`
- 사용: `apps/web/src/pages/PatchNotesPage.tsx:22`
- 수정안:

### T-0401

- 현재: 상세 보기
- 위치: `apps/web/src/i18n.ts:408`
- 사용: `apps/web/src/pages/PatchNotesPage.tsx:37`
- 수정안:

### T-0402

- 현재: 온보딩과 AI 난이도 정리
- 위치: `apps/web/src/i18n.ts:409`
- 사용: 사용 위치 없음
- 수정안:

### T-0403

- 현재: 튜토리얼을 실제 규칙 이해 중심으로 다시 쓰고, AI 난이도와 로그인 접근성을 정리한 패치입니다.
- 위치: `apps/web/src/i18n.ts:410`
- 사용: 사용 위치 없음
- 수정안:

### T-0404

- 현재: 튜토리얼 7단계 개편
- 위치: `apps/web/src/i18n.ts:411`
- 사용: 사용 위치 없음
- 수정안:

### T-0405

- 현재: 공용 색상, 마지막 한 수 득점, 방향별 점수, 동시 득점, 타일 제거, 보드 포화, 승리 조건을 보드 예시와 함께 순서대로 설명하도록 바꿨습니다.
- 위치: `apps/web/src/i18n.ts:412`
- 사용: 사용 위치 없음
- 수정안:

### T-0406

- 현재: 보드 포화 예시 보강
- 위치: `apps/web/src/i18n.ts:413`
- 사용: 사용 위치 없음
- 수정안:

### T-0407

- 현재: 보드가 꽉 찼을 때 마지막 색이 제거되는 규칙을 이해하기 쉽도록 제거 직전과 제거 후 상태를 나란히 보여줍니다.
- 위치: `apps/web/src/i18n.ts:414`
- 사용: 사용 위치 없음
- 수정안:

### T-0408

- 현재: 이번 패치에서는 안내 흐름, AI 난이도, 로그인 접근성을 정리했습니다.
- 위치: `apps/web/src/i18n.ts:415`
- 사용: 사용 위치 없음
- 수정안:

### T-0409

- 현재: 튜토리얼 개편
- 위치: `apps/web/src/i18n.ts:416`
- 사용: 사용 위치 없음
- 수정안:

### T-0410

- 현재: 규칙 요약과 점수 구조를 먼저 보여주고, 첫 게임에서는 클릭하면 사라지는 코치마크로 핵심 조작을 안내합니다.
- 위치: `apps/web/src/i18n.ts:417`
- 사용: 사용 위치 없음
- 수정안:

### T-0411

- 현재: AI 난이도 재정리
- 위치: `apps/web/src/i18n.ts:418`
- 사용: 사용 위치 없음
- 수정안:

### T-0412

- 현재: Easy는 더 편하게 이길 수 있도록 낮추고, 기존 Hard 학습 모델은 Normal로 이동했습니다. Hard는 다음 모델까지 잠금 상태입니다.
- 위치: `apps/web/src/i18n.ts:419`
- 사용: 사용 위치 없음
- 수정안:

### T-0413

- 현재: Easy는 더 쉽게 낮추고, 기존 Hard 학습 모델을 Normal로 이동했습니다. Hard는 다음 고난도 모델 준비 전까지 잠금 상태입니다.
- 위치: `apps/web/src/i18n.ts:420`
- 사용: 사용 위치 없음
- 수정안:

### T-0414

- 현재: 로그인 접근성 개선
- 위치: `apps/web/src/i18n.ts:421`
- 사용: 사용 위치 없음
- 수정안:

### T-0415

- 현재: 메인 로그인 카드 추가
- 위치: `apps/web/src/i18n.ts:422`
- 사용: 사용 위치 없음
- 수정안:

### T-0416

- 현재: 메인 화면에서 로그인과 계정 진입이 더 잘 보이도록 계정 카드를 추가했습니다.
- 위치: `apps/web/src/i18n.ts:423`
- 사용: 사용 위치 없음
- 수정안:

### T-0417

- 현재: 메인 화면에서 로그인과 계정 진입이 더 잘 보이도록 계정 카드를 추가했습니다. 경쟁전, 리더보드, 출석 기록 안내도 함께 표시합니다.
- 위치: `apps/web/src/i18n.ts:424`
- 사용: 사용 위치 없음
- 수정안:

### T-0418

- 현재: 동시 로그인 방지
- 위치: `apps/web/src/i18n.ts:425`
- 사용: 사용 위치 없음
- 수정안:

### T-0419

- 현재: 같은 계정은 마지막 로그인만 유지되며, 이전 탭과 기기의 세션은 자동으로 만료됩니다.
- 위치: `apps/web/src/i18n.ts:426`
- 사용: 사용 위치 없음
- 수정안:

### T-0420

- 현재: 확인했어요
- 위치: `apps/web/src/i18n.ts:427`
- 사용: `apps/web/src/components/CosmeticOutcomeModal.tsx:52`, `apps/web/src/components/EconomyAccountPanel.tsx:186`, `apps/web/src/components/PatchNotesPanel.tsx:370`
- 수정안:

### T-0421

- 현재: 다시 뽑기
- 위치: `apps/web/src/i18n.ts:428`
- 사용: `apps/web/src/components/CosmeticOutcomeModal.tsx:55`
- 수정안:

### T-0422

- 현재: 파편을 합성해 새로운 스킨을 완성했습니다.
- 위치: `apps/web/src/i18n.ts:429`
- 사용: 사용 위치 없음
- 수정안:

### T-0423

- 현재: 새로 획득한 스킨
- 위치: `apps/web/src/i18n.ts:430`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:655`
- 수정안:

### T-0424

- 현재: 더보기
- 위치: `apps/web/src/i18n.ts:431`
- 사용: 사용 위치 없음
- 수정안:

### T-0425

- 현재: 접기
- 위치: `apps/web/src/i18n.ts:432`
- 사용: 사용 위치 없음
- 수정안:

### T-0426

- 현재: 무
- 위치: `apps/web/src/i18n.ts:433`
- 사용: `apps/web/src/pages/AccountPage.tsx:401`, `apps/web/src/pages/AccountPage.tsx:455`
- 수정안:

### T-0427

- 현재: 경쟁전 승패무
- 위치: `apps/web/src/i18n.ts:434`
- 사용: `apps/web/src/pages/AccountPage.tsx:452`
- 수정안:

### T-0428

- 현재: 상점
- 위치: `apps/web/src/i18n.ts:435`
- 사용: `apps/web/src/components/AppSidebar.tsx:28`, `apps/web/src/components/AppSidebar.tsx:38`
- 수정안:

### T-0429

- 현재: 마이
- 위치: `apps/web/src/i18n.ts:436`
- 사용: 사용 위치 없음
- 수정안:

### T-0430

- 현재: 색을 모으고 나만의 Tango를 만드세요.
- 위치: `apps/web/src/i18n.ts:437`
- 사용: 사용 위치 없음
- 수정안:

### T-0431

- 현재: 매주 바뀌는 스킨을 컬러 칩으로 구매하거나 팔레트 상자에서 파편을 모을 수 있습니다.
- 위치: `apps/web/src/i18n.ts:438`
- 사용: 사용 위치 없음
- 수정안:

### T-0432

- 현재: 컬러 칩
- 위치: `apps/web/src/i18n.ts:439`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:167`, `apps/web/src/pages/StorePage.tsx:248`, `apps/web/src/pages/StorePage.tsx:672`
- 수정안:

### T-0433

- 현재: 컬러 칩 잔액
- 위치: `apps/web/src/i18n.ts:440`
- 사용: `apps/web/src/pages/StorePage.tsx:246`
- 수정안:

### T-0434

- 현재: 상점을 불러오는 중입니다.
- 위치: `apps/web/src/i18n.ts:441`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:56`, `apps/web/src/pages/StorePage.tsx:254`
- 수정안:

### T-0435

- 현재: 상점을 불러오지 못했습니다.
- 위치: `apps/web/src/i18n.ts:442`
- 사용: 사용 위치 없음
- 수정안:

### T-0436

- 현재: 로그인하고 상점을 이용하세요.
- 위치: `apps/web/src/i18n.ts:443`
- 사용: `apps/web/src/pages/StorePage.tsx:264`
- 수정안:

### T-0437

- 현재: 컬러 칩과 스킨은 Tango 계정에 안전하게 저장됩니다.
- 위치: `apps/web/src/i18n.ts:444`
- 사용: `apps/web/src/pages/StorePage.tsx:265`
- 수정안:

### T-0438

- 현재: 이번 주 스킨
- 위치: `apps/web/src/i18n.ts:445`
- 사용: 사용 위치 없음
- 수정안:

### T-0439

- 현재: {date}에 변경
- 위치: `apps/web/src/i18n.ts:446`
- 사용: `apps/web/src/pages/StorePage.tsx:299`
- 수정안:

### T-0440

- 현재: common
- 위치: `apps/web/src/i18n.ts:447`
- 사용: 사용 위치 없음
- 수정안:

### T-0441

- 현재: rare
- 위치: `apps/web/src/i18n.ts:448`
- 사용: 사용 위치 없음
- 수정안:

### T-0442

- 현재: epic
- 위치: `apps/web/src/i18n.ts:449`
- 사용: 사용 위치 없음
- 수정안:

### T-0443

- 현재: legendary
- 위치: `apps/web/src/i18n.ts:450`
- 사용: 사용 위치 없음
- 수정안:

### T-0444

- 현재: tile
- 위치: `apps/web/src/i18n.ts:451`
- 사용: 사용 위치 없음
- 수정안:

### T-0445

- 현재: board
- 위치: `apps/web/src/i18n.ts:452`
- 사용: 사용 위치 없음
- 수정안:

### T-0446

- 현재: score_effect
- 위치: `apps/web/src/i18n.ts:453`
- 사용: 사용 위치 없음
- 수정안:

### T-0447

- 현재: victory_effect
- 위치: `apps/web/src/i18n.ts:454`
- 사용: 사용 위치 없음
- 수정안:

### T-0448

- 현재: profile_frame
- 위치: `apps/web/src/i18n.ts:455`
- 사용: 사용 위치 없음
- 수정안:

### T-0449

- 현재: 보유 중
- 위치: `apps/web/src/i18n.ts:456`
- 사용: `apps/web/src/pages/StorePage.tsx:228`
- 수정안:

### T-0450

- 현재: {chips} 칩
- 위치: `apps/web/src/i18n.ts:457`
- 사용: 사용 위치 없음
- 수정안:

### T-0451

- 현재: {name} 스킨을 구매했습니다.
- 위치: `apps/web/src/i18n.ts:458`
- 사용: `apps/web/src/pages/StorePage.tsx:109`
- 수정안:

### T-0452

- 현재: 구매를 처리하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:459`
- 사용: 사용 위치 없음
- 수정안:

### T-0453

- 현재: 팔레트 상자
- 위치: `apps/web/src/i18n.ts:460`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:169`
- 수정안:

### T-0454

- 현재: 등급별 파편 또는 완성 스킨 하나를 획득합니다. 파편 4개를 모으면 같은 등급의 미보유 스킨을 얻습니다.
- 위치: `apps/web/src/i18n.ts:461`
- 사용: 사용 위치 없음
- 수정안:

### T-0455

- 현재: {chips} 칩으로 열기
- 위치: `apps/web/src/i18n.ts:462`
- 사용: 사용 위치 없음
- 수정안:

### T-0456

- 현재: 획득 확률 보기
- 위치: `apps/web/src/i18n.ts:463`
- 사용: `apps/web/src/pages/StorePage.tsx:687`
- 수정안:

### T-0457

- 현재: 파편
- 위치: `apps/web/src/i18n.ts:464`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:171`
- 수정안:

### T-0458

- 현재: 스킨
- 위치: `apps/web/src/i18n.ts:465`
- 사용: 사용 위치 없음
- 수정안:

### T-0459

- 현재: 쿠폰 등록
- 위치: `apps/web/src/i18n.ts:466`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:134`
- 수정안:

### T-0460

- 현재: 쿠폰 코드를 입력해 보상을 받으세요.
- 위치: `apps/web/src/i18n.ts:467`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:135`
- 수정안:

### T-0461

- 현재: 쿠폰 코드
- 위치: `apps/web/src/i18n.ts:468`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:141`
- 수정안:

### T-0462

- 현재: 등록
- 위치: `apps/web/src/i18n.ts:469`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:146`
- 수정안:

### T-0463

- 현재: 처리 중
- 위치: `apps/web/src/i18n.ts:470`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:146`
- 수정안:

### T-0464

- 현재: 상자 이용권으로 열기 ({count}개 보유)
- 위치: `apps/web/src/i18n.ts:471`
- 사용: 사용 위치 없음
- 수정안:

### T-0465

- 현재: COUPON_NOT_FOUND
- 위치: `apps/web/src/i18n.ts:472`
- 사용: 사용 위치 없음
- 수정안:

### T-0466

- 현재: COUPON_ALREADY_REDEEMED
- 위치: `apps/web/src/i18n.ts:473`
- 사용: 사용 위치 없음
- 수정안:

### T-0467

- 현재: COUPON_EXPIRED
- 위치: `apps/web/src/i18n.ts:474`
- 사용: 사용 위치 없음
- 수정안:

### T-0468

- 현재: COUPON_INACTIVE
- 위치: `apps/web/src/i18n.ts:475`
- 사용: 사용 위치 없음
- 수정안:

### T-0469

- 현재: COUPON_NOT_STARTED
- 위치: `apps/web/src/i18n.ts:476`
- 사용: 사용 위치 없음
- 수정안:

### T-0470

- 현재: COUPON_LIMIT_REACHED
- 위치: `apps/web/src/i18n.ts:477`
- 사용: 사용 위치 없음
- 수정안:

### T-0471

- 현재: 쿠폰 보상
- 위치: `apps/web/src/i18n.ts:478`
- 사용: 사용 위치 없음
- 수정안:

### T-0472

- 현재: 마이 Tango에서 쿠폰 코드를 등록해 컬러 칩, 팔레트 상자, 파편과 스킨 보상을 받을 수 있습니다.
- 위치: `apps/web/src/i18n.ts:479`
- 사용: 사용 위치 없음
- 수정안:

### T-0473

- 현재: 상자를 열지 못했습니다.
- 위치: `apps/web/src/i18n.ts:480`
- 사용: 사용 위치 없음
- 수정안:

### T-0474

- 현재: 창립자 팩과 프리미엄
- 위치: `apps/web/src/i18n.ts:481`
- 사용: `apps/web/src/pages/StorePage.tsx:706`
- 수정안:

### T-0475

- 현재: 정식 출시일이 정해지면 창립자 팩이 30일 동안 열립니다. 현재는 미리보기만 제공됩니다.
- 위치: `apps/web/src/i18n.ts:482`
- 사용: `apps/web/src/pages/StorePage.tsx:707`
- 수정안:

### T-0476

- 현재: 정식 출시 전 잠금
- 위치: `apps/web/src/i18n.ts:483`
- 사용: `apps/web/src/pages/StorePage.tsx:708`
- 수정안:

### T-0477

- 현재: 창립자 한정 보드·타일·배지
- 위치: `apps/web/src/i18n.ts:484`
- 사용: 사용 위치 없음
- 수정안:

### T-0478

- 현재: 프리미엄 커스텀 사설방 설정
- 위치: `apps/web/src/i18n.ts:485`
- 사용: 사용 위치 없음
- 수정안:

### T-0479

- 현재: 시간·목표 점수·관전 설정
- 위치: `apps/web/src/i18n.ts:486`
- 사용: `apps/web/src/pages/StorePage.tsx:713`
- 수정안:

### T-0480

- 현재: {rarity} 파편 1개
- 위치: `apps/web/src/i18n.ts:487`
- 사용: `apps/web/src/components/CosmeticOutcomeModal.tsx:44`
- 수정안:

### T-0481

- 현재: 새로운 스킨을 획득했습니다.
- 위치: `apps/web/src/i18n.ts:488`
- 사용: 사용 위치 없음
- 수정안:

### T-0482

- 현재: 같은 등급 파편 4개를 모아 스킨을 합성하세요.
- 위치: `apps/web/src/i18n.ts:489`
- 사용: `apps/web/src/components/CosmeticOutcomeModal.tsx:49`
- 수정안:

### T-0483

- 현재: 컬러 칩과 내 스킨
- 위치: `apps/web/src/i18n.ts:490`
- 사용: 사용 위치 없음
- 수정안:

### T-0484

- 현재: 신규 계정 보상
- 위치: `apps/web/src/i18n.ts:491`
- 사용: 사용 위치 없음
- 수정안:

### T-0485

- 현재: 오늘의 출석
- 위치: `apps/web/src/i18n.ts:492`
- 사용: 사용 위치 없음
- 수정안:

### T-0486

- 현재: 오늘의 출석 체크
- 위치: `apps/web/src/i18n.ts:493`
- 사용: 사용 위치 없음
- 수정안:

### T-0487

- 현재: 출석 완료!
- 위치: `apps/web/src/i18n.ts:494`
- 사용: 사용 위치 없음
- 수정안:

### T-0488

- 현재: 출석하고 컬러 칩을 받으세요.
- 위치: `apps/web/src/i18n.ts:495`
- 사용: 사용 위치 없음
- 수정안:

### T-0489

- 현재: 컬러 칩 {chips}개를 받았습니다.
- 위치: `apps/web/src/i18n.ts:496`
- 사용: 사용 위치 없음
- 수정안:

### T-0490

- 현재: 현재 연속 출석
- 위치: `apps/web/src/i18n.ts:497`
- 사용: 사용 위치 없음
- 수정안:

### T-0491

- 현재: 이번 주 출석
- 위치: `apps/web/src/i18n.ts:498`
- 사용: `apps/web/src/components/AttendanceCheckInModal.tsx:96`, `apps/web/src/pages/AccountPage.tsx:403`
- 수정안:

### T-0492

- 현재: {count}회
- 위치: `apps/web/src/i18n.ts:499`
- 사용: `apps/web/src/components/AttendanceCheckInModal.tsx:97`, `apps/web/src/pages/AccountPage.tsx:404`
- 수정안:

### T-0493

- 현재: 이번 주 {count}번째 출석 보상
- 위치: `apps/web/src/i18n.ts:500`
- 사용: `apps/web/src/components/AttendanceCheckInModal.tsx:99`
- 수정안:

### T-0494

- 현재: 이번 주 출석 진행도
- 위치: `apps/web/src/i18n.ts:501`
- 사용: `apps/web/src/components/AttendanceCheckInModal.tsx:101`
- 수정안:

### T-0495

- 현재: 최근 출석
- 위치: `apps/web/src/i18n.ts:502`
- 사용: `apps/web/src/pages/AccountPage.tsx:407`
- 수정안:

### T-0496

- 현재: 7일마다 추가 20칩
- 위치: `apps/web/src/i18n.ts:503`
- 사용: 사용 위치 없음
- 수정안:

### T-0497

- 현재: 7일 출석 진행도
- 위치: `apps/web/src/i18n.ts:504`
- 사용: 사용 위치 없음
- 수정안:

### T-0498

- 현재: 출석하기
- 위치: `apps/web/src/i18n.ts:505`
- 사용: `apps/web/src/components/AttendanceCheckInModal.tsx:123`
- 수정안:

### T-0499

- 현재: 나중에
- 위치: `apps/web/src/i18n.ts:506`
- 사용: `apps/web/src/components/AttendanceCheckInModal.tsx:120`
- 수정안:

### T-0500

- 현재: 온라인 대전 보상
- 위치: `apps/web/src/i18n.ts:507`
- 사용: 사용 위치 없음
- 수정안:

### T-0501

- 현재: 오늘의 첫 승리
- 위치: `apps/web/src/i18n.ts:508`
- 사용: 사용 위치 없음
- 수정안:

### T-0502

- 현재: 받기
- 위치: `apps/web/src/i18n.ts:509`
- 사용: 사용 위치 없음
- 수정안:

### T-0503

- 현재: 진행 중
- 위치: `apps/web/src/i18n.ts:510`
- 사용: 사용 위치 없음
- 수정안:

### T-0504

- 현재: 등급별 파편
- 위치: `apps/web/src/i18n.ts:511`
- 사용: 사용 위치 없음
- 수정안:

### T-0505

- 현재: 합성
- 위치: `apps/web/src/i18n.ts:512`
- 사용: 사용 위치 없음
- 수정안:

### T-0506

- 현재: 보유 스킨
- 위치: `apps/web/src/i18n.ts:513`
- 사용: 사용 위치 없음
- 수정안:

### T-0507

- 현재: 아직 보유한 스킨이 없습니다. 상점에서 첫 스킨을 만나보세요.
- 위치: `apps/web/src/i18n.ts:514`
- 사용: 사용 위치 없음
- 수정안:

### T-0508

- 현재: 장착 중
- 위치: `apps/web/src/i18n.ts:515`
- 사용: `apps/web/src/pages/StorePage.tsx:219`
- 수정안:

### T-0509

- 현재: 장착
- 위치: `apps/web/src/i18n.ts:516`
- 사용: `apps/web/src/pages/StorePage.tsx:219`
- 수정안:

### T-0510

- 현재: {name} 스킨을 획득했습니다.
- 위치: `apps/web/src/i18n.ts:517`
- 사용: 사용 위치 없음
- 수정안:

### T-0511

- 현재: 보상을 받지 못했습니다.
- 위치: `apps/web/src/i18n.ts:518`
- 사용: 사용 위치 없음
- 수정안:

### T-0512

- 현재: 파편을 합성하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:519`
- 사용: 사용 위치 없음
- 수정안:

### T-0513

- 현재: 스킨을 장착하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:520`
- 사용: 사용 위치 없음
- 수정안:

### T-0514

- 현재: INSUFFICIENT_CHIPS
- 위치: `apps/web/src/i18n.ts:521`
- 사용: 사용 위치 없음
- 수정안:

### T-0515

- 현재: NOT_ENOUGH_FRAGMENTS
- 위치: `apps/web/src/i18n.ts:522`
- 사용: 사용 위치 없음
- 수정안:

### T-0516

- 현재: QUEST_ALREADY_CLAIMED
- 위치: `apps/web/src/i18n.ts:523`
- 사용: 사용 위치 없음
- 수정안:

### T-0517

- 현재: COSMETIC_ALREADY_OWNED
- 위치: `apps/web/src/i18n.ts:524`
- 사용: 사용 위치 없음
- 수정안:

### T-0518

- 현재: NO_UNOWNED_COSMETICS
- 위치: `apps/web/src/i18n.ts:525`
- 사용: 사용 위치 없음
- 수정안:

### T-0519

- 현재: ECONOMY_REQUEST_FAILED
- 위치: `apps/web/src/i18n.ts:526`
- 사용: 사용 위치 없음
- 수정안:

### T-0520

- 현재: 커스텀 방 설정
- 위치: `apps/web/src/i18n.ts:527`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:648`
- 수정안:

### T-0521

- 현재: 목표 점수
- 위치: `apps/web/src/i18n.ts:528`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:650`
- 수정안:

### T-0522

- 현재: 턴 제한시간
- 위치: `apps/web/src/i18n.ts:529`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:666`
- 수정안:

### T-0523

- 현재: 초
- 위치: `apps/web/src/i18n.ts:530`
- 사용: `apps/web/src/components/ResultPanel.tsx:88`, `apps/web/src/pages/OnlineRoomPage.tsx:676`
- 수정안:

### T-0524

- 현재: 기본 사설방은 무료이며, 시간과 목표 점수 설정은 프리미엄 전용입니다.
- 위치: `apps/web/src/i18n.ts:531`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:690`
- 수정안:

### T-0525

- 현재: 관전 허용
- 위치: `apps/web/src/i18n.ts:532`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:682`
- 수정안:

### T-0526

- 현재: 출시 예정
- 위치: `apps/web/src/i18n.ts:533`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:127`, `apps/web/src/components/EconomyAccountPanel.tsx:129`, `apps/web/src/components/EconomyQuestGrid.tsx:96`, `apps/web/src/pages/StorePage.tsx:724`
- 수정안:

### T-0527

- 현재: 판매 종료
- 위치: `apps/web/src/i18n.ts:534`
- 사용: 사용 위치 없음
- 수정안:

### T-0528

- 현재: 자동 지급
- 위치: `apps/web/src/i18n.ts:535`
- 사용: 사용 위치 없음
- 수정안:

### T-0529

- 현재: 7일 연속 출석
- 위치: `apps/web/src/i18n.ts:536`
- 사용: 사용 위치 없음
- 수정안:

### T-0530

- 현재: 선택형 보상 광고
- 위치: `apps/web/src/i18n.ts:537`
- 사용: 사용 위치 없음
- 수정안:

### T-0531

- 현재: 보유 타일 색
- 위치: `apps/web/src/i18n.ts:538`
- 사용: 사용 위치 없음
- 수정안:

### T-0532

- 현재: 빨강 슬롯
- 위치: `apps/web/src/i18n.ts:539`
- 사용: 사용 위치 없음
- 수정안:

### T-0533

- 현재: 파랑 슬롯
- 위치: `apps/web/src/i18n.ts:540`
- 사용: 사용 위치 없음
- 수정안:

### T-0534

- 현재: 초록 슬롯
- 위치: `apps/web/src/i18n.ts:541`
- 사용: 사용 위치 없음
- 수정안:

### T-0535

- 현재: 최근 획득·사용 기록
- 위치: `apps/web/src/i18n.ts:542`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:83`
- 수정안:

### T-0536

- 현재: 아직 컬러 칩 기록이 없습니다.
- 위치: `apps/web/src/i18n.ts:543`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:89`
- 수정안:

### T-0537

- 현재: 구매 복원
- 위치: `apps/web/src/i18n.ts:544`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:129`
- 수정안:

### T-0538

- 현재: 창립자 팩
- 위치: `apps/web/src/i18n.ts:545`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:120`, `apps/web/src/pages/StorePage.tsx:710`
- 수정안:

### T-0539

- 현재: 프리미엄 팩
- 위치: `apps/web/src/i18n.ts:546`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:125`, `apps/web/src/pages/StorePage.tsx:712`
- 수정안:

### T-0540

- 현재: 출시 예정 스킨
- 위치: `apps/web/src/i18n.ts:547`
- 사용: `apps/web/src/pages/StorePage.tsx:718`
- 수정안:

### T-0541

- 현재: 창립자 한정 타일·프로필·승리 연출
- 위치: `apps/web/src/i18n.ts:548`
- 사용: `apps/web/src/pages/StorePage.tsx:711`
- 수정안:

### T-0542

- 현재: tile_color
- 위치: `apps/web/src/i18n.ts:549`
- 사용: 사용 위치 없음
- 수정안:

### T-0543

- 현재: placement_effect
- 위치: `apps/web/src/i18n.ts:550`
- 사용: 사용 위치 없음
- 수정안:

### T-0544

- 현재: profile
- 위치: `apps/web/src/i18n.ts:551`
- 사용: 사용 위치 없음
- 수정안:

### T-0545

- 현재: solid
- 위치: `apps/web/src/i18n.ts:552`
- 사용: 사용 위치 없음
- 수정안:

### T-0546

- 현재: split
- 위치: `apps/web/src/i18n.ts:553`
- 사용: 사용 위치 없음
- 수정안:

### T-0547

- 현재: gradient
- 위치: `apps/web/src/i18n.ts:554`
- 사용: 사용 위치 없음
- 수정안:

### T-0548

- 현재: pattern
- 위치: `apps/web/src/i18n.ts:555`
- 사용: 사용 위치 없음
- 수정안:

### T-0549

- 현재: quest_welcome
- 위치: `apps/web/src/i18n.ts:556`
- 사용: 사용 위치 없음
- 수정안:

### T-0550

- 현재: quest_attendance
- 위치: `apps/web/src/i18n.ts:557`
- 사용: 사용 위치 없음
- 수정안:

### T-0551

- 현재: quest_attendance_streak
- 위치: `apps/web/src/i18n.ts:558`
- 사용: 사용 위치 없음
- 수정안:

### T-0552

- 현재: quest_first_online_win
- 위치: `apps/web/src/i18n.ts:559`
- 사용: 사용 위치 없음
- 수정안:

### T-0553

- 현재: online_match
- 위치: `apps/web/src/i18n.ts:560`
- 사용: 사용 위치 없음
- 수정안:

### T-0554

- 현재: weekly_store
- 위치: `apps/web/src/i18n.ts:561`
- 사용: 사용 위치 없음
- 수정안:

### T-0555

- 현재: palette_box
- 위치: `apps/web/src/i18n.ts:562`
- 사용: 사용 위치 없음
- 수정안:

### T-0556

- 현재: DUPLICATE_TILE_COLOR
- 위치: `apps/web/src/i18n.ts:563`
- 사용: 사용 위치 없음
- 수정안:

### T-0557

- 현재: TILE_COLORS_TOO_SIMILAR
- 위치: `apps/web/src/i18n.ts:564`
- 사용: 사용 위치 없음
- 수정안:

### T-0558

- 현재: 타일 컬러 상점
- 위치: `apps/web/src/i18n.ts:565`
- 사용: 사용 위치 없음
- 수정안:

### T-0559

- 현재: 타일 하나를 구매해 빨강·파랑·초록 슬롯 중 원하는 곳에 장착하세요.
- 위치: `apps/web/src/i18n.ts:566`
- 사용: 사용 위치 없음
- 수정안:

### T-0560

- 현재: 상점 메뉴
- 위치: `apps/web/src/i18n.ts:567`
- 사용: `apps/web/src/pages/StorePage.tsx:273`
- 수정안:

### T-0561

- 현재: 주간 타일
- 위치: `apps/web/src/i18n.ts:568`
- 사용: 사용 위치 없음
- 수정안:

### T-0562

- 현재: 스킨 도감
- 위치: `apps/web/src/i18n.ts:569`
- 사용: `apps/web/src/pages/StorePage.tsx:520`
- 수정안:

### T-0563

- 현재: Tango의 타일 스킨을 모아 도감을 완성하세요.
- 위치: `apps/web/src/i18n.ts:570`
- 사용: 사용 위치 없음
- 수정안:

### T-0564

- 현재: 수집 완료
- 위치: `apps/web/src/i18n.ts:571`
- 사용: `apps/web/src/pages/StorePage.tsx:528`
- 수정안:

### T-0565

- 현재: 도감 등급 필터
- 위치: `apps/web/src/i18n.ts:572`
- 사용: `apps/web/src/pages/StorePage.tsx:544`
- 수정안:

### T-0566

- 현재: 모두
- 위치: `apps/web/src/i18n.ts:573`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:527`, `apps/web/src/components/TilePalettePanel.tsx:626`, `apps/web/src/pages/StorePage.tsx:552`
- 수정안:

### T-0567

- 현재: 미보유
- 위치: `apps/web/src/i18n.ts:574`
- 사용: 사용 위치 없음
- 수정안:

### T-0568

- 현재: 이번 주 타일
- 위치: `apps/web/src/i18n.ts:575`
- 사용: 사용 위치 없음
- 수정안:

### T-0569

- 현재: 등급
- 위치: `apps/web/src/i18n.ts:576`
- 사용: `apps/web/src/pages/StorePage.tsx:394`, `apps/web/src/pages/StorePage.tsx:470`
- 수정안:

### T-0570

- 현재: 마이 Tango
- 위치: `apps/web/src/i18n.ts:577`
- 사용: 사용 위치 없음
- 수정안:

### T-0571

- 현재: Tango 계정
- 위치: `apps/web/src/i18n.ts:578`
- 사용: 사용 위치 없음
- 수정안:

### T-0572

- 현재: 로그인하고 전적과 보상을 안전하게 저장하세요.
- 위치: `apps/web/src/i18n.ts:579`
- 사용: 사용 위치 없음
- 수정안:

### T-0573

- 현재: 전적·스킨·보상을 한곳에서 관리하세요.
- 위치: `apps/web/src/i18n.ts:580`
- 사용: 사용 위치 없음
- 수정안:

### T-0574

- 현재: 마이페이지 메뉴
- 위치: `apps/web/src/i18n.ts:581`
- 사용: `apps/web/src/pages/AccountPage.tsx:411`
- 수정안:

### T-0575

- 현재: 타일 설정
- 위치: `apps/web/src/i18n.ts:582`
- 사용: 사용 위치 없음
- 수정안:

### T-0576

- 현재: 퀘스트·파편
- 위치: `apps/web/src/i18n.ts:583`
- 사용: 사용 위치 없음
- 수정안:

### T-0577

- 현재: 기록
- 위치: `apps/web/src/i18n.ts:584`
- 사용: 사용 위치 없음
- 수정안:

### T-0578

- 현재: 혜택·계정
- 위치: `apps/web/src/i18n.ts:585`
- 사용: 사용 위치 없음
- 수정안:

### T-0579

- 현재: 세 가지 기본 색을 내 타일로 바꾸세요
- 위치: `apps/web/src/i18n.ts:586`
- 사용: 사용 위치 없음
- 수정안:

### T-0580

- 현재: 기본 버건디
- 위치: `apps/web/src/i18n.ts:587`
- 사용: 사용 위치 없음
- 수정안:

### T-0581

- 현재: 기본 네이비
- 위치: `apps/web/src/i18n.ts:588`
- 사용: 사용 위치 없음
- 수정안:

### T-0582

- 현재: 기본 그린
- 위치: `apps/web/src/i18n.ts:589`
- 사용: 사용 위치 없음
- 수정안:

### T-0583

- 현재: 기본으로 복원
- 위치: `apps/web/src/i18n.ts:590`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:507`
- 수정안:

### T-0584

- 현재: 보유 타일
- 위치: `apps/web/src/i18n.ts:591`
- 사용: 사용 위치 없음
- 수정안:

### T-0585

- 현재: 타일 이름 검색
- 위치: `apps/web/src/i18n.ts:592`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:616`
- 수정안:

### T-0586

- 현재: 이름으로 검색
- 위치: `apps/web/src/i18n.ts:593`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:517`, `apps/web/src/components/TilePalettePanel.tsx:521`, `apps/web/src/components/TilePalettePanel.tsx:620`
- 수정안:

### T-0587

- 현재: 보유 타일 등급 필터
- 위치: `apps/web/src/i18n.ts:594`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:624`
- 수정안:

### T-0588

- 현재: 검색 조건에 맞는 보유 타일이 없습니다.
- 위치: `apps/web/src/i18n.ts:595`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:661`
- 수정안:

### T-0589

- 현재: 세 가지 타일을 팔레트로 한 번에 관리하세요
- 위치: `apps/web/src/i18n.ts:596`
- 사용: 사용 위치 없음
- 수정안:

### T-0590

- 현재: 현재 팔레트
- 위치: `apps/web/src/i18n.ts:597`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:327`, `apps/web/src/components/TilePalettePanel.tsx:359`, `apps/web/src/components/TilePalettePanel.tsx:362`
- 수정안:

### T-0591

- 현재: 게임에 적용되는 세 가지 타일입니다.
- 위치: `apps/web/src/i18n.ts:598`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:360`
- 수정안:

### T-0592

- 현재: 직접 조합하기
- 위치: `apps/web/src/i18n.ts:599`
- 사용: 사용 위치 없음
- 수정안:

### T-0593

- 현재: 저장 팔레트
- 위치: `apps/web/src/i18n.ts:600`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:370`
- 수정안:

### T-0594

- 현재: 원하는 조합을 한 번에 장착하세요.
- 위치: `apps/web/src/i18n.ts:601`
- 사용: 사용 위치 없음
- 수정안:

### T-0595

- 현재: 사용자 팔레트 {count}/3
- 위치: `apps/web/src/i18n.ts:602`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:373`
- 수정안:

### T-0596

- 현재: 기본 조합
- 위치: `apps/web/src/i18n.ts:603`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:380`
- 수정안:

### T-0597

- 현재: 기본 팔레트
- 위치: `apps/web/src/i18n.ts:604`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:381`, `apps/web/src/components/TilePalettePanel.tsx:385`
- 수정안:

### T-0598

- 현재: 한 번에 장착
- 위치: `apps/web/src/i18n.ts:605`
- 사용: 사용 위치 없음
- 수정안:

### T-0599

- 현재: 내 팔레트 {number}
- 위치: `apps/web/src/i18n.ts:606`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:275`, `apps/web/src/components/TilePalettePanel.tsx:402`
- 수정안:

### T-0600

- 현재: 현재 조합을 이곳에 저장할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:607`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:403`
- 수정안:

### T-0601

- 현재: 현재 조합 저장
- 위치: `apps/web/src/i18n.ts:608`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:415`, `apps/web/src/components/TilePalettePanel.tsx:667`
- 수정안:

### T-0602

- 현재: 사용자 팔레트
- 위치: `apps/web/src/i18n.ts:609`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:425`
- 수정안:

### T-0603

- 현재: 팔레트 편집
- 위치: `apps/web/src/i18n.ts:610`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:441`
- 수정안:

### T-0604

- 현재: 팔레트 이름
- 위치: `apps/web/src/i18n.ts:611`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:449`
- 수정안:

### T-0605

- 현재: 이름 변경
- 위치: `apps/web/src/i18n.ts:612`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:458`
- 수정안:

### T-0606

- 현재: 현재 조합으로 덮어쓰기
- 위치: `apps/web/src/i18n.ts:613`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:465`
- 수정안:

### T-0607

- 현재: 삭제
- 위치: `apps/web/src/i18n.ts:614`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:466`
- 수정안:

### T-0608

- 현재: 저장
- 위치: `apps/web/src/i18n.ts:615`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:452`
- 수정안:

### T-0609

- 현재: 선택 슬롯을 기본으로 복원
- 위치: `apps/web/src/i18n.ts:616`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:609`
- 수정안:

### T-0610

- 현재: 변경 취소
- 위치: `apps/web/src/i18n.ts:617`
- 사용: 사용 위치 없음
- 수정안:

### T-0611

- 현재: 팔레트로 저장
- 위치: `apps/web/src/i18n.ts:618`
- 사용: 사용 위치 없음
- 수정안:

### T-0612

- 현재: 타일 바꾸기
- 위치: `apps/web/src/i18n.ts:619`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:364`, `apps/web/src/components/TilePalettePanel.tsx:566`, `apps/web/src/components/TilePalettePanel.tsx:572`
- 수정안:

### T-0613

- 현재: 슬롯을 선택한 뒤 타일을 누르면 즉시 게임에 적용됩니다.
- 위치: `apps/web/src/i18n.ts:620`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:573`
- 수정안:

### T-0614

- 현재: 저장한 조합을 골라 바로 사용하세요.
- 위치: `apps/web/src/i18n.ts:621`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:371`
- 수정안:

### T-0615

- 현재: 이 팔레트 사용
- 위치: `apps/web/src/i18n.ts:622`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:392`, `apps/web/src/components/TilePalettePanel.tsx:438`
- 수정안:

### T-0616

- 현재: 사용 중
- 위치: `apps/web/src/i18n.ts:623`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:383`, `apps/web/src/components/TilePalettePanel.tsx:392`, `apps/web/src/components/TilePalettePanel.tsx:428`, `apps/web/src/components/TilePalettePanel.tsx:438`, `apps/web/src/components/TilePalettePanel.tsx:554`
- 수정안:

### T-0617

- 현재: 선택한 타일은 바로 적용됩니다.
- 위치: `apps/web/src/i18n.ts:624`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:666`
- 수정안:

### T-0618

- 현재: 타일을 적용하는 중입니다.
- 위치: `apps/web/src/i18n.ts:625`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:666`
- 수정안:

### T-0619

- 현재: 저장할 팔레트를 선택하세요
- 위치: `apps/web/src/i18n.ts:626`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:677`
- 수정안:

### T-0620

- 현재: 선택한 팔레트의 기존 조합은 덮어씁니다.
- 위치: `apps/web/src/i18n.ts:627`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:678`
- 수정안:

### T-0621

- 현재: 선택한 팔레트
- 위치: `apps/web/src/i18n.ts:628`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:703`
- 수정안:

### T-0622

- 현재: 팔레트 안에 비슷한 색이 있습니다.
- 위치: `apps/web/src/i18n.ts:629`
- 사용: 사용 위치 없음
- 수정안:

### T-0623

- 현재: 다른 슬롯과 구분하기 어려운 색입니다.
- 위치: `apps/web/src/i18n.ts:630`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:706`
- 수정안:

### T-0624

- 현재: 최종 팔레트의 세 타일을 서로 비교한 결과입니다. 게임 중 헷갈릴 수 있습니다.
- 위치: `apps/web/src/i18n.ts:631`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:707`
- 수정안:

### T-0625

- 현재: 3색 팔레트 일괄 장착
- 위치: `apps/web/src/i18n.ts:632`
- 사용: 사용 위치 없음
- 수정안:

### T-0626

- 현재: 보유 타일 세 개를 하나의 팔레트로 저장하고 웹과 모바일에서 한 번에 장착할 수 있도록 개선한 패치입니다.
- 위치: `apps/web/src/i18n.ts:633`
- 사용: 사용 위치 없음
- 수정안:

### T-0627

- 현재: 사용자 팔레트 3개 저장
- 위치: `apps/web/src/i18n.ts:634`
- 사용: 사용 위치 없음
- 수정안:

### T-0628

- 현재: 기본 팔레트와 별도로 세 가지 사용자 팔레트를 저장할 수 있습니다. 기존 장착 조합은 첫 번째 팔레트로 안전하게 보존됩니다.
- 위치: `apps/web/src/i18n.ts:635`
- 사용: 사용 위치 없음
- 수정안:

### T-0629

- 현재: 세 타일 한 번에 장착
- 위치: `apps/web/src/i18n.ts:636`
- 사용: 사용 위치 없음
- 수정안:

### T-0630

- 현재: 빨강·파랑·초록 슬롯을 임시로 조합한 뒤 한 번에 적용할 수 있습니다. 적용 전에는 현재 게임 타일이 바뀌지 않습니다.
- 위치: `apps/web/src/i18n.ts:637`
- 사용: 사용 위치 없음
- 수정안:

### T-0631

- 현재: 모바일 전용 타일 선택창
- 위치: `apps/web/src/i18n.ts:638`
- 사용: 사용 위치 없음
- 수정안:

### T-0632

- 현재: 모바일에서 선택 슬롯, 검색, 등급 필터와 3열 타일 목록을 한 화면에서 편하게 사용할 수 있도록 배치를 정리했습니다.
- 위치: `apps/web/src/i18n.ts:639`
- 사용: 사용 위치 없음
- 수정안:

### T-0633

- 현재: 구분하기 어려운 색상 안내
- 위치: `apps/web/src/i18n.ts:640`
- 사용: 사용 위치 없음
- 수정안:

### T-0634

- 현재: 최종 팔레트의 세 색을 서로 비교해 비슷한 슬롯을 정확히 표시합니다. 확인 후 원하는 조합을 그대로 장착할 수도 있습니다.
- 위치: `apps/web/src/i18n.ts:641`
- 사용: 사용 위치 없음
- 수정안:

### T-0635

- 현재: 그래도 저장
- 위치: `apps/web/src/i18n.ts:642`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:726`
- 수정안:

### T-0636

- 현재: 팔레트를 저장하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:643`
- 사용: 사용 위치 없음
- 수정안:

### T-0637

- 현재: 팔레트를 삭제하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:644`
- 사용: 사용 위치 없음
- 수정안:

### T-0638

- 현재: 이 팔레트를 삭제할까요?
- 위치: `apps/web/src/i18n.ts:645`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:249`
- 수정안:

### T-0639

- 현재: 타일 하나를 선택한 슬롯에 장착합니다.
- 위치: `apps/web/src/i18n.ts:646`
- 사용: 사용 위치 없음
- 수정안:

### T-0640

- 현재: 다른 슬롯 사용 중
- 위치: `apps/web/src/i18n.ts:647`
- 사용: 사용 위치 없음
- 수정안:

### T-0641

- 현재: 퀘스트와 파편
- 위치: `apps/web/src/i18n.ts:648`
- 사용: 사용 위치 없음
- 수정안:

### T-0642

- 현재: 프리미엄과 창립자 혜택
- 위치: `apps/web/src/i18n.ts:649`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:115`
- 수정안:

### T-0643

- 현재: 기존 타일과 색이 비슷합니다.
- 위치: `apps/web/src/i18n.ts:650`
- 사용: 사용 위치 없음
- 수정안:

### T-0644

- 현재: 색각 보조 도형은 유지됩니다. 그래도 이 조합을 사용하시겠어요?
- 위치: `apps/web/src/i18n.ts:651`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:719`
- 수정안:

### T-0645

- 현재: 그래도 장착
- 위치: `apps/web/src/i18n.ts:652`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:726`
- 수정안:

### T-0646

- 현재: 퀘스트
- 위치: `apps/web/src/i18n.ts:653`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:70`, `apps/web/src/pages/LobbyPage.tsx:224`
- 수정안:

### T-0647

- 현재: 오늘의 퀘스트
- 위치: `apps/web/src/i18n.ts:654`
- 사용: `apps/web/src/pages/LobbyPage.tsx:226`
- 수정안:

### T-0648

- 현재: 전체 관리
- 위치: `apps/web/src/i18n.ts:655`
- 사용: `apps/web/src/pages/LobbyPage.tsx:227`
- 수정안:

### T-0649

- 현재: 퀘스트를 불러오는 중입니다.
- 위치: `apps/web/src/i18n.ts:656`
- 사용: `apps/web/src/pages/LobbyPage.tsx:233`
- 수정안:

### T-0650

- 현재: 로그인하고 퀘스트 보상을 받으세요.
- 위치: `apps/web/src/i18n.ts:657`
- 사용: `apps/web/src/pages/LobbyPage.tsx:233`
- 수정안:

### T-0651

- 현재: 컬러 칩 경제와 타일 스킨
- 위치: `apps/web/src/i18n.ts:658`
- 사용: 사용 위치 없음
- 수정안:

### T-0652

- 현재: 무료 컬러 칩 경제, 36종 타일 스킨, 출석 팝업과 웹·모바일 화면 개선을 함께 담은 패치입니다.
- 위치: `apps/web/src/i18n.ts:659`
- 사용: 사용 위치 없음
- 수정안:

### T-0653

- 현재: 무료 컬러 칩 경제 시작
- 위치: `apps/web/src/i18n.ts:660`
- 사용: 사용 위치 없음
- 수정안:

### T-0654

- 현재: 신규 계정, 출석, 연속 출석, 일반·경쟁전과 첫 승리 보상을 추가했습니다. 광고와 유료 상품은 정식 출시 전까지 잠금 상태로 유지됩니다.
- 위치: `apps/web/src/i18n.ts:661`
- 사용: 사용 위치 없음
- 수정안:

### T-0655

- 현재: 신규 계정, 출석, 주간 출석, 일반·경쟁전과 첫 승리 보상을 추가했습니다. 광고와 유료 상품은 정식 출시 전까지 잠금 상태로 유지됩니다.
- 위치: `apps/web/src/i18n.ts:662`
- 사용: 사용 위치 없음
- 수정안:

### T-0656

- 현재: 타일 스킨 36종과 스킨 도감
- 위치: `apps/web/src/i18n.ts:663`
- 사용: 사용 위치 없음
- 수정안:

### T-0657

- 현재: 단색, 50:50 분할, 그라데이션, 고유 문양으로 구성된 타일 스킨을 추가했습니다. 상점의 스킨 도감에서 전체 목록과 수집 현황을 확인할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:664`
- 사용: 사용 위치 없음
- 수정안:

### T-0658

- 현재: 주간 상점과 팔레트 상자
- 위치: `apps/web/src/i18n.ts:665`
- 사용: 사용 위치 없음
- 수정안:

### T-0659

- 현재: 매주 바뀌는 타일 상점과 등급별 파편, 팔레트 상자를 추가했습니다. 구매한 타일은 빨강·파랑·초록 슬롯에 각각 장착할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:666`
- 사용: 사용 위치 없음
- 수정안:

### T-0660

- 현재: 로그인 출석 팝업
- 위치: `apps/web/src/i18n.ts:667`
- 사용: 사용 위치 없음
- 수정안:

### T-0661

- 현재: 로그인하면 오늘의 출석 팝업이 열립니다. 7일 진행도와 연속 출석을 확인하고 컬러 칩 보상을 바로 받을 수 있습니다.
- 위치: `apps/web/src/i18n.ts:668`
- 사용: 사용 위치 없음
- 수정안:

### T-0662

- 현재: 로그인하면 오늘의 출석 팝업이 열립니다. 이번 주 출석 진행도를 확인하고 컬러 칩 보상을 바로 받을 수 있습니다.
- 위치: `apps/web/src/i18n.ts:669`
- 사용: 사용 위치 없음
- 수정안:

### T-0663

- 현재: 웹·모바일 화면 개선
- 위치: `apps/web/src/i18n.ts:670`
- 사용: 사용 위치 없음
- 수정안:

### T-0664

- 현재: 메인, 상점, 마이페이지와 패치노트의 크기와 정렬을 다듬고, 모바일 내비게이션과 게임 모드 영역을 화면에 맞게 개선했습니다.
- 위치: `apps/web/src/i18n.ts:671`
- 사용: 사용 위치 없음
- 수정안:

### T-0665

- 현재: 계정, 출석 기록, 컬러 칩 원장과 보유 스킨, 연결된 경기 기록과 리플레이가 삭제되며 복구할 수 없습니다.
- 위치: `apps/web/src/i18n.ts:672`
- 사용: `apps/web/src/pages/AccountPage.tsx:579`
- 수정안:

### T-0666

- 현재: QUEST_NOT_CLAIMABLE
- 위치: `apps/web/src/i18n.ts:673`
- 사용: 사용 위치 없음
- 수정안:

### T-0667

- 현재: 시행일: 2026년 6월 29일
- 위치: `apps/web/src/i18n.ts:674`
- 사용: 사용 위치 없음
- 수정안:

### T-0668

- 현재: Tango는 계정 이용 시 이메일, 해시 처리된 비밀번호, 닉네임, 아바타, 레이팅, 전적, 출석 기록, 컬러 칩 잔액과 원장, 보유·장착 스킨, 파편·상자 결과와 쿠폰 수령 기록을 처리합니다. 서비스 운영과 반복 보상 방지를 위해 서명된 익명 게스트 식별자, 접속 경로, 브라우저 정보를 처리할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:675`
- 사용: 사용 위치 없음
- 수정안:

### T-0669

- 현재: 수집한 정보는 로그인, 온라인 대전, 전적과 리더보드, 출석·퀘스트·쿠폰 보상, 상점·스킨 소유권과 부정 수령 방지, 서비스 안정성 확인에 사용합니다.
- 위치: `apps/web/src/i18n.ts:676`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:26`
- 수정안:

### T-0670

- 현재: 계정 정보는 회원 탈퇴 전까지 보관합니다. 계정을 삭제하면 계정 정보, 출석 기록, 경제 원장, 보유·찜한 스킨, 파편·상자·제작 기록, 계정과 연결된 경기 기록과 리플레이가 삭제되며 복구할 수 없습니다. 계정과 연결되지 않은 익명 게스트 식별자, 집계형 매칭 시간과 익명 방문 통계는 서비스 운영과 부정 이용 방지 목적으로 남을 수 있습니다.
- 위치: `apps/web/src/i18n.ts:677`
- 사용: `apps/web/src/pages/PrivacyPage.tsx:30`
- 수정안:

### T-0671

- 현재: PREMIUM_REQUIRED
- 위치: `apps/web/src/i18n.ts:678`
- 사용: 사용 위치 없음
- 수정안:

### T-0672

- 현재: 마이 페이지
- 위치: `apps/web/src/i18n.ts:679`
- 사용: `apps/web/src/components/AppSidebar.tsx:29`, `apps/web/src/components/AppSidebar.tsx:40`, `apps/web/src/pages/LobbyPage.tsx:204`
- 수정안:

### T-0673

- 현재: 상대의 시간이 끝났습니다.
- 위치: `apps/web/src/i18n.ts:680`
- 사용: 사용 위치 없음
- 수정안:

### T-0674

- 현재: 제한 시간이 끝났습니다.
- 위치: `apps/web/src/i18n.ts:681`
- 사용: 사용 위치 없음
- 수정안:

### T-0675

- 현재: 상대가 대전을 종료했습니다.
- 위치: `apps/web/src/i18n.ts:682`
- 사용: 사용 위치 없음
- 수정안:

### T-0676

- 현재: 대전을 종료했습니다.
- 위치: `apps/web/src/i18n.ts:683`
- 사용: 사용 위치 없음
- 수정안:

### T-0677

- 현재: 보드가 가득 찼습니다.
- 위치: `apps/web/src/i18n.ts:684`
- 사용: 사용 위치 없음
- 수정안:

### T-0678

- 현재: 마지막 연결이 목표 점수를 완성했습니다.
- 위치: `apps/web/src/i18n.ts:685`
- 사용: 사용 위치 없음
- 수정안:

### T-0679

- 현재: 상대의 재경기 동의를 기다리는 중입니다.
- 위치: `apps/web/src/i18n.ts:686`
- 사용: `apps/web/src/components/ResultPanel.tsx:87`
- 수정안:

### T-0680

- 현재: 재경기
- 위치: `apps/web/src/i18n.ts:687`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:898`
- 수정안:

### T-0681

- 현재: 요청 완료
- 위치: `apps/web/src/i18n.ts:688`
- 사용: 사용 위치 없음
- 수정안:

### T-0682

- 현재: Google로 로그인
- 위치: `apps/web/src/i18n.ts:689`
- 사용: `apps/web/src/components/GoogleSignInButton.tsx:156`
- 수정안:

### T-0683

- 현재: 닉네임을 변경했습니다.
- 위치: `apps/web/src/i18n.ts:690`
- 사용: 사용 위치 없음
- 수정안:

### T-0684

- 현재: 계정 정보를 불러오는 중입니다.
- 위치: `apps/web/src/i18n.ts:691`
- 사용: `apps/web/src/pages/AccountPage.tsx:297`
- 수정안:

### T-0685

- 현재: 닉네임 변경
- 위치: `apps/web/src/i18n.ts:692`
- 사용: `apps/web/src/pages/AccountPage.tsx:497`
- 수정안:

### T-0686

- 현재: 닉네임을 변경할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:693`
- 사용: `apps/web/src/pages/AccountPage.tsx:499`
- 수정안:

### T-0687

- 현재: 닉네임을 변경하면 14일 동안 다시 변경할 수 없습니다.
- 위치: `apps/web/src/i18n.ts:694`
- 사용: `apps/web/src/pages/AccountPage.tsx:504`
- 수정안:

### T-0688

- 현재: 계정과 사설방 화면 정리
- 위치: `apps/web/src/i18n.ts:695`
- 사용: 사용 위치 없음
- 수정안:

### T-0689

- 현재: 마이페이지의 날짜와 계정 안내를 알아보기 쉽게 바꾸고 사설방 생성 화면을 간결하게 다듬은 패치입니다.
- 위치: `apps/web/src/i18n.ts:696`
- 사용: 사용 위치 없음
- 수정안:

### T-0690

- 현재: 출석 날짜와 닉네임 안내 개선
- 위치: `apps/web/src/i18n.ts:697`
- 사용: 사용 위치 없음
- 수정안:

### T-0691

- 현재: 최근 출석을 KST 기준 날짜로 표시하고, 닉네임을 바꾸기 전에 14일 재변경 제한을 확인할 수 있도록 안내를 추가했습니다.
- 위치: `apps/web/src/i18n.ts:698`
- 사용: 사용 위치 없음
- 수정안:

### T-0692

- 현재: 로그인과 계정 버튼 정리
- 위치: `apps/web/src/i18n.ts:699`
- 사용: 사용 위치 없음
- 수정안:

### T-0693

- 현재: Google 로그인 버튼을 둥근 형태로 바꾸고 로그아웃과 계정 삭제 버튼의 높이와 위치를 맞췄습니다.
- 위치: `apps/web/src/i18n.ts:700`
- 사용: 사용 위치 없음
- 수정안:

### T-0694

- 현재: 사설방 생성 화면 간소화
- 위치: `apps/web/src/i18n.ts:701`
- 사용: 사용 위치 없음
- 수정안:

### T-0695

- 현재: 방 생성에 필요하지 않은 닉네임 확인 카드와 아바타 선택을 제거했습니다. 계정 또는 게스트 정보는 자동으로 적용됩니다.
- 위치: `apps/web/src/i18n.ts:702`
- 사용: 사용 위치 없음
- 수정안:

### T-0696

- 현재: {date}부터 다시 변경할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:703`
- 사용: `apps/web/src/pages/AccountPage.tsx:500`
- 수정안:

### T-0697

- 현재: 전적 모드
- 위치: `apps/web/src/i18n.ts:704`
- 사용: `apps/web/src/pages/AccountPage.tsx:433`
- 수정안:

### T-0698

- 현재: 목표 점수 달성
- 위치: `apps/web/src/i18n.ts:705`
- 사용: 사용 위치 없음
- 수정안:

### T-0699

- 현재: 무승부 종료
- 위치: `apps/web/src/i18n.ts:706`
- 사용: 사용 위치 없음
- 수정안:

### T-0700

- 현재: 제한 시간 종료
- 위치: `apps/web/src/i18n.ts:707`
- 사용: 사용 위치 없음
- 수정안:

### T-0701

- 현재: 기권으로 종료
- 위치: `apps/web/src/i18n.ts:708`
- 사용: 사용 위치 없음
- 수정안:

### T-0702

- 현재: 연결 끊김으로 종료
- 위치: `apps/web/src/i18n.ts:709`
- 사용: 사용 위치 없음
- 수정안:

### T-0703

- 현재: 구매 확정
- 위치: `apps/web/src/i18n.ts:710`
- 사용: `apps/web/src/pages/StorePage.tsx:777`
- 수정안:

### T-0704

- 현재: {chips}칩을 사용해 이 타일을 구매할까요?
- 위치: `apps/web/src/i18n.ts:711`
- 사용: 사용 위치 없음
- 수정안:

### T-0705

- 현재: 보유 칩 {chips}
- 위치: `apps/web/src/i18n.ts:712`
- 사용: `apps/web/src/pages/StorePage.tsx:768`
- 수정안:

### T-0706

- 현재: 보유 중 · 파편으로 전환
- 위치: `apps/web/src/i18n.ts:713`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:181`
- 수정안:

### T-0707

- 현재: 상자
- 위치: `apps/web/src/i18n.ts:714`
- 사용: `apps/web/src/components/EconomyQuestGrid.tsx:84`
- 수정안:

### T-0708

- 현재: 영구 프리미엄
- 위치: `apps/web/src/i18n.ts:715`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:172`
- 수정안:

### T-0709

- 현재: 쿠폰 보상을 받았습니다.
- 위치: `apps/web/src/i18n.ts:716`
- 사용: `apps/web/src/components/EconomyAccountPanel.tsx:159`
- 수정안:

### T-0710

- 현재: 확인
- 위치: `apps/web/src/i18n.ts:717`
- 사용: `apps/web/src/pages/OnlineRoomPage.tsx:904`
- 수정안:

### T-0711

- 현재: 퀘스트 기간
- 위치: `apps/web/src/i18n.ts:718`
- 사용: `apps/web/src/components/EconomyQuestGrid.tsx:63`
- 수정안:

### T-0712

- 현재: 주간
- 위치: `apps/web/src/i18n.ts:719`
- 사용: `apps/web/src/components/EconomyQuestGrid.tsx:65`
- 수정안:

### T-0713

- 현재: 오늘의 퀘스트 완료
- 위치: `apps/web/src/i18n.ts:720`
- 사용: 사용 위치 없음
- 수정안:

### T-0714

- 현재: 주간 출석 5일
- 위치: `apps/web/src/i18n.ts:721`
- 사용: 사용 위치 없음
- 수정안:

### T-0715

- 현재: 주간 온라인 20경기
- 위치: `apps/web/src/i18n.ts:722`
- 사용: 사용 위치 없음
- 수정안:

### T-0716

- 현재: 주간 온라인 10승
- 위치: `apps/web/src/i18n.ts:723`
- 사용: 사용 위치 없음
- 수정안:

### T-0717

- 현재: 주간 퀘스트 완료
- 위치: `apps/web/src/i18n.ts:724`
- 사용: 사용 위치 없음
- 수정안:

### T-0718

- 현재: 주간 출석과 조작감 개선
- 위치: `apps/web/src/i18n.ts:725`
- 사용: 사용 위치 없음
- 수정안:

### T-0719

- 현재: 출석 보상을 주간 누적 방식으로 정리하고, 타일 선택·온라인 표기·Normal AI와 다국어 문구를 다듬은 패치입니다.
- 위치: `apps/web/src/i18n.ts:726`
- 사용: 사용 위치 없음
- 수정안:

### T-0720

- 현재: 이번 주 출석 횟수 기준으로 변경
- 위치: `apps/web/src/i18n.ts:727`
- 사용: 사용 위치 없음
- 수정안:

### T-0721

- 현재: 연속 출석 대신 이번 주 출석 횟수를 보여주도록 바꿨습니다. 주간 출석은 일요일이 끝난 뒤 월요일 00:00 KST에 초기화됩니다.
- 위치: `apps/web/src/i18n.ts:728`
- 사용: 사용 위치 없음
- 수정안:

### T-0722

- 현재: 주간 퀘스트 기준 정리
- 위치: `apps/web/src/i18n.ts:729`
- 사용: 사용 위치 없음
- 수정안:

### T-0723

- 현재: 주간 출석·온라인 경기·온라인 승리 퀘스트가 같은 주간 기준으로 계산되도록 정리했습니다. 미수령 보상은 그대로 유지됩니다.
- 위치: `apps/web/src/i18n.ts:730`
- 사용: 사용 위치 없음
- 수정안:

### T-0724

- 현재: 타일 선택과 보드 표시 개선
- 위치: `apps/web/src/i18n.ts:731`
- 사용: 사용 위치 없음
- 수정안:

### T-0725

- 현재: 기존 1·2·3 단축키에 Q·W·E 보조 단축키를 추가했습니다. 키보드 이동과 마우스 hover 표시가 겹쳐 보이던 문제도 수정했습니다.
- 위치: `apps/web/src/i18n.ts:732`
- 사용: 사용 위치 없음
- 수정안:

### T-0726

- 현재: 온라인 대전 플레이어 표기 수정
- 위치: `apps/web/src/i18n.ts:733`
- 사용: 사용 위치 없음
- 수정안:

### T-0727

- 현재: 로그인한 플레이어가 현재 차례 카드에서 게스트로 보이던 문제를 수정했습니다. 게스트 표기는 실제 게스트에게만 표시됩니다.
- 위치: `apps/web/src/i18n.ts:734`
- 사용: 사용 위치 없음
- 수정안:

### T-0728

- 현재: Normal AI 성향 완화
- 위치: `apps/web/src/i18n.ts:735`
- 사용: 사용 위치 없음
- 수정안:

### T-0729

- 현재: Normal AI가 득점 차단에 지나치게 치우치지 않도록 방어 성향을 낮췄습니다. Easy처럼 무너지지는 않게 균형을 유지했습니다.
- 위치: `apps/web/src/i18n.ts:736`
- 사용: 사용 위치 없음
- 수정안:

### T-0730

- 현재: 대전 기록과 모바일 경험 개선
- 위치: `apps/web/src/i18n.ts:737`
- 사용: 사용 위치 없음
- 수정안:

### T-0731

- 현재: 전적 판정, 재경기, 퀘스트와 상점 경제를 바로잡고 모바일 화면과 게임 종료 흐름을 다듬은 통합 패치입니다.
- 위치: `apps/web/src/i18n.ts:738`
- 사용: 사용 위치 없음
- 수정안:

### T-0732

- 현재: 정확한 승패무와 멈추는 경기 시간
- 위치: `apps/web/src/i18n.ts:739`
- 사용: 사용 위치 없음
- 수정안:

### T-0733

- 현재: 게스트 상대 결과를 포함한 승패무 기록을 바로잡고 일반·경쟁 통계를 분리했습니다. 경기 시간은 종료 순간에 멈춥니다.
- 위치: `apps/web/src/i18n.ts:740`
- 사용: 사용 위치 없음
- 수정안:

### T-0734

- 현재: 일반게임 재경기와 탈주 방지
- 위치: `apps/web/src/i18n.ts:741`
- 사용: 사용 위치 없음
- 수정안:

### T-0735

- 현재: 일반게임은 두 플레이어가 동의하면 같은 상대와 재경기할 수 있습니다. 온라인 대전 중 이동할 때는 기권 확인을 거칩니다.
- 위치: `apps/web/src/i18n.ts:742`
- 사용: 사용 위치 없음
- 수정안:

### T-0736

- 현재: 일간·주간 퀘스트
- 위치: `apps/web/src/i18n.ts:743`
- 사용: 사용 위치 없음
- 수정안:

### T-0737

- 현재: 일간 퀘스트 완료 상자와 주간 출석·경기·승리 보상을 추가하고 첫 승리 수령 상태를 수정했습니다.
- 위치: `apps/web/src/i18n.ts:744`
- 사용: 사용 위치 없음
- 수정안:

### T-0738

- 현재: 닉네임 변경과 전적 화면
- 위치: `apps/web/src/i18n.ts:745`
- 사용: 사용 위치 없음
- 수정안:

### T-0739

- 현재: 닉네임을 14일마다 변경할 수 있으며 전적을 전체·일반·경쟁으로 나눠 확인할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:746`
- 사용: 사용 위치 없음
- 수정안:

### T-0740

- 현재: 상점 경제와 구매 확인
- 위치: `apps/web/src/i18n.ts:747`
- 사용: 사용 위치 없음
- 수정안:

### T-0741

- 현재: 팔레트 상자와 등급별 스킨 가격을 조정하고 구매 확인 및 쿠폰 보상 결과 화면을 추가했습니다.
- 위치: `apps/web/src/i18n.ts:748`
- 사용: 사용 위치 없음
- 수정안:

### T-0742

- 현재: 모바일 가독성과 안내 개선
- 위치: `apps/web/src/i18n.ts:749`
- 사용: 사용 위치 없음
- 수정안:

### T-0743

- 현재: 화이트 모드 메뉴, 상단 바, 플레이 버튼, 튜토리얼, 패치노트와 결과 화면의 모바일 배치를 개선했습니다.
- 위치: `apps/web/src/i18n.ts:750`
- 사용: 사용 위치 없음
- 수정안:

### T-0744

- 현재: Tango 비주얼 리마스터
- 위치: `apps/web/src/i18n.ts:751`
- 사용: 사용 위치 없음
- 수정안:

### T-0745

- 현재: 꾸미기 경험 리마스터
- 위치: `apps/web/src/i18n.ts:752`
- 사용: 사용 위치 없음
- 수정안:

### T-0746

- 현재: 게임판과 효과의 품질을 높이고 상점, 공방, 도감과 장착 화면을 실제 서비스 수준으로 다시 구성했습니다.
- 위치: `apps/web/src/i18n.ts:753`
- 사용: 사용 위치 없음
- 수정안:

### T-0747

- 현재: 이번 주 상점과 팔레트 믹서
- 위치: `apps/web/src/i18n.ts:754`
- 사용: 사용 위치 없음
- 수정안:

### T-0748

- 현재: 상품을 등급별 진열 구역으로 나누고 아틀리에 상자를 안료를 섞어 결과를 발견하는 팔레트 믹서로 교체했습니다.
- 위치: `apps/web/src/i18n.ts:755`
- 사용: 사용 위치 없음
- 수정안:

### T-0749

- 현재: 한눈에 보는 내 꾸미기
- 위치: `apps/web/src/i18n.ts:756`
- 사용: 사용 위치 없음
- 수정안:

### T-0750

- 현재: 타일, 게임판, 배치, 득점, 승리 연출을 한 종류씩 살펴보고 보유 항목을 누르면 즉시 적용할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:757`
- 사용: 사용 위치 없음
- 수정안:

### T-0751

- 현재: 게임판과 효과 전면 강화
- 위치: `apps/web/src/i18n.ts:758`
- 사용: 사용 위치 없음
- 수정안:

### T-0752

- 현재: 12종 게임판에 고유 표면과 상감 표현을 더하고 배치와 득점 효과를 다층 연출로 강화했습니다.
- 위치: `apps/web/src/i18n.ts:759`
- 사용: 사용 위치 없음
- 수정안:

### T-0753

- 현재: 새로운 경기 결과 화면
- 위치: `apps/web/src/i18n.ts:760`
- 사용: 사용 위치 없음
- 수정안:

### T-0754

- 현재: 승패와 점수, 경기 정보를 명확히 보여주는 전체 결과 장면을 만들고 승리 연출이 화면 전체에 반영되도록 개선했습니다.
- 위치: `apps/web/src/i18n.ts:761`
- 사용: 사용 위치 없음
- 수정안:

### T-0755

- 현재: 고급 원목과 따뜻한 파치먼트 감성을 바탕으로 로고부터 게임판, 주요 화면과 모바일 내비게이션까지 새롭게 정리한 업데이트입니다.
- 위치: `apps/web/src/i18n.ts:762`
- 사용: 사용 위치 없음
- 수정안:

### T-0756

- 현재: 새로운 Tango 로고
- 위치: `apps/web/src/i18n.ts:763`
- 사용: 사용 위치 없음
- 수정안:

### T-0757

- 현재: 버건디·네이비·그린 타일이 맞물리는 새 로고를 웹, 브라우저 아이콘, Android 앱 아이콘과 시작 화면에 통일해 적용했습니다.
- 위치: `apps/web/src/i18n.ts:764`
- 사용: 사용 위치 없음
- 수정안:

### T-0758

- 현재: 원목과 파치먼트 디자인 시스템
- 위치: `apps/web/src/i18n.ts:765`
- 사용: 사용 위치 없음
- 수정안:

### T-0759

- 현재: 따뜻한 종이 배경과 고급 원목 게임판, 절제된 색상과 그림자로 Tango만의 캐주얼 보드게임 분위기를 만들었습니다.
- 위치: `apps/web/src/i18n.ts:766`
- 사용: 사용 위치 없음
- 수정안:

### T-0760

- 현재: 보드 중심 화면 재구성
- 위치: `apps/web/src/i18n.ts:767`
- 사용: 사용 위치 없음
- 수정안:

### T-0761

- 현재: 메인과 게임 화면에서 보드와 핵심 조작을 먼저 볼 수 있도록 정보 밀도와 여백을 정리하고 상점, 마이페이지, 리더보드와 보조 화면도 같은 흐름으로 통일했습니다.
- 위치: `apps/web/src/i18n.ts:768`
- 사용: 사용 위치 없음
- 수정안:

### T-0762

- 현재: 모바일 내비게이션과 반응형 개선
- 위치: `apps/web/src/i18n.ts:769`
- 사용: 사용 위치 없음
- 수정안:

### T-0763

- 현재: 상단 메뉴와 하단 내비게이션을 화면에 안정적으로 고정하고 320px부터 넓은 데스크톱까지 버튼, 카드와 게임판이 겹치지 않도록 다듬었습니다.
- 위치: `apps/web/src/i18n.ts:770`
- 사용: 사용 위치 없음
- 수정안:

### T-0764

- 현재: NICKNAME_CHANGE_COOLDOWN
- 위치: `apps/web/src/i18n.ts:771`
- 사용: 사용 위치 없음
- 수정안:

### T-0765

- 현재: {name}을 장착했습니다.
- 위치: `apps/web/src/i18n.ts:772`
- 사용: `apps/web/src/pages/StorePage.tsx:174`
- 수정안:

### T-0766

- 현재: 찜 해제
- 위치: `apps/web/src/i18n.ts:773`
- 사용: `apps/web/src/pages/StorePage.tsx:200`, `apps/web/src/pages/StorePage.tsx:592`
- 수정안:

### T-0767

- 현재: 찜하기
- 위치: `apps/web/src/i18n.ts:774`
- 사용: `apps/web/src/pages/StorePage.tsx:200`, `apps/web/src/pages/StorePage.tsx:592`
- 수정안:

### T-0768

- 현재: 찜 목록
- 위치: `apps/web/src/i18n.ts:775`
- 사용: `apps/web/src/pages/StorePage.tsx:563`
- 수정안:

### T-0769

- 현재: 이 카테고리에 찜한 꾸미기가 없습니다.
- 위치: `apps/web/src/i18n.ts:776`
- 사용: `apps/web/src/pages/StorePage.tsx:614`
- 수정안:

### T-0770

- 현재: Tango 꾸미기 상점
- 위치: `apps/web/src/i18n.ts:777`
- 사용: `apps/web/src/pages/StorePage.tsx:243`
- 수정안:

### T-0771

- 현재: 타일·게임판·배치·득점·승리 스타일을 나만의 조합으로 완성하세요.
- 위치: `apps/web/src/i18n.ts:778`
- 사용: `apps/web/src/pages/StorePage.tsx:244`
- 수정안:

### T-0772

- 현재: 이번 주 꾸미기
- 위치: `apps/web/src/i18n.ts:779`
- 사용: 사용 위치 없음
- 수정안:

### T-0773

- 현재: 이번 주 상점
- 위치: `apps/web/src/i18n.ts:780`
- 사용: `apps/web/src/pages/StorePage.tsx:297`
- 수정안:

### T-0774

- 현재: 이번 주 {count}개
- 위치: `apps/web/src/i18n.ts:781`
- 사용: `apps/web/src/pages/StorePage.tsx:323`
- 수정안:

### T-0775

- 현재: 이번 주에는 이 종류의 상품이 없습니다.
- 위치: `apps/web/src/i18n.ts:782`
- 사용: `apps/web/src/pages/StorePage.tsx:336`
- 수정안:

### T-0776

- 현재: 무작위 결과
- 위치: `apps/web/src/i18n.ts:783`
- 사용: 사용 위치 없음
- 수정안:

### T-0777

- 현재: 선택한 결과
- 위치: `apps/web/src/i18n.ts:784`
- 사용: 사용 위치 없음
- 수정안:

### T-0778

- 현재: {rarity} {category}
- 위치: `apps/web/src/i18n.ts:785`
- 사용: `apps/web/src/pages/StorePage.tsx:464`
- 수정안:

### T-0779

- 현재: 주간 상점
- 위치: `apps/web/src/i18n.ts:786`
- 사용: 사용 위치 없음
- 수정안:

### T-0780

- 현재: 게임 스타일
- 위치: `apps/web/src/i18n.ts:787`
- 사용: 사용 위치 없음
- 수정안:

### T-0781

- 현재: 내 꾸미기
- 위치: `apps/web/src/i18n.ts:788`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:313`
- 수정안:

### T-0782

- 현재: 한 종류씩 골라 현재 장착 상태와 보유 꾸미기를 확인하세요.
- 위치: `apps/web/src/i18n.ts:789`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:314`
- 수정안:

### T-0783

- 현재: 3색 팔레트
- 위치: `apps/web/src/i18n.ts:790`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:326`
- 수정안:

### T-0784

- 현재: 선택하면 바로 게임에 적용됩니다.
- 위치: `apps/web/src/i18n.ts:791`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:482`
- 수정안:

### T-0785

- 현재: 보유 꾸미기
- 위치: `apps/web/src/i18n.ts:792`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:514`
- 수정안:

### T-0786

- 현재: 등급 필터
- 위치: `apps/web/src/i18n.ts:793`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:526`
- 수정안:

### T-0787

- 현재: 조건에 맞는 보유 꾸미기가 없습니다.
- 위치: `apps/web/src/i18n.ts:794`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:537`
- 수정안:

### T-0788

- 현재: 상점과 공방에서 새로운 꾸미기를 획득할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:795`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:538`
- 수정안:

### T-0789

- 현재: 게임판과 효과를 슬롯별로 장착하세요.
- 위치: `apps/web/src/i18n.ts:796`
- 사용: 사용 위치 없음
- 수정안:

### T-0790

- 현재: 기본 원목 게임판
- 위치: `apps/web/src/i18n.ts:797`
- 사용: 사용 위치 없음
- 수정안:

### T-0791

- 현재: 기본 배치 효과
- 위치: `apps/web/src/i18n.ts:798`
- 사용: 사용 위치 없음
- 수정안:

### T-0792

- 현재: 기본 득점 효과
- 위치: `apps/web/src/i18n.ts:799`
- 사용: 사용 위치 없음
- 수정안:

### T-0793

- 현재: 기본 승리 연출
- 위치: `apps/web/src/i18n.ts:800`
- 사용: 사용 위치 없음
- 수정안:

### T-0794

- 현재: 변경
- 위치: `apps/web/src/i18n.ts:801`
- 사용: `apps/web/src/pages/AccountPage.tsx:526`
- 수정안:

### T-0795

- 현재: 보유 꾸미기 선택
- 위치: `apps/web/src/i18n.ts:802`
- 사용: 사용 위치 없음
- 수정안:

### T-0796

- 현재: 이 슬롯에 장착할 보유 꾸미기가 없습니다.
- 위치: `apps/web/src/i18n.ts:803`
- 사용: 사용 위치 없음
- 수정안:

### T-0797

- 현재: 꾸미기를 장착하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:804`
- 사용: 사용 위치 없음
- 수정안:

### T-0798

- 현재: 공방에서 사용
- 위치: `apps/web/src/i18n.ts:805`
- 사용: 사용 위치 없음
- 수정안:

### T-0799

- 현재: {chips}칩을 사용해 이 꾸미기를 구매할까요?
- 위치: `apps/web/src/i18n.ts:806`
- 사용: `apps/web/src/pages/StorePage.tsx:765`
- 수정안:

### T-0800

- 현재: 꾸미기 카테고리
- 위치: `apps/web/src/i18n.ts:807`
- 사용: `apps/web/src/pages/StorePage.tsx:301`
- 수정안:

### T-0801

- 현재: Tango 공방
- 위치: `apps/web/src/i18n.ts:808`
- 사용: `apps/web/src/pages/StorePage.tsx:347`
- 수정안:

### T-0802

- 현재: 파편으로 원하는 꾸미기를 제작하세요.
- 위치: `apps/web/src/i18n.ts:809`
- 사용: 사용 위치 없음
- 수정안:

### T-0803

- 현재: 종류와 등급, 제작 방식을 차례로 고르면 필요한 파편과 결과를 바로 확인할 수 있습니다.
- 위치: `apps/web/src/i18n.ts:810`
- 사용: `apps/web/src/pages/StorePage.tsx:348`
- 수정안:

### T-0804

- 현재: 제작 카테고리
- 위치: `apps/web/src/i18n.ts:811`
- 사용: 사용 위치 없음
- 수정안:

### T-0805

- 현재: 제작 순서
- 위치: `apps/web/src/i18n.ts:812`
- 사용: `apps/web/src/pages/StorePage.tsx:352`
- 수정안:

### T-0806

- 현재: 꾸미기 종류
- 위치: `apps/web/src/i18n.ts:813`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:319`, `apps/web/src/pages/StorePage.tsx:469`
- 수정안:

### T-0807

- 현재: 제작 방식
- 위치: `apps/web/src/i18n.ts:814`
- 사용: `apps/web/src/pages/StorePage.tsx:410`, `apps/web/src/pages/StorePage.tsx:471`
- 수정안:

### T-0808

- 현재: 제작 확인
- 위치: `apps/web/src/i18n.ts:815`
- 사용: `apps/web/src/pages/StorePage.tsx:448`
- 수정안:

### T-0809

- 현재: 어떤 꾸미기를 만들까요?
- 위치: `apps/web/src/i18n.ts:816`
- 사용: `apps/web/src/pages/StorePage.tsx:367`
- 수정안:

### T-0810

- 현재: 선택
- 위치: `apps/web/src/i18n.ts:817`
- 사용: 사용 위치 없음
- 수정안:

### T-0811

- 현재: 선택됨
- 위치: `apps/web/src/i18n.ts:818`
- 사용: `apps/web/src/pages/StorePage.tsx:436`
- 수정안:

### T-0812

- 현재: 사용할 파편 등급을 고르세요
- 위치: `apps/web/src/i18n.ts:819`
- 사용: `apps/web/src/pages/StorePage.tsx:392`
- 수정안:

### T-0813

- 현재: 보유 {count}개
- 위치: `apps/web/src/i18n.ts:820`
- 사용: `apps/web/src/pages/StorePage.tsx:399`
- 수정안:

### T-0814

- 현재: 어떻게 만들까요?
- 위치: `apps/web/src/i18n.ts:821`
- 사용: `apps/web/src/pages/StorePage.tsx:408`
- 수정안:

### T-0815

- 현재: 무작위로 만들기
- 위치: `apps/web/src/i18n.ts:822`
- 사용: `apps/web/src/pages/StorePage.tsx:413`
- 수정안:

### T-0816

- 현재: 원하는 항목 만들기
- 위치: `apps/web/src/i18n.ts:823`
- 사용: `apps/web/src/pages/StorePage.tsx:418`
- 수정안:

### T-0817

- 현재: 파편 4개로 미보유 상품 하나를 무작위로 얻습니다.
- 위치: `apps/web/src/i18n.ts:824`
- 사용: `apps/web/src/pages/StorePage.tsx:413`
- 수정안:

### T-0818

- 현재: 파편 8개로 선택한 상품을 확정 제작합니다.
- 위치: `apps/web/src/i18n.ts:825`
- 사용: `apps/web/src/pages/StorePage.tsx:418`
- 수정안:

### T-0819

- 현재: 파편 4개
- 위치: `apps/web/src/i18n.ts:826`
- 사용: `apps/web/src/pages/StorePage.tsx:414`
- 수정안:

### T-0820

- 현재: 파편 8개
- 위치: `apps/web/src/i18n.ts:827`
- 사용: `apps/web/src/pages/StorePage.tsx:419`
- 수정안:

### T-0821

- 현재: 제작할 항목을 선택하세요
- 위치: `apps/web/src/i18n.ts:828`
- 사용: `apps/web/src/pages/StorePage.tsx:428`
- 수정안:

### T-0822

- 현재: 이 항목 선택
- 위치: `apps/web/src/i18n.ts:829`
- 사용: `apps/web/src/pages/StorePage.tsx:436`
- 수정안:

### T-0823

- 현재: 이 조건의 모든 꾸미기를 이미 보유하고 있습니다.
- 위치: `apps/web/src/i18n.ts:830`
- 사용: `apps/web/src/pages/StorePage.tsx:440`, `apps/web/src/pages/StorePage.tsx:485`
- 수정안:

### T-0824

- 현재: 선택 항목
- 위치: `apps/web/src/i18n.ts:831`
- 사용: `apps/web/src/pages/StorePage.tsx:472`
- 수정안:

### T-0825

- 현재: 보유 파편
- 위치: `apps/web/src/i18n.ts:832`
- 사용: `apps/web/src/pages/StorePage.tsx:475`
- 수정안:

### T-0826

- 현재: 필요 파편
- 위치: `apps/web/src/i18n.ts:833`
- 사용: `apps/web/src/pages/StorePage.tsx:477`
- 수정안:

### T-0827

- 현재: 제작할 항목을 먼저 선택하세요.
- 위치: `apps/web/src/i18n.ts:834`
- 사용: `apps/web/src/pages/StorePage.tsx:481`
- 수정안:

### T-0828

- 현재: 파편 {count}개가 더 필요합니다.
- 위치: `apps/web/src/i18n.ts:835`
- 사용: `apps/web/src/pages/StorePage.tsx:483`
- 수정안:

### T-0829

- 현재: 제작할 준비가 되었습니다.
- 위치: `apps/web/src/i18n.ts:836`
- 사용: `apps/web/src/pages/StorePage.tsx:486`
- 수정안:

### T-0830

- 현재: 제작 중...
- 위치: `apps/web/src/i18n.ts:837`
- 사용: `apps/web/src/pages/StorePage.tsx:490`
- 수정안:

### T-0831

- 현재: {name} 제작하기
- 위치: `apps/web/src/i18n.ts:838`
- 사용: `apps/web/src/pages/StorePage.tsx:492`
- 수정안:

### T-0832

- 현재: {rarity} {category} 무작위 제작
- 위치: `apps/web/src/i18n.ts:839`
- 사용: `apps/web/src/pages/StorePage.tsx:493`
- 수정안:

### T-0833

- 현재: 무작위 제작
- 위치: `apps/web/src/i18n.ts:840`
- 사용: 사용 위치 없음
- 수정안:

### T-0834

- 현재: 지정 제작
- 위치: `apps/web/src/i18n.ts:841`
- 사용: 사용 위치 없음
- 수정안:

### T-0835

- 현재: 미보유 상품 하나를 무작위로 제작합니다.
- 위치: `apps/web/src/i18n.ts:842`
- 사용: 사용 위치 없음
- 수정안:

### T-0836

- 현재: 선택한 상품을 확정 제작합니다.
- 위치: `apps/web/src/i18n.ts:843`
- 사용: 사용 위치 없음
- 수정안:

### T-0837

- 현재: 필요 파편 {count}개
- 위치: `apps/web/src/i18n.ts:844`
- 사용: 사용 위치 없음
- 수정안:

### T-0838

- 현재: 제작하기
- 위치: `apps/web/src/i18n.ts:845`
- 사용: 사용 위치 없음
- 수정안:

### T-0839

- 현재: Tango의 모든 꾸미기와 테마 컬렉션을 확인하세요.
- 위치: `apps/web/src/i18n.ts:846`
- 사용: `apps/web/src/pages/StorePage.tsx:521`
- 수정안:

### T-0840

- 현재: 도감 카테고리
- 위치: `apps/web/src/i18n.ts:847`
- 사용: `apps/web/src/pages/StorePage.tsx:532`
- 수정안:

### T-0841

- 현재: 도감 검색
- 위치: `apps/web/src/i18n.ts:848`
- 사용: `apps/web/src/pages/StorePage.tsx:568`
- 수정안:

### T-0842

- 현재: 꾸미기 이름으로 검색
- 위치: `apps/web/src/i18n.ts:849`
- 사용: `apps/web/src/pages/StorePage.tsx:572`
- 수정안:

### T-0843

- 현재: 팔레트 믹서
- 위치: `apps/web/src/i18n.ts:850`
- 사용: `apps/web/src/pages/StorePage.tsx:642`
- 수정안:

### T-0844

- 현재: 원하는 꾸미기 종류를 고르고 안료를 섞어 파편 또는 완성 꾸미기 하나를 발견하세요.
- 위치: `apps/web/src/i18n.ts:851`
- 사용: `apps/web/src/pages/StorePage.tsx:643`
- 수정안:

### T-0845

- 현재: 믹서 카테고리
- 위치: `apps/web/src/i18n.ts:852`
- 사용: `apps/web/src/pages/StorePage.tsx:644`
- 수정안:

### T-0846

- 현재: 결과 범위
- 위치: `apps/web/src/i18n.ts:853`
- 사용: `apps/web/src/pages/StorePage.tsx:648`
- 수정안:

### T-0847

- 현재: 선택한 안료를 섞는 팔레트 믹서
- 위치: `apps/web/src/i18n.ts:854`
- 사용: `apps/web/src/pages/StorePage.tsx:654`
- 수정안:

### T-0848

- 현재: 선택한 종류
- 위치: `apps/web/src/i18n.ts:855`
- 사용: `apps/web/src/pages/StorePage.tsx:667`
- 수정안:

### T-0849

- 현재: 믹서 이용권
- 위치: `apps/web/src/i18n.ts:856`
- 사용: `apps/web/src/pages/StorePage.tsx:671`
- 수정안:

### T-0850

- 현재: 안료를 섞는 중입니다.
- 위치: `apps/web/src/i18n.ts:857`
- 사용: `apps/web/src/pages/StorePage.tsx:681`
- 수정안:

### T-0851

- 현재: 믹서 이용권 사용 ({count}개 보유)
- 위치: `apps/web/src/i18n.ts:858`
- 사용: `apps/web/src/pages/StorePage.tsx:683`
- 수정안:

### T-0852

- 현재: {chips} 칩으로 섞기
- 위치: `apps/web/src/i18n.ts:859`
- 사용: `apps/web/src/pages/StorePage.tsx:684`
- 수정안:

### T-0853

- 현재: 새로운 꾸미기를 발견했습니다.
- 위치: `apps/web/src/i18n.ts:860`
- 사용: 사용 위치 없음
- 수정안:

### T-0854

- 현재: 팔레트 믹서를 사용하지 못했습니다.
- 위치: `apps/web/src/i18n.ts:861`
- 사용: 사용 위치 없음
- 수정안:

### T-0855

- 현재: 아틀리에 상자
- 위치: `apps/web/src/i18n.ts:862`
- 사용: 사용 위치 없음
- 수정안:

### T-0856

- 현재: 원하는 카테고리를 먼저 고른 뒤 파편 또는 완성 꾸미기 하나를 획득합니다.
- 위치: `apps/web/src/i18n.ts:863`
- 사용: 사용 위치 없음
- 수정안:

### T-0857

- 현재: 상자 카테고리
- 위치: `apps/web/src/i18n.ts:864`
- 사용: 사용 위치 없음
- 수정안:

### T-0858

- 현재: 타일
- 위치: `apps/web/src/i18n.ts:865`
- 사용: `apps/web/src/components/TilePalettePanel.tsx:326`
- 수정안:

### T-0859

- 현재: 게임판
- 위치: `apps/web/src/i18n.ts:866`
- 사용: 사용 위치 없음
- 수정안:

### T-0860

- 현재: 배치 효과
- 위치: `apps/web/src/i18n.ts:867`
- 사용: 사용 위치 없음
- 수정안:

### T-0861

- 현재: 득점 효과
- 위치: `apps/web/src/i18n.ts:868`
- 사용: 사용 위치 없음
- 수정안:

### T-0862

- 현재: 승리 연출
- 위치: `apps/web/src/i18n.ts:869`
- 사용: 사용 위치 없음
- 수정안:

## 3. 번역 함수를 거치지 않는 코드 직접 표시 문구

영문 눈썹 제목, 관리자 화면, 접근성 라벨과 일부 상태 문구가 포함됩니다.

### H-0001

- 현재: DAILY CHECK-IN
- 종류: JSX 본문
- 위치: `apps/web/src/components/AttendanceCheckInModal.tsx:82`
- 수정안:

### H-0002

- 현재: Tango 탕고
- 종류: aria-label 속성
- 위치: `apps/web/src/components/BrandMark.tsx:7`
- 수정안:

### H-0003

- 현재: TANGO
- 종류: JSX 본문
- 위치: `apps/web/src/components/BrandMark.tsx:26`
- 수정안:

### H-0004

- 현재: SELECT COLOR
- 종류: JSX 본문
- 위치: `apps/web/src/components/ColorPicker.tsx:25`
- 수정안:

### H-0005

- 현재: QUESTS
- 종류: JSX 본문
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:69`
- 수정안:

### H-0006

- 현재: CHIP LEDGER
- 종류: JSX 본문
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:82`
- 수정안:

### H-0007

- 현재: BENEFITS
- 종류: JSX 본문
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:114`
- 수정안:

### H-0008

- 현재: COUPON
- 종류: JSX 본문
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:133`
- 수정안:

### H-0009

- 현재: COUPON REWARD
- 종류: JSX 본문
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:157`
- 수정안:

### H-0010

- 현재: G
- 종류: JSX 본문
- 위치: `apps/web/src/components/GoogleSignInButton.tsx:155`
- 수정안:

### H-0011

- 현재: HOW TO PLAY
- 종류: JSX 본문
- 위치: `apps/web/src/components/HelpPanel.tsx:24`
- 수정안:

### H-0012

- 현재: PATCH NOTES
- 종류: JSX 본문
- 위치: `apps/web/src/components/PatchNotesPanel.tsx:348`
- 수정안:

### H-0013

- 현재: SEC
- 종류: JSX 본문
- 위치: `apps/web/src/components/PlayerCard.tsx:64`
- 수정안:

### H-0014

- 현재: MATCH COMPLETE
- 종류: JSX 본문
- 위치: `apps/web/src/components/ResultPanel.tsx:66`
- 수정안:

### H-0015

- 현재: PREFERENCES
- 종류: JSX 본문
- 위치: `apps/web/src/components/SettingsPanel.tsx:93`
- 수정안:

### H-0016

- 현재: MY COSMETICS
- 종류: JSX 본문
- 위치: `apps/web/src/components/TilePalettePanel.tsx:312`
- 수정안:

### H-0017

- 현재: CURRENT PALETTE
- 종류: JSX 본문
- 위치: `apps/web/src/components/TilePalettePanel.tsx:358`
- 수정안:

### H-0018

- 현재: CURRENT STYLE
- 종류: JSX 본문
- 위치: `apps/web/src/components/TilePalettePanel.tsx:480`
- 수정안:

### H-0019

- 현재: OWNED LIBRARY
- 종류: JSX 본문
- 위치: `apps/web/src/components/TilePalettePanel.tsx:513`
- 수정안:

### H-0020

- 현재: CUSTOM PALETTE
- 종류: JSX 본문
- 위치: `apps/web/src/components/TilePalettePanel.tsx:571`
- 수정안:

### H-0021

- 현재: SAVE PALETTE
- 종류: JSX 본문
- 위치: `apps/web/src/components/TilePalettePanel.tsx:676`
- 수정안:

### H-0022

- 현재: COLOR WARNING
- 종류: JSX 본문
- 위치: `apps/web/src/components/TilePalettePanel.tsx:699`
- 수정안:

### H-0023

- 현재: FIRST GUIDE
- 종류: JSX 본문
- 위치: `apps/web/src/components/TutorialPanel.tsx:204`
- 수정안:

### H-0024

- 현재: AI MATCH
- 종류: JSX 본문
- 위치: `apps/web/src/components/TutorialPanel.tsx:214`
- 수정안:

### H-0025

- 현재: 계정이 삭제되었습니다.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/AccountPage.tsx:257`
- 수정안:

### H-0026

- 현재: 닉네임을 변경했습니다.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/AccountPage.tsx:272`
- 수정안:

### H-0027

- 현재: PLAYER ACCOUNT
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AccountPage.tsx:286`
- 수정안:

### H-0028

- 현재: SIGNED IN
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AccountPage.tsx:384`
- 수정안:

### H-0029

- 현재: · TURN
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AccountPage.tsx:474`
- 수정안:

### H-0030

- 현재: Google
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AccountPage.tsx:532`
- 수정안:

### H-0031

- 현재: DELETE ACCOUNT
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AccountPage.tsx:577`
- 수정안:

### H-0032

- 현재: 컬러 칩
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:95`
- 수정안:

### H-0033

- 현재: 팔레트 상자
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:96`
- 수정안:

### H-0034

- 현재: 등급별 파편
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:97`
- 수정안:

### H-0035

- 현재: 지정 스킨
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:98`
- 수정안:

### H-0036

- 현재: 커스텀 랜덤 스킨
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:99`
- 수정안:

### H-0037

- 현재: 영구 프리미엄
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:100`
- 수정안:

### H-0038

- 현재: 지급 수량
- 종류: aria-label 속성
- 위치: `apps/web/src/pages/AdminPage.tsx:108`
- 수정안:

### H-0039

- 현재: 일반
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:117`
- 수정안:

### H-0040

- 현재: 희귀
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:118`
- 수정안:

### H-0041

- 현재: 영웅
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:119`
- 수정안:

### H-0042

- 현재: 전설
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:120`
- 수정안:

### H-0043

- 현재: 스킨 이름·ID·등급 검색
- 종류: placeholder 속성
- 위치: `apps/web/src/pages/AdminPage.tsx:136`
- 수정안:

### H-0044

- 현재: 지급 개수
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:156`
- 수정안:

### H-0045

- 현재: 후보 스킨 이름·ID·등급 검색
- 종류: placeholder 속성
- 위치: `apps/web/src/pages/AdminPage.tsx:169`
- 수정안:

### H-0046

- 현재: 선택한 후보 중 서버가 무작위로 지급합니다. 이미 보유한 스킨은 같은 등급 파편 1개로 전환됩니다.
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:193`
- 수정안:

### H-0047

- 현재: 보상 삭제
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:196`
- 수정안:

### H-0048

- 현재: 쿠폰을 저장했습니다.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/AdminPage.tsx:287`
- 수정안:

### H-0049

- 현재: 관리자 페이지는 데스크톱에서 이용해 주세요.
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:349`
- 수정안:

### H-0050

- 현재: TANGO CONTROL
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:351`
- 수정안:

### H-0051

- 현재: 관리자 로그인
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:352`
- 수정안:

### H-0052

- 현재: 일반 Tango 계정과 분리된 관리자 계정만 사용할 수 있습니다.
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:353`
- 수정안:

### H-0053

- 현재: 이메일
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:355`
- 수정안:

### H-0054

- 현재: 비밀번호
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:356`
- 수정안:

### H-0055

- 현재: 로그인
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:357`
- 수정안:

### H-0056

- 현재: 관리자 페이지는 데스크톱에서 이용해 주세요.
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:367`
- 수정안:

### H-0057

- 현재: TANGO CONTROL
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:369`
- 수정안:

### H-0058

- 현재: 운영 관리
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:369`
- 수정안:

### H-0059

- 현재: 로그아웃
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:371`
- 수정안:

### H-0060

- 현재: 쿠폰 코드
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:388`
- 수정안:

### H-0061

- 현재: 표시 이름
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:389`
- 수정안:

### H-0062

- 현재: 설명
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:390`
- 수정안:

### H-0063

- 현재: 시작 시각
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:391`
- 수정안:

### H-0064

- 현재: 만료 시각
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:392`
- 수정안:

### H-0065

- 현재: 전체 수령 한도
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:393`
- 수정안:

### H-0066

- 현재: 무제한
- 종류: placeholder 속성
- 위치: `apps/web/src/pages/AdminPage.tsx:393`
- 수정안:

### H-0067

- 현재: 활성화
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:394`
- 수정안:

### H-0068

- 현재: 보상 구성
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:397`
- 수정안:

### H-0069

- 현재: 보상 추가
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:397`
- 수정안:

### H-0070

- 현재: 취소
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:409`
- 수정안:

### H-0071

- 현재: 저장
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:410`
- 수정안:

### H-0072

- 현재: 쿠폰 목록
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:414`
- 수정안:

### H-0073

- 현재: 수령
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:437`
- 수정안:

### H-0074

- 현재: 명
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:437`
- 수정안:

### H-0075

- 현재: 수정
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:439`
- 수정안:

### H-0076

- 현재: 삭제
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:446`
- 수정안:

### H-0077

- 현재: 이메일 또는 닉네임
- 종류: placeholder 속성
- 위치: `apps/web/src/pages/AdminPage.tsx:460`
- 수정안:

### H-0078

- 현재: 검색
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:461`
- 수정안:

### H-0079

- 현재: 관리할 유저를 선택하세요.
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:473`
- 수정안:

### H-0080

- 현재: 레이팅
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:480`
- 수정안:

### H-0081

- 현재: 전적
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:481`
- 수정안:

### H-0082

- 현재: 승
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:481`
- 수정안:

### H-0083

- 현재: 패
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:481`
- 수정안:

### H-0084

- 현재: 무
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:481`
- 수정안:

### H-0085

- 현재: 컬러 칩
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:482`
- 수정안:

### H-0086

- 현재: 상자 이용권
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:483`
- 수정안:

### H-0087

- 현재: 보유 스킨
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:484`
- 수정안:

### H-0088

- 현재: 작업 사유
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:486`
- 수정안:

### H-0089

- 현재: 감사 로그에 기록됩니다
- 종류: placeholder 속성
- 위치: `apps/web/src/pages/AdminPage.tsx:486`
- 수정안:

### H-0090

- 현재: 칩 잔액을 변경했습니다.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/AdminPage.tsx:492`
- 수정안:

### H-0091

- 현재: 칩 증감
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:493`
- 수정안:

### H-0092

- 현재: 스킨 지급
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:497`
- 수정안:

### H-0093

- 현재: 검색하거나 등급 전체를 한 번에 지급할 수 있습니다.
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:497`
- 수정안:

### H-0094

- 현재: 개 선택
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:498`
- 수정안:

### H-0095

- 현재: 스킨 이름·ID·등급 검색
- 종류: placeholder 속성
- 위치: `apps/web/src/pages/AdminPage.tsx:504`
- 수정안:

### H-0096

- 현재: 전체 지급
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:515`
- 수정안:

### H-0097

- 현재: 선택한 스킨 지급
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:546`
- 수정안:

### H-0098

- 현재: 관리자 작업 기록
- 종류: JSX 본문
- 위치: `apps/web/src/pages/AdminPage.tsx:561`
- 수정안:

### H-0099

- 현재: AI MATCH
- 종류: JSX 본문
- 위치: `apps/web/src/pages/GamePage.tsx:327`
- 수정안:

### H-0100

- 현재: TURN
- 종류: JSX 본문
- 위치: `apps/web/src/pages/GamePage.tsx:328`
- 수정안:

### H-0101

- 현재: SHARED COLOR FIELD
- 종류: JSX 본문
- 위치: `apps/web/src/pages/GamePage.tsx:339`
- 수정안:

### H-0102

- 현재: 3 = 1PT · 4 = 2PT · 5 = 4PT
- 종류: JSX 본문
- 위치: `apps/web/src/pages/GamePage.tsx:340`
- 수정안:

### H-0103

- 현재: CONFIRM RESIGNATION
- 종류: JSX 본문
- 위치: `apps/web/src/pages/GamePage.tsx:400`
- 수정안:

### H-0104

- 현재: RANKED LADDER
- 종류: JSX 본문
- 위치: `apps/web/src/pages/LeaderboardPage.tsx:71`
- 수정안:

### H-0105

- 현재: PALETTE TIERS
- 종류: JSX 본문
- 위치: `apps/web/src/pages/LeaderboardPage.tsx:78`
- 수정안:

### H-0106

- 현재: RANKING
- 종류: JSX 본문
- 위치: `apps/web/src/pages/LeaderboardPage.tsx:108`
- 수정안:

### H-0107

- 현재: TANGO
- 종류: JSX 본문
- 위치: `apps/web/src/pages/LobbyPage.tsx:119`
- 수정안:

### H-0108

- 현재: PLAY
- 종류: JSX 본문
- 위치: `apps/web/src/pages/LobbyPage.tsx:136`
- 수정안:

### H-0109

- 현재: AI
- 종류: JSX 본문
- 위치: `apps/web/src/pages/LobbyPage.tsx:147`
- 수정안:

### H-0110

- 현재: 매칭을 시작할 수 있습니다.
- 종류: setStatus 상태 문구
- 위치: `apps/web/src/pages/MatchmakingPage.tsx:70`
- 수정안:

### H-0111

- 현재: 매칭 서버에 연결하지 못했습니다.
- 종류: setStatus 상태 문구
- 위치: `apps/web/src/pages/MatchmakingPage.tsx:71`
- 수정안:

### H-0112

- 현재: 상대를 찾는 중입니다.
- 종류: setStatus 상태 문구
- 위치: `apps/web/src/pages/MatchmakingPage.tsx:79`
- 수정안:

### H-0113

- 현재: 경쟁 게임은 로그인이 필요합니다.
- 종류: setStatus 상태 문구
- 위치: `apps/web/src/pages/MatchmakingPage.tsx:101`
- 수정안:

### H-0114

- 현재: 상대를 찾는 중입니다.
- 종류: setStatus 상태 문구
- 위치: `apps/web/src/pages/MatchmakingPage.tsx:127`
- 수정안:

### H-0115

- 현재: 매칭을 취소했습니다.
- 종류: setStatus 상태 문구
- 위치: `apps/web/src/pages/MatchmakingPage.tsx:140`
- 수정안:

### H-0116

- 현재: MATCHMAKING STATUS
- 종류: JSX 본문
- 위치: `apps/web/src/pages/MatchmakingPage.tsx:160`
- 수정안:

### H-0117

- 현재: 매칭 정보를 찾지 못했습니다. 다시 매칭을 시작해 주세요.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:300`
- 수정안:

### H-0118

- 현재: 온라인 서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해 주세요.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:306`
- 수정안:

### H-0119

- 현재: PRIVATE ONLINE ROOM
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:641`
- 수정안:

### H-0120

- 현재: 🔒 PREMIUM
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:648`
- 수정안:

### H-0121

- 현재: ROOM CODE
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:710`
- 수정안:

### H-0122

- 현재: TURN
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:771`
- 수정안:

### H-0123

- 현재: SERVER AUTHORITATIVE FIELD
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:783`
- 수정안:

### H-0124

- 현재: ROOM
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:784`
- 수정안:

### H-0125

- 현재: CONFIRM RESIGNATION
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:851`
- 수정안:

### H-0126

- 현재: SHARE MATCH
- 종류: JSX 본문
- 위치: `apps/web/src/pages/OnlineRoomPage.tsx:871`
- 수정안:

### H-0127

- 현재: PATCH NOTES
- 종류: JSX 본문
- 위치: `apps/web/src/pages/PatchNotesPage.tsx:20`
- 수정안:

### H-0128

- 현재: PRIVACY POLICY
- 종류: JSX 본문
- 위치: `apps/web/src/pages/PrivacyPage.tsx:16`
- 수정안:

### H-0129

- 현재: 공유를 완료하지 못했습니다.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/ReplayPage.tsx:135`
- 수정안:

### H-0130

- 현재: MATCH REPLAY ·
- 종류: JSX 본문
- 위치: `apps/web/src/pages/ReplayPage.tsx:163`
- 수정안:

### H-0131

- 현재: vs
- 종류: JSX 본문
- 위치: `apps/web/src/pages/ReplayPage.tsx:164`
- 수정안:

### H-0132

- 현재: 관전 서버에 연결하지 못했습니다.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/SpectatePage.tsx:44`
- 수정안:

### H-0133

- 현재: 공유를 완료하지 못했습니다.
- 종류: setMessage 상태 문구
- 위치: `apps/web/src/pages/SpectatePage.tsx:56`
- 수정안:

### H-0134

- 현재: LIVE SPECTATE · ROOM
- 종류: JSX 본문
- 위치: `apps/web/src/pages/SpectatePage.tsx:77`
- 수정안:

### H-0135

- 현재: vs
- 종류: JSX 본문
- 위치: `apps/web/src/pages/SpectatePage.tsx:78`
- 수정안:

### H-0136

- 현재: TANGO STORE
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:242`
- 수정안:

### H-0137

- 현재: WEEKLY SELECTION
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:296`
- 수정안:

### H-0138

- 현재: TANGO ATELIER
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:346`
- 수정안:

### H-0139

- 현재: STYLE TYPE
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:367`
- 수정안:

### H-0140

- 현재: RARITY
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:392`
- 수정안:

### H-0141

- 현재: CRAFT METHOD
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:408`
- 수정안:

### H-0142

- 현재: SELECT ITEM
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:428`
- 수정안:

### H-0143

- 현재: CRAFT SUMMARY
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:448`
- 수정안:

### H-0144

- 현재: TILE COLLECTION
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:519`
- 수정안:

### H-0145

- 현재: THEMED COLLECTION
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:622`
- 수정안:

### H-0146

- 현재: PALETTE MIXER
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:641`
- 수정안:

### H-0147

- 현재: FOUNDER & PREMIUM
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:705`
- 수정안:

### H-0148

- 현재: COMING NEXT
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:717`
- 수정안:

### H-0149

- 현재: CONFIRM PURCHASE
- 종류: JSX 본문
- 위치: `apps/web/src/pages/StorePage.tsx:758`
- 수정안:

## 4. 코드에서 조합되는 동적 문구 후보

변수 값과 함께 화면에 조합되는 문구입니다. 실제 의미는 위치의 조건문도 함께 확인해야 합니다.

### D-0001

- 현재 코드: ``${t("컬러 칩")} ${reward.amount ?? 0}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:167`
- 수정안:

### D-0002

- 현재 코드: ``${t("팔레트 상자")} ${reward.amount ?? 0}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:169`
- 수정안:

### D-0003

- 현재 코드: ``${t(reward.rarity ?? "common")} ${t("파편")} ${reward.amount ?? 0}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/EconomyAccountPanel.tsx:171`
- 수정안:

### D-0004

- 현재 코드: `` · +${quest.rewardChips} ◆``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/EconomyQuestGrid.tsx:83`
- 수정안:

### D-0005

- 현재 코드: `` · +${quest.rewardBoxTickets} ${t("상자")}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/EconomyQuestGrid.tsx:84`
- 수정안:

### D-0006

- 현재 코드: ``${rowIndex}:${colIndex}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/GameBoard.tsx:116`
- 수정안:

### D-0007

- 현재 코드: ``${cellLabel}, ${t("상대가 마지막으로 둔 칸")}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/GameBoard.tsx:124`
- 수정안:

### D-0008

- 현재 코드: `` ${rematchSeconds}${t("초")}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/ResultPanel.tsx:88`
- 수정안:

### D-0009

- 현재 코드: ``${index + 1}번 색``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/components/SettingsPanel.tsx:201`
- 수정안:

### D-0010

- 현재 코드: ``${granted}개의 스킨을 새로 지급했습니다.``
- 종류: setMessage 동적 문구
- 위치: `apps/web/src/pages/AdminPage.tsx:311`
- 수정안:

### D-0011

- 현재 코드: ``${coupon.code} 쿠폰을 삭제했습니다.``
- 종류: setMessage 동적 문구
- 위치: `apps/web/src/pages/AdminPage.tsx:338`
- 수정안:

### D-0012

- 현재 코드: `` / ${coupon.maxRedemptions}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/pages/AdminPage.tsx:437`
- 수정안:

### D-0013

- 현재 코드: ``${currentMove.turnNumber} TURN · +${currentMove.earnedScore} PT${frame.awaitingRemoval ? ` · ${t("득점 연결")}` : ""}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/pages/ReplayPage.tsx:195`
- 수정안:

### D-0014

- 현재 코드: `` · ${t("득점 연결")}``
- 종류: JSX 동적 문구
- 위치: `apps/web/src/pages/ReplayPage.tsx:195`
- 수정안:

## 5. 번역 사전에 없는 `t(...)` 호출

이 항목이 남아 있으면 한국어 외 언어에서도 한국어 원문이 그대로 표시될 수 있습니다.
