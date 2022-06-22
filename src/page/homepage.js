// Homepage specification.

// Imports

import fixWS from 'fix-whitespace';

import * as html from '../util/html.js';

import {
    getNewAdditions,
    getNewReleases
} from '../util/wiki-data.js';

// Page exports

export function writeTargetless({wikiData}) {
    const { newsData, staticPageData, homepageLayout, wikiInfo } = wikiData;

    const page = {
        type: 'page',
        path: ['home'],
        page: ({
            getAlbumGridHTML,
            getLinkThemeString,
            link,
            language,
            to,
            transformInline,
            transformMultiline
        }) => ({
            title: wikiInfo.name,
            showWikiNameInTitle: false,

            meta: {
                description: wikiInfo.description
            },

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${wikiInfo.name}</h1>
                    ${homepageLayout.rows?.map((row, i) => fixWS`
                        <section class="row" style="${getLinkThemeString(row.color)}">
                            <h2>${row.name}</h2>
                            ${row.type === 'albums' && fixWS`
                                <div class="grid-listing">
                                    ${getAlbumGridHTML({
                                        entries: (
                                            row.sourceGroupByRef === 'new-releases' ? getNewReleases(row.countAlbumsFromGroup, {wikiData}) :
                                            row.sourceGroupByRef === 'new-additions' ? getNewAdditions(row.countAlbumsFromGroup, {wikiData}) :
                                            ((row.sourceGroup?.albums ?? [])
                                                .slice()
                                                .reverse()
                                                .filter(album => album.isListedOnHomepage)
                                                .slice(0, row.countAlbumsFromGroup)
                                                .map(album => ({item: album})))
                                        ).concat(row.sourceAlbums.map(album => ({item: album}))),
                                        lazy: i > 0
                                    })}
                                    ${row.actionLinks?.length && fixWS`
                                        <div class="grid-actions">
                                            ${row.actionLinks.map(action => transformInline(action)
                                                .replace('<a', '<a class="box grid-item"')).join('\n')}
                                        </div>
                                    `}
                                </div>
                            `}
                        </section>
                    `).join('\n')}
                `
            },

            sidebarLeft: homepageLayout.sidebarContent && {
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
                content: (transformMultiline(homepageLayout.sidebarContent.replace('[[news]]', '__GENERATE_NEWS__'))
                    .replace('<p>__GENERATE_NEWS__</p>', wikiInfo.enableNews ? fixWS`
                        <h1>${language.$('homepage.news.title')}</h1>
                        ${newsData.slice(0, 3).map((entry, i) => html.tag('article',
                            {class: ['news-entry', i === 0 && 'first-news-entry']},
                            fixWS`
                                <h2><time>${language.formatDate(entry.date)}</time> ${link.newsEntry(entry)}</h2>
                                ${transformMultiline(entry.contentShort)}
                                ${entry.contentShort !== entry.content && link.newsEntry(entry, {
                                    text: language.$('homepage.news.entry.viewRest')
                                })}
                            `)).join('\n')}
                    ` : `<p><i>News requested in content description but this feature isn't enabled</i></p>`))
            },

            nav: {
                linkContainerClasses: ['nav-links-index'],
                links: [
                    link.home('', {text: wikiInfo.nameShort, class: 'current', to}),

                    wikiInfo.enableListings &&
                    link.listingIndex('', {text: language.$('listingIndex.title'), to}),

                    wikiInfo.enableNews &&
                    link.newsIndex('', {text: language.$('newsIndex.title'), to}),

                    wikiInfo.enableFlashesAndGames &&
                    link.flashIndex('', {text: language.$('flashIndex.title'), to}),

                    ...(staticPageData
                        .filter(page => page.showInNavigationBar)
                        .map(page => link.staticPage(page, {text: page.nameShort}))),
                ].filter(Boolean).map(html => ({html})),
            }
        })
    };

    return [page];
}
