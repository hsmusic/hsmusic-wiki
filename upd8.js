// HEY N8RDS!
//
// This is one of the 8ACKEND FILES. It's not used anywhere on the actual site
// you are might 8e using right now.
//
// Specifically, this one does all the actual work of the music wiki. The
// process looks something like this:
//
//   1. Crawl the music directories. Well, not so much "crawl" as "look inside
//      the folders for each al8um, and read the metadata file descri8ing that
//      al8um and the tracks within."
//
//   2. Read that metadata. I'm writing this 8efore actually doing any of the
//      code, and I've gotta admit I have no idea what file format they're
//      going to 8e in. May8e JSON, 8ut more likely some weird custom format
//      which will 8e a lot easier to edit.
//
//   3. Generate the page files! They're just static index.html files, and are
//      what gh-pages (or wherever this is hosted) will show to clients.
//      Hopefully pretty minimalistic HTML, 8ut like, shrug. They'll reference
//      CSS (and maaaaaaaay8e JS) files, hard-coded somewhere near the root.
//
//   4. Print an awesome message which says the process is done. This is the
//      most important step.
//
// Oh yeah, like. Just run this through some relatively recent version of
// node.js and you'll 8e fine. ...Within the project root. O8viously.

// HEY FUTURE ME!!!!!!!! Don't forget to implement artist pages! Those are,
// like, the coolest idea you've had yet, so DO NOT FORGET. (Remem8er, link
// from track listings, etc!) --- Thanks, past me. To futurerer me: an al8um
// listing page (a list of all the al8ums)! Make sure to sort these 8y date -
// we'll need a new field for al8ums.

// ^^^^^^^^ DID THAT! 8ut also, artist images. Pro8a8ly stolen from the fandom
// wiki (I found half those images anywayz).

// TRACK ART CREDITS. This is a must.

'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

// I made this dependency myself! A long, long time ago. It is pro8a8ly my
// most useful li8rary ever. I'm not sure 8esides me actually uses it, though.
const fixWS = require('fix-whitespace');
// Wait nevermind, I forgot a8out why-do-kids-love-the-taste-of-cinnamon-toast-
// crunch. THAT is my 8est li8rary.

// The require function just returns whatever the module exports, so there's
// no reason you can't wrap it in some decorator right out of the 8ox. Which is
// exactly what we do here.
const mkdirp = util.promisify(require('mkdirp'));

// This is the dum8est name for a function possi8le. Like, SURE, fine, may8e
// the UNIX people had some valid reason to go with the weird truncated
// lowercased convention they did. 8ut Node didn't have to ALSO use that
// convention! Would it have 8een so hard to just name the function something
// like fs.readDirectory???????? No, it wouldn't have 8een.
const readdir = util.promisify(fs.readdir);
// 8ut okay, like, look at me. DOING THE SAME THING. See, *I* could have named
// my promisified function differently, and yet I did not. I literally cannot
// explain why. We are all used to following in the 8ad decisions of our
// ancestors, and never never never never never never never consider that hey,
// may8e we don't need to make the exact same decisions they did. Even when
// we're perfectly aware th8t's exactly what we're doing! Programmers,
// including me, are all pretty stupid.

// 8ut I mean, come on. Look. Node decided to use readFile, instead of like,
// what, cat? Why couldn't they rename readdir too???????? As Johannes Kepler
// once so elegantly put it: "Shrug."
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const access = util.promisify(fs.access);

const {
    joinNoOxford,
    splitArray
} = require('./upd8-util');

const SITE_TITLE = 'Homestuck Music Wiki';

const SITE_INTRO = fixWS`
    <p>Welcome to the fan-made wiki for Homestuck music! Select any album below to begin browsing.</p>
    <p>This site was mostly made as a remake of Homestuck's official <a href="https://homestuck.bandcamp.com/">Bandcamp</a>, which saw its content reduced on <a href="https://twitter.com/hamesatron/status/1187842783618297856">10/25/19</a>. This site aims to be a more reliable resource and reference: track art (conspicuously missing from the Bandcamp) is archived here, solo albums are all indexed in the one place, and URLs will always stay consistent. Also included are tracks for listening on Bandcamp and other services.</p>
    <p>This site was mostly made by <a href="https://twitter.com/florriestuck">Florrie</a>. Listings were fetched primarily from the <a href="https://homestuck.bandcamp.com">Homestuck Bandcamp</a>. Track art is primarily from the <a href="https://web.archive.org/web/20190720035022/https://homestuck.bandcamp.com/music">Web Archive</a>. Much of this is made based on and with use of the <a href="https://homestuck-and-mspa-music.fandom.com/wiki/Homestuck_and_MSPA_Music_Wiki">Homestuck and MSPA Music Wiki</a> on Fandom - thanks a bunch to all who've worked on that!</p>
`;

