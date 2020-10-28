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

function cssProp(el, key) {
    return getComputedStyle(el).getPropertyValue(key).trim();
}

function getAlbum(el) {
    const directory = cssProp(el, '--album-directory');
    return albumData.find(album => album.directory === directory);
}

function getFlash(el) {
    const directory = cssProp(el, '--flash-directory');
    return flashData.find(flash => flash.directory === directory);
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

function openFlash(flash) {
    location.href = rebase(`${C.FLASH_DIRECTORY}/${flash.directory}/index.html`);
}

/* i implemented these functions but we dont actually use them anywhere lol
function isFlashPage() {
    return !!cssProp(document.body, '--flash-directory');
}

function isTrackOrAlbumPage() {
    return !!cssProp(document.body, '--album-directory');
}

function isTrackPage() {
    return !!cssProp(document.body, '--track-directory');
}
*/

function getTrackListAndIndex() {
    const album = getAlbum(document.body);
    const directory = cssProp(document.body, '--track-directory');
    if (!directory && !album) return {};
    if (!directory) return {list: album.tracks};
    const trackIndex = album.tracks.findIndex(track => track.directory === directory);
    return {list: album.tracks, index: trackIndex};
}

function openNextTrack() {
    const { list, index } = getTrackListAndIndex();
    if (!list) return;
    if (index === list.length) return;
    openTrack(list[index + 1]);
}

function openPreviousTrack() {
    const { list, index } = getTrackListAndIndex();
    if (!list) return;
    if (index === 0) return;
    openTrack(list[index - 1]);
}

function openRandomTrack() {
    const { list } = getTrackListAndIndex();
    if (!list) return;
    openTrack(pick(list));
}

function getFlashListAndIndex() {
    const list = flashData.filter(flash => !flash.act8r8k)
    const flash = getFlash(document.body);
    if (!flash) return {list};
    const flashIndex = list.indexOf(flash);
    return {list, index: flashIndex};
}

function openNextFlash() {
    const { list, index } = getFlashListAndIndex();
    if (index === list.length) return;
    openFlash(list[index + 1]);
}

function openPreviousFlash() {
    const { list, index } = getFlashListAndIndex();
    if (index === 0) return;
    openFlash(list[index - 1]);
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

const next = document.getElementById('next-button');
const previous = document.getElementById('previous-button');
const random = document.getElementById('random-button');

const prependTitle = (el, prepend) => {
    const existing = el.getAttribute('title');
    if (existing) {
        el.setAttribute('title', prepend + ' ' + existing);
    } else {
        el.setAttribute('title', prepend);
    }
};

if (next) prependTitle(next, '(Shift+N)');
if (previous) prependTitle(previous, '(Shift+P)');
if (random) prependTitle(random, '(Shift+R)');

document.addEventListener('keypress', event => {
    if (event.shiftKey) {
        if (event.charCode === 'N'.charCodeAt(0)) {
            if (next) next.click();
        } else if (event.charCode === 'P'.charCodeAt(0)) {
            if (previous) previous.click();
        } else if (event.charCode === 'R'.charCodeAt(0)) {
            if (random) random.click();
        }
    }
});
