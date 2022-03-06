// Album page specification.

// Imports

import fixWS from 'fix-whitespace';

import * as html from '../util/html.js';

import {
    bindOpts
} from '../util/sugar.js';

import {
    getAlbumCover,
    getAlbumListTag,
    getTotalDuration
} from '../util/wiki-data.js';

// Page exports

export function targets({wikiData}) {
    return wikiData.albumData;
}

export function write(album, {wikiData}) {
    const { wikiInfo } = wikiData;

    const unbound_trackToListItem = (track, {
        getArtistString,
        getLinkThemeString,
        link,
        strings
    }) => {
        const itemOpts = {
            duration: strings.count.duration(track.duration),
            track: link.track(track)
        };
        return `<li style="${getLinkThemeString(track.color)}">${
            (track.artists === album.artists
                ? strings('trackList.item.withDuration', itemOpts)
                : strings('trackList.item.withDuration.withArtists', {
                    ...itemOpts,
                    by: `<span class="by">${
                        strings('trackList.item.withArtists.by', {
                            artists: getArtistString(track.artists)
                        })
                    }</span>`
                }))
        }</li>`;
    };

    const commentaryEntries = [album, ...album.tracks].filter(x => x.commentary).length;
    const albumDuration = getTotalDuration(album.tracks);

    const listTag = getAlbumListTag(album);

    const data = {
        type: 'data',
        path: ['album', album.directory],
        data: ({
            serializeContribs,
            serializeCover,
            serializeGroupsForAlbum,
            serializeLink
        }) => ({
            name: album.name,
            directory: album.directory,
            dates: {
                released: album.date,
                trackArtAdded: album.trackArtDate,
                coverArtAdded: album.coverArtDate,
                addedToWiki: album.dateAdded
            },
            duration: albumDuration,
            color: album.color,
            cover: serializeCover(album, getAlbumCover),
            artistContribs: serializeContribs(album.artistContribs),
            coverArtistContribs: serializeContribs(album.coverArtistContribs),
            wallpaperArtistContribs: serializeContribs(album.wallpaperArtistContribs),
            bannerArtistContribs: serializeContribs(album.bannerArtistContribs),
            groups: serializeGroupsForAlbum(album),
            trackGroups: album.trackGroups?.map(trackGroup => ({
                name: trackGroup.name,
                color: trackGroup.color,
                tracks: trackGroup.tracks.map(track => track.directory)
            })),
            tracks: album.tracks.map(track => ({
                link: serializeLink(track),
                duration: track.duration
            }))
        })
    };

    const page = {
        type: 'page',
        path: ['album', album.directory],
        page: ({
            fancifyURL,
            generateChronologyLinks,
            generateCoverLink,
            getAlbumCover,
            getAlbumStylesheet,
            getArtistString,
            getLinkThemeString,
            getThemeString,
            link,
            strings,
            transformMultiline
        }) => {
            const trackToListItem = bindOpts(unbound_trackToListItem, {
                getArtistString,
                getLinkThemeString,
                link,
                strings
            });

            return {
                title: strings('albumPage.title', {album: album.name}),
                stylesheet: getAlbumStylesheet(album),
                theme: getThemeString(album.color, [
                    `--album-directory: ${album.directory}`
                ]),

                banner: album.bannerArtistContribs.length && {
                    dimensions: album.bannerDimensions,
                    path: ['media.albumBanner', album.directory, album.bannerFileExtension],
                    alt: strings('misc.alt.albumBanner'),
                    position: 'top'
                },

                main: {
                    content: fixWS`
                        ${generateCoverLink({
                            src: getAlbumCover(album),
                            alt: strings('misc.alt.albumCover'),
                            tags: album.artTags
                        })}
                        <h1>${strings('albumPage.title', {album: album.name})}</h1>
                        <p>
                            ${[
                                album.artistContribs.length && strings('releaseInfo.by', {
                                    artists: getArtistString(album.artistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                album.coverArtistContribs.length && strings('releaseInfo.coverArtBy', {
                                    artists: getArtistString(album.coverArtistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                album.wallpaperArtistContribs.length && strings('releaseInfo.wallpaperArtBy', {
                                    artists: getArtistString(album.wallpaperArtistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                album.bannerArtistContribs.length && strings('releaseInfo.bannerArtBy', {
                                    artists: getArtistString(album.bannerArtistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                strings('releaseInfo.released', {
                                    date: strings.count.date(album.date)
                                }),
                                (album.coverArtDate &&
                                    +album.coverArtDate !== +album.date &&
                                    strings('releaseInfo.artReleased', {
                                        date: strings.count.date(album.coverArtDate)
                                    })),
                                strings('releaseInfo.duration', {
                                    duration: strings.count.duration(albumDuration, {approximate: album.tracks.length > 1})
                                })
                            ].filter(Boolean).join('<br>\n')}
                        </p>
                        ${commentaryEntries && `<p>${
                            strings('releaseInfo.viewCommentary', {
                                link: link.albumCommentary(album, {
                                    text: strings('releaseInfo.viewCommentary.link')
                                })
                            })
                        }</p>`}
                        ${album.urls?.length && `<p>${
                            strings('releaseInfo.listenOn', {
                                links: strings.list.or(album.urls.map(url => fancifyURL(url, {album: true})))
                            })
                        }</p>`}
                        ${album.trackGroups && (album.trackGroups.length > 1 || !album.trackGroups[0].isDefaultTrackGroup) ? fixWS`
                            <dl class="album-group-list">
                                ${album.trackGroups.map(({ name, color, startIndex, tracks }) => fixWS`
                                    <dt>${
                                        strings('trackList.group', {
                                            duration: strings.count.duration(getTotalDuration(tracks), {approximate: tracks.length > 1}),
                                            group: name
                                        })
                                    }</dt>
                                    <dd><${listTag === 'ol' ? `ol start="${startIndex + 1}"` : listTag}>
                                        ${tracks.map(trackToListItem).join('\n')}
                                    </${listTag}></dd>
                                `).join('\n')}
                            </dl>
                        ` : fixWS`
                            <${listTag}>
                                ${album.tracks.map(trackToListItem).join('\n')}
                            </${listTag}>
                        `}
                        <p>
                            ${[
                                strings('releaseInfo.addedToWiki', {
                                    date: strings.count.date(album.dateAdded)
                                })
                            ].filter(Boolean).join('<br>\n')}
                        </p>
                        ${album.commentary && fixWS`
                            <p>${strings('releaseInfo.artistCommentary')}</p>
                            <blockquote>
                                ${transformMultiline(album.commentary)}
                            </blockquote>
                        `}
                    `
                },

                sidebarLeft: generateAlbumSidebar(album, null, {
                    fancifyURL,
                    getLinkThemeString,
                    link,
                    strings,
                    transformMultiline,
                    wikiData
                }),

                nav: {
                    links: [
                        {toHome: true},
                        {
                            html: strings('albumPage.nav.album', {
                                album: link.album(album, {class: 'current'})
                            })
                        },
                        album.tracks.length > 1 &&
                        {
                            divider: false,
                            html: generateAlbumNavLinks(album, null, {strings})
                        }
                    ],
                    content: html.tag('div', generateAlbumChronologyLinks(album, null, {generateChronologyLinks}))
                }
            };
        }
    };

    return [page, data];
}

