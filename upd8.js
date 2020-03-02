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
    progressPromiseAll,
    s,
    splitArray,
    th
} = require('./upd8-util');

// This can 8e changed if you want to output to some other directory. Just make
// sure static files are copied into it too! (Which, ahem. Might 8e a todo.)
const SITE_DIRECTORY = '';

const SITE_TITLE = 'Homestuck Music Wiki';

const SITE_ABOUT = `
    <p>Welcome to my fan-made Homestuck music wiki!</p>
    <p><a href="https://www.homestuck.com/">Homestuck</a> has always been an incredible creative collaboration, and especially beloved by the community and critical in that collaboration is the webcomic and world's humongous soundtrack, comprising well over 500 tracks by dozens of musicians and artists. This wiki aims to be an interesting and useful resource for anyone interested in that music, as well as an archive for all things related.</p>
    <p>Pertaining to the history of this site: it was originally made as a remake of Homestuck's official <a href="https://homestuck.bandcamp.com/">Bandcamp</a>, which saw its content particularly reduced on <a href="https://twitter.com/hamesatron/status/1187842783618297856">10/25/19</a>. This site aims to be a more reliable resource and reference: track art (conspicuously missing from the Bandcamp) is archived here, solo albums (among other missing albums, like <a href="album/squiddles/index.html">Squiddles!</a>) are all indexed in the one place, and URLs will always stay consistent. And of course, also included are links for listening on Bandcamp and other services.</p>
    <p><i>Credits</i></p>
    <ul>
        <li>Florrie: that's me! I programmed most of the site, and put the whole thing together. Say hi to me on twitter (<a href="https://twitter.com/florriestuck">@florriestuck</a>) or reddit (<a href="https://reddit.com/u/towerofnix/">/u/towerofnix</a>)!</li>
        <li><a href="https://homestuck.bandcamp.com/">Homestuck's Bandcamp</a>, the official host of Homestuck's music: I got almost all the album listings and basic track info from here.</li>
        <li>GiovanH's <a href="https://my.pcloud.com/publink/show?code=kZdJQ8kZNyIwh0Hn1ime6Ty7L2J87BE3E2ak">complete track art archive</a>: track art! A million thanks for putting this together and sharing this with me. (Prior to this, I used the <a href="https://web.archive.org/web/20190720035022/https://homestuck.bandcamp.com/music">Web Archive</a> to gather track art.)</li>
        <li><a href="https://recordcrash.com/nsnd.html">NSND</a>: leitmotifs! Thanks to this site in combination with credits on the bandcamp and artists' own commentary, this wiki is a rather comprehensive resource for leitmotifs and other track references.</li>
        <li><a href="https://www.bgreco.net/hsflash.html">bgreco.net (HQ Audio Flashes)</a>: thumbnail captures for the individual Flash animations! There were a couple captures missing that I took myself, but most Flash thumbnails are from here.</a></li>
        <li>The <a href="https://homestuck-and-mspa-music.fandom.com/wiki/Homestuck_and_MSPA_Music_Wiki">Homestuck and MSPA Music Wiki</a> on Fandom: the inspiration for this wiki! I've wanted to make a more complete and explorable wiki ever since seeing it. The Fandom wiki has also been a very handy reference in putting this together, so much thanks to everyone who's worked on it!</li>
        <li>All comments on the site: I appreciate all feedback a lot! People have shared a ton of ideas and suggestions with me, and I <i>cannot</i> emphasize enough how motivating it is to share a project with like-minded folx interested in making it better with you.</li>
    </ul>
`;

