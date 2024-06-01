export default {
  contentDependencies: ['generateArtistInfoPageChunkItem', 'linkFlash'],

  extraDependencies: ['language'],

  relations: (relation, contrib) => ({
    // Flashes and games can list multiple contributors as collaborative
    // credits, but we don't display these on the artist page, since they
    // usually involve many artists crediting a larger team where collaboration
    // isn't as relevant (without more particular details that aren't tracked
    // on the wiki).

    template:
      relation('generateArtistInfoPageChunkItem'),

    flashLink:
      relation('linkFlash', contrib.thing),
  }),

  data: (contrib) => ({
    annotation:
      contrib.annotation,
  }),

  generate: (data, relations, {language}) =>
    relations.template.slots({
      annotation: data.annotation,

      content:
        language.$('artistPage.creditList.entry.flash', {
          flash: relations.flashLink,
        }),
    }),
};
