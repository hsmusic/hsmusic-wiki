import {sortAlbumsTracksChronologically} from '#sort';
import {empty} from '#sugar';

export default {
  query(_artist, contribs) {
    const query = {};

    // TODO: Very mysterious what to do if the set of contributions is,
    // in total, associated with more than one thing. No design yet.
    query.track =
      contribs[0].thing;

    const creditedAsArtist =
      contribs
        .some(contrib => contrib.thingProperty === 'artistContribs');

    const creditedAsContributor =
      contribs
        .some(contrib => contrib.thingProperty === 'contributorContribs');

    const annotatedContribs =
      contribs
        .filter(contrib => contrib.annotation);

    const annotatedArtistContribs =
      annotatedContribs
        .filter(contrib => contrib.thingProperty === 'artistContribs');

    const annotatedContributorContribs =
      annotatedContribs
        .filter(contrib => contrib.thingProperty === 'contributorContribs');

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

    // It's kinda awkward to perform this chronological sort here,
    // per track, rather than just reusing the one that's done to
    // sort all the items on the page altogether... but then, the
    // sort for the page is actually *a different* sort, on purpsoe.
    // That sort is according to the dates of the contributions;
    // this is according to the dates of the tracks. Those can be
    // different - and it's the latter that determines whether the
    // track is a rerelease!
    const allReleasesChronologically =
      sortAlbumsTracksChronologically(query.track.allReleases);

    query.isFirstRelease =
      allReleasesChronologically[0] === query.track;

    query.isRerelease =
      allReleasesChronologically[0] !== query.track;

    query.hasOtherReleases =
      !empty(query.track.otherReleases);

    return query;
  },

  relations: (relation, query, artist, contribs) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      relation('linkTrack', query.track),

    otherArtistLinks:
      relation('generateArtistInfoPageOtherArtistLinks', contribs),

    rereleaseTooltip:
      (query.isRerelease
        ? relation('generateArtistInfoPageRereleaseTooltip', query.track, artist)
        : null),

    firstReleaseTooltip:
      (query.isFirstRelease && query.hasOtherReleases
        ? relation('generateArtistInfoPageFirstReleaseTooltip', query.track, artist)
        : null),
  }),

  data: (query) => ({
    duration:
      query.track.duration,

    contribAnnotations:
      (query.displayedContributions
        ? query.displayedContributions
            .map(contrib => contrib.annotation)
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    relations.template.slots({
      otherArtistLinks: relations.otherArtistLinks,
      rereleaseTooltip: relations.rereleaseTooltip,
      firstReleaseTooltip: relations.firstReleaseTooltip,

      annotation:
        (data.contribAnnotations
          ? language.formatUnitList(data.contribAnnotations)
          : html.blank()),

      content:
        language.encapsulate('artistPage.creditList.entry.track', workingCapsule => {
          const workingOptions = {track: relations.trackLink};

          if (data.duration) {
            workingCapsule += '.withDuration';
            workingOptions.duration =
              language.formatDuration(data.duration);
          }

          return language.$(workingCapsule, workingOptions);
        }),
    }),
};
