import {empty, stitchArrays} from '#sugar';

import {
  filterItemsForCarousel,
  getTotalDuration,
  sortChronologically,
} from '#wiki-data';

export default {
  contentDependencies: [
    'generateCoverCarousel',
    'generateCoverGrid',
    'generateGroupNavLinks',
    'generateGroupSecondaryNav',
    'generateGroupSidebar',
    'generatePageLayout',
    'generateQuickDescription',
    'image',
    'linkAlbum',
    'linkGroup',
    'linkListing',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) =>
    ({enableGroupUI: wikiInfo.enableGroupUI}),

  relations(relation, sprawl, group) {
    const relations = {};

    const albums =
      sortChronologically(group.albums.slice(), {latestFirst: true});

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateGroupNavLinks', group);

    if (sprawl.enableGroupUI) {
      relations.secondaryNav =
        relation('generateGroupSecondaryNav', group);

      relations.sidebar =
        relation('generateGroupSidebar', group);
    }

    const carouselAlbums = filterItemsForCarousel(group.featuredAlbums);

    if (!empty(carouselAlbums)) {
      relations.coverCarousel =
        relation('generateCoverCarousel');

      relations.carouselLinks =
        carouselAlbums
          .map(album => relation('linkAlbum', album));

      relations.carouselImages =
        carouselAlbums
          .map(album => relation('image', album.artTags));
    }

    relations.quickDescription =
      relation('generateQuickDescription', group);

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.gridLinks =
      albums
        .map(album => relation('linkAlbum', album));

    relations.gridImages =
      albums.map(album =>
        (album.hasCoverArt
          ? relation('image', album.artTags)
          : relation('image')));

    return relations;
  },

  data(sprawl, group) {
    const data = {};

    data.name = group.name;
    data.color = group.color;

    const albums = sortChronologically(group.albums.slice(), {latestFirst: true});
    const tracks = albums.flatMap((album) => album.tracks);

    data.numAlbums = albums.length;
    data.numTracks = tracks.length;
    data.totalDuration = getTotalDuration(tracks, {originalReleasesOnly: true});

    data.gridNames = albums.map(album => album.name);
    data.gridDurations = albums.map(album => getTotalDuration(album.tracks));
    data.gridNumTracks = albums.map(album => album.tracks.length);

    data.gridPaths =
      albums.map(album =>
        (album.hasCoverArt
          ? ['media.albumCover', album.directory, album.coverArtFileExtension]
          : null));

    const carouselAlbums = filterItemsForCarousel(group.featuredAlbums);

    if (!empty(group.featuredAlbums)) {
      data.carouselPaths =
        carouselAlbums.map(album =>
          (album.hasCoverArt
            ? ['media.albumCover', album.directory, album.coverArtFileExtension]
            : null));
    }

    return data;
  },

  generate(data, relations, {html, language}) {
    return relations.layout
      .slots({
        title: language.$('groupGalleryPage.title', {group: data.name}),
        headingMode: 'static',

        color: data.color,

        mainClasses: ['top-index'],
        mainContent: [
          relations.coverCarousel
            ?.slots({
              links: relations.carouselLinks,
              images:
                stitchArrays({
                  image: relations.carouselImages,
                  path: data.carouselPaths,
                }).map(({image, path}) =>
                    image.slot('path', path)),
            }),

          relations.quickDescription,

          html.tag('p', {class: 'quick-info'},
            language.$('groupGalleryPage.infoLine', {
              tracks:
                html.tag('b',
                  language.countTracks(data.numTracks, {
                    unit: true,
                  })),

              albums:
                html.tag('b',
                  language.countAlbums(data.numAlbums, {
                    unit: true,
                  })),

              time:
                html.tag('b',
                  language.formatDuration(data.totalDuration, {
                    unit: true,
                  })),
            })),

          relations.coverGrid
            .slots({
              links: relations.gridLinks,
              names: data.gridNames,
              images:
                stitchArrays({
                  image: relations.gridImages,
                  path: data.gridPaths,
                  name: data.gridNames,
                }).map(({image, path, name}) =>
                    image.slots({
                      path,
                      missingSourceContent:
                        language.$('misc.albumGrid.noCoverArt', {
                          album: name,
                        }),
                    })),
              info:
                stitchArrays({
                  numTracks: data.gridNumTracks,
                  duration: data.gridDurations,
                }).map(({numTracks, duration}) =>
                    language.$('misc.albumGrid.details', {
                      tracks: language.countTracks(numTracks, {unit: true}),
                      time: language.formatDuration(duration),
                    })),
            }),
        ],

        ...
          relations.sidebar
            ?.slot('currentExtra', 'gallery')
            ?.content,

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.navLinks
            .slot('currentExtra', 'gallery')
            .content,

        secondaryNav:
          relations.secondaryNav ?? null,
      });
  },
};
