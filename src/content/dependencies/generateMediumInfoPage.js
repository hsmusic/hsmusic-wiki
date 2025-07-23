export default {
  contentDependencies: [
    'generateContentHeading',
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
  }),

  data: (sprawl, medium) => ({
    enableListings:
      sprawl.enableListings,

    name:
      medium.name,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('mediumPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            medium: language.sanitize(data.name),
          }),

        headingMode: 'sticky',

        mainContent: [
          language.encapsulate(pageCapsule, 'descendsFromMedia', listCapsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  title:
                    language.$(listCapsule, {
                      medium: language.sanitize(data.name),
                    }),
                }),

              html.tag('ul',
                {[html.onlyIfContent]: true},

                relations.directAncestorLinks.map(link =>
                  html.tag('li',
                    language.$(listCapsule, 'item', {
                      medium: link,
                    })))),
            ])),

          language.encapsulate(pageCapsule, 'descendantMedia', listCapsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  title:
                    language.$(listCapsule, {
                      medium: language.sanitize(data.name),
                    }),
                }),

              html.tag('ul',
                {[html.onlyIfContent]: true},

                relations.directDescendantLinks.map(link =>
                  html.tag('li',
                    language.$(listCapsule, 'item', {
                      medium: link,
                    })))),
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
