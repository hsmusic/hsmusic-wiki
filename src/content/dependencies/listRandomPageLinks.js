export default {
  contentDependencies: [
    'generateListingPage',
    'generateListRandomPageLinksGroupSection',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {wikiInfo};
  },

  query(sprawl, spec) {
    return {
      spec,

      groups:
        sprawl.wikiInfo.divideTrackListsByGroups,
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      groupSections:
        query.groups
          .map(group => relation('generateListRandomPageLinksGroupSection', group)),
    };
  },

  generate(relations, {html, language}) {
    return relations.page.slots({
      type: 'custom',
      content: [
        html.tag('p',
          language.$('listingPage.other.randomPages.chooseLinkLine')),

        html.tag('p',
          {class: 'js-hide-once-data'},
          language.$('listingPage.other.randomPages.dataLoadingLine')),

        html.tag('p',
          {class: 'js-show-once-data'},
          language.$('listingPage.other.randomPages.dataLoadedLine')),

        html.tag('dl', [
          html.tag('dt',
            language.$('listingPage.other.randomPages.misc')),

          html.tag('dd',
            html.tag('ul', [
              html.tag('li', [
                html.tag('a',
                  {href: '#', 'data-random': 'artist'},
                  language.$('listingPage.other.randomPages.misc.randomArtist')),

                '(' +
                html.tag('a',
                  {href: '#', 'data-random': 'artist-more-than-one-contrib'},
                  language.$('listingPage.other.randomPages.misc.atLeastTwoContributions')) +
                ')',
              ]),

              html.tag('li',
                html.tag('a',
                  {href: '#', 'data-random': 'album'},
                  language.$('listingPage.other.randomPages.misc.randomAlbumWholeSite'))),

              html.tag('li',
                html.tag('a',
                  {href: '#', 'data-random': 'track'},
                  language.$('listingPage.other.randomPages.misc.randomTrackWholeSite'))),
            ])),

          relations.groupSections,
        ]),
      ],
    });
  },
};
