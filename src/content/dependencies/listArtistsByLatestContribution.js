import {empty, stitchArrays} from '#sugar';
import T from '#things';

import {
  chunkMultipleArrays,
  sortAlphabetically,
  sortAlbumsTracksChronologically,
  sortFlashesChronologically,
  sortMultipleArrays,
} from '#wiki-data';

const {Album, Flash} = T;

export default {
  contentDependencies: [
    'generateListingPage',
    'linkAlbum',
    'linkArtist',
    'linkFlash',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({albumData, artistData, flashData, trackData, wikiInfo}) =>
    ({albumData, artistData, flashData, trackData,
      enableFlashesAndGames: wikiInfo.enableFlashesAndGames}),

  query(sprawl, spec) {
    //
    // First main step is to get the latest thing each artist has contributed
    // to, and the date associated with that contribution! Some notes:
    //
    // * Album and track contributions are considered before flashes, so
    //   they'll take priority if an artist happens to have multiple contribs
    //   landing on the same date to both an album and a flash.
    //
    // * The final (album) contribution list is chunked by album, but also by
    //   date, because an individual album can cover a variety of dates.
    //
    // * If an artist has contributed both artworks and tracks to the album
    //   containing their latest contribution, then that will be indicated
    //   in an annotation, but *only if* those contributions were also on
    //   the same date.
    //
    // * If an artist made contributions to multiple albums on the same date,
    //   then the first of the *albums* sorted chronologically (latest first)
    //   is the one that will count.
    //
    // * Same for artists who've contributed to multiple flashes which were
    //   released on the same date.
    //
    // * The map may exclude artists none of whose contributions were dated.
    //

    const artistLatestContribMap = new Map();

    const considerDate = (artist, date, thing, contribution) => {
      if (!date) {
        return;
      }

      if (artistLatestContribMap.has(artist)) {
        const latest = artistLatestContribMap.get(artist);
        if (latest.date > date) {
          return;
        }

        if (latest.date === date) {
          if (latest.thing === thing) {
            // May combine differnt contributions to the same thing and date.
            latest.contribution.add(contribution);
          }

          // Earlier-processed things of same date take priority.
          return;
        }
      }

      // First entry for artist or more recent contribution than latest date.
      artistLatestContribMap.set(artist, {
        date,
        thing,
        contribution: new Set([contribution]),
      });
    };

    const getArtists = (thing, key) => thing[key].map(({who}) => who);

    const albumsLatestFirst = sortAlbumsTracksChronologically(sprawl.albumData.slice());
    const tracksLatestFirst = sortAlbumsTracksChronologically(sprawl.trackData.slice());
    const flashesLatestFirst = sortFlashesChronologically(sprawl.flashData.slice());

    for (const album of albumsLatestFirst) {
      for (const artist of new Set([
        ...getArtists(album, 'coverArtistContribs'),
        ...getArtists(album, 'wallpaperArtistContribs'),
        ...getArtists(album, 'bannerArtistContribs'),
      ])) {
        // Might combine later with 'track' of the same album and date.
        considerDate(artist, album.coverArtDate ?? album.date, album, 'artwork');
      }
    }

    for (const track of tracksLatestFirst) {
      for (const artist of getArtists(track, 'coverArtistContribs')) {
        // No special effect if artist already has 'artwork' for the same album and date.
        considerDate(artist, track.coverArtDate ?? track.date, track.album, 'artwork');
      }

      for (const artist of new Set([
        ...getArtists(track, 'artistContribs'),
        ...getArtists(track, 'contributorContribs'),
      ])) {
        // Might be combining with 'artwork' of the same album and date.
        considerDate(artist, track.date, track.album, 'track');
      }
    }

    for (const flash of flashesLatestFirst) {
      for (const artist of getArtists(flash, 'contributorContribs')) {
        // Won't take priority above album contributions of the same date.
        considerDate(artist, flash.date, flash, 'flash');
      }
    }

    //
    // Next up is to sort all the processed artist information!
    //
    // Entries with the same album/flash and the same date go together first,
    // with the following rules for sorting artists therein:
    //
    // * If the contributions are different, which can only happen for albums,
    //   then it's tracks-only first, tracks + artworks next, and artworks-only
    //   last.
    //
    // * If the contributions are the same, then sort alphabetically.
    //
    // Entries with different albums/flashes follow another set of rules:
    //
    // * Later dates come before earlier dates.
    //
    // * On the same date, albums come before flashes.
    //
    // * Things of the same type *and* date are sorted alphabetically.
    //

    const artistsAlphabetically =
      sortAlphabetically(
        sprawl.artistData.filter(artist => !artist.isAlias));

    const artists =
      Array.from(artistLatestContribMap.keys());

    const artistContribEntries =
      Array.from(artistLatestContribMap.values());

    const artistThings =
      artistContribEntries.map(({thing}) => thing);

    const artistDates =
      artistContribEntries.map(({date}) => date);

    const artistContributions =
      artistContribEntries.map(({contribution}) => contribution);

    sortMultipleArrays(artistThings, artistDates, artistContributions, artists,
      (thing1, thing2, date1, date2, contrib1, contrib2, artist1, artist2) => {
        if (date1 === date2 && thing1 === thing2) {
          // Move artwork-only contribs after contribs with tracks.
          if (!contrib1.has('track') && contrib2.has('track')) return 1;
          if (!contrib2.has('track') && contrib1.has('track')) return -1;

          // Move track-only contribs before tracks with tracks and artwork.
          if (!contrib1.has('artwork') && contrib2.has('artwork')) return -1;
          if (!contrib2.has('artwork') && contrib1.has('artwork')) return 1;

          // Sort artists of the same type of contribution alphabetically,
          // referring to a previous sort.
          const index1 = artistsAlphabetically.indexOf(artist1);
          const index2 = artistsAlphabetically.indexOf(artist2);
          return index1 - index2;
        } else {
          // Move later dates before earlier ones.
          if (date1 !== date2) return date2 - date1;

          // Move albums before flashes.
          if (thing1 instanceof Album && thing2 instanceof Flash) return -1;
          if (thing1 instanceof Flash && thing2 instanceof Album) return 1;

          // Sort two albums or two flashes alphabetically, referring to a
          // previous sort (which was chronological but includes the correct
          // ordering for things released on the same date).
          const thingsLatestFirst =
            (thing1 instanceof Album
              ? albumsLatestFirst
              : flashesLatestFirst);
          const index1 = thingsLatestFirst.indexOf(thing1);
          const index2 = thingsLatestFirst.indexOf(thing2);
          return index2 - index1;
        }
      });

    const chunks =
      chunkMultipleArrays(artistThings, artistDates, artistContributions, artists,
        (thing, lastThing, date, lastDate) =>
          thing !== lastThing ||
          +date !== +lastDate);

    const chunkThings =
      chunks.map(([artistThings, , , ]) => artistThings[0]);

    const chunkDates =
      chunks.map(([, artistDates, , ]) => artistDates[0]);

    const chunkArtistContributions =
      chunks.map(([, , artistContributions, ]) => artistContributions);

    const chunkArtists =
      chunks.map(([, , , artists]) => artists);

    // And one bonus step - keep track of all the artists whose contributions
    // were all without date.

    const datelessArtists =
      artistsAlphabetically
        .filter(artist => !artists.includes(artist));

    return {
      spec,
      chunkThings,
      chunkDates,
      chunkArtistContributions,
      chunkArtists,
      datelessArtists,
    };
  },

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    chunkAlbumLinks:
      query.chunkThings
        .map(thing =>
          (thing instanceof Album
            ? relation('linkAlbum', thing)
            : null)),

    chunkFlashLinks:
      query.chunkThings
        .map(thing =>
          (thing instanceof Flash
            ? relation('linkFlash', thing)
            : null)),

    chunkArtistLinks:
      query.chunkArtists
        .map(artists => artists
          .map(artist => relation('linkArtist', artist))),

    datelessArtistLinks:
      query.datelessArtists
        .map(artist => relation('linkArtist', artist)),
  }),

  data: (query) => ({
    chunkDates: query.chunkDates,
    chunkArtistContributions: query.chunkArtistContributions,
  }),

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        stitchArrays({
          albumLink: relations.chunkAlbumLinks,
          flashLink: relations.chunkFlashLinks,
          date: data.chunkDates,
        }).map(({albumLink, flashLink, date}) => ({
            date: language.formatDate(date),
            ...(albumLink
              ? {stringsKey: 'album', album: albumLink}
              : {stringsKey: 'flash', flash: flashLink}),
          }))
          .concat(
            (empty(relations.datelessArtistLinks)
              ? []
              : [{stringsKey: 'dateless'}])),

      chunkRows:
        stitchArrays({
          artistLinks: relations.chunkArtistLinks,
          contributions: data.chunkArtistContributions,
        }).map(({artistLinks, contributions}) =>
            stitchArrays({
              artistLink: artistLinks,
              contribution: contributions,
            }).map(({artistLink, contribution}) => ({
                artist: artistLink,
                stringsKey:
                  (contribution.has('track') && contribution.has('artwork')
                    ? 'tracksAndArt'
                 : contribution.has('track')
                    ? 'tracks'
                 : contribution.has('artwork')
                    ? 'art'
                    : null),
              })))
          .concat(
            (empty(relations.datelessArtistLinks)
              ? []
              : [
                  relations.datelessArtistLinks.map(artistLink => ({
                    artist: artistLink,
                  })),
                ])),
    });
  },
};