// The folder you stick your random downloads in is called "Downloads", yeah?
// (Unless you sort all your downloads into manual, organized locations. Good
// for you.) It might just 8e me, 8ut I've always said "the downloads folder."
// And yet here I say "the al8um directory!" It's like we've gotten "Downloads"
// as a name so ingrained into our heads that we use it like an adjective too,
// even though it doesn't make any grammatical sense to do so. Anyway, also for
// contrast, note that this folder is called "album" and not "albums". To 8e
// clear, that IS against how I normally name folders - 8ut here, I'm doing it
// to match 8andcamp's URL schema: "/album/genesis-frog" instead of "/albums
// /genesis-frog." That seems to kind of 8e a standard for a lot of sites?
// 8ut only KIND OF. Twitter has the weird schema of "/<user>/status/<id>"
// (not "statuses")... 8ut it also has "/<user>/likes", so I really have no
// idea how people decide to make their URL schemas consistent. Luckily I don't
// have to worry a8out any of that, 8ecause I'm just stealing 8andcamp.
const ALBUM_DIRECTORY = 'album';
const TRACK_DIRECTORY = 'track';
const ARTIST_DIRECTORY = 'artist';
const ARTIST_AVATAR_DIRECTORY = 'artist-avatar';
const GRID_DIRECTORY = 'grid';

// Might ena8le this later... we'll see! Eventually. May8e.
const ENABLE_ARTIST_AVATARS = false;

const ALBUM_DATA_FILE = 'album.txt';

const CSS_FILE = 'site.css';
const GRID_CSS_FILE = 'grid-site.css';

// Note there isn't a 'find track data files' function. I plan on including the
// data for all tracks within an al8um collected in the single metadata file
// for that al8um. Otherwise there'll just 8e way too many files, and I'd also
// have to worry a8out linking track files to al8um files (which would contain
// only the track listing, not track data itself), and dealing with errors of
// missing track files (or track files which are not linked to al8ums). All a
// 8unch of stuff that's a pain to deal with for no apparent 8enefit.
async function findAlbumDataFiles() {
    // Promises suck. This could pro8a8ly 8e written with async/await and an
    // ordinary for loop, 8ut I'm using promises 8ecause they let all the
    // folders get read simultaneously.
    // ...Actually screw it, let's use async/await AND promises.
    /*
    return readdir(ALBUM_DIRECTORY)
        .then(albums => Promise.all(albums
            .map(album => readdir(path.join(ALBUM_DIRECTORY, album))
                .then(files => files.includes(ALBUM_DATA_FILE) ? path.join(ALBUM_DIRECTORY, album, ALBUM_DATA_FILE) : null))))
        .then(paths => paths.filter(Boolean));
    */

    const albums = await readdir(ALBUM_DIRECTORY);

    const paths = await Promise.all(albums.map(async album => {
        // Argua8ly terri8le/am8iguous varia8le naming. Too 8ad!
        const albumDirectory = path.join(ALBUM_DIRECTORY, album);
        const files = await readdir(albumDirectory);
        if (files.includes(ALBUM_DATA_FILE)) {
            return path.join(albumDirectory, ALBUM_DATA_FILE);
        }
        // The old code returns null if the data file isn't present, 8ut that's
        // not actually necessary. We just need some falsey value, and the
        // implied undefined when you don't explicitly return anything works.
    }));

    return paths.filter(Boolean);
}

