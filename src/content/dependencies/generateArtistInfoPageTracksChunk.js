import {sortAlbumsTracksChronologically} from '#sort';
import {empty, unique} from '#sugar';
import {getTotalDuration} from '#wiki-data';

function countTowardTrackTotals(contribs) {
  const {thing} = contribs[0];
  const track = thing.isTrack ? thing : null;

  if (!track) return null;

  // For secondary releases the goal is to check if the corresponding
  // contribution on the main release would be counted toward track totals.
  // If any of the artist's contributions on the secondary release don't
  // apparently correspond to any on the main release, those will just
  // get checked themselves.
  if (track.isSecondaryRelease) {
    const relevantProperties =
      unique(contribs.map(contrib => contrib.thingProperty));

    const arrays =
      Object.fromEntries(
        relevantProperties.map(prop => [
          prop,
          track.mainReleaseTrack[prop].slice(),
        ]));

    contribs = contribs.map(a => {
      const array = arrays[a.thingProperty];
      const index =
        array.findIndex(b =>
          b.artist === a.artist &&
          b.annotation === a.annotation);

      if (index >= 0) {
        return array.splice(index, 1).at(0);
      } else {
        return a;
      }
    });
  }

  return contribs.some(contrib =>
    contrib.countInContributionTotals ||
    contrib.countInDurationTotals);
}

export default {
  query: (_artist, _album, trackContribLists) => ({
    isAlbumArtist:
      trackContribLists.flat()
        .some(contrib =>
          contrib.thingProperty === 'artistContribs' &&
          contrib.thing.isAlbum),

    contribListsCountingTowardTotals:
      trackContribLists
        .filter(contribs => countTowardTrackTotals(contribs) === true),

    contribListsNotCountingTowardTotals:
      trackContribLists
        .filter(contribs => countTowardTrackTotals(contribs) === false),
  }),

  relations: (relation, query, artist, album, trackContribLists) => ({
    template:
      relation('generateArtistInfoPageChunk'),

    albumLink:
      relation('linkAlbum', album),

    albumArtistCredit:
      relation('generateArtistCredit', album.artistContribs, []),

    albumArtistOnlyItem:
     (query.isAlbumArtist &&
      empty(query.contribListsCountingTowardTotals) &&
      empty(query.contribListsNotCountingTowardTotals)
        ? relation('generateArtistInfoPageAlbumArtistOnlyChunkItem')
        : null),

    itemsCountingTowardTotals:
      query.contribListsCountingTowardTotals.map(trackContribs =>
        relation('generateArtistInfoPageTracksChunkItem',
          artist,
          trackContribs,
          trackContribLists)),

    itemsNotCountingTowardTotals:
      query.contribListsNotCountingTowardTotals.map(trackContribs =>
        relation('generateArtistInfoPageTracksChunkItem',
          artist,
          trackContribs,
          trackContribLists)),
  }),

  data(artist, _query, album, trackContribLists) {
    const data = {};

    const contribs =
      trackContribLists.flat();

    data.albumDate =
      album.date;

    data.contribDates =
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
      trackContribLists
        .map(contribs => contribs[0].thing)
        .filter(thing => thing.isTrack);

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

  generate: (data, relations, {html, language}) =>
    relations.template.slots({
      mode: 'album',

      link:
        language.encapsulate('artistPage.creditList.album', workingCapsule => {
          const creditCapsule = workingCapsule + '.credit';
          const workingOptions = {album: relations.albumLink};

          relations.albumLink.setSlot('showNameDetail', 'accent');

          relations.albumArtistCredit.setSlots({
            normalStringKey: creditCapsule + '.by',
          });

          if (!html.isBlank(relations.albumArtistCredit)) {
            workingCapsule += '.withCredit';
            workingOptions.credit =
              html.tag('span', {class: 'by'},
                relations.albumArtistCredit);
          }

          return language.$(workingCapsule, workingOptions);
        }),

      date: data.albumDate,
      dates: data.contribDates,

      duration: data.duration,
      durationApproximate: data.durationApproximate,

      list:
        html.tag('ul',
          data.numLinkingOtherReleases > 1 &&
            {class: 'offset-tooltips'},

          [
            relations.albumArtistOnlyItem,

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
