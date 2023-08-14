export default {
  contentDependencies: [
    'generateListingPage',
    'generateListRandomPageLinksGroupSection',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({groupData}) {
    return {groupData};
  },

  query(sprawl, spec) {
    const group = directory =>
      sprawl.groupData.find(group => group.directory === directory);

    return {
      spec,
      officialGroup: group('official'),
      fandomGroup: group('fandom'),
      beyondGroup: group('beyond'),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      officialSection:
        relation('generateListRandomPageLinksGroupSection', query.officialGroup),

      fandomSection:
        relation('generateListRandomPageLinksGroupSection', query.fandomGroup),

      beyondSection:
        relation('generateListRandomPageLinksGroupSection', query.beyondGroup),
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

          relations.officialSection,
          relations.fandomSection,
          relations.beyondSection,
        ]),
      ],
    });
  },
};
