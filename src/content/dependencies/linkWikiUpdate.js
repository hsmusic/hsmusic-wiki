export default {
  relations: (relation, wikiUpdate) =>
    ({link: relation('linkThing', 'localized.wikiUpdate', wikiUpdate)}),

  generate: (relations) => relations.link,
};