async function processAlbumDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        // This function can return "error o8jects," which are really just
        // ordinary o8jects with an error message attached. I'm not 8othering
        // with error codes here or anywhere in this function; while this would
        // normally 8e 8ad coding practice, it doesn't really matter here,
        // 8ecause this isn't an API getting consumed by other services (e.g.
        // translaction functions). If we return an error, the caller will just
        // print the attached message in the output summary.
        return {error: `Could not read ${file} (${error.code}).`};
    }

    // We're probably supposed to, like, search for a header somewhere in the
    // album contents, to make sure it's trying to be the intended structure
    // and is a valid utf-8 (or at least ASCII) file. 8ut like, whatever.
    // We'll just return more specific errors if it's missing necessary data
    // fields.

    // ::::)
    const isSeparatorLine = line => /^-{8,}$/.test(line);

    const contentLines = contents.split('\n');

    // In this line of code I defeat the purpose of using a generator in the
    // first place. Sorry!!!!!!!!
    const sections = Array.from(splitArray(contentLines, isSeparatorLine));

    const initialLines = contentLines.slice(0, contentLines.findIndex(isSeparatorLine));

    const getBasicField = (lines, name) => {
        const line = lines.find(line => line.startsWith(name + ':'));
        return line && line.slice(name.length + 1).trim();
    };

    const getListField = (lines, name) => {
        let startIndex = lines.findIndex(line => line.startsWith(name + ':'));
        // If callers want to default to an empty array, they should stick
        // "|| []" after the call.
        if (startIndex === -1) {
            return null;
        }
        // We increment startIndex 8ecause we don't want to include the
        // "heading" line (e.g. "URLs:") in the actual data.
        startIndex++;
        let endIndex = lines.findIndex((line, index) => index >= startIndex && !line.startsWith('- '));
        if (endIndex === -1) {
            endIndex = lines.length;
        }
        if (endIndex === startIndex) {
            // If there is no list that comes after the heading line, treat the
            // heading line itself as the comma-separ8ted array value, using
            // the 8asic field function to do that. (It's l8 and my 8rain is
            // sleepy. Please excuse any unhelpful comments I may write, or may
            // have already written, in this st8. Thanks!)
            const value = getBasicField(lines, name);
            return value && value.split(',').map(val => val.trim());
        }
        const listLines = lines.slice(startIndex, endIndex);
        return listLines.map(line => line.slice(2));
    };

    const getContributionField = (section, name) => {
        let contributors = getListField(section, name);

        if (!contributors) {
            return null;
        }

        contributors = contributors.map(contrib => {
            // 8asically, the format is "Who (What)", or just "Who". 8e sure to
            // keep in mind that "what" doesn't necessarily have a value!
            const match = contrib.match(/^(.*?)( \((.*)\))?$/);
            if (!match) {
                return contrib;
            }
            const who = match[1];
            const what = match[3] || null;
            return {who, what};
        });

        const badContributor = contributors.find(val => typeof val === 'string');
        if (badContributor) {
            return {error: `An entry has an incorrectly formatted contributor, "${badContributor}".`};
        }

        if (contributors.length === 1 && contributors[0].who === 'none') {
            return null;
        }

        return contributors;
    };

    const albumSection = sections[0];
    const albumName = getBasicField(albumSection, 'Album');
    const albumArtists = getListField(albumSection, 'Artists') || getListField(albumSection, 'Artist');
    const albumDate = getBasicField(albumSection, 'Date');
    const albumCoverArtists = getContributionField(albumSection, 'Cover Art');
    const albumHasTrackArt = (getBasicField(albumSection, 'Has Track Art') !== 'no');
    const albumTrackCoverArtists = getContributionField(albumSection, 'Track Art');
    let albumDirectory = getBasicField(albumSection, 'Directory');

    if (albumCoverArtists && albumCoverArtists.error) {
        return albumCoverArtists;
    }

    if (albumTrackCoverArtists && albumTrackCoverArtists.error) {
        return albumTrackCoverArtists.error;
    }

    if (!albumCoverArtists) {
        return {error: `The album "${albumName}" is missing the "Cover Art" field.`};
    }

    // I don't like these varia8le names. I'm sorry. -- I only really use the
    // FG theme in the Homestuck wiki site (at least as of this writing), since
    // without any styles consistent across the site, it kinda ends up losing
    // any coherence of a single we8site and is a 8it distracting to navig8.
    // 8ut these are implemented if you ever want to mess with them in the
    // future or whatever.
    const albumColorFG = getBasicField(albumSection, 'FG') || '#0088ff';
    const albumColorBG = getBasicField(albumSection, 'BG') || '#222222';
    const albumTheme = getBasicField(albumSection, 'Theme') || 0;

    if (!albumName) {
        return {error: 'Expected "Album" (name) field!'};
    }

    if (!albumDate) {
        return {error: 'Expected "Date" field!'};
    }

    if (isNaN(Date.parse(albumDate))) {
        return {error: `Invalid Date field: "${albumDate}"`};
    }

    const dateValue = new Date(albumDate);

    if (!albumDirectory) {
        albumDirectory = getKebabCase(albumName);
    }

    // We need to declare this varia8le 8efore the al8um varia8le, 8ecause
    // that varia8le references this one. 8ut we won't actually fill in the
    // contents of the tracks varia8le until after creating the al8um one,
    // 8ecause each track o8ject will (8ack-)reference the al8um o8ject.
    const tracks = [];

    const albumData = {
        name: albumName,
        date: dateValue,
        artists: albumArtists,
        coverArtists: albumCoverArtists,
        directory: albumDirectory,
        theme: {
            fg: albumColorFG,
            bg: albumColorBG,
            theme: albumTheme
        },
        tracks
    };

    for (const section of sections.slice(1)) {
        // Just skip empty sections. Sometimes I paste a bunch of dividers,
        // and this lets the empty sections doing that creates (temporarily)
        // exist without raising an error.
        if (!section.filter(Boolean).length) {
            continue;
        }

        const trackName = getBasicField(section, 'Track');
        const originalDate = getBasicField(section, 'Original Date');
        let trackArtists = getListField(section, 'Artists') || getListField(section, 'Artist');
        let trackCoverArtists = getContributionField(section, 'Track Art');
        let trackContributors = getContributionField(section, 'Contributors') || [];
        let trackDirectory = getBasicField(section, 'Directory');

        if (trackContributors.error) {
            return trackContributors;
        }

        if (!trackName) {
            return {error: 'A track section is missing the "Track" (name) field.'};
        }

        if (!trackArtists) {
            // If an al8um has an artist specified (usually 8ecause it's a solo
            // al8um), let tracks inherit that artist. We won't display the
            // "8y <artist>" string on the al8um listing.
            if (albumArtists) {
                trackArtists = albumArtists;
            } else {
                return {error: `The track "${trackName}" is missing the "Artist" field.`};
            }
        }

        if (!trackCoverArtists) {
            if (albumHasTrackArt) {
                if (albumTrackCoverArtists) {
                    trackCoverArtists = albumTrackCoverArtists;
                } else {
                    // TODO: return an error!
                    // console.warn(`The track "${trackName}" is missing the "Track Art" field.`);
                }
            }
        }

        if (trackCoverArtists && trackCoverArtists.length && [0] === 'none') {
            trackCoverArtists = null;
        }

        if (!trackDirectory) {
            trackDirectory = getKebabCase(trackName);
        }

        let date;
        if (originalDate) {
            if (isNaN(Date.parse(originalDate))) {
                return {error: `The track "${trackName}"'s has an invalid "Original Date" field: "${originalDate}"`};
            }
            date = new Date(originalDate);
        } else {
            date = dateValue;
        }

        const trackURLs = (getListField(section, 'URLs') || []).filter(Boolean);

        if (!trackURLs.length) {
            return {error: `The track "${trackName}" should have at least one URL specified.`};
        }

        tracks.push({
            name: trackName,
            artists: trackArtists,
            coverArtists: trackCoverArtists,
            contributors: trackContributors,
            date,
            directory: trackDirectory,
            urls: trackURLs,
            // 8ack-reference the al8um o8ject! This is very useful for when
            // we're outputting the track pages.
            album: albumData
        });
    }

    return albumData;
}

