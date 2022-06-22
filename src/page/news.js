// News entry & index page specifications.

// Imports

import fixWS from 'fix-whitespace';

// Page exports

export function condition({wikiData}) {
    return wikiData.wikiInfo.enableNews;
}

export function targets({wikiData}) {
    return wikiData.newsData;
}

export function write(entry, {wikiData}) {
    const page = {
        type: 'page',
        path: ['newsEntry', entry.directory],
        page: ({
            generatePreviousNextLinks,
            link,
            language,
            transformMultiline,
        }) => ({
            title: language.$('newsEntryPage.title', {entry: entry.name}),

            main: {
                content: fixWS`
                    <div class="long-content">
                        <h1>${language.$('newsEntryPage.title', {entry: entry.name})}</h1>
                        <p>${language.$('newsEntryPage.published', {date: language.formatDate(entry.date)})}</p>
                        ${transformMultiline(entry.content)}
                    </div>
                `
            },

            nav: generateNewsEntryNav(entry, {
                generatePreviousNextLinks,
                link,
                language,
                wikiData
            })
        })
    };

    return [page];
}

export function writeTargetless({wikiData}) {
    const { newsData } = wikiData;

    const page = {
        type: 'page',
        path: ['newsIndex'],
        page: ({
            link,
            language,
            transformMultiline
        }) => ({
            title: language.$('newsIndex.title'),

            main: {
                content: fixWS`
                    <div class="long-content news-index">
                        <h1>${language.$('newsIndex.title')}</h1>
                        ${newsData.map(entry => fixWS`
                            <article id="${entry.directory}">
                                <h2><time>${language.formatDate(entry.date)}</time> ${link.newsEntry(entry)}</h2>
                                ${transformMultiline(entry.contentShort)}
                                ${entry.contentShort !== entry.content && `<p>${link.newsEntry(entry, {
                                    text: language.$('newsIndex.entry.viewRest')
                                })}</p>`}
                            </article>
                        `).join('\n')}
                    </div>
                `
            },

            nav: {simple: true}
        })
    };

    return [page];
}

// Utility functions

function generateNewsEntryNav(entry, {
    generatePreviousNextLinks,
    link,
    language,
    wikiData
}) {
    const { wikiInfo, newsData } = wikiData;

    // The newsData list is sorted reverse chronologically (newest ones first),
    // so the way we find next/previous entries is flipped from normal.
    const previousNextLinks = generatePreviousNextLinks(entry, {
        link, language,
        data: newsData.slice().reverse(),
        linkKey: 'newsEntry'
    });

    return {
        linkContainerClasses: ['nav-links-hierarchy'],
        links: [
            {toHome: true},
            {
                path: ['localized.newsIndex'],
                title: language.$('newsEntryPage.nav.news')
            },
            {
                html: language.$('newsEntryPage.nav.entry', {
                    date: language.formatDate(entry.date),
                    entry: link.newsEntry(entry, {class: 'current'})
                })
            },
            previousNextLinks &&
            {
                divider: false,
                html: `(${previousNextLinks})`
            }
        ]
    };
}