const SITE_FEEDBACK = `
    <p><strong>Feature requests? Noticed any errors?</strong> Please let me know! I appreciate feedback a lot, and always want to make this site better.</p>
    <p>The best place to talk about this site is on its <a href="https://forum.homestuck.xyz/viewtopic.php?f=7&t=151">HomestuckXYZ forum thread</a>.</p>
    <p>If you're not one for forums or don't have an account there, you can spam me on <a href="https://twitter.com/florriestuck">Twitter</a>.</p>
    <p>Or, if you're <em>really</em> old fashioned, I've got an email too: towerofnix at gmail dot beans.</p>
    <p>Thank you for sharing your feedback!</p>
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
const LISTING_DIRECTORY = 'list';
const ABOUT_DIRECTORY = 'about';
const FEEDBACK_DIRECTORY = 'feedback';
const FLASH_DIRECTORY = 'flash';

// Might ena8le this later... we'll see! Eventually. May8e.
const ENABLE_ARTIST_AVATARS = false;

const ALBUM_DATA_FILE = 'album.txt';

const CSS_FILE = 'site.css';

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

    const paths = await progressPromiseAll(`Searching for album files.`, albums.map(async album => {
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

function* getSections(lines) {
    // ::::)
    const isSeparatorLine = line => /^-{8,}$/.test(line);
    yield* splitArray(lines, isSeparatorLine);
}

function getBasicField(lines, name) {
    const line = lines.find(line => line.startsWith(name + ':'));
    return line && line.slice(name.length + 1).trim();
};

function getListField(lines, name) {
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

function getContributionField(section, name) {
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

function getMultilineField(lines, name) {
    // All this code is 8asically the same as the getListText - just with a
    // different line prefix (four spaces instead of a dash and a space).
    let startIndex = lines.findIndex(line => line.startsWith(name + ':'));
    if (startIndex === -1) {
        return null;
    }
    startIndex++;
    let endIndex = lines.findIndex((line, index) => index >= startIndex && !line.startsWith('    '));
    if (endIndex === -1) {
        endIndex = lines.length;
    }
    // If there aren't any content lines, don't return anything!
    if (endIndex === startIndex) {
        return null;
    }
    // We also join the lines instead of returning an array.
    const listLines = lines.slice(startIndex, endIndex);
    return listLines.map(line => line.slice(4)).join('\n');
};

function getMultilineHTMLField(lines, name) {
    const text = getMultilineField(lines, name);
    return text && text.split('\n').map(line => line.startsWith('<ul>') ? line : `<p>${line}</p>`).join('\n');
};

function getCommentaryField(lines) {
    const text = getMultilineHTMLField(lines, 'Commentary');
    if (text) {
        const lines = text.split('\n');
        if (!lines[0].includes(':</i>')) {
            return {error: `An entry is missing commentary citation: "${lines[0].slice(0, 40)}..."`};
        }
        return text;
    } else {
        return null;
    }
};

async function processAlbumDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        // This function can return "error o8jects," which are really just
        // ordinary o8jects with an error message attached. I'm not 8othering
        // with error codes here or anywhere in this function; while this would
        // normally 8e 8ad coding practice, it doesn't really matter here,
        // 8ecause this isn't an API getting consumed 8y other services (e.g.
        // translaction functions). If we return an error, the caller will just
        // print the attached message in the output summary.
        return {error: `Could not read ${file} (${error.code}).`};
    }

    // We're pro8a8ly supposed to, like, search for a header somewhere in the
    // al8um contents, to make sure it's trying to 8e the intended structure
    // and is a valid utf-8 (or at least ASCII) file. 8ut like, whatever.
    // We'll just return more specific errors if it's missing necessary data
    // fields.

    const contentLines = contents.split('\n');

    // In this line of code I defeat the purpose of using a generator in the
    // first place. Sorry!!!!!!!!
    const sections = Array.from(getSections(contentLines));

    const albumSection = sections[0];
    const albumName = getBasicField(albumSection, 'Album');
    const albumArtists = getListField(albumSection, 'Artists') || getListField(albumSection, 'Artist');
    const albumDate = getBasicField(albumSection, 'Date');
    const albumCoverArtists = getContributionField(albumSection, 'Cover Art');
    const albumHasTrackArt = (getBasicField(albumSection, 'Has Track Art') !== 'no');
    const albumTrackCoverArtists = getContributionField(albumSection, 'Track Art');
    const albumCommentary = getCommentaryField(albumSection);
    let albumDirectory = getBasicField(albumSection, 'Directory');

    const isFanon = getBasicField(albumSection, 'Canon') === 'Fanon';

    if (albumCoverArtists && albumCoverArtists.error) {
        return albumCoverArtists;
    }

    if (albumCommentary && albumCommentary.error) {
        return albumCommentary;
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
        commentary: albumCommentary,
        directory: albumDirectory,
        isFanon,
        theme: {
            fg: albumColorFG,
            bg: albumColorBG,
            theme: albumTheme
        },
        tracks
    };

    for (const section of sections.slice(1)) {
        // Just skip empty sections. Sometimes I paste a 8unch of dividers,
        // and this lets the empty sections doing that creates (temporarily)
        // exist without raising an error.
        if (!section.filter(Boolean).length) {
            continue;
        }

        const trackName = getBasicField(section, 'Track');
        const trackCommentary = getCommentaryField(section);
        const trackLyrics = getMultilineHTMLField(section, 'Lyrics');
        const originalDate = getBasicField(section, 'Original Date');
        const references = getListField(section, 'References') || [];
        let trackArtists = getListField(section, 'Artists') || getListField(section, 'Artist');
        let trackCoverArtists = getContributionField(section, 'Track Art');
        let trackContributors = getContributionField(section, 'Contributors') || [];
        let trackDirectory = getBasicField(section, 'Directory');

        if (trackContributors.error) {
            return trackContributors;
        }

        if (trackCommentary && trackCommentary.error) {
            return trackCommentary;
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
            if (getBasicField(section, 'Track Art') !== 'none' && albumHasTrackArt) {
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
            commentary: trackCommentary,
            lyrics: trackLyrics,
            references,
            date,
            directory: trackDirectory,
            urls: trackURLs,
            isFanon,
            // 8ack-reference the al8um o8ject! This is very useful for when
            // we're outputting the track pages.
            album: albumData
        });
    }

    return albumData;
}

async function processFlashDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        return {error: `Could not read ${file} (${error.code}).`};
    }

    const contentLines = contents.split('\n');
    const sections = Array.from(getSections(contentLines));

    let act, theme;
    return sections.map(section => {
        if (getBasicField(section, 'ACT')) {
            act = getBasicField(section, 'ACT');
            theme = {
                fg: getBasicField(section, 'FG')
            };
            return {act8r8k: true, act, theme};
        }

        const name = getBasicField(section, 'Flash');
        let page = getBasicField(section, 'Page');
        let date = getBasicField(section, 'Date');
        const jiff = getBasicField(section, 'Jiff');
        const tracks = getListField(section, 'Tracks');

        if (!name) {
            return {error: 'Expected "Flash" (name) field!'};
        }

        if (!page) {
            return {error: 'Expected "Page" field!'};
        }

        if (!date) {
            return {error: 'Expected "Date" field!'};
        }

        if (isNaN(Date.parse(date))) {
            return {error: `Invalid Date field: "${date}"`};
        }

        date = new Date(date);

        if (!tracks) {
            return {error: 'Expected "Tracks" field!'};
        }

        return {name, page, date, tracks, act, theme, jiff};
    });
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

// 8asic function for writing any site page. Handles all the 8asename,
// directory, and site-template shenanigans!
async function writePage(directoryParts, title, body) {
    const directory = path.join(SITE_DIRECTORY, ...directoryParts);
    await mkdirp(directory);
    // This is sort of hard-coded, i.e. we don't do path.join(ROOT_DIRECTORY).
    // May8e that's 8ad? Yes, definitely 8ad. 8ut I'm too lazy to fix it...
    // for now. TM. (Ahem. Still. Soon...may8e. TM. -- Should 8e easier now
    // that we'll have a proper function for writing any page - just appending
    // a ROOT_DIRECTORY should work. Um... okay, fine, I'll do that.)
    await writeFile(path.join(directory, 'index.html'), fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                ${[
                    `<meta charset="utf-8">`,
                    `<title>${title}</title>`,
                    directory !== SITE_DIRECTORY &&
                    directory !== '.' &&
                    `<base href="${path.relative(directory, SITE_DIRECTORY)}">`,
                    `<link rel="stylesheet" href="${CSS_FILE}">`
                ].filter(Boolean).join('\n')}
            </head>
            ${body}
        </html>
    `);
}

