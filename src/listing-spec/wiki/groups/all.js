export default [
  (await import('./by-name.js')).default,
  (await import('./by-category.js')).default,
  (await import('./by-albums.js')).default,
  (await import('./by-tracks.js')).default,
  (await import('./by-duration.js')).default,
  (await import('./by-latest-album.js')).default,
];
