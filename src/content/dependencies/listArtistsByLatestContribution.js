import {empty, stitchArrays} from '../../util/sugar.js';

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

      // Each value stored in this list, corresponding to each artist,
      // is going to be a list of dates and nulls. Any nulls represent
      // a contribution which isn't associated with a particular date.
      const dateLists = artists.map(artist => fn(artist));

      // Scrap artists who don't even have any relevant contributions.
      // These artists may still have other contributions across the wiki, but
      // they weren't returned by the callback and so aren't relevant to this
      // list.
      filterMultipleArrays(artists, dateLists, (artist, dates) => !empty(dates));

      const dates = dateLists.map(dates => getLatestDate(dates));

      // Also exclude artists whose remaining contributions are all dateless -
      // in this case getLatestDate above will have returned null. But keep
      // track of the artists removed here, since they'll be displayed in an
      // additional list in the final listing page.
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
      artist => [
        ...artist.tracksAsContributor.map(track => +track.date),
        ...artist.tracksAsArtist.map(track => +track.date),
      ]);

    queryContributionInfo(
      'artistsByArtworkContributions',
      'datesByArtworkContributions',
      'datelessArtistsByArtworkContributions',
      artist => [
        // TODO: Per-artwork dates, see #90.
        ...artist.tracksAsCoverArtist.map(track => +track.coverArtDate),
        ...artist.albumsAsCoverArtist.map(album => +album.coverArtDate),
        ...artist.albumsAsWallpaperArtist.map(album => +album.coverArtDate),
        ...artist.albumsAsBannerArtist.map(album => +album.coverArtDate),
      ]);

    if (sprawl.enableFlashesAndGames) {
      queryContributionInfo(
        'artistsByFlashContributions',
        'datesByFlashContributions',
        'datelessArtistsByFlashContributions',
        artist => [
          ...artist.flashesAsContributor.map(flash => +flash.date),
        ]);
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

    relations.datelessArtistLinksByTrackContributions =
      query.datelessArtistsByTrackContributions
        .map(artist => relation('linkArtist', artist));

    relations.artistLinksByArtworkContributions =
      query.artistsByArtworkContributions
        .map(artist => relation('linkArtist', artist));

    relations.datelessArtistLinksByArtworkContributions =
      query.datelessArtistsByArtworkContributions
        .map(artist => relation('linkArtist', artist));

    if (query.enableFlashesAndGames) {
      relations.artistLinksByFlashContributions =
        query.artistsByFlashContributions
          .map(artist => relation('linkArtist', artist));

      relations.datelessArtistLinksByFlashContributions =
        query.datelessArtistsByFlashContributions
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
          relations.datelessArtistLinksByTrackContributions,
          data.datesByTrackContributions,
        ]],

        ['artworks', [
          relations.artistLinksByArtworkContributions,
          relations.datelessArtistLinksByArtworkContributions,
          data.datesByArtworkContributions,
        ]],

        data.enableFlashesAndGames &&
          ['flashes', [
            relations.artistLinksByFlashContributions,
            relations.datelessArtistLinksByFlashContributions,
            data.datesByFlashContributions,
          ]],
      ]).filter(Boolean)
        .map(([key, [artistLinks, datelessArtistLinks, dates]]) => [
          key,
          html.tags([
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

            !empty(datelessArtistLinks) && [
              html.tag('p',
                language.$('listingPage.listArtists.byLatest.dateless.title')),

              html.tag('ul',
                datelessArtistLinks.map(artistLink =>
                  html.tag('li',
                    language.$('listingPage.listArtists.byLatest.dateless.item', {
                      artist: artistLink,
                    })))),
            ],
          ]),
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
