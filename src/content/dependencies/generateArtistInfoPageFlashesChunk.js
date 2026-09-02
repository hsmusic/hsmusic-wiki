export default {
  relations: (relation, artist, flashAct, contribLists) => ({
    template:
      relation('generateArtistInfoPageChunk', flashAct),

    flashActLink:
      relation('linkFlashAct', flashAct),

    items:
      contribLists
        .map(contribs =>
          relation('generateArtistInfoPageFlashesChunkItem',
            artist,
            contribs)),
  }),

  data: (_artist, _flashAct, contribLists) => ({
    // Multiple dates because consecutive flashes within a range of time
    // that are all to the same flash act are chunked together (and we will
    // show that range of time in the chunk heading). However, we don't treat
    // the individual flash contributions as uniquely dated (e.g. differing
    // from the date of the flash), so just use one date arbitrarily from
    // each flash's contribution list.
    dates:
      contribLists
        .map(contribs => contribs[0].date),
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
