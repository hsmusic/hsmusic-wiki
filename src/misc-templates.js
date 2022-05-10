// Miscellaneous utility functions which are useful across page specifications.
// These are made available right on a page spec's ({wikiData, strings, ...})
// args object!

import fixWS from 'fix-whitespace';

import * as html from './util/html.js';

import {
    getColors
} from './util/colors.js';

import {
    unique
} from './util/sugar.js';

import {
    getTotalDuration,
    sortByDate
} from './util/wiki-data.js';

const BANDCAMP_DOMAINS = [
    'bc.s3m.us',
    'music.solatrux.com',
];

const MASTODON_DOMAINS = [
    'types.pl',
];

// Artist strings

export function getArtistString(artists, {
    iconifyURL, link, strings,
    showIcons = false,
    showContrib = false
}) {
    return strings.list.and(artists.map(({ who, what }) => {
        const { urls, directory, name } = who;
        return [
            link.artist(who),
            showContrib && what && `(${what})`,
            showIcons && urls?.length && `<span class="icons">(${
                strings.list.unit(urls.map(url => iconifyURL(url, {strings})))
            })</span>`
        ].filter(Boolean).join(' ');
    }));
}

// Chronology links

export function generateChronologyLinks(currentThing, {
    dateKey = 'date',
    contribKey,
    getThings,
    headingString,
    link,
    linkAnythingMan,
    strings,
    wikiData
}) {
    const { albumData } = wikiData;

    const contributions = currentThing[contribKey];
    if (!contributions) {
        return '';
    }

    if (contributions.length > 8) {
        return `<div class="chronology">${language.$('misc.chronology.seeArtistPages')}</div>`;
    }

    return contributions.map(({ who: artist }) => {
        const things = sortByDate(unique(getThings(artist)).filter(t => t[dateKey]), dateKey);
        const index = things.indexOf(currentThing);

        if (index === -1) return '';

        // TODO: This can pro8a8ly 8e made to use generatePreviousNextLinks?
        // We'd need to make generatePreviousNextLinks use toAnythingMan tho.
        const previous = things[index - 1];
        const next = things[index + 1];
        const parts = [
            previous && linkAnythingMan(previous, {
                color: false,
                text: language.$('misc.nav.previous')
            }),
            next && linkAnythingMan(next, {
                color: false,
                text: language.$('misc.nav.next')
            })
        ].filter(Boolean);

        if (!parts.length) {
            return '';
        }

        const stringOpts = {
            index: language.formatIndex(index + 1, {strings}),
            artist: link.artist(artist)
        };

        return fixWS`
            <div class="chronology">
                <span class="heading">${language.$(headingString, stringOpts)}</span>
                ${parts.length && `<span class="buttons">(${parts.join(', ')})</span>`}
            </div>
        `;
    }).filter(Boolean).join('\n');
}

// Content warning tags

export function getRevealStringFromWarnings(warnings, {strings}) {
    return language.$('misc.contentWarnings', {warnings}) + `<br><span class="reveal-interaction">${language.$('misc.contentWarnings.reveal')}</span>`
}

export function getRevealStringFromTags(tags, {strings}) {
    return tags && tags.some(tag => tag.isContentWarning) && (
        getRevealStringFromWarnings(strings.list.unit(tags.filter(tag => tag.isContentWarning).map(tag => tag.name)), {strings}));
}

// Cover art links

export function generateCoverLink({
    img, link, strings, to, wikiData,
    src,
    path,
    alt,
    tags = []
}) {
    const { wikiInfo } = wikiData;

    if (!src && path) {
        src = to(...path);
    }

    if (!src) {
        throw new Error(`Expected src or path`);
    }

    return fixWS`
        <div id="cover-art-container">
            ${img({
                src,
                alt,
                thumb: 'medium',
                id: 'cover-art',
                link: true,
                square: true,
                reveal: getRevealStringFromTags(tags, {strings})
            })}
            ${wikiInfo.enableArtTagUI && tags.filter(tag => !tag.isContentWarning).length && fixWS`
                <p class="tags">
                    ${language.$('releaseInfo.artTags')}
                    ${(tags
                        .filter(tag => !tag.isContentWarning)
                        .map(link.tag)
                        .join(',\n'))}
                </p>
            `}
        </div>
    `;
}

