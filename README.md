# OUR SEASON — 모바일 청첩장

선택한 [Concept 01 사진 앨범 v2](research/mockups/concept-01-photo-album-v2.png)를 바탕으로 만든 Astro 정적 사이트입니다. 동영상 없이 사진과 글로 구성합니다.

## 로컬 실행

Node.js 22.19 이상을 권장합니다. Astro 자체 최소 버전은 22.12이지만 최신 하위 의존성은 22.19 이상을 요구합니다.

```sh
npm install
npm run dev
```

브라우저에서 http://localhost:4321 을 엽니다. 로컬 제작에는 Git이 필요하지 않습니다. 현재 Git 초기화와 외부 배포는 하지 않았습니다.

## 내용과 사진 변경

- [src/data/wedding.ts](src/data/wedding.ts): 이름, 예식 일시, 장소, 연락처, 계좌, 초대 문구, 사진과 앨범 이야기
- [src/assets/photos](src/assets/photos): 웹용 사진. 위 데이터 파일의 import와 연결합니다.
- [src/styles/global.css](src/styles/global.css): 색상, 글꼴, 모바일·PC 배치

사진과 이야기 앨범은 별도로 관리합니다. `photos`에 고유 `id`로 사진을 등록하고, `albums[].photoIds`에 넣을 사진 ID를 순서대로 적습니다. 앨범의 첫 사진이 카드 표지가 되며 여러 장을 묶을 수 있습니다. `previewPhotoIds`에는 본문에 표시할 대표 컷만 고릅니다. 모든 사진은 ‘사진 전체 보기’에서 볼 수 있어 사진을 추가해도 본문 카드가 자동으로 늘어나지 않습니다.

`hero.image`·`hero.alt`·`hero.position`은 표지 사진·설명·자르기 위치입니다. 표지는 전체 갤러리의 첫 사진과 다르게 지정할 수 있습니다. 각 사진의 `position`은 본문 카드의 자르기 위치이며, 갤러리에서는 원래 비율로 사진 전체를 보여 줍니다. 존재하지 않는 사진 ID와 중복 ID는 빌드 오류로 알려줍니다.

현재 사진과 인물, 이름, 예식 일정은 가상 샘플입니다. 실사용 전에 정보를 바꾸고 `isDemo`를 `false`로 설정하세요. 빈 연락처·계좌·지도 정보는 실제 번호나 주소로 연결하지 않습니다. 지도 링크를 채우면 길찾기 버튼이 나타납니다. 지도 SDK·서버·S3는 사용하지 않습니다.

`isDemo: false`에서는 연락처가 없는 사람과 빈 계좌 영역을 숨깁니다. 두 사람 모두 연락처를 생략하면 연락하기 버튼 대신 하단에 공유하기를 표시합니다. 샘플 모드는 빈 상태를 미리 볼 수 있게 기존 안내를 유지합니다. 날짜·시간대·전화번호 형식·지도 URL·사진 설명 등 잘못된 설정은 빌드에서 알려줍니다. 실제 전화번호 소유자나 계좌 예금주, 장소의 정확성까지 판별하지는 않습니다.

사진 원본은 저장소 밖에 보관하고, 메타데이터를 제거한 웹용 기준본만 넣으세요. 빌드 과정에서 화면 크기별 WebP와 OG용 JPEG를 생성합니다. 폰트는 npm 패키지로 설치해 사이트와 함께 제공합니다.

## 포함된 동작

- 모바일 1열 / 넓은 화면에서 고정 표지와 본문 2열
- 이야기별 사진 앨범과 전체 갤러리, 이전·다음 버튼, 방향키·스와이프
- 갤러리 사진 로딩 상태, 실패 안내와 재시도
- 표지에서 날짜·장소 확인 및 예식 안내로 이동
- 사진·연락처·복사 창은 Escape·닫기·브라우저 뒤로가기로 닫기, 앞으로가기로 다시 열기
- 날짜 기반 달력·카운트다운, 캘린더 일정 파일 다운로드
- 연락처 모달, 선택적으로 전화·문자·지도 연결, 계좌 복사
- 시스템 공유와 URL 복사, 복사 권한이 없을 때 수동 복사 창
- SNS 피드의 하트는 현재 브라우저에만 표시를 보관하며 서버로 전송하지 않음
- 모션 감소, 키보드 포커스, 모바일 하단 안전 영역 대응

카카오 전용 SDK 공유는 앱 키가 필요한 추가 기능이므로 아직 연결하지 않았습니다. 현재는 시스템 공유 또는 링크 복사로 카카오톡에 전달할 수 있습니다.

## 검증

```sh
npm run check
npm run build
npm run test:e2e
```

자동 브라우저 검사는 Playwright와 설치된 Chrome을 사용합니다. 로컬 결과가 실제 iPhone·Android 카카오톡 브라우저 테스트를 대체하지는 않습니다.

발송 모드의 빈 정보·전화·문자·지도·계좌 복사는 임시 폴더에 만든 가상 데이터로 검증합니다. 검사 종료 후 임시 사이트는 삭제하며 실제 청첩장 데이터는 바꾸지 않습니다.

## GitHub Pages 배포 준비

사용자가 배포를 요청하면 Git을 초기화하고 공개 저장소를 연결합니다. 프로젝트 주소에 맞춰 환경값을 지정할 수 있습니다.

```sh
SITE_URL=https://your-name.github.io BASE_PATH=/wedding_invitation npm run build
```

결과는 `dist/`에 생성됩니다. 계정의 루트 사이트라면 `BASE_PATH=/`를 사용합니다. 이미지·폰트·일정 다운로드 링크에 저장소 경로가 반영됩니다. GitHub Actions 배포 연결은 실제 저장소를 만든 뒤 진행합니다.

발송용으로는 `npm run build:release`를 사용합니다. 같은 `SITE_URL`·`BASE_PATH`를 지정하되 실제 HTTPS 도메인이 필요합니다. 샘플 모드, 빈 예식장 주소, 로컬·예시 주소는 오류로 표시합니다. 개발용 `npm run build`는 계속 샘플을 허용합니다.

[배포 워크플로](.github/workflows/deploy.yml)는 준비되어 있습니다. 실제 공개 저장소에 올린 뒤 Settings → Pages → Source를 GitHub Actions로 설정하고 Actions에서 수동 실행합니다. Pages의 도메인·저장소 경로를 자동으로 읽어 타입 검사 → 발송용 빌드 → 산출물 업로드 → 배포 순으로 실행합니다. 현재 파일을 작성하고 YAML 구조만 확인했으며 GitHub에서 실행하지 않았습니다.

- [Astro 공식 GitHub Pages 배포 안내](https://docs.astro.build/en/guides/deploy/github/)

## QR 생성

실제 HTTPS 배포 주소가 확정된 뒤 실행하세요.

```sh
npm run qr -- https://your-name.github.io/wedding_invitation/
```

위 주소는 형태를 보여 주는 예시이며, 스크립트에 실제 계정 주소를 넣어야 합니다. SVG·1024px PNG·원본 URL을 `output/qr/`에 생성합니다. 외부 QR 서비스는 사용하지 않습니다. 지금은 배포 URL이 없어 인쇄용 QR을 생성하지 않았습니다.

[조사 문서](research/README.md) · [사진 생성 기록](research/mockups/site-assets.md)
