// Art tag page specification.

// Imports

import fixWS from 'fix-whitespace';

import {
    getThemeString
} from '../util/colors.js';

// Page exports

export function condition({wikiData}) {
    return wikiData.wikiInfo.features.artTagUI;
}

export function targets({wikiData}) {
    return wikiData.tagData.filter(tag => !tag.isCW);
}

export function write(tag, {wikiData}) {
    const { wikiInfo } = wikiData;
    const { things } = tag;

    const page = {
        type: 'page',
        path: ['tag', tag.directory],
        page: ({
            getAlbumCover,
            getGridHTML,
            getTrackCover,
            link,
            strings,
            to
        }) => ({
            title: strings('tagPage.title', {tag: tag.name}),
            theme: getThemeString(tag.color),

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${strings('tagPage.title', {tag: tag.name})}</h1>
                    <p class="quick-info">${strings('tagPage.infoLine', {
                        coverArts: strings.count.coverArts(things.length, {unit: true})
                    })}</p>
                    <div class="grid-listing">
                        ${getGridHTML({
                            entries: things.map(item => ({item})),
                            srcFn: thing => (thing.album
                                ? getTrackCover(thing)
                                : getAlbumCover(thing)),
                            hrefFn: thing => (thing.album
                                ? to('localized.track', thing.directory)
                                : to('localized.album', thing.directory))
                        })}
                    </div>
                `
            },

            nav: {
                links: [
                    {toHome: true},
                    wikiInfo.features.listings &&
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

