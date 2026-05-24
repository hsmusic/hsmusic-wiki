import {empty} from '#sugar';

function checkInterrupted(which, relations, {html}) {
  if (
    !html.isBlank(relations.contributorContributionList) ||
    !html.isBlank(relations.featuredTracksList)
  ) return true;

  if (which === 'crediting-sources') {
    if (!html.isBlank(relations.artistCommentaryEntries)) return true;
  }

  return false;
}

export default {
  query(flash) {
    const query = {};

    query.urls = [];

    if (flash.page) {
      query.urls.push({
        url: `https://homestuck.com/story/${flash.page}`,
        annotation: null,
      });
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
        .map(entry => relation('linkExternal', entry)),

    artworkColumn:
      relation('generateFlashArtworkColumn', flash),

    contentHeading:
      relation('generateContentHeading'),

    commentaryContentHeading:
      relation('generateCommentaryContentHeading', flash),

    readCommentaryLine:
      relation('generateReadCommentaryLine', flash),

    flashIndexLink:
      relation('linkFlashIndex'),

    flashActLink:
      relation('linkFlashAct', flash.act),

    flashNavAccent:
      relation('generateFlashNavAccent', flash),

    featuredTracksList:
      relation('generateTrackList', flash.featuredTracks, []),

    contributorContributionList:
      relation('generateContributionList', flash.contributorContribs),

    artistCommentaryEntries:
      flash.commentary
        .map(entry => relation('generateContentEntry', entry)),

    creditingSourcesSection:
      relation('generateCollapsedContentEntrySection',
        flash.creditingSources,
        flash),
  }),

  data: (_query, flash) => ({
    name:
      flash.name,

    color:
      flash.color,

    date:
      flash.date,

    flashActShortName:
      flash.act.shortName,
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
              checkInterrupted('commentary', relations, {html}) &&
                relations.readCommentaryLine,

              checkInterrupted('crediting-sources', relations, {html}) &&
              !html.isBlank(relations.creditingSourcesSection) &&
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
            relations.commentaryContentHeading,
            relations.artistCommentaryEntries,
          ]),

          relations.creditingSourcesSection.slots({
            id: 'crediting-sources',
            string: 'misc.creditingSources',
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.flashIndexLink},

          {
            html:
              relations.flashActLink.slot('content',
                language.sanitize(data.flashActShortName)),
          },

          {auto: 'current'},
        ],

        navBottomRowContent: relations.flashNavAccent,

        leftSidebar: relations.sidebar,
      })),
};
