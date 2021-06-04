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
    UNRELEASED_TRACKS_DIRECTORY
} from '../util/magic-constants.js';

import {
    getTotalDuration
} from '../util/wiki-data.js';

// Page exports

export function condition({wikiData}) {
    return wikiData.wikiInfo.features.listings;
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
        page: ({
            link,
            strings
        }) => ({
            title: listing.title({strings}),

            main: {
                content: fixWS`
                    <h1>${listing.title({strings})}</h1>
                    ${listing.html && (listing.data
                        ? listing.html(data, {link, strings})
                        : listing.html({link, strings}))}
                    ${listing.row && fixWS`
                        <ul>
                            ${(data
                                .map(item => listing.row(item, {link, strings}))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul>
                    `}
                `
            },

            sidebarLeft: {
                content: generateSidebarForListings(listing, {link, strings, wikiData})
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
        })
    };

    return [page];
}

export function writeTargetless({wikiData}) {
    const { albumData, trackData, wikiInfo } = wikiData;

    const releasedTracks = trackData.filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY);
    const releasedAlbums = albumData.filter(album => album.directory !== UNRELEASED_TRACKS_DIRECTORY);
    const duration = getTotalDuration(releasedTracks);

    const page = {
        type: 'page',
        path: ['listingIndex'],
        page: ({
            strings,
            link
        }) => ({
            title: strings('listingIndex.title'),

            main: {
                content: fixWS`
                    <h1>${strings('listingIndex.title')}</h1>
                    <p>${strings('listingIndex.infoLine', {
                        wiki: wikiInfo.name,
                        tracks: `<b>${strings.count.tracks(releasedTracks.length, {unit: true})}</b>`,
                        albums: `<b>${strings.count.albums(releasedAlbums.length, {unit: true})}</b>`,
                        duration: `<b>${strings.count.duration(duration, {approximate: true, unit: true})}</b>`
                    })}</p>
                    <hr>
                    <p>${strings('listingIndex.exploreList')}</p>
                    ${generateLinkIndexForListings(null, {link, strings, wikiData})}
                `
            },

            sidebarLeft: {
                content: generateSidebarForListings(null, {link, strings, wikiData})
            },

            nav: {simple: true}
        })
    };

    return [page];
};

// Utility functions

function generateSidebarForListings(currentListing, {link, strings, wikiData}) {
    return fixWS`
        <h1>${link.listingIndex('', {text: strings('listingIndex.title')})}</h1>
        ${generateLinkIndexForListings(currentListing, {link, strings, wikiData})}
    `;
}

function generateLinkIndexForListings(currentListing, {link, strings, wikiData}) {
    const { listingSpec } = wikiData;

    return fixWS`
        <ul>
            ${(listingSpec
                .filter(({ condition }) => !condition || condition({wikiData}))
                .map(listing => html.tag('li',
                    {class: [listing === currentListing && 'current']},
                    link.listing(listing, {text: listing.title({strings})})
                ))
                .join('\n'))}
        </ul>
    `;
}
