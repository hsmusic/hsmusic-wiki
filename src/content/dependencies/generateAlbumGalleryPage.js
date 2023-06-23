import {stitchArrays} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAlbumGalleryInfoLine',
    'generateAlbumNavAccent',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', album);

    relations.colorStyleRules =
      relation('generateColorStyleRules', album.color);

    relations.albumLink =
      relation('linkAlbum', album);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    relations.infoLine =
      relation('generateAlbumGalleryInfoLine', album);

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.links =
      album.tracks.map(track =>
        relation('linkTrack', track));

    relations.images =
      album.tracks.map(track =>
        (track.hasUniqueCoverArt
          ? relation('image', track.artTags)
          : relation('image')));

    return relations;
  },

  data(album) {
    const data = {};

    data.name = album.name;

    data.names =
      album.tracks.map(track => track.name);

    data.paths =
      album.tracks.map(track =>
        (track.hasUniqueCoverArt
          ? ['media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension]
          : null));

    return data;
  },

  generate(data, relations, {language}) {
    return relations.layout
      .slots({
        title:
          language.$('albumGalleryPage.title', {
            album: data.name,
          }),

        headingMode: 'static',

        colorStyleRules: [relations.colorStyleRules],
        additionalStyleRules: [relations.albumStyleRules],

        mainClasses: ['top-index'],
        mainContent: [
          relations.infoLine,

          relations.coverGrid
            .slots({
              links: relations.links,
              names: data.names,
              images:
                stitchArrays({
                  image: relations.images,
                  path: data.paths,
                  name: data.names,
                }).map(({image, path, name}) =>
                    image.slots({
                      path,
                      missingSourceContent:
                        language.$('misc.albumGalleryGrid.noCoverArt', {name}),
                    })),
            }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {
            html:
              relations.albumLink
                .slot('attributes', {class: 'current'}),
            accent:
              relations.albumNavAccent.slots({
                showTrackNavigation: false,
                showExtraLinks: true,
                currentExtra: 'gallery',
              }),
          },
        ],
      });
  },
};
