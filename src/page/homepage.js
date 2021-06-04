// Homepage specification.

// Imports

import fixWS from 'fix-whitespace';

import find from '../util/find.js';

import * as html from '../util/html.js';

import {
    getNewAdditions,
    getNewReleases
} from '../util/wiki-data.js';

// Page exports

export function writeTargetless({wikiData}) {
    const { newsData, staticPageData, homepageInfo, wikiInfo } = wikiData;

    const page = {
        type: 'page',
        path: ['home'],
        page: ({
            getAlbumGridHTML,
            getLinkThemeString,
            link,
            strings,
            to,
            transformInline,
            transformMultiline
        }) => ({
            title: wikiInfo.name,

            meta: {
                description: wikiInfo.description
            },

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${wikiInfo.name}</h1>
                    ${homepageInfo.rows.map((row, i) => fixWS`
                        <section class="row" style="${getLinkThemeString(row.color)}">
                            <h2>${row.name}</h2>
                            ${row.type === 'albums' && fixWS`
                                <div class="grid-listing">
                                    ${getAlbumGridHTML({
                                        entries: (
                                            row.group === 'new-releases' ? getNewReleases(row.groupCount, {wikiData}) :
                                            row.group === 'new-additions' ? getNewAdditions(row.groupCount, {wikiData}) :
                                            ((find.group(row.group, {wikiData})?.albums || [])
                                                .slice()
                                                .reverse()
                                                .slice(0, row.groupCount)
                                                .map(album => ({item: album})))
                                        ).concat(row.albums
                                            .map(album => find.album(album, {wikiData}))
                                            .map(album => ({item: album}))
                                        ),
                                        lazy: i > 0
                                    })}
                                    ${row.actions.length && fixWS`
                                        <div class="grid-actions">
                                            ${row.actions.map(action => transformInline(action)
                                                .replace('<a', '<a class="box grid-item"')).join('\n')}
                                        </div>
                                    `}
                                </div>
                            `}
                        </section>
                    `).join('\n')}
                `
            },

            sidebarLeft: homepageInfo.sidebar && {
                wide: true,
                collapse: false,
                // This is a pretty filthy hack! 8ut otherwise, the [[news]] part
                // gets treated like it's a reference to the track named "news",
                // which o8viously isn't what we're going for. Gotta catch that
                // 8efore we pass it to transformMultiline, 'cuz otherwise it'll
                // get repl8ced with just the word "news" (or anything else that
                // transformMultiline does with references it can't match) -- and
                // we can't match that for replacing it with the news column!
                //
                // And no, I will not make [[news]] into part of transformMultiline
                // (even though that would 8e hilarious).
                content: (transformMultiline(homepageInfo.sidebar.replace('[[news]]', '__GENERATE_NEWS__'))
                    .replace('<p>__GENERATE_NEWS__</p>', wikiInfo.features.news ? fixWS`
                        <h1>${strings('homepage.news.title')}</h1>
                        ${newsData.slice(0, 3).map((entry, i) => html.tag('article',
                            {class: ['news-entry', i === 0 && 'first-news-entry']},
                            fixWS`
                                <h2><time>${strings.count.date(entry.date)}</time> ${link.newsEntry(entry)}</h2>
                                ${transformMultiline(entry.bodyShort)}
                                ${entry.bodyShort !== entry.body && link.newsEntry(entry, {
                                    text: strings('homepage.news.entry.viewRest')
                                })}
                            `)).join('\n')}
                    ` : `<p><i>News requested in content description but this feature isn't enabled</i></p>`))
            },

            nav: {
                content: fixWS`
                    <h2 class="dot-between-spans">
                        ${[
                            link.home('', {text: wikiInfo.shortName, class: 'current', to}),
                            wikiInfo.features.listings &&
                            link.listingIndex('', {text: strings('listingIndex.title'), to}),
                            wikiInfo.features.news &&
                            link.newsIndex('', {text: strings('newsIndex.title'), to}),
                            wikiInfo.features.flashesAndGames &&
                            link.flashIndex('', {text: strings('flashIndex.title'), to}),
                            ...staticPageData.filter(page => page.listed).map(link.staticPage)
                        ].filter(Boolean).map(link => `<span>${link}</span>`).join('\n')}
                    </h2>
                `
            }
        })
    };

    return [page];
}
