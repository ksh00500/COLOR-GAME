# Tango Android 개발·배포 매뉴얼

## 구성

- 앱 이름: `Tango`
- 애플리케이션 ID: `com.ksh.tangogame`
- 최소 Android: 7.0 / API 24
- compileSdk / targetSdk: API 36
- 웹 자산: `apps/web/dist`
- 네이티브 프로젝트: `apps/mobile/android`
- 운영 API·Socket.IO: `https://tangogame.kro.kr`
- 앱 내부 origin: `https://localhost`

앱은 운영 웹사이트를 원격 WebView로 여는 대신 Vite 빌드 결과를 APK/AAB 안에 포함한다.
서버 통신과 공유 링크만 운영 도메인을 사용한다.

## 최초 환경 준비

필수 도구:

- Node.js 22+
- pnpm 11.1.3
- Java 21
- Android Studio
- Android SDK Platform 36와 Build Tools 36.0.0

Windows에서 SDK 환경 변수가 없다면 현재 PowerShell 세션에 설정한다.

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
```

## 개발 명령

저장소 루트에서:

```text
pnpm install
pnpm android:sync
pnpm android:debug
pnpm android:open
```

- `android:sync`: Android용 웹 빌드 후 네이티브 프로젝트에 복사
- `android:debug`: 설치 가능한 디버그 APK 생성
- `android:open`: Android Studio에서 프로젝트 열기

디버그 APK:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

USB 디버깅 기기에 설치:

```text
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## 서버 설정

Capacitor Android WebView의 origin은 `https://localhost`이므로 운영 서버의
`CORS_ORIGIN`에 이 값을 추가해야 로그인, REST API, Socket.IO가 동작한다.

```text
CORS_ORIGIN=...,https://tangogame.kro.kr,https://localhost
```

운영 환경 변경 후 서버를 재시작하고 다음 항목을 실제 기기에서 확인한다.

- 로그인·회원가입
- 일반·경쟁 매칭
- 사설방 생성·참가
- Socket.IO 재연결
- 리플레이 조회
- 출석 체크

## Android App Links

앱은 다음 HTTPS 링크를 처리한다.

- `https://tangogame.kro.kr/private?code=...`
- `https://tangogame.kro.kr/spectate/...`
- `https://tangogame.kro.kr/replay/...`

Play Console에서 App signing certificate의 SHA-256 지문을 확인한 뒤
`deploy/android/assetlinks.json.example`의 자리표시자를 교체한다. 완성 파일은 아래 주소에서
리디렉션 없이 `application/json`으로 제공해야 한다.

```text
https://tangogame.kro.kr/.well-known/assetlinks.json
```

설치된 앱의 링크 상태 확인:

```text
adb shell pm verify-app-links --re-verify com.ksh.tangogame
adb shell pm get-app-links com.ksh.tangogame
```

## 버전과 서명

현재 앱 버전:

- `versionName`: `1.2.2`
- `versionCode`: `5`

Play Store에 업로드할 때마다 `versionCode`를 반드시 증가시킨다.
업로드 키와 `keystore.properties`는 Git에 커밋하지 않는다.

정식 출시 전에는 다음 작업이 추가로 필요하다.

1. Play App Signing 활성화
2. 업로드 키 생성 및 별도 백업
3. Gradle release signing 설정
4. 서명된 AAB 생성
5. Play Console 내부 테스트 업로드
6. App Links 인증서 지문 배포
7. 개인정보 처리방침·계정 삭제·Data Safety 검토
8. Play Store 등록 정보의 지원 이메일을 `data.official.kr@gmail.com`으로 설정

앱과 웹에는 `/privacy`, `/account-deletion` 경로가 준비되어 있다. 계정 삭제는 현재
비밀번호를 다시 확인하고 계정 정보, 출석, 연결된 경기 기록과 리플레이를 함께 삭제한다.
개인정보 처리방침 문안은 기능 구현 기준의 초안이므로 공개 출시 전에 실제 개발자 정보를
입력하고 법률 검토를 거친다.

## CI

`.github/workflows/android.yml`은 기능 브랜치 push와 `main` 대상 PR에서 다음을 수행한다.

1. 의존성 설치
2. 전체 타입 검사
3. 전체 테스트
4. Android 웹 자산 동기화
5. Android 단위 테스트와 디버그 APK 빌드
6. APK를 14일간 GitHub Actions artifact로 보관

릴리스 AAB 서명 자동화는 Play Console과 업로드 키가 준비된 뒤 별도 workflow로 추가한다.

## 수익화 준비 상태

무료 컬러 칩 경제와 타일 색 상점은 서버 기능으로 동작한다. 창립자 팩, 프리미엄 팩,
보상형 광고는 화면에 출시 예정으로만 표시하며 Play 상품 ID와 AdMob ID가 준비되기 전에는
서버가 `FEATURE_LOCKED`로 거부한다.

AdMob 계정이 준비되면 `deploy/android/app-ads.txt.example`의 게시자 ID를 실제 값으로
교체하고 `https://tangogame.kro.kr/app-ads.txt`에서 제공한다. 개발 중에는 Google 공식
테스트 광고 단위만 사용한다. 보상 지급은 앱 콜백이 아니라 EC2의 SSV 검증과 고유
`transaction_id`를 기준으로 처리한다.

Play Billing 연결 시 창립자·프리미엄 팩은 비소모성 일회성 상품으로 등록한다. 정식 출시
시각과 창립자 판매 종료 시각은 서버 설정에 입력하며, 창립자 판매 기간은 정확히 30일이다.
