import {empty, unique} from '#sugar';

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

  sprawl({wikiInfo}) {
    return {
      enableListings: wikiInfo.enableListings,
    };
  },

  query(sprawl, artTag) {
    const directThings = artTag.directlyTaggedInThings;
    const indirectThings = artTag.indirectlyTaggedInThings;
    const allThings = unique([...directThings, ...indirectThings]);

    return {directThings, indirectThings, allThings};
  },

  relations(relation, query, sprawl, artTag) {
    const relations = {};
    const sec = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateArtTagNavLinks', artTag);

    relations.sidebar =
      relation('generateArtTagSidebar', artTag);

    const info = sec.info = {};

    if (artTag.description) {
      info.description =
        relation('transformContent', artTag.description);
    }

    if (!empty(query.allThings)) {
      info.galleryLink =
        relation('linkArtTagGallery', artTag);
    }

    if (!empty(artTag.extraReadingURLs)) {
      info.extraReadingLinks =
        artTag.extraReadingURLs
          .map(url => relation('linkExternal', url));
    }

    if (!empty(artTag.directAncestorArtTags)) {
      const ancestors = sec.ancestors = {};

      ancestors.heading =
        relation('generateContentHeading');

      ancestors.directAncestorLinks =
        artTag.directAncestorArtTags
          .map(artTag => relation('linkArtTagInfo', artTag));
    }

    if (!empty(artTag.directDescendantArtTags)) {
      const descendants = sec.descendants = {};

      descendants.heading =
        relation('generateContentHeading');

      descendants.directDescendantLinks =
        artTag.directDescendantArtTags
          .map(artTag => relation('linkArtTagInfo', artTag));
    }

    return relations;
  },

  data(query, sprawl, artTag) {
    const data = {};

    data.enableListings = sprawl.enableListings;

    data.name = artTag.name;
    data.color = artTag.color;

    data.numArtworksIndirectly = query.indirectThings.length;
    data.numArtworksDirectly = query.directThings.length;
    data.numArtworksTotal = query.allThings.length;

    data.names =
      query.allThings.map(thing => thing.name);

    data.paths =
      query.allThings.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension]));

    data.onlyFeaturedIndirectly =
      query.allThings.map(thing =>
        !query.directThings.includes(thing));

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;
    const nameOption = {tag: language.sanitize(data.name)};

    return relations.layout
      .slots({
        title: language.$('artTagInfoPage.title', nameOption),
        headingMode: 'sticky',
        color: data.color,

        mainContent: [
          html.tag('p',
            (data.numArtworksTotal === 0
              ? language.$('artTagInfoPage.featuredIn.notFeatured')
           : data.numArtworksDirectly === 0
              ? language.$('artTagInfoPage.featuredIn.indirectlyOnly', {
                  artworks: language.countArtworks(data.numArtworksIndirectly, {unit: true}),
                })
           : data.numArtworksIndirectly === 0
              ? language.$('artTagInfoPage.featuredIn.directlyOnly', {
                  artworks: language.countArtworks(data.numArtworksDirectly, {unit: true}),
                })
              : language.$('artTagInfoPage.featuredIn.directlyAndIndirectly', {
                  artworksDirectly: language.countArtworks(data.numArtworksDirectly, {unit: true}),
                  artworksIndirectly: language.countArtworks(data.numArtworksIndirectly, {unit: false}),
                  artworksTotal: language.countArtworks(data.numArtworksTotal, {unit: false}),
                }))),

          sec.info.galleryLink &&
            html.tag('p',
              language.$('artTagInfoPage.viewArtGallery', {
                link:
                  sec.info.galleryLink
                    .slot('content', language.$('artTagInfoPage.viewArtGallery.link')),
              })),

          html.tag('blockquote',
            {[html.onlyIfContent]: true},
            sec.info.description
              ?.slot('mode', 'multiline')),

          sec.info.extraReadingLinks &&
            html.tag('p',
              language.$('artTagInfoPage.readMoreOn', {
                ...nameOption,
                links: language.formatDisjunctionList(sec.info.extraReadingLinks),
              })),

          sec.ancestors && [
            sec.ancestors.heading
              .slot('title',
                language.$('artTagInfoPage.descendsFromTags', nameOption)),

            html.tag('ul',
              sec.ancestors.directAncestorLinks
                .map(link => html.tag('li', link))),
          ],

          sec.descendants && [
            sec.descendants.heading
              .slot('title',
                language.$('artTagInfoPage.descendantTags', nameOption)),

            html.tag('ul',
              sec.descendants.directDescendantLinks
                .map(link => html.tag('li', link))),
          ],
        ],

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,

        ...relations.sidebar,
      });
  },
};