function writeMiscellaneousPages(albumData, flashData) {
    return progressPromiseAll('Writing miscellaneous pages.', [
        writePage([], SITE_TITLE, fixWS`
            <body id="top-index">
                <div id="content">
                    <h1>${SITE_TITLE}</h1>
                    <div id="intro-menu">
                        <p>Explore the site!</p>
                        <a href="${LISTING_DIRECTORY}/index.html">Listings</a>
                        <a href="${FLASH_DIRECTORY}/index.html">Flashes</a>
                        <a href="${ABOUT_DIRECTORY}/index.html">About &amp; Credits</a>
                        <a href="${FEEDBACK_DIRECTORY}/index.html">Feedback</a>
                        <p>...or choose an album:</p>
                    </div>
                    <h2>Fandom</h2>
                    <div class="grid-listing">
                        ${albumData.filter(album => album.isFanon).reverse().map(album => fixWS`
                            <a class="grid-item" href="${ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">
                                <img src="${getAlbumCover(album)}">
                                <span>${album.name}</span>
                            </a>
                        `).join('\n')}
                        <a class="grid-item" href="#" style="--fg-color: #ffffff">...and more to be added soon</a>
                    </div>
                    <h2>Official</h2>
                    <div class="grid-listing">
                        ${albumData.filter(album => !album.isFanon).reverse().map(album => fixWS`
                            <a class="grid-item" href="${ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">
                                <img src="${getAlbumCover(album)}">
                                <span>${album.name}</span>
                            </a>
                        `).join('\n')}
                    </div>
                </div>
            </body>
        `),
        writePage([FLASH_DIRECTORY], `Flashes`, fixWS`
            <body id="top-index">
                <div id="content">
                    <h1>Flashes</h1>
                    <div id="intro-menu">
                        <a href="index.html">Home</a>
                        <a href="${LISTING_DIRECTORY}/index.html">Listings</a>
                        <a href="${ABOUT_DIRECTORY}/index.html">About &amp; Credits</a>
                        <a href="${FEEDBACK_DIRECTORY}/index.html">Feedback</a>
                    </div>
                    <div class="long-content">
                        <p>Also check out:</p>
                        <ul>
                            <li>Bambosh's <a href="https://www.youtube.com/watch?v=AEIOQN3YmNc">[S]Homestuck - All flashes</a>: an excellently polished compilation of all Flash animations in Homestuck.</li>
                            <li>bgreco.net's <a href="https://www.bgreco.net/hsflash.html">Homestuck HQ Audio Flashes</a>: an index of all HS Flash animations with Bandcamp-quality audio built in. (Also the source for many thumbnails below!)</li>
                        </ul>
                    </div>
                    <div class="grid-listing">
                        ${flashData.map(flash => flash.act8r8k ? fixWS`
                            <h2 style="${getThemeString(flash.theme)}"><a href="${FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => f.page && f.act === flash.act))}/index.html">${flash.act}</a></h2>
                        ` : fixWS`
                            <a class="grid-item" href="${FLASH_DIRECTORY}/${getFlashDirectory(flash)}/index.html" style="${getThemeString(flash.theme)}">
                                <img src="${getFlashCover(flash)}">
                                <span>${flash.name}</span>
                            </a>
                        `).join('\n')}
                    </div>
                </div>
            </body>
        `),
        writePage([ABOUT_DIRECTORY], 'About &amp; Credits', fixWS`
            <body>
                <div id="content">
                    <div class="long-content">
                        <h1>${SITE_TITLE}</h1>
                        <p><a href="index.html">(Home)</a></p>
                        ${SITE_ABOUT}
                    </div>
                </div>
            </body>
        `),
        writePage([FEEDBACK_DIRECTORY], 'Feedback!', fixWS`
            <body>
                <div id="content">
                    <div class="long-content">
                        <h1>Feedback!</h1>
                        <p><a href="index.html">(Home)</a></p>
                        ${SITE_FEEDBACK}
                    </div>
                </div>
            </body>
        `)
    ]);
}

