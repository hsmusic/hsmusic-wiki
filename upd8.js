// HEY N8RDS!
//
// This is one of the 8ACKEND FILES. It's not used anywhere on the actual site
// you are pro8a8ly using right now.
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
    cacheOneArg,
    decorateTime,
    joinNoOxford,
    progressPromiseAll,
    queue,
    s,
    splitArray,
    th
} = require('./upd8-util');

const C = require('./common');

// This can 8e changed if you want to output to some other directory. Just make
// sure static files are copied into it too! (Which, ahem. Might 8e a todo.)
// const C.SITE_DIRECTORY = '';

const SITE_TITLE = 'Homestuck Music Wiki';

const SITE_ABOUT = fixWS`
    <p>Welcome to my fan-made Homestuck music wiki!</p>
    <p><a href="https://www.homestuck.com/">Homestuck</a> has always been an incredible creative collaboration, and especially beloved by the community and critical in that collaboration is the webcomic and world's humongous soundtrack, comprising well over 500 tracks by dozens of musicians and artists. This wiki aims to be an interesting and useful resource for anyone interested in that music, as well as an archive for all things related.</p>
    <p>Pertaining to the history of this site: it was originally made as a remake of Homestuck's official <a href="https://homestuck.bandcamp.com/">Bandcamp</a>, which saw its content particularly reduced on <a href="https://twitter.com/hamesatron/status/1187842783618297856">10/25/19</a>. This site aims to be a more reliable resource and reference: track art (conspicuously missing from the Bandcamp) is archived here, solo albums (among other missing albums, like <a href="album/squiddles/index.html">Squiddles!</a>) are all indexed in the one place, and URLs will always stay consistent. And of course, also included are links for listening on Bandcamp and other services.</p>
    <p>The code for this website is open source (GPL-3.0), and can be explored or forked <a href="https://github.com/hsmusic/hsmusic.github.io/">here</a>. I don't actively keep track of issues or PRs raised there; if you want to get in touch with feature requests or comments on the code, my contact info is <a href="feedback/index.html">here</a>!</p>
    <p><i>Resource &amp; Author Credits</i></p>
    <ul>
        <li>Florrie: that's me! I programmed most of the site, and put the whole thing together. <a href="feedback/index.html">Say hi</a>!</li>
        <li><a href="https://homestuck.bandcamp.com/">Homestuck's Bandcamp</a>, the official host of Homestuck's music: I got almost all the official album listings and basic track info from here.</li>
        <li>GiovanH's <a href="https://my.pcloud.com/publink/show?code=kZdJQ8kZNyIwh0Hn1ime6Ty7L2J87BE3E2ak">complete track art archive</a>: track art! A million thanks for putting this together and sharing this with me. (Prior to this, I used the <a href="https://web.archive.org/web/20190720035022/https://homestuck.bandcamp.com/music">Web Archive</a> to gather track art.)</li>
        <li><a href="https://homestuck.net/music/references.html">NSND</a>: leitmotifs! Thanks to this site in combination with credits on the bandcamp and artists' own commentary, this wiki is a rather comprehensive resource for leitmotifs and other track references.</li>
        <li><a href="https://www.bgreco.net/hsflash.html">bgreco.net (HQ Audio Flashes)</a>: thumbnail captures for the individual Flash animations! There were a couple captures missing that I took myself, but most Flash thumbnails are from here.</a></li>
        <li>The <a href="https://homestuck-and-mspa-music.fandom.com/wiki/Homestuck_and_MSPA_Music_Wiki">Homestuck and MSPA Music Wiki</a> on Fandom: the inspiration for this wiki! I've wanted to make a more complete and explorable wiki ever since seeing it. The Fandom wiki has also been a very handy reference in putting this together, so much thanks to everyone who's worked on it!</li>
        <li>All organizers and contributors of the <a href="https://sollay-b.tumblr.com/post/188094230423/hello-a-couple-of-years-ago-allyssinian">Homestuck Vol. 5 Anthology</a> - community-made track art for <a href="album/homestuck-vol-5/index.html">Homestuck Vol. 5</a>! All of this art is <i>excellent</i>. Each track credits its respective cover artist.</li>
        <li>Likewise for the <a href="https://hsfanmusic.skaia.net/post/619761136023257089/unofficialmspafans-we-are-proud-to-announce-the">Beyond Canon Track Art Anthology</a>!</li>
        <li>All comments on the site: I appreciate all feedback a lot! People have shared a ton of ideas and suggestions with me, and I <i>cannot</i> emphasize enough how motivating it is to share a project with like-minded folx interested in making it better with you.</li>
    </ul>
    <p><i>Feature Acknowledgements</i></p>
    <ul>
        <li><b>Thank you,</b> GiovanH, for linking me to a resource for higher quality cover art, and bringing to my attention the fact that clicking a cover art on Bandcamp to zoom in will often reveal a higher quality image.</li>
        <li>cosmogonicalAuthor, for a variety of feature requests and comments! In particular: improving way the track list on author pages is sorted; expanding the introduction; expanding the introduction message to the website; and linking bonus art for Homestuck Vol. 5 - plus a few other good suggestions I haven't gotten to yet. Thanks!</li>
        <li>Monckat, for suggesting the album Strife 2 before I'd begun adding fandom-created albums and unofficial releases to this wiki.</li>
        <li>Kidpen, for suggesting the "Flashes that feature this track" feature.</li>
        <li>an emailer, for suggesting the "Random track" feature.</li>
        <li>foreverFlumoxed, for pointing out that <a href="flash/338/index.html">[S] ==&gt;</a> contains reference to <a href="track/john-do-the-windy-thing/index.html">JOHN DO THE WINDY THING</a> (this reminded me to add all the unreleased Flash tracks to the Unreleased Tracks album!), and for going to the massive effort of checking every track page and pointing out a bunch of missing cover arts and title typos!</li>
        <li>Makin, for various initial help in data collection (especially commentary) and lifting the site off the ground by pinning it to the top of the /r/homestuck subreddit for a while, and for linking me the independent release of <a href="https://jamesdever.bandcamp.com/album/sburb">Sburb</a>.</li>
        <li>an emailer, for sending a crop of the YT thumbnail art for <a href="track/after-the-sun/index.html">After the Sun</a> (plus the SoundCloud link for that track).</li>
        <li>Thanks for pointing out typos, errors in reference lists, and out of date details: cookiefonster, foreverFlummoxed.</li>
    </ul>
`;

const SITE_CHANGELOG = fs.readFileSync('changelog.html').toString().trim(); // fight me bro

const SITE_FEEDBACK = fixWS`
    <p><strong>Feature requests? Noticed any errors?</strong> Please let me know! I appreciate feedback a lot, and always want to make this site better.</p>
    <p>The best place to talk about this site is on its <a href="https://forum.homestuck.xyz/viewtopic.php?f=7&t=151">HomestuckXYZ forum thread</a>.</p>
    <p>Or, if forums aren't really the thing for you, I've got an email too: towerofnix at gmail dot beans. (You know the domain.)</p>
    <p>I used to have a Twitter account, but Twitter is bad and poofing from it was probably my greatest decision.</p>
    <p>Thank you for sharing your feedback!</p>
`;

const SITE_JS_DISABLED = fixWS`
    <p>Sorry, that link won't work unless you're running a web browser that supports relatively modern JavaScript.</p>
    <p>Please press the back button to get where you were, or <a href="index.html">head back to the index</a>.</p>
`;

// Might ena8le this later... we'll see! Eventually. May8e.
const ENABLE_ARTIST_AVATARS = false;
const ARTIST_AVATAR_DIRECTORY = 'artist-avatar';

const ALBUM_DATA_FILE = 'album.txt';    // /album/*/$.txt
const ARTIST_DATA_FILE = 'artists.txt'; // /$.txt
const FLASH_DATA_FILE = 'flashes.txt';  // /$.txt

const CSS_FILE = 'site.css';

// Shared varia8les! These are more efficient to access than a shared varia8le
// (or at least I h8pe so), and are easier to pass across functions than a
// 8unch of specific arguments.
//
// Upd8: Okay yeah these aren't actually any different. Still cleaner than
// passing around a data object containing all this, though.
let albumData;
let allTracks;
let flashData;

let artistNames;
let artistData;

