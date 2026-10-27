import {sortChronologically} from '#sort';

export default {
  sprawl: ({wikiInfo}) =>
    ({enableGroupUI: wikiInfo.enableGroupUI}),

  query(_sprawl, group) {
    const query = {};

    query.allAlbums =
      sortChronologically(group.albums.slice(), {latestFirst: true});

    query.allTracks =
      query.allAlbums.flatMap((album) => album.tracks);

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
      (group.carousel
        ? relation('generateCoverCarousel', group.carousel)
        : null),

    quickDescription:
      relation('generateQuickDescription', group),

    musicViewSwitcher:
      relation('generateIntrapageDotSwitcher'),

    musicBySeriesView:
      relation('generateGroupGalleryPageMusicBySeriesView', group),

    musicByDateView:
      relation('generateGroupGalleryPageMusicByDateView', group),
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
      group.duration,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupGalleryPage', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title', {group: data.name}),
        headingMode: 'static',

        color: data.color,

        mainClasses: ['top-index'],
        mainContent: [
          relations.coverCarousel,
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
                    showUnit: true,
                    showZero: true,
                  })),
            })),

          ([
            !html.isBlank(relations.musicBySeriesView),
            !html.isBlank(relations.musicByDateView)
          ]).filter(Boolean).length > 1 &&

            language.encapsulate(pageCapsule, 'musicViewSwitcher', capsule =>
              html.tag('p', {class: 'gallery-view-switcher'},
                {class: ['drop', 'shiny']},

                {[html.onlyIfContent]: true},
                {[html.joinChildren]: html.tag('br')},

                [
                  language.$(capsule),

                  relations.musicViewSwitcher.slots({
                    initialOptionIndex: 0,

                    titles: [
                      !html.isBlank(relations.musicByDateView) &&
                        language.$(capsule, 'byDate'),

                      !html.isBlank(relations.musicBySeriesView) &&
                        language.$(capsule, 'bySeries'),
                    ].filter(Boolean),

                    targetIDs: [
                      !html.isBlank(relations.musicByDateView) &&
                        'group-music-gallery-by-date',

                      !html.isBlank(relations.musicBySeriesView) &&
                        'group-music-gallery-by-series',
                    ].filter(Boolean),
                  }),
                ])),

          relations.musicByDateView.slots({
            showTitle:
              !html.isBlank(relations.musicBySeriesView),
          }),

          relations.musicBySeriesView.slots({
            attributes: [
              !html.isBlank(relations.musicBySeriesView) &&
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
