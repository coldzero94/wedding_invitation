# GitHub Pages 배포 기록

> 2026-09-22 · coldzero94 · 샘플 미리보기 배포 완료

- 사이트: [coldzero94.github.io/wedding_invitation](https://coldzero94.github.io/wedding_invitation/)
- 공개 저장소: [coldzero94/wedding_invitation](https://github.com/coldzero94/wedding_invitation)
- 첫 배포 실행: [GitHub Actions 성공 기록](https://github.com/coldzero94/wedding_invitation/actions/runs/35678642265)
- 배포한 애플리케이션 커밋: `409f35dae8411c4b99c2b50a8d89c6fe65e8d82a`
- 브랜치: `main`
- 설정: GitHub Pages / GitHub Actions / HTTPS

사용자의 배포 요청에 따라 Git을 초기화하고 공개 저장소를 생성했다. 기존 저장소를 덮어쓰지 않았다. 사진과 예식 정보는 가상 예시이며 제목에 `[샘플]`을 표시한다. 실제 발송용 콘텐츠로 전환한 상태는 아니다.

## 배포 방식

[워크플로](../.github/workflows/deploy.yml)는 수동 실행한다. `preview`는 샘플을 허용하며 `release`는 실제 정보 검사를 통과해야 한다. 두 모드는 같은 Pages 주소를 갱신한다.

Pages에서 읽은 `origin`을 `SITE_URL`로, `base_path`를 `BASE_PATH`로 전달한다. Node 24에서 `npm ci`와 타입 검사를 실행하고 정적 파일을 빌드·배포한다. 첫 실행에서 build와 deploy 작업 모두 성공했다.

내용 변경 후:

1. 변경한 파일을 커밋하고 `main`에 푸시한다.
2. GitHub Actions에서 `Publish wedding invitation`을 수동 실행한다.
3. 디자인 확인 중에는 `preview`, 실제 정보 입력과 검수가 끝난 뒤에는 `release`를 선택한다.
4. 실행 성공 후 실제 Pages 주소에서 변경된 내용을 확인한다.

```sh
gh workflow run deploy.yml --repo coldzero94/wedding_invitation --ref main -f mode=preview
```

## 실제 배포 주소에서 확인한 항목

- HTTPS 페이지 HTTP 200, 샘플 제목 표시.
- 사진 파일 로딩과 모바일 화면 표시. [실제 사이트 캡처](mockups/deployed-mobile.png).
- 전체 갤러리 열기, 다음 사진, 뒤로가기로 닫기.
- 공유 시 복사되는 URL이 최종 Pages 주소와 일치.
- canonical·OG URL이 Pages 주소를 사용하고 OG 이미지 HTTP 200.
- 일정 파일 HTTP 200, 샘플 예식 시각 확인.
- 확인 과정에서 JavaScript 오류와 HTTP 400 이상 응답 없음.

위 검증은 데스크톱 Chrome의 모바일 화면 크기로 수행했다. 실제 iPhone·Android·카카오톡 공유 카드와 외부 앱 전환 검증을 대신하지 않는다.

## QR

[SVG](../output/qr/invitation.svg) · [1024px PNG](../output/qr/invitation.png) · [원본 URL](../output/qr/url.txt)

외부 QR 서비스 없이 로컬에서 생성했다. macOS Vision으로 PNG를 디코딩한 결과가 `https://coldzero94.github.io/wedding_invitation/`와 일치했다. 실제 인쇄 크기로 휴대폰 카메라 스캔은 아직 하지 않았다.

QR이 가리키는 주소는 고정되어 있으므로 같은 주소에 실제 청첩장을 배포하면 QR을 다시 만들 필요가 없다. 실제 발송 전에는 샘플 내용 교체와 인쇄물 스캔을 완료해야 한다.
