// Listing page specification.
//
// The targets here are a bit different than for most pages: rather than data
// objects loaded from text files in the wiki data directory, they're hard-
// coded specifications, with various JS functions for processing wiki data
// and turning it into user-readable HTML listings.
//
// Individual listing specs are described in src/listing-spec.js, but are
// provided via wikiData like other (normal) data objects.

// Imports

import fixWS from 'fix-whitespace';

import * as html from '../util/html.js';

import {
    getTotalDuration
} from '../util/wiki-data.js';

// Page exports

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

    const { wikiInfo } = wikiData;

    const data = (listing.data
        ? listing.data({wikiData})
        : null);

    const page = {
        type: 'page',
        path: ['listing', listing.directory],
        page: opts => {
            const { getLinkThemeString, link, strings } = opts;
            const titleKey = `listingPage.${listing.stringsKey}.title`;

            return {
                title: strings(titleKey),

                main: {
                    content: fixWS`
                        <h1>${strings(titleKey)}</h1>
                        ${listing.html && (listing.data
                            ? listing.html(data, opts)
                            : listing.html(opts))}
                        ${listing.row && fixWS`
                            <ul>
                                ${(data
                                    .map(item => listing.row(item, opts))
                                    .map(row => `<li>${row}</li>`)
                                    .join('\n'))}
                            </ul>
                        `}
                    `
                },

                sidebarLeft: {
                    content: generateSidebarForListings(listing, {
                        getLinkThemeString,
                        link,
                        strings,
                        wikiData
                    })
                },

                nav: {
                    links: [
                        {toHome: true},
                        {
                            path: ['localized.listingIndex'],
                            title: strings('listingIndex.title')
                        },
                        {toCurrentPage: true}
                    ]
                }
            };
        }
    };

    return [page];
}

export function writeTargetless({wikiData}) {
    const { albumData, trackData, wikiInfo } = wikiData;

    const totalDuration = getTotalDuration(trackData);

    const page = {
        type: 'page',
        path: ['listingIndex'],
        page: ({
            getLinkThemeString,
            strings,
            link
        }) => ({
            title: strings('listingIndex.title'),

            main: {
                content: fixWS`
                    <h1>${strings('listingIndex.title')}</h1>
                    <p>${strings('listingIndex.infoLine', {
                        wiki: wikiInfo.name,
                        tracks: `<b>${strings.count.tracks(trackData.length, {unit: true})}</b>`,
                        albums: `<b>${strings.count.albums(albumData.length, {unit: true})}</b>`,
                        duration: `<b>${strings.count.duration(totalDuration, {approximate: true, unit: true})}</b>`
                    })}</p>
                    <hr>
                    <p>${strings('listingIndex.exploreList')}</p>
                    ${generateLinkIndexForListings(null, false, {link, strings, wikiData})}
                `
            },

            sidebarLeft: {
                content: generateSidebarForListings(null, {
                    getLinkThemeString,
                    link,
                    strings,
                    wikiData
                })
            },

            nav: {simple: true}
        })
    };

    return [page];
};

// Utility functions

function generateSidebarForListings(currentListing, {
    getLinkThemeString,
    link,
    strings,
    wikiData
}) {
    return fixWS`
        <h1>${link.listingIndex('', {text: strings('listingIndex.title')})}</h1>
        ${generateLinkIndexForListings(currentListing, true, {
            getLinkThemeString,
            link,
            strings,
            wikiData
        })}
    `;
}

function generateLinkIndexForListings(currentListing, forSidebar, {
    getLinkThemeString,
    link,
    strings,
    wikiData
}) {
    const { listingTargetSpec, wikiInfo } = wikiData;

    const filteredByCondition = listingTargetSpec
        .map(({ listings, ...rest }) => ({
            ...rest,
            listings: listings.filter(({ condition: c }) => !c || c({wikiData}))
        }))
        .filter(({ listings }) => listings.length > 0);

    const genUL = listings => html.tag('ul',
        listings.map(listing => html.tag('li',
            {class: [listing === currentListing && 'current']},
            link.listing(listing, {text: strings(`listingPage.${listing.stringsKey}.title.short`)})
        )));

    if (forSidebar) {
        return filteredByCondition.map(({ title, listings }) =>
            html.tag('details', {
                open: !forSidebar || listings.includes(currentListing),
                class: listings.includes(currentListing) && 'current'
            }, [
                html.tag('summary',
                    {style: getLinkThemeString(wikiInfo.color)},
                    html.tag('span',
                        {class: 'group-name'},
                        title({strings}))),
                genUL(listings)
            ])).join('\n');
    } else {
        return html.tag('dl',
            filteredByCondition.flatMap(({ title, listings }) => [
                html.tag('dt', title({strings})),
                html.tag('dd', genUL(listings))
            ]));
    }
}
