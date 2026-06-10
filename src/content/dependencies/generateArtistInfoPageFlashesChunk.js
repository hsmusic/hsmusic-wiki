export default {
  relations: (relation, flashAct, contribs) => ({
    template:
      relation('generateArtistInfoPageChunk', flashAct),

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

      link:
        relations.flashActLink
          .slot('showNameDetail', 'accent'),

      dates: data.dates,

      list:
        html.tag('ul', relations.items),
    }),
};
