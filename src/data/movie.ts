import { wedding } from './wedding';

// Content only the movie-theater design uses. Everything factual (names, date, venue, accounts, photos)
// still comes from wedding.ts.
export const movie = {
  // The film's title. The mobile cover and the paper invitation's front stack it one word per line, in italic;
  // the ticket and the page title use titleText.
  title: ['Love', 'wins', 'all'],
  titleText: 'Love wins all',
  studio: 'OUR SEASON PICTURES',
  // English billing on the posters: the couple in capitals, and the venue in place of "in theaters".
  namesEn: { groom: 'CHANYOUNG', bride: 'YEJI' },
  venueEn: 'THE NEW CONVENTION',
  // Cover: the whole main photo (gallery number) so the couple sits below the title, as on the paper front.
  cover: { photo: '01', position: '48% 50%' },
  quote: { text: '나는 3000만큼 사랑해.', source: '영화 〈어벤져스: 엔드게임〉 중' },
  seat: '초대석',
  // Names come from wedding.ts, so both designs always credit the same people; empty entries are skipped.
  cast: [
    { role: 'GROOM', ko: '신랑', name: wedding.groom.fullName },
    { role: 'BRIDE', ko: '신부', name: wedding.bride.fullName },
    { role: "GROOM'S FATHER", ko: '신랑 아버지', name: wedding.groom.father },
    { role: "GROOM'S MOTHER", ko: '신랑 어머니', name: wedding.groom.mother },
    { role: "BRIDE'S FATHER", ko: '신부 아버지', name: wedding.bride.father },
    { role: "BRIDE'S MOTHER", ko: '신부 어머니', name: wedding.bride.mother },
  ].filter((member) => member.name.trim()),
  crew: [
    { role: 'DIRECTED BY', name: `${wedding.groom.fullName} · ${wedding.bride.fullName}` },
    { role: 'PRODUCED BY', name: '사랑하는 양가 부모님' },
    { role: 'FILMED IN', name: '서울' },
    { role: 'RELEASE DATE', name: '2027. 03. 13' },
  ],
  specialThanks: ['그리고 저희를 아껴 주신', '모든 분들께 진심으로 감사드립니다.'],
  // Gallery photo numbers (src/assets/gallery/NN.jpg) used for the film strips, the poster and the cookie.
  // Renumber these if photos are inserted before them (the two 2026-09-24 additions shifted everything by 2).
  // Film frames are landscape cuts of portrait photos; y is the vertical crop position (%) that keeps the
  // couple's heads in the frame, chosen per photo.
  stripTop: [{ id: '20', y: 81 }, { id: '21', y: 66 }, { id: '22', y: 75 }, { id: '08', y: 75 }, { id: '11', y: 66 }, { id: '05', y: 53 }],
  stripBottom: [{ id: '23', y: 28 }, { id: '24', y: 68 }, { id: '07', y: 60 }, { id: '26', y: 52 }, { id: '28', y: 60 }, { id: '10', y: 66 }],
  poster: '03',
  cookie: '22',
  cookieNote: '끝까지 봐 주셔서 고마워요. 식장에서 만나요!',
  // Copy for the printed paper invitation (/v2/print/), from the couple's own draft. Its title is `title` above.
  paper: {
    front: { venue: 'THE NEW CONVENTION, 5F ZENITH HALL', names: 'CHANYOUNG & YEJI' },
    heading: 'WEDDING INVITATION',
    verse: { lines: ['이 모든 것 위에 사랑을 더하라.', '이는 온전하게 매는 띠니라.'], source: '골로새서 3:14' },
    greeting: ['사랑으로 서로를 단단히 잇고,', '하나 되어 평생을 함께 걸어가겠습니다.', '저희의 새로운 시작을 축복해 주시면 감사하겠습니다.'],
    relation: { groom: '아들', bride: '딸' },
    location: [
      { label: '자차', lines: ['서울 강서구 공항대로 36길 57 (내발산동 655-2)', '더뉴컨벤션 5층 제니스홀'] },
      { label: '주차', lines: ['웨딩홀 건물 지하 4층 ~ 지하 1층 이용', '만차 시 [이대서울병원] 주차장 이용 · 2시간 무료', '외부 주차장 이용 시 웨딩홀 1층에서 주차 등록 필수'] },
      { label: '대중교통', lines: ['지하철 5호선 발산역 7번 출구 (도보 3분)'] },
    ],
  },
};
