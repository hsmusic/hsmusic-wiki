// This file's shared 8y 8oth the client and the static file 8uilder (i.e,
// upd8.js). It's got common constants and a few utility functions!

const C = {
    // Code that's common 8etween the 8uild code (i.e. upd8.js) and gener8ted
    // site code should 8e put here. Which, uh, only really means this one
    // file. 8ut rather than hard code it, anything in this directory can 8e
    // shared across 8oth ends of the code8ase.
    // (This gets symlinked into the --data directory.)
    COMMON_DIRECTORY: 'common',

    // Code that's used only in the static site! CSS, cilent JS, etc.
    // (This gets symlinked into the --data directory.)
    STATIC_DIRECTORY: 'static',

    // Su8directory under DATA_DIRECTORY for al8um files.
    DATA_ALBUM_DIRECTORY: 'album',

    // Media files! This is symlinked into the --data directory from the
    // also user-provided --media directory.
    MEDIA_DIRECTORY: 'media',

    // Contains a folder for each al8um, within which is the al8um cover art
    // as well as any track art. Structure itself looks somethin' like this:
    // * album-art/<album.directory>/cover.jpg
    // * album-art/<album.directory>/<track1.directory>.jpg
    // * album-art/<album.directory>/<track2.directory>.jpg
    MEDIA_ALBUM_ART_DIRECTORY: 'album-art',

    // Just one folder, with a single image for each flash, matching its output
    // directory like al8um and track art. (Just keep in mind the directory of
    // a flash is just its page num8er most of the time.)
    MEDIA_FLASH_ART_DIRECTORY: 'flash-art',

    // Again, a single folder, with one image for each artist, matching their
    // output directory (which is usually their name in ke8a8-case). Although,
    // unlike other art directories, you don't to specify an image for *every*
    // artist - and present files will 8e automatically added!
    MEDIA_ARTIST_AVATAR_DIRECTORY: 'artist-avatar',

    // Miscellaneous stuff! This is pretty much only referenced in commentary
    // fields.
    MEDIA_MISC_DIRECOTRY: 'misc',

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
    //
    // Upd8 03/10/2021 (wow, almost exactly a year later): This code comment
    // from literally the first day of wiki development is finally no longer
    // necessary! It was commenting constnats like "ALBUM_DIRECTORY" 8efore.
    // 8ut we don't have those constants anymore, 'cuz urlSpec in upd8.js
    // covers all that!

    UNRELEASED_TRACKS_DIRECTORY: 'unreleased-tracks',
    OFFICIAL_GROUP_DIRECTORY: 'official',
    FANDOM_GROUP_DIRECTORY: 'fandom',

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
        return data.sort((a, b) => (a.coverArtDate || a.date) - (b.coverArtDate || b.date));
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

    getKebabCase: name => name.split(' ').join('-').replace(/&/g, 'and').replace(/[^a-zA-Z0-9\-]/g, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').toLowerCase(),

    // Terri8le hack: since artists aren't really o8jects and don't have proper
    // "directories", we just reformat the artist's name.
    getArtistDirectory: artistName => C.getKebabCase(artistName),

    getArtistNumContributions: artist => (
        artist.tracks.asAny.length +
        artist.albums.asCoverArtist.length +
        (artist.flashes ? artist.flashes.asContributor.length : 0)
    ),

    getArtistCommentary: (artist, {justEverythingMan}) => justEverythingMan.filter(thing => thing.commentary && thing.commentary.replace(/<\/?b>/g, '').includes('<i>' + artist.name + ':</i>'))
};

if (typeof module === 'object') {
    module.exports = C;
} else if (typeof window === 'object') {
    window.C = C;
}
