// This is the JS file that gets loaded on the client! It's only really used for
// the random track feature right now - the idea is we only use it for stuff
// that cannot 8e done at static-site compile time, 8y its fundamentally
// ephemeral nature.

'use strict';

const officialAlbumData = albumData.filter(album => !album.isFanon);
const fandomAlbumData = albumData.filter(album => album.isFanon);
const artistNames = artistData.filter(artist => !artist.alias).map(artist => artist.name);
const allTracks = C.getAllTracks(albumData);

function rebase(href) {
    const relative = document.documentElement.dataset.rebase;
    if (relative) {
        return relative + "/" + href;
    } else {
        return href;
    }
}

function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getAlbum(el) {
    const directory = getComputedStyle(el).getPropertyValue('--album-directory').trim();
    return albumData.find(album => album.directory === directory);
}

function openAlbum(album) {
    location.href = rebase(`${C.ALBUM_DIRECTORY}/${album.directory}/index.html`);
}

function openTrack(track) {
    location.href = rebase(`${C.TRACK_DIRECTORY}/${track.directory}/index.html`);
}

function openArtist(artist) {
    location.href = rebase(`${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(artist)}/index.html`);
}

for (const a of document.body.querySelectorAll('[data-random]')) {
    a.addEventListener('click', evt => {
        try {
            switch (a.dataset.random) {
                case 'album': return openAlbum(pick(albumData));
                case 'album-in-fandom': return openAlbum(pick(fandomAlbumData));
                case 'album-in-official': openAlbum(pick(officialAlbumData));
                case 'track': return openTrack(pick(allTracks));
                case 'track-in-album': return openTrack(pick(getAlbum(a).tracks));
                case 'track-in-fandom': return openTrack(pick(fandomAlbumData.reduce((acc, album) => acc.concat(album.tracks), [])));
                case 'track-in-official': return openTrack(pick(officialAlbumData.reduce((acc, album) => acc.concat(album.tracks), [])));
                case 'artist': return openArtist(pick(artistNames));
                case 'artist-more-than-one-contrib': return openArtist(pick(artistNames.filter(name => C.getArtistNumContributions(name, {albumData, allTracks, flashData}) > 1)));
            }
        } finally {
            evt.preventDefault();
        }
    });
}
