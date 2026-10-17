# AGENTS.md

> **`CLAUDE.md`는 이 파일(`AGENTS.md`)을 가리키는 심볼릭 링크입니다.** 내용은 이 파일만 고치고, `CLAUDE.md`를 일반 파일로 바꾸거나 따로 편집하지 않습니다. 링크가 끊기면 저장소 최상위에서 `ln -sf AGENTS.md CLAUDE.md`로 다시 만듭니다. Claude Code는 `CLAUDE.md`를, Codex 등 다른 도구는 `AGENTS.md`를 읽으므로 모두 같은 내용을 봅니다.

이 저장소에서 작업하는 에이전트와 사람을 위한 안내입니다. 결정이 바뀌거나 새 작업 방식이 생기면 이 문서도 함께 갱신하고 같은 커밋에 넣습니다. 저장소가 공개되어 있으므로 개인적인 내용은 적지 않습니다.

## 프로젝트 한눈에 보기

찬영 · 예지의 결혼식(2027-03-13 토 12:10, 발산 더뉴컨벤션 5층 제니스홀) 청첩장입니다. Astro 정적 사이트를 GitHub Pages(`https://coldzero94.github.io/wedding_invitation/`)에 배포합니다. 저장소와 사이트는 모두 공개되어 있습니다.

| 주소 | 내용 | 상태 |
|---|---|---|
| `/v2/` | 영화관 콘셉트 모바일 청첩장. **실제로 하객에게 보내는 메인 청첩장** | 계속 수정 중 |
| `/v2/print/` | 같은 콘셉트의 4x6 지류 청첩장 인쇄용 페이지(앞·뒷면) | 계속 수정 중, `noindex` |
| `/` | 첫 번째(클래식) 청첩장 | `v1-classic` 태그로 고정. 상견례용 페이지로 바꿀 아이디어가 있으나 미정 |

두 모바일 버전은 사실 정보를 `src/data/wedding.ts`에서 함께 읽습니다. 영화관 버전에만 쓰는 문구는 `src/data/movie.ts`에 있습니다.

## 주요 파일

- `src/data/wedding.ts`: 이름, 부모님 성함, 일시, 장소, 교통, 주차 안내 이미지, 계좌, 사진 설정. 두 버전 공용입니다.
- `src/data/movie.ts`: 영화관 버전 전용 문구(명대사, 크레딧, 필름 스트립 사진 번호와 자르기 위치, 쿠키), 지류 청첩장 문구(`paper`).
- `src/pages/v2/index.astro`, `src/styles/movie.css`, `src/scripts/movie.ts`: 영화관 버전.
- `src/pages/v2/print.astro`: 지류 청첩장. 스타일도 이 파일 안에 있습니다.
- `src/lib/invitation-data.ts`: 영화관 버전의 빌드 시 데이터 준비(표지 사진, 갤러리, 공유 이미지).
- `src/scripts/invitation.ts`: 두 버전 공용 동작(갤러리, 공유, 계좌 복사, 주차 안내, 확대 제한).
- `src/pages/index.astro`, `src/styles/global.css`: 클래식 버전(고정).
- `tests/*.spec.ts`: Playwright 테스트. 영화관·지류 관련 결정은 `tests/movie.spec.ts`가 지킵니다.

## 명령어

```sh
npm run dev            # 개발 서버
npm run check          # astro check (배포 워크플로도 이 단계를 거칩니다)
npm run build          # 로컬 빌드, 테스트는 이 결과(dist)를 씁니다
npm run test:e2e       # Playwright 테스트 (빌드 후 실행)
npm run photos         # photos-inbox → src/assets/gallery 정리 (위치 정보 제거, 번호 재지정)
SITE_URL=https://coldzero94.github.io BASE_PATH=/wedding_invitation npm run build:release   # 발송용 빌드(실제 주소)
```

변경을 마치면 `npm run check`, `npm run build`, `npx playwright test`가 모두 통과해야 합니다.

