import {sortChronologically} from '#sort';
import {filterItemsForCarousel, getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: [
    'generateCoverCarousel',
    'generateGroupGalleryPageAlbumGrid',
    'generateGroupNavLinks',
    'generateGroupSecondaryNav',
    'generateGroupSidebar',
    'generatePageLayout',
    'generateQuickDescription',
    'image',
    'linkAlbum',
    'linkListing',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) =>
    ({enableGroupUI: wikiInfo.enableGroupUI}),

  query(_sprawl, group) {
    const query = {};

    query.allAlbums =
      sortChronologically(group.albums.slice(), {latestFirst: true});

    query.allTracks =
      query.allAlbums.flatMap((album) => album.tracks);

    query.carouselAlbums =
      filterItemsForCarousel(group.featuredAlbums);

    return query;
  },

  relations: (relation, query, sprawl, group) => ({
    layout:
      relation('generatePageLayout'),

    navLinks:
      relation('generateGroupNavLinks', group),

    secondaryNav:
      (sprawl.enableGroupUI
        ? relation('generateGroupSecondaryNav', group)
        : null),

    sidebar:
      (sprawl.enableGroupUI
        ? relation('generateGroupSidebar', group)
        : null),

    coverCarousel:
      relation('generateCoverCarousel'),

    carouselLinks:
      query.carouselAlbums
        .map(album => relation('linkAlbum', album)),

    carouselImages:
      query.carouselAlbums
        .map(album => relation('image', album.coverArtworks[0])),

    quickDescription:
      relation('generateQuickDescription', group),

    albumGrid:
      relation('generateGroupGalleryPageAlbumGrid', query.allAlbums),
  }),

  data: (query, _sprawl, group) => ({
    name:
      group.name,

    color:
      group.color,

    numAlbums:
      query.allAlbums.length,

    numTracks:
      query.allTracks.length,

    totalDuration:
      getTotalDuration(query.allTracks, {mainReleasesOnly: true}),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupGalleryPage', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title', {group: data.name}),
        headingMode: 'static',

        color: data.color,

        mainClasses: ['top-index'],
        mainContent: [
          relations.coverCarousel.slots({
            links: relations.carouselLinks,
            images: relations.carouselImages,
          }),

          relations.quickDescription,

          html.tag('p', {class: 'quick-info'},
            language.$(pageCapsule, 'infoLine', {
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

          relations.albumGrid,
        ],

        leftSidebar:
          (relations.sidebar
            ? relations.sidebar
                .slot('currentExtra', 'gallery')
                .content /* TODO: Kludge. */
            : null),

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.navLinks
            .slot('currentExtra', 'gallery')
            .content,

        secondaryNav:
          relations.secondaryNav ?? null,
      })),
};
