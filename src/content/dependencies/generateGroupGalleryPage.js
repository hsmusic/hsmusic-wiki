import {sortChronologically} from '#sort';
import {filterItemsForCarousel, getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: [
    'generateCoverCarousel',
    'generateGroupGalleryPageAlbumsByDateView',
    'generateGroupGalleryPageAlbumsBySeriesView',
    'generateGroupNavLinks',
    'generateGroupSecondaryNav',
    'generateIntrapageDotSwitcher',
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

    albumViewSwitcher:
      relation('generateIntrapageDotSwitcher'),

    albumsBySeriesView:
      relation('generateGroupGalleryPageAlbumsBySeriesView', group),

    albumsByDateView:
      relation('generateGroupGalleryPageAlbumsByDateView', group),
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

          ([
            !html.isBlank(relations.albumsBySeriesView),
            !html.isBlank(relations.albumsByDateView)
          ]).filter(Boolean).length > 1 &&

            language.encapsulate(pageCapsule, 'albumViewSwitcher', capsule =>
              html.tag('p', {class: 'gallery-view-switcher'},
                {[html.onlyIfContent]: true},
                {[html.joinChildren]: html.tag('br')},

                [
                  language.$(capsule),

                  relations.albumViewSwitcher.slots({
                    initialOptionIndex: 0,

                    titles: [
                      !html.isBlank(relations.albumsByDateView) &&
                        language.$(capsule, 'byDate'),

                      !html.isBlank(relations.albumsBySeriesView) &&
                        language.$(capsule, 'bySeries'),
                    ].filter(Boolean),

                    targetIDs: [
                      !html.isBlank(relations.albumsByDateView) &&
                        'group-album-gallery-by-date',

                      !html.isBlank(relations.albumsBySeriesView) &&
                        'group-album-gallery-by-series',
                    ].filter(Boolean),
                  }),
                ])),

          /*
          data.trackGridLabels.some(value => value !== null) &&
            html.tag('p', {class: 'gallery-set-switcher'},
              language.encapsulate(pageCapsule, 'setSwitcher', switcherCapsule =>
                language.$(switcherCapsule, {
                  sets:
                    relations.setSwitcher.slots({
                      initialOptionIndex: 0,

                      titles:
                        data.trackGridLabels.map(label =>
                          label ??
                          language.$(switcherCapsule, 'unlabeledSet')),

                      targetIDs:
                        data.trackGridIDs,
                    }),
                }))),
          */

          relations.albumsByDateView,

          relations.albumsBySeriesView.slots({
            attributes: [
              !html.isBlank(relations.albumsBySeriesView) &&
                {style: 'display: none'},
            ],
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.navLinks
            .slot('currentExtra', 'gallery')
            .content,

        secondaryNav: relations.secondaryNav,
      })),
};
