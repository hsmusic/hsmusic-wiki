export default {
  // No special support for aliases / credited names here yet, sorry.

  query: (_artist, contribs) => ({
    flash:
      contribs[0].thing,

    regularContributions:
      contribs
        .filter(contrib => !contrib.isMockFeaturedTrackContribution),

    mockFeaturedTrackContributions:
      contribs
        .filter(contrib => contrib.isMockFeaturedTrackContribution),
  }),

  relations: (relation, query, artist, _contribs) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    flashLink:
      relation('linkFlash', query.flash),

    trackListItems:
      query.mockFeaturedTrackContributions
        .map(({track}) =>
          relation('generateTrackListItem',
            track,
            [artist.mockSimpleContribution])),
  }),

  data: (query, _artist, _contribs) => ({
    regularContribAnnotationParts:
      query.regularContributions
        .flatMap(contrib => contrib.annotationParts),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistPage.creditList.entry.flash', capsule => {
      const numTracks = relations.trackListItems.length;

      relations.trackListItems.forEach(item => {
        item.setSlots({
          showArtists: 'auto',
          showNameDetail: 'from across wiki',
          showDuration: false,
          showDate: false,
        });
      });

      const titleLine =
        language.encapsulate(capsule, workingCapsule => {
          const workingOptions = {};

          workingOptions.flash =
            (numTracks >= 2
              ? html.tag('b', relations.flashLink)
              : relations.flashLink);

          if (numTracks >= 2) {
            workingCapsule += '.withMultipleTracks';
            workingOptions.tracks =
              language.countTracks(numTracks, {unit: true});
          } else if (numTracks === 1) {
            workingCapsule += '.withOneTrack';
            workingOptions.track =
              html.inside(relations.trackListItems[0]);
          }

          let annotation =
            language.formatUnitList(data.regularContribAnnotationParts);

          if (html.isBlank(annotation) && numTracks >= 1) {
            annotation =
              language.$(capsule, 'fallbackMusicAnnotation');
          }

          if (!html.isBlank(annotation)) {
            workingCapsule += '.withAnnotation';
            workingOptions.annotation = annotation;
          }

          return language.$(workingCapsule, workingOptions);
        });

      if (numTracks >= 2) {
        relations.template.setSlot('content',
          html.tag('details',
            html.tag('summary',
              html.tag('span', titleLine)),

            html.tag('ul', relations.trackListItems)));
      } else {
        relations.template.setSlot('content', titleLine);
      }

      return relations.template;
    }),
};
