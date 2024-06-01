export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageFlashesChunkItem',
    'linkFlashAct',
  ],

  relations: (relation, flashAct, contribs) => ({
    template:
      relation('generateArtistInfoPageChunk'),

    flashActLink:
      relation('linkFlashAct', flashAct),

    items:
      contribs
        .map(contrib =>
          relation('generateArtistInfoPageFlashesChunkItem', contrib)),
  }),

  data: (_flashAct, contribs) => ({
    dates:
      contribs
        .map(contrib => contrib.date),
  }),

  generate: (data, relations) =>
    relations.template.slots({
      mode: 'flash',
      flashActLink: relations.flashActLink,
      dates: data.dates,
      items: relations.items,
    }),
};
