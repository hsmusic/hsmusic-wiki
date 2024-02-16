import {sortAlphabetically, sortByCount} from '#sort';
import {empty, filterByCount, filterMultipleArrays, stitchArrays, unique}
  from '#sugar';

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
      const artists =
        sortAlphabetically(
          sprawl.artistData.filter(artist => !artist.isAlias));

      const counts =
        artists.map(artist => fn(artist));

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

  generate(data, relations, {language}) {
    const listChunkIDs = ['tracks', 'artworks'];
    const listTitleStringsKeys = ['trackContributors', 'artContributors'];
    const listCountFunctions = ['countTracks', 'countArtworks'];

    const listArtistLinks = [
      relations.artistLinksByTrackContributions,
      relations.artistLinksByArtworkContributions,
    ];

    const listArtistCounts = [
      data.countsByTrackContributions,
      data.countsByArtworkContributions,
    ];

    if (data.enableFlashesAndGames) {
      listChunkIDs.push('flashes');
      listTitleStringsKeys.push('flashContributors');
      listCountFunctions.push('countFlashes');
      listArtistLinks.push(relations.artistLinksByFlashContributions);
      listArtistCounts.push(data.countsByFlashContributions);
    }

    filterMultipleArrays(
      listChunkIDs,
      listTitleStringsKeys,
      listCountFunctions,
      listArtistLinks,
      listArtistCounts,
      (_chunkID, _titleStringsKey, _countFunction, artistLinks, _artistCounts) =>
        !empty(artistLinks));

    return relations.page.slots({
      type: 'chunks',

      showSkipToSection: true,
      chunkIDs: listChunkIDs,

      chunkTitles:
        listTitleStringsKeys.map(stringsKey => ({stringsKey})),

      chunkRows:
        stitchArrays({
          artistLinks: listArtistLinks,
          artistCounts: listArtistCounts,
          countFunction: listCountFunctions,
        }).map(({artistLinks, artistCounts, countFunction}) =>
            stitchArrays({
              artistLink: artistLinks,
              artistCount: artistCounts,
            }).map(({artistLink, artistCount}) => ({
                artist: artistLink,
                contributions: language[countFunction](artistCount, {unit: true}),
              }))),
    });
  },
};
