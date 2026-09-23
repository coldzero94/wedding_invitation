import hero from '../assets/photos/hero.jpg';
import heroOg from '../assets/photos/og.jpg';
import type { GalleryOverride } from '../lib/gallery-core';
import { validateWedding } from '../lib/validate-wedding';

// 예식 정보와 문구는 이 파일에서 수정하세요.
// 갤러리 사진은 photos-inbox 폴더에 넣고 npm run photos 를 실행하면 src/assets/gallery 에 정리됩니다.
// 전화번호·계좌·지도 링크·부모님 성함이 비어 있으면 해당 영역을 표시하지 않습니다.
export const wedding = {
  isDemo: true,
  // father·mother에 부모님 성함을 넣으면 "이○○ · 김○○ 의 장남 찬영"처럼 표시됩니다.
  // relation을 비우면 '아들'·'딸'로 표시합니다. 고인은 '故 이○○'처럼 적어 주세요.
  groom: { name: '찬영', fullName: '이찬영', phone: '', father: '', mother: '', relation: '' },
  bride: { name: '예지', fullName: '임예지', phone: '', father: '', mother: '', relation: '' },
  date: '2027-03-13T12:10:00+09:00',
  durationMinutes: 90,
  timeZone: 'Asia/Seoul',
  venue: {
    name: '발산 더뉴컨벤션',
    detail: '서울 강서구',
    address: '서울 강서구 공항대로36길 57',
    mapLinks: [
      { label: '네이버 지도', url: 'https://map.naver.com/p/search/%EB%8D%94%EB%89%B4%EC%BB%A8%EB%B2%A4%EC%85%98%EC%9B%A8%EB%94%A9%20%EC%84%9C%EC%9A%B8%20%EA%B0%95%EC%84%9C%EA%B5%AC%20%EA%B3%B5%ED%95%AD%EB%8C%80%EB%A1%9C36%EA%B8%B8%2057' },
      { label: '카카오맵', url: 'https://map.kakao.com/link/search/%EB%8D%94%EB%89%B4%EC%BB%A8%EB%B2%A4%EC%85%98%EC%9B%A8%EB%94%A9%20%EC%84%9C%EC%9A%B8%20%EA%B0%95%EC%84%9C%EA%B5%AC%20%EA%B3%B5%ED%95%AD%EB%8C%80%EB%A1%9C36%EA%B8%B8%2057' },
    ],
    transport: [
      { title: '지하철', description: '5호선 발산역에서 도보 3~5분 거리입니다.' },
    ] as { title: string; description: string }[],
  },
  // relation(아버지·어머니 등)을 비우면 신랑·신부 본인 계좌로 표시합니다.
  accounts: [
    { side: '신랑', relation: '', name: '이찬영', bank: '신한', number: '110-235-729687' },
    { side: '신부', relation: '', name: '임예지', bank: '국민', number: '373301-01-415845' },
  ] as { side: '신랑' | '신부'; relation?: string; name: string; bank: string; number: string }[],
  introduction: ['서로의 하루에 가장 먼저 떠오르는 사람.', '이제는 같은 내일을 함께 그리려 합니다.', '저희의 새로운 시작에 함께해 주세요.'],
  closing: '모든 계절을, 당신과 함께.',
  hero: { image: hero, alt: '버드나무 아래에서 부케를 든 신부와 뒤에 선 신랑', position: '50% 30%', og: heroOg as ImageMetadata | undefined },
  // 갤러리 사진은 파일 이름 순서로 표시합니다. 사진별 설명·대체 텍스트·자르기 위치는 파일 번호로 지정하세요.
  // 예: '07': { caption: '제주에서', alt: '바다 앞의 두 사람', position: 'top' }
  // position: attention(기본, 눈에 띄는 부분 중심)·top·bottom·left·right·center 등
  // npm run photos 를 다시 실행하면 번호가 새로 매겨지므로 이 설정을 다시 확인해야 합니다.
  // 사진을 빼려면 photos-inbox 에서 파일을 지우고 npm run photos 를 다시 실행하세요.
  gallery: {} as Record<string, GalleryOverride>,
};

const errors = validateWedding(wedding, process.env.RELEASE_BUILD === '1');
if (errors.length) throw new Error('청첩장 설정을 확인해 주세요:\n- ' + errors.join('\n- '));
