import {accumulateSum, empty, stitchArrays} from '#sugar';

import {
  chunkByProperties,
  sortAlbumsTracksChronologically,
  sortEntryThingPairs,
} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageChunkedList',
    'generateArtistInfoPageChunkItem',
    'generateArtistInfoPageOtherArtistLinks',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query(artist) {
    const processEntries = (things, details) =>
      things.map(thing => ({
        thing,
        entry: details(thing),
      }));

    const tracksAsArtistAndContributor =
      artist.tracksAsArtist
        .filter(track => artist.tracksAsContributor.includes(track));

    const tracksAsArtistOnly =
      artist.tracksAsArtist
        .filter(track => !artist.tracksAsContributor.includes(track));

    const tracksAsContributorOnly =
      artist.tracksAsContributor
        .filter(track => !artist.tracksAsArtist.includes(track));

    const entriesAsArtistAndContributor =
      processEntries(
        tracksAsArtistAndContributor,
        track => ({
          track,
          album: track.album,
          date: track.date,
          contribs: [...track.artistContribs, ...track.contributorContribs],
        }));

    const entriesAsArtistOnly =
      processEntries(
        tracksAsArtistOnly,
        track => ({
          track,
          album: track.album,
          date: track.date,
          contribs: track.artistContribs,
        }));

    const entriesAsContributorOnly =
      processEntries(
        tracksAsContributorOnly,
        track => ({
          track,
          date: track.date,
          album: track.album,
          contribs: track.contributorContribs,
        }));

    const entries = [
      ...entriesAsArtistAndContributor,
      ...entriesAsArtistOnly,
      ...entriesAsContributorOnly,
    ];

    sortEntryThingPairs(entries, sortAlbumsTracksChronologically);

    const chunks =
      chunkByProperties(
        entries.map(({entry}) => entry),
        ['album', 'date']);

    return {chunks};
  },

  relations(relation, query, artist) {
    return {
      chunkedList:
        relation('generateArtistInfoPageChunkedList'),

      chunks:
        query.chunks.map(() => relation('generateArtistInfoPageChunk')),

      albumLinks:
        query.chunks.map(({album}) => relation('linkAlbum', album)),

      items:
        query.chunks.map(({chunk}) =>
          chunk.map(() => relation('generateArtistInfoPageChunkItem'))),

      trackLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => relation('linkTrack', track))),

      trackOtherArtistLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(({contribs}) => relation('generateArtistInfoPageOtherArtistLinks', contribs, artist))),
    };
  },

  data(query, artist) {
    return {
      chunkDates:
        query.chunks.map(({date}) => date),

      chunkDurations:
        query.chunks.map(({chunk}) =>
          accumulateSum(
            chunk
              .filter(({track}) => track.duration && track.originalReleaseTrack === null)
              .map(({track}) => track.duration))),

      chunkDurationsApproximate:
        query.chunks.map(({chunk}) =>
          chunk
            .filter(({track}) => track.duration && track.originalReleaseTrack === null)
            .length > 1),

      trackDurations:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => track.duration)),

      trackContributions:
        query.chunks.map(({chunk}) =>
          chunk
            .map(({contribs}) =>
              contribs
                .filter(({who}) => who === artist)
                .filter(({what}) => what)
                .map(({what}) => what))
            .map(contributions =>
              (empty(contributions)
                ? null
                : contributions))),

      trackRereleases:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => track.originalReleaseTrack !== null)),
    };
  },

  generate(data, relations, {html, language}) {
    return relations.chunkedList.slots({
      chunks:
        stitchArrays({
          chunk: relations.chunks,
          albumLink: relations.albumLinks,
          date: data.chunkDates,
          duration: data.chunkDurations,
          durationApproximate: data.chunkDurationsApproximate,

          items: relations.items,
          trackLinks: relations.trackLinks,
          trackOtherArtistLinks: relations.trackOtherArtistLinks,
          trackDurations: data.trackDurations,
          trackContributions: data.trackContributions,
          trackRereleases: data.trackRereleases,
        }).map(({
            chunk,
            albumLink,
            date,
            duration,
            durationApproximate,

            items,
            trackLinks,
            trackOtherArtistLinks,
            trackDurations,
            trackContributions,
            trackRereleases,
          }) =>
            chunk.slots({
              mode: 'album',
              albumLink,
              date,
              duration,
              durationApproximate,

              items:
                stitchArrays({
                  item: items,
                  trackLink: trackLinks,
                  otherArtistLinks: trackOtherArtistLinks,
                  duration: trackDurations,
                  contribution: trackContributions,
                  rerelease: trackRereleases,
                }).map(({
                    item,
                    trackLink,
                    otherArtistLinks,
                    duration,
                    contribution,
                    rerelease,
                  }) =>
                    item.slots({
                      otherArtistLinks,
                      rerelease,

                      annotation:
                        (contribution
                          ? language.formatUnitList(contribution)
                          : html.blank()),

                      content:
                        (duration
                          ? language.$('artistPage.creditList.entry.track.withDuration', {
                              track: trackLink,
                              duration: language.formatDuration(duration),
                            })
                          : language.$('artistPage.creditList.entry.track', {
                              track: trackLink,
                            })),
                    })),
            })),
    });
  },
};
