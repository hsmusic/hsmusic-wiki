// Artist page specification.
//
// NB: See artist-alias.js for artist alias redirect pages.

// Imports

import fixWS from 'fix-whitespace';

import * as html from '../util/html.js';

import {
    bindOpts,
    unique
} from '../util/sugar.js';

import {
    chunkByProperties,
    getTotalDuration,
    sortByDate
} from '../util/wiki-data.js';

// Page exports

export function targets({wikiData}) {
    return wikiData.artistData;
}

export function write(artist, {wikiData}) {
    const { groupData, wikiInfo } = wikiData;

    const { name, urls, contextNotes } = artist;

    const artThingsAll = sortByDate(unique([
        ...artist.albumsAsCoverArtist ?? [],
        ...artist.albumsAsWallpaperArtist ?? [],
        ...artist.albumsAsBannerArtist ?? [],
        ...artist.tracksAsCoverArtist ?? []
    ]));

    const artThingsGallery = sortByDate([
        ...artist.albumsAsCoverArtist ?? [],
        ...artist.tracksAsCoverArtist ?? []
    ]);

    const commentaryThings = sortByDate([
        ...artist.albumsAsCommentator ?? [],
        ...artist.tracksAsCommentator ?? []
    ]);

    const hasGallery = artThingsGallery.length > 0;

    const getArtistsAndContrib = (thing, key) => ({
        artists: thing[key]?.filter(({ who }) => who !== artist),
        contrib: thing[key]?.find(({ who }) => who === artist),
        thing,
        key
    });

    const artListChunks = chunkByProperties(sortByDate(artThingsAll.flatMap(thing =>
        (['coverArtistContribs', 'wallpaperArtistContribs', 'bannerArtistContribs']
            .map(key => getArtistsAndContrib(thing, key))
            .filter(({ contrib }) => contrib)
            .map(props => ({
                album: thing.album || thing,
                track: thing.album ? thing : null,
                date: +(thing.coverArtDate || thing.date),
                ...props
            })))
    )), ['date', 'album']);

    const commentaryListChunks = chunkByProperties(commentaryThings.map(thing => ({
        album: thing.album || thing,
        track: thing.album ? thing : null
    })), ['album']);

    const allTracks = sortByDate(unique([
        ...artist.tracksAsArtist ?? [],
        ...artist.tracksAsContributor ?? []
    ]));

    const chunkTracks = tracks => (
        chunkByProperties(tracks.map(track => ({
            track,
            date: +track.date,
            album: track.album,
            duration: track.duration,
            artists: (track.artistContribs.some(({ who }) => who === artist)
                ? track.artistContribs.filter(({ who }) => who !== artist)
                : track.contributorContribs.filter(({ who }) => who !== artist)),
            contrib: {
                who: artist,
                whatArray: [
                    track.artistContribs.find(({ who }) => who === artist)?.what,
                    track.contributorContribs.find(({ who }) => who === artist)?.what
                ].filter(Boolean)
            }
        })), ['date', 'album'])
        .map(({date, album, chunk}) => ({
            date, album, chunk,
            duration: getTotalDuration(chunk),
        })));

    const trackListChunks = chunkTracks(allTracks);
    const totalDuration = getTotalDuration(allTracks);

    const countGroups = things => {
        const usedGroups = things.flatMap(thing => thing.groups || thing.album?.groups || []);
        return groupData
            .map(group => ({
                group,
                contributions: usedGroups.filter(g => g === group).length
            }))
            .filter(({ contributions }) => contributions > 0)
            .sort((a, b) => b.contributions - a.contributions);
    };

    const musicGroups = countGroups(allTracks);
    const artGroups = countGroups(artThingsAll);

    let flashes, flashListChunks;
    if (wikiInfo.enableFlashesAndGames) {
        flashes = sortByDate(artist.flashesAsContributor?.slice() ?? []);
        flashListChunks = (
            chunkByProperties(flashes.map(flash => ({
                act: flash.act,
                flash,
                date: flash.date,
                // Manual artists/contrib properties here, 8ecause we don't
                // want to show the full list of other contri8utors inline.
                // (It can often 8e very, very large!)
                artists: [],
                contrib: flash.contributorContribs.find(({ who }) => who === artist)
            })), ['act'])
            .map(({ act, chunk }) => ({
                act, chunk,
                dateFirst: chunk[0].date,
                dateLast: chunk[chunk.length - 1].date
            })));
    }

    const generateEntryAccents = ({
        getArtistString, strings,
        aka, entry, artists, contrib
    }) =>
        (aka
            ? language.$('artistPage.creditList.entry.rerelease', {entry})
            : (artists.length
                ? ((contrib.what || contrib.whatArray?.length)
                    ? language.$('artistPage.creditList.entry.withArtists.withContribution', {
                        entry,
                        artists: getArtistString(artists),
                        contribution: (contrib.whatArray ? language.formatUnitList(contrib.whatArray) : contrib.what)
                    })
                    : language.$('artistPage.creditList.entry.withArtists', {
                        entry,
                        artists: getArtistString(artists)
                    }))
                : ((contrib.what || contrib.whatArray?.length)
                    ? language.$('artistPage.creditList.entry.withContribution', {
                        entry,
                        contribution: (contrib.whatArray ? language.formatUnitList(contrib.whatArray) : contrib.what)
                    })
                    : entry)));

    const unbound_generateTrackList = (chunks, {
        getArtistString, link, strings
    }) => fixWS`
        <dl>
            ${chunks.map(({date, album, chunk, duration}) => fixWS`
                <dt>${
                    (date && duration) ? language.$('artistPage.creditList.album.withDate.withDuration', {
                        album: link.album(album),
                        date: language.formatDate(date),
                        duration: language.formatDuration(duration, {approximate: true})
                    }) : date ? language.$('artistPage.creditList.album.withDate', {
                        album: link.album(album),
                        date: language.formatDate(date)
                    }) : duration ? language.$('artistPage.creditList.album.withDuration', {
                        album: link.album(album),
                        duration: language.formatDuration(duration, {approximate: true})
                    }) : language.$('artistPage.creditList.album', {
                        album: link.album(album)
                    })}</dt>
                <dd><ul>
                    ${(chunk
                        .map(({track, ...props}) => ({
                            aka: track.aka,
                            entry: language.$('artistPage.creditList.entry.track.withDuration', {
                                track: link.track(track),
                                duration: language.formatDuration(track.duration)
                            }),
                            ...props
                        }))
                        .map(({aka, ...opts}) => html.tag('li',
                            {class: aka && 'rerelease'},
                            generateEntryAccents({getArtistString, strings, aka, ...opts})))
                        .join('\n'))}
                </ul></dd>
            `).join('\n')}
        </dl>
    `;

    const unbound_serializeArtistsAndContrib = (key, {
        serializeContribs,
        serializeLink
    }) => thing => {
        const { artists, contrib } = getArtistsAndContrib(thing, key);
        const ret = {};
        ret.link = serializeLink(thing);
        if (contrib.what) ret.contribution = contrib.what;
        if (artists.length) ret.otherArtists = serializeContribs(artists);
        return ret;
    };

    const unbound_serializeTrackListChunks = (chunks, {serializeLink}) =>
        chunks.map(({date, album, chunk, duration}) => ({
            album: serializeLink(album),
            date,
            duration,
            tracks: chunk.map(({ track }) => ({
                link: serializeLink(track),
                duration: track.duration
            }))
        }));

    const data = {
        type: 'data',
        path: ['artist', artist.directory],
        data: ({
            serializeContribs,
            serializeLink
        }) => {
            const serializeArtistsAndContrib = bindOpts(unbound_serializeArtistsAndContrib, {
                serializeContribs,
                serializeLink
            });

            const serializeTrackListChunks = bindOpts(unbound_serializeTrackListChunks, {
                serializeLink
            });

            return {
                albums: {
                    asCoverArtist: artist.albumsAsCoverArtist?.map(serializeArtistsAndContrib('coverArtistContribs')),
                    asWallpaperArtist: artist.albumsAsWallpaperArtist?.map(serializeArtistsAndContrib('wallpaperArtistContribs')),
                    asBannerArtist: artist.albumsAsBannerArtist?.map(serializeArtistsAndContrib('bannerArtistContribs'))
                },
                flashes: wikiInfo.enableFlashesAndGames ? {
                    asContributor: (artist.flashesAsContributor
                        ?.map(flash => getArtistsAndContrib(flash, 'contributorContribs'))
                        .map(({ contrib, thing: flash }) => ({
                            link: serializeLink(flash),
                            contribution: contrib.what
                        })))
                } : null,
                tracks: {
                    asArtist: artist.tracksAsArtist.map(serializeArtistsAndContrib('artistContribs')),
                    asContributor: artist.tracksAsContributor.map(serializeArtistsAndContrib('contributorContribs')),
                    chunked: serializeTrackListChunks(trackListChunks)
                }
            };
        }
    };

    const infoPage = {
        type: 'page',
        path: ['artist', artist.directory],
        page: ({
            fancifyURL,
            generateCoverLink,
            generateInfoGalleryLinks,
            getArtistAvatar,
            getArtistString,
            link,
            strings,
            to,
            transformMultiline
        }) => {
            const generateTrackList = bindOpts(unbound_generateTrackList, {
                getArtistString,
                link,
                strings
            });

            return {
                title: language.$('artistPage.title', {artist: name}),

                main: {
                    content: fixWS`
                        ${artist.hasAvatar && generateCoverLink({
                            src: getArtistAvatar(artist),
                            alt: language.$('misc.alt.artistAvatar')
                        })}
                        <h1>${language.$('artistPage.title', {artist: name})}</h1>
                        ${contextNotes && fixWS`
                            <p>${language.$('releaseInfo.note')}</p>
                            <blockquote>
                                ${transformMultiline(contextNotes)}
                            </blockquote>
                            <hr>
                        `}
                        ${urls?.length && `<p>${language.$('releaseInfo.visitOn', {
                            links: language.formatDisjunctionList(urls.map(url => fancifyURL(url, {strings})))
                        })}</p>`}
                        ${hasGallery && `<p>${language.$('artistPage.viewArtGallery', {
                            link: link.artistGallery(artist, {
                                text: language.$('artistPage.viewArtGallery.link')
                            })
                        })}</p>`}
                        <p>${language.$('misc.jumpTo.withLinks', {
                            links: language.formatUnitList([
                                allTracks.length && `<a href="#tracks">${language.$('artistPage.trackList.title')}</a>`,
                                artThingsAll.length && `<a href="#art">${language.$('artistPage.artList.title')}</a>`,
                                wikiInfo.enableFlashesAndGames && flashes.length && `<a href="#flashes">${language.$('artistPage.flashList.title')}</a>`,
                                commentaryThings.length && `<a href="#commentary">${language.$('artistPage.commentaryList.title')}</a>`
                            ].filter(Boolean))
                        })}</p>
                        ${allTracks.length && fixWS`
                            <h2 id="tracks">${language.$('artistPage.trackList.title')}</h2>
                            <p>${language.$('artistPage.contributedDurationLine', {
                                artist: artist.name,
                                duration: language.formatDuration(totalDuration, {approximate: true, unit: true})
                            })}</p>
                            <p>${language.$('artistPage.musicGroupsLine', {
                                groups: language.formatUnitList(musicGroups
                                    .map(({ group, contributions }) => language.$('artistPage.groupsLine.item', {
                                        group: link.groupInfo(group),
                                        contributions: language.countContributions(contributions)
                                    })))
                            })}</p>
                            ${generateTrackList(trackListChunks)}
                        `}
                        ${artThingsAll.length && fixWS`
                            <h2 id="art">${language.$('artistPage.artList.title')}</h2>
                            ${hasGallery && `<p>${language.$('artistPage.viewArtGallery.orBrowseList', {
                                link: link.artistGallery(artist, {
                                    text: language.$('artistPage.viewArtGallery.link')
                                })
                            })}</p>`}
                            <p>${language.$('artistPage.artGroupsLine', {
                                groups: language.formatUnitList(artGroups
                                    .map(({ group, contributions }) => language.$('artistPage.groupsLine.item', {
                                        group: link.groupInfo(group),
                                        contributions: language.countContributions(contributions)
                                    })))
                            })}</p>
                            <dl>
                                ${artListChunks.map(({date, album, chunk}) => fixWS`
                                    <dt>${language.$('artistPage.creditList.album.withDate', {
                                        album: link.album(album),
                                        date: language.formatDate(date)
                                    })}</dt>
                                    <dd><ul>
                                        ${(chunk
                                            .map(({album, track, key, ...props}) => ({
                                                entry: (track
                                                    ? language.$('artistPage.creditList.entry.track', {
                                                        track: link.track(track)
                                                    })
                                                    : `<i>${language.$('artistPage.creditList.entry.album.' + {
                                                        wallpaperArtistContribs: 'wallpaperArt',
                                                        bannerArtistContribs: 'bannerArt',
                                                        coverArtistContribs: 'coverArt'
                                                    }[key])}</i>`),
                                                ...props
                                            }))
                                            .map(opts => generateEntryAccents({getArtistString, strings, ...opts}))
                                            .map(row => `<li>${row}</li>`)
                                            .join('\n'))}
                                    </ul></dd>
                                `).join('\n')}
                            </dl>
                        `}
                        ${wikiInfo.enableFlashesAndGames && flashes.length && fixWS`
                            <h2 id="flashes">${language.$('artistPage.flashList.title')}</h2>
                            <dl>
                                ${flashListChunks.map(({act, chunk, dateFirst, dateLast}) => fixWS`
                                    <dt>${language.$('artistPage.creditList.flashAct.withDateRange', {
                                        act: link.flash(chunk[0].flash, {text: act.name}),
                                        dateRange: language.formatDateRange(dateFirst, dateLast)
                                    })}</dt>
                                    <dd><ul>
                                        ${(chunk
                                            .map(({flash, ...props}) => ({
                                                entry: language.$('artistPage.creditList.entry.flash', {
                                                    flash: link.flash(flash)
                                                }),
                                                ...props
                                            }))
                                            .map(opts => generateEntryAccents({getArtistString, strings, ...opts}))
                                            .map(row => `<li>${row}</li>`)
                                            .join('\n'))}
                                    </ul></dd>
                                `).join('\n')}
                            </dl>
                        `}
                        ${commentaryThings.length && fixWS`
                            <h2 id="commentary">${language.$('artistPage.commentaryList.title')}</h2>
                            <dl>
                                ${commentaryListChunks.map(({album, chunk}) => fixWS`
                                    <dt>${language.$('artistPage.creditList.album', {
                                        album: link.album(album)
                                    })}</dt>
                                    <dd><ul>
                                        ${(chunk
                                            .map(({album, track, ...props}) => track
                                                ? language.$('artistPage.creditList.entry.track', {
                                                    track: link.track(track)
                                                })
                                                : `<i>${language.$('artistPage.creditList.entry.album.commentary')}</i>`)
                                            .map(row => `<li>${row}</li>`)
                                            .join('\n'))}
                                    </ul></dd>
                                `).join('\n')}
                            </dl>
                        `}
                    `
                },

                nav: generateNavForArtist(artist, false, hasGallery, {
                    generateInfoGalleryLinks,
                    link,
                    strings,
                    wikiData
                })
            };
        }
    };

    const galleryPage = hasGallery && {
        type: 'page',
        path: ['artistGallery', artist.directory],
        page: ({
            generateInfoGalleryLinks,
            getAlbumCover,
            getGridHTML,
            getTrackCover,
            link,
            strings,
            to
        }) => ({
            title: language.$('artistGalleryPage.title', {artist: name}),

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${language.$('artistGalleryPage.title', {artist: name})}</h1>
                    <p class="quick-info">${language.$('artistGalleryPage.infoLine', {
                        coverArts: language.countCoverArts(artThingsGallery.length, {unit: true})
                    })}</p>
                    <div class="grid-listing">
                        ${getGridHTML({
                            entries: artThingsGallery.map(item => ({item})),
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

            nav: generateNavForArtist(artist, true, hasGallery, {
                generateInfoGalleryLinks,
                link,
                strings,
                wikiData
            })
        })
    };

    return [data, infoPage, galleryPage].filter(Boolean);
}

// Utility functions

function generateNavForArtist(artist, isGallery, hasGallery, {
    generateInfoGalleryLinks,
    link,
    strings,
    wikiData
}) {
    const { wikiInfo } = wikiData;

    const infoGalleryLinks = (hasGallery &&
        generateInfoGalleryLinks(artist, isGallery, {
            link, strings,
            linkKeyGallery: 'artistGallery',
            linkKeyInfo: 'artist'
        }))

    return {
        links: [
            {toHome: true},
            wikiInfo.enableListings &&
            {
                path: ['localized.listingIndex'],
                title: language.$('listingIndex.title')
            },
            {
                html: language.$('artistPage.nav.artist', {
                    artist: link.artist(artist, {class: 'current'})
                })
            },
            hasGallery &&
            {
                divider: false,
                html: `(${infoGalleryLinks})`
            }
        ]
    };
}
