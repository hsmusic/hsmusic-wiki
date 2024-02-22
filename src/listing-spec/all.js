export default [
  ...(await import('./wiki/all.js')).default,
];

export const listingTargetOrder = [
  'album',
  'artist',
  'group',
  'track',
  'tag',
  'other',
];
