import fixWS from 'fix-whitespace';

import {
    UNRELEASED_TRACKS_DIRECTORY
} from './util/magic-constants.js';

import {
    chunkByProperties,
    getArtistNumContributions,
    getTotalDuration,
    sortByDate,
    sortByName
} from './util/wiki-data.js';

const listingSpec = [
    {
        directory: 'albums/by-name',
        stringsKey: 'listAlbums.byName',

        data({wikiData}) {
            return wikiData.albumData.slice()
                .sort(sortByName);
        },

        row(album, {link, strings}) {
            return strings('listingPage.listAlbums.byName.item', {
                album: link.album(album),
                tracks: strings.count.tracks(album.tracks.length, {unit: true})
            });
        }
    },

    {
        directory: 'albums/by-tracks',
        stringsKey: 'listAlbums.byTracks',

        data({wikiData}) {
            return wikiData.albumData.slice()
                .sort((a, b) => b.tracks.length - a.tracks.length);
        },

        row(album, {link, strings}) {
            return strings('listingPage.listAlbums.byTracks.item', {
                album: link.album(album),
                tracks: strings.count.tracks(album.tracks.length, {unit: true})
            });
        }
    },

    {
        directory: 'albums/by-duration',
        stringsKey: 'listAlbums.byDuration',

        data({wikiData}) {
            return wikiData.albumData
                .map(album => ({album, duration: getTotalDuration(album.tracks)}))
                .sort((a, b) => b.duration - a.duration);
        },

        row({album, duration}, {link, strings}) {
            return strings('listingPage.listAlbums.byDuration.item', {
                album: link.album(album),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'albums/by-date',
        stringsKey: 'listAlbums.byDate',

        data({wikiData}) {
            return sortByDate(wikiData.albumData
                .filter(album => album.directory !== UNRELEASED_TRACKS_DIRECTORY));
        },

        row(album, {link, strings}) {
            return strings('listingPage.listAlbums.byDate.item', {
                album: link.album(album),
                date: strings.count.date(album.date)
            });
        }
    },

    {
        directory: 'albums/by-date-added',
        stringsKey: 'listAlbums.byDateAdded',

        data({wikiData}) {
            return chunkByProperties(wikiData.albumData.slice().sort((a, b) => {
                if (a.dateAddedToWiki < b.dateAddedToWiki) return -1;
                if (a.dateAddedToWiki > b.dateAddedToWiki) return 1;
            }), ['dateAddedToWiki']);
        },

        html(chunks, {link, strings}) {
            return fixWS`
                <dl>
                    ${chunks.map(({dateAddedToWiki, chunk: albums}) => fixWS`
                        <dt>${strings('listingPage.listAlbums.byDateAdded.date', {
                            date: strings.count.date(dateAddedToWiki)
                        })}</dt>
                        <dd><ul>
                            ${(albums
                                .map(album => strings('listingPage.listAlbums.byDateAdded.album', {
                                    album: link.album(album)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'artists/by-name',
        stringsKey: 'listArtists.byName',

        data({wikiData}) {
            return wikiData.artistData.slice()
                .sort(sortByName)
                .map(artist => ({artist, contributions: getArtistNumContributions(artist)}));
        },

        row({artist, contributions}, {link, strings}) {
            return strings('listingPage.listArtists.byName.item', {
                artist: link.artist(artist),
                contributions: strings.count.contributions(contributions, {unit: true})
            });
        }
    },

    {
        directory: 'artists/by-contribs',
        stringsKey: 'listArtists.byContribs',

        data({wikiData}) {
            return {
                toTracks: (wikiData.artistData
                    .map(artist => ({
                        artist,
                        contributions: (
                            (artist.tracksAsContributor?.length ?? 0) +
                            (artist.tracksAsArtist?.length ?? 0)
                        )
                    }))
                    .sort((a, b) => b.contributions - a.contributions)
                    .filter(({ contributions }) => contributions)),

                toArtAndFlashes: (wikiData.artistData
                    .map(artist => ({
                        artist,
                        contributions: (
                            (artist.tracksAsCoverArtist?.length ?? 0) +
                            (artist.albumsAsCoverArtist?.length ?? 0) +
                            (artist.albumsAsWallpaperArtist?.length ?? 0) +
                            (artist.albumsAsBannerArtist?.length ?? 0) +
                            (wikiData.wikiInfo.enableFlashesAndGames
                                ? (artist.flashesAsContributor?.length ?? 0)
                                : 0)
                        )
                    }))
                    .sort((a, b) => b.contributions - a.contributions)
                    .filter(({ contributions }) => contributions)),

                // This is a kinda naughty hack, 8ut like, it's the only place
                // we'd 8e passing wikiData to html() otherwise, so like....
                // (Ok we do do this again once later.)
                showAsFlashes: wikiData.wikiInfo.enableFlashesAndGames
            };
        },

        html({toTracks, toArtAndFlashes, showAsFlashes}, {link, strings}) {
            return fixWS`
                <div class="content-columns">
                    <div class="column">
                        <h2>${strings('listingPage.misc.trackContributors')}</h2>
                        <ul>
                            ${(toTracks
                                .map(({ artist, contributions }) => strings('listingPage.listArtists.byContribs.item', {
                                    artist: link.artist(artist),
                                    contributions: strings.count.contributions(contributions, {unit: true})
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                         </ul>
                    </div>
                    <div class="column">
                        <h2>${strings('listingPage.misc' +
                            (showAsFlashes
                                ? '.artAndFlashContributors'
                                : '.artContributors'))}</h2>
                        <ul>
                            ${(toArtAndFlashes
                                .map(({ artist, contributions }) => strings('listingPage.listArtists.byContribs.item', {
                                    artist: link.artist(artist),
                                    contributions: strings.count.contributions(contributions, {unit: true})
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul>
                    </div>
                </div>
            `;
        }
    },

    {
        directory: 'artists/by-commentary',
        stringsKey: 'listArtists.byCommentary',

        data({wikiData}) {
            return wikiData.artistData
                .map(artist => ({artist, entries: (
                    (artist.tracksAsCommentator?.length ?? 0) +
                    (artist.albumsAsCommentator?.length ?? 0)
                )}))
                .filter(({ entries }) => entries)
                .sort((a, b) => b.entries - a.entries);
        },

        row({artist, entries}, {link, strings}) {
            return strings('listingPage.listArtists.byCommentary.item', {
                artist: link.artist(artist),
                entries: strings.count.commentaryEntries(entries, {unit: true})
            });
        }
    },

    {
        directory: 'artists/by-duration',
        stringsKey: 'listArtists.byDuration',

        data({wikiData}) {
            return wikiData.artistData
                .map(artist => ({
                    artist,
                    duration: getTotalDuration([
                        ...artist.tracksAsArtist ?? [],
                        ...artist.tracksAsContributor ?? []
                    ].filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY))
                }))
                .filter(({ duration }) => duration > 0)
                .sort((a, b) => b.duration - a.duration);
        },

        row({artist, duration}, {link, strings}) {
            return strings('listingPage.listArtists.byDuration.item', {
                artist: link.artist(artist),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'artists/by-latest',
        stringsKey: 'listArtists.byLatest',

        data({wikiData}) {
            const reversedTracks = wikiData.trackData.slice().reverse();
            const reversedArtThings = wikiData.justEverythingSortedByArtDateMan.slice().reverse();

            return {
                toTracks: sortByDate(wikiData.artistData
                    .filter(artist => !artist.alias)
                    .map(artist => ({
                        artist,
                        date: reversedTracks.find(track => (
                            track.album?.directory !== UNRELEASED_TRACKS_DIRECTORY &&
                            [
                                ...track.artistContribs ?? [],
                                ...track.contributorContribs ?? []
                            ].some(({ who }) => who === artist)
                        ))?.date
                    }))
                    .filter(({ date }) => date)
                    .sort((a, b) => a.name < b.name ? 1 : a.name > b.name ? -1 : 0)).reverse(),

                toArtAndFlashes: sortByDate(wikiData.artistData
                    .filter(artist => !artist.alias)
                    .map(artist => {
                        const thing = reversedArtThings.find(thing => (
                            thing.album?.directory !== UNRELEASED_TRACKS_DIRECTORY &&
                            [
                                ...thing.coverArtistContribs ?? [],
                                ...!thing.album && thing.contributorContribs || []
                            ].some(({ who }) => who === artist)
                        ));
                        return thing && {
                            artist,
                            date: (thing.coverArtistContribs?.some(({ who }) => who === artist)
                                ? thing.coverArtDate
                                : thing.date)
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.name < b.name ? 1 : a.name > b.name ? -1 : 0)
                ).reverse(),

                // (Ok we did it again.)
                // This is a kinda naughty hack, 8ut like, it's the only place
                // we'd 8e passing wikiData to html() otherwise, so like....
                showAsFlashes: wikiData.wikiInfo.enableFlashesAndGames
            };
        },

        html({toTracks, toArtAndFlashes, showAsFlashes}, {link, strings}) {
            return fixWS`
                <div class="content-columns">
                    <div class="column">
                        <h2>${strings('listingPage.misc.trackContributors')}</h2>
                        <ul>
                            ${(toTracks
                                .map(({ artist, date }) => strings('listingPage.listArtists.byLatest.item', {
                                    artist: link.artist(artist),
                                    date: strings.count.date(date)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul>
                    </div>
                    <div class="column">
                        <h2>${strings('listingPage.misc' +
                            (showAsFlashes
                                ? '.artAndFlashContributors'
                                : '.artContributors'))}</h2>
                        <ul>
                            ${(toArtAndFlashes
                                .map(({ artist, date }) => strings('listingPage.listArtists.byLatest.item', {
                                    artist: link.artist(artist),
                                    date: strings.count.date(date)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul>
                    </div>
                </div>
            `;
        }
    },

    {
        directory: 'groups/by-name',
        stringsKey: 'listGroups.byName',
        condition: ({wikiData}) => wikiData.wikiInfo.enableGroupUI,
        data: ({wikiData}) => wikiData.groupData.slice().sort(sortByName),

        row(group, {link, strings}) {
            return strings('listingPage.listGroups.byCategory.group', {
                group: link.groupInfo(group),
                gallery: link.groupGallery(group, {
                    text: strings('listingPage.listGroups.byCategory.group.gallery')
                })
            });
        }
    },

    {
        directory: 'groups/by-category',
        stringsKey: 'listGroups.byCategory',
        condition: ({wikiData}) => wikiData.wikiInfo.enableGroupUI,
        data: ({wikiData}) => wikiData.groupCategoryData,

        html(groupCategoryData, {link, strings}) {
            return fixWS`
                <dl>
                    ${groupCategoryData.map(category => fixWS`
                        <dt>${strings('listingPage.listGroups.byCategory.category', {
                            category: link.groupInfo(category.groups[0], {text: category.name})
                        })}</dt>
                        <dd><ul>
                            ${(category.groups
                                .map(group => strings('listingPage.listGroups.byCategory.group', {
                                    group: link.groupInfo(group),
                                    gallery: link.groupGallery(group, {
                                        text: strings('listingPage.listGroups.byCategory.group.gallery')
                                    })
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'groups/by-albums',
        stringsKey: 'listGroups.byAlbums',
        condition: ({wikiData}) => wikiData.wikiInfo.enableGroupUI,

        data({wikiData}) {
            return wikiData.groupData
                .map(group => ({group, albums: group.albums.length}))
                .sort((a, b) => b.albums - a.albums);
        },

        row({group, albums}, {link, strings}) {
            return strings('listingPage.listGroups.byAlbums.item', {
                group: link.groupInfo(group),
                albums: strings.count.albums(albums, {unit: true})
            });
        }
    },

    {
        directory: 'groups/by-tracks',
        stringsKey: 'listGroups.byTracks',
        condition: ({wikiData}) => wikiData.wikiInfo.enableGroupUI,

        data({wikiData}) {
            return wikiData.groupData
                .map(group => ({group, tracks: group.albums.reduce((acc, album) => acc + album.tracks.length, 0)}))
                .sort((a, b) => b.tracks - a.tracks);
        },

        row({group, tracks}, {link, strings}) {
            return strings('listingPage.listGroups.byTracks.item', {
                group: link.groupInfo(group),
                tracks: strings.count.tracks(tracks, {unit: true})
            });
        }
    },

    {
        directory: 'groups/by-duration',
        stringsKey: 'listGroups.byDuration',
        condition: ({wikiData}) => wikiData.wikiInfo.enableGroupUI,

        data({wikiData}) {
            return wikiData.groupData
                .map(group => ({group, duration: getTotalDuration(group.albums.flatMap(album => album.tracks))}))
                .sort((a, b) => b.duration - a.duration);
        },

        row({group, duration}, {link, strings}) {
            return strings('listingPage.listGroups.byDuration.item', {
                group: link.groupInfo(group),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'groups/by-latest-album',
        stringsKey: 'listGroups.byLatest',
        condition: ({wikiData}) => wikiData.wikiInfo.enableGroupUI,

        data({wikiData}) {
            return sortByDate(wikiData.groupData
                .map(group => ({group, date: group.albums[group.albums.length - 1]?.date}))
                // So this is kinda tough to explain, 8ut 8asically, when we
                // reverse the list after sorting it 8y d8te (so that the latest
                // d8tes come first), it also flips the order of groups which
                // share the same d8te.  This happens mostly when a single al8um
                // is the l8test in two groups. So, say one such al8um is in the
                // groups "Fandom" and "UMSPAF". Per category order, Fandom is
                // meant to show up 8efore UMSPAF, 8ut when we do the reverse
                // l8ter, that flips them, and UMSPAF ends up displaying 8efore
                // Fandom. So we do an extra reverse here, which will fix that
                // and only affect groups that share the same d8te (8ecause
                // groups that don't will 8e moved 8y the sortByDate call
                // surrounding this).
                .reverse()).reverse()
        },

        row({group, date}, {link, strings}) {
            return strings('listingPage.listGroups.byLatest.item', {
                group: link.groupInfo(group),
                date: strings.count.date(date)
            });
        }
    },

    {
        directory: 'tracks/by-name',
        stringsKey: 'listTracks.byName',

        data({wikiData}) {
            return wikiData.trackData.slice().sort(sortByName);
        },

        row(track, {link, strings}) {
            return strings('listingPage.listTracks.byName.item', {
                track: link.track(track)
            });
        }
    },

    {
        directory: 'tracks/by-album',
        stringsKey: 'listTracks.byAlbum',
        data: ({wikiData}) => wikiData.albumData,

        html(albumData, {link, strings}) {
            return fixWS`
                <dl>
                    ${albumData.map(album => fixWS`
                        <dt>${strings('listingPage.listTracks.byAlbum.album', {
                            album: link.album(album)
                        })}</dt>
                        <dd><ol>
                            ${(album.tracks
                                .map(track => strings('listingPage.listTracks.byAlbum.track', {
                                    track: link.track(track)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ol></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/by-date',
        stringsKey: 'listTracks.byDate',

        data({wikiData}) {
            return chunkByProperties(
                sortByDate(wikiData.trackData.filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY)),
                ['album', 'date']
            );
        },

        html(chunks, {link, strings}) {
            return fixWS`
                <dl>
                    ${chunks.map(({album, date, chunk: tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.byDate.album', {
                            album: link.album(album),
                            date: strings.count.date(date)
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => track.aka
                                    ? `<li class="rerelease">${strings('listingPage.listTracks.byDate.track.rerelease', {
                                        track: link.track(track)
                                    })}</li>`
                                    : `<li>${strings('listingPage.listTracks.byDate.track', {
                                        track: link.track(track)
                                    })}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/by-duration',
        stringsKey: 'listTracks.byDuration',

        data({wikiData}) {
            return wikiData.trackData
                .filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY)
                .map(track => ({track, duration: track.duration}))
                .filter(({ duration }) => duration > 0)
                .sort((a, b) => b.duration - a.duration);
        },

        row({track, duration}, {link, strings}) {
            return strings('listingPage.listTracks.byDuration.item', {
                track: link.track(track),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'tracks/by-duration-in-album',
        stringsKey: 'listTracks.byDurationInAlbum',

        data({wikiData}) {
            return wikiData.albumData.map(album => ({
                album,
                tracks: album.tracks.slice().sort((a, b) => b.duration - a.duration)
            }));
        },

        html(albums, {link, strings}) {
            return fixWS`
                <dl>
                    ${albums.map(({album, tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.byDurationInAlbum.album', {
                            album: link.album(album)
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => strings('listingPage.listTracks.byDurationInAlbum.track', {
                                    track: link.track(track),
                                    duration: strings.count.duration(track.duration)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </dd></ul>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/by-times-referenced',
        stringsKey: 'listTracks.byTimesReferenced',

        data({wikiData}) {
            return wikiData.trackData
                .map(track => ({track, timesReferenced: track.referencedByTracks.length}))
                .filter(({ timesReferenced }) => timesReferenced > 0)
                .sort((a, b) => b.timesReferenced - a.timesReferenced);
        },

        row({track, timesReferenced}, {link, strings}) {
            return strings('listingPage.listTracks.byTimesReferenced.item', {
                track: link.track(track),
                timesReferenced: strings.count.timesReferenced(timesReferenced, {unit: true})
            });
        }
    },

    {
        directory: 'tracks/in-flashes/by-album',
        stringsKey: 'listTracks.inFlashes.byAlbum',
        condition: ({wikiData}) => wikiData.wikiInfo.enableFlashesAndGames,

        data({wikiData}) {
            return chunkByProperties(wikiData.trackData
                .filter(t => t.featuredInFlashes?.length > 0), ['album'])
                .filter(({ album }) => album.directory !== UNRELEASED_TRACKS_DIRECTORY);
        },

        html(chunks, {link, strings}) {
            return fixWS`
                <dl>
                    ${chunks.map(({album, chunk: tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.inFlashes.byAlbum.album', {
                            album: link.album(album),
                            date: strings.count.date(album.date)
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => strings('listingPage.listTracks.inFlashes.byAlbum.track', {
                                    track: link.track(track),
                                    flashes: strings.list.and(track.featuredInFlashes.map(link.flash))
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </dd></ul>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/in-flashes/by-flash',
        stringsKey: 'listTracks.inFlashes.byFlash',
        condition: ({wikiData}) => wikiData.wikiInfo.enableFlashesAndGames,
        data: ({wikiData}) => wikiData.flashData,

        html(flashData, {link, strings}) {
            return fixWS`
                <dl>
                    ${sortByDate(flashData.slice()).map(flash => fixWS`
                        <dt>${strings('listingPage.listTracks.inFlashes.byFlash.flash', {
                            flash: link.flash(flash),
                            date: strings.count.date(flash.date)
                        })}</dt>
                        <dd><ul>
                            ${(flash.featuredTracks
                                .map(track => strings('listingPage.listTracks.inFlashes.byFlash.track', {
                                    track: link.track(track),
                                    album: link.album(track.album)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/with-lyrics',
        stringsKey: 'listTracks.withLyrics',

        data({wikiData}) {
            return chunkByProperties(wikiData.trackData.filter(t => t.lyrics), ['album']);
        },

        html(chunks, {link, strings}) {
            return fixWS`
                <dl>
                    ${chunks.map(({album, chunk: tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.withLyrics.album', {
                            album: link.album(album),
                            date: strings.count.date(album.date)
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => strings('listingPage.listTracks.withLyrics.track', {
                                    track: link.track(track),
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </dd></ul>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tags/by-name',
        stringsKey: 'listTags.byName',
        condition: ({wikiData}) => wikiData.wikiInfo.enableArtTagUI,

        data({wikiData}) {
            return wikiData.artTagData
                .filter(tag => !tag.isContentWarning)
                .sort(sortByName)
                .map(tag => ({tag, timesUsed: tag.taggedInThings?.length}));
        },

        row({tag, timesUsed}, {link, strings}) {
            return strings('listingPage.listTags.byName.item', {
                tag: link.tag(tag),
                timesUsed: strings.count.timesUsed(timesUsed, {unit: true})
            });
        }
    },

    {
        directory: 'tags/by-uses',
        stringsKey: 'listTags.byUses',
        condition: ({wikiData}) => wikiData.wikiInfo.enableArtTagUI,

        data({wikiData}) {
            return wikiData.artTagData
                .filter(tag => !tag.isContentWarning)
                .map(tag => ({tag, timesUsed: tag.taggedInThings?.length}))
                .sort((a, b) => b.timesUsed - a.timesUsed);
        },

        row({tag, timesUsed}, {link, strings}) {
            return strings('listingPage.listTags.byUses.item', {
                tag: link.tag(tag),
                timesUsed: strings.count.timesUsed(timesUsed, {unit: true})
            });
        }
    },

    {
        directory: 'random',
        stringsKey: 'other.randomPages',

        data: ({wikiData}) => ({
            officialAlbumData: wikiData.officialAlbumData,
            fandomAlbumData: wikiData.fandomAlbumData
        }),

        html: ({officialAlbumData, fandomAlbumData}, {
            getLinkThemeString,
            strings
        }) => fixWS`
            <p>Choose a link to go to a random page in that category or album! If your browser doesn't support relatively modern JavaScript or you've disabled it, these links won't work - sorry.</p>
            <p class="js-hide-once-data">(Data files are downloading in the background! Please wait for data to load.)</p>
            <p class="js-show-once-data">(Data files have finished being downloaded. The links should work!)</p>
            <dl>
                <dt>Miscellaneous:</dt>
                <dd><ul>
                    <li>
                        <a href="#" data-random="artist">Random Artist</a>
                        (<a href="#" data-random="artist-more-than-one-contrib">&gt;1 contribution</a>)
                    </li>
                    <li><a href="#" data-random="album">Random Album (whole site)</a></li>
                    <li><a href="#" data-random="track">Random Track (whole site)</a></li>
                </ul></dd>
                ${[
                    {name: 'Official', albumData: officialAlbumData, code: 'official'},
                    {name: 'Fandom', albumData: fandomAlbumData, code: 'fandom'}
                ].map(category => fixWS`
                    <dt>${category.name}: (<a href="#" data-random="album-in-${category.code}">Random Album</a>, <a href="#" data-random="track-in-${category.code}">Random Track</a>)</dt>
                    <dd><ul>${category.albumData.map(album => fixWS`
                        <li><a style="${getLinkThemeString(album.color)}; --album-directory: ${album.directory}" href="#" data-random="track-in-album">${album.name}</a></li>
                    `).join('\n')}</ul></dd>
                `).join('\n')}
            </dl>
        `
    }
];

const filterListings = directoryPrefix => listingSpec
    .filter(l => l.directory.startsWith(directoryPrefix));

const listingTargetSpec = [
    {
        title: ({strings}) => strings('listingPage.target.album'),
        listings: filterListings('album')
    },
    {
        title: ({strings}) => strings('listingPage.target.artist'),
        listings: filterListings('artist')
    },
    {
        title: ({strings}) => strings('listingPage.target.group'),
        listings: filterListings('group')
    },
    {
        title: ({strings}) => strings('listingPage.target.track'),
        listings: filterListings('track')
    },
    {
        title: ({strings}) => strings('listingPage.target.tag'),
        listings: filterListings('tag')
    },
    {
        title: ({strings}) => strings('listingPage.target.other'),
        listings: [
            listingSpec.find(l => l.directory === 'random')
        ]
    }
];

export {listingSpec, listingTargetSpec};
