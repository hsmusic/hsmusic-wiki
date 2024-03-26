export default [
  (await import('./by-name.js')).default,
  (await import('./by-contribs.js')).default,
  (await import('./by-commentary.js')).default,
  (await import('./by-duration.js')).default,
  (await import('./by-group.js')).default,
  (await import('./by-latest.js')).default,
];
