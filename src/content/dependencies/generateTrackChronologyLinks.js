export default {
  contentDependencies: ['generateScopedTrackChronologyLinks'],
  extraDependencies: ['html'],

  relations: (relation, track) => ({
    wikiChronologyLinks:
      relation('generateScopedTrackChronologyLinks', null, track),

    albumChronologyLinks:
      relation('generateScopedTrackChronologyLinks', track.album, track),
  }),

  generate: (relations, {html}) =>
    html.tags([
      relations.wikiChronologyLinks,
      relations.albumChronologyLinks,
    ]),
};
