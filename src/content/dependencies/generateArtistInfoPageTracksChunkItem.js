import {sortAlbumsTracksChronologically} from '#sort';
import {empty, unique} from '#sugar';
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

    const regularReleases =
      query.track.allReleases
        .filter(track => track.album.style !== 'meta');

    // It's kinda awkward to perform this chronological sort here,
    // per track, rather than just reusing the one that's done to
    // sort all the items on the page altogether... but then, the
    // sort for the page is actually *a different* sort, on purpsoe.
    // That sort is according to the dates of the contributions;
    // this is according to the dates of the tracks. Those can be
    // different - and it's the latter that determines whether the
    // track is a rerelease!
    const regularReleasesChronologically =
      sortAlbumsTracksChronologically(regularReleases);

    query.isFirstRelease =
      regularReleases.includes(query.track) &&
      regularReleasesChronologically[0] === query.track;

    query.isLaterRelease =
      regularReleases.includes(query.track) &&
      regularReleasesChronologically[0] !== query.track;

    query.hasOtherCreditedReleases =
      query.track.otherReleases.some(track => {
        const contribs = [
          ...track.artistContribs,
          ...track.contributorContribs,
        ];

        return contribs.some(contrib => contrib.artist === artist);
      });

    const rawCreditedNames =
      unique(contribs.map(contrib => contrib.artistText));

    query.creditedNames =
      (rawCreditedNames.includes(null) && rawCreditedNames.length > 1
        ? [
            artist.name,
            ...rawCreditedNames.filter(name => name !== null),
          ]
     : rawCreditedNames.includes(null) && rawCreditedNames.length === 1
        ? []
        : rawCreditedNames);

    query.chunkHasOtherCreditedNames =
      chunkContribs.some(chunkContribs =>
        chunkContribs !== contribs &&
        chunkContribs.some(contrib =>
          !rawCreditedNames.includes(contrib.artistText)));

    // OK these next two variables are stolen right from the chunk's
    // query function, duplicated logic beware.

    const album = query.track.album;

    const creditedAsAliasesOnAlbum =
      unique(
        [...album.artistContribs, ...album.trackArtistContribs]
          .filter(contrib => contrib.artist === artist)
          .map(contrib => contrib.artistText));

    const mostlyCreditedAsAlias =
      (creditedAsAliasesOnAlbum.length === 1
        ? creditedAsAliasesOnAlbum[0]
        : null);

    if (
      query.creditedNames.length === 1 &&
      query.creditedNames[0] === mostlyCreditedAsAlias
    ) {
      query.creditedNames = [];
    }

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

    creditedAsAliases:
      (query.creditedNames && query.chunkHasOtherCreditedNames
        ? query.creditedNames
        : []),
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

      creditedAsAliases: data.creditedAsAliases,

      content:
        language.$('artistPage.creditList.entry.track', {
          track:
            html.inside(
              relations.trackListItem.slots({
                showArtists: 'auto',
                showNameDetail: 'from within album',
                showDuration: slots.showDuration,
                showDate: data.date,
              })),
        }),
    }),
};
