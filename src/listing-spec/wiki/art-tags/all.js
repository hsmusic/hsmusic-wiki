export default [
  (await import('./by-name.js')).default,
  (await import('./by-uses.js')).default,
];
