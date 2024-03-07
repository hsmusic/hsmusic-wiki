import {empty, unique} from '#sugar';
import {getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageTracksChunkItem',
    'linkAlbum',
  ],

  relations: (relation, artist, album, trackContribLists) => ({
    template:
      relation('generateArtistInfoPageChunk'),

    albumLink:
      relation('linkAlbum', album),

    // Intentional mapping here: each item may be associated with
    // more than one contribution.
    items:
      trackContribLists.map(trackContribs =>
        relation('generateArtistInfoPageTracksChunkItem',
          artist,
          trackContribs)),
  }),

  data(_artist, album, trackContribLists) {
    const data = {};

    const allDates =
      trackContribLists
        .flat()
        .filter(contrib => contrib.date)
        .map(contrib => contrib.date);

    if (!empty(allDates)) {
      const earliestDate =
        allDates
          .reduce((a, b) => a <= b ? a : b);

      const latestDate =
        allDates
          .reduce((a, b) => a <= b ? b : a);

      if (+earliestDate === +latestDate) {
        data.date = earliestDate;
      } else {
        data.earliestDate = earliestDate;
        data.latestDate = latestDate;
      }
    }

    // TODO: Duration stuff should *maybe* be in proper data logic? Maaaybe?
    const durationTerms =
      unique(
        trackContribLists
          .flat()
          .filter(contrib => contrib.countInDurationTotals)
          .map(contrib => contrib.thing)
          .filter(track => track.isOriginalRelease)
          .filter(track => track.duration > 0));

    data.duration =
      getTotalDuration(durationTerms);

    data.durationApproximate =
      durationTerms.length > 1;

    return data;
  },

  generate: (data, relations) =>
    relations.template.slots({
      mode: 'album',

      albumLink: relations.albumLink,

      date: data.date ?? null,
      dateRangeStart: data.earliestDate ?? null,
      dateRangeEnd: data.latestDate ?? null,

      duration: data.duration,
      durationApproximate: data.durationApproximate,

      items: relations.items,
    }),
};
