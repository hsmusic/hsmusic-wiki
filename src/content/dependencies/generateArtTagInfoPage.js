import {empty, stitchArrays, unique} from '#sugar';

export default {
  sprawl: ({wikiInfo}) => ({
    enableListings: wikiInfo.enableListings,
  }),

  query(sprawl, artTag) {
    const query = {};

    query.directThings =
      artTag.directlyFeaturedInArtworks;

    query.indirectThings =
      artTag.indirectlyFeaturedInArtworks;

    query.allThings =
      unique([...query.directThings, ...query.indirectThings]);

    query.allDescendantsHaveMoreDescendants =
      artTag.directDescendantArtTags
        .every(descendant => !empty(descendant.directDescendantArtTags));

    return query;
  },

  relations: (relation, query, sprawl, artTag) => ({
    layout:
      relation('generatePageLayout'),

    navLinks:
      relation('generateArtTagNavLinks', artTag),

    sidebar:
      relation('generateArtTagSidebar', artTag),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', artTag.additionalNames),

    contentHeading:
      relation('generateContentHeading'),

    description:
      relation('transformContent', artTag.description),

    galleryLink:
      (empty(query.allThings)
        ? null
        : relation('linkArtTagGallery', artTag)),

    extraReadingLinks:
      artTag.extraReadingURLs
        .map(url => relation('linkExternal', url)),

    relatedArtTagLinks:
      artTag.relatedArtTags
        .map(({artTag}) => relation('linkArtTagInfo', artTag)),

    directAncestorLinks:
      artTag.directAncestorArtTags
        .map(artTag => relation('linkArtTagInfo', artTag)),

    directDescendantInfoLinks:
      artTag.directDescendantArtTags
        .map(artTag => relation('linkArtTagInfo', artTag)),

    directDescendantGalleryLinks:
      artTag.directDescendantArtTags.map(artTag =>
        (query.allDescendantsHaveMoreDescendants
          ? null
          : relation('linkArtTagGallery', artTag))),
  }),

  data: (query, sprawl, artTag) => ({
    enableListings:
      sprawl.enableListings,

    name:
      artTag.name,

    color:
      artTag.color,

    numArtworksIndirectly:
      query.indirectThings.length,

    numArtworksDirectly:
      query.directThings.length,

    numArtworksTotal:
      query.allThings.length,

    relatedArtTagAnnotations:
      artTag.relatedArtTags
        .map(({annotation}) => annotation),

    directDescendantTimesFeaturedTotal:
      artTag.directDescendantArtTags.map(artTag =>
        unique([
          ...artTag.directlyFeaturedInArtworks,
          ...artTag.indirectlyFeaturedInArtworks,
        ]).length),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artTagInfoPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            tag: language.sanitize(data.name),
          }),

        headingMode: 'sticky',
        color: data.color,

        additionalNames: relations.additionalNamesBox,

        mainContent: [
          html.tag('p',
            language.encapsulate(pageCapsule, 'featuredIn', capsule =>
              (data.numArtworksTotal === 0
                ? language.$(capsule, 'notFeatured')

             : data.numArtworksDirectly === 0
                ? language.$(capsule, 'indirectlyOnly', {
                    artworks:
                      language.countArtworks(data.numArtworksIndirectly, {unit: true}),
                  })

             : data.numArtworksIndirectly === 0
                ? language.$(capsule, 'directlyOnly', {
                    artworks:
                      language.countArtworks(data.numArtworksDirectly, {unit: true}),
                  })

                : language.$(capsule, 'directlyAndIndirectly', {
                    artworksDirectly:
                      language.countArtworks(data.numArtworksDirectly, {unit: true}),

                    artworksIndirectly:
                      language.countArtworks(data.numArtworksIndirectly, {unit: false}),

                    artworksTotal:
                      language.countArtworks(data.numArtworksTotal, {unit: false}),
                  })))),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$(pageCapsule, 'viewArtGallery', {
              [language.onlyIfOptions]: ['link'],

              link:
                relations.galleryLink
                  ?.slot('content', language.$(pageCapsule, 'viewArtGallery.link')),
            })),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.encapsulate(pageCapsule, 'seeAlso', capsule =>
              language.$(capsule, {
                [language.onlyIfOptions]: ['tags'],

                tags:
                  language.formatUnitList(
                    stitchArrays({
                      artTagLink: relations.relatedArtTagLinks,
                      annotation: data.relatedArtTagAnnotations,
                    }).map(({artTagLink, annotation}) =>
                        (annotation
                          ? language.$(capsule, 'tagWithAnnotation', {
                              tag: artTagLink,
                              annotation,
                            })
                          : artTagLink))),
              }))),

          html.tag('blockquote',
            {[html.onlyIfContent]: true},

            relations.description
              .slot('mode', 'multiline')),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$(pageCapsule, 'readMoreOn', {
              [language.onlyIfOptions]: ['links'],

              tag: language.sanitize(data.name),
              links: language.formatDisjunctionList(relations.extraReadingLinks),
            })),

          language.encapsulate(pageCapsule, 'descendsFromTags', listCapsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  title:
                    language.$(listCapsule, {
                      tag: language.sanitize(data.name),
                    }),
                }),

              html.tag('ul',
                {[html.onlyIfContent]: true},

                relations.directAncestorLinks
                  .map(link =>
                    html.tag('li',
                      language.$(listCapsule, 'item', {
                        tag: link,
                      })))),
            ])),

          language.encapsulate(pageCapsule, 'descendantTags', listCapsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  title:
                    language.$(listCapsule, {
                      tag: language.sanitize(data.name),
                    }),
                }),

              html.tag('ul',
                {[html.onlyIfContent]: true},

                stitchArrays({
                  infoLink: relations.directDescendantInfoLinks,
                  galleryLink: relations.directDescendantGalleryLinks,
                  timesFeaturedTotal: data.directDescendantTimesFeaturedTotal,
                }).map(({infoLink, galleryLink, timesFeaturedTotal}) =>
                    html.tag('li',
                      language.encapsulate(listCapsule, 'item', itemCapsule =>
                        language.encapsulate(itemCapsule, workingCapsule => {
                          const workingOptions = {};

                          workingOptions.tag = infoLink;

                          if (!html.isBlank(galleryLink ?? html.blank())) {
                            workingCapsule += '.withGallery';
                            workingOptions.gallery =
                              galleryLink.slot('content',
                                language.$(itemCapsule, 'withGallery.gallery'));
                          }

                          if (timesFeaturedTotal >= 1) {
                            workingCapsule += `.withTimesUsed`;
                            workingOptions.timesUsed =
                              language.countTimesFeatured(timesFeaturedTotal, {
                                unit: true,
                              });
                          }

                          return language.$(workingCapsule, workingOptions);
                        }))))),
            ])),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,

        leftSidebar:
          relations.sidebar,
      })),
};
