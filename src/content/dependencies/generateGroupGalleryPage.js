import {
  getTotalDuration,
  sortChronologically,
} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateColorStyleRules',
    'generateCoverGrid',
    'generateGroupNavLinks',
    'generateGroupSidebar',
    'generatePageLayout',
    'image',
    'linkAlbum',
    'linkListing',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({listingSpec, wikiInfo}) {
    const sprawl = {};
    sprawl.enableGroupUI = wikiInfo.enableGroupUI;

    if (wikiInfo.enableListings && wikiInfo.enableGroupUI) {
      sprawl.groupsByCategoryListing =
        listingSpec
          .find(l => l.directory === 'groups/by-category');
    }

    return sprawl;
  },

  relations(relation, sprawl, group) {
    const relations = {};

    const albums =
      sortChronologically(group.albums.slice(), {latestFirst: true});

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateGroupNavLinks', group);

    if (sprawl.enableGroupUI) {
      relations.sidebar =
        relation('generateGroupSidebar', group);
    }

    relations.colorStyleRules =
      relation('generateColorStyleRules', group.color);

    if (sprawl.groupsByCategoryListing) {
      relations.groupListingLink =
        relation('linkListing', sprawl.groupsByCategoryListing);
    }

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.links =
      albums
        .map(album => relation('linkAlbum', album));

    relations.images =
      albums.map(album =>
        (album.hasCoverArt
          ? relation('image', album.artTags)
          : relation('iamge')));

    return relations;
  },

  data(sprawl, group) {
    const albums =
      sortChronologically(group.albums.slice(), {latestFirst: true});

    const tracks = albums.flatMap((album) => album.tracks);
    const totalDuration = getTotalDuration(tracks, {originalReleasesOnly: true});

    return {
      name: group.name,

      numAlbums: albums.length,
      numTracks: tracks.length,
      totalDuration,

      names: albums.map(album => album.name),
      paths: albums.map(album =>
        (album.hasCoverArt
          ? ['media.albumCover', album.directory, album.coverArtFileExtension]
          : null)),
    };
  },

  generate(data, relations, {html, language}) {
    return relations.layout
      .slots({
        title: language.$('groupGalleryPage.title', {group: data.name}),
        headingMode: 'static',

        colorStyleRules: [relations.colorStyleRules],

        mainClasses: ['top-index'],
        mainContent: [
          /*
          getCarouselHTML({
            items: group.featuredAlbums.slice(0, 12 + 1),
            srcFn: getAlbumCover,
            linkFn: link.album,
          }),
          */

          html.tag('p',
            {class: 'quick-info'},
            language.$('groupGalleryPage.infoLine', {
              tracks: html.tag('b',
                language.countTracks(data.numTracks, {
                  unit: true,
                })),
              albums: html.tag('b',
                language.countAlbums(data.numAlbums, {
                  unit: true,
                })),
              time: html.tag('b',
                language.formatDuration(data.totalDuration, {
                  unit: true,
                })),
            })),

          relations.groupListingLink &&
            html.tag('p',
              {class: 'quick-info'},
              language.$('groupGalleryPage.anotherGroupLine', {
                link:
                  relations.groupListingLink
                    .slot('content', language.$('groupGalleryPage.anotherGroupLine.link')),
              })),

          relations.coverGrid
            .slots({
              links: relations.links,
              names: data.names,
              images:
                relations.images.map((image, i) =>
                  image.slots({
                    path: data.paths[i],
                    missingSourceContent:
                      language.$('misc.albumGrid.noCoverArt', {
                        album: data.names[i],
                      }),
                  })),
            }),
        ],

        ...(
          relations.sidebar
            ?.slot('currentExtra', 'gallery')
            ?.content
          ?? {}),

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.navLinks
            .slot('currentExtra', 'gallery')
            .content,
      });
  },
};
