export default [
  (await import('./by-album.js')).default,
  (await import('./by-date.js')).default,
  (await import('./by-duration.js')).default,
  (await import('./by-duration-in-album.js')).default,
  (await import('./by-times-referenced.js')).default,
  (await import('./in-flashes-by-album.js')).default,
  (await import('./in-flashes-by-flash.js')).default,
  (await import('./with-lyrics.js')).default,
  (await import('./with-sheet-music-files.js')).default,
  (await import('./with-midi-project-files.js')).default,
];
