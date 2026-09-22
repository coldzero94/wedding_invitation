type WeddingDetails = {
  isDemo: boolean;
  groom: { name: string; fullName: string; phone: string };
  bride: { name: string; fullName: string; phone: string };
  date: string; durationMinutes: number; timeZone: string;
  venue: { name: string; address: string; mapLinks: { label: string; url: string }[] };
  accounts: { side: string; name: string; bank: string; number: string }[];
  hero: { alt: string };
  photos: { id: string; alt: string }[];
};

export function validateWedding(data: WeddingDetails, release = false): string[] {
  const errors: string[] = [];
  const required = (value: string, label: string) => {
    if (!value.trim()) errors.push(label + '을(를) 입력해 주세요.');
  };
  for (const [label, person] of [['신랑', data.groom], ['신부', data.bride]] as const) {
    required(person.name, label + ' 이름');
    required(person.fullName, label + ' 전체 이름');
    const digits = person.phone.replace(/\D/g, '').length;
    if (person.phone && (!/^\+?[\d\s()-]+$/.test(person.phone) || digits < 7 || digits > 15)) errors.push(label + ' 전화번호 형식을 확인해 주세요.');
  }
  const date = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.exec(data.date);
  const validDay = date && Number(date[2]) >= 1 && Number(date[2]) <= 12 && Number(date[3]) >= 1 && Number(date[3]) <= new Date(Date.UTC(Number(date[1]), Number(date[2]), 0)).getUTCDate();
  if (!validDay || Number(data.date.slice(11, 13)) > 23 || !Number.isFinite(Date.parse(data.date))) errors.push('예식 날짜는 유효한 날짜와 시간대를 포함해야 합니다. 예: 2027-05-22T14:00:00+09:00');
  try { new Intl.DateTimeFormat('ko-KR', { timeZone: data.timeZone }); }
  catch { errors.push('유효한 시간대를 입력해 주세요. 예: Asia/Seoul'); }
  if (!Number.isInteger(data.durationMinutes) || data.durationMinutes <= 0) errors.push('예식 소요 시간은 양의 정수(분)여야 합니다.');
  required(data.venue.name, '예식장 이름');
  required(data.hero.alt, '표지 사진 설명');
  for (const photo of data.photos) required(photo.alt, '사진 ' + photo.id + ' 설명');
  for (const map of data.venue.mapLinks) {
    required(map.label, '지도 버튼 이름');
    try {
      const url = new URL(map.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { errors.push('지도 링크는 HTTPS 주소여야 합니다: ' + map.label); }
  }
  for (const account of data.accounts) {
    required(account.name, '예금주');
    required(account.bank, '은행 이름');
    if (!/^[\d -]+$/.test(account.number) || !/\d/.test(account.number)) errors.push('계좌번호는 숫자·공백·하이픈으로 입력해 주세요.');
  }
  if (release) {
    if (data.isDemo) errors.push('발송용 빌드는 실제 정보를 입력하고 isDemo를 false로 설정해야 합니다.');
    required(data.venue.address, '예식장 상세 주소');
  }
  return errors;
}
