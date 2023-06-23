import {stitchArrays} from '../../util/sugar.js';
import {sortAlbumsTracksChronologically} from '../../util/wiki-data.js';

// TODO: Very awkward we have to duplicate this functionality in relations and data.
function getGalleryThings(artist) {
  const galleryThings = [...artist.albumsAsCoverArtist, ...artist.tracksAsCoverArtist];
  sortAlbumsTracksChronologically(galleryThings, {latestFirst: true});
  return galleryThings;
}

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

  relations(relation, artist) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artistNavLinks =
      relation('generateArtistNavLinks', artist);

    relations.coverGrid =
      relation('generateCoverGrid');

    const galleryThings = getGalleryThings(artist);

    relations.links =
      galleryThings.map(thing =>
        (thing.album
          ? relation('linkTrack', thing)
          : relation('linkAlbum', thing)));

    relations.images =
      galleryThings.map(thing =>
        relation('image', thing.artTags));

    return relations;
  },

  data(artist) {
    const data = {};

    data.name = artist.name;

    const galleryThings = getGalleryThings(artist);

    data.numArtworks = galleryThings.length;

    data.names =
      galleryThings.map(thing => thing.name);

    data.paths =
      galleryThings.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension]));

    return data;
  },

  generate(data, relations, {html, language}) {
    return relations.layout
      .slots({
        title:
          language.$('artistGalleryPage.title', {
            artist: data.name,
          }),

        headingMode: 'static',

        mainClasses: ['top-index'],
        mainContent: [
          html.tag('p',
            {class: 'quick-info'},
            language.$('artistGalleryPage.infoLine', {
              coverArts: language.countCoverArts(data.numArtworks, {
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
                }).map(({image, path}) =>
                    image.slot('path', path)),
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
      })
  },
}
