import hero from '../assets/photos/hero.png';
import travel from '../assets/photos/travel.png';
import hands from '../assets/photos/hands.png';
import { validateWedding } from '../lib/validate-wedding';

// 실제 사진은 위 import를, 예식 정보와 문구는 이 파일을 수정하세요.
// 전화번호·계좌·지도 링크가 비어 있으면 실제 동작을 만들지 않습니다.
export const wedding = {
  isDemo: true,
  groom: { name: '찬영', fullName: '이찬영', phone: '' },
  bride: { name: '예지', fullName: '임예지', phone: '' },
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
  accounts: [
    { side: '신랑', name: '이찬영', bank: '신한', number: '110-235-729687' },
    { side: '신부', name: '임예지', bank: '국민', number: '373301-01-415845' },
  ] as { side: '신랑' | '신부'; name: string; bank: string; number: string }[],
  introduction: ['서로의 하루에 가장 먼저 떠오르는 사람.', '이제는 같은 내일을 함께 그리려 합니다.', '저희의 새로운 시작에 함께해 주세요.'],
  socialHandle: 'jihun.and.seoyeon',
  closing: '모든 계절을, 당신과 함께.',
  hero: { image: hero, alt: '정원에서 이마에 입 맞추는 신랑과 미소 짓는 신부', position: '52% 25%' },
  // 사진은 고유 ID로 관리합니다. 앨범과 본문 대표 컷은 아래에서 별도로 선택합니다.
  photos: [
    { id: 'garden', image: hero, alt: '정원에서 이마에 입 맞추는 신랑과 미소 짓는 신부', title: '처음 만난 날', subtitle: '평범한 하루가 특별해진 순간', position: '50% 30%' },
    { id: 'travel', image: travel, alt: '해 질 무렵 바다를 나란히 바라보는 두 사람의 뒷모습', title: '우리의 여행', subtitle: '어디든, 함께라서 좋았던', position: '50% 50%' },
    { id: 'hands', image: hands, alt: '꽃이 핀 정원에서 결혼반지를 끼고 손을 맞잡은 두 사람', title: '같은 마음', subtitle: '잡은 손을 놓지 않기로', position: '50% 50%' },
  ],
  previewPhotoIds: ['travel', 'hands'],
  // photoIds 순서대로 앨범에 표시하며 첫 사진을 앨범 표지로 사용합니다.
  albums: [
    { id: 'beginning', title: '처음 만난 날', label: '처음', photoIds: ['garden'], story: '처음엔 몰랐어요. 그날의 짧은 인사가 이렇게 오래 이어질 줄은. 자꾸만 웃게 되는 하루들이 우리의 시작이었습니다.' },
    { id: 'journey', title: '우리의 여행', label: '여행', photoIds: ['travel'], story: '낯선 풍경 앞에서도 함께라면 마음이 편안했어요. 돌아오는 길에는 다음 여행보다, 함께할 평범한 내일을 더 기대하게 되었습니다.' },
    { id: 'together', title: '같은 마음', label: '오늘', photoIds: ['hands'], story: '좋은 날에도, 조금 서툰 날에도 곁에 있기로 했습니다. 서로의 속도에 맞춰 오래오래 함께 걸어가겠습니다.' },
  ],
};

const errors = validateWedding(wedding, process.env.RELEASE_BUILD === '1');
if (errors.length) throw new Error('청첩장 설정을 확인해 주세요:\n- ' + errors.join('\n- '));
