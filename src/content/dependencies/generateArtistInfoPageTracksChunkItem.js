import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunkItem',
    'generateArtistInfoPageOtherArtistLinks',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query (_artist, track, contribs) {
    const query = {};

    const creditedAsArtist =
      contribs
        .some(contrib => contrib.kind === 'artist');

    const creditedAsContributor =
      contribs
        .some(contrib => contrib.kind === 'contributor');

    const annotatedContribs =
      contribs
        .filter(contrib => contrib.annotation);

    const annotatedArtistContribs =
      annotatedContribs
        .filter(contrib => contrib.kind === 'artist');

    const annotatedContributorContribs =
      annotatedContribs
        .filter(contrib => contrib.kind === 'contributor');

    // Don't display annotations associated with crediting in the
    // Contributors field if the artist is also credited as an Artist
    // *and* the Artist-field contribution is non-annotated. This is
    // so that we don't misrepresent the artist - the contributor
    // annotation tends to be for "secondary" and performance roles.
    // For example, this avoids crediting Marcy Nabors on Renewed
    // Return seemingly only for "bass clarinet" when they're also
    // the one who composed and arranged Renewed Return!
    if (
      creditedAsArtist &&
      creditedAsContributor &&
      empty(annotatedArtistContribs)
    ) {
      query.displayedContributions = null;
    } else if (
      !empty(annotatedArtistContribs) ||
      !empty(annotatedContributorContribs)
    ) {
      query.displayedContributions = [
        ...annotatedArtistContribs,
        ...annotatedContributorContribs,
      ];
    }

    return query;
  },

  relations: (relation, _query, artist, track, contribs) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      relation('linkTrack', track),

    otherArtistLinks:
      relation('generateArtistInfoPageOtherArtistLinks',
        contribs,
        artist),
  }),

  data: (query, _artist, track, _contribs) => ({
    duration:
      track.duration,

    rerelease:
      track.isRerelease,

    contribAnnotations:
      (query.displayedContributions
        ? query.displayedContributions
            .map(contrib => contrib.annotation)
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    relations.template.slots({
      otherArtistLinks: relations.otherArtistLinks,
      rerelease: data.rerelease,

      annotation:
        (data.contribAnnotations
          ? language.formatUnitList(data.contribAnnotations)
          : html.blank()),

      content:
        (data.duration
          ? language.$('artistPage.creditList.entry.track.withDuration', {
              track: relations.trackLink,
              duration: language.formatDuration(data.duration),
            })
          : language.$('artistPage.creditList.entry.track', {
              track: relations.trackLink,
            })),
    }),
};
