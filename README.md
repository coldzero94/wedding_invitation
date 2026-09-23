# OUR SEASON — 모바일 청첩장

선택한 [Concept 01 사진 앨범 v2](research/mockups/concept-01-photo-album-v2.png)를 바탕으로 만든 Astro 정적 사이트입니다. 동영상 없이 사진과 글로 구성합니다.

[배포된 미리보기](https://coldzero94.github.io/wedding_invitation/) · [공개 저장소](https://github.com/coldzero94/wedding_invitation) · [배포·QR 기록](research/deployment.md)

현재 배포는 실제 이름·일정·장소에 샘플 사진 3장을 넣은 미리보기입니다. 사진, 부모님 성함, 나머지 계좌를 채운 뒤 발송용으로 전환합니다.

## 로컬 실행

Node.js 22.19 이상을 권장합니다. Astro 자체 최소 버전은 22.12이지만 최신 하위 의존성은 22.19 이상을 요구합니다.

```sh
npm install
npm run dev
```

브라우저에서 http://localhost:4321 을 엽니다. 2026-09-22에 Git을 초기화하고 `coldzero94/wedding_invitation` 공개 저장소와 GitHub Pages를 연결했습니다.

## 내용과 사진 변경

- [src/data/wedding.ts](src/data/wedding.ts): 이름, 부모님 성함, 예식 일시, 장소, 교통, 계좌, 초대 문구, 사진별 설명
- [src/assets/gallery](src/assets/gallery): 갤러리 사진. 파일 이름 순서대로 표시합니다.
- [src/assets/photos/hero.jpg](src/assets/photos/hero.jpg): 표지와 카카오톡 공유 미리보기에 쓰는 사진
- [src/styles/global.css](src/styles/global.css): 색상, 글꼴, 모바일·PC 배치

### 갤러리 사진 넣기 (최대 30~40장 권장)

1. 저장소 최상위에 `photos-inbox` 폴더를 만들고 휴대폰 원본 사진을 넣습니다. 이 폴더는 Git에 올라가지 않습니다.
2. 파일 이름 순서가 갤러리 순서입니다(1, 2, … 10 순으로 정렬). 원하는 순서가 되도록 이름을 바꿔 두세요.
3. `npm run photos`를 실행하면 사진을 바른 방향으로 돌리고, 긴 변 2560px로 줄이고, 위치(GPS) 정보를 지운 뒤 `src/assets/gallery/01.jpg`부터 차례로 저장합니다. iPhone의 HEIC 사진도 JPG로 바꿉니다(macOS에서만 자동 변환). 사진이 아닌 파일은 건너뛰고 알려 줍니다. 기존 갤러리 사진은 새 사진으로 교체됩니다. 다른 폴더를 쓰려면 `npm run photos -- <폴더>`로 실행합니다.
4. `npm run dev`로 확인하고 커밋·배포합니다.

갤러리는 처음에 9장을 보여 주고, 13장 이상이면 "사진 더보기" 버튼으로 나머지를 펼칩니다. 썸네일은 인물처럼 눈에 띄는 부분을 중심으로 3:4로 자르고, 사진을 누르면 전체 화면에서 원래 비율로 넘겨 볼 수 있습니다.

사진별로 설명·대체 텍스트·자르기 위치를 바꾸려면 `wedding.ts`의 `gallery`에 파일 번호로 적습니다.

```ts
gallery: {
  '07': { caption: '제주에서', alt: '바다 앞의 두 사람', position: 'top' },
},
```

`npm run photos`를 다시 실행하면 번호가 처음부터 새로 매겨집니다. 이 설정이 원하는 사진을 가리키는지 실행 결과 목록과 비교해 다시 확인하세요(설정이 있으면 스크립트가 알려 줍니다). 사진을 빼려면 `photos-inbox`에서 지우고 다시 실행합니다.

`position`은 `attention`(기본, 눈에 띄는 부분 중심)·`top`·`bottom`·`left`·`right`·`center` 등을 쓸 수 있습니다. 대체 텍스트를 따로 적지 않으면 "찬영과 예지의 웨딩 사진 3"처럼 자동으로 붙습니다.

저장소가 공개되어 있으므로 휴대폰 원본을 `src/assets/gallery`나 `src/assets/photos`에 직접 넣지 마세요. 원본에는 촬영 위치가 들어 있습니다. 빌드는 두 폴더에서 위치 정보가 남은 사진을 찾으면 경고하고, HEIC처럼 쓸 수 없는 형식이나 손상된 파일은 오류로 알려 줍니다. 배포되는 사이트에는 원본이 아니라 크기별로 만든 WebP와 공유용 JPG만 올라갑니다.

### 표지 사진 바꾸기

```sh
npm run photos -- --hero ~/Downloads/cover.jpg
```

같은 방식으로 정리해 `src/assets/photos/hero.jpg`를 교체합니다. 그다음 `wedding.ts`의 `hero.alt`(사진 설명)와 `hero.position`(표지에서 보일 위치, 예: `'52% 25%'`)을 새 사진에 맞게 고칩니다. 카카오톡 공유 이미지는 같은 사진에서 인물 중심으로 자동으로 잘라 만듭니다.

### 그 밖의 정보

- 부모님 성함: `groom.father`·`groom.mother`(신부도 동일)를 채우면 인사말 아래에 "이○○ · 김○○ 의 아들 찬영" 줄이 나타납니다. `relation`에 장남·차남 등을 적을 수 있고, 고인은 "故 이○○"처럼 적습니다.
- 계좌: `accounts`에 `relation`(아버지·어머니 등)을 함께 적으면 신랑측·신부측 목록에 "아버지 이○○"처럼 표시됩니다. 비워 두면 본인 계좌로 표시합니다.
- 연락처: 전화번호를 비워 두면 연락하기 버튼을 표시하지 않고, 하단 바에는 공유하기를 둡니다.

실사용 전에 정보를 모두 채우고 `isDemo`를 `false`로 설정하세요. 날짜·시간대·전화번호 형식·지도 URL·사진 설정 등 잘못된 값은 빌드에서 알려줍니다. 실제 전화번호 소유자나 계좌 예금주, 장소의 정확성까지 판별하지는 않습니다.

## 포함된 동작

- 모바일 1열 / 넓은 화면에서 고정 표지와 본문 2열
- 표지 다음 SAVE THE DATE·달력·D-day와 인사말, 30장 이상 담을 수 있는 사진 갤러리
- 전체 화면 사진 보기: 이전·다음 버튼, 방향키·스와이프, 다음 사진 미리 불러오기, 확대 허용
- 갤러리 사진 로딩 상태, 실패 안내와 재시도
- 사진·연락처·복사 창은 Escape·닫기·브라우저 뒤로가기로 닫기, 앞으로가기로 다시 열기
- 캘린더 일정 파일 다운로드, 오시는 길(주소 복사·네이버 지도·카카오맵), 신랑측·신부측 계좌 복사
- 카카오톡 공유 카드(청첩장 보기·위치 보기 버튼), 시스템 공유와 링크 복사
- 하단 바는 표지를 지난 뒤에 나타남, 스크롤에 따라 부드럽게 나타나는 본문
- 모션 감소 설정, JavaScript 없이도 전체 내용과 사진 보기, 키보드 포커스, 모바일 하단 안전 영역 대응

카카오톡 공유는 저장소 변수 `KAKAO_JS_KEY`로 켭니다. 비워 두면 버튼이 나타나지 않습니다.

## 검증

```sh
npm run check
npm run build
npm run test:e2e
```

자동 브라우저 검사는 Playwright와 설치된 Chrome을 사용합니다. 로컬 결과가 실제 iPhone·Android 카카오톡 브라우저 테스트를 대체하지는 않습니다.

발송 모드의 빈 정보·전화·문자·지도·계좌 복사와 사진 30장 갤러리는 임시 폴더에 만든 가상 데이터로 검증합니다. 검사 종료 후 임시 사이트는 삭제하며 실제 청첩장 데이터는 바꾸지 않습니다.

## GitHub Pages 배포

배포 주소는 `https://coldzero94.github.io/wedding_invitation/`입니다. 로컬에서도 같은 경로로 빌드할 수 있습니다.

```sh
SITE_URL=https://coldzero94.github.io BASE_PATH=/wedding_invitation npm run build
```

결과는 `dist/`에 생성됩니다. 이미지·폰트·일정 다운로드 링크에 저장소 경로가 반영됩니다.

발송용으로는 `npm run build:release`를 사용합니다. 같은 `SITE_URL`·`BASE_PATH`를 지정하되 실제 HTTPS 도메인이 필요합니다. 샘플 모드, 빈 예식장 주소, 로컬·예시 주소는 오류로 표시합니다. 개발용 `npm run build`는 계속 샘플을 허용합니다.

[배포 워크플로](.github/workflows/deploy.yml)를 GitHub에서 실행해 미리보기 배포를 완료했습니다. Pages의 도메인·저장소 경로를 자동으로 읽고 검사·빌드 후 배포합니다. 수정한 내용을 커밋·푸시한 다음 Actions → Publish wedding invitation → Run workflow에서 모드를 선택합니다.

- `preview`: 샘플을 허용하는 디자인 미리보기. `isDemo`가 켜져 있으면 제목과 본문에 샘플임을 표시합니다.
- `release`: 실제 발송용. `build:release`로 샘플 여부·주소 등을 검사합니다.

두 모드는 같은 주소를 갱신합니다. 현재 자동 푸시 배포는 사용하지 않으며 수동 실행합니다. CLI로는 다음과 같이 실행합니다.

```sh
gh workflow run deploy.yml --repo coldzero94/wedding_invitation --ref main -f mode=preview
```

- [Astro 공식 GitHub Pages 배포 안내](https://docs.astro.build/en/guides/deploy/github/)

## QR 생성

현재 배포 주소로 QR을 생성했습니다. 다시 생성하려면 다음 명령을 사용합니다.

```sh
npm run qr -- https://coldzero94.github.io/wedding_invitation/
```

[SVG](output/qr/invitation.svg) · [PNG](output/qr/invitation.png) · [원본 URL](output/qr/url.txt)을 저장했습니다. PNG를 디코딩해 배포 주소와 일치하는지 확인했습니다. 현재 연결되는 내용은 샘플이며 실제 인쇄물 스캔 검증은 별도로 필요합니다. 외부 QR 서비스는 사용하지 않습니다.

[조사 문서](research/README.md) · [사진 생성 기록](research/mockups/site-assets.md)
