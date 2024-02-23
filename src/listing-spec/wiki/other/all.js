export default [
  (await import('./all-sheet-music-files.js')).default,
  (await import('./all-midi-project-files.js')).default,
  (await import('./all-additional-files.js')).default,
  (await import('./random.js')).default,
];
