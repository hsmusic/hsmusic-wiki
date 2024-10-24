import {empty, stitchArrays, unique} from '#sugar';

export default {
  contentDependencies: [
    'generateArtTagNavLinks',
    'generateArtTagSidebar',
    'generateContentHeading',
    'generatePageLayout',
    'linkArtTagGallery',
    'linkArtTagInfo',
    'linkExternal',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) => ({
    enableListings: wikiInfo.enableListings,
  }),

  query(sprawl, artTag) {
    const query = {};

    query.directThings =
      artTag.directlyTaggedInThings;

    query.indirectThings =
      artTag.indirectlyTaggedInThings;

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
          : relation('linkArtTagInfo', artTag))),
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

    names:
      query.allThings.map(thing => thing.name),

    paths:
      query.allThings.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension])),

    onlyFeaturedIndirectly:
      query.allThings.map(thing =>
        !query.directThings.includes(thing)),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artTagInfoPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            tag: language.sanitize(data.name),
          }),

        headingMode: 'static',
        color: data.color,

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
                }).map(({infoLink, galleryLink}) =>
                    html.tag('li',
                      language.encapsulate(listCapsule, 'item', itemCapsule =>
                        language.encapsulate(itemCapsule, workingCapsule => {
                          const workingOptions = {};

                          workingOptions.tag = infoLink;

                          if (!html.isBlank(galleryLink)) {
                            workingCapsule += '.withGallery';
                            workingOptions.gallery =
                              galleryLink.slot('content',
                                language.$(itemCapsule, 'withGallery.gallery'));
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