// CSS & color shenanigans

export function getThemeString(color, additionalVariables = []) {
    if (!color) return '';

    const { primary, dim, bg } = getColors(color);

    const variables = [
        `--primary-color: ${primary}`,
        `--dim-color: ${dim}`,
        `--bg-color: ${bg}`,
        ...additionalVariables
    ].filter(Boolean);

    if (!variables.length) return '';

    return (
        `:root {\n` +
        variables.map(line => `    ` + line + ';\n').join('') +
        `}`
    );
}
export function getAlbumStylesheet(album, {to}) {
    return [
        album.wallpaperArtistContribs.length && fixWS`
            body::before {
                background-image: url("${to('media.albumWallpaper', album.directory, album.wallpaperFileExtension)}");
                ${album.wallpaperStyle}
            }
        `,
        album.bannerStyle && fixWS`
            #banner img {
                ${album.bannerStyle}
            }
        `
    ].filter(Boolean).join('\n');
}

// Fancy lookin' links

export function fancifyURL(url, {strings, album = false} = {}) {
    let local = Symbol();
    let domain;
    try {
        domain = new URL(url).hostname;
    } catch (error) {
        // No support for relative local URLs yet, sorry! (I.e, local URLs must
        // be absolute relative to the domain name in order to work.)
        domain = local;
    }
    return fixWS`<a href="${url}" class="nowrap">${
        domain === local ? language.$('misc.external.local') :
        domain.includes('bandcamp.com') ? language.$('misc.external.bandcamp') :
        BANDCAMP_DOMAINS.includes(domain) ? language.$('misc.external.bandcamp.domain', {domain}) :
        MASTODON_DOMAINS.includes(domain) ? language.$('misc.external.mastodon.domain', {domain}) :
        domain.includes('youtu') ? (album
            ? (url.includes('list=')
                ? language.$('misc.external.youtube.playlist')
                : language.$('misc.external.youtube.fullAlbum'))
            : language.$('misc.external.youtube')) :
        domain.includes('soundcloud') ? language.$('misc.external.soundcloud') :
        domain.includes('tumblr.com') ? language.$('misc.external.tumblr') :
        domain.includes('twitter.com') ? language.$('misc.external.twitter') :
        domain.includes('deviantart.com') ? language.$('misc.external.deviantart') :
        domain.includes('wikipedia.org') ? language.$('misc.external.wikipedia') :
        domain.includes('poetryfoundation.org') ? language.$('misc.external.poetryFoundation') :
        domain.includes('instagram.com') ? language.$('misc.external.instagram') :
        domain.includes('patreon.com') ? language.$('misc.external.patreon') :
        domain
    }</a>`;
}

export function fancifyFlashURL(url, flash, {strings}) {
    const link = fancifyURL(url, {strings});
    return `<span class="nowrap">${
        url.includes('homestuck.com') ? (isNaN(Number(flash.page))
            ? language.$('misc.external.flash.homestuck.secret', {link})
            : language.$('misc.external.flash.homestuck.page', {link, page: flash.page})) :
        url.includes('bgreco.net') ? language.$('misc.external.flash.bgreco', {link}) :
        url.includes('youtu') ? language.$('misc.external.flash.youtube', {link}) :
        link
    }</span>`;
}

export function iconifyURL(url, {strings, to}) {
    const domain = new URL(url).hostname;
    const [ id, msg ] = (
        domain.includes('bandcamp.com') ? ['bandcamp', language.$('misc.external.bandcamp')] :
        BANDCAMP_DOMAINS.includes(domain) ? ['bandcamp', language.$('misc.external.bandcamp.domain', {domain})] :
        MASTODON_DOMAINS.includes(domain) ? ['mastodon', language.$('misc.external.mastodon.domain', {domain})] :
        domain.includes('youtu') ? ['youtube', language.$('misc.external.youtube')] :
        domain.includes('soundcloud') ? ['soundcloud', language.$('misc.external.soundcloud')] :
        domain.includes('tumblr.com') ? ['tumblr', language.$('misc.external.tumblr')] :
        domain.includes('twitter.com') ? ['twitter', language.$('misc.external.twitter')] :
        domain.includes('deviantart.com') ? ['deviantart', language.$('misc.external.deviantart')] :
        domain.includes('instagram.com') ? ['instagram', language.$('misc.external.bandcamp')] :
        ['globe', language.$('misc.external.domain', {domain})]
    );
    return fixWS`<a href="${url}" class="icon"><svg><title>${msg}</title><use href="${to('shared.staticFile', `icons.svg#icon-${id}`)}"></use></svg></a>`;
}

