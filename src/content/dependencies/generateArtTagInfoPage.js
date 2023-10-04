import {unique} from '#sugar';

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

  sprawl: ({wikiInfo}) => ({
    enableListings: wikiInfo.enableListings,
  }),

  query(sprawl, artTag) {
    const directThings = artTag.directlyTaggedInThings;
    const indirectThings = artTag.indirectlyTaggedInThings;
    const allThings = unique([...directThings, ...indirectThings]);

    return {directThings, indirectThings, allThings};
  },

  relations: (relation, query, sprawl, artTag) => ({
    layout:
      relation('generatePageLayout'),

    navLinks:
      relation('generateArtTagNavLinks', artTag),

    contentHeading:
      relation('generateContentHeading'),

    description:
      relation('transformContent', artTag.description),

    extraReadingLinks:
      artTag.extraReadingURLs
        .map(url => relation('linkExternal', url)),

    directAncestorLinks:
      artTag.directAncestorArtTags
        .map(artTag => relation('linkArtTag', artTag)),

    directDescendantLinks:
      artTag.directDescendantArtTags
        .map(artTag => relation('linkArtTag', artTag)),
  }),

  data: (query, sprawl, artTag) => ({
    enableListings:
      sprawl.enableListings,

    name:
      artTag.name,

    color:
      artTag.color,

    numArtworks:
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
            tag: data.name,
          }),

        headingMode: 'static',
        color: data.color,

        mainContent: [
          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.readMoreOn', {
              [language.onlyIfOptions]: ['links'],

              links: language.formatDisjunctionList(relations.extraReadingLinks),
            })),

          html.tag('blockquote',
            {[html.onlyIfContent]: true},

            relations.description
              .slot('mode', 'multiline')),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                title:
                  language.$(pageCapsule, 'descendsFromTags', {
                    tag: language.sanitize(data.name),
                  }),
              }),

            html.tag('ul',
              {[html.onlyIfContent]: true},

              relations.directAncestorLinks
                .map(link => html.tag('li', link))),
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                title:
                  language.$(pageCapsule, 'descendantTags', {
                    tag: language.sanitize(data.name),
                  }),
              }),

            html.tag('ul',
              {[html.onlyIfContent]: true},

              relations.directDescendantLinks
                .map(link => html.tag('li', link))),
          ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,
      })),
};