- 테스트는 **빌드된 `dist`**를 `astro preview`(포트 4322)로 띄워 검사하므로, 코드를 바꾼 뒤에는 먼저 `npm run build`를 다시 합니다.
- 기본 브라우저는 설치된 Chrome(`channel: 'chrome'`)이고, 일부 테스트는 테스트 안에서 WebKit을 직접 띄웁니다.
- 발송용 빌드(`build:release`)는 `isDemo: false`, 실제 HTTPS 주소, 비어 있지 않은 예식장 주소 등을 검사합니다(`src/lib/validate-wedding.ts`). 가상 데이터로 발송 모드를 검사하는 테스트(`tests/release-*.spec.ts`)는 실제 데이터를 바꾸지 않습니다.
- 인쇄용 PDF를 만들 때는 실제 주소로 `build:release`를 하고, 끝나면 테스트를 위해 `npm run build`로 되돌립니다.

## 배포

1. 커밋 후 `git push gh main` (원격 이름은 `origin`이 아니라 `gh`입니다).
2. `gh workflow run deploy.yml --repo coldzero94/wedding_invitation --ref main -f mode=release` 로 **항상 release 모드**로 배포합니다.
3. `gh run watch <id> --repo coldzero94/wedding_invitation --exit-status`로 끝까지 확인하고, 실제 주소에서 바뀐 내용을 다시 확인합니다.

카카오톡 인앱 브라우저는 캐시가 강해서, 예전 화면이 보이면 주소 끝에 `?v=숫자`를 붙여 열어 보라고 안내합니다. 카카오 공유 키는 저장소 변수 `KAKAO_JS_KEY`입니다.

## 반드시 지킬 것

- **공개 저장소:** 휴대폰 원본 사진은 `photos-inbox/`(Git 제외)에만 둡니다. 원본에는 촬영 위치가 들어 있으므로 `src/assets`에 직접 넣지 말고 `npm run photos`로 정리합니다. 전화번호는 요청에 따라 기록에서 지웠으니 다시 넣지 않습니다.
- **커밋 메시지:** 영어로, 무엇을 왜 바꿨는지 적습니다. 공동 작성자(Co-Authored-By) 같은 표시는 넣지 않습니다.
- **WebKit 확인:** 하객 대부분이 iPhone 카카오톡(WebKit)으로 엽니다. 화면 변경은 Chromium만이 아니라 WebKit에서도 확인합니다.
- **클래식 버전 고정:** 영화관 버전 작업 때문에 `src/pages/index.astro`, `src/styles/global.css`를 바꾸지 않습니다. 공용 데이터와 공용 스크립트를 바꿀 때는 두 버전을 모두 확인합니다.
- **표지와 지류 앞면은 같이 움직입니다:** 모바일 표지의 제목·구성은 지류 앞면과 같아야 합니다(두 분이 정한 규칙). 현재는 둘 다 **제목 문구 없음**입니다. 여러 번 글꼴과 문구를 바꾼 끝에 두 분이 지웠으니, 요청이 없으면 다시 넣지 않습니다.
- **프로세스 종료:** `pkill -f`, `killall`처럼 이름 일부로 프로세스를 종료하지 않습니다. 한 번 "cat"으로 종료했다가 "/Appli**cat**ions" 경로가 일치해 열려 있던 앱이 전부 꺼졌습니다. 직접 띄운 프로세스만 번호(PID)로 종료합니다. 예: `kill $(lsof -ti tcp:4399 -sTCP:LISTEN)`.

## 영화관 버전(`/v2/`) 현재 결정

