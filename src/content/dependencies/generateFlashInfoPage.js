import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateCommentarySection',
    'generateContentHeading',
    'generateContributionList',
    'generateFlashActSidebar',
    'generateFlashCoverArtwork',
    'generateFlashNavAccent',
    'generatePageLayout',
    'generateTrackList',
    'linkExternal',
    'linkFlashAct',
  ],

  extraDependencies: ['html', 'language'],

  query(flash) {
    const query = {};

    query.urls = [];

    if (flash.page) {
      query.urls.push(`https://homestuck.com/story/${flash.page}`);
    }

    if (!empty(flash.urls)) {
      query.urls.push(...flash.urls);
    }

    return query;
  },

  relations: (relation, query, flash) => ({
    layout:
      relation('generatePageLayout'),

    sidebar:
      relation('generateFlashActSidebar', flash.act, flash),

    externalLinks:
      query.urls
        .map(url => relation('linkExternal', url)),

    cover:
      relation('generateFlashCoverArtwork', flash),

    contentHeading:
      relation('generateContentHeading'),

    flashActLink:
      relation('linkFlashAct', flash.act),

    flashNavAccent:
      relation('generateFlashNavAccent', flash),

    featuredTracksList:
      relation('generateTrackList', flash.featuredTracks),

    contributorContributionList:
      relation('generateContributionList', flash.contributorContribs),

    artistCommentarySection:
      relation('generateCommentarySection', flash.commentary),
  }),

  data: (_query, flash) => ({
    name:
      flash.name,

    color:
      flash.color,

    date:
      flash.date,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('flashPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
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

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.playOn', {
              [language.onlyIfOptions]: ['links'],

              links:
                language.formatDisjunctionList(
                  relations.externalLinks
                    .map(link => link.slot('context', 'flash'))),
            })),

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            language.encapsulate('releaseInfo', capsule => [
              !html.isBlank(relations.artistCommentarySection) &&
                language.encapsulate(capsule, 'readCommentary', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#artist-commentary'},
                        language.$(capsule, 'link')),
                  })),
            ])),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'features'},
                title:
                  language.$('releaseInfo.tracksFeatured', {
                    flash: html.tag('i', data.name),
                  }),
              }),

            relations.featuredTracksList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'contributors'},
                title: language.$('releaseInfo.contributors'),
              }),

            relations.contributorContributionList,
          ]),

          relations.artistCommentarySection,
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.flashActLink.slot('color', false)},
          {auto: 'current'},
        ],

        navBottomRowContent: relations.flashNavAccent,

        leftSidebar: relations.sidebar,
      })),
};
