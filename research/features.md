# 기능 범위·공유·지도·음악

> 조사일: 2026-09-21 · 완전 무료 반응형 모바일 청첩장

[조사 목차로 돌아가기](README.md)

## 기능 범위

### 포함

- 모바일 우선 반응형 레이아웃
- 오프닝 애니메이션
- 예식 일시와 장소
- 초대 문구
- 사진 갤러리와 확대 보기
- 달력 또는 카운트다운
- 길찾기 링크
- 연락처 복사/전화/SMS
- 계좌번호 복사
- 카카오톡 또는 시스템 공유
- Open Graph 미리보기
- 정적 QR SVG/PNG 생성
- 접근성의 `prefers-reduced-motion` 대응

### 제외

- 커플 동영상, 영상 재생 버튼과 플레이어 UI (사진만 사용)

- 서버
- 데이터베이스
- S3/R2/Cloudinary 같은 별도 이미지 저장소
- 하객 사진 업로드
- 로그인과 관리자 페이지
- 실시간 방명록
- 유료 도메인
- 유료 분석 도구
- 동적 QR 서비스

## 카카오톡 공유

카카오톡 공유는 별도 서버 없이 브라우저에서 Kakao JavaScript SDK로 구현할 수 있다. 2026-09-21 기준 무료 제공량은 일 30,000회이므로 개인 청첩장 규모에서는 충분하다. 무료 한도를 넘었을 때 자동 과금을 피하려면 Kakao Developers의 유료 API 사용 설정을 활성화하지 않는다. 그러면 무료 쿼터를 초과한 호출은 실패하고 비용은 발생하지 않는다.

완전 무료 구현 절차:

1. Kakao Developers에서 앱을 하나 만든다.
2. JavaScript 키에 최종 `https://사용자명.github.io` 도메인을 등록한다.
3. `[제품 링크 관리] > [웹 도메인]`에도 같은 도메인을 등록한다.
4. JavaScript 키만 클라이언트 코드에서 사용한다.
5. REST API 키나 Admin 키는 웹사이트에 넣지 않는다.
6. 유료 API 사용 설정은 끈 상태로 유지한다.
7. 카카오 SDK가 실패하거나 카카오톡이 없는 환경을 위해 일반 공유와 링크 복사를 함께 제공한다.

Kakao JavaScript SDK는 등록한 도메인에서만 키를 사용할 수 있고, 카카오톡 메시지에 포함되는 링크도 제품 링크에 등록된 도메인과 일치해야 한다. 등록할 도메인은 `https://사용자명.github.io`이고, 공유할 실제 청첩장 URL은 `https://사용자명.github.io/저장소명/`이다. 도메인 등록과 프로젝트 경로를 구분한다.

