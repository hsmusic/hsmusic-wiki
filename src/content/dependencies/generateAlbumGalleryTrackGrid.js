import {compareArrays, stitchArrays} from '#sugar';

export default {
  query(album, label) {
    const query = {};

    query.tracks =
      album.tracks;

    query.artworks =
      query.tracks.map(track =>
        track.trackArtworks.find(artwork => artwork.label === label) ??
        null);

    const presentArtworks =
      query.artworks.filter(Boolean);

    if (presentArtworks.length > 1) {
      const allArtistArrays =
        presentArtworks
          .map(artwork => artwork.artistContribs
            .map(contrib => contrib.artist));

      const allSameArtists =
        allArtistArrays
          .slice(1)
          .every(artists => compareArrays(artists, allArtistArrays[0]));

      if (allSameArtists) {
        query.artistsForAllTrackArtworks =
          allArtistArrays[0];
      }
    }

    return query;
  },

  relations: (relation, query, _album, _label) => ({
    coverArtistsLine:
      (query.artistsForAllTrackArtworks
        ? relation('generateAlbumGalleryCoverArtistsLine',
            query.artistsForAllTrackArtworks)
        : null),

    coverGrid:
      relation('generateCoverGrid'),

    coverGridItems:
      stitchArrays({
        track: query.tracks,
        artwork: query.artworks,
      }).map(({track, artwork}) =>
          relation('generateCoverGridItem', artwork ?? track)),
  }),

  data: (query, _album, _label) => ({
    allWarnings:
      query.artworks.flatMap(artwork => artwork?.contentWarnings),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
  },

  generate: (data, relations, slots, {html}) =>
    html.tag('div', {[html.onlyIfContent]: true},
      slots.attributes,

      relations.coverArtistsLine,

      relations.coverGrid.slots({
        allWarnings: data.allWarnings,
        items: relations.coverGridItems,
      })),
};
