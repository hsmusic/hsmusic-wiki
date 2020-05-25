// Okay, THIS stupid file is loaded 8y 8OTH the client and the static site
// 8uilder.

const C = {
    // This can 8e changed if you want to output to some other directory. Just make
    // sure static files are copied into it too! (Which, ahem. Might 8e a todo.)
    SITE_DIRECTORY: '',

    // The folder you stick your random downloads in is called "Downloads",
    // yeah? (Unless you sort all your downloads into manual, organized
    // locations. Good for you.) It might just 8e me, 8ut I've always said "the
    // downloads folder." And yet here I say "the al8um directory!" It's like
    // we've gotten "Downloads" as a name so ingrained into our heads that we
    // use it like an adjective too, even though it doesn't make any
    // grammatical sense to do so. Anyway, also for contrast, note that this
    // folder is called "album" and not "albums". To 8e clear, that IS against
    // how I normally name folders - 8ut here, I'm doing it to match 8andcamp's
    // URL schema: "/album/genesis-frog" instead of "/albums/genesis-frog."
    // That seems to kind of 8e a standard for a lot of sites? 8ut only KIND OF.
    // Twitter has the weird schema of "/<user>/status/<id>" (not "statuses")...
    // 8ut it also has "/<user>/likes", so I really have no idea how people
    // decide to make their URL schemas consistent. Luckily I don't have to
    // worry a8out any of that, 8ecause I'm just stealing 8andcamp.
    //
    // Upd8 03/11/2020: Oh my god this was a pain to re-align (copying from
    // udp8.js over to shared.js).
    ALBUM_DIRECTORY: 'album',
    TRACK_DIRECTORY: 'track',
    ARTIST_DIRECTORY: 'artist',
    ARTIST_AVATAR_DIRECTORY: 'artist-avatar',
    LISTING_DIRECTORY: 'list',
    ABOUT_DIRECTORY: 'about',
    FEEDBACK_DIRECTORY: 'feedback',
    FLASH_DIRECTORY: 'flash',
    JS_DISABLED_DIRECTORY: 'js-disabled',

    UNRELEASED_TRACKS_DIRECTORY: 'unreleased-tracks',

    // This function was originally made to sort just al8um data, 8ut its exact
    // code works fine for sorting tracks too, so I made the varia8les and names
    // more general.
    sortByDate: data => {
        // Just to 8e clear: sort is a mutating function! I only return the array
        // 8ecause then you don't have to define it as a separate varia8le 8efore
        // passing it into this function.
        return data.sort((a, b) => a.date - b.date);
    },

    // Same details as the sortByDate, 8ut for covers~
    sortByArtDate: data => {
        return data.sort((a, b) => (a.artDate || a.date) - (b.artDate || b.date));
    },

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
    getAllTracks: albumData => C.sortByDate(albumData.reduce((acc, album) => acc.concat(album.tracks), [])),

    getArtistNames: (albumData, flashData) => Array.from(new Set([
        ...albumData.reduce((acc, album) => acc.concat((album.coverArtists || []).map(({ who }) => who), album.tracks.reduce((acc, track) => acc.concat(track.artists, (track.coverArtists || []).map(({ who }) => who)), [])), []),
        ...flashData.filter(flash => !flash.act8r8k).reduce((acc, flash) => acc.concat(flash.contributors.map(({ who }) => who)), [])
    ])),

    getKebabCase: name => name.split(' ').join('-').replace(/&/g, 'and').replace(/[^a-zA-Z0-9\-]/g, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').toLowerCase(),

    // Terri8le hack: since artists aren't really o8jects and don't have proper
    // "directories", we just reformat the artist's name.
    getArtistDirectory: artistName => C.getKebabCase(artistName),

    getArtistNumContributions: (artistName, {allTracks, albumData, flashData}) => [
        ...allTracks.filter(track =>
            track.artists.includes(artistName) ||
            [...track.contributors, ...track.coverArtists || []].some(({ who }) => who === artistName)),
        ...flashData.filter(flash => (flash.contributors || []).some(({ who }) => who === artistName)),
        ...albumData.filter(album =>
            (album.coverArtists || []).some(({ who }) => who === artistName))
    ].length,

    getArtistCommentary: (artistName, {justEverythingMan}) => justEverythingMan.filter(thing => thing.commentary && thing.commentary.replace(/<\/?b>/g, '').includes('<i>' + artistName + ':</i>'))
};

if (typeof module === 'object') {
    module.exports = C;
} else if (typeof window === 'object') {
    window.C = C;
}
