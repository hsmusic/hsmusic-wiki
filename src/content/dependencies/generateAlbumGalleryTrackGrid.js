import {compareArrays, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumGalleryCoverArtistsLine',
    'generateCoverGrid',
    'image',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query(album, label) {
    const query = {};

    query.artworks =
      album.tracks.map(track =>
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

  relations: (relation, query, album, _label) => ({
    coverArtistsLine:
      (query.artistsForAllTrackArtworks
        ? relation('generateAlbumGalleryCoverArtistsLine',
            query.artistsForAllTrackArtworks)
        : null),

    coverGrid:
      relation('generateCoverGrid'),

    albumLink:
      relation('linkAlbum', album),

    trackLinks:
      album.tracks
        .map(track => relation('linkTrack', track)),

    images:
      query.artworks
        .map(artwork => relation('image', artwork)),
  }),

  data: (query, album, _label) => ({
    trackNames:
      album.tracks
        .map(track => track.name),

    artworkArtists:
      query.artworks.map(artwork =>
        (query.artistsForAllTrackArtworks
          ? null
       : artwork
          ? artwork.artistContribs
              .map(contrib => contrib.artist.name)
          : null)),

    allWarnings:
      query.artworks.flatMap(artwork => artwork?.contentWarnings),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('div',
      {[html.onlyIfContent]: true},

      slots.attributes,

      [
        relations.coverArtistsLine,

        relations.coverGrid.slots({
          links:
            relations.trackLinks,

          names:
            data.trackNames,

          images:
            stitchArrays({
              image: relations.images,
              name: data.trackNames,
            }).map(({image, name}) =>
                image.slots({
                  missingSourceContent:
                    language.$('misc.albumGalleryGrid.noCoverArt', {name}),
                })),

          info:
            data.artworkArtists.map(artists =>
              language.$('misc.coverGrid.details.coverArtists', {
                [language.onlyIfOptions]: ['artists'],

                artists:
                  language.formatUnitList(artists),
              })),

          revealAllWarnings:
            data.allWarnings,
        }),
      ]),
};
