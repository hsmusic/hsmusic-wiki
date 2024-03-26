// This order is used when navigating all listings, i.e. on the listing index
// and in the listing sidebar.
export default [
  (await import('./album.js')).default,
  (await import('./artist.js')).default,
  (await import('./group.js')).default,
  (await import('./track.js')).default,
  (await import('./art-tag.js')).default,
  (await import('./other.js')).default,
];
