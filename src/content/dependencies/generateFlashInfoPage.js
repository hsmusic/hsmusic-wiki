import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateAdditionalNamesBox',
    'generateCommentaryEntry',
    'generateContentContentHeading',
    'generateContentHeading',
    'generateContributionList',
    'generateFlashActSidebar',
    'generateFlashArtworkColumn',
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

    additionalNamesBox:
      relation('generateAdditionalNamesBox', flash.additionalNames),

    externalLinks:
      query.urls
        .map(url => relation('linkExternal', url)),

    artworkColumn:
      relation('generateFlashArtworkColumn', flash),

    contentHeading:
      relation('generateContentHeading'),

    contentContentHeading:
      relation('generateContentContentHeading', flash),

    flashActLink:
      relation('linkFlashAct', flash.act),

    flashNavAccent:
      relation('generateFlashNavAccent', flash),

    featuredTracksList:
      relation('generateTrackList', flash.featuredTracks),

    contributorContributionList:
      relation('generateContributionList', flash.contributorContribs),

    artistCommentaryEntries:
      flash.commentary
        .map(entry => relation('generateCommentaryEntry', entry)),

    creditSourceEntries:
      flash.creditingSources
        .map(entry => relation('generateCommentaryEntry', entry)),
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

        additionalNames: relations.additionalNamesBox,

        artworkColumnContent: relations.artworkColumn,

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
              !html.isBlank(relations.artistCommentaryEntries) &&
                language.encapsulate(capsule, 'readCommentary', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#artist-commentary'},
                        language.$(capsule, 'link')),
                  })),

              !html.isBlank(relations.creditSourceEntries) &&
                language.encapsulate(capsule, 'readCreditingSources', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#crediting-sources'},
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

            relations.contributorContributionList.slots({
              chronologyKind: 'flash',
            }),
          ]),

          html.tags([
            relations.contentContentHeading.clone()
              .slots({
                attributes: {id: 'artist-commentary'},
                string: 'misc.artistCommentary',
              }),

            relations.artistCommentaryEntries,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'crediting-sources'},
                title: language.$('misc.creditingSources'),
              }),

            relations.creditSourceEntries,
          ]),
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
