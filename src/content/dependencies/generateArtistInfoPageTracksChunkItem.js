import {sortAlbumsTracksChronologically} from '#sort';
import {empty} from '#sugar';
import {selectRepresentativeArtistContributorContribs} from '#wiki-data';

export default {
  query(artist, contribs, chunkContribs) {
    const query = {};

    query.track =
      contribs[0].thing;

    query.date =
      contribs[0].date;

    query.anyItemsExpresslyDated =
      chunkContribs.flat()
        .some(contrib => +contrib.date !== +query.track.album.date);

    query.displayedContributions =
      selectRepresentativeArtistContributorContribs(contribs);

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

    query.isLaterRelease =
      allReleasesChronologically[0] !== query.track;

    query.hasOtherCreditedReleases =
      query.track.otherReleases.some(track => {
        const contribs = [
          ...track.artistContribs,
          ...track.contributorContribs,
        ];

        return contribs.some(contrib => contrib.artist === artist);
      });

    return query;
  },

  relations: (relation, query, artist, _contribs) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackListItem:
      relation('generateTrackListItem',
        query.track,
        (empty(query.track.album.artistContribs)
          ? [artist.mockSimpleContribution]
          : query.track.album.artistContribs)),

    rereleaseTooltip:
      (query.isLaterRelease
        ? relation('generateArtistInfoPageRereleaseTooltip', query.track, artist)
        : null),

    firstReleaseTooltip:
      (query.isFirstRelease && query.hasOtherCreditedReleases
        ? relation('generateArtistInfoPageFirstReleaseTooltip', query.track, artist)
        : null),
  }),

  data: (query) => ({
    date:
      (query.anyItemsExpresslyDated
        ? query.date
        : null),

    duration:
      query.track.duration,

    contribAnnotationParts:
      (query.displayedContributions
        ? query.displayedContributions
            .flatMap(contrib => contrib.annotationParts)
        : null),
  }),

  slots: {
    showDuration: {
      type: 'boolean',
      default: true,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.template.slots({
      rereleaseTooltip: relations.rereleaseTooltip,
      firstReleaseTooltip: relations.firstReleaseTooltip,

      annotation:
        (data.contribAnnotationParts
          ? language.formatUnitList(data.contribAnnotationParts)
          : html.blank()),

      content:
        language.$('artistPage.creditList.entry.track', {
          track:
            html.inside(
              relations.trackListItem.slots({
                showArtists: 'auto',
                showDetail: 'from across wiki',
                showDuration: slots.showDuration,
                showDate: data.date,
              })),
        }),
    }),
};
