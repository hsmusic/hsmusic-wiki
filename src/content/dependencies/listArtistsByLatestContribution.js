import {transposeArrays, empty, stitchArrays} from '#sugar';

import {
  chunkMultipleArrays,
  compareCaseLessSensitive,
  compareDates,
  filterMultipleArrays,
  reduceMultipleArrays,
  sortAlphabetically,
  sortMultipleArrays,
} from '#wiki-data';

export default {
  contentDependencies: [
    'generateListingPage',
    'linkAlbum',
    'linkArtist',
    'linkFlash',
  ],

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

    const queryContributionInfo = (
      artistsKey,
      chunkThingsKey,
      datesKey,
      datelessArtistsKey,
      fn,
    ) => {
      const artists = sortAlphabetically(sprawl.artistData.slice());

      // Each value stored in dateLists, corresponding to each artist,
      // is going to be a list of dates and nulls. Any nulls represent
      // a contribution which isn't associated with a particular date.
      const [chunkThingLists, dateLists] =
        transposeArrays(artists.map(artist => fn(artist)));

      // Scrap artists who don't even have any relevant contributions.
      // These artists may still have other contributions across the wiki, but
      // they weren't returned by the callback and so aren't relevant to this
      // list.
      filterMultipleArrays(
        artists,
        chunkThingLists,
        dateLists,
        (artists, chunkThings, dates) => !empty(dates));

      // Also exclude artists whose remaining contributions are all dateless.
      // But keep track of the artists removed here, since they'll be displayed
      // in an additional list in the final listing page.
      const {removed: [datelessArtists]} =
        filterMultipleArrays(
          artists,
          chunkThingLists,
          dateLists,
          (artist, chunkThings, dates) => !empty(dates.filter(Boolean)));

      // Cut out dateless contributions. They're not relevant to finding the
      // latest date.
      for (const [chunkThings, dates] of transposeArrays([chunkThingLists, dateLists])) {
        filterMultipleArrays(chunkThings, dates, (chunkThing, date) => date);
      }

      const [chunkThings, dates] =
        transposeArrays(
          transposeArrays([chunkThingLists, dateLists])
            .map(([chunkThings, dates]) =>
              reduceMultipleArrays(
                chunkThings, dates,
                (accChunkThing, accDate, chunkThing, date) =>
                  (date && date > accDate
                    ? [chunkThing, date]
                    : [accChunkThing, accDate]))));

      sortMultipleArrays(artists, dates, chunkThings,
        (artistA, artistB, dateA, dateB, chunkThingA, chunkThingB) => {
          const dateComparison = compareDates(dateA, dateB, {latestFirst: true});
          if (dateComparison !== 0) {
            return dateComparison;
          }

          // TODO: Compare alphabetically, not just by directory.
          return compareCaseLessSensitive(chunkThingA.directory, chunkThingB.directory);
        });

      const chunks =
        chunkMultipleArrays(artists, dates, chunkThings,
          (artist, lastArtist, date, lastDate, chunkThing, lastChunkThing) =>
            +date !== +lastDate || chunkThing !== lastChunkThing);

      query[chunkThingsKey] =
        chunks.map(([artists, dates, chunkThings]) => chunkThings[0]);

      query[datesKey] =
        chunks.map(([artists, dates, chunkThings]) => dates[0]);

      query[artistsKey] =
        chunks.map(([artists, dates, chunkThings]) => artists);

      query[datelessArtistsKey] = datelessArtists;
    };

    queryContributionInfo(
      'artistsByTrackContributions',
      'albumsByTrackContributions',
      'datesByTrackContributions',
      'datelessArtistsByTrackContributions',
      artist => {
        const tracks =
          [...artist.tracksAsArtist, ...artist.tracksAsContributor]
            .filter(track => !track.originalReleaseTrack);

        const albums = tracks.map(track => track.album);
        const dates = tracks.map(track => track.date);

        return [albums, dates];
      });

    queryContributionInfo(
      'artistsByArtworkContributions',
      'albumsByArtworkContributions',
      'datesByArtworkContributions',
      'datelessArtistsByArtworkContributions',
      artist => [
        [
          ...artist.tracksAsCoverArtist.map(track => track.album),
          ...artist.albumsAsCoverArtist,
          ...artist.albumsAsWallpaperArtist,
          ...artist.albumsAsBannerArtist,
        ],
        [
          // TODO: Per-artwork dates, see #90.
          ...artist.tracksAsCoverArtist.map(track => track.coverArtDate),
          ...artist.albumsAsCoverArtist.map(album => album.coverArtDate),
          ...artist.albumsAsWallpaperArtist.map(album => album.coverArtDate),
          ...artist.albumsAsBannerArtist.map(album => album.coverArtDate),
        ],
      ]);

    if (sprawl.enableFlashesAndGames) {
      queryContributionInfo(
        'artistsByFlashContributions',
        'flashesByFlashContributions',
        'datesByFlashContributions',
        'datelessArtistsByFlashContributions',
        artist => [
          [
            ...artist.flashesAsContributor,
          ],
          [
            ...artist.flashesAsContributor.map(flash => flash.date),
          ],
        ]);
    }

    return query;
  },

  relations(relation, query) {
    const relations = {};

    relations.page =
      relation('generateListingPage', query.spec);

    // Track contributors

    relations.albumLinksByTrackContributions =
      query.albumsByTrackContributions
        .map(album => relation('linkAlbum', album));

    relations.artistLinksByTrackContributions =
      query.artistsByTrackContributions
        .map(artists =>
          artists.map(artist => relation('linkArtist', artist)));

    relations.datelessArtistLinksByTrackContributions =
      query.datelessArtistsByTrackContributions
        .map(artist => relation('linkArtist', artist));

    // Artwork contributors

    relations.albumLinksByArtworkContributions =
      query.albumsByArtworkContributions
        .map(album => relation('linkAlbum', album));

    relations.artistLinksByArtworkContributions =
      query.artistsByArtworkContributions
        .map(artists =>
          artists.map(artist => relation('linkArtist', artist)));

    relations.datelessArtistLinksByArtworkContributions =
      query.datelessArtistsByArtworkContributions
        .map(artist => relation('linkArtist', artist));

    // Flash contributors

    if (query.enableFlashesAndGames) {
      relations.flashLinksByFlashContributions =
        query.flashesByFlashContributions
          .map(flash => relation('linkFlash', flash));

      relations.artistLinksByFlashContributions =
        query.artistsByFlashContributions
          .map(artists =>
            artists.map(artist => relation('linkArtist', artist)));

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
    const chunkTitles = Object.fromEntries(
      ([
        ['tracks', [
          'album',
          relations.albumLinksByTrackContributions,
          data.datesByTrackContributions,
        ]],

        ['artworks', [
          'album',
          relations.albumLinksByArtworkContributions,
          data.datesByArtworkContributions,
        ]],

        data.enableFlashesAndGames &&
          ['flashes', [
            'flash',
            relations.flashLinksByFlashContributions,
            data.datesByFlashContributions,
          ]],
      ]).filter(Boolean)
        .map(([key, [stringsKey, links, dates]]) => [
          key,
          stitchArrays({link: links, date: dates})
            .map(({link, date}) =>
              html.tag('dt',
                language.$(`listingPage.listArtists.byLatest.chunk.title.${stringsKey}`, {
                  [stringsKey]: link,
                  date: language.formatDate(date),
                }))),
        ]));

    const chunkItems = Object.fromEntries(
      ([
        ['tracks', relations.artistLinksByTrackContributions],
        ['artworks', relations.artistLinksByArtworkContributions],
        data.enableFlashesAndGames &&
          ['flashes', relations.artistLinksByFlashContributions],
      ]).filter(Boolean)
        .map(([key, artistLinkLists]) => [
          key,
          artistLinkLists.map(artistLinks =>
            html.tag('dd',
              html.tag('ul',
                artistLinks.map(artistLink =>
                  html.tag('li',
                    language.$('listingPage.listArtists.byLatest.chunk.item', {
                      artist: artistLink,
                    })))))),
        ]));

    const lists = Object.fromEntries(
      ([
        ['tracks', [
          chunkTitles.tracks,
          chunkItems.tracks,
          relations.datelessArtistLinksByTrackContributions,
        ]],

        ['artworks', [
          chunkTitles.artworks,
          chunkItems.artworks,
          relations.datelessArtistLinksByArtworkContributions,
        ]],

        data.enableFlashesAndGames &&
          ['flashes', [
            chunkTitles.flashes,
            chunkItems.flashes,
            relations.datelessArtistLinksByFlashContributions,
          ]],
      ]).filter(Boolean)
        .map(([key, [titles, items, datelessArtistLinks]]) => [
          key,
          html.tags([
            html.tag('dl',
              stitchArrays({
                title: titles,
                items: items,
              }).map(({title, items}) => [title, items])),

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