// This function title is my gr8test work of art.
function writeIndexAndTrackPagesForAlbum(album, albumData, flashData) {
    return [
        writeAlbumPage(album, albumData),
        ...album.tracks.map(track => writeTrackPage(track, albumData, flashData))
    ];
}

async function writeAlbumPage(album, albumData) {
    const allTracks = getAllTracks(albumData);
    await writePage([ALBUM_DIRECTORY, album.directory], album.name, fixWS`
        <body style="${getThemeString(album.theme)}">
            <div id="sidebar">
                ${generateSidebarForAlbum(album)}
            </div>
            <div id="content">
                <a id="cover-art" href="${getAlbumCover(album)}"><img src="${getAlbumCover(album)}"></a>
                <h1>${album.name}</h1>
                <p>
                    ${album.artists && `By ${getArtistString(album.artists, albumData)}.<br>`}
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
                                <span class="by">by ${getArtistString(track.artists, albumData)}</span>
                            `}
                        </li>
                    `).join('\n')}
                </ol>
                ${album.commentary && fixWS`
                    <p>Artist commentary:</p>
                    <blockquote>
                        ${album.commentary}
                    </blockquote>
                `}
            </div>
        </body>
    `);
}

async function writeTrackPage(track, albumData, flashData) {
    const artistNames = getArtistNames(albumData);
    const allTracks = getAllTracks(albumData);
    const tracksThatReference = getTracksThatReference(track, allTracks);
    const ttrFanon = tracksThatReference.filter(t => t.isFanon);
    const ttrCanon = tracksThatReference.filter(t => !t.isFanon);
    const tracksReferenced = getTracksReferencedBy(track, allTracks);
    const flashesThatFeature = getFlashesThatFeature(track, allTracks, flashData);
    await writePage([TRACK_DIRECTORY, track.directory], track.name, fixWS`
        <body style="${getThemeString(track.album.theme)}">
            <div id="sidebar">
                ${generateSidebarForAlbum(track.album, track)}
            </div>
            <div id="content">
                <a href="${getTrackCover(track)}" id="cover-art"><img src="${getTrackCover(track)}"></a>
                <h1>${track.name}</h1>
                <p>
                    By ${getArtistString(track.artists, albumData)}.<br>
                    ${track.coverArtists && `Cover art by ${joinNoOxford(track.coverArtists.map(({ who, what }) => fixWS`
                        <a href="${ARTIST_DIRECTORY}/${getArtistDirectory(who)}/index.html">${who}</a>${what && ` (${getContributionString({what}, allTracks)})`}
                    `))}.<br>`}
                    Released ${getDateString(track)}.
                </p>
                <p>Listen on ${joinNoOxford(track.urls.map(url => fixWS`
                    <a href="${url}">${
                        url.includes('bandcamp.com') ? 'Bandcamp' :
                        url.includes('youtu') ? 'YouTube' :
                        url.includes('soundcloud') ? 'SoundCloud' :
                        '(External)'
                    }</a>
                `), 'or')}.</p>
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
                ${tracksReferenced.length && fixWS`
                    <p>Tracks that <i>${track.name}</i> references:</p>
                    <ul>
                        ${tracksReferenced.map(track => fixWS`
                            <li>
                                <a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                                <span class="by">by ${getArtistString(track.artists, albumData)}</span>
                            </li>
                        `).join('\n')}
                    </ul>
                `}
                ${tracksThatReference.length && fixWS`
                    <p>Tracks that reference <i>${track.name}</i>:</p>
                    <dl>
                        ${ttrCanon.length && fixWS`
                            <dt>Official:</dt>
                            <dd><ul>
                                ${ttrCanon.map(track => fixWS`
                                    <li>
                                        <a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                                        <span class="by">by ${getArtistString(track.artists, albumData)}</span>
                                    </li>
                                `).join('\n')}
                            </ul></dd>
                        `}
                        ${ttrFanon.length && fixWS`
                            <dt>Fandom:</dt>
                            <dd><ul>
                                ${ttrFanon.map(track => fixWS`
                                    <li>
                                        <a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                                        <span class="by">by ${getArtistString(track.artists, albumData)}</span>
                                    </li>
                                `).join('\n')}
                            </ul></dd>
                        `}
                    </dl>
                `}
                ${flashesThatFeature.length && fixWS`
                    <p>Flashes that feature <i>${track.name}</i>:</p>
                    <ul>
                        ${flashesThatFeature.map(flash => `<li>${getFlashLinkHTML(flash)}</li>`).join('\n')}
                    </ul>
                `}
                ${track.lyrics && fixWS`
                    <p>Lyrics:</p>
                    <blockquote>
                        ${track.lyrics}
                    </blockquote>
                `}
                ${track.commentary && fixWS`
                    <p>Artist commentary:</p>
                    <blockquote>
                        ${track.commentary}
                    </blockquote>
                `}
            </div>
        </body>
    `);
}

async function writeArtistPages(albumData, flashData) {
    await progressPromiseAll('Writing artist pages.', getArtistNames(albumData).map(artistName => writeArtistPage(artistName, albumData, flashData)));
}

