import {bindOpts, empty, stitchArrays} from '#sugar';
import {getListingStringsKey, getIndexListingForScope} from '#wiki-data';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateListingSidebar',
    'generatePageLayout',
    'linkListing',
    'linkTemplate',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({listingSpec}, listing) => ({
    indexListing:
      getIndexListingForScope(listing.scope, {listingSpec}),
  }),

  relations(relation, sprawl, listing) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.sidebar =
      relation('generateListingSidebar', listing);

    if (sprawl.indexListing) {
      relations.indexListingLink =
        relation('linkListing', sprawl.indexListing);
    }

    relations.chunkHeading =
      relation('generateContentHeading');

    relations.showSkipToSectionLinkTemplate =
      relation('linkTemplate');

    if (listing.target.listings.length > 1) {
      relations.sameTargetListingLinks =
        listing.target.listings
          .map(listing => relation('linkListing', listing));
    }

    if (!empty(listing.seeAlso)) {
      relations.seeAlsoLinks =
        listing.seeAlso
          .map(listing => relation('linkListing', listing));
    }

    return relations;
  },

  data: (sprawl, listing) => ({
    stringsKey: getListingStringsKey(listing),

    targetStringsKey: listing.target.stringsKey,

    sameTargetListingStringsKeys:
      listing.target.listings
        .map(listing => getListingStringsKey(listing)),

    sameTargetListingsCurrentIndex:
      listing.target.listings
        .indexOf(listing),
  }),

  slots: {
    type: {
      validate: v => v.is('rows', 'chunks', 'custom'),
    },

    rows: {
      validate: v => v.strictArrayOf(v.isObject),
    },

    rowAttributes: {
      validate: v => v.strictArrayOf(v.optional(v.isObject))
    },

    chunkTitles: {
      validate: v => v.strictArrayOf(v.isObject),
    },

    chunkTitleAccents: {
      validate: v => v.strictArrayOf(v.optional(v.isObject)),
    },

    chunkRows: {
      validate: v => v.strictArrayOf(v.isObject),
    },

    chunkRowAttributes: {
      validate: v => v.strictArrayOf(v.optional(v.isObject)),
    },

    showSkipToSection: {
      type: 'boolean',
      default: false,
    },

    chunkIDs: {
      validate: v => v.strictArrayOf(v.optional(v.isString)),
    },

    listStyle: {
      validate: v => v.is('ordered', 'unordered'),
      default: 'unordered',
    },

    content: {
      type: 'html',
      mutable: false,
    },
  },

  generate(data, relations, slots, {html, language}) {
    function formatListingString({
      context,
      provided = {},
    }) {
      const parts = [data.stringsKey];

      if (Array.isArray(context)) {
        parts.push(...context);
      } else {
        parts.push(context);
      }

      if (provided.stringsKey) {
        parts.push(provided.stringsKey);
      }

      const options = {...provided};
      delete options.stringsKey;

      return language.formatString(...parts, options);
    }

    const formatRow = ({context, row, attributes}) =>
      (attributes?.href
        ? html.tag('li',
            html.tag('a',
              attributes,
              formatListingString({
                context,
                provided: row,
              })))
        : html.tag('li',
            attributes,
            formatListingString({
              context,
              provided: row,
            })));

    const formatRowList = ({context, rows, rowAttributes}) =>
      html.tag(
        (slots.listStyle === 'ordered' ? 'ol' : 'ul'),
        stitchArrays({
          row: rows,
          attributes: rowAttributes ?? rows.map(() => null),
        }).map(
          bindOpts(formatRow, {
            [bindOpts.bindIndex]: 0,
            context,
          })));

    return relations.layout.slots({
      title: formatListingString({context: 'title'}),

      headingMode: 'sticky',

      mainContent: [
        relations.sameTargetListingLinks &&
          html.tag('p',
            language.$('listingPage.listingsFor', {
              target:
                language.$('listingPage.target', data.targetStringsKey),

              listings:
                language.formatUnitList(
                  stitchArrays({
                    link: relations.sameTargetListingLinks,
                    stringsKey: data.sameTargetListingStringsKeys,
                  }).map(({link, stringsKey}, index) =>
                      html.tag('span',
                        index === data.sameTargetListingsCurrentIndex &&
                          {class: 'current'},

                        link.slots({
                          attributes: {class: 'nowrap'},
                          content: language.$(stringsKey, 'title.short'),
                        })))),
            })),

        relations.seeAlsoLinks &&
          html.tag('p',
            language.$('listingPage.seeAlso', {
              listings: language.formatUnitList(relations.seeAlsoLinks),
            })),

        slots.content,

        slots.type === 'rows' &&
          formatRowList({
            context: 'item',
            rows: slots.rows,
            rowAttributes: slots.rowAttributes,
          }),

        slots.type === 'chunks' &&
          html.tag('dl', [
            slots.showSkipToSection && [
              html.tag('dt',
                language.$('listingPage.skipToSection')),

              html.tag('dd',
                html.tag('ul',
                  stitchArrays({
                    title: slots.chunkTitles,
                    id: slots.chunkIDs,
                  }).filter(({id}) => id)
                    .map(({title, id}) =>
                      html.tag('li',
                        relations.showSkipToSectionLinkTemplate
                          .clone()
                          .slots({
                            hash: id,
                            content:
                              html.normalize(
                                formatListingString({
                                  context: 'chunk.title',
                                  provided: title,
                                }).toString()
                                  .replace(/:$/, '')),
                          }))))),
            ],

            stitchArrays({
              title: slots.chunkTitles,
              titleAccent: slots.chunkTitleAccents,
              id: slots.chunkIDs,
              rows: slots.chunkRows,
              rowAttributes: slots.chunkRowAttributes,
            }).map(({title, titleAccent, id, rows, rowAttributes}) => [
                relations.chunkHeading
                  .clone()
                  .slots({
                    tag: 'dt',
                    id,

                    title:
                      formatListingString({
                        context: 'chunk.title',
                        provided: title,
                      }),

                    accent:
                      titleAccent &&
                        formatListingString({
                          context: ['chunk.title', title.stringsKey, 'accent'],
                          provided: titleAccent,
                        }),
                  }),

                html.tag('dd',
                  formatRowList({
                    context: 'chunk.item',
                    rows,
                    rowAttributes,
                  })),
              ]),
          ]),
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {html: relations.indexListingLink},
        {auto: 'current'},
      ],

      ...relations.sidebar,
    });
  },
};
