export default {
  contentDependencies: [
    'generateContentHeading',
    'generateMediumRepresentationList',
    'generatePageLayout',
    'linkMedium',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) => ({
    enableListings:
      wikiInfo.enableListings,
  }),

  relations: (relation, _sprawl, medium) => ({
    layout:
      relation('generatePageLayout'),

    contentHeading:
      relation('generateContentHeading'),

    navLink:
      relation('linkMedium', medium),

    directAncestorLinks:
      medium.directAncestorMedia
        .map(medium => relation('linkMedium', medium)),

    directDescendantLinks:
      medium.directDescendantMedia
        .map(medium => relation('linkMedium', medium)),

    representationList:
      relation('generateMediumRepresentationList', medium),
  }),

  data: (sprawl, medium) => ({
    enableListings:
      sprawl.enableListings,

    name:
      medium.name,

    date:
      medium.date,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('mediumPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {medium: data.name}),

        headingMode: 'sticky',

        mainContent: [
          language.encapsulate('releaseInfo', capsule =>
            html.tag('p',
              {[html.joinChildren]: html.tag('br')},
              {[html.onlyIfContent]: true},

              [
                language.$(capsule, 'dated', {
                  [language.onlyIfOptions]: ['date'],
                  date: language.formatDate(data.date),
                }),
              ])),

          language.encapsulate(pageCapsule, 'descendsFromMedia', listCapsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  title:
                    language.$(listCapsule, {medium: data.name}),
                }),

              html.tag('ul',
                {[html.onlyIfContent]: true},

                relations.directAncestorLinks.map(link =>
                  html.tag('li',
                    language.$(listCapsule, 'item', {medium: link})))),
            ])),

          language.encapsulate(pageCapsule, 'descendantMedia', listCapsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  title:
                    language.$(listCapsule, {medium: data.name}),
                }),

              html.tag('ul',
                {[html.onlyIfContent]: true},

                relations.directDescendantLinks.map(link =>
                  html.tag('li',
                    language.$(listCapsule, 'item', {medium: link})))),
            ])),

          language.encapsulate('releaseInfo.musicThatRepresents', capsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'offically-represented-by'},

                  title:
                    language.$(capsule, {medium: data.name}),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                }),

              relations.representationList,
            ])),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},

          data.enableListings &&
            {
              path: ['localized.listingIndex'],
              title: language.$('listingIndex.title'),
            },

          {
            html:
              language.$(pageCapsule, 'nav.medium', {
                medium: relations.navLink,
              }),
          },
        ],
      })),
};
