import {stitchArrays, unique} from '#sugar';

import {
  filterByCount,
  sortAlphabetically,
  sortByCount,
} from '#wiki-data';

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

    const queryContributionInfo = (artistsKey, countsKey, fn) => {
      const artists = sortAlphabetically(sprawl.artistData.slice());
      const counts = artists.map(artist => fn(artist));

      filterByCount(artists, counts);
      sortByCount(artists, counts, {greatestFirst: true});

      query[artistsKey] = artists;
      query[countsKey] = counts;
    };

    queryContributionInfo(
      'artistsByTrackContributions',
      'countsByTrackContributions',
      artist =>
        unique([
          ...artist.tracksAsContributor,
          ...artist.tracksAsArtist,
        ]).length);

    queryContributionInfo(
      'artistsByArtworkContributions',
      'countsByArtworkContributions',
      artist =>
        artist.tracksAsCoverArtist.length +
        artist.albumsAsCoverArtist.length +
        artist.albumsAsWallpaperArtist.length +
        artist.albumsAsBannerArtist.length);

    if (sprawl.enableFlashesAndGames) {
      queryContributionInfo(
        'artistsByFlashContributions',
        'countsByFlashContributions',
        artist =>
          artist.flashesAsContributor.length);
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

    data.countsByTrackContributions = query.countsByTrackContributions;
    data.countsByArtworkContributions = query.countsByArtworkContributions;

    if (query.enableFlashesAndGames) {
      data.countsByFlashContributions = query.countsByFlashContributions;
    }

    return data;
  },

  generate(data, relations, {html, language}) {
    const lists = Object.fromEntries(
      ([
        ['tracks', [
          relations.artistLinksByTrackContributions,
          data.countsByTrackContributions,
          'countTracks',
        ]],

        ['artworks', [
          relations.artistLinksByArtworkContributions,
          data.countsByArtworkContributions,
          'countArtworks',
        ]],

        data.enableFlashesAndGames &&
          ['flashes', [
            relations.artistLinksByFlashContributions,
            data.countsByFlashContributions,
            'countFlashes',
          ]],
      ]).filter(Boolean)
        .map(([key, [artistLinks, counts, countFunction]]) => [
          key,
          html.tag('ul',
            stitchArrays({
              artistLink: artistLinks,
              count: counts,
            }).map(({artistLink, count}) =>
                html.tag('li',
                  language.$('listingPage.listArtists.byContribs.item', {
                    artist: artistLink,
                    contributions: language[countFunction](count, {unit: true}),
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
