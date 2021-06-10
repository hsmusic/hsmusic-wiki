// Group page specifications.

// Imports

import fixWS from 'fix-whitespace';

import {
    UNRELEASED_TRACKS_DIRECTORY
} from '../util/magic-constants.js';

import * as html from '../util/html.js';

import {
    getTotalDuration,
    sortByDate
} from '../util/wiki-data.js';

// Page exports

export function targets({wikiData}) {
    return wikiData.groupData;
}

export function write(group, {wikiData}) {
    const { listingSpec, wikiInfo } = wikiData;

    const releasedAlbums = group.albums.filter(album => album.directory !== UNRELEASED_TRACKS_DIRECTORY);
    const releasedTracks = releasedAlbums.flatMap(album => album.tracks);
    const totalDuration = getTotalDuration(releasedTracks);

    const albumLines = group.albums.map(album => ({
        album,
        otherGroup: album.groups.find(g => g !== group)
    }));

    const infoPage = {
        type: 'page',
        path: ['groupInfo', group.directory],
        page: ({
            generateInfoGalleryLinks,
            generatePreviousNextLinks,
            getLinkThemeString,
            getThemeString,
            fancifyURL,
            link,
            strings,
            transformMultiline
        }) => ({
            title: strings('groupInfoPage.title', {group: group.name}),
            theme: getThemeString(group.color),

            main: {
                content: fixWS`
                    <h1>${strings('groupInfoPage.title', {group: group.name})}</h1>
                    ${group.urls.length && `<p>${
                        strings('releaseInfo.visitOn', {
                            links: strings.list.or(group.urls.map(url => fancifyURL(url, {strings})))
                        })
                    }</p>`}
                    <blockquote>
                        ${transformMultiline(group.description)}
                    </blockquote>
                    <h2>${strings('groupInfoPage.albumList.title')}</h2>
                    <p>${
                        strings('groupInfoPage.viewAlbumGallery', {
                            link: link.groupGallery(group, {
                                text: strings('groupInfoPage.viewAlbumGallery.link')
                            })
                        })
                    }</p>
                    <ul>
                        ${albumLines.map(({ album, otherGroup }) => {
                            const item = strings('groupInfoPage.albumList.item', {
                                year: album.date.getFullYear(),
                                album: link.album(album)
                            });
                            return html.tag('li', (otherGroup
                                ? strings('groupInfoPage.albumList.item.withAccent', {
                                    item,
                                    accent: html.tag('span',
                                        {class: 'other-group-accent'},
                                        strings('groupInfoPage.albumList.item.otherGroupAccent', {
                                            group: link.groupInfo(otherGroup, {color: false})
                                        }))
                                })
                                : item));
                        }).join('\n')}
                    </ul>
                `
            },

            sidebarLeft: generateGroupSidebar(group, false, {
                getLinkThemeString,
                link,
                strings,
                wikiData
            }),

            nav: generateGroupNav(group, false, {
                generateInfoGalleryLinks,
                generatePreviousNextLinks,
                link,
                strings,
                wikiData
            })
        })
    };

    const galleryPage = {
        type: 'page',
        path: ['groupGallery', group.directory],
        page: ({
            generateInfoGalleryLinks,
            generatePreviousNextLinks,
            getAlbumGridHTML,
            getLinkThemeString,
            getThemeString,
            link,
            strings
        }) => ({
            title: strings('groupGalleryPage.title', {group: group.name}),
            theme: getThemeString(group.color),

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${strings('groupGalleryPage.title', {group: group.name})}</h1>
                    <p class="quick-info">${
                        strings('groupGalleryPage.infoLine', {
                            tracks: `<b>${strings.count.tracks(releasedTracks.length, {unit: true})}</b>`,
                            albums: `<b>${strings.count.albums(releasedAlbums.length, {unit: true})}</b>`,
                            time: `<b>${strings.count.duration(totalDuration, {unit: true})}</b>`
                        })
                    }</p>
                    ${wikiInfo.features.groupUI && wikiInfo.features.listings && html.tag('p',
                        {class: 'quick-info'},
                        strings('groupGalleryPage.anotherGroupLine', {
                            link: link.listing(listingSpec.find(l => l.directory === 'groups/by-category'), {
                                text: strings('groupGalleryPage.anotherGroupLine.link')
                            })
                        })
                    )}
                    <div class="grid-listing">
                        ${getAlbumGridHTML({
                            entries: sortByDate(group.albums.map(item => ({item}))).reverse(),
                            details: true
                        })}
                    </div>
                `
            },

            sidebarLeft: generateGroupSidebar(group, true, {
                getLinkThemeString,
                link,
                strings,
                wikiData
            }),

            nav: generateGroupNav(group, true, {
                generateInfoGalleryLinks,
                generatePreviousNextLinks,
                link,
                strings,
                wikiData
            })
        })
    };

    return [infoPage, galleryPage];
}

// Utility functions

function generateGroupSidebar(currentGroup, isGallery, {
    getLinkThemeString,
    link,
    strings,
    wikiData
}) {
    const { groupCategoryData, wikiInfo } = wikiData;

    if (!wikiInfo.features.groupUI) {
        return null;
    }

    const linkKey = isGallery ? 'groupGallery' : 'groupInfo';

    return {
        content: fixWS`
            <h1>${strings('groupSidebar.title')}</h1>
            ${groupCategoryData.map(category =>
                html.tag('details', {
                    open: category === currentGroup.category,
                    class: category === currentGroup.category && 'current'
                }, [
                    html.tag('summary',
                        {style: getLinkThemeString(category.color)},
                        strings('groupSidebar.groupList.category', {
                            category: `<span class="group-name">${category.name}</span>`
                        })),
                    html.tag('ul',
                        category.groups.map(group => html.tag('li',
                            {
                                class: group === currentGroup && 'current',
                                style: getLinkThemeString(group.color)
                            },
                            strings('groupSidebar.groupList.item', {
                                group: link[linkKey](group)
                            }))))
                ])).join('\n')}
            </dl>
        `
    };
}

function generateGroupNav(currentGroup, isGallery, {
    generateInfoGalleryLinks,
    generatePreviousNextLinks,
    link,
    strings,
    wikiData
}) {
    const { groupData, wikiInfo } = wikiData;

    if (!wikiInfo.features.groupUI) {
        return {simple: true};
    }

    const urlKey = isGallery ? 'localized.groupGallery' : 'localized.groupInfo';
    const linkKey = isGallery ? 'groupGallery' : 'groupInfo';

    const infoGalleryLinks = generateInfoGalleryLinks(currentGroup, isGallery, {
        linkKeyGallery: 'groupGallery',
        linkKeyInfo: 'groupInfo'
    });

    const previousNextLinks = generatePreviousNextLinks(currentGroup, {
        data: groupData,
        linkKey
    });

    return {
        links: [
            {toHome: true},
            wikiInfo.features.listings &&
            {
                path: ['localized.listingIndex'],
                title: strings('listingIndex.title')
            },
            {
                html: strings('groupPage.nav.group', {
                    group: link[linkKey](currentGroup, {class: 'current'})
                })
            },
            {
                divider: false,
                html: (previousNextLinks
                    ? `(${infoGalleryLinks}; ${previousNextLinks})`
                    : `(${previousNextLinks})`)
            }
        ]
    };
}
