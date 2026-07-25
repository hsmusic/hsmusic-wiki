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

    query.hasIndirectDescendants =
      artTag.directDescendantArtTags
        .some(descendant => !empty(descendant.directDescendantArtTags));

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
        .map(entry => relation('linkExternal', entry)),

    relatedArtTagLinks:
      artTag.relatedArtTags
        .map(({artTag}) => relation('linkArtTagInfo', artTag)),

    directAncestorLinks:
      artTag.directAncestorArtTags
        .map(artTag => relation('linkArtTagInfo', artTag)),

    showMoreLessSwitcher:
      relation('generateShowMoreLessSwitcher'),

    directDescendantListItems:
      artTag.directDescendantArtTags
        .map(descendant =>
          relation('generateArtTagInfoPageDescendantListItem',
            descendant,
            artTag)),

    indirectDescendantListItems:
      artTag.directDescendantArtTags
        .map(descendant => descendant.directDescendantArtTags
          .map(descendantSquared =>
            relation('generateArtTagInfoPageDescendantListItem',
              descendantSquared,
              descendant))),
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

    hasIndirectDescendants:
      query.hasIndirectDescendants,

    relatedArtTagAnnotations:
      artTag.relatedArtTags
        .map(({annotation}) => annotation),
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
              relations.contentHeading.clone().slots({
                title:
                  language.$(listCapsule, {
                    tag: language.sanitize(data.name),
                  }),

                stickyTitle:
                  language.$(listCapsule, 'sticky'),
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
              relations.contentHeading.clone().slots({
                title:
                  language.encapsulate(listCapsule, workingCapsule => {
                    const workingOptions = {
                      tag: language.sanitize(data.name),
                    };

                    if (data.hasIndirectDescendants) {
                      workingCapsule += '.withShowMoreLessSwitcher';
                      workingOptions.showMoreLessSwitcher =
                        relations.showMoreLessSwitcher.slots({
                          memorableID: 'indirect-descendant-tags',

                          switcherString: listCapsule + '.showMoreLessSwitcher',
                          showMoreString: listCapsule + '.showMoreLessSwitcher.showMore',
                          showLessString: listCapsule + '.showMoreLessSwitcher.showLess',

                          showMoreTargetID: 'indirect-descendants-list',
                          showLessTargetID: 'direct-descendants-list',
                        });
                    }

                    return language.$(workingCapsule, workingOptions);
                  }),

                stickyTitle:
                  language.$(listCapsule, 'sticky'),
              }),

              html.tag('ul', {id: 'direct-descendants-list'},
                {[html.onlyIfContent]: true},

                relations.directDescendantListItems.map(item =>
                  item.slots({
                    showTimesFeatured: true,
                    showGalleryLink: 'auto',
                  }))),

              html.tag('dl', {id: 'indirect-descendants-list'},
                {[html.onlyIfContent]: true},
                {style: 'display: none'},

                stitchArrays({
                  directItem: relations.directDescendantListItems,
                  indirectItems: relations.indirectDescendantListItems,
                }).map(({directItem, indirectItems}) => [
                    html.tag('dt',
                      html.resolve(
                        directItem.slots({
                          showTimesFeatured: true,
                          showGalleryLink: 'auto',
                        }),
                        {normalize: 'tag'})
                          .content),

                    html.tag('dd',
                      html.tag('ul',
                        indirectItems.map(item =>
                          item.slots({
                            showTimesFeatured: false,
                            showGalleryLink: false,
                          })))),
                  ])),
            ])),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,

        leftSidebar:
          relations.sidebar,
      })),
};
