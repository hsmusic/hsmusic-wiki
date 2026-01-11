import {sortAlbumsTracksChronologically} from '#sort';
import {empty, unique} from '#sugar';
import {getTotalDuration} from '#wiki-data';

export default {
  query: (_artist, _album, trackContribLists) => ({
    contribListsCountingTowardTotals:
      trackContribLists
        .filter(trackContribs => trackContribs
          .some(contrib =>
            contrib.countInContributionTotals ||
            contrib.countInDurationTotals)),

    contribListsNotCountingTowardTotals:
      trackContribLists
        .filter(trackContribs => trackContribs
          .every(contrib =>
            !contrib.countInContributionTotals &&
            !contrib.countInDurationTotals)),
  }),

  relations: (relation, query, artist, album, _trackContribLists) => ({
    template:
      relation('generateArtistInfoPageChunk'),

    albumLink:
      relation('linkAlbum', album),

    itemsCountingTowardTotals:
      query.contribListsCountingTowardTotals.map(trackContribs =>
        relation('generateArtistInfoPageTracksChunkItem',
          artist,
          trackContribs)),

    itemsNotCountingTowardTotals:
      query.contribListsNotCountingTowardTotals.map(trackContribs =>
        relation('generateArtistInfoPageTracksChunkItem',
          artist,
          trackContribs)),
  }),

  data(artist, _query, album, trackContribLists) {
    const data = {};

    const contribs =
      trackContribLists.flat();

    data.dates =
      contribs
        .map(contrib => contrib.date);

    // TODO: Duration stuff should *maybe* be in proper data logic? Maaaybe?
    const durationTerms =
      unique(
        contribs
          .filter(contrib => contrib.countInDurationTotals)
          .map(contrib => contrib.thing)
          .filter(track => track.isMainRelease)
          .filter(track => track.duration > 0));

    data.duration =
      getTotalDuration(durationTerms);

    data.durationApproximate =
      durationTerms.length > 1;

    const tracks =
      trackContribLists.map(contribs => contribs[0].thing);

    data.numLinkingOtherReleases =
      tracks.filter(track => {
        if (empty(track.otherReleases)) return false;

        const releases =
          sortAlbumsTracksChronologically(track.allReleases.slice());

        // later releases always link to first release
        if (track !== releases[0]) return true;

        // first releases only link to later credited releases
        return tracks.slice(1).some(track => {
          const contribs = [
            ...track.artistContribs,
            ...track.contributorContribs,
          ];

          return contribs.some(contrib => contrib.artist === artist);
        });
      }).length;

    return data;
  },

  generate: (data, relations, {html}) =>
    relations.template.slots({
      mode: 'album',
      link: relations.albumLink,

      dates: data.dates,
      duration: data.duration,
      durationApproximate: data.durationApproximate,

      list:
        html.tag('ul',
          data.numLinkingOtherReleases > 1 &&
            {class: 'offset-tooltips'},

          [
            relations.itemsCountingTowardTotals,

            !empty(relations.itemsCountingTowardTotals) &&
            !empty(relations.itemsNotCountingTowardTotals) &&
              html.tag('li', {class: 'divider'},
                html.tag('hr')),

            relations.itemsNotCountingTowardTotals
              .map(item => item.slot('showDuration', false)),
          ]),
    }),
};