async function writeArtistPage(artistName, albumData, flashData) {
    const allTracks = getAllTracks(albumData);
    const tracks = sortByDate(allTracks.filter(track => (
        track.artists.includes(artistName) ||
        track.contributors.some(({ who }) => who === artistName)
    )));
    const artThings = sortByDate(albumData.concat(allTracks).filter(thing => (thing.coverArtists || []).some(({ who }) => who === artistName)));
    const commentaryThings = sortByDate(albumData.concat(allTracks).filter(thing => thing.commentary && thing.commentary.includes('<i>' + artistName + ':</i>')));

    // Shish!
    const kebab = getArtistDirectory(artistName);
    const index = `${ARTIST_DIRECTORY}/${kebab}/index.html`;
    await writePage([ARTIST_DIRECTORY, kebab], artistName, fixWS`
        <body>
            <div id="content">
                ${ENABLE_ARTIST_AVATARS && await access(path.join(ARTIST_AVATAR_DIRECTORY, kebab + '.jpg')).then(() => true, () => false) && fixWS`
                    <a id="cover-art" href="${ARTIST_AVATAR_DIRECTORY}/${getArtistDirectory(artistName)}.jpg"><img src="${ARTIST_AVATAR_DIRECTORY}/${getArtistDirectory(artistName)}.jpg"></a>
                `}
                <h1>${artistName}</h1>
                <p>Jump to: ${[
                    tracks.length && `<a href="${index}#tracks">Tracks</a>`,
                    artThings.length && `<a href="${index}#art">Art</a>`,
                    commentaryThings.length && `<a href="${index}#commentary">Commentary</a>`
                ].filter(Boolean).join(', ')}</p>
                ${tracks.length && fixWS`
                    <h2 id="tracks">Tracks</h2>
                    ${albumChunkedList(tracks, (track, i) => {
                        const contrib = {
                            who: artistName,
                            what: track.contributors.filter(({ who }) => who === artistName).map(({ what }) => what).join(', ')
                        };
                        const flashes = getFlashesThatFeature(track, allTracks, flashData);
                        return fixWS`
                            <li title="${th(i + 1)} track by ${artistName}; ${th(track.album.tracks.indexOf(track) + 1)} in ${track.album.name}">
                                <a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                                ${track.artists.includes(artistName) && track.artists.length > 1 && `<span class="contributed">(with ${getArtistString(track.artists.filter(a => a !== artistName), albumData)})</span>`}
                                ${contrib.what && `<span class="contributed">(${getContributionString(contrib, tracks) || 'contributed'})</span>`}
                                ${flashes.length && `<br><span class="flashes">(Featured in ${joinNoOxford(flashes.map(getFlashLinkHTML))})</span></br>`}
                            </li>
                        `;
                    })}
                `}
                ${artThings.length && fixWS`
                    <h2 id="art">Art</h2>
                    ${albumChunkedList(artThings, (thing, i) => {
                        const contrib = thing.coverArtists.find(({ who }) => who === artistName);
                        return fixWS`
                            <li title="${th(i + 1)} art by ${artistName}${thing.album && `; ${th(thing.album.tracks.indexOf(thing) + 1)} track in ${thing.album.name}`}">
                                ${thing.album ? fixWS`
                                    <a href="${TRACK_DIRECTORY}/${thing.directory}/index.html" style="${getThemeString(thing.album.theme)}">${thing.name}</a>
                                ` : '<i>(cover art)</i>'}
                                ${contrib.what && `<span class="contributed">(${getContributionString(contrib, tracks)})</span>`}
                            </li>
                        `;
                    })}
                `}
                ${commentaryThings.length && fixWS`
                    <h2 id="commentary">Commentary</h2>
                    ${albumChunkedList(commentaryThings, thing => {
                        const flashes = getFlashesThatFeature(thing, allTracks, flashData);
                        return fixWS`
                            <li>
                                ${thing.album ? fixWS`
                                    <a href="${TRACK_DIRECTORY}/${thing.directory}/index.html" style="${getThemeString(thing.album.theme)}">${thing.name}</a>
                                ` : '(album commentary)'}
                                ${flashes.length && `<br><span class="flashes">(Featured in ${joinNoOxford(flashes.map(getFlashLinkHTML))})</span></br>`}
                            </li>
                        `
                    }, false)}
                    </ul>
                `}
            </div>
        </body>
    `);
}

function albumChunkedList(tracks, getLI, showDate = true) {
    const getAlbum = thing => thing.album ? thing.album : thing;
    return fixWS`
        <dl>
            ${tracks.map((thing, i) => {
                const li = getLI(thing, i);
                const album = getAlbum(thing);
                if (i === 0 || album !== getAlbum(tracks[i - 1]) || (showDate && +thing.date !== +tracks[i - 1].date)) {
                    const heading = fixWS`
                        <dt>
                            <a href="${ALBUM_DIRECTORY}/${getAlbum(thing).directory}/index.html" style="${getThemeString(getAlbum(thing).theme)}">${getAlbum(thing).name}</a>
                            ${showDate && `(${getDateString(thing)})`}
                        </dt>
                        <dd><ul>
                    `;
                    if (i > 0) {
                        return ['</ul></dd>', heading, li];
                    } else {
                        return [heading, li];
                    }
                } else {
                    return [li];
                }
            }).reduce((acc, arr) => acc.concat(arr), []).join('\n')}
        </dl>
    `;
}

async function writeFlashPages(albumData, flashData) {
    await progressPromiseAll('Writing Flash pages.', flashData.map(flash => flash.page && writeFlashPage(flash, albumData, flashData)).filter(Boolean));
}

