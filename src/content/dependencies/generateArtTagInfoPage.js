import {empty, unique} from '#sugar';

export default {
  contentDependencies: [
    'generateArtTagNavLinks',
    'generateContentHeading',
    'generatePageLayout',
    'linkArtTag',
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

    const info = sec.info = {};

    if (artTag.description) {
      info.description =
        relation('transformContent', artTag.description);
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
          .map(artTag => relation('linkArtTag', artTag));
    }

    if (!empty(artTag.directDescendantArtTags)) {
      const descendants = sec.descendants = {};

      descendants.heading =
        relation('generateContentHeading');

      descendants.directDescendantLinks =
        artTag.directDescendantArtTags
          .map(artTag => relation('linkArtTag', artTag));
    }

    return relations;
  },

  data(query, sprawl, artTag) {
    const data = {};

    data.enableListings = sprawl.enableListings;

    data.name = artTag.name;
    data.color = artTag.color;

    data.numArtworks = query.allThings.length;

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

    return relations.layout
      .slots({
        title:
          language.$('artTagInfoPage.title', {
            tag: data.name,
          }),

        headingMode: 'static',
        color: data.color,

        mainContent: [
          sec.info.extraReadingLinks &&
            html.tag('p',
              language.$('releaseInfo.readMoreOn', {
                links: language.formatDisjunctionList(sec.info.extraReadingLinks),
              })),

          html.tag('blockquote',
            {[html.onlyIfContent]: true},
            sec.info.description
              ?.slot('mode', 'multiline')),

          sec.ancestors && [
            sec.ancestors.heading
              .slot('title', language.$('artTagInfoPage.descendsFromTags', {
                tag: language.sanitize(data.name),
              })),

            html.tag('ul',
              sec.ancestors.directAncestorLinks
                .map(link => html.tag('li', link))),
          ],

          sec.descendants && [
            sec.descendants.heading
              .slot('title', language.$('artTagInfoPage.descendantTags', {
                tag: language.sanitize(data.name),
              })),

            html.tag('ul',
              sec.descendants.directDescendantLinks
                .map(link => html.tag('li', link))),
          ],
        ],

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,
      });
  },
};
