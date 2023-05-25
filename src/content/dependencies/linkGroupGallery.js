export default {
  contentDependencies: ['linkThing'],

  relations: (relation, group) =>
    ({link: relation('linkThing', 'localized.groupGallery', group)}),

  generate: (relations) => relations.link,
};
