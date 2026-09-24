import { wedding } from './wedding';

// Content only the movie-theater design uses. Everything factual (names, date, venue, accounts, photos)
// still comes from wedding.ts.
export const movie = {
  title: 'The Grandest Show of Our Love',
  studio: 'OUR SEASON PICTURES',
  // English billing on the posters: the couple in capitals, and the venue in place of "in theaters".
  namesEn: { groom: 'CHANYOUNG', bride: 'YEJI' },
  venueEn: 'THE NEW CONVENTION',
  quote: { text: '나는 3000만큼 사랑해.', source: '영화 〈어벤져스: 엔드게임〉 중' },
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
  stripTop: ['18', '19', '20', '06', '09', '03'],
  stripBottom: ['21', '22', '05', '24', '26', '08'],
  poster: '01',
  cookie: '20',
  cookieNote: '끝까지 봐 주셔서 고마워요. 식장에서 만나요!',
};
