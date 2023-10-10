export default {
  contentDependencies: ['linkGroupGallery', 'linkGroup'],
  extraDependencies: ['pagePath'],

  relations: (relation, group) => ({
    galleryLink: relation('linkGroupGallery', group),
    infoLink: relation('linkGroup', group),
  }),

  generate: (relations, {pagePath}) =>
    (pagePath[0] === 'groupGallery'
      ? relations.galleryLink
      : relations.infoLink),
};
