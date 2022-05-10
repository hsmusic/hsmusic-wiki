// Album commentary page and index specifications.

// Imports

import fixWS from 'fix-whitespace';

import {
    filterAlbumsByCommentary
} from '../util/wiki-data.js';

// Page exports

export function condition({wikiData}) {
    return filterAlbumsByCommentary(wikiData.albumData).length;
}

export function targets({wikiData}) {
    return filterAlbumsByCommentary(wikiData.albumData);
}

export function write(album, {wikiData}) {
    const { wikiInfo } = wikiData;

    const entries = [album, ...album.tracks].filter(x => x.commentary).map(x => x.commentary);
    const words = entries.join(' ').split(' ').length;

    const page = {
        type: 'page',
        path: ['albumCommentary', album.directory],
        page: ({
            getAlbumStylesheet,
            getLinkThemeString,
            getThemeString,
            link,
            strings,
            to,
            transformMultiline
        }) => ({
            title: strings('albumCommentaryPage.title', {album: album.name}),
            stylesheet: getAlbumStylesheet(album),
            theme: getThemeString(album.color),

            main: {
                content: fixWS`
                    <div class="long-content">
                        <h1>${strings('albumCommentaryPage.title', {
                            album: link.album(album)
                        })}</h1>
                        <p>${strings('albumCommentaryPage.infoLine', {
                            words: `<b>${strings.count.words(words, {unit: true})}</b>`,
                            entries: `<b>${language.countCommentaryEntries(entries.length, {unit: true})}</b>`
                        })}</p>
                        ${album.commentary && fixWS`
                            <h3>${strings('albumCommentaryPage.entry.title.albumCommentary')}</h3>
                            <blockquote>
                                ${transformMultiline(album.commentary)}
                            </blockquote>
                        `}
                        ${album.tracks.filter(t => t.commentary).map(track => fixWS`
                            <h3 id="${track.directory}">${strings('albumCommentaryPage.entry.title.trackCommentary', {
                                track: link.track(track)
                            })}</h3>
                            <blockquote style="${getLinkThemeString(track.color)}">
                                ${transformMultiline(track.commentary)}
                            </blockquote>
                        `).join('\n')}
                    </div>
                `
            },

            nav: {
                links: [
                    {toHome: true},
                    {
                        path: ['localized.commentaryIndex'],
                        title: strings('commentaryIndex.title')
                    },
                    {
                        html: strings('albumCommentaryPage.nav.album', {
                            album: link.albumCommentary(album, {class: 'current'})
                        })
                    }
                ]
            }
        })
    };

    return [page];
}

export function writeTargetless({wikiData}) {
    const data = filterAlbumsByCommentary(wikiData.albumData)
        .map(album => ({
            album,
            entries: [album, ...album.tracks].filter(x => x.commentary).map(x => x.commentary)
        }))
        .map(({ album, entries }) => ({
            album, entries,
            words: entries.join(' ').split(' ').length
        }));

    const totalEntries = data.reduce((acc, {entries}) => acc + entries.length, 0);
    const totalWords = data.reduce((acc, {words}) => acc + words, 0);

    const page = {
        type: 'page',
        path: ['commentaryIndex'],
        page: ({
            link,
            strings
        }) => ({
            title: strings('commentaryIndex.title'),

            main: {
                content: fixWS`
                    <div class="long-content">
                        <h1>${strings('commentaryIndex.title')}</h1>
                        <p>${strings('commentaryIndex.infoLine', {
                            words: `<b>${strings.count.words(totalWords, {unit: true})}</b>`,
                            entries: `<b>${language.countCommentaryEntries(totalEntries, {unit: true})}</b>`
                        })}</p>
                        <p>${strings('commentaryIndex.albumList.title')}</p>
                        <ul>
                            ${data
                                .map(({ album, entries, words }) => fixWS`
                                    <li>${strings('commentaryIndex.albumList.item', {
                                        album: link.albumCommentary(album),
                                        words: strings.count.words(words, {unit: true}),
                                        entries: language.countCommentaryEntries(entries.length, {unit: true})
                                    })}</li>
                                `)
                                .join('\n')}
                        </ul>
                    </div>
                `
            },

            nav: {simple: true}
        })
    };

    return [page];
}