// This gets all the track o8jects defined in every al8um, and sorts them 8y
// date released. Generally, albumData will pro8a8ly already 8e sorted 8efore
// you pass it to this function, 8ut individual tracks can have their own
// original release d8, distinct from the al8um's d8. I allowed that 8ecause
// in Homestuck, the first four Vol.'s were com8ined into one al8um really
// early in the history of the 8andcamp, and I still want to use that as the
// al8um listing (not the original four al8um listings), 8ut if I only did
// that, all the tracks would be sorted as though they were released at the
// same time as the compilation al8um - i.e, after some other al8ums (including
// Vol.'s 5 and 6!) were released. That would mess with chronological listings
// including tracks from multiple al8ums, like artist pages. So, to fix that,
// I gave tracks an Original Date field, defaulting to the release date of the
// al8um if not specified. Pretty reasona8le, I think! Oh, and this feature can
// 8e used for other projects too, like if you wanted to have an al8um listing
// compiling a 8unch of songs with radically different & interspersed release
// d8s, 8ut still keep the al8um listing in a specific order, since that isn't
// sorted 8y date.
function getAllTracks(albumData) {
    return sortByDate(albumData.reduce((acc, album) => acc.concat(album.tracks), []));
}

// This function was originally made to sort just al8um data, 8ut its exact
// code works fine for sorting tracks too, so I made the varia8les and names
// more general.
function sortByDate(data) {
    // Just to 8e clear: sort is a mutating function! I only return the array
    // 8ecause then you don't have to define it as a separate varia8le 8efore
    // passing it into this function.
    return data.sort((a, b) => a.date - b.date);
}

