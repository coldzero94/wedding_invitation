# 사진 저장·최적화·파일 관리

> 조사일: 2026-09-21 · 완전 무료 반응형 모바일 청첩장

[조사 목차로 돌아가기](README.md)

## 왜 S3가 필요 없는가

S3 같은 오브젝트 스토리지는 실행 중에 사진이 추가·삭제되거나, 사용자가 파일을 업로드하거나, 수천 장 이상의 원본을 별도로 관리해야 할 때 유용하다.

이번 프로젝트는 사진 목록이 제작 단계에서 확정된다. 따라서 사진을 `src/assets/photos` 등에 넣고 사이트와 함께 배포하면 된다. 정적 호스팅 CDN이 사진까지 함께 제공하므로 별도의 저장소, API 키, 업로드 API, 접근 정책이 필요 없다.

사진이 변경되면 저장소에서 파일을 교체하고 다시 배포한다. GitHub Actions를 연결하면 Git push마다 빌드하고 GitHub Pages에 자동 배포할 수 있다.

## 사진 저장 및 최적화 계획

스튜디오 원본 사진을 웹사이트에서 그대로 내려받게 하면 첫 화면이 늦게 뜨고 모바일 데이터 사용량도 커진다. 스튜디오 원본은 프로젝트 밖에 보관한다. 크기를 줄이고 메타데이터를 제거한 웹용 기준본만 공개 저장소와 빌드 입력에 사용하고, 사이트에는 화면 크기에 맞게 변환된 파일을 제공한다.

권장 출력 규격:

| 용도 | 너비 후보 | 형식 | 로딩 |
| --- | --- | --- | --- |
| 첫 화면 대표 사진 | 640, 960, 1440px | AVIF + WebP | 즉시 로딩 |
| 본문 사진 | 480, 800, 1280px | AVIF + WebP | 지연 로딩 |
| 갤러리 썸네일 | 320, 640px | WebP | 지연 로딩 |
| 확대 이미지 | 1280 또는 1600px | AVIF + WebP | 클릭 시 로딩 |
| 카카오톡/메신저 미리보기 | 1200×630px | JPEG 또는 PNG | 별도 파일 |

브라우저에는 `srcset`과 `sizes`를 제공해 화면에 맞는 사진만 선택하게 한다. Astro의 이미지 컴포넌트는 빌드 시 WebP 등을 생성할 수 있다.