- **표지:** 메인 사진(갤러리 01) 전체, 위쪽 "OUR SEASON PICTURES presents", 아래쪽 Groom/Bride, 날짜, 장소, NOW PLAYING 입장 버튼, 출연 표기. 제목 문구는 없습니다. 처음 방문할 때만 필름 리더(3, 2, 1)가 나오고, 새로고침 때는 나오지 않습니다.
- **글꼴:** 영문과 숫자는 Rozha One, 장식 글씨(Groom/Bride, presents, The End)는 Noto Serif Display SemiBold 이탤릭, 한글은 Pretendard입니다. 숫자는 lining 숫자를 씁니다.
- **티켓:** VIP TICKET, 날짜·시간·상영관, SEAT "초대석". 누르면 뒤집혀 달력과 카운트다운이 나옵니다.
- **이름 사이 기호:** 이모지나 "&" 대신 금색 하트 SVG를 쓰고, 화면 낭독기와 복사를 위해 숨김 글자("그리고"/"and")를 둡니다.
- **오시는 길:** `wedding.ts` 교통 문구에서 `[대괄호]`로 감싼 말은 영화관 버전에서 금색으로 강조됩니다([이대서울병원]). 주차 안내 이미지는 "주차 안내 보기"로 엽니다.
- **확대:** 페이지와 갤러리 사진은 확대되지 않고, 주차 안내 이미지를 연 동안에만 확대할 수 있습니다.
- **계좌:** 은행 형식대로 하이픈을 넣어 보여 주고, 복사할 때는 숫자만 복사합니다.
- **하단:** "처음으로" 링크만 둡니다(클래식 버전으로 가는 링크는 지웠습니다).
- **필름 스트립:** `movie.ts`의 `stripTop`·`stripBottom`은 갤러리 사진 번호와 세로 자르기 위치입니다. `npm run photos`로 번호가 바뀌면 함께 고칩니다.

## 지류 청첩장(`/v2/print/`)

- **크기:** 재단 크기 102 x 152 mm(4x6 세로), 도련 2 mm를 더한 106 x 156 mm 한 장씩. 인쇄선(파란 재단선)만 그리고, 글자는 재단선에서 4 mm 안쪽에 둡니다.
- **앞면:** 메인 사진 전체, 위쪽은 옅은 비네트, 아래쪽 그라데이션 위에 날짜·장소·이름(Rozha One 8pt, 금색 짧은 선). 제목 문구 없음.
- **뒷면:** 흰 바탕을 위아래 반으로 나눕니다. 위: WEDDING INVITATION, 골로새서 3:14, 인사말, 양가 부모님(아들·딸). 아래: LOCATION 목록(자차·주차·대중교통, 이대서울병원은 강조 없이), 그 아래 목록과 같은 폭의 크림색 영화 티켓(본문 "SCAN TO WATCH", 절취선 오른쪽에 13 mm QR → `/v2/`).
- **글씨 크기:** 인쇄되는 글씨는 모두 8pt 이상입니다(테스트가 확인합니다).
- **여백:** 위아래 여백은 글자 상자가 아니라 실제 잉크 기준으로 같게 맞춥니다. 앞면은 재단선에서 아래 글씨 끝까지 10.2 mm, 뒷면은 위아래 약 12.4 mm입니다.
- **PDF 주의:** `text-shadow`는 맥 미리보기에서 검은 상자로 보이고, 반복 CSS 그라데이션(바코드 등)은 PDF에서 깨집니다. 쓰지 않습니다.
- **검증:** 실제 주소로 `build:release`를 한 뒤 PDF로 인쇄하고, `pdfseparate`와 `sips -s format png`로 맥 미리보기(Quartz)와 같은 엔진에서 렌더링해 눈으로 확인합니다. QR은 디코딩해서 `/v2/` 주소인지 확인합니다. PNG는 한 장씩 따로 캡처합니다(같이 찍으면 이웃 장의 1px 줄이 섞입니다).
- **전달 파일:** 사용자가 지정한 폴더(현재 `~/Downloads/movie-invitation-print/`)에 `청첩장_4x6.pdf`, `1_앞면_인쇄선.png`, `2_뒷면_인쇄선.png`을 갱신합니다.
- **앞면 벡터 파일:** `1_앞면_벡터.pdf`(인쇄용), `1_앞면_벡터_재단선.pdf`, `1_앞면_벡터.svg`. 글자는 Rozha One 윤곽선(opentype.js로 추출, 위치는 인쇄 페이지에서 측정), 사진은 원본 JPEG, 그라데이션은 SVG 그라데이션으로 직접 만든 SVG입니다. PDF를 `pdftocairo`로 SVG로 변환하는 방식은 마스크가 깨져 쓰지 않습니다. 앞면을 바꾸면 이 파일도 다시 만듭니다. 사진 원본은 1200 x 1800이라 카드 크기에서 약 288dpi입니다.

## 기술 메모 (다시 겪지 않도록)

