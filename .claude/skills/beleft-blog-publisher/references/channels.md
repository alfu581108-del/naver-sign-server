# 채널별 발행 경로 (2026-10-02 조사)

조사 방식: 채널마다 별도 조사 에이전트가 공식 문서, GitHub 소스, 커뮤니티 자료를 확인했다. 실제 계정에는 아무것도 올리지 않았다.
표기: ✅ 1차 근거로 확인 · 🟡 2차·검색 요약 · 🔶 추정이라 첫 실행 때 검증 필요.
**발행 단계 전에 이 문서에서 해당 채널의 1순위 → 2순위 순서로 시도한다. 비추천·불가 경로는 쓰지 않는다.**

## 요약

| 채널 | 클라우드 자동 | 1순위 경로 | 필요한 것(1회 설정) |
|---|---|---|---|
| 블로그스팟 | ✅ 가능 | Blogger API v3 + OAuth | 구글 클라우드 앱 → refresh token (마리님 PC에서 15분) |
| 워드프레스 | ✅ 가능 🔶 | REST API v1.1 + OAuth2 토큰 | developer.wordpress.com 앱 → 토큰 (마리님 PC에서 10분) |
| 티스토리 | ❌ | 마리님 PC 크롬 + 주 1회 몰아서 **예약발행** | 크롬 세션 정리 (로그인 상태 유지) |
| 네이버 | ❌ | Claude가 만든 **붙여넣기 패키지** + 마리님 복붙·**예약발행** | 없음 |

공통 선행 조건 (클라우드 세션):
- 네트워크: 이 환경은 `public-api.wordpress.com`, `api.openai.com`, tistory/kakao/naver를 막는다(2026-10-02 실측 403). `*.googleapis.com`은 열려 있다.
- 비밀값: 클라우드 환경 설정의 **API credentials**(프록시가 헤더를 주입하므로 키가 세션 안에 보이지 않는다)에 넣는 것이 가장 안전하다 ✅. 일반 환경변수는 환경을 쓰는 누구나 읽을 수 있다 ✅.
- 키 값은 어떤 출력·노션·커밋에도 남기지 않는다.

---

## 1. 블로그스팟 (beleftangel.blogspot.com · blog ID 305944948756858417)

노션 런북의 "블로그스팟 API 종료"는 **오기**다. 종료된 것은 v2 GData(2024-09-30)이고, **v3는 운영 중**이다 ✅. 2026-10-02에 discovery 문서 revision 20260929를 확인했고, 미인증 호출에는 403 "unregistered callers"가 돌아왔다. 엔드포인트가 살아 있다는 뜻이다.