let officialAlbumData;
let fandomAlbumData;
let justEverythingMan; // tracks, albums, flashes -- don't forget to upd8 getHrefOfAnythingMan!
let justEverythingSortedByArtDateMan;

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
    return readdir(C.ALBUM_DIRECTORY)
        .then(albums => Promise.all(albums
            .map(album => readdir(path.join(C.ALBUM_DIRECTORY, album))
                .then(files => files.includes(ALBUM_DATA_FILE) ? path.join(C.ALBUM_DIRECTORY, album, ALBUM_DATA_FILE) : null))))
        .then(paths => paths.filter(Boolean));
    */

    const albums = await readdir(C.ALBUM_DIRECTORY);

    const paths = await progressPromiseAll(`Searching for album files.`, albums.map(async album => {
        // Argua8ly terri8le/am8iguous varia8le naming. Too 8ad!
        const albumDirectory = path.join(C.ALBUM_DIRECTORY, album);
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

function transformMultiline(text) {
    // Heck yes, HTML magics.

    text = text.replace(/\[\[(.+?)\]\]/g, (match, ref) => {
        const track = getLinkedTrack(ref);
        if (track) {
            let name = ref.match(/(.*):/);
            if (name) {
                name = name[1];
            } else {
                name = track.name;
            }
            return fixWS`
                <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${name}</a>
            `;
        } else {
            console.warn(`\x1b[33mThe linked track ${match} does not exist!\x1b[0m`);
            return ref;
        }
    });

    const outLines = [];

    let inList = false;
    for (let line of text.split(/\r|\n|\r\n/)) {
        line = line.replace(/<img src="(.*?)">/g, '<a href="$1">$&</a>');
        if (line.startsWith('- ')) {
            if (!inList) {
                outLines.push('<ul>');
                inList = true;
            }
            outLines.push(`    <li>${line.slice(1).trim()}</li>`);
        } else {
            if (inList) {
                outLines.push('</ul>');
                inList = false;
            }
            outLines.push(`<p>${line}</p>`);
        }
    }

    return outLines.join('\n');
};

function getCommentaryField(lines) {
    const text = getMultilineField(lines, 'Commentary');
    if (text) {
        const lines = text.split('\n');
        if (!lines[0].replace(/<\/b>/g, '').includes(':</i>')) {
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
    const albumArtDate = getBasicField(albumSection, 'Art Date') || albumDate;
    const albumCoverArtDate = getBasicField(albumSection, 'Cover Art Date') || albumArtDate;
    const albumCoverArtists = getContributionField(albumSection, 'Cover Art');
    const albumHasTrackArt = (getBasicField(albumSection, 'Has Track Art') !== 'no');
    const albumTrackCoverArtists = getContributionField(albumSection, 'Track Art');
    const albumCommentary = getCommentaryField(albumSection);
    const albumURLs = (getListField(albumSection, 'URLs') || []).filter(Boolean);
    let albumDirectory = getBasicField(albumSection, 'Directory');

    const canon = getBasicField(albumSection, 'Canon');
    const isCanon = canon === 'Canon' || !canon;
    const isBeyond = canon === 'Beyond';
    const isOfficial = isCanon || isBeyond;
    const isFanon = canon === 'Fanon';

    if (albumCoverArtists && albumCoverArtists.error) {
        return {error: `${albumCoverArtists.error} (in ${albumName})`};
    }

    if (albumCommentary && albumCommentary.error) {
        return {error: `${albumCommentary.error} (in ${albumName})`};
    }

    if (albumTrackCoverArtists && albumTrackCoverArtists.error) {
        return {error: `${albumTrackCoverArtists.error} (in ${albumName})`};
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
    const coverArtDateValue = new Date(albumCoverArtDate);

    if (!albumDirectory) {
        albumDirectory = C.getKebabCase(albumName);
    }

    // We need to declare this varia8le 8efore the al8um varia8le, 8ecause
    // that varia8le references this one. 8ut we won't actually fill in the
    // contents of the tracks varia8le until after creating the al8um one,
    // 8ecause each track o8ject will (8ack-)reference the al8um o8ject.
    const tracks = [];

    const albumData = {
        name: albumName,
        date: dateValue,
        artDate: coverArtDateValue,
        artists: albumArtists,
        coverArtists: albumCoverArtists,
        commentary: albumCommentary,
        directory: albumDirectory,
        urls: albumURLs,
        isCanon,
        isBeyond,
        isOfficial,
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
        const trackLyrics = getMultilineField(section, 'Lyrics');
        const originalDate = getBasicField(section, 'Original Date');
        const artDate = getBasicField(section, 'Art Date') || originalDate || albumArtDate;
        const references = getListField(section, 'References') || [];
        let trackArtists = getListField(section, 'Artists') || getListField(section, 'Artist');
        let trackCoverArtists = getContributionField(section, 'Track Art');
        let trackContributors = getContributionField(section, 'Contributors') || [];
        let trackDirectory = getBasicField(section, 'Directory');

        if (trackContributors.error) {
            return {error: `${trackContributors.error} (in ${trackName}, ${albumName})`};
        }

        if (trackCommentary && trackCommentary.error) {
            return {error: `${trackCommentary.error} (in ${trackName}, ${albumName})`};
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
            trackDirectory = C.getKebabCase(trackName);
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

        const artDateValue = new Date(artDate);

        const hasURLs = getBasicField(section, 'Has URLs') !== 'no';

        const trackURLs = hasURLs && (getListField(section, 'URLs') || []).filter(Boolean);

        if (hasURLs && !trackURLs.length) {
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
            artDate: artDateValue,
            directory: trackDirectory,
            urls: trackURLs,
            isCanon,
            isBeyond,
            isOfficial,
            isFanon,
            // 8ack-reference the al8um o8ject! This is very useful for when
            // we're outputting the track pages.
            album: albumData
        });
    }

    return albumData;
}

async function processArtistDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        return {error: `Could not read ${file} (${error.code}).`};
    }

    const contentLines = contents.split('\n');
    const sections = Array.from(getSections(contentLines));

    return sections.map(section => {
        const name = getBasicField(section, 'Artist');
        const urls = (getListField(section, 'URLs') || []).filter(Boolean);
        const alias = getBasicField(section, 'Alias');

        if (!name) {
            return {error: 'Expected "Artist" (name) field!'};
        }

        return {name, urls, alias};
    });
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
        let directory = getBasicField(section, 'Directory');
        let date = getBasicField(section, 'Date');
        const jiff = getBasicField(section, 'Jiff');
        const tracks = getListField(section, 'Tracks');
        const contributors = getContributionField(section, 'Contributors') || [];
        const urls = (getListField(section, 'URLs') || []).filter(Boolean);

        if (!name) {
            return {error: 'Expected "Flash" (name) field!'};
        }

        if (!page && !directory) {
            return {error: 'Expected "Page" or "Directory" field!'};
        }

        if (!directory) {
            directory = page;
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

        return {name, page, directory, date, contributors, tracks, urls, act, theme, jiff};
    });
}

function getDateString({ date }) {
    const pad = val => val.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function stringifyAlbumData() {
    return JSON.stringify(albumData, (key, value) => {
        if (['album', 'commentary'].includes(key)) {
            return undefined;
        }

        return value;
    }, 1);
}

function stringifyFlashData() {
    return JSON.stringify(flashData, (key, value) => {
        if (['act', 'commentary'].includes(key)) {
            return undefined;
        }

        return value;
    }, 1);
}

function stringifyArtistData() {
    return JSON.stringify(artistData, null, 1);
}

// 8asic function for writing any site page. Handles all the 8asename,
// directory, and site-template shenanigans!
async function writePage(directoryParts, titleOrHead, body) {
    const directory = path.join(C.SITE_DIRECTORY, ...directoryParts);
    await mkdirp(directory);
    // This is sort of hard-coded, i.e. we don't do path.join(C.ROOT_DIRECTORY).
    // May8e that's 8ad? Yes, definitely 8ad. 8ut I'm too lazy to fix it...
    // for now. TM. (Ahem. Still. Soon...may8e. TM. -- Should 8e easier now
    // that we'll have a proper function for writing any page - just appending
    // a C.ROOT_DIRECTORY should work. Um... okay, fine, I'll do that.)
    await writeFile(path.join(directory, 'index.html'), rebaseURLs(directory, fixWS`
        <!DOCTYPE html>
        <html data-rebase="${path.relative(directory, C.SITE_DIRECTORY)}">
            <head>
                ${[
                    `<meta charset="utf-8">`,
                    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
                    (titleOrHead.split('\n').length && !titleOrHead.includes('<title>')) ? `<title>${titleOrHead}</title>` : titleOrHead,
                    // directory !== C.SITE_DIRECTORY &&
                    // directory !== '.' &&
                    // `<base href="${path.relative(directory, C.SITE_DIRECTORY)}">`,
                    `<link rel="stylesheet" href="${CSS_FILE}">`,
                    // Apply JavaScript directly to the HTML <head>.
                    // (This is unfortun8, 8ut necessary, 8ecause the entire
                    // <body> tag is passed to this function; if we wanted to
                    // insert our own <script> text here into that pased
                    // string, well........ we don't want to go there.
                    // To deal with this, we use the "defer" property, which
                    // means the code only runs once the body has 8een loaded.)
                    `<script src="common.js"></script>`,
                    `<script src="data.js"></script>`,
                    `<script defer src="client.js"></script>`
                ].filter(Boolean).join('\n')}
            </head>
            ${body}
        </html>
    `));
}

function writeMiscellaneousPages() {
    return progressPromiseAll('Writing miscellaneous pages.', [
        writePage([], fixWS`
            <title>${SITE_TITLE}</title>
            <meta name="description" content="Expansive resource for anyone interested in fan- and official music alike; an archive for all things related.">
        `, fixWS`
            <body id="top-index">
                <div id="content">
                    <h1>${SITE_TITLE}</h1>
                    <div id="intro-menu">
                        <p>Explore the site!</p>
                        <a href="${C.LISTING_DIRECTORY}/index.html">Listings</a>
                        <a href="${C.FLASH_DIRECTORY}/index.html">Flashes &amp; Games</a>
                        <a href="${C.ABOUT_DIRECTORY}/index.html">About &amp; Credits</a>
                        <a href="${C.FEEDBACK_DIRECTORY}/index.html">Feedback &amp; Suggestions</a>
                        <a href="${C.CHANGELOG_DIRECTORY}/index.html">Changelog</a>
                        <p>...or choose an album:</p>
                    </div>
                    <h2>Beyond Canon</h2>
                    <h3>The future of Homestuck music, today.<br>Albums by the Homestuck^2 Music Team. 2020+.</h2>
                    <div class="grid-listing">
                        ${albumData.filter(album => album.isBeyond).reverse().map(album => fixWS`
                            <a class="grid-item" href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">
                                <img src="${getAlbumCover(album)}" alt="cover art">
                                <span>${album.name}</span>
                            </a>
                        `).join('\n')}
                    </div>
                    <h2>Fandom</h2>
                    <h3>A look into Homestuck's world of music and art created&mdash;and organized&mdash;by fans.<br>The beginning of time, through the end.</h3>
                    <div class="grid-listing">
                        ${albumData.filter(album => album.isFanon).reverse().map(album => fixWS`
                            <a class="grid-item" href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">
                                <img src="${getAlbumCover(album)}" alt="cover art">
                                <span>${album.name}</span>
                            </a>
                        `).join('\n')}
                        <a class="grid-item" href="#" style="--fg-color: #ffffff">...and more to be added soon</a>
                    </div>
                    <h2>Official</h2>
                    <h3>The original discography: a replica of the Homestuck Bandcamp prior to the enmergening.<br>Albums organized by What Pumpkin. 2009&ndash;2019.</h3>
                    <div class="grid-listing">
                        ${albumData.filter(album => album.isCanon).reverse().map(album => fixWS`
                            <a class="grid-item" href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">
                                <img src="${getAlbumCover(album)}" alt="cover art">
                                <span>${album.name}</span>
                            </a>
                        `).join('\n')}
                    </div>
                </div>
            </body>
        `),
        writePage([C.FLASH_DIRECTORY], `Flashes & Games`, fixWS`
            <body id="top-index">
                <div id="content">
                    <h1>Flashes &amp; Games</h1>
                    <div id="intro-menu">
                        <a href="index.html">Home</a>
                        <a href="${C.LISTING_DIRECTORY}/index.html">Listings</a>
                        <a href="${C.ABOUT_DIRECTORY}/index.html">About &amp; Credits</a>
                        <a href="${C.FEEDBACK_DIRECTORY}/index.html">Feedback &amp; Suggestions</a>
                        <a href="${C.CHANGELOG_DIRECTORY}/index.html">Changelog</a>
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
                            <h2 style="${getThemeString(flash.theme)}"><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act === flash.act))}/index.html">${flash.act}</a></h2>
                        ` : fixWS`
                            <a class="grid-item" href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flash)}/index.html" style="${getThemeString(flash.theme)}">
                                <img src="${getFlashCover(flash)}" alt="cover art">
                                <span>${flash.name}</span>
                            </a>
                        `).join('\n')}
                    </div>
                </div>
            </body>
        `),
        writePage([C.ABOUT_DIRECTORY], 'About &amp; Credits', fixWS`
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
        writePage([C.CHANGELOG_DIRECTORY], `Changelog`, fixWS`
            <body>
                <div id="content">
                    <div class="long-content">
                        <h1>Changelog</h1>
                        <p><a href="index.html">(Home)</a></p>
                        ${SITE_CHANGELOG}
                    </div>
                </div>
            </body>
        `),
        writePage([C.FEEDBACK_DIRECTORY], 'Feedback &amp; Suggestions!', fixWS`
            <body>
                <div id="content">
                    <div class="long-content">
                        <h1>Feedback &amp; Suggestions!</h1>
                        <p><a href="index.html">(Home)</a></p>
                        ${SITE_FEEDBACK}
                    </div>
                </div>
            </body>
        `),
        writePage([C.JS_DISABLED_DIRECTORY], 'JavaScript Disabled', fixWS`
            <body>
                <div id="content">
                    <h1>JavaScript Disabled (or out of date)</h1>
                    ${SITE_JS_DISABLED}
                </div>
            </body>
        `),
        writeFile('data.js', fixWS`
            // Yo, this file is gener8ted. Don't mess around with it!
            window.albumData = ${stringifyAlbumData()};
            window.flashData = ${stringifyFlashData()};
            window.artistData = ${stringifyArtistData()};
        `)
    ]);
}

// This function title is my gr8test work of art.
// (The 8ehavior... well, um. Don't tell anyone, 8ut it's even 8etter.)
function writeIndexAndTrackPagesForAlbum(album) {
    return [
        () => writeAlbumPage(album),
        ...album.tracks.map(track => () => writeTrackPage(track))
    ];
}

async function writeAlbumPage(album) {
    const listTag = getAlbumListTag(album);
    await writePage([C.ALBUM_DIRECTORY, album.directory], album.name, fixWS`
        <body style="${getThemeString(album.theme)}; --album-directory: ${album.directory}">
            <div id="header">
                ${generateHeaderForAlbum(album)}
            </div>
            <div class="columns">
                <div id="sidebar">
                    ${generateSidebarForAlbum(album)}
                </div>
                <div id="content">
                    <a id="cover-art" href="${getAlbumCover(album)}"><img src="${getAlbumCover(album)}" alt="cover art"></a>
                    <h1>${album.name}</h1>
                    <p>
                        ${album.artists && `By ${getArtistString(album.artists)}.<br>` || `<!-- (here: Full-album musician credits) -->`}
                        ${album.coverArtists && `Cover art by ${joinNoOxford(album.coverArtists.map(({ who, what }) => fixWS`
                            <a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(who)}/index.html">${who}</a>${what && ` (${getContributionString({what})})`}
                        `))}.<br>` || `<!-- (here: Cover art credits) -->`}
                        Released ${getDateString(album)}.
                        ${+album.artDate !== +album.date && `<br>Art released ${getDateString({date: album.artDate})}.` || `<!-- (here: Cover art release date) -->`}
                    </p>
                    ${album.urls.length && `<p>Listen on ${joinNoOxford(album.urls.map(url => fancifyURL(url, {album: true})), 'or')}.</p>` || `<!-- (here: Listen on...) -->`}
                    <${listTag}>
                        ${album.tracks.map(track => fixWS`
                            <li>
                                <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html">${track.name}</a>
                                ${track.artists !== album.artists && fixWS`
                                    <span class="by">by ${getArtistString(track.artists)}</span>
                                ` || `<!-- (here: Track-specific musician credits) -->`}
                            </li>
                        `).join('\n')}
                    </${listTag}>
                    ${album.commentary && fixWS`
                        <p>Artist commentary:</p>
                        <blockquote>
                            ${transformMultiline(album.commentary)}
                        </blockquote>
                    ` || `<!-- (here: Full-album commentary) -->`}
                </div>
            </div>
        </body>
    `);
}

async function writeTrackPage(track) {
    const tracksThatReference = getTracksThatReference(track);
    const ttrFanon = tracksThatReference.filter(t => t.isFanon);
    const ttrOfficial = tracksThatReference.filter(t => t.isOfficial);
    const tracksReferenced = getTracksReferencedBy(track);
    const flashesThatFeature = getFlashesThatFeature(track);
    await writePage([C.TRACK_DIRECTORY, track.directory], track.name, fixWS`
        <body style="${getThemeString(track.album.theme)}; --album-directory: ${track.album.directory}; --track-directory: ${track.directory}">
            <div id="header">
                ${generateHeaderForAlbum(track.album, track)}
            </div>
            <div class="columns">
                <div id="sidebar">
                    ${generateSidebarForAlbum(track.album, track)}
                </div>
                <div id="content">
                    <a href="${getTrackCover(track)}" id="cover-art"><img src="${getTrackCover(track)}" alt="cover art"></a>
                    <h1>${track.name}</h1>
                    <p>
                        By ${getArtistString(track.artists)}.
                        ${track.coverArtists && `<br>Cover art by ${joinNoOxford(track.coverArtists.map(({ who, what }) => fixWS`
                            <a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(who)}/index.html">${who}</a>${what && ` (${getContributionString({what})})`}
                        `))}.` || `<!-- (here: Cover art credits) -->`}
                        ${track.album.directory !== C.UNRELEASED_TRACKS_DIRECTORY && `<br>Released ${getDateString(track)}.` || `<!-- (here: Track release date) -->`}
                        ${+track.artDate !== +track.date && `<br>Art released ${getDateString({date: track.artDate})}.` || `<!-- (here: Cover art release date, if it differs) -->`}
                    </p>
                    ${track.urls.length ? fixWS`
                        <p>Listen on ${joinNoOxford(track.urls.map(fancifyURL), 'or')}.</p>
                    ` : fixWS`
                        <p>This track has no URLs at which it can be listened.</p>
                    `}
                    ${track.contributors.length && fixWS`
                        <p>Contributors:</p>
                        <ul>
                            ${track.contributors.map(({ who, what }) => fixWS`
                                <li>
                                    ${artistNames.includes(who)
                                        ? `<a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(who)}/index.html">${who}</a>`
                                        : who
                                    }
                                    ${what && `(${getContributionString({what})})` || `<!-- (here: Contribution details) -->`}
                                </li>
                            `).join('\n')}
                        </ul>
                    ` || `<!-- (here: Track contributor credits) -->`}
                    ${tracksReferenced.length && fixWS`
                        <p>Tracks that <i>${track.name}</i> references:</p>
                        <ul>
                            ${tracksReferenced.map(track => fixWS`
                                <li>
                                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                                    <span class="by">by ${getArtistString(track.artists)}</span>
                                </li>
                            `).join('\n')}
                        </ul>
                    ` || `<!-- (here: List of tracks referenced) -->`}
                    ${tracksThatReference.length && fixWS`
                        <p>Tracks that reference <i>${track.name}</i>:</p>
                        <dl>
                            ${ttrOfficial.length && fixWS`
                                <dt>Official:</dt>
                                <dd><ul>
                                    ${ttrOfficial.map(track => fixWS`
                                        <li>
                                            <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                                            <span class="by">by ${getArtistString(track.artists)}</span>
                                        </li>
                                    `).join('\n')}
                                </ul></dd>
                            ` || `<!-- (here: Official tracks) -->`}
                            ${ttrFanon.length && fixWS`
                                <dt>Fandom:</dt>
                                <dd><ul>
                                    ${ttrFanon.map(track => fixWS`
                                        <li>
                                            <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                                            <span class="by">by ${getArtistString(track.artists)}</span>
                                        </li>
                                    `).join('\n')}
                                </ul></dd>
                            ` || `<!-- (here: Fandom tracks) -->`}
                        </dl>
                    ` || `<!-- (here: Tracks that reference this track) -->`}
                    ${flashesThatFeature.length && fixWS`
                        <p>Flashes &amp; games that feature <i>${track.name}</i>:</p>
                        <ul>
                            ${flashesThatFeature.map(flash => `<li>${getFlashLinkHTML(flash)}</li>`).join('\n')}
                        </ul>
                    ` || `<!-- (here: Flashes that feature this track) -->`}
                    ${track.lyrics && fixWS`
                        <p>Lyrics:</p>
                        <blockquote>
                            ${transformMultiline(track.lyrics)}
                        </blockquote>
                    ` || `<!-- (here: Track lyrics) -->`}
                    ${track.commentary && fixWS`
                        <p>Artist commentary:</p>
                        <blockquote>
                            ${transformMultiline(track.commentary)}
                        </blockquote>
                    ` || `<!-- (here: Track commentary) -->`}
                </div>
            </div>
        </body>
    `);
}

async function writeArtistPages() {
    await progressPromiseAll('Writing artist pages.', queue(artistNames.map(artistName => () => writeArtistPage(artistName))));
}

async function writeArtistPage(artistName) {
    const {
        urls = []
    } = artistData.find(({ name }) => name === artistName) || {};

    const tracks = allTracks.filter(track => (
        track.artists.includes(artistName) ||
        track.contributors.some(({ who }) => who === artistName)
    ));
    const artThings = justEverythingMan.filter(thing => (thing.coverArtists || []).some(({ who }) => who === artistName));
    const flashes = flashData.filter(flash => (flash.contributors || []).some(({ who }) => who === artistName));
    const commentaryThings = justEverythingMan.filter(thing => thing.commentary && thing.commentary.replace(/<\/?b>/g, '').includes('<i>' + artistName + ':</i>'));

    const unreleasedTracks = tracks.filter(track => track.album.directory === C.UNRELEASED_TRACKS_DIRECTORY);
    const releasedTracks = tracks.filter(track => track.album.directory !== C.UNRELEASED_TRACKS_DIRECTORY);

    const generateTrackList = tracks => albumChunkedList(tracks, (track, i) => {
        const contrib = {
            who: artistName,
            what: track.contributors.filter(({ who }) => who === artistName).map(({ what }) => what).join(', ')
        };
        const flashes = getFlashesThatFeature(track);
        return fixWS`
            <li title="${th(i + 1)} track by ${artistName}; ${th(track.album.tracks.indexOf(track) + 1)} in ${track.album.name}">
                <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                ${track.artists.includes(artistName) && track.artists.length > 1 && `<span class="contributed">(with ${getArtistString(track.artists.filter(a => a !== artistName))})</span>` || `<!-- (here: Co-artist credits) -->`}
                ${contrib.what && `<span class="contributed">(${getContributionString(contrib) || 'contributed'})</span>` || `<!-- (here: Contribution details) -->`}
                ${flashes.length && `<br><span class="flashes">(Featured in ${joinNoOxford(flashes.map(getFlashLinkHTML))})</span></br>` || `<!-- (here: Flashes featuring this track) -->`}
            </li>
        `;
    });

    // Shish!
    const kebab = C.getArtistDirectory(artistName);
    const index = `${C.ARTIST_DIRECTORY}/${kebab}/index.html`;
    await writePage([C.ARTIST_DIRECTORY, kebab], artistName, fixWS`
        <body>
            <div id="content">
                ${ENABLE_ARTIST_AVATARS && await access(path.join(C.ARTIST_AVATAR_DIRECTORY, kebab + '.jpg')).then(() => true, () => false) && fixWS`
                    <a id="cover-art" href="${C.ARTIST_AVATAR_DIRECTORY}/${C.getArtistDirectory(artistName)}.jpg"><img src="${ARTIST_AVATAR_DIRECTORY}/${C.getArtistDirectory(artistName)}.jpg" alt="Artist avatar"></a>
                `}
                <h1>${artistName}</h1>
                ${urls.length && `<p>Visit on ${joinNoOxford(urls.map(fancifyURL), 'or')}.</p>`}
                <p>Jump to: ${[
                    [
                        tracks.length && `<a href="${index}#tracks">Tracks</a>`,
                        unreleasedTracks.length && `<a href="${index}#unreleased-tracks">(Unreleased Tracks)</a>`
                    ].filter(Boolean).join(' '),
                    artThings.length && `<a href="${index}#art">Art</a>`,
                    flashes.length && `<a href="${index}#flashes">Flashes &amp; Games</a>`,
                    commentaryThings.length && `<a href="${index}#commentary">Commentary</a>`
                ].filter(Boolean).join(', ')}.</p>
                ${tracks.length && `<h2 id="tracks">Tracks</h2>`}
                ${releasedTracks.length && generateTrackList(releasedTracks)}
                ${unreleasedTracks.length && fixWS`
                    <h3 id="unreleased-tracks">Unreleased Tracks</h3>
                    ${generateTrackList(unreleasedTracks)}
                `}
                ${artThings.length && fixWS`
                    <h2 id="art">Art</h2>
                    ${albumChunkedList(artThings, (thing, i) => {
                        const contrib = thing.coverArtists.find(({ who }) => who === artistName);
                        return fixWS`
                            <li title="${th(i + 1)} art by ${artistName}${thing.album && `; ${th(thing.album.tracks.indexOf(thing) + 1)} track in ${thing.album.name}`}">
                                ${thing.album ? fixWS`
                                    <a href="${C.TRACK_DIRECTORY}/${thing.directory}/index.html" style="${getThemeString(thing.album.theme)}">${thing.name}</a>
                                ` : '<i>(cover art)</i>'}
                                ${thing.coverArtists.length > 1 && `<span class="contributed">(with ${getArtistString(thing.coverArtists.map(({ who }) => who).filter(a => a !== artistName))})</span>`}
                                ${contrib.what && `<span class="contributed">(${getContributionString(contrib)})</span>`}
                            </li>
                        `;
                    }, true, 'artDate')}
                `}
                ${flashes.length && fixWS`
                    <h2 id="flashes">Flashes &amp; Games</h2>
                    ${actChunkedList(flashes, flash => {
                        const contributionString = flash.contributors.filter(({ who }) => who === artistName).map(getContributionString).join(' ');
                        return fixWS`
                            <li>
                                <a href="${C.FLASH_DIRECTORY}/${flash.directory}/index.html" style="${getThemeString(flash.theme)}">${flash.name}</a>
                                ${contributionString && `<span class="contributed">(${contributionString})</span>`}
                                (${getDateString({date: flash.date})})
                            </li>
                        `
                    })}
                `}
                ${commentaryThings.length && fixWS`
                    <h2 id="commentary">Commentary</h2>
                    ${albumChunkedList(commentaryThings, thing => {
                        const flashes = getFlashesThatFeature(thing);
                        return fixWS`
                            <li>
                                ${thing.album ? fixWS`
                                    <a href="${C.TRACK_DIRECTORY}/${thing.directory}/index.html" style="${getThemeString(thing.album.theme)}">${thing.name}</a>
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

function albumChunkedList(tracks, getLI, showDate = true, dateProperty = 'date') {
    const getAlbum = thing => thing.album ? thing.album : thing;
    return fixWS`
        <dl>
            ${tracks.slice().sort((a, b) => a[dateProperty] - b[dateProperty]).map((thing, i, sorted) => {
                const li = getLI(thing, i);
                const album = getAlbum(thing);
                const previous = sorted[i - 1];
                if (i === 0 || album !== getAlbum(previous) || (showDate && +thing[dateProperty] !== +previous[dateProperty])) {
                    const heading = fixWS`
                        <dt>
                            <a href="${C.ALBUM_DIRECTORY}/${getAlbum(thing).directory}/index.html" style="${getThemeString(getAlbum(thing).theme)}">${getAlbum(thing).name}</a>
                            ${showDate && `(${getDateString({date: thing[dateProperty]})})`}
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

function actChunkedList(flashes, getLI, showDate = true, dateProperty = 'date') {
    return fixWS`
        <dl>
            ${flashes.slice().sort((a, b) => a[dateProperty] - b[dateProperty]).map((flash, i, sorted) => {
                const li = getLI(flash, i);
                const act = flash.act;
                const previous = sorted[i - 1];
                if (i === 0 || act !== previous.act) {
                    const heading = fixWS`
                        <dt>
                            <a href="${C.FLASH_DIRECTORY}/${sorted.find(flash => !flash.act8r8k && flash.act === act).directory}/index.html" style="${getThemeString(flash.theme)}">${flash.act}</a>
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

async function writeFlashPages() {
    await progressPromiseAll('Writing Flash pages.', queue(flashData.map(flash => () => !flash.act8r8k && writeFlashPage(flash)).filter(Boolean)));
}

async function writeFlashPage(flash) {
    const kebab = getFlashDirectory(flash);
    const act6 = flashData.findIndex(f => f.act.startsWith('Act 6'));
    const postCanon = flashData.findIndex(f => f.act.includes('Post Canon'));
    const outsideCanon = postCanon + flashData.slice(postCanon).findIndex(f => !f.act.includes('Post Canon'));
    const side = (
        (flashData.indexOf(flash) < act6) ? 1 :
        (flashData.indexOf(flash) <= outsideCanon) ? 2 :
        0
    );

    const flashes = flashData.filter(flash => !flash.act8r8k);
    const index = flashes.indexOf(flash);
    const previous = flashes[index - 1];
    const next = flashes[index + 1];
    const parts = [
        previous && `<a href="${getHrefOfAnythingMan(previous)}" title="${previous.name}">Previous</a>`,
        next && `<a href="${getHrefOfAnythingMan(next)}" title="${next.name}">Next</a>`
    ].filter(Boolean);

    await writePage([C.FLASH_DIRECTORY, kebab], flash.name, fixWS`
        <body style="${getThemeString(flash.theme)}">
            <div id="header">
                <h2>
                    <a href="index.html">Home</a>
                    / <a href="${C.FLASH_DIRECTORY}/index.html">Flashes &amp; Games</a>
                    / <a href="${C.FLASH_DIRECTORY}/${kebab}/index.html">${flash.name}</a>
                    ${parts.length && fixWS`
                        <span>(${parts.join(', ')})</span>
                    ` || `<!-- (here: Flash navigation links) -->`}
                </h2>
                <div>
                    ${chronologyLinks(flash, {
                        headingWord: 'flash/game',
                        sourceData: flashData,
                        filters: [
                            {
                                mapProperty: 'contributors',
                                toArtist: ({ who }) => who
                            }
                        ]
                    }) || `<!-- (here: Contributor chronology links) -->`}
                </div>
            </div>
            <div class="columns">
                <div id="sidebar">
                    <h1><a href="${C.FLASH_DIRECTORY}/index.html">Flashes &amp; Games</a></h1>
                    <dl>
                        ${flashData.filter(f => f.act8r8k).filter(({ act }) =>
                            act.startsWith('Act 1') ||
                            act.startsWith('Act 6 Act 1') ||
                            act.startsWith('Hiveswap') ||
                            (
                                flashData.findIndex(f => f.act === act) < act6 ? side === 1 :
                                flashData.findIndex(f => f.act === act) < outsideCanon ? side === 2 :
                                true
                            )
                        ).flatMap(({ act, theme }) => [
                            act.startsWith('Act 1') && `<dt${classes('side', side === 1 && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act.startsWith('Act 1')))}/index.html" style="--fg-color: #4ac925">Side 1 (Acts 1-5)</a></dt>`
                            || act.startsWith('Act 6 Act 1') && `<dt${classes('side', side === 2 && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act.startsWith('Act 6')))}/index.html" style="--fg-color: #1076a2">Side 2 (Acts 6-7)</a></dt>`
                            || act.startsWith('Hiveswap') && `<dt${classes('side', side === 0 && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act.startsWith('Hiveswap')))}/index.html" style="--fg-color: #008282">Outside Canon (Misc. Games)</a></dt>`,
                            (
                                flashData.findIndex(f => f.act === act) < act6 ? side === 1 :
                                flashData.findIndex(f => f.act === act) < outsideCanon ? side === 2 :
                                true
                            ) && `<dt${classes(act === flash.act && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act === act))}/index.html" style="${getThemeString(theme)}">${act}</a></dt>`,
                            act === flash.act && fixWS`
                                <dd><ul>
                                    ${flashData.filter(f => !f.act8r8k && f.act === act).map(f => fixWS`
                                        <li${classes(f === flash && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(f)}/index.html" style="${getThemeString(f.theme)}">${f.name}</a></li>
                                    `).join('\n')}
                                </ul></dd>
                            `
                        ]).filter(Boolean).join('\n')}
                    </dl>
                </div>
                <div id="content">
                    <h1>${flash.name}</h1>
                    <a id="cover-art" href="${getFlashCover(flash)}"><img src="${getFlashCover(flash)}" alt="cover art"></a>
                    <p>Released ${getDateString(flash)}.</p>
                    ${(flash.page || flash.urls.length) && `<p>Play on ${joinNoOxford(
                        [
                            flash.page && getFlashLink(flash),
                            ...flash.urls
                        ].map(url => `<span class="nowrap"><a href="${url}">${fancifyURL(url)}</a>` + (
                            url.includes('homestuck.com') ? ` (${isNaN(Number(flash.page)) ? 'secret page' : `page ${flash.page}`})` :
                            url.includes('bgreco.net') ? ` (HQ audio)` :
                            url.includes('youtu') ? ` (on any device)` :
                            ''
                        ) + `</span>`), 'or')}.</p>` || `<!-- (here: Play-online links) -->`}
                    ${flash.contributors.length && fixWS`
                        <p>Contributors:</p>
                        <ul>
                            ${flash.contributors.map(({ who, what }) => fixWS`
                                <li>${artistNames.includes(who)
                                    ? `<a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(who)}/index.html">${who}</a>`
                                    : who
                                }${what && ` (${getContributionString({what})})`}</li>
                            `).join('\n')}
                        </ul>
                    ` || `<!-- (here: Flash contributor details) -->`}
                    <p>Tracks featured in <i>${flash.name.replace(/\.$/, '')}</i>:</p>
                    <ul>
                        ${flash.tracks.map(ref => {
                            const track = getLinkedTrack(ref);
                            const neighm = ref.match(/(.*?\S):/) || [ref, ref];
                            if (track) {
                                const neeeighm = neighm[1].replace('$$$$', ':');
                                return fixWS`
                                    <li>
                                        <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${neeeighm}</a>
                                        <span class="by">by ${getArtistString(track.artists)}</span>
                                    </li>
                                `;
                            } else {
                                const by = ref.match(/\(by .*\)/);
                                if (by) {
                                    const name = ref.replace(by, '').trim();
                                    const who = by[0].replace(/\(by |\)/g, '').split(',').map(w => w.trim());
                                    return `<li>${name} <span class="by">by ${getArtistString(who)}</span></li>`;
                                } else {
                                    return `<li>${ref}</li>`;
                                }
                            }
                        }).join('\n')}
                    </ul>
                </div>
            </div>
        </body>
    `);
}

function writeListingPages() {
    const allArtists = artistNames.slice().sort();

    const getAlbumLI = (album, extraText = '') => fixWS`
        <li>
            <a href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">${album.name}</a>
            ${extraText}
        </li>
    `;

    const getArtistLI = artistName => fixWS`
        <li>
            <a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(artistName)}/index.html">${artistName}</a>
            (${C.getArtistNumContributions(artistName, {allTracks, albumData, flashData})} <abbr title="contributions (to music, art, and flashes)">c.</abbr>)
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
        [['albums', 'by-date'], `Albums - by Date`, C.sortByDate(albumData.slice())
            .map(album => getAlbumLI(album, `(${getDateString(album)})`))],
        [['albums', 'by-tracks'], `Albums - by Tracks`, albumData.slice()
            .sort((a, b) => b.tracks.length - a.tracks.length)
            .map(album => getAlbumLI(album, `(${s(album.tracks.length, 'track')})`))],
        [['artists', 'by-name'], `Artists - by Name`, allArtists
            .map(name => ({name}))
            .sort(sortByName)
            .map(({ name }) => name)
            .map(getArtistLI)],
        [['artists', 'by-commentary'], `Artists - by Commentary`, allArtists
            .map(name => ({name, commentary: C.getArtistCommentary(name, {justEverythingMan}).length}))
            .filter(({ commentary }) => commentary > 0)
            .sort((a, b) => b.commentary - a.commentary)
            .map(({ name, commentary }) => fixWS`
                <li>
                    <a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(name)}/index.html#commentary">${name}</a>
                    (${commentary} ${commentary === 1 ? 'entry' : 'entries'})
                </li>
            `)],
        [['artists', 'by-contribs'], `Artists - by Contributions`, allArtists
            .map(name => ({name, contribs: C.getArtistNumContributions(name, {albumData, allTracks, flashData})}))
            .sort((a, b) => b.contribs - a.contribs)
            .map(({ name }) => name)
            .map(getArtistLI)],
        [['tracks', 'by-name'], `Tracks - by Name`, allTracks.slice()
            .sort(sortByName)
            .map(track => fixWS`
                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
            `)],
        [['tracks', 'by-album'], `Tracks - by Album`, fixWS`
                <dl>
                    ${albumData.map(album => fixWS`
                        <dt><a href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">${album.name}</a></dt>
                        <dd><ol>
                            ${album.tracks.map(track => fixWS`
                                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
                            `).join('\n')}
                        </ol></dd>
                    `).join('\n')}
                </dl>
            `],
        [['tracks', 'by-date'], `Tracks - by Date`, albumChunkedList(
            C.sortByDate(allTracks.slice()),
            track => fixWS`
                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
            `)],
        [['tracks', 'by-times-referenced'], `Tracks - by Times Referenced`, C.sortByDate(allTracks.slice())
            .filter(track => getTracksThatReference(track).length > 0)
            .sort((a, b) => getTracksThatReference(b).length - getTracksThatReference(a).length)
            .map(track => fixWS`
                <li>
                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a>
                    (${s(getTracksThatReference(track).length, 'time')} referenced)
                </li>
            `)],
        [['tracks', 'with-lyrics'], `Tracks - with Lyrics`, albumChunkedList(
            C.sortByDate(allTracks.slice())
            .filter(track => track.lyrics),
            track => fixWS`
                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(track.album.theme)}">${track.name}</a></li>
            `)]
    ];

    const getWordCount = str => {
        const wordCount = str.split(' ').length;
        return `${Math.floor(wordCount / 100) / 10}k`;
    };

    return progressPromiseAll(`Writing listing pages.`, [
        writePage([C.LISTING_DIRECTORY], `Listings Index`, fixWS`
            <body>
                <div id="header">
                    ${generateHeaderForListings(listingDescriptors)}
                </div>
                <div class="columns">
                    <div id="sidebar">
                        ${generateSidebarForListings(listingDescriptors)}
                    </div>
                    <div id="content">
                        <h1>Listings</h1>
                        <p>Feel free to explore any of the listings linked below and in the sidebar!</p>
                        ${generateLinkIndexForListings(listingDescriptors)}
                    </div>
                </div>
            </body>
        `),
        writePage([C.LISTING_DIRECTORY, 'all-commentary'], 'All Commentary', fixWS`
            <body>
                <div id="header">
                    ${generateHeaderForListings(listingDescriptors, 'all-commentary')}
                </div>
                <div class="columns">
                    <div id="sidebar">
                        ${generateSidebarForListings(listingDescriptors, 'all-commentary')}
                    </div>
                    <div id="content">
                        <h1>All Commentary</h1>
                        <p><strong>${getWordCount(albumData.reduce((acc, a) => acc + [a, ...a.tracks].filter(x => x.commentary).map(x => x.commentary).join(' '), ''))}</strong> words, in all.<br>Jump to a particular album:</p>
                        <ul>
                            ${C.sortByDate(albumData.slice())
                                .filter(album => [album, ...album.tracks].some(x => x.commentary))
                                .map(album => fixWS`
                                    <li>
                                        <a href="${C.LISTING_DIRECTORY}/all-commentary/index.html#${album.directory}" style="${getThemeString(album.theme)}">${album.name}</a>
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
                        ${C.sortByDate(albumData.slice())
                            .map(album => [album, ...album.tracks])
                            .filter(x => x.some(y => y.commentary))
                            .map(([ album, ...tracks ]) => fixWS`
                                <h2 id="${album.directory}"><a href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html" style="${getThemeString(album.theme)}">${album.name}</a></h2>
                                ${album.commentary && fixWS`
                                    <blockquote style="${getThemeString(album.theme)}">
                                        ${transformMultiline(album.commentary)}
                                    </blockquote>
                                ` || `<!-- (here: Full-album commentary) -->`}
                                ${tracks.filter(t => t.commentary).map(track => fixWS`
                                    <h3 id="${track.directory}"><a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html" style="${getThemeString(album.theme)}">${track.name}</a></h3>
                                    <blockquote style="${getThemeString(album.theme)}">
                                        ${transformMultiline(track.commentary)}
                                    </blockquote>
                                `).join('\n') || `<!-- (here: Per-track commentary) -->`}
                            `)
                            .join('\n')
                        }
                    </div>
                </div>
            </body>
        `),
        writePage([C.LISTING_DIRECTORY, 'random'], 'Random Pages', fixWS`
            <body>
                <div id="header">
                    ${generateHeaderForListings(listingDescriptors, 'random')}
                </div>
                <div class="columns">
                    <div id="sidebar">
                        ${generateSidebarForListings(listingDescriptors, 'random')}
                    </div>
                    <div id="content">
                        <h1>Random Pages</h1>
                        <p>Choose a link to go to a random page in that category or album! If your browser doesn't support relatively modern JavaScript or you've disabled it, these links won't work - sorry.</p>
                        <dl>
                            <dt>Miscellaneous:</dt>
                            <dd><ul>
                                <li>
                                    <a href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="artist">Random Artist</a>
                                    (<a href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="artist-more-than-one-contrib">&gt;1 contribution</a>)
                                </li>
                                <li><a href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="album">Random Album (whole site)</a></li>
                                <li><a href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="track">Random Track (whole site)</a></li>
                            </ul></dd>
                            ${[
                                {name: 'Official', albumData: officialAlbumData, code: 'official'},
                                {name: 'Fandom', albumData: fandomAlbumData, code: 'fandom'}
                            ].map(category => fixWS`
                                <dt>${category.name}: (<a href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="album-in-${category.code}">Random Album</a>, <a href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="track-in-${category.code}">Random Track</a>)</dt>
                                <dd><ul>${category.albumData.map(album => fixWS`
                                    <li><a style="${getThemeString(album.theme)}; --album-directory: ${album.directory}" href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="track-in-album">${album.name}</a></li>
                                `).join('\n')}</ul></dd>
                            `).join('\n')}
                        </dl>
                    </div>
                </div>
            </body>
        `),
        ...listingDescriptors.map(entry => writeListingPage(...entry, listingDescriptors))
    ]);
}

function writeListingPage(directoryParts, title, items, listingDescriptors) {
    return writePage([C.LISTING_DIRECTORY, ...directoryParts], title, fixWS`
        <body>
            <div id="header">
                ${generateHeaderForListings(listingDescriptors, directoryParts)}
            </div>
            <div class="columns">
                <div id="sidebar">
                    ${generateSidebarForListings(listingDescriptors, directoryParts)}
                </div>
                <div id="content">
                    <h1>${title}</h1>
                    ${typeof items === 'string' ? items : fixWS`
                        <ul>
                            ${items.join('\n')}
                        </ul>
                    `}
                </div>
            </div>
        </body>
    `);
}

function generateHeaderForListings(listingDescriptors, currentDirectoryParts) {
    return fixWS`
        <h2>
            <a href="index.html">Home</a>
            / <a href="${C.LISTING_DIRECTORY}/index.html">Listings</a>
            ${currentDirectoryParts && `/ <a href="${C.LISTING_DIRECTORY}/${
                Array.isArray(currentDirectoryParts)
                ? currentDirectoryParts.join('/')
                : currentDirectoryParts
            }/index.html">` + (
                currentDirectoryParts === 'all-commentary' ? `All Commentary` :
                currentDirectoryParts === 'random' ? `Random Pages` :
                listingDescriptors.find(([ ldDirectoryParts ]) => ldDirectoryParts === currentDirectoryParts)[1]
            ) + `</a>` || `<!-- (here: Link to current listing) -->`}
        </h2>
    `;
}

function generateSidebarForListings(listingDescriptors, currentDirectoryParts) {
    return fixWS`
        <h1><a href="${C.LISTING_DIRECTORY}/index.html">Listings</a></h1>
        ${generateLinkIndexForListings(listingDescriptors, currentDirectoryParts)}
    `;
}

function generateLinkIndexForListings(listingDescriptors, currentDirectoryParts) {
    return fixWS`
        <ul>
            ${listingDescriptors.map(([ ldDirectoryParts, ldTitle ]) => fixWS`
                <li${classes(currentDirectoryParts === ldDirectoryParts && 'current')}>
                    <a href="${C.LISTING_DIRECTORY}/${ldDirectoryParts.join('/')}/index.html">${ldTitle}</a>
                </li>
            `).join('\n')}
            <li${classes(currentDirectoryParts === 'all-commentary' && 'current')}>
                <a href="${C.LISTING_DIRECTORY}/all-commentary/index.html">All Commentary</a>
            </li>
            <li${classes(currentDirectoryParts === 'random' && 'current')}>
                <a href="${C.LISTING_DIRECTORY}/random/index.html">Random Pages</a>
            </li>
        </ul>
    `;
}

// This function is terri8le. Sorry!
function getContributionString({ what }) {
    return what
        ? what.replace(/\[(.*?)\]/g, (match, name) =>
            allTracks.some(track => track.name === name)
                ? `<i><a href="${C.TRACK_DIRECTORY}/${allTracks.find(track => track.name === name).directory}/index.html">${name}</a></i>`
                : `<i>${name}</i>`)
        : '';
}

function getTracksThatReference(track) {
    const {cache} = getTracksThatReference;
    if (!track[cache]) {
        track[cache] = allTracks.filter(t => getTracksReferencedBy(t).includes(track));
    }
    return track[cache];
}

getTracksThatReference.cache = Symbol();

function getTracksReferencedBy(track) {
    const {cache} = getTracksReferencedBy;
    if (!track[cache]) {
        track[cache] = track.references.map(ref => getLinkedTrack(ref)).filter(Boolean);
    }
    return track[cache];
}

getTracksReferencedBy.cache = Symbol();

function getLinkedTrack(ref) {
    const match = ref.match(/\S:(.*)/);
    if (match) {
        const dir = match[1];
        return allTracks.find(track => track.directory === dir);
    } else {
        const track = allTracks.find(track => track.name === ref);
        if (track) {
            return track;
        } else {
            const track = allTracks.find(track => track.name.toLowerCase() === ref.toLowerCase());
            if (track) {
                console.warn(`\x1b[33mBad capitalization:\x1b[0m`);
                console.warn(`\x1b[31m- ${ref}\x1b[0m`);
                console.warn(`\x1b[32m+ ${track.name}\x1b[0m`);
                return track;
            }
        }
    }
}

function getFlashesThatFeature(track) {
    return flashData.filter(flash => (getTracksFeaturedByFlash(flash) || []).includes(track));
}

function getTracksFeaturedByFlash(flash) {
    const {cache} = getTracksFeaturedByFlash;
    if (!flash[cache]) {
        flash[cache] = flash.tracks && flash.tracks.map(t => getLinkedTrack(t));
    }
    return flash[cache];
}

getTracksFeaturedByFlash.cache = Symbol();

function getArtistString(artists) {
    return joinNoOxford(artists.map(artist => {
        if (artistNames.includes(artist)) {
            return fixWS`
                <a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(artist)}/index.html">${artist}</a>
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

function getFlashDirectory(flash) {
    // const kebab = getKebabCase(flash.name.replace('[S] ', ''));
    // return flash.page + (kebab ? '-' + kebab : '');
    // return '' + flash.page;
    return '' + flash.directory;
}

function getAlbumListTag(album) {
    if (album.directory === C.UNRELEASED_TRACKS_DIRECTORY) {
        return 'ul';
    } else {
        return 'ol';
    }
}

function fancifyURL(url, {album = false} = {}) {
    return fixWS`<a href="${url}">${
        url.includes('bandcamp.com') ? 'Bandcamp' :
        url.includes('youtu') ? (album ? (
            url.includes('list=') ? 'YouTube (Playlist)' : 'YouTube (Full&nbsp;Album)'
        ) : 'YouTube') :
        url.includes('soundcloud') ? 'SoundCloud' :
        url.includes('tumblr.com') ? 'Tumblr' :
        url.includes('twitter.com') ? 'Twitter' :
        url.includes('deviantart.com') ? 'DeviantArt' :
        url.includes('wikipedia.org') ? 'Wikipedia' :
        new URL(url).hostname
    }</a>`;
}

function chronologyLinks(currentTrack, {
    mapProperty,
    toArtist,
    filters, // {property, toArtist}
    headingWord,
    sourceData = justEverythingMan
}) {
    return (
        Array.from(new Set(filters.flatMap(({ mapProperty, toArtist }) => currentTrack[mapProperty] && currentTrack[mapProperty].map(toArtist))))
    ).map(artist => {
        if (!artistNames.includes(artist)) return '';

        const releasedThings = sourceData.filter(thing => {
            const album = albumData.includes(thing) ? thing : thing.album;
            if (album && album.directory === C.UNRELEASED_TRACKS_DIRECTORY) {
                return false;
            }

            return filters.some(({ mapProperty, toArtist }) => (
                thing[mapProperty] &&
                thing[mapProperty].map(toArtist).includes(artist)
            ));
        });
        const index = releasedThings.indexOf(currentTrack);

        if (index === -1) return '';

        const previous = releasedThings[index - 1];
        const next = releasedThings[index + 1];
        const parts = [
            previous && `<a href="${getHrefOfAnythingMan(previous)}" title="${previous.name}">Previous</a>`,
            next && `<a href="${getHrefOfAnythingMan(next)}" title="${next.name}">Next</a>`
        ].filter(Boolean);

        const heading = `${th(index + 1)} ${headingWord} by <a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(artist)}/index.html">${artist}</a>`;

        return fixWS`
            <div class="chronology">
                <span class="heading">${heading}</span>
                ${parts.length && `<span class="buttons">(${parts.join(', ')})</span>` || `<!-- (here: Next/previous links) -->`}
            </div>
        `;
    }).filter(Boolean).join('\n');
}

function generateHeaderForAlbum(album, currentTrack = null) {
    const index = currentTrack && album.tracks.indexOf(currentTrack)
    const previous = currentTrack && album.tracks[index - 1]
    const next = currentTrack && album.tracks[index + 1]
    return fixWS`
        <h2>
            <a href="index.html">Home</a>
            / <a href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html">${album.name}</a>
            ${currentTrack && `/ <a href="${C.TRACK_DIRECTORY}/${currentTrack.directory}/index.html">${currentTrack.name}</a>` || `<!-- (here: Link to current track) --> `}
            ${album.tracks.length > 1 && fixWS`
                <span>(${[
                    previous && `<a href="${C.TRACK_DIRECTORY}/${previous.directory}/index.html" title="${previous.name}">Previous</a>`,
                    next && `<a href="${C.TRACK_DIRECTORY}/${next.directory}/index.html" title="${next.name}">Next</a>`,
                    `<a href="${C.JS_DISABLED_DIRECTORY}/index.html" data-random="track-in-album">${currentTrack ? 'Random' : 'Random Track'}</a>`
                ].filter(Boolean).join(', ')})</span>
            ` || `<!-- (here: Album navigation links) -->`}
        </h2>
        <div>
            ${currentTrack && chronologyLinks(currentTrack, {
                headingWord: 'track',
                sourceData: allTracks,
                filters: [
                    {
                        mapProperty: 'artists',
                        toArtist: artist => artist
                    },
                    {
                        mapProperty: 'contributors',
                        toArtist: ({ who }) => who
                    }
                ]
            }) || `<!-- (here: Musician & contributors chronology links) -->`}
            ${chronologyLinks(currentTrack || album, {
                headingWord: 'cover art',
                sourceData: justEverythingSortedByArtDateMan,
                filters: [
                    {
                        mapProperty: 'coverArtists',
                        toArtist: ({ who }) => who
                    }
                ]
            }) || `<!-- (here: Cover art chronology links) -->`}
        </div>
    `;
}

function generateSidebarForAlbum(album, currentTrack = null) {
    const listTag = getAlbumListTag(album);
    return fixWS`
        <h1><a href="${C.ALBUM_DIRECTORY}/${album.directory}/index.html">${album.name}</a></h1>
        <${listTag}>
            ${album.tracks.map(track => `<li${classes(track === currentTrack && 'current')}><a href="${C.TRACK_DIRECTORY}/${track.directory}/index.html">${track.name}</a></li>`).join('\n')}
        </${listTag}>
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
    return `../../${C.ALBUM_DIRECTORY}/${album.directory}/cover.png`;
}
function getTrackCover(track) {
    return `../../${C.ALBUM_DIRECTORY}/${track.album.directory}/${track.directory}.png`;
}
*/

function getHrefOfAnythingMan(anythingMan) {
    return (
        albumData.includes(anythingMan) ? C.ALBUM_DIRECTORY :
        allTracks.includes(anythingMan) ? C.TRACK_DIRECTORY :
        flashData.includes(anythingMan) ? C.FLASH_DIRECTORY :
        'idk-bud'
    ) + '/' + (
        flashData.includes(anythingMan) ? getFlashDirectory(anythingMan) :
        anythingMan.directory
    ) + '/index.html';
}

function getAlbumCover(album) {
    return `${C.ALBUM_DIRECTORY}/${album.directory}/cover.jpg`;
}
function getTrackCover(track) {
    // Some al8ums don't have any track art at all, and in those, every track
    // just inherits the al8um's own cover art.
    if (track.coverArtists === null) {
        return getAlbumCover(track.album);
    } else {
        return `${C.ALBUM_DIRECTORY}/${track.album.directory}/${track.directory}.jpg`;
    }
}
function getFlashCover(flash) {
    return `${C.FLASH_DIRECTORY}/${getFlashDirectory(flash)}.${flash.jiff === 'Yeah' ? 'gif' : 'png'}`;
}

function getFlashLink(flash) {
    return `https://homestuck.com/story/${flash.page}`;
}

function getFlashLinkHTML(flash) {
    return `<a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flash)}/index.html" title="Page ${flash.page}" style="${getThemeString(flash.theme)}">${flash.name}</a>`;
}

function rebaseURLs(directory, html) {
    if (directory === '') {
        return html;
    }
    return html.replace(/(href|src)="(.*?)"/g, (match, attr, url) => {
        if (url.startsWith('#')) {
            return `${attr}="${url}"`;
        }

        try {
            new URL(url);
            // no error: it's a full url
        } catch (error) {
            // caught an error: it's a component!
            url = path.relative(directory, url);
        }
        return `${attr}="${url}"`;
    });
}

function classes(...args) {
    const values = args.filter(Boolean);
    return values.length ? ` class="${values.join(' ')}"` : '';
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
    albumData = await progressPromiseAll(`Reading & processing album files.`, albumDataFiles.map(processAlbumDataFile));

    C.sortByDate(albumData);

    const errors = albumData.filter(obj => obj.error);
    if (errors.length) {
        for (const error of errors) {
            console.log(`\x1b[31;1m${error.error}\x1b[0m`);
        }
        return;
    }

    // TODO: error catching doesnt do anything on artists actually...
    // but for now we dont do any significant error throwing
    // (not any that wouldnt be caught elsewhere, later)
    // so i guess its not a big deal???? :o
    artistData = await processArtistDataFile(ARTIST_DATA_FILE);
    if (artistData.error) {
        console.log(`\x1b[31;1m${artistData.error}\x1b[0m`);
        return;
    }

    flashData = await processFlashDataFile(FLASH_DATA_FILE);
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

    allTracks = C.getAllTracks(albumData);
    artistNames = Array.from(new Set([
        ...albumData.reduce((acc, album) => acc.concat((album.coverArtists || []).map(({ who }) => who), album.tracks.reduce((acc, track) => acc.concat(track.artists, (track.coverArtists || []).map(({ who }) => who)), [])), []),
        ...flashData.filter(flash => !flash.act8r8k).reduce((acc, flash) => acc.concat(flash.contributors.map(({ who }) => who)), []),
        ...artistData.filter(artist => !artist.alias).map(artist => artist.name)
    ]));

    artistNames.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);

    officialAlbumData = albumData.filter(album => !album.isFanon);
    fandomAlbumData = albumData.filter(album => album.isFanon);
    justEverythingMan = C.sortByDate(albumData.concat(allTracks, flashData.filter(flash => !flash.act8r8k)));
    justEverythingSortedByArtDateMan = C.sortByArtDate(justEverythingMan.slice());
    // console.log(JSON.stringify(justEverythingSortedByArtDateMan.map(getHrefOfAnythingMan), null, 2));

    {
        let buffer = [];
        const clearBuffer = function() {
            if (buffer.length) {
                for (const entry of buffer.slice(0, -1)) {
                    console.log(`\x1b[2m... ${entry.name} ...\x1b[0m`);
                }
                const lastEntry = buffer[buffer.length - 1];
                console.log(`\x1b[2m... \x1b[0m${lastEntry.name}\x1b[0;2m ...\x1b[0m`);
                buffer = [];
            }
        };
        const showWhere = name => {
            const where = justEverythingMan.filter(thing => [...thing.coverArtists || [], ...thing.contributors || []].some(({ who }) => who === name) || [...thing.artists || []].includes(name));
            for (const thing of where) {
                console.log(`\x1b[31m- ` + (thing.album ? `(\x1b[1m${thing.album.name}\x1b[0;31m)` : '') + ` \x1b[1m${thing.name}\x1b[0m`);
            }
        };
        let CR4SH = false;
        for (let name of artistNames) {
            const entry = artistData.find(entry => entry.name === name);
            if (!entry) {
                clearBuffer();
                console.log(`\x1b[31mMissing entry for artist "\x1b[1m${name}\x1b[0;31m"\x1b[0m`);
                showWhere(name);
                CR4SH = true;
            } else if (entry.alias) {
                clearBuffer();
                console.log(`\x1b[31mArtist "\x1b[1m${name}\x1b[0;31m" should be named "\x1b[1m${entry.alias}\x1b[0;31m"\x1b[0m`);
                showWhere(name);
                CR4SH = true;
            } else {
                buffer.push(entry);
                if (buffer.length > 3) {
                    buffer.shift();
                }
            }
        }
        if (CR4SH) {
            return;
        } else {
            console.log(`All artist data is good!`);
        }
    }

    {
        const directories = [];
        for (const { directory, name } of albumData) {
            if (directories.includes(directory)) {
                console.log(`\x1b[31;1mDuplicate album directory "${directory}" (${name})\x1b[0m`);
                return;
            }
            directories.push(directory);
        }
    }

    {
        const directories = [];
        const where = {};
        for (const { directory, album } of allTracks) {
            if (directories.includes(directory)) {
                console.log(`\x1b[31;1mDuplicate track directory "${directory}"\x1b[0m`);
                console.log(`Shows up in:`);
                console.log(`- ${album.name}`);
                console.log(`- ${where[directory].name}`);
                return;
            }
            directories.push(directory);
            where[directory] = album;
        }
    }

    {
        const artists = [];
        const artistsLC = [];
        for (const name of artistNames) {
            if (!artists.includes(name) && artistsLC.includes(name.toLowerCase())) {
                const other = artists.find(oth => oth.toLowerCase() === name.toLowerCase());
                console.log(`\x1b[31;1mMiscapitalized artist name: ${name}, ${other}\x1b[0m`);
                return;
            }
            artists.push(name);
            artistsLC.push(name.toLowerCase());
        }
    }

    {
        for (const { references, name, album } of allTracks) {
            for (const ref of references) {
                // Skip these, for now.
                if (ref.includes("by")) {
                    continue;
                }
                if (!getLinkedTrack(ref)) {
                    console.warn(`\x1b[33mTrack not found "${ref}" in ${name} (${album.name})\x1b[0m`);
                }
            }
        }
    }

    await writeMiscellaneousPages();
    await progressPromiseAll(`Writing album & track pages.`, queue(albumData.map(album => writeIndexAndTrackPagesForAlbum(album)).reduce((a, b) => a.concat(b))));
    await writeArtistPages();
    await writeListingPages();
    await writeFlashPages();

    decorateTime.displayTime();

    // The single most important step.
    console.log('Written!');
}

main().catch(error => console.error(error));
