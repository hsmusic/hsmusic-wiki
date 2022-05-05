// Utility functions for interacting with wiki data.

import {
    UNRELEASED_TRACKS_DIRECTORY
} from './magic-constants.js';

// Generic value operations

export function getKebabCase(name) {
    return name
        .split(' ')
        .join('-')
        .replace(/&/g, 'and')
        .replace(/[^a-zA-Z0-9\-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

export function chunkByConditions(array, conditions) {
    if (array.length === 0) {
        return [];
    } else if (conditions.length === 0) {
        return [array];
    }

    const out = [];
    let cur = [array[0]];
    for (let i = 1; i < array.length; i++) {
        const item = array[i];
        const prev = array[i - 1];
        let chunk = false;
        for (const condition of conditions) {
            if (condition(item, prev)) {
                chunk = true;
                break;
            }
        }
        if (chunk) {
            out.push(cur);
            cur = [item];
        } else {
            cur.push(item);
        }
    }
    out.push(cur);
    return out;
}

export function chunkByProperties(array, properties) {
    return chunkByConditions(array, properties.map(p => (a, b) => {
        if (a[p] instanceof Date && b[p] instanceof Date)
            return +a[p] !== +b[p];

        if (a[p] !== b[p]) return true;

        // Not sure if this line is still necessary with the specific check for
        // d8tes a8ove, 8ut, uh, keeping it anyway, just in case....?
        if (a[p] != b[p]) return true;

        return false;
    }))
        .map(chunk => ({
            ...Object.fromEntries(properties.map(p => [p, chunk[0][p]])),
            chunk
        }));
}

// Sorting functions

export function sortByName(a, b) {
    let an = a.name.toLowerCase();
    let bn = b.name.toLowerCase();
    if (an.startsWith('the ')) an = an.slice(4);
    if (bn.startsWith('the ')) bn = bn.slice(4);
    return an < bn ? -1 : an > bn ? 1 : 0;
}

// This function was originally made to sort just al8um data, 8ut its exact
// code works fine for sorting tracks too, so I made the varia8les and names
// more general.
export function sortByDate(data, dateKey = 'date') {
    // Just to 8e clear: sort is a mutating function! I only return the array
    // 8ecause then you don't have to define it as a separate varia8le 8efore
    // passing it into this function.
    return data.sort((a, b) => a[dateKey] - b[dateKey]);
}

// Same details as the sortByDate, 8ut for covers~
export function sortByArtDate(data) {
    return data.sort((a, b) => (a.coverArtDate || a.date) - (b.coverArtDate || b.date));
}

// Specific data utilities

export function filterAlbumsByCommentary(albums) {
    return albums.filter(album => [album, ...album.tracks].some(x => x.commentary));
}

export function getAlbumCover(album, {to}) {
    // Some albums don't have art! This function returns null in that case.
    if (album.hasCoverArt) {
        return to('media.albumCover', album.directory, album.coverArtFileExtension);
    } else {
        return null;
    }
}

export function getAlbumListTag(album) {
    // TODO: This is hard-coded! No. 8ad.
    return (album.directory === UNRELEASED_TRACKS_DIRECTORY ? 'ul' : 'ol');
}

// This gets all the track o8jects defined in every al8um, and sorts them 8y
// date released. Generally, albumData will pro8a8ly already 8e sorted 8efore
// you pass it to this function, 8ut individual tracks can have their own
// original release d8, distinct from the al8um's d8. I allowed that 8ecause
// in Homestuck, the first four Vol.'s were com8ined into one al8um really
// early in the history of the 8andcamp, and I still want to use that as the
// al8um listing (not the original four al8um listings), 8ut if I only did
// that, all the tracks would 8e sorted as though they were released at the
// same time as the compilation al8um - i.e, after some other al8ums (including
// Vol.'s 5 and 6!) were released. That would mess with chronological listings
// including tracks from multiple al8ums, like artist pages. So, to fix that,
// I gave tracks an Original Date field, defaulting to the release date of the
// al8um if not specified. Pretty reasona8le, I think! Oh, and this feature can
// 8e used for other projects too, like if you wanted to have an al8um listing
// compiling a 8unch of songs with radically different & interspersed release
// d8s, 8ut still keep the al8um listing in a specific order, since that isn't
// sorted 8y date.
export function getAllTracks(albumData) {
    return sortByDate(albumData.flatMap(album => album.tracks));
}

export function getArtistNumContributions(artist) {
    return (
        (artist.tracksAsAny?.length ?? 0) +
        (artist.albumsAsCoverArtist?.length ?? 0) +
        (artist.flashesAsContributor?.length ?? 0)
    );
}

export function getArtistCommentary(artist, {justEverythingMan}) {
    return justEverythingMan.filter(thing =>
        (thing?.commentary
            .replace(/<\/?b>/g, '')
            .includes('<i>' + artist.name + ':</i>')));
}

export function getFlashCover(flash, {to}) {
    return to('media.flashArt', flash.directory, flash.coverArtFileExtension);
}

export function getFlashLink(flash) {
    return `https://homestuck.com/story/${flash.page}`;
}

export function getTotalDuration(tracks) {
    return tracks.reduce((duration, track) => duration + track.duration, 0);
}

export function getTrackCover(track, {to}) {
    // Some albums don't have any track art at all, and in those, every track
    // just inherits the album's own cover art. Note that since cover art isn't
    // guaranteed on albums either, it's possible that this function returns
    // null!
    if (!track.hasCoverArt) {
        return getAlbumCover(track.album, {to});
    } else {
        return to('media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension);
    }
}

export function getArtistAvatar(artist, {to}) {
    return to('media.artistAvatar', artist.directory, artist.avatarFileExtension);
}

// Big-ass homepage row functions

export function getNewAdditions(numAlbums, {wikiData}) {
    const { albumData } = wikiData;

    // Sort al8ums, in descending order of priority, 8y...
    //
    // * D8te of addition to the wiki (descending).
    // * Major releases first.
    // * D8te of release (descending).
    //
    // Major releases go first to 8etter ensure they show up in the list (and
    // are usually at the start of the final output for a given d8 of release
    // too).
    const sortedAlbums = albumData.filter(album => album.isListedOnHomepage).sort((a, b) => {
        if (a.dateAddedToWiki > b.dateAddedToWiki) return -1;
        if (a.dateAddedToWiki < b.dateAddedToWiki) return 1;
        if (a.isMajorRelease && !b.isMajorRelease) return -1;
        if (!a.isMajorRelease && b.isMajorRelease) return 1;
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
    });

    // When multiple al8ums are added to the wiki at a time, we want to show
    // all of them 8efore pulling al8ums from the next (earlier) date. We also
    // want to show a diverse selection of al8ums - with limited space, we'd
    // rather not show only the latest al8ums, if those happen to all 8e
    // closely rel8ted!
    //
    // Specifically, we're concerned with avoiding too much overlap amongst
    // the primary (first/top-most) group. We do this 8y collecting every
    // primary group present amongst the al8ums for a given d8 into one
    // (ordered) array, initially sorted (inherently) 8y latest al8um from
    // the group. Then we cycle over the array, adding one al8um from each
    // group until all the al8ums from that release d8 have 8een added (or
    // we've met the total target num8er of al8ums). Once we've added all the
    // al8ums for a given group, it's struck from the array (so the groups
    // with the most additions on one d8 will have their oldest releases
    // collected more towards the end of the list).

    const albums = [];

    let i = 0;
    outerLoop: while (i < sortedAlbums.length) {
        // 8uild up a list of groups and their al8ums 8y order of decending
        // release, iter8ting until we're on a different d8. (We use a map for
        // indexing so we don't have to iter8te through the entire array each
        // time we access one of its entries. This is 8asically unnecessary
        // since this will never 8e an expensive enough task for that to
        // matter.... 8ut it's nicer code. BBBB) )
        const currentDate = sortedAlbums[i].dateAddedToWiki;
        const groupMap = new Map();
        const groupArray = [];
        for (let album; (album = sortedAlbums[i]) && +album.dateAddedToWiki === +currentDate; i++) {
            const primaryGroup = album.groups[0];
            if (groupMap.has(primaryGroup)) {
                groupMap.get(primaryGroup).push(album);
            } else {
                const entry = [album]
                groupMap.set(primaryGroup, entry);
                groupArray.push(entry);
            }
        }

        // Then cycle over that sorted array, adding one al8um from each to
        // the main array until we've run out or have met the target num8er
        // of al8ums.
        while (groupArray.length) {
            let j = 0;
            while (j < groupArray.length) {
                const entry = groupArray[j];
                const album = entry.shift();
                albums.push(album);


                // This is the only time we ever add anything to the main al8um
                // list, so it's also the only place we need to check if we've
                // met the target length.
                if (albums.length === numAlbums) {
                    // If we've met it, 8r8k out of the outer loop - we're done
                    // here!
                    break outerLoop;
                }

                if (entry.length) {
                    j++;
                } else {
                    groupArray.splice(j, 1);
                }
            }
        }
    }

    // Finally, do some quick mapping shenanigans to 8etter display the result
    // in a grid. (This should pro8a8ly 8e a separ8te, shared function, 8ut
    // whatevs.)
    return albums.map(album => ({large: album.isMajorRelease, item: album}));
}

export function getNewReleases(numReleases, {wikiData}) {
    const { albumData } = wikiData;

    const latestFirst = albumData.filter(album => album.isListedOnHomepage).reverse();
    const majorReleases = latestFirst.filter(album => album.isMajorRelease);
    majorReleases.splice(1);

    const otherReleases = latestFirst
        .filter(album => !majorReleases.includes(album))
        .slice(0, numReleases - majorReleases.length);

    return [
        ...majorReleases.map(album => ({large: true, item: album})),
        ...otherReleases.map(album => ({large: false, item: album}))
    ];
}
