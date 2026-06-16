# EC2 + RDS Deployment Notes

이 디렉터리는 실제 AWS 리소스를 만들지 않고, EC2와 RDS에 올릴 때 필요한 서버 운영 템플릿만 제공합니다.

## Runtime Shape

- EC2: Node.js 22, pnpm 11.1.3, Nginx, systemd
- RDS: PostgreSQL
- Web: `apps/web/dist` 정적 파일을 Nginx가 서빙
- Server: `@color-game/server`가 `127.0.0.1:8080`에서 실행
- WebSocket: Nginx가 `/socket.io/`를 서버로 프록시

## One-Time Setup Outline

```bash
corepack enable
corepack prepare pnpm@11.1.3 --activate

cd /srv/color-game/COLOR-GAME
pnpm install --frozen-lockfile

cp deploy/ec2/env.server.example /etc/color-game/server.env
# /etc/color-game/server.env 안의 DATABASE_URL, CORS_ORIGIN, AUTH_SECRET 값을 실제 값으로 수정

pnpm --filter @color-game/server db:migrate
pnpm build
```

그 다음:

```bash
sudo cp deploy/ec2/color-game-server.service.example /etc/systemd/system/color-game-server.service
sudo systemctl daemon-reload
sudo systemctl enable --now color-game-server

sudo cp deploy/ec2/nginx-color-game.conf.example /etc/nginx/sites-available/color-game
sudo ln -s /etc/nginx/sites-available/color-game /etc/nginx/sites-enabled/color-game
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS는 EC2에서 도메인을 연결한 뒤 Certbot 또는 사용자가 선택한 인증서 방식으로 설정하면 됩니다.

## Required Environment

`/etc/color-game/server.env`:

```bash
NODE_ENV=production
HOST=127.0.0.1
PORT=8080
CORS_ORIGIN=http://colortile.kro.kr,http://3.26.178.31
DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/color_game
DATABASE_SSL=true
DATABASE_REQUIRED=true
HEALTHCHECK_REQUIRE_DB=true
AUTH_SECRET=at-least-32-random-characters
```

웹 빌드 시:

```bash
pnpm --filter @color-game/web build
```

프론트는 `VITE_API_URL`, `VITE_SOCKET_URL`이 비어 있으면 현재 접속한 origin을 그대로 사용합니다. 같은 빌드로 `http://colortile.kro.kr/`와 `http://3.26.178.31/` 모두 동작합니다. API 서버를 별도 도메인으로 분리할 때만 두 env 값을 지정하세요.

## Database Commands

```bash
pnpm --filter @color-game/server db:migrate
pnpm --filter @color-game/server db:check
```

`db:migrate`는 `apps/server/db/migrations`의 SQL 파일을 `schema_migrations` 테이블로 추적합니다.

## HTTP and Socket Surface

Nginx는 다음 경로를 `127.0.0.1:8080` 서버로 프록시해야 합니다.

- `GET /health`, `GET /livez`, `GET /readyz`
- `GET /metrics`
- `POST /analytics/heartbeat`, `GET /analytics/visitors`
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /leaderboard`
- `GET /profiles/:accountId`, `GET /profiles/:accountId/matches`
- `GET /rooms/:code`
- `/socket.io/`

계정, 경쟁전 전적, 리더보드는 RDS가 필요합니다. `DATABASE_REQUIRED=true`와 `HEALTHCHECK_REQUIRE_DB=true`를 함께 켜면 DB 장애 시 readiness가 실패하도록 운영할 수 있습니다.

## Operations Notes

- 로그: systemd journal에서 확인합니다.
  `journalctl -u color-game-server -f`
- 장애 복구: 서버 재시작 시 `game_rooms.last_snapshot`에서 진행 중인 방을 복구합니다.
  `sudo systemctl restart color-game-server`
- RDS 백업: AWS 자동 백업과 스냅샷을 켭니다. 수동 백업은 `pg_dump "$DATABASE_URL" > color-game.sql` 형태로 수행합니다.
- DB 복원 후: 마이그레이션을 다시 적용하고 서버를 재시작합니다.
  `pnpm --filter @color-game/server db:migrate`
