import QRCode from 'qrcode';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = process.argv[2];
let url;
try { url = new URL(input); } catch {
  console.error('최종 배포 주소가 필요합니다: npm run qr -- https://your-name.github.io/wedding_invitation/');
  process.exit(1);
}
if (url.protocol !== 'https:' || url.username || url.password || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || /your-name|사용자명|프로젝트명|example\.(com|org)/.test(url.hostname) || url.hash || url.search) {
  console.error('예시·로컬 주소 대신 쿼리와 해시가 없는 실제 HTTPS 배포 주소를 넣어 주세요.');
  process.exit(1);
}
const dir = resolve('output/qr');
await mkdir(dir, { recursive: true });
/** @type {import('qrcode').QRCodeToFileOptions} */
const settings = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#181b18', light: '#ffffff' } };
await writeFile(resolve(dir, 'invitation.svg'), await QRCode.toString(url.href, { ...settings, type: 'svg' }));
await QRCode.toFile(resolve(dir, 'invitation.png'), url.href, { ...settings, width: 1024 });
await writeFile(resolve(dir, 'url.txt'), url.href + '\n');
console.log('QR 생성 완료: output/qr/invitation.svg, invitation.png');
console.log('인쇄 전에 최종 주소를 열고 실제 크기로 스캔해 주세요: ' + url.href);
