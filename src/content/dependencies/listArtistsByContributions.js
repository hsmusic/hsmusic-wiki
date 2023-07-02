import {stitchArrays, unique} from '../../util/sugar.js';

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
    const query = {spec};

    const queryContributionInfo = fn =>
      sprawl.artistData
        .map(artist => ({artist, contributions: fn(artist)}))
        .filter(({contributions}) => contributions)
        .sort((a, b) => b.contributions - a.contributions);

    query.enableFlashesAndGames =
      sprawl.enableFlashesAndGames;

    query.trackContributionInfo =
      queryContributionInfo(artist =>
        unique([
          ...artist.tracksAsContributor,
          ...artist.tracksAsArtist,
        ]).length);

    query.artworkContributionInfo =
      queryContributionInfo(artist =>
        artist.tracksAsCoverArtist.length +
        artist.albumsAsCoverArtist.length +
        artist.albumsAsWallpaperArtist.length +
        artist.albumsAsBannerArtist.length);

    if (sprawl.enableFlashesAndGames) {
      query.flashContributionInfo =
        queryContributionInfo(artist =>
          artist.flashesAsContributor.length);
    }

    return query;
  },

  relations(relation, query) {
    const relations = {};

    relations.page =
      relation('generateListingPage', query.spec);

    relations.artistLinksByTrackContributions =
      query.trackContributionInfo
        .map(({artist}) => relation('linkArtist', artist));

    relations.artistLinksByArtworkContributions =
      query.artworkContributionInfo
        .map(({artist}) => relation('linkArtist', artist));

    if (query.enableFlashesAndGames) {
      relations.artistLinksByFlashContributions =
        query.flashContributionInfo
          .map(({artist}) => relation('linkArtist', artist));
    }

    return relations;
  },

  data(query) {
    const data = {};

    data.enableFlashesAndGames =
      query.enableFlashesAndGames;

    data.countsByTrackContributions =
      query.trackContributionInfo
        .map(({contributions}) => contributions);

    data.countsByArtworkContributions =
      query.artworkContributionInfo
        .map(({contributions}) => contributions);

    if (query.enableFlashesAndGames) {
      data.countsByFlashContributions =
        query.flashContributionInfo
          .map(({contributions}) => contributions);
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
                language.$('listingPage.misc.artAndFlashContributors')),

              lists.flashes,
            ],
          ]),
        ]),
    });
  },
};