**1순위: Blogger API v3**
- 초안 만들기: `POST https://blogger.googleapis.com/v3/blogs/305944948756858417/posts?isDraft=true`, body `{title, content(HTML), labels[]}`
- 즉시 발행: `POST …/posts/{id}/publish`
- 예약 발행: `POST …/posts/{id}/publish?publishDate=2026-10-05T09:00:00%2B09:00`
- 인증: 사용자 OAuth. scope `https://www.googleapis.com/auth/blogger`. 서비스 계정은 쓸 수 없다 🔶.
- ⚠️ OAuth 동의 화면을 **"In production"** 으로 바꿔야 한다. Testing 상태면 refresh token이 7일 뒤 만료된다 ✅.
- 쿼터: 글 생성 약 50건/일 🟡. 주 3건이면 문제없다.
- 이미지: **API에 업로드 기능이 없다** ✅. 외부 URL(워드프레스 미디어, 자사몰 등)을 `<img src>`로 건다.
- 1회 설정(마리님 PC):
  1. console.cloud.google.com에서 프로젝트를 만들고 Blogger API v3를 사용 설정한다.
  2. OAuth 동의 화면을 External + Production으로 설정한다.
  3. 데스크톱 앱 클라이언트를 만들고 `client_secret.json`을 받는다.
  4. `InstalledAppFlow`로 refresh token을 1회 발급한다.
  5. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BLOGGER_REFRESH_TOKEN`을 비밀값으로 저장한다.
- refresh token은 헤더가 아니라 요청 본문에 들어가서 API credentials의 헤더 주입에 맞지 않는다 🔶. 대안 두 가지:
  - (a) 환경 비밀값(노출 위험 감수)
  - (b) Google Apps Script 웹앱이 발행을 대신하게 한다(토큰 관리 불필요)

**2순위: 이메일 게시(Mail2Blogger)** — 노션 런북의 기존 폴백(비밀 주소, 외부 공유 금지).
- 라벨 지정·예약 불가, 서식 일부 깨짐. 첨부 이미지는 Blogger가 직접 호스팅한다.
- 🔶 이메일을 "초안 저장" 모드로 받은 뒤 API로 라벨·예약을 patch하는 하이브리드는 테스트가 필요하다.

**3순위: 브라우저(Claude in Chrome)** — 마리님 PC가 켜져 있을 때만.

## 2. 워드프레스 (beleftangel.wordpress.com · blog_id 256805624 · 무료 simple)

- WordPress.com MCP 커넥터는 이 사이트에서 막혀 있다(`wpcom_paid_plan_required`) ✅.
- 무료 사이트는 생성 후 30일(~9/17)만 MCP를 쓸 수 있었다 🟡.

**1순위: REST API v1.1 + OAuth2 Authorization Code** 🔶 (무료 플랜 쓰기 성공은 아직 실호출로 확인하지 못함. 첫 실행은 `status=draft`로)
- 1회 설정:
  1. developer.wordpress.com/apps에서 앱을 만든다.
  2. 브라우저에서 `/oauth2/authorize?client_id=..&redirect_uri=..&response_type=code&blog=256805624`로 승인한다(구글 로그인 그대로 가능).
  3. `/oauth2/token`에서 code를 토큰으로 교환한다.
  4. 서버 측 code 방식 토큰은 만료되지 않는다 🟡.
- 이미지: `POST https://public-api.wordpress.com/rest/v1.1/sites/beleftangel.wordpress.com/media/new` (`media[]` multipart 또는 `media_urls[]`). 응답 URL을 블로그스팟에도 재사용한다.
- 글: `POST …/posts/new`. 필드는 `title, content(HTML), categories(이름 콤마), tags, featured_image, status(draft|publish), date(미래=예약)`.
- 토큰은 API credentials(host `public-api.wordpress.com`, Bearer)에 넣는다. 네트워크 허용도 필요하다.
- 403·플랜 오류가 나면 3순위로 간다.

**2순위: OAuth password grant + 앱 비밀번호** — 2단계 인증을 켜야 앱 비밀번호 메뉴가 나온다. 공식 문서상 "개발용"이다.

**3순위: Personal 플랜 업그레이드(연 $48 🟡) → MCP 콘텐츠 도구 사용.** 가장 쉽지만 비용이 들고 쓰기마다 승인이 필요하며, 새 글은 초안으로 만들어진다.

**불가 / 비추천:**
- Post by Email: Business 이상
- Zapier·Make: 플러그인 필요 → Business 이상
- 로그인 폼 자동화: 구글 SSO 팝업이 있고 봇 탐지에 걸린다

## 3. 티스토리 (beleft1004.tistory.com)

- Open API는 2024-02에 완전히 종료됐다 ✅ (글·첨부·댓글 전부).
- 이메일로 글을 올리는 기능은 없다.
- n8n·Make·Zapier 연동도 없다.

**1순위: 마리님 PC 크롬 + 주 1회 몰아서 예약발행**
- 실제 발행은 티스토리 서버가 예약 시각에 한다. 그래서 크롬 세션이 필요한 날이 주 1회로 줄어든다.
- 세션이 자꾸 풀리는 문제("카카오 로그아웃으로 대기") 대책 🔶:
  1. 자동화 전용 크롬 프로필을 고정한다. 시크릿·임시 프로필은 쓰지 않는다.
  2. "창을 닫을 때 쿠키 삭제"를 끄고, `[*.]tistory.com`·`[*.]kakao.com`을 항상 허용에 넣는다. 청소 프로그램에서 이 프로필을 제외한다.
  3. 카카오 로그인 화면에서 **[로그인 상태 유지]**(기본 24시간 → 약 1달 🟡)를 켠다.
  4. 2차 인증 화면에서 **[이 브라우저 기억]**을 켠다.