function getDateString({ date }) {
    return date.toLocaleDateString();
}

function getArtistNames(albumData) {
    return Array.from(new Set(
        albumData.reduce((acc, album) => acc.concat((album.coverArtists || []).map(({ who }) => who), album.tracks.reduce((acc, track) => acc.concat(track.artists, (track.coverArtists || []).map(({ who }) => who)), [])), [])
    ));
}

async function writeTopIndexPage(albumData) {
    // This is hard-coded, i.e. we don't do a path.join(ROOT_DIRECTORY).
    // May8e that's 8ad? Yes, definitely 8ad. 8ut I'm too lazy to fix it...
    // for now. TM.
    await writeFile('index.html', fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${SITE_TITLE}</title>
                <link rel="stylesheet" href="site.css">
            </head>
            <body id="top-index">
                <div id="content">
                    <h1>${SITE_TITLE}</h1>
                    <div id="intro">
                        ${SITE_INTRO}
                    </div>
                    <div class="grid-listing">
                        ${albumData.map(album => fixWS`
                            <a class="grid-item" href="${ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">
                                <img src="${getAlbumCover(album)}">
                                <span>${album.name}</span>
                            </a>
                        `).join('\n')}
                    </div>
                </div>
            </body>
        </html>
    `);
}

// This function title is my gr8test work of art.
async function writeIndexAndTrackPagesForAlbum(album, albumData) {
    await writeAlbumPage(album, albumData);
    await Promise.all(album.tracks.map(track => writeTrackPage(track, albumData)));
}

async function writeAlbumPage(album, albumData) {
    const allTracks = getAllTracks(albumData);
    const albumDirectory = path.join(ALBUM_DIRECTORY, album.directory);
    await mkdirp(albumDirectory);
    await writeFile(path.join(albumDirectory, 'index.html'), fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${album.name}</title>
                <base href="${path.relative(albumDirectory, '')}">
                <link rel="stylesheet" href="${CSS_FILE}">
            </head>
            <body style="${getThemeString(album.theme)}">
                <div id="sidebar">
                    ${generateSidebarForAlbum(album)}
                </div>
                <div id="content">
                    <a id="cover-art" href="${getAlbumCover(album)}"><img src="${getAlbumCover(album)}"></a>
                    <h1>${album.name}</h1>
                    <p>
                        ${album.artists && `By ${getArtistString(album.artists)}.<br>`}
                        ${album.coverArtists && `Cover art by ${joinNoOxford(album.coverArtists.map(({ who, what }) => fixWS`
                            <a href="${ARTIST_DIRECTORY}/${getArtistDirectory(who)}/index.html">${who}</a>${what && ` (${getContributionString({what}, allTracks)})`}
                        `))}.<br>`}
                        Released ${getDateString(album)}.
                    </p>
                    <ol>
                        ${album.tracks.map(track => fixWS`
                            <li>
                                <a href="${TRACK_DIRECTORY}/${track.directory}/index.html">${track.name}</a>
                                ${track.artists !== album.artists && fixWS`
                                    <i>by ${getArtistString(track.artists)}</i>
                                `}
                            </li>
                        `).join('\n')}
                    </ol>
                </div>
            </body>
        </html>
    `);
}

