// Listing page specification.
//
// The targets here are a bit different than for most pages: rather than data
// objects loaded from text files in the wiki data directory, they're hard-
// coded specifications, with various JS functions for processing wiki data
// and turning it into user-readable HTML listings.
//
// Individual listing specs are described in src/listing-spec.js, but are
// provided via wikiData like other (normal) data objects.

import {empty} from '../util/sugar.js';

import {getTotalDuration} from '../util/wiki-data.js';

export const description = `wiki-wide listing pages & index`;

export function targets({wikiData}) {
  return (
    wikiData.listingSpec
      .filter(listing => listing.contentFunction)
      .filter(listing =>
        !listing.featureFlag ||
        wikiData.wikiInfo[listing.featureFlag]));
}

export function pathsForTarget(listing) {
  return [
    {
      type: 'page',
      path: ['listing', listing.directory],
      contentFunction: {
        name: listing.contentFunction,
        args: [listing],
      },
    },
  ];
}

/*
export function condition({wikiData}) {
  return wikiData.wikiInfo.enableListings;
}

export function targets({wikiData}) {
  return wikiData.listingSpec;
}

export function write(listing, {wikiData}) {
  if (listing.condition && !listing.condition({wikiData})) {
    return null;
  }

  const {listingSpec, listingTargetSpec} = wikiData;

  const getTitleKey = l => `listingPage.${l.stringsKey}.title`;

  const data = listing.data ? listing.data({wikiData}) : null;

  // TODO: Invalid listing directories filtered here aren't warned about anywhere.
  const seeAlso =
    listing.seeAlso
     ?.map(directory => listingSpec.find(l => l.directory === directory))
      .filter(Boolean)
    ?? null;

  const currentTarget = listingTargetSpec.find(({listings}) => listings.includes(listing));
  const currentListing = listing;

  const page = {
    type: 'page',
    path: ['listing', listing.directory],
    page: (opts) => {
      const {
        getLinkThemeString,
        html,
        language,
        link,
      } = opts;

      return {
        title: language.$(getTitleKey(listing)),

        main: {
          headingMode: 'sticky',

          content: [
            currentTarget.listings.length > 1 &&
              html.tag('p',
                language.$('listingPage.listingsFor', {
                  target: currentTarget.title({language}),
                  listings:
                    language.formatUnitList(
                      currentTarget.listings.map(listing =>
                        html.tag('span',
                          {class: listing === currentListing ? 'current' : ''},
                          link.listing(listing, {
                            class: 'nowrap',
                            text: language.$(getTitleKey(listing) + '.short'),
                          })))),
                })),

            !empty(seeAlso) &&
              html.tag('p',
                language.$('listingPage.seeAlso', {
                  listings:
                    language.formatUnitList(
                      seeAlso.map(listing =>
                        link.listing(listing, {
                          text: language.$(getTitleKey(listing)),
                        }))),
                })),

            ...html.fragment(
              listing.html &&
                (listing.data
                  ? listing.html(data, opts)
                  : listing.html(opts))),

            listing.row &&
              html.tag('ul',
                data.map((item) =>
                  html.tag('li',
                    listing.row(item, opts)))),
          ],
        },

        sidebarLeft: {
          content: generateSidebarForListings(listing, {
            getLinkThemeString,
            html,
            language,
            link,
            wikiData,
          }),
        },

        nav: {
          linkContainerClasses: ['nav-links-hierarchy'],
          links: [
            {toHome: true},
            {
              path: ['localized.listingIndex'],
              title: language.$('listingIndex.title'),
            },
            {toCurrentPage: true},
          ],
        },
      };
    },
  };

  return [page];
}

export function writeTargetless({wikiData}) {
  const {albumData, trackData, wikiInfo} = wikiData;

  const totalDuration = getTotalDuration(trackData);

  const page = {
    type: 'page',
    path: ['listingIndex'],
    page: ({
      getLinkThemeString,
      html,
      language,
      link,
    }) => ({
      title: language.$('listingIndex.title'),

      main: {
        headingMode: 'static',

        content: [
          html.tag('p',
            language.$('listingIndex.infoLine', {
              wiki: wikiInfo.name,
              tracks: html.tag('b',
                language.countTracks(trackData.length, {
                  unit: true,
                })),
              albums: html.tag('b',
                language.countAlbums(albumData.length, {
                  unit: true,
                })),
              duration: html.tag('b',
                language.formatDuration(totalDuration, {
                  approximate: true,
                  unit: true,
                })),
            })),

          html.tag('hr'),

          html.tag('p',
            language.$('listingIndex.exploreList')),

          ...html.fragment(
            generateLinkIndexForListings(null, false, {
              html,
              link,
              language,
              wikiData,
            })),
        ],
      },

      sidebarLeft: {
        content: generateSidebarForListings(null, {
          getLinkThemeString,
          html,
          language,
          link,
          wikiData,
        }),
      },

      nav: {simple: true},
    }),
  };

  return [page];
}

// Utility functions

function generateSidebarForListings(currentListing, {
  getLinkThemeString,
  html,
  language,
  link,
  wikiData,
}) {
  return [
    html.tag('h1',
      link.listingIndex('', {
        text: language.$('listingIndex.title'),
      })),

    ...html.fragment(
      generateLinkIndexForListings(currentListing, true, {
        getLinkThemeString,
        html,
        language,
        link,
        wikiData,
      })),
  ];
}

function generateLinkIndexForListings(currentListing, forSidebar, {
  getLinkThemeString,
  html,
  language,
  link,
  wikiData,
}) {
  const {listingTargetSpec, wikiInfo} = wikiData;

  const filteredByCondition = listingTargetSpec
    .map(({listings, ...rest}) => ({
      ...rest,
      listings: listings.filter(({condition: c}) => !c || c({wikiData})),
    }))
    .filter(({listings}) => !empty(listings));

  const genUL = (listings) =>
    html.tag('ul',
      listings.map((listing) =>
        html.tag('li',
          {class: [listing === currentListing && 'current']},
          link.listing(listing, {
            text: language.$(`listingPage.${listing.stringsKey}.title.short`),
          }))));

  return forSidebar
    ? filteredByCondition.map(({title, listings}) =>
        html.tag('details',
          {
            open: listings.includes(currentListing),
            class: listings.includes(currentListing) && 'current',
          },
          [
            html.tag('summary',
              {style: getLinkThemeString(wikiInfo.color)},
              html.tag('span',
                {class: 'group-name'},
                title({language}))),
            genUL(listings),
          ]))
    : html.tag('dl',
        filteredByCondition.flatMap(({title, listings}) => [
          html.tag('dt',
            {class: ['content-heading']},
            title({language})),
          html.tag('dd',
            genUL(listings)),
        ]));
}
*/
