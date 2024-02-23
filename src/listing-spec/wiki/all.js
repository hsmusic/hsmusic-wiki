export default [
  (await import('./index.js')).default,
  ...(await import('./albums/all.js')).default,
  ...(await import('./artists/all.js')).default,
  ...(await import('./groups/all.js')).default,
  ...(await import('./tracks/all.js')).default,
  ...(await import('./art-tags/all.js')).default,
  ...(await import('./other/all.js')).default,
];
