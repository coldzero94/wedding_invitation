# 무료 호스팅과 배포

> 조사일: 2026-09-21 · 완전 무료 반응형 모바일 청첩장

[조사 목차로 돌아가기](README.md)

## 무료 호스팅 비교

GitHub Pages와 Cloudflare Pages는 모두 HTML, CSS, JavaScript, 사진을 제공하는 정적 호스팅이다. 이전에는 비공개 저장소를 전제로 Cloudflare Pages를 추천했지만, 사용자가 공개 저장소를 허용했으므로 현재 기본안은 GitHub Pages다. Cloudflare Pages는 비공개 저장소가 필요해질 때의 대안으로 남긴다.

| 조건 | 더 단순한 선택 |
| --- | --- |
| 소스와 웹용 사진이 공개 저장소에 있어도 괜찮음 | GitHub Pages |
| GitHub 저장소를 비공개로 유지하고 싶음 | Cloudflare Pages |
| GitHub 이외의 배포 서비스 계정을 추가하고 싶지 않음 | GitHub Pages |
| 브랜치별 미리보기와 Cloudflare CDN 배포를 원함 | Cloudflare Pages |

어느 방식을 사용하든 실제 배포된 청첩장과 사진은 공개 웹에서 접근할 수 있다. 비공개 저장소는 소스와 Git 기록을 숨길 뿐, 하객에게 보여 주는 배포 결과를 비공개로 만들지는 않는다.

### Cloudflare Pages — 비공개 저장소를 위한 대안

- 정적 파일 요청은 무료이며 제한이 없다.
- 무료 플랜에서 월 500회 빌드를 지원한다.
- 사이트당 최대 20,000개 파일을 배포할 수 있다.
- 파일 하나의 최대 크기는 25MiB이다.
- GitHub의 공개·비공개 저장소를 모두 연결할 수 있다.
- 무료 `*.pages.dev` 주소와 HTTPS를 제공한다.

모바일 청첩장은 정적 파일 수와 용량이 작기 때문에 무료 한도 안에 충분히 들어온다.

공식 문서:

- [Cloudflare Pages 가격 및 정적 요청 정책](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare Pages 무료 플랜 제한](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Git 연동](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Astro 사이트 배포 방법](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)

### GitHub Pages — 현재 선택

- 무료로 정적 사이트를 배포할 수 있다.
- 월 100GB의 소프트 대역폭 제한이 있다.
- 배포된 사이트 크기는 최대 1GB이다.
- GitHub Free에서는 Pages 소스 저장소가 공개 저장소여야 한다.

기능상으로는 이 청첩장에 충분하다. 저장소 공개가 괜찮다면 GitHub Pages로 바꿔도 서버 비용은 0원이고 사진도 같은 방식으로 제공할 수 있다. 저장소를 비공개로 유지하려면 GitHub Pro 이상이 필요하므로, GitHub Free를 전제로 하면 Cloudflare Pages가 더 적합하다.

공식 문서:

- [GitHub Pages 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub Pages 사이트 생성 및 저장소 공개 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

### Vercel — 사용할 수 있지만 우선순위가 낮음

Vercel Hobby도 무료이나 정적 파일 업로드, 데이터 전송, 이미지 최적화에 별도 한도가 있다. 현재는 GitHub Pages만으로 요구사항을 충족하므로 별도 서비스 연결을 추가할 필요가 없다.

- [Vercel Hobby 플랜](https://vercel.com/docs/plans/hobby)
- [Vercel 사용 제한](https://vercel.com/docs/limits)

## GitHub Pages의 프로젝트 경로

프로젝트 사이트의 기본 주소는 `https://사용자명.github.io/저장소명/`이다. 실제 구현에서 Astro의 사이트 주소와 기본 경로를 맞추고 이미지·폰트·지도 복귀 링크가 저장소명 경로를 포함하도록 처리한다. `/images/a.webp`처럼 도메인 루트를 가정하면 프로젝트 사이트에서 404가 날 수 있다. OG와 QR에는 최종 절대 URL을 사용한다.

- [GitHub Pages 사이트 종류와 기본 주소](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Actions를 이용한 Pages 배포](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
