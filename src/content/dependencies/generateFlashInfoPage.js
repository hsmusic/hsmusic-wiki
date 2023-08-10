import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateContributionList',
    'generateFlashCoverArtwork',
    'generateFlashNavAccent',
    'generateFlashSidebar',
    'generatePageLayout',
    'generateTrackList',
    'linkExternal',
    'linkFlashIndex',
  ],

  extraDependencies: ['html', 'language'],

  query(flash) {
    const query = {};

    if (flash.page || !empty(flash.urls)) {
      query.urls = [];

      if (flash.page) {
        query.urls.push(`https://homestuck.com/story/${flash.page}`);
      }

      if (!empty(flash.urls)) {
        query.urls.push(...flash.urls);
      }
    }

    return query;
  },

  relations(relation, query, flash) {
    const relations = {};
    const sections = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.sidebar =
      relation('generateFlashSidebar', flash);

    if (query.urls) {
      relations.externalLinks =
        query.urls.map(url => relation('linkExternal', url));
    }

    // TODO: Flashes always have cover art (#175)
    /* eslint-disable-next-line no-constant-condition */
    if (true) {
      relations.cover =
        relation('generateFlashCoverArtwork', flash);
    }

    // Section: navigation bar

    const nav = sections.nav = {};

    nav.flashIndexLink =
      relation('linkFlashIndex');

    nav.flashNavAccent =
      relation('generateFlashNavAccent', flash);

    // Section: Featured tracks

    if (!empty(flash.featuredTracks)) {
      const featuredTracks = sections.featuredTracks = {};

      featuredTracks.heading =
        relation('generateContentHeading');

      featuredTracks.list =
        relation('generateTrackList', flash.featuredTracks);
    }

    // Section: Contributors

    if (!empty(flash.contributorContribs)) {
      const contributors = sections.contributors = {};

      contributors.heading =
        relation('generateContentHeading');

      contributors.list =
        relation('generateContributionList', flash.contributorContribs);
    }

    return relations;
  },

  data(query, flash) {
    const data = {};

    data.name = flash.name;
    data.color = flash.color;
    data.date = flash.date;

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    return relations.layout.slots({
      title:
        language.$('flashPage.title', {
          flash: data.name,
        }),

      color: data.color,
      headingMode: 'sticky',

      cover:
        (relations.cover
          ? relations.cover.slots({
              alt: language.$('misc.alt.flashArt'),
            })
          : null),

      mainContent: [
        html.tag('p',
          language.$('releaseInfo.released', {
            date: language.formatDate(data.date),
          })),

        relations.externalLinks &&
          html.tag('p',
            language.$('releaseInfo.playOn', {
              links:
                language.formatDisjunctionList(
                  relations.externalLinks
                    .map(link => link.slot('mode', 'flash'))),
            })),

        sec.featuredTracks && [
          sec.featuredTracks.heading
            .slots({
              id: 'features',
              title:
                language.$('releaseInfo.tracksFeatured', {
                  flash: html.tag('i', data.name),
                }),
            }),

          sec.featuredTracks.list,
        ],

        sec.contributors && [
          sec.contributors.heading
            .slots({
              id: 'contributors',
              title: language.$('releaseInfo.contributors'),
            }),

          sec.contributors.list,
        ],
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {html: sec.nav.flashIndexLink},
        {auto: 'current'},
      ],

      navBottomRowContent:
        sec.nav.flashNavAccent.slots({
          showFlashNavigation: true,
        }),

      ...relations.sidebar,
    });
  },
};
