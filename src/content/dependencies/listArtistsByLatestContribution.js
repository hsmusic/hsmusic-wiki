import {stitchArrays} from '../../util/sugar.js';
import {
  compareDates,
  filterMultipleArrays,
  getLatestDate,
  sortAlphabetically,
  sortMultipleArrays,
} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkArtist'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({artistData, wikiInfo}) {
    return {
      artistData,
      enableFlashesAndGames: wikiInfo.enableFlashesAndGames,
    };
  },

  query(sprawl, spec) {
    const query = {
      spec,
      enableFlashesAndGames: sprawl.enableFlashesAndGames,
    };

    const queryContributionInfo = (artistsKey, datesKey, datelessArtistsKey, fn) => {
      const artists = sortAlphabetically(sprawl.artistData.slice());
      const dates = artists.map(artist => fn(artist));

      const {removed: [datelessArtists]} =
        filterMultipleArrays(artists, dates, (artist, date) => date);

      sortMultipleArrays(artists, dates,
        (a, b, dateA, dateB) =>
          compareDates(dateA, dateB, {latestFirst: true}));

      query[artistsKey] = artists;
      query[datesKey] = dates.map(dateNumber => new Date(dateNumber));
      query[datelessArtistsKey] = datelessArtists;
    };

    queryContributionInfo(
      'artistsByTrackContributions',
      'datesByTrackContributions',
      'datelessArtistsByTrackContributions',
      artist =>
        getLatestDate([
          ...artist.tracksAsContributor.map(track => +track.date),
          ...artist.tracksAsArtist.map(track => +track.date),
        ]));

    queryContributionInfo(
      'artistsByArtworkContributions',
      'datesByArtworkContributions',
      'datelessArtistsByArtworkContributions',
      artist =>
        getLatestDate([
          // TODO: Per-artwork dates, see #90.
          ...artist.tracksAsCoverArtist.map(track => +track.coverArtDate),
          ...artist.albumsAsCoverArtist.map(album => +album.coverArtDate),
          ...artist.albumsAsWallpaperArtist.map(album => +album.coverArtDate),
          ...artist.albumsAsBannerArtist.map(album => +album.coverArtDate),
        ]));

    if (sprawl.enableFlashesAndGames) {
      queryContributionInfo(
        'artistsByFlashContributions',
        'datesByFlashContributions',
        'datelessArtistsByFlashContributions',
        artist =>
          getLatestDate([
            ...artist.flashesAsContributor.map(flash => +flash.date),
          ]));
    }

    return query;
  },

  relations(relation, query) {
    const relations = {};

    relations.page =
      relation('generateListingPage', query.spec);

    relations.artistLinksByTrackContributions =
      query.artistsByTrackContributions
        .map(artist => relation('linkArtist', artist));

    relations.artistLinksByArtworkContributions =
      query.artistsByArtworkContributions
        .map(artist => relation('linkArtist', artist));

    if (query.enableFlashesAndGames) {
      relations.artistLinksByFlashContributions =
        query.artistsByFlashContributions
          .map(artist => relation('linkArtist', artist));
    }

    return relations;
  },

  data(query) {
    const data = {};

    data.enableFlashesAndGames = query.enableFlashesAndGames;

    data.datesByTrackContributions = query.datesByTrackContributions;
    data.datesByArtworkContributions = query.datesByArtworkContributions;

    if (query.enableFlashesAndGames) {
      data.datesByFlashContributions = query.datesByFlashContributions;
    }

    return data;
  },

  generate(data, relations, {html, language}) {
    const lists = Object.fromEntries(
      ([
        ['tracks', [
          relations.artistLinksByTrackContributions,
          data.datesByTrackContributions,
        ]],

        ['artworks', [
          relations.artistLinksByArtworkContributions,
          data.datesByArtworkContributions,
        ]],

        data.enableFlashesAndGames &&
          ['flashes', [
            relations.artistLinksByFlashContributions,
            data.datesByFlashContributions,
          ]],
      ]).filter(Boolean)
        .map(([key, [artistLinks, dates]]) => [
          key,
          html.tag('ul',
            stitchArrays({
              artistLink: artistLinks,
              date: dates,
            }).map(({artistLink, date}) =>
                html.tag('li',
                  language.$('listingPage.listArtists.byLatest.item', {
                    artist: artistLink,
                    date: language.formatDate(date),
                  })))),
        ]));

    return relations.page.slots({
      type: 'custom',
      content:
        html.tag('div', {class: 'content-columns'}, [
          html.tag('div', {class: 'column'}, [
            html.tag('h2',
              language.$('listingPage.misc.trackContributors')),

            lists.tracks,
          ]),

          html.tag('div', {class: 'column'}, [
            html.tag('h2',
              language.$(
                'listingPage.misc.artContributors')),

            lists.artworks,

            lists.flashes && [
              html.tag('h2',
                language.$('listingPage.misc.flashContributors')),

              lists.flashes,
            ],
          ]),
        ]),
    });
  },
};