async function writeFlashPage(flash, albumData, flashData) {
    const allTracks = getAllTracks(albumData);
    const kebab = getFlashDirectory(flash);
    const index = `${FLASH_DIRECTORY}/${kebab}/index.html`;
    const act6 = flashData.findIndex(f => f.act.startsWith('Act 6'))
    const side = (flashData.indexOf(flash) < act6) ? 1 : 2
    await writePage([FLASH_DIRECTORY, kebab], flash.name, fixWS`
        <body style="${getThemeString(flash.theme)}">
            <div id="sidebar">
                <h2><a href="index.html">(Home)</a></h2>
                <hr>
                <h1><a href="${FLASH_DIRECTORY}/index.html">Flashes</a></h1>
                <dl>
                    ${flashData.filter(f => f.act8r8k).map(({ act, theme }) => fixWS`
                        ${act.startsWith('Act 1') && fixWS`
                            <dt class="side ${side === 1 && 'current'}"><a href="${FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => f.page && f.act.startsWith('Act 1')))}/index.html" style="--fg-color: #4ac925">Side 1 (Acts 1-5)</a></dt>
                        `}
                        ${act.startsWith('Act 6 Act 1') && fixWS`
                            <dt class="side ${side === 2 && 'current'}"><a href="${FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => f.page && f.act.startsWith('Act 6')))}/index.html" style="--fg-color: #1076a2">Side 2 (Acts 6-7)</a></dt>
                        `}
                        ${(flashData.findIndex(f => f.act === act) < act6 ? (side === 1) : (side === 2)) && `<dt class="${act === flash.act ? 'current' : ''}"><a href="${FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => f.page && f.act === act))}/index.html" style="${getThemeString(theme)}">${act}</a></dt>`}
                        ${act === flash.act && fixWS`
                            <dd><ul>
                                ${flashData.filter(f => f.page && f.act === act).map(f => fixWS`
                                    <li class="${f === flash ? 'current' : ''}">
                                        <a href="${FLASH_DIRECTORY}/${getFlashDirectory(f)}/index.html" style="${getThemeString(f.theme)}">${f.name}</a>
                                    </li>
                                `).join('\n')}
                            </ul></dd>
                        `}
                    `).join('\n')}
                </dl>
            </div>
            <div id="content">
                <h1>${flash.name}</h1>
                <a id="cover-art" href="${getFlashCover(flash)}"><img src="${getFlashCover(flash)}"></a>
                <p>Released ${getDateString(flash)}.</p>
                <p>Play on <a href="${getFlashLink(flash)}">Homestuck</a> (${isNaN(Number(flash.page)) ? 'secret page' : `page ${flash.page}`}).</p>
                <p>Tracks featured in <i>${flash.name.replace(/\.$/, '')}</i>:</p>
                <ul>
                    ${flash.tracks.map(ref => {
                        const track = getLinkedTrack(ref, allTracks);
                        const neighm = ref.match(/(.*?\S):/) || [ref, ref];
                        if (track) {
                            return fixWS`
                                <li>
                                    <a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${neighm[1]}</a>
                                    <span class="by">by ${getArtistString(track.artists, albumData)}</span>
                                </li>
                            `;
                        } else {
                            const by = ref.match(/\(by .*\)/);
                            if (by) {
                                const name = ref.replace(by, '').trim();
                                const who = by[0].replace(/\(by |\)/g, '').split(',').map(w => w.trim());
                                return `<li>${name} <span class="by">by ${getArtistString(who, albumData)}</span></li>`;
                            } else {
                                return `<li>${ref}</li>`;
                            }
                        }
                    }).join('\n')}
                </ul>
            </div>
        </body>
    `);
}

