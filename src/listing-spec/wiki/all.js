export default [
  (await import('./index.js')).default,
  ...(await import('./albums/all.js')).default,
  ...(await import('./tracks/all.js')).default,
];
