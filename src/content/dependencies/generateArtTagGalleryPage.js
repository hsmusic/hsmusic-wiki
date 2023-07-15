import {stitchArrays} from '../../util/sugar.js';
import {sortAlbumsTracksChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateColorStyleRules',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkAlbum',
    'linkArtTag',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableListings: wikiInfo.enableListings,
    };
  },

  query(sprawl, tag) {
    const things = tag.taggedInThings.slice();

    sortAlbumsTracksChronologically(things, {
      getDate: thing => thing.coverArtDate,
      latestFirst: true,
    });

    return {things};
  },

  relations(relation, query, sprawl, tag) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.colorStyleRules =
      relation('generateColorStyleRules', tag.color);

    relations.artTagMainLink =
      relation('linkArtTag', tag);

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

  data(query, sprawl, artist) {
    const data = {};

    data.enableListings = sprawl.enableListings;

    data.name = artist.name;

    data.numArtworks = query.things.length;

    data.names =
      query.things.map(thing => thing.name);

    data.paths =
      query.things.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension]));

    return data;
  },

  generate(data, relations, {html, language}) {
    return relations.layout
      .slots({
        title:
          language.$('tagPage.title', {
            tag: data.name,
          }),

        headingMode: 'static',

        colorStyleRules: [relations.colorStyleRules],

        mainClasses: ['top-index'],
        mainContent: [
          html.tag('p',
            {class: 'quick-info'},
            language.$('tagPage.infoLine', {
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
        navLinks: [
          {auto: 'home'},

          data.enableListings &&
            {
              path: ['localized.listingIndex'],
              title: language.$('listingIndex.title'),
            },

          {
            html:
              language.$('tagPage.nav.tag', {
                tag: relations.artTagMainLink,
              }),
          },
        ],
      });
  },
};