// Utility functions

export function generateAlbumSidebar(album, currentTrack, {
    fancifyURL,
    getLinkThemeString,
    link,
    strings,
    transformMultiline,
    wikiData
}) {
    const listTag = getAlbumListTag(album);

    /*
    const trackGroups = album.trackGroups || [{
        name: strings('albumSidebar.trackList.fallbackGroupName'),
        color: album.color,
        startIndex: 0,
        tracks: album.tracks
    }];
    */

    const { trackGroups } = album;

    const trackToListItem = track => html.tag('li',
        {class: track === currentTrack && 'current'},
        strings('albumSidebar.trackList.item', {
            track: link.track(track)
        }));

    const nameOrDefault = (isDefaultTrackGroup, name) =>
        (isDefaultTrackGroup
            ? strings('albumSidebar.trackList.fallbackGroupName')
            : name);

    const trackListPart = fixWS`
        <h1>${link.album(album)}</h1>
        ${trackGroups.map(({ name, color, startIndex, tracks, isDefaultTrackGroup }) =>
            html.tag('details', {
                // Leave side8ar track groups collapsed on al8um homepage,
                // since there's already a view of all the groups expanded
                // in the main content area.
                open: currentTrack && tracks.includes(currentTrack),
                class: tracks.includes(currentTrack) && 'current'
            }, [
                html.tag('summary',
                    {style: getLinkThemeString(color)},
                    (listTag === 'ol'
                        ? strings('albumSidebar.trackList.group.withRange', {
                            group: `<span class="group-name">${nameOrDefault(isDefaultTrackGroup, name)}</span>`,
                            range: `${startIndex + 1}&ndash;${startIndex + tracks.length}`
                        })
                        : strings('albumSidebar.trackList.group', {
                            group: `<span class="group-name">${nameOrDefault(isDefaultTrackGroup, name)}</span>`
                        }))
                ),
                fixWS`
                    <${listTag === 'ol' ? `ol start="${startIndex + 1}"` : listTag}>
                        ${tracks.map(trackToListItem).join('\n')}
                    </${listTag}>
                `
            ])).join('\n')}
    `;

    const { groups } = album;

    const groupParts = groups.map(group => {
        const index = group.albums.indexOf(album);
        const next = group.albums[index + 1];
        const previous = group.albums[index - 1];
        return {group, next, previous};
    }).map(({group, next, previous}) => fixWS`
        <h1>${
            strings('albumSidebar.groupBox.title', {
                group: link.groupInfo(group)
            })
        }</h1>
        ${!currentTrack && transformMultiline(group.descriptionShort)}
        ${group.urls?.length && `<p>${
            strings('releaseInfo.visitOn', {
                links: strings.list.or(group.urls.map(url => fancifyURL(url)))
            })
        }</p>`}
        ${!currentTrack && fixWS`
            ${next && `<p class="group-chronology-link">${
                strings('albumSidebar.groupBox.next', {
                    album: link.album(next)
                })
            }</p>`}
            ${previous && `<p class="group-chronology-link">${
                strings('albumSidebar.groupBox.previous', {
                    album: link.album(previous)
                })
            }</p>`}
        `}
    `);

    if (groupParts.length) {
        if (currentTrack) {
            const combinedGroupPart = groupParts.join('\n<hr>\n');
            return {
                multiple: [
                    trackListPart,
                    combinedGroupPart
                ]
            };
        } else {
            return {
                multiple: [
                    ...groupParts,
                    trackListPart
                ]
            };
        }
    } else {
        return {
            content: trackListPart
        };
    }
}