async function writeTrackPage(track, albumData) {
    const artistNames = getArtistNames(albumData);
    const allTracks = getAllTracks(albumData);
    const trackDirectory = path.join(TRACK_DIRECTORY, track.directory);
    await mkdirp(trackDirectory);
    await writeFile(path.join(trackDirectory, 'index.html'), fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${track.name}</title>
                <base href="${path.relative(trackDirectory, '')}">
                <link rel="stylesheet" href="${CSS_FILE}">
            </head>
            <body style="${getThemeString(track.album.theme)}">
                <div id="sidebar">
                    ${generateSidebarForAlbum(track.album, track)}
                </div>
                <div id="content">
                    <a href="${getTrackCover(track)}" id="cover-art"><img src="${getTrackCover(track)}"></a>
                    <h1>${track.name}</h1>
                    <p>
                        By ${getArtistString(track.artists)}.<br>
                        ${track.coverArtists && `Cover art by ${joinNoOxford(track.coverArtists.map(({ who, what }) => fixWS`
                            <a href="${ARTIST_DIRECTORY}/${getArtistDirectory(who)}/index.html">${who}</a>${what && ` (${getContributionString({what}, allTracks)})`}
                        `))}.<br>`}
                        Released ${getDateString(track)}.
                    </p>
                    ${track.contributors.length && fixWS`
                        <p>Contributors:</p>
                        <ul>
                            ${track.contributors.map(({ who, what }) => fixWS`
                                <li>${artistNames.includes(who)
                                    ? `<a href="${ARTIST_DIRECTORY}/${getArtistDirectory(who)}/index.html">${who}</a>`
                                    : who
                                } ${what && `(${getContributionString({what}, allTracks)})`}</li>
                            `).join('\n')}
                        </ul>
                    `}
                    <p>Listen on ${joinNoOxford(track.urls.map(url => fixWS`
                        <a href="${url}">${
                            url.includes('bandcamp.com') ? 'Bandcamp' :
                            url.includes('youtu') ? 'YouTube' :
                            '(External)'
                        }</a>
                    `), 'or')}.</p>
                    </ul>
                </div>
            </body>
        </html>
    `);
}

async function writeArtistPages(albumData) {
    await Promise.all(getArtistNames(albumData).map(artistName => writeArtistPage(artistName, albumData)));
}

async function writeArtistPage(artistName, albumData) {
    const allTracks = getAllTracks(albumData);
    const tracks = sortByDate(allTracks.filter(track => track.artists.includes(artistName) || track.contributors.some(({ who }) => who === artistName)));
    const artThings = sortByDate(albumData.concat(allTracks).filter(thing => (thing.coverArtists || []).some(({ who }) => who === artistName)));

    // Shish!
    const kebab = getArtistDirectory(artistName);

    const artistDirectory = path.join(ARTIST_DIRECTORY, kebab);
    await mkdirp(artistDirectory);
    await writeFile(path.join(artistDirectory, 'index.html'), fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${artistName}</title>
                <base href="${path.relative(artistDirectory, '')}">
                <link rel="stylesheet" href="${CSS_FILE}">
            </head>
            <body>
                <div id="content">
                    ${ENABLE_ARTIST_AVATARS && await access(path.join(ARTIST_AVATAR_DIRECTORY, kebab + '.jpg')).then(() => true, () => false) && fixWS`
                        <a id="cover-art" href="${ARTIST_AVATAR_DIRECTORY}/${getArtistDirectory(artistName)}.jpg"><img src="${ARTIST_AVATAR_DIRECTORY}/${getArtistDirectory(artistName)}.jpg"></a>
                    `}
                    <h1>${artistName}</h1>
                    ${tracks.length && fixWS`
                        <h2>Tracks</h2>
                        <ol>
                            ${tracks.map(track => fixWS`
                                <li class="${!track.artists.includes(artistName) && `contributed ${track.contributors.filter(({ who }) => who === artistName).every(({ what }) => what && what.startsWith('[') && what.endsWith(']')) && 'contributed-only-original'}`}">
                                    <a href="${TRACK_DIRECTORY}/${track.directory}/index.html">${track.name}</a>
                                    ${track.artists.includes(artistName) && track.artists.length > 1 && `<span="contributed">(with ${getArtistString(track.artists.filter(a => a !== artistName))})</span>`}
                                    ${!track.artists.includes(artistName) && `<span class="contributed">(${track.contributors.filter(({ who }) => who === artistName).map(contrib => getContributionString(contrib, tracks)).join(', ') || 'contributed'})</span>`}
                                    <i>from <a href="${ALBUM_DIRECTORY}/${track.album.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.album.name}</a></i>
                                </li>
                            `).join('\n')}
                        </ol>
                    `}
                    ${artThings.length && fixWS`
                        <h2>Art</h2>
                        <ol>
                            ${artThings.map(thing => {
                                const contrib = thing.coverArtists.find(({ who }) => who === artistName);
                                return fixWS`
                                    <li>
                                        <a href="${thing.album ? TRACK_DIRECTORY : ALBUM_DIRECTORY}/${thing.directory}/index.html"${thing.theme && ` style="${getThemeString(thing.theme)}"`}>${thing.name}</a>
                                        ${contrib.what && `<span class="contributed">(${getContributionString(contrib, tracks)})</span>`}
                                        <i>${thing.album ? `from <a href="${ALBUM_DIRECTORY}/${thing.album.directory}/index.html" style="${getThemeString(thing.album.theme)}">${thing.album.name}</a>` : `(cover art)`}</i>
                                    </li>
                                `
                            }).join('\n')}
                        </ol>
                    `}
                </div>
            </body>
        </html>
    `);
}

