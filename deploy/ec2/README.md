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
# /etc/color-game/server.env 안의 DATABASE_URL, CORS_ORIGIN 값을 실제 값으로 수정

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
CORS_ORIGIN=https://your-domain.example
DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/color_game
DATABASE_SSL=true
DATABASE_REQUIRED=true
HEALTHCHECK_REQUIRE_DB=true
```

웹 빌드 시:

```bash
VITE_SOCKET_URL=https://your-domain.example pnpm --filter @color-game/web build
```

## Database Commands

```bash
pnpm --filter @color-game/server db:migrate
pnpm --filter @color-game/server db:check
```

`db:migrate`는 `apps/server/db/migrations`의 SQL 파일을 `schema_migrations` 테이블로 추적합니다.
