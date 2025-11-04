export default {
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

  generate: (data, relations, {html}) =>
    relations.template.slots({
      mode: 'flash',
      link: relations.flashActLink,
      dates: data.dates,

      list:
        html.tag('ul', relations.items),
    }),
};