- **표지 깜빡임(WebKit):** 표지 등장 효과의 transition은 `html.cover-ready`가 붙은 뒤에만 선언합니다. 처음부터 선언하면 WebKit이 표지를 한 번 그렸다가 숨기면서 깜빡입니다. 다시 열었을 때 바로 준비된 표지는 `cover-instant`로 효과 없이 보여 줍니다.
- **CSS 인라인:** `astro.config.mjs`의 `inlineStylesheets: 'always'`는 카카오톡 인앱 브라우저가 새 HTML과 예전 CSS를 섞어 쓰지 않게 하려는 설정입니다. 바꾸지 않습니다.
- **clip-path 애니메이션:** WebKit은 `clip-path: none`으로는 애니메이션하지 않으므로 시작과 끝을 모두 `inset()`으로 씁니다.
- **티켓 뒤집기:** WebKit이 `backface-visibility`를 무시하는 경우가 있어서, 뒤집는 중간에 앞뒷면의 `visibility`를 바꿉니다.
- **처음으로·공유 링크:** 페이지 안 이동은 주소에 `#`을 남기지 않고, 공유된 주소의 `#invitation`은 지웁니다(공유 링크가 표지가 아닌 곳에서 열리지 않게).
- **카카오 공유 카드:** 이미지는 3:4(`kakao.jpg`)로 만들고 크기를 함께 넘깁니다. 크기를 안 넘기면 카카오가 정사각형으로 자릅니다. 카카오 개발자 앱의 [플랫폼 > Web]에 배포 도메인이 등록되어 있어야 합니다.
- **스크립트 글꼴 가운데 맞춤:** 필기체는 획이 글자 상자 밖으로 나가서, 상자 기준으로 가운데 정렬하면 치우쳐 보입니다. 필기체 제목을 다시 쓰면 줄마다 잉크 위치를 재서 보정합니다(이전에 `movie.ts`의 `nudge`로 처리했습니다).
- **글꼴 라이선스:** 사이트와 함께 배포하는 글꼴의 라이선스(OFL)는 `public/licenses/`에 둡니다. 글꼴을 추가하거나 빼면 이 폴더도 맞춰 고칩니다(현재 Rozha One, Noto Serif Display, Cormorant Garamond, Pretendard).

## 그 밖의 폴더

- `research/`: 처음 기획 단계의 조사와 시안 기록입니다. 클래식 버전 기준이라 지금 구조와 다른 내용이 있으니 참고만 합니다.
- `output/qr/`: `npm run qr`로 만든 QR(기본 주소 `/`를 가리킴)입니다. 지금 하객에게 보내는 주소는 `/v2/`이므로, 인쇄물 QR은 지류 페이지가 빌드할 때 `/v2/`로 직접 만듭니다. 새로 QR을 만들 때는 `/v2/` 주소로 만듭니다.
- `README.md`: 사진 넣기, 정보 바꾸기 등 사용 안내입니다. 내용 일부는 클래식 버전 기준입니다.
- `photos-inbox/`: 사진 원본 보관 폴더(Git 제외). `photos-inbox/family/`에 가족사진 합성본이 있습니다.

## 사진

- 갤러리는 32장(`src/assets/gallery/01.jpg`~). 01은 표지와 지류 앞면에도 쓰는 메인 사진입니다.
- `src/assets/photos/hero.jpg`, `og.jpg`, `kakao.jpg`는 클래식 표지와 공유 카드용입니다(카카오 공유 이미지는 3:4).
- 가족사진 합성본(`가족사진_합성.jpg`, 배경 투명 `가족사진_투명배경.png`)은 `photos-inbox/family/`에만 있습니다(Git 제외).

## 진행 중이거나 결정 대기

- 클래식 버전(`/`)을 상견례 때 보여 줄 스토리 웹페이지로 바꾸는 아이디어. 찬영 소개, 가족 소개, 부모님께 드리는 편지 초안이 있고 예지 님 내용을 기다리는 중입니다. 주소(공개 범위)와 개인정보 노출을 먼저 정해야 합니다.
- 모바일 표지 맨 위 "OUR SEASON PICTURES presents"는 뒤따르는 제목이 없어졌으므로, "presents"를 뺄지 정해야 합니다.
