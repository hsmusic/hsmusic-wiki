import {sortAlbumsTracksChronologically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistNavLinks',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query(artist) {
    const things =
      ([
        artist.albumCoverArtistContributions,
        artist.trackCoverArtistContributions,
      ]).flat()
        .map(({thing}) => thing);

    sortAlbumsTracksChronologically(things, {
      latestFirst: true,
      getDate: thing => thing.coverArtDate ?? thing.date,
    });

    return {things};
  },

  relations(relation, query, artist) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artistNavLinks =
      relation('generateArtistNavLinks', artist);

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.links =
      query.things.map(thing =>
        (thing.album
          ? relation('linkTrack', thing)
          : relation('linkAlbum', thing)));

    relations.images =
      query.things.map(thing =>
        relation('image', thing.artTags));

    return relations;
  },

  data(query, artist) {
    const data = {};

    data.name = artist.name;

    data.numArtworks = query.things.length;

    data.names =
      query.things.map(thing => thing.name);

    data.paths =
      query.things.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension]));

    data.dimensions =
      query.things.map(thing => thing.coverArtDimensions);

    data.otherCoverArtists =
      query.things.map(thing =>
        (thing.coverArtistContribs.length > 1
          ? thing.coverArtistContribs
              .filter(({artist: otherArtist}) => otherArtist !== artist)
              .map(({artist: otherArtist}) => otherArtist.name)
          : null));

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistGalleryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            artist: data.name,
          }),

        headingMode: 'static',

        mainClasses: ['top-index'],
        mainContent: [
          html.tag('p', {class: 'quick-info'},
            language.$(pageCapsule, 'infoLine', {
              coverArts:
                language.countCoverArts(data.numArtworks, {
                  unit: true,
                }),
            })),

          relations.coverGrid
            .slots({
              links: relations.links,
              names: data.names,

              images:
                stitchArrays({
                  image: relations.images,
                  path: data.paths,
                  dimensions: data.dimensions,
                }).map(({image, path, dimensions}) =>
                    image.slots({
                      path,
                      dimensions,
                    })),

              // TODO: Can this be [language.onlyIfOptions]?
              info:
                data.otherCoverArtists.map(names =>
                  (names === null
                    ? null
                    : language.$('misc.albumGrid.details.otherCoverArtists', {
                        artists: language.formatUnitList(names),
                      }))),
            }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.artistNavLinks
            .slots({
              showExtraLinks: true,
              currentExtra: 'gallery',
            })
            .content,
      })),
}
