export function deploymentConfig(env) {
  const site = env.SITE_URL || 'http://localhost:4321';
  const base = env.BASE_PATH || '/';
  if (!base.startsWith('/') || base.startsWith('//') || /[?#\\\s]/.test(base) || base.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('BASE_PATH는 / 또는 /저장소명 형태로 입력해 주세요.');
  }
  const url = new URL(site);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL에는 도메인만, 저장소 경로는 BASE_PATH에 입력해 주세요.');
  }
  if (env.RELEASE_BUILD === '1' && (url.protocol !== 'https:' || /(^localhost$|^127\.|^\[::1\]$|\.local$|\.test$|example\.(com|org)$|your-name)/i.test(url.hostname))) {
    throw new Error('발송용 빌드에는 실제 HTTPS SITE_URL이 필요합니다.');
  }
  return { site: url.origin, base };
}
