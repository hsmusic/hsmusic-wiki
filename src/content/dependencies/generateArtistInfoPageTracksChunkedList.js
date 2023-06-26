import {accumulateSum, stitchArrays, unique} from '../../util/sugar.js';
import {chunkByProperties, sortAlbumsTracksChronologically} from '../../util/wiki-data.js';

// TODO: This obviously needs to be more generalized.
function sortContributionEntries(entries, sortFunction) {
  const things = unique(entries.map(({thing}) => thing));
  sortFunction(things);

  const outputArrays = [];
  const thingToOutputArray = new Map();

  for (const thing of things) {
    const array = [];
    thingToOutputArray.set(thing, array);
    outputArrays.push(array);
  }

  for (const entry of entries) {
    thingToOutputArray.get(entry.thing).push(entry);
  }

  entries.splice(0, entries.length, ...outputArrays.flat());
}

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageChunkItem',
    'generateArtistInfoPageOtherArtistLinks',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query(artist) {
    const entries = [
      ...artist.tracksAsArtist.map(track => ({
        track,
        date: track.date,
        thing: track,
        album: track.album,
        contribs: track.artistContribs,
      })),

      ...artist.tracksAsContributor.map(track => ({
        track,
        date: track.date,
        thing: track,
        album: track.album,
        contribs: track.contributorContribs,
      })),
    ];

    sortContributionEntries(entries, sortAlbumsTracksChronologically);

    const chunks = chunkByProperties(entries, ['album', 'date']);

    return {entries, chunks};
  },

  relations(relation, query, artist) {
    return {
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
          chunk.map(({contribs}) =>
            contribs
              .find(({who}) => who === artist)
              .what)),

      trackRereleases:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => track.originalReleaseTrack !== null)),
    };
  },

  generate(data, relations, {html, language}) {
    return html.tag('dl',
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
                    contribution,
                    rerelease,

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
          })));
  },
};