export function generateAlbumNavLinks(album, currentTrack, {
    generatePreviousNextLinks,
    strings
}) {
    if (album.tracks.length <= 1) {
        return '';
    }

    const previousNextLinks = currentTrack && generatePreviousNextLinks(currentTrack, {
        data: album.tracks,
        linkKey: 'track'
    });
    const randomLink = `<a href="#" data-random="track-in-album" id="random-button">${
        (currentTrack
            ? strings('trackPage.nav.random')
            : strings('albumPage.nav.randomTrack'))
    }</a>`;

    return (previousNextLinks
        ? `(${previousNextLinks}<span class="js-hide-until-data">, ${randomLink}</span>)`
        : `<span class="js-hide-until-data">(${randomLink})</span>`);
}

export function generateAlbumChronologyLinks(album, currentTrack, {generateChronologyLinks}) {
    return [
        currentTrack && generateChronologyLinks(currentTrack, {
            contribKey: 'artistContribs',
            getThings: artist => [...artist.tracksAsArtist, ...artist.tracksAsContributor],
            headingString: 'misc.chronology.heading.track'
        }),
        generateChronologyLinks(currentTrack || album, {
            contribKey: 'coverArtistContribs',
            dateKey: 'coverArtDate',
            getThings: artist => [...artist.albumsAsCoverArtist, ...artist.tracksAsCoverArtist],
            headingString: 'misc.chronology.heading.coverArt'
        })
    ].filter(Boolean).join('\n');
}
