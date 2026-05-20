export default {
  query(_artist, contribs) {
    const query = {};

    query.additionalFile = contribs[0].thing;

    query.albumOrTrack = query.additionalFile.thing;

    query.album =
      (query.albumOrTrack.isAlbum
        ? query.albumOrTrack
        : query.albumOrTrack.album);

    return query;
  },

  relations: (relation, query, artist, _contribs) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      (query.albumOrTrack.isTrack
        ? relation('linkTrack', query.albumOrTrack)
        : null),

    artistCredit:
      relation('generateArtistCredit',
        query.additionalFile.artistContribs,
        [artist.mockSimpleContribution]),
  }),

  data: (query, _artist, contribs) => ({
    for:
      (query.albumOrTrack.isAlbum
        ? 'album'
        : 'track'),

    title:
      query.additionalFile.title,

    files:
      query.additionalFile.filenames.length,

    contribAnnotationParts:
      contribs.flatMap(contrib => contrib.annotationParts),
  }),

  slots: {
    string: {
      type: 'string',
      default: 'additionalFile',
    },

    disableStandaloneWithFiles: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.template.slots({
      annotation:
        (data.contribAnnotationParts
          ? language.formatUnitList(data.contribAnnotationParts)
          : html.blank()),

      content:
        language.encapsulate('artistPage.creditList.entry', entryCapsule => {
          let workingCapsule = entryCapsule;
          let workingOptions = {};

          workingCapsule += '.' + data.for + '.' + slots.string;

          const additionalFileCapsule = workingCapsule;

          if (data.for === 'track') {
            workingOptions.track =
              relations.trackLink;
          }

          if (data.title) {
            relations.artistCredit.setSlots({
              normalStringKey:
                additionalFileCapsule + '.credit.alongsideTitle',
            });
          } else if (data.files && !slots.disableStandaloneWithFiles) {
            relations.artistCredit.setSlots({
              normalStringKey:
                additionalFileCapsule + '.credit.standaloneWithFiles',

              additionalStringOptions: {
                files: language.countFiles(data.files, {unitOnly: true}),
              },
            });
          } else {
            relations.artistCredit.setSlots({
              normalStringKey:
                additionalFileCapsule + '.credit',
            });
          }

          if (!html.isBlank(relations.artistCredit)) {
            workingCapsule += '.withCredit';
            workingOptions.credit = relations.artistCredit;
          }

          if (data.title) {
            workingCapsule += '.withTitle';
            workingOptions.title = language.sanitize(data.title);
          }

          return language.$(workingCapsule, workingOptions);
        }),
    }),
};