- [Astro 이미지 API](https://docs.astro.build/en/reference/modules/astro-assets/)
- [반응형 이미지 설명](https://web.dev/learn/design/responsive-images)
- [이미지 성능 지침](https://web.dev/learn/performance/image-performance)

초기 기준은 갤러리 20~30장, 전체 최초 다운로드 2~4MB 이하로 잡는다. 첫 화면 이외의 사진은 지연 로딩하여 전체 갤러리 용량이 초기 화면 속도에 영향을 주지 않게 한다.

## 사진 개인정보와 파일 관리

프로젝트 밖에 보관하는 원본 사진에는 촬영 위치, 촬영 시각, 카메라 모델 등의 EXIF 정보가 포함될 수 있다. 웹용 기준본은 공개 저장소에 올리기 전에 메타데이터를 제거하고, 빌드 산출물도 다시 확인한다.

Astro 이미지 처리가 기본으로 사용하는 Sharp는 별도 `keepMetadata` 설정이 없으면 EXIF, XMP, IPTC 등을 제거한다. 그래도 배포 산출물에 대해 `exiftool` 같은 도구로 GPS와 원본 파일명이 남지 않았는지 마지막 검사를 한다.

권장 규칙:

- 공개 파일명은 `hero-01`, `gallery-01`처럼 중립적으로 짓는다.
- 스튜디오 파일명, 사람 이름, 촬영 날짜를 파일명에 남기지 않는다.
- 원본 사진은 공개 `public` 폴더에 직접 복사하지 않는다.
- Astro가 처리하는 소스 자산으로 불러오고 변환된 결과물만 배포한다.
- 프로덕션 소스맵은 만들지 않는다.
- `dist` 폴더를 검사해 원본 JPEG와 불필요한 개인정보가 없는지 확인한다.

- [Sharp 출력 메타데이터 정책](https://sharp.pixelplumbing.com/api-output/)
- [Astro에서 Sharp가 기본 이미지 서비스라는 안내](https://docs.astro.build/en/reference/errors/missing-sharp/)

## 사진을 GitHub 저장소에 넣어 제공하는 방법

가능하며 이번 프로젝트의 최종 권장 방식이다. 다만 브라우저가 `raw.githubusercontent.com`에서 사진을 직접 가져오게 만들지는 않는다. GitHub 저장소에 소스와 웹용 기준 사진을 저장하고, GitHub Actions로 빌드한 뒤 GitHub Pages가 완성된 사진 파일을 청첩장 주소에서 제공하게 한다.

```text
공개 GitHub 저장소
├── src/
│   └── assets/
│       └── photos/
│           ├── hero/
│           ├── episodes/
│           ├── moments/
│           └── interview/
├── public/
│   ├── og/wedding-cover.jpg
│   └── qr/invitation.svg
└── Astro 소스
          │ push
          ▼
GitHub Actions 빌드 → GitHub Pages 배포
          │ 사진 크기·형식 변환
          ▼
https://사용자명.github.io/저장소명/_astro/사진.hash.webp
```

### 저장소에 넣을 파일

- 긴 변 기준 약 2000~2400px로 줄인 웹용 기준 사진
- EXIF·GPS·카메라 정보와 불필요한 색상 프로필을 제거한 파일
- JPG 또는 WebP 형식, 사진 한 장당 가능하면 0.5~1.5MB 이하
- 파일명은 `001-opening.jpg`, `episode-01.jpg`처럼 개인 이름이나 촬영 원본 번호 없이 작성
- OG 공유 이미지는 카카오톡에서 주소가 안정적으로 유지되도록 `public/og/`에 별도 저장

### 저장소에 넣지 않을 파일

- 스튜디오가 전달한 RAW, TIFF, PSD와 수십 MB짜리 원본 JPG
- 사용하지 않는 후보 사진과 중복 보정본
- GPS가 포함된 휴대전화 원본
- 동영상 원본과 전체 음원 파일

Astro의 로컬 이미지 컴포넌트는 `src/assets/photos/`의 사진을 빌드할 때 최적화하고 해시가 붙은 파일로 출력한다. 화면 폭별 `srcset`도 만들 수 있으므로 별도 이미지 CDN이 필요 없다. `public/`의 파일은 변환 없이 그대로 복사되므로, OG 이미지·QR·파비콘처럼 고정 주소가 필요한 자산에만 사용한다.

- [Astro 로컬 이미지와 최적화](https://docs.astro.build/en/reference/modules/astro-assets/)
- [Astro의 `src`와 `public` 이미지 구분](https://docs.astro.build/en/guides/images/)

### 현재 무료 한도와 운영 기준

- GitHub 웹 화면에서 올리는 파일은 개별 25MiB까지이며, 일반 Git 저장소는 100MiB보다 큰 단일 파일을 차단한다.
- GitHub는 저장소를 가능하면 1GB 미만으로 유지할 것을 권장한다.
- GitHub Pages의 배포 사이트는 최대 1GB이며 월 100GB의 소프트 대역폭 제한이 있다. 대안인 Cloudflare Pages 무료 플랜은 사이트당 최대 20,000개 파일, 단일 정적 파일 25MiB까지 지원한다.
- 이 청첩장은 최적화 사진 20~40장 규모이므로 위 한도보다 훨씬 작다.
- Git LFS는 필요하지 않으며 사용하지 않는다.

- [GitHub 대용량 파일 기준](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- [Cloudflare Pages 무료 플랜 제한](https://developers.cloudflare.com/pages/platform/limits/)

사진을 교체할 때마다 Git 기록에는 이전 이미지도 남아 저장소 크기가 증가한다. 따라서 원본을 먼저 웹용으로 변환한 다음 커밋하고, 테스트 때문에 고용량 파일을 여러 번 교체하지 않는다. 공개 저장소의 웹용 기준본과 Git 기록도 공개되므로, 올리기 전부터 공개되어도 괜찮은 사진만 선택한다. 원본을 먼저 커밋한 뒤 지워도 과거 기록에는 남을 수 있다.

### 실제 사진 추가 절차

1. 원본은 프로젝트 바깥의 별도 폴더에 보관한다.
2. 선택한 사진의 방향과 색을 보정하고 긴 변을 약 2400px로 줄인다.
3. 메타데이터를 제거한 뒤 `src/assets/photos/`에 복사한다.
4. Astro 빌드에서 AVIF·WebP와 화면별 크기를 생성한다.
5. 빌드 산출물에서 파일 크기, EXIF 제거, 깨진 이미지가 없는지 검사한다.
6. 이후 Git 저장소를 만들 시점에 소스와 웹용 사진만 GitHub에 올린다.
7. GitHub Actions가 push를 감지해 사진과 사이트를 빌드하고 GitHub Pages에 함께 배포한다.

GitHub 브라우저에서 사진을 직접 업로드해도 되지만, 여러 장의 파일명 정리와 최적화 확인이 필요하므로 로컬 프로젝트 폴더에 넣은 뒤 한 번에 push하는 편이 관리하기 쉽다. 현재는 사용자의 요청대로 Git을 초기화하지 않는다.