// This function is terri8le. Sorry!
function getContributionString({ what }, allTracks) {
    return what
        ? what.replace(/\[(.*?)\]/g, (match, name) =>
            allTracks.some(track => track.name === name)
                ? `<i><a href="${TRACK_DIRECTORY}/${allTracks.find(track => track.name === name).directory}/index.html">${name}</a></i>`
                : `<i>${name}</i>`)
        : '';
}

function getArtistString(artists) {
    return joinNoOxford(artists.map(artist => fixWS`
        <a href="${ARTIST_DIRECTORY}/${getArtistDirectory(artist)}/index.html">${artist}</a>
    `));
}

function getThemeString({fg, bg, theme}) {
    return `--fg-color: ${fg}; --bg-color: ${bg}; --theme: ${theme + ''}`;
}

// Terri8le hack: since artists aren't really o8jects and don't have proper
// "directories", we just reformat the artist's name.
function getArtistDirectory(artistName) {
    return getKebabCase(artistName);
}

function getKebabCase(name) {
    return name.split(' ').join('-').replace(/&/g, 'and').replace(/[^a-zA-Z0-9\-]/g, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function generateSidebarForAlbum(album, currentTrack = null) {
    return fixWS`
        <h2><a href="index.html">(Home)</a></h2>
        <hr>
        <h1><a href="${ALBUM_DIRECTORY}/${album.directory}/index.html">${album.name}</a></h1>
        <ol>
            ${album.tracks.map(track => fixWS`
                <li class="${track === currentTrack ? 'current-track' : ''}"><a href="${TRACK_DIRECTORY}/${track.directory}/index.html">${track.name}</a></li>
            `).join('\n')}
        </ol>
    `
}

// These two functions are sort of hard-coded ways to quickly gra8 the path to
// cover arts, for em8edding witin the HTML. They're actually 8ig hacks,
// 8ecause they assume the track and al8um directories are adjacent to each
// other. I get to make that assumption on the responsi8ility that I la8el
// these functions "hard-coded", which 8asically just means my future self and
// anyone else trying to mess with this code can't 8lame me for my terri8le
// decisions / laziness in figuring out a 8etter solution. That said, note to
// future self: these only work from two levels above the root directory.
// "O8viously," if you look at their implementation, 8ut if you don't... yeah.
// You won't 8e a8le to call these for use in the lower level files.
// ACTUALLY this means I really should just use a <base> element, which yes, I
// have done before (on my 8log). That way all HTML files have the same root
// for referenced files, and these functions work anywhere. The catch, then, is
// that you have to have a "8ase directory" constant, and keep that accurate on
// 8oth your development machine and the server you pu8lish this too. So, it's
// a trade-off. 8ut it does mean much cleaner, more general-use functions.
// Which is kind of the goal here, I suppose. --- Actually, hold on, I took a
// look at the document8tion and apparently relative URLs are totally okay!
// Com8ine that with path.relative and I think that should work as a way to
// skip a 8ase directory constant. Neat!
/*
function getAlbumCover(album) {
    return `../../${ALBUM_DIRECTORY}/${album.directory}/cover.png`;
}
function getTrackCover(track) {
    return `../../${ALBUM_DIRECTORY}/${track.album.directory}/${track.directory}.png`;
}
*/

function getAlbumCover(album) {
    return `${ALBUM_DIRECTORY}/${album.directory}/cover.jpg`;
}
function getTrackCover(track) {
    // Some al8ums don't have any track art at all, and in those, every track
    // just inherits the al8um's own cover art.
    if (track.coverArtists === null) {
        return getAlbumCover(track.album);
    } else {
        return `${ALBUM_DIRECTORY}/${track.album.directory}/${track.directory}.jpg`;
    }
}

// Super fancy, more interactive 8rowsing section of the site. May8e the
// primary one in time???????? We'll see! For real.
async function writeGridSite(albumData) {
    await mkdirp(GRID_DIRECTORY);
    await writeFile(path.join(GRID_DIRECTORY, 'index.html'), fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${SITE_TITLE}</title>
                <base href="${path.relative(GRID_DIRECTORY, '')}">
                <link rel="stylesheet" href="${GRID_CSS_FILE}">
            </head>
            <body>
                <div class="grid-listing">
                    ${albumData.map(album => fixWS`
                        <a class="grid-item" href="${GRID_DIRECTORY}/${ALBUM_DIRECTORY}/${album.directory}/index.html">
                            <img src="${getAlbumCover(album)}">
                            <span>${album.name}</span>
                        </a>
                    `).join('\n')}
                </div>
            </body>
        </html>
    `);
    await Promise.all(albumData.map(writeGridAlbumPage));
}

async function writeGridAlbumPage(album) {
    const albumDirectory = path.join(GRID_DIRECTORY, ALBUM_DIRECTORY, album.directory);
    await mkdirp(albumDirectory);
    await writeFile(path.join(albumDirectory, 'index.html'), fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${album.name}</title>
                <base href="${path.relative(albumDirectory, '')}">
                <link rel="stylesheet" href="${GRID_CSS_FILE}">
            </head>
            <body>
                <!--
                <a id="cover-art" href="${getAlbumCover(album)}"><img src="${getAlbumCover(album)}"></a>
                <h1>${album.name}</h1>
                <p>
                    ${album.artist && `By ${getArtistString(album.artists)}.<br>`}
                    Released ${getDateString(album)}.
                </p>
                -->
                <div class="grid-listing">
                    ${album.tracks.map(track => fixWS`
                        <a class="grid-item" href="${TRACK_DIRECTORY}/${track.directory}/index.html">
                            <img src="${getTrackCover(track)}">
                            <span>${track.name}<br>by ${joinNoOxford(track.artists)}</span>
                        </a>
                    `).join('\n')}
                </div>
            </body>
        </html>
    `);
}

async function main() {
    // 8ut wait, you might say, how do we know which al8um these data files
    // correspond to???????? You wouldn't dare suggest we parse the actual
    // paths returned 8y this function, which ought to 8e of effectively
    // unknown format except for their purpose as reada8le data files!?
    // To that, I would say, yeah, you're right. Thanks a 8unch, my projection
    // of "you". We're going to read these files later, and contained within
    // will 8e the actual directory names that the data correspond to. Yes,
    // that's redundant in some ways - we COULD just return the directory name
    // in addition to the data path, and duplicating that name within the file
    // itself suggests we 8e careful to avoid mismatching it - 8ut doing it
    // this way lets the data files themselves 8e more porta8le (meaning we
    // could store them all in one folder, if we wanted, and this program would
    // still output to the correct al8um directories), and also does make the
    // function's signature simpler (an array of strings, rather than some kind
    // of structure containing 8oth data file paths and output directories).
    // This is o8jectively a good thing, 8ecause it means the function can stay
    // truer to its name, and have a narrower purpose: it doesn't need to
    // concern itself with where we *output* files, or whatever other reasons
    // we might (hypothetically) have for knowing the containing directory.
    // And, in the strange case where we DO really need to know that info, we
    // callers CAN use path.dirname to find out that data. 8ut we'll 8e
    // avoiding that in our code 8ecause, again, we want to avoid assuming the
    // format of the returned paths here - they're only meant to 8e used for
    // reading as-is.
    const albumDataFiles = await findAlbumDataFiles();

    // Technically, we could do the data file reading and output writing at the
    // same time, 8ut that kinda makes the code messy, so I'm not 8othering
    // with it.
    const albumData = await Promise.all(albumDataFiles.map(processAlbumDataFile));

    sortByDate(albumData);

    const errors = albumData.filter(obj => obj.error);
    if (errors.length) {
        for (const error of errors) {
            console.log(error.error);
        }
        return;
    }

    await writeTopIndexPage(albumData);
    await Promise.all(albumData.map(album => writeIndexAndTrackPagesForAlbum(album, albumData)));
    await writeArtistPages(albumData);

    // await writeGridSite(albumData);

    // The single most important step.
    console.log('Written!');
}

main().catch(error => console.error(error));
