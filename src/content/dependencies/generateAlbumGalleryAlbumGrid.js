import {stitchArrays} from '#sugar';

export default {
  query: (album) => ({
    artworks:
      (album.hasCoverArt
        ? album.coverArtworks
        : []),
  }),

  relations: (relation, query, album) => ({
    coverGrid:
      relation('generateCoverGrid'),

    albumLinks:
      query.artworks.map(_artwork =>
        relation('linkAlbum', album)),

    images:
      query.artworks
        .map(artwork => relation('image', artwork)),
  }),

  data: (query, album) => ({
    albumName:
      album.name,

    artworkLabels:
      query.artworks
        .map(artwork => artwork.label),

    artworkArtists:
      query.artworks
        .map(artwork => artwork.artistContribs
          .map(contrib => contrib.artist.name)),
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
            relations.albumLinks,

          names:
            data.artworkLabels
              .map(label => label ?? data.albumName),

          images:
            stitchArrays({
              image: relations.images,
              label: data.artworkLabels,
            }).map(({image, label}) =>
                image.slots({
                  missingSourceContent:
                    language.$('misc.albumGalleryGrid.noCoverArt', {
                      name:
                        label ?? data.albumName,
                    }),
                })),

          info:
            data.artworkArtists.map(artists =>
              language.$('misc.coverGrid.details.coverArtists', {
                [language.onlyIfOptions]: ['artists'],

                artists:
                  language.formatUnitList(artists),
              })),
        }),
      ]),
};
