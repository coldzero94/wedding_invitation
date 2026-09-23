# 모바일 청첩장 조사 목차

> 조사일: 2026-09-21 · 완전 무료 반응형 모바일 청첩장

공개 GitHub 저장소와 GitHub Pages를 사용한다. 사용자가 선택한 Concept 01 사진 앨범 v2를 구현하고 [샘플 사이트](https://coldzero94.github.io/wedding_invitation/)를 배포했다. [실행·수정 안내](../README.md)와 [배포 기록](deployment.md)에서 확인할 수 있다.

> **2026-09-23 구조 변경:** 사용자 요청으로 "우리라는 이야기"(이야기 앨범), 하이라이트, SNS 피드 카드, 하트 버튼을 제거했다. 표지 다음은 아이보리 배경의 SAVE THE DATE·달력·D-day·인사말로 시작하고, 이어서 사진 30장 이상을 담는 갤러리(9장 + 사진 더보기), 오시는 길, 신랑측·신부측 마음 전하실 곳, 공유 순서로 구성한다. 사진은 `npm run photos`로 정리해 `src/assets/gallery`에 넣는다([실행 안내](../README.md)). 아래 내용 중 앨범·피드에 관한 설명은 이전 구조의 기록이다.

| 문서 | 내용 |
| --- | --- |
| [구현 상태](implementation-status.md) | 완료한 기능, 자동 검사 범위, 실사용 전에 남은 정보 |
| [배포 기록](deployment.md) | 실제 GitHub Pages 주소, 재배포 방법, 온라인 검증과 QR |
| [발송 전 작업 목록](launch-checklist.md) | 실제 코드 점검으로 정한 남은 작업, 우선순위와 완료 기준 |
| [이미지 시안](mockups/README.md) | 선택한 SNS·OTT Concept 01 사진 앨범 v2, 대안 Concept 02 |
| [반응형 설계](responsive-design.md) | 320px부터 PC까지의 배치, 터치·글자·사진 규칙 |
| [호스팅](hosting.md) | GitHub Pages 기본안, Cloudflare·Vercel 비교 |
| [사진 관리](photos.md) | GitHub에 사진 넣기, 최적화, 메타데이터 |
| [QR 코드](qr.md) | 정적 QR 생성, 인쇄 검증, 주소 유지 |
| [공개 프로젝트](projects.md) | 제공한 두 저장소와 추가 오픈소스 사례 |
| [디자인 레퍼런스](design-references.md) | 상업 청첩장 사례와 반복되는 연출 |
| [디자인 방향](design-direction.md) | SNS·OTT 구성, 초기 탐색안, 폰트 |
| [기능 설계](features.md) | 기능 범위, 카카오 공유, OG, 지도, 음악 |
| [구현·검증](verification.md) | 작업 순서, 접근성, 개인정보, 기기 검증 |

무료 정책과 외부 상품은 조사 시점 기준이며 실제 배포 전에 다시 확인한다. 문서의 구현 제안과 생성 시안은 실제 작동 검증 결과가 아니다.

## 결론

이 프로젝트에는 백엔드와 별도 이미지 저장소가 필요하지 않다. 하객이 사진을 업로드하는 기능이 없으므로, 신랑·신부가 고른 사진을 소스 저장소에 넣고 빌드 시 모바일용 이미지로 변환한 다음 웹사이트와 함께 정적 호스팅하면 된다.

권장 구성은 다음과 같다.

| 영역 | 선택 | 비용 |
| --- | --- | ---: |
| 웹사이트 | Astro 정적 사이트 | 0원 |
| 스타일/동작 | CSS + 필요한 부분만 JavaScript | 0원 |
| 사진 저장 | 공개 GitHub 저장소 안의 로컬 이미지 | 0원 |
| 사진 최적화 | Astro 이미지 빌드 또는 Sharp | 0원 |
| 배포 | GitHub Pages | 0원 |
| 주소 | `사용자명.github.io/저장소명/` | 0원 |
| QR 코드 | 빌드 스크립트로 SVG/PNG 직접 생성 | 0원 |
| 지도 | 네이버 지도·카카오맵·T맵 외부 링크 | 0원 |
| 카카오톡 공유 | Kakao JavaScript SDK 또는 Web Share API | 0원 |
| 참석 여부 조사 | 필요할 때만 Google Form 링크 | 0원 |

최종 구조는 아래처럼 단순하게 유지한다.

```text
공개 GitHub 저장소
├── 청첩장 소스
├── 메타데이터를 제거한 웹용 기준 사진
└── 예식 정보
        │ push
        ▼
GitHub Actions 빌드 → GitHub Pages 배포
├── 정적 HTML/CSS/JS
├── 모바일 크기별 WebP/AVIF
└── OG 공유 이미지
        │
        ▼
https://사용자명.github.io/저장소명/
        │
        └── 이 주소로 인쇄용 QR 생성
```

## 현재 결정 사항

- 2026-09-22 선택: Concept 01 사진 앨범 v2를 구현한다. 커플 동영상은 없으며 사진과 글만 사용한다. 사진 기록장 Concept 02는 비교 자료로 보관한다.

- 완전 무료로 운영한다.
- 공개 저장소 `coldzero94/wedding_invitation`과 GitHub Pages의 `github.io` 주소를 사용한다. 2026-09-22 사용자 요청에 따라 Git 초기화·저장소 생성·샘플 배포를 완료했다.
- 사진은 프로젝트 안에 저장하고 빌드 시 최적화한다.
- 별도 서버, DB, S3는 사용하지 않는다.
- QR은 최종 배포 주소로 직접 생성하며 외부 QR 서비스를 사용하지 않는다.
- 공개 템플릿은 구조와 상호작용을 참고하되 디자인은 별도로 만든다.
- SNS·OTT UI를 디자인에 포함하며 [이미지 시안](mockups/README.md)으로 먼저 검토한다.
