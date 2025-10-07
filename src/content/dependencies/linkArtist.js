export default {
  relations: (relation, artist) =>
    ({link: relation('linkThing', 'localized.artist', artist)}),

  generate: (relations) => relations.link,
};
