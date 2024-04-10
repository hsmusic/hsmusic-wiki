import {empty} from '#sugar';
import {isArtistContribution, isContributorContribution} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunkItem',
    'generateArtistInfoPageOtherArtistLinks',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query (_artist, contribs) {
    const query = {};

    // TODO: Very mysterious what to do if the set of contributions is,
    // in total, associated with more than one thing. No design yet.
    query.track =
      contribs[0].thing;

    const creditedAsArtist =
      contribs
        .some(isArtistContribution);

    const creditedAsContributor =
      contribs
        .some(isContributorContribution);

    const annotatedContribs =
      contribs
        .filter(contrib => contrib.annotation);

    const annotatedArtistContribs =
      annotatedContribs
        .filter(isArtistContribution);

    const annotatedContributorContribs =
      annotatedContribs
        .filter(isContributorContribution);

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

  relations: (relation, query, artist, contribs) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      relation('linkTrack', query.track),

    otherArtistLinks:
      relation('generateArtistInfoPageOtherArtistLinks', contribs),
  }),

  data: (query) => ({
    duration:
      query.track.duration,

    rerelease:
      query.track.isRerelease,

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
