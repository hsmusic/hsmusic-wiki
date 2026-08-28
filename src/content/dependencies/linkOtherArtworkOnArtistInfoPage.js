import {sortAlbumsTracksChronologically, sortContributionsChronologically}
  from '#sort';
import {chunkByConditions} from '#sugar';

export default {
  query(artwork, artist) {
    const query = {};

    query.contrib =
      artwork.artistContribs
        .find(contrib => contrib.artist === artist);

    query.isEditsForWiki =
      query.contrib.isEditsForWikiCredit ?? false;

    const allContributions = [
      ...artist.albumCoverArtistContributions,
      ...artist.albumWallpaperArtistContributions,
      ...artist.albumBannerArtistContributions,
      ...artist.trackCoverArtistContributions,
    ];

    const filteredContributions =
      allContributions
        .filter(({annotation}) =>
          (query.isEditsForWiki
            ? annotation?.startsWith(`edits for wiki`)
            : !annotation?.startsWith(`edits for wiki`)));

    sortContributionsChronologically(
      filteredContributions,
      sortAlbumsTracksChronologically,
      {getThing: contrib => contrib.thing.thing});

    const contribs =
      chunkByConditions(filteredContributions, [
        ({date: date1}, {date: date2}) =>
          +date1 !== +date2,
        ({thing: {thing: thing1}}, {thing: {thing: thing2}}) =>
          (thing1.album ?? thing1) !==
          (thing2.album ?? thing2),
      ]);

    query.containingChunkIndex =
      contribs.findIndex(contribsInAlbum =>
        contribsInAlbum.some(contribForArtwork =>
          contribForArtwork.thing === artwork));

    return query;
  },

  relations: (relation, _query, artwork, _artist) => ({
    colorStyle:
      relation('generateColorStyleAttribute', artwork.thing.color),
  }),

  data: (query, artwork, _artist) => ({
    isEditsForWiki:
      query.isEditsForWiki,

    albumDirectory:
      artwork.thing.album.directory,

    containingChunkIndex:
      query.containingChunkIndex,

    thingName:
      artwork.thing.name,

    albumName:
      (artwork.thing.isTrack
        ? artwork.thing.album.name
        : null),
  }),

  slots: {
    showAlbumName: {type: 'boolean', default: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('a',
      {
        href:
          (data.isEditsForWiki
            ? `#artworks-for-wiki`
            : `#artworks`) +
          '-' +
          data.containingChunkIndex,
      },

      relations.colorStyle.slot('context', 'primary-only'),

      (slots.showAlbumName && data.albumName
        ? language.sanitize(data.albumName)
        : language.sanitize(data.thingName))),
};
