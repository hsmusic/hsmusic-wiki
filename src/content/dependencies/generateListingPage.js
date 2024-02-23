import {bindOpts, empty, stitchArrays} from '#sugar';
import {getCamelCase} from '#wiki-data';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateListingSidebar',
    'generatePageLayout',
    'linkListing',
    'linkTemplate',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  relations(relation, listing) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.sidebar =
      relation('generateListingSidebar', listing);

    relations.indexListingLink =
      relation('linkListing', listing.indexListing);

    relations.chunkHeading =
      relation('generateContentHeading');

    relations.showSkipToSectionLinkTemplate =
      relation('linkTemplate');

    if (listing.sameTargetListings.length > 1) {
      relations.sameTargetListingLinks =
        listing.sameTargetListings
          .map(listing => relation('linkListing', listing));
    } else {
      relations.sameTargetListingLinks = [];
    }

    relations.seeAlsoLinks =
      (!empty(listing.seeAlsoListings)
        ? listing.seeAlsoListings
            .map(listing => relation('linkListing', listing))
        : []);

    return relations;
  },

  data(listing) {
    const data = {};

    data.stringsKey = listing.stringsKey,
    data.target = listing.target;

    if (listing.sameTargetListings.length > 1) {
      data.sameTargetListingStringsKeys =
        listing.sameTargetListings
          .map(listing => listing.stringsKey);

      data.sameTargetListingsCurrentIndex =
        listing.sameTargetListings
          .indexOf(listing);
    }

    return data;
  },

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
        html.tag('p',
          {[html.onlyIfContent]: true},
          language.$('listingPage.listingsFor', {
            [language.onlyIfOptions]: ['listings'],

            target:
              language.$('listingPage.target', getCamelCase(data.target)),

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

        html.tag('p',
          {[html.onlyIfContent]: true},
          language.$('listingPage.seeAlso', {
            [language.onlyIfOptions]: ['listings'],
            listings:
              language.formatUnitList(relations.seeAlsoLinks),
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
                    attributes: [id && {id}],

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

      leftSidebar: relations.sidebar,
    });
  },
};