- 절차:
  1. `/manage`를 열어 로그인 상태인지 확인한다.
  2. 글쓰기 → 제목·본문 입력 → 카테고리·태그 지정 → 이미지 업로드.
  3. 완료 → 공개 → 발행일 **예약** → 예약 발행.
- 막히는 지점:
  - "이어서 작성" 확인창이 뜨면 취소한다.
  - 확장 모드에서는 이미지 파일 선택이 막힐 수 있다(`setFiles Not allowed`). 막히면 마리님이 파일 선택만 클릭한다.
- 한도: 공개 발행 하루 15건, 작성 50건 🟡. 무관하다.

**2순위: 마리님 PC에서 쿠키 기반 내부 관리 API** (오픈소스 `tistory-mcp` 방식, `POST /manage/post.json`, `/manage/post/attach.json`)
- 공식 API가 아니라서 바뀌면 깨진다.
- POST를 재시도하면 글이 중복된다. 이미지는 `attachments` 배열에도 꼭 넣어야 보존된다.
- 마리님이 명시적으로 원할 때만 쓴다.

**불가 / 비추천:**
- 클라우드(해외 IP)에서 쿠키 재사용: 카톡 푸시 2FA는 헤드리스로 처리할 수 없고 보호조치 위험이 있다.
- 크몽 자동 포스팅 프로그램: 영구 로그인 제한 사례가 있다 🟡.
- ID/PW 자동 로그인 반복.

## 4. 네이버 (blog.naver.com/beleftangel)

- 글쓰기 API는 2020-05-06에 종료됐다 ✅.
- Claude in Chrome·내장 브라우저는 naver.com을 차단한다 ✅ (런북 8/18 실측. 오탐 이슈 anthropics/claude-code#95539가 열려 있음).
- 컴퓨터 사용은 브라우저를 "보기만" 할 수 있다 ✅.
- 셀레니움 계열 자동화는 2025-07 이후 탐지·제재가 강화됐다 ✅. **메인 계정에는 쓰지 않는다.**

**1순위: 네이버 붙여넣기 패키지 + 마리님 복붙 + 예약발행**
- Claude가 글마다 HTML 페이지 하나를 만든다:
  - [제목 복사] [본문 복사] [태그 복사] 버튼과 카테고리, 추천 예약 시각
  - 본문 HTML은 h2/h3, p, strong, ul, a만 쓴다
  - 이미지 자리에는 `▶ [이미지 k]` 마커를 넣고, 아래에 이미지별 [이미지 복사(PNG 클립보드)] 버튼과 캡션을 둔다
- 노션 이미지 URL은 노션 밖에서 열리지 않는다. base64 이미지는 네이버가 걸러낸다 🟡. 그래서 이미지는 패키지에 직접 넣거나 공개 URL을 쓴다.
- 미리보기 PNG(SKILL.md 5절)와 함께 전달한다.
- 마리님 작업:
  1. 붙여넣기
  2. 이미지 자리마다 Ctrl+V
  3. 발행 패널에서 **예약**
  4. 하루 1편씩 분산한다. 몰아서 올리면 노출이 둔해진다 🟡.
- 첫 회 검증 🔶: 서식이 유지되는지, PNG 붙여넣기가 네이버 서버(pstatic)에 올라가는지, 예약 최대 기간이 얼마인지.
- 유사문서: 네이버는 canonical을 지정할 수 없다. 채널별로 제목·도입·구조·이미지 순서를 다르게 쓴다. 지금의 1인칭 대화형 원칙을 유지한다.

**비추천:** 셀레니움·상용 자동 포스팅(제재 위험 높음), 차단 우회 포크 확장(안전 정책 우회).

---

## 이미지 공통

- 원본 보관: 노션(초안 안), 가능하면 레포 `images/<순번>/`에도 둔다.
- 호스팅: 워드프레스 미디어(`media/new`)에 먼저 올리고 그 URL을 블로그스팟에서 재사용한다. 2026/09부터 이렇게 해 왔다.
- 티스토리·네이버: 각 에디터에 직접 업로드한다(검색 노출에 유리하다는 통설 🟡).
- 제품 실물이 나오는 자리는 실사진만 쓴다(SKILL.md 4절).
