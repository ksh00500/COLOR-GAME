# Color Line Strategy

공용 색상 타일을 이용해 연결을 완성하고 점수를 가져가는 2인용 웹 전략 퍼즐 보드게임입니다. 제품에는 같은 기기에서 번갈아 두는 로컬 2인 모드를 노출하지 않으며, 현재 플레이 가능한 첫 버전은 플레이어 대 AI 대전입니다.

## 현재 구현 범위

- 5×5 보드와 세 가지 공용 색상
- 가로, 세로, 양 대각선 연결 판정
- 3연결 1점, 4연결 3점, 5연결 5점
- 한 번의 배치로 만들어진 여러 방향 점수 합산
- 득점 연결 타일 제거와 겹친 타일 중복 제거 방지
- 목표 점수 10점 승리, 보드가 가득 찬 경우 무승부
- 턴당 60초 제한과 시간 초과 패배
- Apprentice, Tactician, Mastermind AI 난이도
- 플레이어별 색상 선택 상태 유지
- 라이트·다크·시스템 테마
- 색약 대응 팔레트와 타일 도형 표시
- 애니메이션 감소·끄기와 연출 속도 설정
- 키보드 방향키 이동, 숫자키 색상 선택, Enter/Space 배치
- 데스크톱·태블릿·모바일 반응형 UI
- 설정 저장, 도움말, 기권, 결과 및 즉시 재경기
- 사설방 생성, 초대 코드 참가, 준비 완료, 서버 권위형 온라인 대전

## 저장소 구조

```text
apps/
  web/                React + TypeScript + Vite 웹 앱
  server/             Fastify + Socket.IO 서버 권위형 게임 서버
packages/
  shared-types/       게임과 UI가 공유하는 타입
  game-core/          부작용 없는 순수 게임 규칙 엔진
  ai-engine/          휴리스틱 기반 AI 수 선택기
.github/workflows/    GitHub Actions 검증
amplify.yml           AWS Amplify Hosting 빌드 설정
deploy/ec2/           EC2 + RDS 운영 템플릿
```

## 주요 게임 엔진 함수

- `createInitialGame`
- `getValidMoves`
- `validateMove`
- `placeTile`
- `findScoringLines`
- `calculateScore`
- `getCellsToRemove`
- `removeCells`
- `expireTurn`
- `switchTurn`
- `resignGame`

게임 엔진은 React와 네트워크 코드에 의존하지 않으며 입력 상태를 직접 변경하지 않습니다. 웹 앱과 온라인 서버가 같은 패키지를 사용해 점수, 제거, 승패를 계산합니다.

## 실행

요구 환경:

- Node.js 22 이상
- pnpm 11.1.3

```bash
pnpm install
pnpm dev
```

웹 개발 서버 기본 주소는 `http://localhost:5173`입니다.

온라인 사설방을 테스트하려면 서버 개발 모드를 별도 터미널에서 실행합니다.

```bash
pnpm dev:server
```

서버 기본 주소는 `http://localhost:8080`이며, 헬스 체크는 `GET /health`입니다. 웹 앱은 `VITE_SOCKET_URL` 환경 변수로 Socket.IO 서버 주소를 읽고, 기본값은 `http://localhost:8080`입니다.

PostgreSQL을 로컬에서 함께 확인하려면 Docker Compose로 DB를 띄운 뒤 마이그레이션을 실행합니다.

```bash
docker compose -f compose.local.yml up -d
pnpm db:migrate
pnpm db:check
```

## 온라인 서버 진행 상황

현재 `apps/server`에는 다음 서버 권위형 기반이 들어 있습니다.

- Fastify HTTP 서버
- Socket.IO 실시간 연결
- `room:create`, `room:join`, `room:ready`
- `game:move`, `game:resign`, `game:reconnect`
- 서버 측 턴 검증, 점수 계산, 타일 제거, 승패 처리
- 연결 끊김 표시와 재접속 복구
- 서버 루프 기반 턴 시간 만료 처리
- PostgreSQL/RDS 방·플레이어·게임·수 기록 저장
- 서버 재시작 시 RDS의 활성 방 스냅샷 복구
- `GET /rooms/:code` 디버그 조회

`DATABASE_URL`이 없으면 메모리 모드로 동작하고, 값이 있으면 RDS/PostgreSQL 기록 저장을 활성화합니다. 마이그레이션 SQL은 `apps/server/db/migrations`에 있습니다.

## 검증 명령

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
pnpm db:check
```

현재 자동 테스트는 게임 엔진 15개, AI 엔진 2개, 서버 방 서비스 9개로 구성됩니다. 연결 판정, 동시 득점, 제거, 승리, 무승부, 시간 초과, 불변성, AI 즉시 득점, 방 생성, 준비, 서버 권위형 수 처리, 재접속, 참가자 검증, 서버 자동 시간 만료, 서버 재시작 복구를 포함합니다.

## AWS 배포

정적 웹 앱은 저장소 루트의 `amplify.yml`을 이용해 AWS Amplify Hosting에 연결할 수 있습니다.

1. AWS Amplify에서 이 GitHub 저장소와 `main` 브랜치를 연결합니다.
2. Amplify가 루트의 빌드 설정을 자동 인식하는지 확인합니다.
3. SPA 라우팅을 위해 Amplify의 Rewrites and redirects에 다음 규칙을 추가합니다.

```text
Source: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|map|json)$)([^.]+$)/>
Target: /index.html
Type: 200 (Rewrite)
```

사용자가 실제 AWS 리소스를 생성합니다. 저장소에는 EC2 + RDS 배포를 위한 준비물이 들어 있습니다.

권장 AWS 구성:

- Web: EC2 Nginx 정적 서빙 또는 AWS Amplify Hosting
- Server: EC2 systemd 서비스
- Database: RDS PostgreSQL
- Secrets: AWS Secrets Manager
- WebSocket URL: 웹 빌드 환경 변수 `VITE_SOCKET_URL`
- Server CORS: 서버 환경 변수 `CORS_ORIGIN`

EC2 + RDS 운영 템플릿:

- `deploy/ec2/env.server.example`
- `deploy/ec2/color-game-server.service.example`
- `deploy/ec2/nginx-color-game.conf.example`
- `deploy/ec2/README.md`

## 아직 구현하지 않은 기능

- 실제 이메일·Google 로그인
- 일반 온라인 자동 매칭
- 경쟁전, 레이팅, 티어, 배치 경기, 시즌
- 사설방 초대 링크 공유 버튼과 관전/재대전 UX
- PostgreSQL 및 영속 게임 기록
- 재접속 유예 시간과 이탈 패배 정책
- 프로필, 최근 경기, 리더보드

이 기능들은 현재 순수 게임 엔진을 서버에서도 재사용하는 방식으로 단계적으로 추가할 수 있습니다.
