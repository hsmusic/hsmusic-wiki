// Track page specification.

// Imports

import fixWS from 'fix-whitespace';

import {
    generateAlbumChronologyLinks,
    generateAlbumNavLinks,
    generateAlbumSidebar
} from './album.js';

import * as html from '../util/html.js';

import {
    OFFICIAL_GROUP_DIRECTORY,
    UNRELEASED_TRACKS_DIRECTORY
} from '../util/magic-constants.js';

import {
    bindOpts
} from '../util/sugar.js';

import {
    getTrackCover,
    getAlbumListTag,
    sortByDate
} from '../util/wiki-data.js';

// Page exports

export function targets({wikiData}) {
    return wikiData.trackData;
}

export function write(track, {wikiData}) {
    const { groupData, wikiInfo } = wikiData;
    const { album, referencedByTracks, referencedTracks, otherReleases } = track;

    const useDividedReferences = groupData.some(group => group.directory === OFFICIAL_GROUP_DIRECTORY);
    const rbtFanon = (useDividedReferences &&
        referencedByTracks.filter(t => t.album.groups.every(group => group.directory !== OFFICIAL_GROUP_DIRECTORY)));
    const rbtOfficial = (useDividedReferences &&
        referencedByTracks.filter(t => t.album.groups.some(group => group.directory === OFFICIAL_GROUP_DIRECTORY)));

    const listTag = getAlbumListTag(album);

    let flashesThatFeature;
    if (wikiInfo.enableFlashesAndGames) {
        flashesThatFeature = sortByDate([track, ...otherReleases]
            .flatMap(track => track.featuredInFlashes.map(flash => ({flash, as: track}))));
    }

    const unbound_generateTrackList = (tracks, {getArtistString, link, strings}) => html.tag('ul',
        tracks.map(track => {
            const line = strings('trackList.item.withArtists', {
                track: link.track(track),
                by: `<span class="by">${strings('trackList.item.withArtists.by', {
                    artists: getArtistString(track.artistContribs)
                })}</span>`
            });
            return (track.aka
                ? `<li class="rerelease">${strings('trackList.item.rerelease', {track: line})}</li>`
                : `<li>${line}</li>`);
        })
    );

    const hasCommentary = track.commentary || otherReleases.some(t => t.commentary);
    const generateCommentary = ({
        link,
        strings,
        transformMultiline
    }) => transformMultiline([
        track.commentary,
        ...otherReleases.map(track =>
            (track.commentary?.split('\n')
                .filter(line => line.replace(/<\/b>/g, '').includes(':</i>'))
                .map(line => fixWS`
                    ${line}
                    ${strings('releaseInfo.artistCommentary.seeOriginalRelease', {
                        original: link.track(track)
                    })}
                `)
                .join('\n')))
    ].filter(Boolean).join('\n'));

    const data = {
        type: 'data',
        path: ['track', track.directory],
        data: ({
            serializeContribs,
            serializeCover,
            serializeGroupsForTrack,
            serializeLink
        }) => ({
            name: track.name,
            directory: track.directory,
            dates: {
                released: track.date,
                originallyReleased: track.originalDate,
                coverArtAdded: track.coverArtDate
            },
            duration: track.duration,
            color: track.color,
            cover: serializeCover(track, getTrackCover),
            artistsContribs: serializeContribs(track.artistContribs),
            contributorContribs: serializeContribs(track.contributorContribs),
            coverArtistContribs: serializeContribs(track.coverArtistContribs || []),
            album: serializeLink(track.album),
            groups: serializeGroupsForTrack(track),
            references: track.references.map(serializeLink),
            referencedBy: track.referencedBy.map(serializeLink),
            alsoReleasedAs: otherReleases.map(track => ({
                track: serializeLink(track),
                album: serializeLink(track.album)
            }))
        })
    };

    const page = {
        type: 'page',
        path: ['track', track.directory],
        page: ({
            fancifyURL,
            generateChronologyLinks,
            generateCoverLink,
            generatePreviousNextLinks,
            getAlbumStylesheet,
            getArtistString,
            getLinkThemeString,
            getThemeString,
            getTrackCover,
            link,
            strings,
            transformInline,
            transformLyrics,
            transformMultiline,
            to
        }) => {
            const generateTrackList = bindOpts(unbound_generateTrackList, {getArtistString, link, strings});
            const cover = getTrackCover(track);

            return {
                title: strings('trackPage.title', {track: track.name}),
                stylesheet: getAlbumStylesheet(album, {to}),
                theme: getThemeString(track.color, [
                    `--album-directory: ${album.directory}`,
                    `--track-directory: ${track.directory}`
                ]),

                // disabled for now! shifting banner position per height of page is disorienting
                /*
                banner: album.bannerArtistContribs.length && {
                    classes: ['dim'],
                    dimensions: album.bannerDimensions,
                    path: ['media.albumBanner', album.directory, album.bannerFileExtension],
                    alt: strings('misc.alt.albumBanner'),
                    position: 'bottom'
                },
                */

                main: {
                    content: fixWS`
                        ${cover && generateCoverLink({
                            src: cover,
                            alt: strings('misc.alt.trackCover'),
                            tags: track.artTags
                        })}
                        <h1>${strings('trackPage.title', {track: track.name})}</h1>
                        <p>
                            ${[
                                strings('releaseInfo.by', {
                                    artists: getArtistString(track.artistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                track.coverArtistContribs.length && strings('releaseInfo.coverArtBy', {
                                    artists: getArtistString(track.coverArtistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                album.directory !== UNRELEASED_TRACKS_DIRECTORY && strings('releaseInfo.released', {
                                    date: strings.count.date(track.date)
                                }),
                                (track.coverArtDate &&
                                    +track.coverArtDate !== +track.date &&
                                    strings('releaseInfo.artReleased', {
                                        date: strings.count.date(track.coverArtDate)
                                    })),
                                track.duration && strings('releaseInfo.duration', {
                                    duration: strings.count.duration(track.duration)
                                })
                            ].filter(Boolean).join('<br>\n')}
                        </p>
                        <p>${
                            (track.urls?.length
                                ? strings('releaseInfo.listenOn', {
                                    links: strings.list.or(track.urls.map(url => fancifyURL(url, {strings})))
                                })
                                : strings('releaseInfo.listenOn.noLinks'))
                        }</p>
                        ${otherReleases.length && fixWS`
                            <p>${strings('releaseInfo.alsoReleasedAs')}</p>
                            <ul>
                                ${otherReleases.map(track => fixWS`
                                    <li>${strings('releaseInfo.alsoReleasedAs.item', {
                                        track: link.track(track),
                                        album: link.album(track.album)
                                    })}</li>
                                `).join('\n')}
                            </ul>
                        `}
                        ${track.contributorContribs.length && fixWS`
                            <p>${strings('releaseInfo.contributors')}</p>
                            <ul>
                                ${(track.contributorContribs
                                    .map(contrib => `<li>${getArtistString([contrib], {
                                        showContrib: true,
                                        showIcons: true
                                    })}</li>`)
                                    .join('\n'))}
                            </ul>
                        `}
                        ${referencedTracks.length && fixWS`
                            <p>${strings('releaseInfo.tracksReferenced', {track: `<i>${track.name}</i>`})}</p>
                            ${generateTrackList(referencedTracks)}
                        `}
                        ${referencedByTracks.length && fixWS`
                            <p>${strings('releaseInfo.tracksThatReference', {track: `<i>${track.name}</i>`})}</p>
                            ${useDividedReferences && fixWS`
                                <dl>
                                    ${rbtOfficial.length && fixWS`
                                        <dt>${strings('trackPage.referenceList.official')}</dt>
                                        <dd>${generateTrackList(rbtOfficial)}</dd>
                                    `}
                                    ${rbtFanon.length && fixWS`
                                        <dt>${strings('trackPage.referenceList.fandom')}</dt>
                                        <dd>${generateTrackList(rbtFanon)}</dd>
                                    `}
                                </dl>
                            `}
                            ${!useDividedReferences && generateTrackList(referencedByTracks)}
                        `}
                        ${wikiInfo.enableFlashesAndGames && flashesThatFeature.length && fixWS`
                            <p>${strings('releaseInfo.flashesThatFeature', {track: `<i>${track.name}</i>`})}</p>
                            <ul>
                                ${flashesThatFeature.map(({ flash, as }) => html.tag('li',
                                    {class: as !== track && 'rerelease'},
                                    (as === track
                                        ? strings('releaseInfo.flashesThatFeature.item', {
                                            flash: link.flash(flash)
                                        })
                                        : strings('releaseInfo.flashesThatFeature.item.asDifferentRelease', {
                                            flash: link.flash(flash),
                                            track: link.track(as)
                                        })))).join('\n')}
                            </ul>
                        `}
                        ${track.lyrics && fixWS`
                            <p>${strings('releaseInfo.lyrics')}</p>
                            <blockquote>
                                ${transformLyrics(track.lyrics)}
                            </blockquote>
                        `}
                        ${hasCommentary && fixWS`
                            <p>${strings('releaseInfo.artistCommentary')}</p>
                            <blockquote>
                                ${generateCommentary({link, strings, transformMultiline})}
                            </blockquote>
                        `}
                    `
                },

                sidebarLeft: generateAlbumSidebar(album, track, {
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
                            path: ['localized.album', album.directory],
                            title: album.name
                        },
                        listTag === 'ol' ? {
                            html: strings('trackPage.nav.track.withNumber', {
                                number: album.tracks.indexOf(track) + 1,
                                track: link.track(track, {class: 'current', to})
                            })
                        } : {
                            html: strings('trackPage.nav.track', {
                                track: link.track(track, {class: 'current', to})
                            })
                        },
                        album.tracks.length > 1 &&
                        {
                            divider: false,
                            html: generateAlbumNavLinks(album, track, {
                                generatePreviousNextLinks,
                                strings
                            })
                        }
                    ].filter(Boolean),
                    content: fixWS`
                        <div>
                            ${generateAlbumChronologyLinks(album, track, {generateChronologyLinks})}
                        </div>
                    `
                }
            };
        }
    };

    return [data, page];
}

