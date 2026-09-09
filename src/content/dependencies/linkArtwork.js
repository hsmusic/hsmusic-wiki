export default {
  relations: (relation, artwork) => ({
    link:
      relation('linkAnythingMan', artwork.thing),
  }),

  generate: (relations) =>
    relations.link,
};