- [카카오 API 무료 쿼터](https://developers.kakao.com/docs/en/getting-started/quota)
- [카카오 앱·JavaScript SDK 도메인 설정](https://developers.kakao.com/docs/en/app-setting/app)
- [카카오톡 공유 JavaScript 구현](https://developers.kakao.com/docs/en/kakaotalk-share/js-link)
- [카카오 보안 권장 사항](https://developers.kakao.com/docs/ko/getting-started/security-guideline)

일반 공유는 HTTPS에서 `navigator.share()`를 사용한다. 지원하지 않는 브라우저에서는 URL 복사 버튼으로 대체한다. Web Share API는 모든 데스크톱 브라우저에서 동작하지 않으므로 카카오 공유 버튼과 별도로 폴백이 필요하다.

- [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

## 카카오톡 링크 미리보기

청첩장을 카카오톡 대화방에 붙여 넣었을 때 보이는 화면은 첫 페이지보다 먼저 평가되는 중요한 디자인 요소다. 아래 Open Graph 항목을 정적 HTML의 `<head>`에 넣는다.

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="신랑 이름 · 신부 이름, 결혼합니다" />
<meta property="og:description" content="날짜 · 시간 · 예식장" />
<meta property="og:url" content="https://사용자명.github.io/저장소명/" />
<meta property="og:image" content="https://사용자명.github.io/저장소명/og.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="신랑 이름과 신부 이름의 결혼식 초대장" />
```

`og:image`와 `og:url`은 절대 URL로 넣는다. 카카오 메시지 템플릿의 원격 이미지는 5MB를 넘으면 표시되지 않을 수 있으므로 OG 이미지는 충분히 압축한다. 이미지나 문구를 변경했는데 예전 미리보기가 계속 보이면 Kakao Developers의 OG 캐시 초기화 도구를 사용한다.

- [Open Graph 기본 메타데이터](https://ogp.me/)
- [카카오 스크랩 메시지와 OG 매핑](https://developers.kakao.com/docs/en/message-template/common)
- [카카오 OG 캐시 초기화 안내](https://developers.kakao.com/docs/en/kakaotalk-share/faq)
- [Kakao Developers 도구](https://developers.kakao.com/tool)

## 지도는 API 없이 연결

지도 SDK를 화면에 삽입하면 외부 JavaScript, API 키, 호출 쿼터가 추가되고 초기 로딩도 무거워진다. 청첩장에는 실시간으로 움직이는 지도가 꼭 필요하지 않으므로 다음 구성이 더 적합하다.

- 예식장 이름과 도로명 주소를 텍스트로 제공
- 직접 제작하거나 예식장에서 받은 약도가 있으면 정적 이미지로 표시
- `카카오맵 길찾기`, `네이버 지도`, `T맵` 버튼을 제공
- 주소 복사 버튼 제공

카카오맵은 API 호출 없이 다음 형식의 HTTPS 바로가기를 사용할 수 있다.

```text
지도 보기
https://map.kakao.com/link/map/장소명,위도,경도

목적지 길찾기
https://map.kakao.com/link/to/장소명,위도,경도
```

이 방식은 무료 쿼터를 사용하지 않고, 앱이 있는 모바일에서는 앱으로 이어지는 흐름을 제공한다. 네이버 지도는 공식 URL Scheme을 제공하지만 앱 미설치와 인앱 브라우저 폴백 처리가 필요하다. 구현 시에는 예식장 네이버 지도 페이지의 HTTPS 공유 링크를 사용하는 쪽이 단순하다.

- [카카오 지도·길찾기 바로가기 공식 가이드](https://apis.map.kakao.com/web/guide/)
- [카카오맵 URL Scheme과 모바일 웹 폴백](https://apis.map.kakao.com/ios_v2/docs/getting-started/urlscheme/)
- [네이버 지도 URL Scheme 공식 가이드](https://guide.ncloud-docs.com/docs/en/maps-url-scheme)

## 배경 음악 저작권

음원 서비스에서 음악을 구매했거나 구독 중이라는 사실은 그 파일을 홈페이지 배경음악으로 재전송할 권리를 뜻하지 않는다. 한국음악저작권협회는 홈페이지 배경음악을 별도의 전송 이용 형태로 관리하며, 한국저작권위원회도 배경음악 사용에는 저작권자와 저작인접권자의 허락이 필요할 수 있다고 안내한다.

완전 무료 원칙에서 안전한 선택 순서는 다음과 같다.

1. 배경 음악을 넣지 않는다.
2. 직접 제작해 권리를 보유한 음악을 사용한다.
3. 웹 배포가 허용된 CC0 음악을 사용한다.
4. CC BY 음악은 저작자, 원본 링크, 라이선스를 명확히 표기한다.
5. 별도 허락을 받지 않은 상용 음원 파일은 프로젝트에 넣지 않는다.

음악을 사용한다면 사용자가 `초대장 열기`를 누른 뒤 재생하고, 항상 보이는 음소거 버튼을 둔다.

- [한국음악저작권협회의 홈페이지 배경음악 관리 범위](https://www.komca.or.kr/komca2/komca_0202.jsp)
- [한국저작권위원회 FAQ](https://www.copyright.or.kr/customer-center/faq/list.do?categorycode1=&pageIndex=2&portalcode=04&searchkeyword=)
- [Creative Commons BY 4.0 조건](https://creativecommons.org/licenses/by/4.0/)