// Grids

export function getGridHTML({
    img,
    strings,

    entries,
    srcFn,
    linkFn,
    noSrcTextFn = () => '',
    altFn = () => '',
    detailsFn = null,
    lazy = true
}) {
    return entries.map(({ large, item }, i) => linkFn(item,
        {
            class: ['grid-item', 'box', large && 'large-grid-item'],
            text: fixWS`
                ${img({
                    src: srcFn(item),
                    alt: altFn(item),
                    thumb: 'small',
                    lazy: (typeof lazy === 'number' ? i >= lazy : lazy),
                    square: true,
                    reveal: getRevealStringFromTags(item.artTags, {strings}),
                    noSrcText: noSrcTextFn(item)
                })}
                <span>${item.name}</span>
                ${detailsFn && `<span>${detailsFn(item)}</span>`}
            `
        })).join('\n');
}

export function getAlbumGridHTML({
    getAlbumCover, getGridHTML, link, strings,
    details = false,
    ...props
}) {
    return getGridHTML({
        srcFn: getAlbumCover,
        linkFn: link.album,
        detailsFn: details && (album => language.$('misc.albumGrid.details', {
            tracks: language.countTracks(album.tracks.length, {unit: true}),
            time: language.formatDuration(getTotalDuration(album.tracks))
        })),
        noSrcTextFn: album => language.$('misc.albumGrid.noCoverArt', {
            album: album.name
        }),
        ...props
    });
}

export function getFlashGridHTML({
    getFlashCover, getGridHTML, link,
    ...props
}) {
    return getGridHTML({
        srcFn: getFlashCover,
        linkFn: link.flash,
        ...props
    });
}

// Nav-bar links

export function generateInfoGalleryLinks(currentThing, isGallery, {
    link, strings,
    linkKeyGallery,
    linkKeyInfo
}) {
    return [
        link[linkKeyInfo](currentThing, {
            class: isGallery ? '' : 'current',
            text: language.$('misc.nav.info')
        }),
        link[linkKeyGallery](currentThing, {
            class: isGallery ? 'current' : '',
            text: language.$('misc.nav.gallery')
        })
    ].join(', ');
}

export function generatePreviousNextLinks(current, {
    data,
    link,
    linkKey,
    strings
}) {
    const linkFn = link[linkKey];

    const index = data.indexOf(current);
    const previous = data[index - 1];
    const next = data[index + 1];

    return [
        previous && linkFn(previous, {
            attributes: {
                id: 'previous-button',
                title: previous.name
            },
            text: language.$('misc.nav.previous'),
            color: false
        }),
        next && linkFn(next, {
            attributes: {
                id: 'next-button',
                title: next.name
            },
            text: language.$('misc.nav.next'),
            color: false
        })
    ].filter(Boolean).join(', ');
}

// Footer stuff

export function getFooterLocalizationLinks(pathname, {
    languages,
    paths,
    strings,
    to
}) {
    const { toPath } = paths;
    const keySuffix = toPath[0].replace(/^localized\./, '.');
    const toArgs = toPath.slice(1);

    const links = Object.entries(languages)
        .filter(([ code ]) => code !== 'default')
        .map(([ code, strings ]) => strings)
        .sort((
            { json: { 'meta.languageName': a } },
            { json: { 'meta.languageName': b } }
        ) => a < b ? -1 : a > b ? 1 : 0)
        .map(strings => html.tag('span', html.tag('a', {
            href: (strings.baseDirectory === languages.default.baseDirectory
                ? to('localizedDefaultLanguage' + keySuffix, ...toArgs)
                : to('localizedWithBaseDirectory' + keySuffix, strings.baseDirectory, ...toArgs))
        }, strings.json['meta.languageName'])));

    return html.tag('div',
        {class: 'footer-localization-links'},
        language.$('misc.uiLanguage', {languages: links.join('\n')}));
}
