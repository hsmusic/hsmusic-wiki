// Art tag page specification.

// Imports

import fixWS from 'fix-whitespace';

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

    // Display things featuring this art tag in reverse chronological order,
    // sticking the most recent additions near the top!
    const thingsReversed = things.slice().reverse();

    const entries = thingsReversed.map(item => ({item}));

    const page = {
        type: 'page',
        path: ['tag', tag.directory],
        page: ({
            generatePreviousNextLinks,
            getAlbumCover,
            getGridHTML,
            getThemeString,
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
                            entries,
                            srcFn: thing => (thing.album
                                ? getTrackCover(thing)
                                : getAlbumCover(thing)),
                            linkFn: (thing, opts) => (thing.album
                                ? link.track(thing, opts)
                                : link.album(thing, opts))
                        })}
                    </div>
                `
            },

            nav: generateTagNav(tag, {
                generatePreviousNextLinks,
                link,
                strings,
                wikiData
            })
        })
    };

    return [page];
}

// Utility functions

function generateTagNav(tag, {
    generatePreviousNextLinks,
    link,
    strings,
    wikiData
}) {
    const previousNextLinks = generatePreviousNextLinks(tag, {
        data: wikiData.tagData.filter(tag => !tag.isCW),
        linkKey: 'tag'
    });

    return {
        links: [
            {toHome: true},
            wikiData.wikiInfo.features.listings &&
            {
                path: ['localized.listingIndex'],
                title: strings('listingIndex.title')
            },
            {
                html: strings('tagPage.nav.tag', {
                    tag: link.tag(tag, {class: 'current'})
                })
            },
            /*
            previousNextLinks && {
                divider: false,
                html: `(${previousNextLinks})`
            }
            */
        ]
    };
}
