export default {
  relations: (relation, track) => ({
    trackLink:
      relation('linkTrack', track),
  }),

  generate: (relations, {language}) =>
    relations.trackLink.slots({
      content: language.$('trackPage.nav.backToTrack'),
      color: false,
    }),
};
