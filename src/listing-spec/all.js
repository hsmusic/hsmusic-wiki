export default [
  ...(await import('./wiki/all.js')).default,
];

export const listingTargetSpec =
  (await import('./targets/all.js')).default;

export const listingTargetOrder =
  listingTargetSpec
    .map(({target}) => target);
