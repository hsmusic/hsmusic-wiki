// Track page specification.

// Imports

import fixWS from 'fix-whitespace';

import {
    generateAlbumChronologyLinks,
    generateAlbumNavLinks,
    generateAlbumSecondaryNav,
    generateAlbumSidebar
} from './album.js';

import * as html from '../util/html.js';

import {
    bindOpts
} from '../util/sugar.js';

import {
    getTrackCover,
    getAlbumListTag,
    sortChronologically,
} from '../util/wiki-data.js';

// Page exports

export function targets({wikiData}) {
    return wikiData.trackData;
}

export function write(track, {wikiData}) {
    const { groupData, wikiInfo } = wikiData;
    const { album, referencedByTracks, referencedTracks, otherReleases } = track;

    const listTag = getAlbumListTag(album);

    let flashesThatFeature;
    if (wikiInfo.enableFlashesAndGames) {
        flashesThatFeature = sortChronologically([track, ...otherReleases]
            .flatMap(track => track.featuredInFlashes
                .map(flash => ({
                    flash,
                    as: track,
                    directory: flash.directory,
                    name: flash.name,
                    date: flash.date
                }))));
    }

    const unbound_getTrackItem = (track, {getArtistString, link, language}) => (
        html.tag('li', language.$('trackList.item.withArtists', {
            track: link.track(track),
            by: `<span class="by">${language.$('trackList.item.withArtists.by', {
                artists: getArtistString(track.artistContribs)
            })}</span>`
        })));

    const unbound_generateTrackList = (tracks, {getArtistString, link, language}) => html.tag('ul',
        tracks.map(track => unbound_getTrackItem(track, {getArtistString, link, language}))
    );

    const hasCommentary = track.commentary || otherReleases.some(t => t.commentary);
    const generateCommentary = ({
        link,
        language,
        transformMultiline
    }) => transformMultiline([
        track.commentary,
        ...otherReleases.map(track =>
            (track.commentary?.split('\n')
                .filter(line => line.replace(/<\/b>/g, '').includes(':</i>'))
                .map(line => fixWS`
                    ${line}
                    ${language.$('releaseInfo.artistCommentary.seeOriginalRelease', {
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

    const getSocialEmbedDescription = ({
        getArtistString: _getArtistString,
        language,
    }) => {
        const hasArtists = (track.artistContribs?.length > 0);
        const hasCoverArtists = (track.coverArtistContribs?.length > 0);
        const getArtistString = contribs => _getArtistString(contribs, {
            // We don't want to put actual HTML tags in social embeds (sadly
            // they don't get parsed and displayed, generally speaking), so
            // override the link argument so that artist "links" just show
            // their names.
            link: {artist: artist => artist.name}
        });
        if (!hasArtists && !hasCoverArtists) return '';
        return language.formatString(
            'trackPage.socialEmbed.body' + [
                hasArtists && '.withArtists',
                hasCoverArtists && '.withCoverArtists',
            ].filter(Boolean).join(''),
            Object.fromEntries([
                hasArtists && ['artists', getArtistString(track.artistContribs)],
                hasCoverArtists && ['coverArtists', getArtistString(track.coverArtistContribs)],
            ].filter(Boolean)))
    };

    const page = {
        type: 'page',
        path: ['track', track.directory],
        page: ({
            absoluteTo,
            fancifyURL,
            generateChronologyLinks,
            generateCoverLink,
            generatePreviousNextLinks,
            generateTrackListDividedByGroups,
            getAlbumStylesheet,
            getArtistString,
            getLinkThemeString,
            getThemeString,
            getTrackCover,
            link,
            language,
            transformInline,
            transformLyrics,
            transformMultiline,
            to,
            urls,
        }) => {
            const getTrackItem = bindOpts(unbound_getTrackItem, {getArtistString, link, language});
            const cover = getTrackCover(track);

            return {
                title: language.$('trackPage.title', {track: track.name}),
                stylesheet: getAlbumStylesheet(album, {to}),
                theme: getThemeString(track.color, [
                    `--album-directory: ${album.directory}`,
                    `--track-directory: ${track.directory}`
                ]),

                socialEmbed: {
                    heading: language.$('trackPage.socialEmbed.heading', {album: track.album.name}),
                    headingLink: absoluteTo('localized.album', album.directory),
                    title: language.$('trackPage.socialEmbed.title', {track: track.name}),
                    description: getSocialEmbedDescription({getArtistString, language}),
                    image: '/' + getTrackCover(track, {to: urls.from('shared.root').to}),
                    color: track.color,
                },

                // disabled for now! shifting banner position per height of page is disorienting
                /*
                banner: album.bannerArtistContribs.length && {
                    classes: ['dim'],
                    dimensions: album.bannerDimensions,
                    path: ['media.albumBanner', album.directory, album.bannerFileExtension],
                    alt: language.$('misc.alt.albumBanner'),
                    position: 'bottom'
                },
                */

                main: {
                    content: fixWS`
                        ${cover && generateCoverLink({
                            src: cover,
                            alt: language.$('misc.alt.trackCover'),
                            tags: track.artTags
                        })}
                        <h1>${language.$('trackPage.title', {track: track.name})}</h1>
                        <p>
                            ${[
                                language.$('releaseInfo.by', {
                                    artists: getArtistString(track.artistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                track.coverArtistContribs.length && language.$('releaseInfo.coverArtBy', {
                                    artists: getArtistString(track.coverArtistContribs, {
                                        showContrib: true,
                                        showIcons: true
                                    })
                                }),
                                track.date && language.$('releaseInfo.released', {
                                    date: language.formatDate(track.date)
                                }),
                                (track.coverArtDate &&
                                    +track.coverArtDate !== +track.date &&
                                    language.$('releaseInfo.artReleased', {
                                        date: language.formatDate(track.coverArtDate)
                                    })),
                                track.duration && language.$('releaseInfo.duration', {
                                    duration: language.formatDuration(track.duration)
                                })
                            ].filter(Boolean).join('<br>\n')}
                        </p>
                        <p>${
                            (track.urls?.length
                                ? language.$('releaseInfo.listenOn', {
                                    links: language.formatDisjunctionList(track.urls.map(url => fancifyURL(url, {language})))
                                })
                                : language.$('releaseInfo.listenOn.noLinks'))
                        }</p>
                        ${otherReleases.length && fixWS`
                            <p>${language.$('releaseInfo.alsoReleasedAs')}</p>
                            <ul>
                                ${otherReleases.map(track => fixWS`
                                    <li>${language.$('releaseInfo.alsoReleasedAs.item', {
                                        track: link.track(track),
                                        album: link.album(track.album)
                                    })}</li>
                                `).join('\n')}
                            </ul>
                        `}
                        ${track.contributorContribs.length && fixWS`
                            <p>${language.$('releaseInfo.contributors')}</p>
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
                            <p>${language.$('releaseInfo.tracksReferenced', {track: `<i>${track.name}</i>`})}</p>
                            ${html.tag('ul', referencedTracks.map(getTrackItem))}
                        `}
                        ${referencedByTracks.length && fixWS`
                            <p>${language.$('releaseInfo.tracksThatReference', {track: `<i>${track.name}</i>`})}</p>
                            ${generateTrackListDividedByGroups(referencedByTracks, {
                                getTrackItem,
                                wikiData,
                            })}
                        `}
                        ${wikiInfo.enableFlashesAndGames && flashesThatFeature.length && fixWS`
                            <p>${language.$('releaseInfo.flashesThatFeature', {track: `<i>${track.name}</i>`})}</p>
                            <ul>
                                ${flashesThatFeature.map(({ flash, as }) => html.tag('li',
                                    {class: as !== track && 'rerelease'},
                                    (as === track
                                        ? language.$('releaseInfo.flashesThatFeature.item', {
                                            flash: link.flash(flash)
                                        })
                                        : language.$('releaseInfo.flashesThatFeature.item.asDifferentRelease', {
                                            flash: link.flash(flash),
                                            track: link.track(as)
                                        })))).join('\n')}
                            </ul>
                        `}
                        ${track.lyrics && fixWS`
                            <p>${language.$('releaseInfo.lyrics')}</p>
                            <blockquote>
                                ${transformLyrics(track.lyrics)}
                            </blockquote>
                        `}
                        ${hasCommentary && fixWS`
                            <p>${language.$('releaseInfo.artistCommentary')}</p>
                            <blockquote>
                                ${generateCommentary({link, language, transformMultiline})}
                            </blockquote>
                        `}
                    `
                },

                sidebarLeft: generateAlbumSidebar(album, track, {
                    fancifyURL,
                    getLinkThemeString,
                    link,
                    language,
                    transformMultiline,
                    wikiData
                }),

                nav: {
                    linkContainerClasses: ['nav-links-hierarchy'],
                    links: [
                        {toHome: true},
                        {
                            path: ['localized.album', album.directory],
                            title: album.name
                        },
                        listTag === 'ol' ? {
                            html: language.$('trackPage.nav.track.withNumber', {
                                number: album.tracks.indexOf(track) + 1,
                                track: link.track(track, {class: 'current', to})
                            })
                        } : {
                            html: language.$('trackPage.nav.track', {
                                track: link.track(track, {class: 'current', to})
                            })
                        },
                    ].filter(Boolean),
                    content: generateAlbumChronologyLinks(album, track, {generateChronologyLinks}),
                    bottomRowContent: (album.tracks.length > 1 &&
                        generateAlbumNavLinks(album, track, {
                            generatePreviousNextLinks,
                            language,
                        })),
                },

                secondaryNav: generateAlbumSecondaryNav(album, track, {
                    language,
                    link,
                    getLinkThemeString,
                }),
            };
        }
    };

    return [data, page];
}

