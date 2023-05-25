export default {
  contentDependencies: ['linkThing'],

  relations: (relation, listing) =>
    ({link: relation('linkThing', 'localized.listing', listing)}),

  generate: (relations) => relations.link,
};