function writeListingPages(albumData) {
    const allArtists = getArtistNames(albumData).sort();
    const allTracks = getAllTracks(albumData);

    const getArtistNumContributions = artistName => [
        ...allTracks.filter(track =>
            track.artists.includes(artistName) ||
            [...track.contributors, ...track.coverArtists || []].some(({ who }) => who === artistName)),
        ...albumData.filter(album =>
            (album.coverArtists || []).some(({ who }) => who === artistName))
    ].length;

    const getArtistNumCommentary = artistName => albumData.concat(allTracks)
        .filter(thing => thing.commentary && thing.commentary.includes('<i>' + artistName + ':</i>')).length;

    const getAlbumLI = (album, extraText = '') => fixWS`
        <li>
            <a href="${ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">${album.name}</a>
            ${extraText}
        </li>
    `;

    const getArtistLI = artistName => fixWS`
        <li>
            <a href="${ARTIST_DIRECTORY}/${getArtistDirectory(artistName)}/index.html">${artistName}</a>
            (${getArtistNumContributions(artistName)} <abbr title="contributions (to music & art)">c.</abbr>)
        </li>
    `;

    const sortByName = (a, b) => {
        const an = a.name.toLowerCase();
        const bn = b.name.toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
    };

    const listingDescriptors = [
        [['albums', 'by-name'], `Albums - by Name`, albumData.slice()
            .sort(sortByName)
            .map(album => getAlbumLI(album, `(${album.tracks.length} tracks)`))],
        [['albums', 'by-date'], `Albums - by Date`, sortByDate(albumData.slice())
            .map(album => getAlbumLI(album, `(${getDateString(album)})`))],
        [['albums', 'by-tracks'], `Albums - by Tracks`, albumData.slice()
            .sort((a, b) => b.tracks.length - a.tracks.length)
            .map(album => getAlbumLI(album, `(${album.tracks.length} tracks)`))],
        [['artists', 'by-name'], `Artists - by Name`, allArtists
            .map(name => ({name}))
            .sort(sortByName)
            .map(({ name }) => name)
            .map(getArtistLI)],
        [['artists', 'by-commentary'], `Artists - by Commentary`, allArtists
            .map(name => ({name, commentary: getArtistNumCommentary(name)}))
            .filter(({ commentary }) => commentary > 0)
            .sort((a, b) => b.commentary - a.commentary)
            .map(({ name, commentary }) => fixWS`
                <li>
                    <a href="${ARTIST_DIRECTORY}/${getArtistDirectory(name)}/index.html#commentary">${name}</a>
                    (${commentary} ${commentary === 1 ? 'entry' : 'entries'})
                </li>
            `)],
        [['artists', 'by-contribs'], `Artists - by Contributions`, allArtists
            .map(name => ({name, contribs: getArtistNumContributions(name)}))
            .sort((a, b) => b.contribs - a.contribs)
            .map(({ name }) => name)
            .map(getArtistLI)],
        [['tracks', 'by-name'], `Tracks - by Name`, allTracks.slice()
            .sort(sortByName)
            .map(track => fixWS`
                <li><a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
            `)],
        [['tracks', 'by-album'], `Tracks - by Album`, fixWS`
                <dl>
                    ${albumData.map(album => fixWS`
                        <dt><a href="${ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">${album.name}</a></dt>
                        <dd><ol>
                            ${album.tracks.map(track => fixWS`
                                <li><a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
                            `).join('\n')}
                        </ol></dd>
                    `).join('\n')}
                </dl>
            `],
        [['tracks', 'by-date'], `Tracks - by Date`, albumChunkedList(
            sortByDate(allTracks.slice()),
            track => fixWS`
                <li><a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
            `)],
        [['tracks', 'with-lyrics'], `Tracks - with Lyrics`, albumChunkedList(
            sortByDate(allTracks.slice())
            .filter(track => track.lyrics),
            track => fixWS`
                <li><a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
            `)]
    ];

    const getWordCount = str => {
        const wordCount = str.split(' ').length;
        return `${Math.floor(wordCount / 100) / 10}k`;
    };

    return progressPromiseAll(`Writing listing pages.`, [
        writePage([LISTING_DIRECTORY], `Listings Index`, fixWS`
            <body>
                ${generateSidebarForListings(listingDescriptors)}
                <div id="content">
                    <h1>Listings</h1>
                    <p>Feel free to explore any of the listings linked in the sidebar!</p>
                </div>
            </body>
        `),
        writePage([LISTING_DIRECTORY, 'all-commentary'], 'All Commentary', fixWS`
            <body>
                ${generateSidebarForListings(listingDescriptors, 'all-commentary')}
                <div id="content">
                    <h1>All Commentary</h1>
                    <p><strong>${getWordCount(albumData.reduce((acc, a) => acc + [a, ...a.tracks].filter(x => x.commentary).map(x => x.commentary).join(' '), ''))}</strong> words, in all.<br>Jump to a particular album:</p>
                    <ul>
                        ${sortByDate(albumData.slice())
                            .filter(album => [album, ...album.tracks].some(x => x.commentary))
                            .map(album => fixWS`
                                <li>
                                    <a href="${LISTING_DIRECTORY}/all-commentary/index.html#${album.directory}" style="${getThemeString(album.theme)}">${album.name}</a>
                                    (${(() => {
                                        const things = [album, ...album.tracks];
                                        const cThings = things.filter(x => x.commentary);
                                        // const numStr = album.tracks.every(t => t.commentary) ? 'full commentary' : `${cThings.length} entries`;
                                        const numStr = `${cThings.length}/${things.length} entries`;
                                        return `${numStr}; ${getWordCount(cThings.map(x => x.commentary).join(' '))} words`;
                                    })()})
                                </li>
                            `)
                            .join('\n')
                        }
                    </ul>
                    ${sortByDate(albumData.slice())
                        .map(album => [album, ...album.tracks])
                        .filter(x => x.some(y => y.commentary))
                        .map(([ album, ...tracks ]) => fixWS`
                            <h2 id="${album.directory}"><a href="${ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">${album.name}</a></h2>
                            <blockquote>
                                ${album.commentary}
                            </blockquote>
                            ${tracks.filter(t => t.commentary).map(track => fixWS`
                                <h3 id="${track.directory}"><a href="${TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(album.theme)}">${track.name}</a></h3>
                                <blockquote>
                                    ${track.commentary}
                                </blockquote>
                            `).join('\n')}
                        `)
                        .join('\n')
                    }
                </div>
            </body>
        `),
        ...listingDescriptors.map(entry => writeListingPage(...entry, listingDescriptors))
    ]);
}

function writeListingPage(directoryParts, title, items, listingDescriptors) {
    return writePage([LISTING_DIRECTORY, ...directoryParts], title, fixWS`
        <body>
            ${generateSidebarForListings(listingDescriptors, directoryParts)}
            <div id="content">
                <h1>${title}</h1>
                ${typeof items === 'string' ? items : fixWS`
                    <ul>
                        ${items.join('\n')}
                    </ul>
                `}
            </div>
        </body>
    `);
}

