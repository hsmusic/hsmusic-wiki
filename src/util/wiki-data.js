// Utility functions for interacting with wiki data.

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
export function sortByDate(data) {
    // Just to 8e clear: sort is a mutating function! I only return the array
    // 8ecause then you don't have to define it as a separate varia8le 8efore
    // passing it into this function.
    return data.sort((a, b) => a.date - b.date);
}

// Same details as the sortByDate, 8ut for covers~
export function sortByArtDate(data) {
    return data.sort((a, b) => (a.coverArtDate || a.date) - (b.coverArtDate || b.date));
}

// Specific data utilities

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
        artist.tracks.asAny.length +
        artist.albums.asCoverArtist.length +
        (artist.flashes ? artist.flashes.asContributor.length : 0)
    );
}

export function getArtistCommentary(artist, {justEverythingMan}) {
    return justEverythingMan.filter(thing =>
        (thing?.commentary
            .replace(/<\/?b>/g, '')
            .includes('<i>' + artist.name + ':</i>')));
}
