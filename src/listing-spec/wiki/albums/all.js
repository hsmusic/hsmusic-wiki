export default [
  (await import('./by-name.js')).default,
  (await import('./by-tracks.js')).default,
  (await import('./by-duration.js')).default,
  (await import('./by-date.js')).default,
  (await import('./by-date-added.js')).default,
];
