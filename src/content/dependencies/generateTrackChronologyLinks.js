export default {
  contentDependencies: [
    'generateChronologyLinksScopeSwitcher',
    'generateScopedTrackChronologyLinks',
  ],

  relations: (relation, track) => ({
    scopeSwitcher:
      relation('generateChronologyLinksScopeSwitcher'),

    wikiChronologyLinks:
      relation('generateScopedTrackChronologyLinks', null, track),

    albumChronologyLinks:
      relation('generateScopedTrackChronologyLinks', track.album, track),
  }),

  generate: (relations) =>
    relations.scopeSwitcher.slots({
      scopes: [
        'wiki',
        'album',
      ],

      contents: [
        relations.wikiChronologyLinks,
        relations.albumChronologyLinks,
      ],
    }),
};