function generateSidebarForListings(listingDescriptors, currentDirectoryParts) {
    return fixWS`
        <div id="sidebar">
            <h2><a href="index.html">(Home)</a></h2>
            <hr>
            <h1><a href="${LISTING_DIRECTORY}/index.html">Listings</a></h1>
            <ul>
                ${listingDescriptors.map(([ ldDirectoryParts, ldTitle ]) => fixWS`
                    <li class="${currentDirectoryParts === ldDirectoryParts && 'current'}">
                        <a href="${LISTING_DIRECTORY}/${ldDirectoryParts.join('/')}/index.html">${ldTitle}</a>
                    </li>
                `).join('\n')}
                <li class="${currentDirectoryParts === 'all-commentary' && 'current'}">
                    <a href="${LISTING_DIRECTORY}/all-commentary/index.html">All Commentary</a>
                </li>
            </ul>
        </div>
    `;
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

function getTracksThatReference(track, allTracks) {
    return allTracks.filter(t => getTracksReferencedBy(t, allTracks).includes(track));
}

function getTracksReferencedBy(track, allTracks) {
    return track.references.map(ref => getLinkedTrack(ref, allTracks)).filter(Boolean);
}

function getLinkedTrack(ref, allTracks) {
    const match = ref.match(/\S:(.*)/);
    if (match) {
        const dir = match[1];
        return allTracks.find(track => track.directory === dir);
    } else {
        return allTracks.find(track => track.name === ref);
    }
}

function getFlashesThatFeature(track, allTracks, flashData) {
    return flashData.filter(flash => flash.tracks && flash.tracks.map(t => getLinkedTrack(t, allTracks)).includes(track));
}

function getArtistString(artists, albumData) {
    const artistNames = getArtistNames(albumData);
    return joinNoOxford(artists.map(artist => {
        if (artistNames.includes(artist)) {
            return fixWS`
                <a href="${ARTIST_DIRECTORY}/${getArtistDirectory(artist)}/index.html">${artist}</a>
            `;
        } else {
            return artist;
        }
    }));
}

function getThemeString({fg, bg, theme}) {
    return [
        [fg, `--fg-color: ${fg}`],
        [bg, `--bg-color: ${bg}`],
        [theme, `--theme: ${theme + ''}`]
    ].filter(pair => pair[0] !== undefined).map(pair => pair[1]).join('; ');
}

// Terri8le hack: since artists aren't really o8jects and don't have proper
// "directories", we just reformat the artist's name.
function getArtistDirectory(artistName) {
    return getKebabCase(artistName);
}

function getFlashDirectory(flash) {
    // const kebab = getKebabCase(flash.name.replace('[S] ', ''));
    // return flash.page + (kebab ? '-' + kebab : '');
    return '' + flash.page;
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
                <li class="${track === currentTrack ? 'current' : ''}"><a href="${TRACK_DIRECTORY}/${track.directory}/index.html">${track.name}</a></li>
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
// future self: these only work from two levels a8ove the root directory.
// "O8viously," if you look at their implementation, 8ut if you don't... yeah.
// You won't 8e a8le to call these for use in the lower level files.
// ACTUALLY this means I really should just use a <base> element, which yes, I
// have done 8efore (on my 8log). That way all HTML files have the same root
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
function getFlashCover(flash) {
    return `${FLASH_DIRECTORY}/${flash.page}.${flash.jiff === 'Yeah' ? 'gif' : 'png'}`;
}

function getFlashLink(flash) {
    return `https://homestuck.com/story/${flash.page}`;
}

function getFlashLinkHTML(flash) {
    return `<a href="${FLASH_DIRECTORY}/${getFlashDirectory(flash)}/index.html" title="Page ${flash.page}" style="${getThemeString(flash.theme)}">${flash.name}</a>`;
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
    const albumData = await progressPromiseAll(`Reading & processing album files.`, albumDataFiles.map(processAlbumDataFile));

    sortByDate(albumData);

    const errors = albumData.filter(obj => obj.error);
    if (errors.length) {
        for (const error of errors) {
            console.log(`\x1b[31;1m${error.error}\x1b[0m`);
        }
        return;
    }

    const flashData = await processFlashDataFile(path.join(FLASH_DIRECTORY, 'flashes.txt'));
    if (flashData.error) {
        console.log(`\x1b[31;1m${flashData.error}\x1b[0m`);
        return;
    }

    const flashErrors = flashData.filter(obj => obj.error);
    if (flashErrors.length) {
        for (const error of flashErrors) {
            console.log(`\x1b[31;1m${error.error}\x1b[0m`);
        }
        return;
    }

    await writeMiscellaneousPages(albumData, flashData);
    await progressPromiseAll(`Writing album & track pages.`, albumData.map(album => writeIndexAndTrackPagesForAlbum(album, albumData, flashData)).reduce((a, b) => a.concat(b)));
    await writeArtistPages(albumData, flashData);
    await writeListingPages(albumData);
    await writeFlashPages(albumData, flashData);

    /*
    const allTracks = getAllTracks(albumData)
    const track = albumData.find(album => album.name === 'Homestuck Vol. 6: Heir Transparent').tracks[0];
    console.log(getFlashesThatFeature(track, allTracks, flashData));
    console.log(getLinkedTrack('Frost:frost-vol6', allTracks));
    */

    // The single most important step.
    console.log('Written!');
}

main().catch(error => console.error(error));
