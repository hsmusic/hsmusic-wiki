export default {
  relations: (relation, artTag) => ({
    layout:
      relation('generatePageLayout'),

    navLinks:
      relation('generateArtTagNavLinks', artTag),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', artTag),

    quickDescription:
      relation('generateQuickDescription', artTag),

    extraReadingLinks:
      artTag.extraReadingURLs
        .map(entry => relation('linkExternal', entry)),

    ancestorLinks:
      artTag.directAncestorArtTags
        .map(artTag => relation('linkArtTagGallery', artTag)),

    descendantLinks:
      artTag.directDescendantArtTags
        .map(artTag => relation('linkArtTagGallery', artTag)),

    viewSwitcher:
      relation('generateIntrapageDotSwitcher'),

    artworksView:
      relation('generateArtTagGalleryPageArtworksView', artTag),

    subtagsView:
      relation('generateArtTagGalleryPageSubtagsView', artTag),
  }),

  data: (artTag) => ({
    name: artTag.name,
    color: artTag.color,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artTagGalleryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            tag: data.name,
          }),

        headingMode: 'static',
        color: data.color,

        additionalNames: relations.additionalNamesBox,

        mainClasses: ['top-index'],
        mainContent: [
          relations.quickDescription.slots({
            extraReadingLinks: relations.extraReadingLinks,
          }),

          html.tag('p', {id: 'descends-from-line'},
            {class: 'quick-info'},
            {[html.onlyIfContent]: true},

            language.$(pageCapsule, 'descendsFrom', {
              [language.onlyIfOptions]: ['tags'],
              tags: language.formatUnitList(relations.ancestorLinks),
            })),

          html.tag('p', {id: 'descendants-line'},
            {class: 'quick-info'},
            {[html.onlyIfContent]: true},

            language.$(pageCapsule, 'descendants', {
              [language.onlyIfOptions]: ['tags'],
              tags: language.formatUnitList(relations.descendantLinks),
            })),

          language.encapsulate(pageCapsule, 'viewSwitcher', capsule =>
            html.tag('p', {class: 'gallery-view-switcher'},
              {class: ['drop', 'shiny']},

              {[html.onlyIfContent]: true},
              {[html.joinChildren]: html.tag('br')},

              [
                language.$(capsule),

                relations.viewSwitcher.slots({
                  // TODO: swap order or initial option index based on
                  // whether this tag is a collection, probably?
                  initialOptionIndex: 0,

                  titles: [
                    !html.isBlank(relations.subtagsView) &&
                      language.$(capsule, 'subtags'),

                    !html.isBlank(relations.artworksView) &&
                      language.$(capsule, 'artworks'),
                  ].filter(Boolean),

                  targetIDs: [
                    !html.isBlank(relations.subtagsView) &&
                      'art-tag-subtags-gallery',

                    !html.isBlank(relations.artworksView) &&
                      'art-tag-artworks-gallery',
                  ].filter(Boolean),
                }),
              ])),

          relations.subtagsView,

          relations.artworksView.slots({
            attributes: [
              !html.isBlank(relations.subtagsView) &&
                {style: 'display: none'},
            ],

            showTitle:
              !html.isBlank(relations.subtagsView),
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          html.resolve(
            relations.navLinks
              .slot('currentExtra', 'gallery')),
      })),
};
