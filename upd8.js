#!/usr/bin/env node

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

// 2020-08-23
// ATTENTION ALL 8*TCHES AND OTHER GENDER TRUCKERS: AS IT TURNS OUT, THIS CODE
// ****SUCKS****. I DON'T THINK ANYTHING WILL EVER REDEEM IT, 8UT THAT DOESN'T
// MEAN WE CAN'T TAKE SOME ACTION TO MAKE WRITING IT A LITTLE LESS TERRI8LE.
// We're gonna start defining STRUCTURES to make things suck less!!!!!!!!
// No classes 8ecause those are a huge pain and like, pro8a8ly 8ad performance
// or whatever -- just some standard structures that should 8e followed
// wherever reasona8le. Only one I need today is the contri8 one 8ut let's put
// any new general-purpose structures here too, ok?
//
// Contri8ution: {who, what, date, thing}. D8 and thing are the new fields.
//
// Use these wisely, which is to say all the time and instead of whatever
// terri8le new pseudo structure you're trying to invent!!!!!!!!
//
// Upd8 2021-01-03: Soooooooo we didn't actually really end up using these,
// lol? Well there's still only one anyway. Kinda ended up doing a 8ig refactor
// of all the o8ject structures today. It's not *especially* relevant 8ut feels
// worth mentioning? I'd get rid of this comment 8lock 8ut I like it too much!
// Even though I haven't actually reread it, lol. 8ut yeah, hopefully in the
// spirit of this "make things more consistent" attitude I 8rought up 8ack in
// August, stuff's lookin' 8etter than ever now. W00t!

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
const symlink = util.promisify(fs.symlink);
const unlink = util.promisify(fs.unlink);

const {
    cacheOneArg,
    curry,
    decorateTime,
    filterEmptyLines,
    joinNoOxford,
    mapInPlace,
    parseOptions,
    progressPromiseAll,
    queue,
    s,
    splitArray,
    th,
    unique
} = require('./upd8-util');

const C = require('./common/common');

const CACHEBUST = 2;

const WIKI_INFO_FILE = 'wiki-info.txt';
const HOMEPAGE_INFO_FILE = 'homepage.txt';
const ARTIST_DATA_FILE = 'artists.txt';
const FLASH_DATA_FILE = 'flashes.txt';
const NEWS_DATA_FILE = 'news.txt';
const TAG_DATA_FILE = 'tags.txt';
const GROUP_DATA_FILE = 'groups.txt';
const STATIC_PAGE_DATA_FILE = 'static-pages.txt';

const CSS_FILE = 'site.css';

// Shared varia8les! These are more efficient to access than a shared varia8le
// (or at least I h8pe so), and are easier to pass across functions than a
// 8unch of specific arguments.
//
// Upd8: Okay yeah these aren't actually any different. Still cleaner than
// passing around a data object containing all this, though.
let dataPath;
let mediaPath;
let outputPath;

let wikiInfo;
let homepageInfo;
let albumData;
let trackData;
let flashData;
let newsData;
let tagData;
let groupData;
let staticPageData;

let artistNames;
let artistData;

let officialAlbumData;
let fandomAlbumData;
let justEverythingMan; // tracks, albums, flashes -- don't forget to upd8 getHrefOfAnythingMan!
let justEverythingSortedByArtDateMan;
let contributionData;

let queueSize;

// Note there isn't a 'find track data files' function. I plan on including the
// data for all tracks within an al8um collected in the single metadata file
// for that al8um. Otherwise there'll just 8e way too many files, and I'd also
// have to worry a8out linking track files to al8um files (which would contain
// only the track listing, not track data itself), and dealing with errors of
// missing track files (or track files which are not linked to al8ums). All a
// 8unch of stuff that's a pain to deal with for no apparent 8enefit.
async function findAlbumDataFiles(albumDirectory) {
    return (await readdir(path.join(albumDirectory)))
        .map(albumFile => path.join(albumDirectory, albumFile));
}

function* getSections(lines) {
    // ::::)
    const isSeparatorLine = line => /^-{8,}$/.test(line);
    yield* splitArray(lines, isSeparatorLine);
}

function getBasicField(lines, name) {
    const line = lines.find(line => line.startsWith(name + ':'));
    return line && line.slice(name.length + 1).trim();
}

function getBooleanField(lines, name) {
    // The ?? oper8tor (which is just, hilariously named, lol) can 8e used to
    // specify a default!
    const value = getBasicField(lines, name);
    switch (value) {
        case 'yes':
        case 'true':
            return true;
        case 'no':
        case 'false':
            return false;
        default:
            return null;
    }
}

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

    if (contributors.length === 1 && contributors[0].startsWith('<i>')) {
        const arr = [];
        arr.textContent = contributors[0];
        return arr;
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
    let endIndex = lines.findIndex((line, index) => index >= startIndex && line.length && !line.startsWith('    '));
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

function transformInline(text) {
    return text.replace(/\[\[(album:|artist:|flash:|track:|tag:|group:)?(.+?)\]\]/g, (match, category, ref, offset) => {
        if (category === 'album:') {
            const album = getLinkedAlbum(ref);
            if (album) {
                return fixWS`
                    <a href="${C.ALBUM_DIRECTORY}/${album.directory}/" style="${getLinkThemeString(album)}">${album.name}</a>
                `;
            } else {
                console.warn(`\x1b[33mThe linked album ${match} does not exist!\x1b[0m`);
                return ref;
            }
        } else if (category === 'artist:') {
            const artist = getLinkedArtist(ref);
            if (artist) {
                return `<a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(artist.name)}/">${artist.name}</a>`;
            } else {
                console.warn(`\x1b[33mThe linked artist ${artist} does not exist!\x1b[0m`);
                return ref;
            }
        } else if (category === 'flash:') {
            const flash = getLinkedFlash(ref);
            if (flash) {
                let name = flash.name;
                const nextCharacter = text[offset + match.length];
                const lastCharacter = name[name.length - 1];
                if (
                    ![' ', '\n', '<'].includes(nextCharacter) &&
                    lastCharacter === '.'
                ) {
                    name = name.slice(0, -1);
                }
                return getFlashLinkHTML(flash, name);
            } else {
                console.warn(`\x1b[33mThe linked flash ${match} does not exist!\x1b[0m`);
                return ref;
            }
        } else if (category === 'track:') {
            const track = getLinkedTrack(ref);
            if (track) {
                return fixWS`
                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                `;
            } else {
                console.warn(`\x1b[33mThe linked track ${match} does not exist!\x1b[0m`);
                return ref;
            }
        } else if (category === 'tag:') {
            const tag = getLinkedTag(ref);
            if (tag) {
                return fixWS`
                    <a href="${C.TAG_DIRECTORY}/${tag.directory}/" style="${getLinkThemeString(tag)}">${tag.name}</a>
                `;
            } else {
                console.warn(`\x1b[33mThe linked tag ${match} does not exist!\x1b[0m`);
                return ref;
            }
        } else if (category === 'group:') {
            const group = getLinkedGroup(ref);
            if (group) {
                return fixWS`
                    <a href="${C.GROUP_DIRECTORY}/${group.directory}/" style="${getLinkThemeString(group)}">${group.name}</a>
                `;
            } else {
                console.warn(`\x1b[33mThe linked group ${group} does not exist!\x1b[0m`);
                return ref;
            }
        } else {
            const track = getLinkedTrack(ref);
            if (track) {
                let name = ref.match(/(.*):/);
                if (name) {
                    name = name[1];
                } else {
                    name = track.name;
                }
                return fixWS`
                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${name}</a>
                `;
            } else {
                console.warn(`\x1b[33mThe linked track ${match} does not exist!\x1b[0m`);
                return ref;
            }
        }
    });
}

function parseAttributes(string) {
    const attributes = Object.create(null);
    const skipWhitespace = i => {
        const ws = /\s/;
        if (ws.test(string[i])) {
            const match = string.slice(i).match(/[^\s]/);
            if (match) {
                return i + match.index;
            } else {
                return string.length;
            }
        } else {
            return i;
        }
    };

    for (let i = 0; i < string.length;) {
        i = skipWhitespace(i);
        const aStart = i;
        const aEnd = i + string.slice(i).match(/[\s=]|$/).index;
        const attribute = string.slice(aStart, aEnd);
        i = skipWhitespace(aEnd);
        if (string[i] === '=') {
            i = skipWhitespace(i + 1);
            let end, endOffset;
            if (string[i] === '"' || string[i] === "'") {
                end = string[i];
                endOffset = 1;
                i++;
            } else {
                end = '\\s';
                endOffset = 0;
            }
            const vStart = i;
            const vEnd = i + string.slice(i).match(new RegExp(`${end}|$`)).index;
            const value = string.slice(vStart, vEnd);
            i = vEnd + endOffset;
            attributes[attribute] = value;
        } else {
            attributes[attribute] = attribute;
        }
    }
    return Object.fromEntries(Object.entries(attributes).map(([ key, val ]) => [
        key,
        val === 'true' ? true :
        val === 'false' ? false :
        val === key ? true :
        val
    ]));
}

function transformMultiline(text, treatAsDocument=false) {
    // Heck yes, HTML magics.

    text = transformInline(text.trim());

    if (treatAsDocument) {
        return text;
    }

    const outLines = [];

    const indentString = ' '.repeat(4);

    let levelIndents = [];
    const openLevel = indent => {
        // opening a sublist is a pain: to be semantically *and* visually
        // correct, we have to append the <ul> at the end of the existing
        // previous <li>
        const previousLine = outLines[outLines.length - 1];
        if (previousLine?.endsWith('</li>')) {
            // we will re-close the <li> later
            outLines[outLines.length - 1] = previousLine.slice(0, -5) + ' <ul>';
        } else {
            // if the previous line isn't a list item, this is the opening of
            // the first list level, so no need for indent
            outLines.push('<ul>');
        }
        levelIndents.push(indent);
    };
    const closeLevel = () => {
        levelIndents.pop();
        if (levelIndents.length) {
            // closing a sublist, so close the list item containing it too
            outLines.push(indentString.repeat(levelIndents.length) + '</ul></li>');
        } else {
            // closing the final list level! no need for indent here
            outLines.push('</ul>');
        }
    };

    // okay yes we should support nested formatting, more than one blockquote
    // layer, etc, but hear me out here: making all that work would basically
    // be the same as implementing an entire markdown converter, which im not
    // interested in doing lol. sorry!!!
    let inBlockquote = false;

    for (let line of text.split(/\r|\n|\r\n/)) {
        const imageLine = line.startsWith('<img');
        line = line.replace(/<img (.*?)>/g, (match, attributes) => img({
            lazy: true,
            link: true,
            ...parseAttributes(attributes)
        }));

        let indentThisLine = 0;
        let lineContent = line;
        let lineTag = 'p';

        const listMatch = line.match(/^( *)- *(.*)$/);
        if (listMatch) {
            // is a list item!
            if (!levelIndents.length) {
                // first level is always indent = 0, regardless of actual line
                // content (this is to avoid going to a lesser indent than the
                // initial level)
                openLevel(0);
            } else {
                // find level corresponding to indent
                const indent = listMatch[1].length;
                let i;
                for (i = levelIndents.length - 1; i >= 0; i--) {
                    if (levelIndents[i] <= indent) break;
                }
                // note: i cannot equal -1 because the first indentation level
                // is always 0, and the minimum indentation is also 0
                if (levelIndents[i] === indent) {
                    // same indent! return to that level
                    while (levelIndents.length - 1 > i) closeLevel();
                    // (if this is already the current level, the above loop
                    // will do nothing)
                } else if (levelIndents[i] < indent) {
                    // lesser indent! branch based on index
                    if (i === levelIndents.length - 1) {
                        // top level is lesser: add a new level
                        openLevel(indent);
                    } else {
                        // lower level is lesser: return to that level
                        while (levelIndents.length - 1 > i) closeLevel();
                    }
                }
            }
            // finally, set variables for appending content line
            indentThisLine = levelIndents.length;
            lineContent = listMatch[2];
            lineTag = 'li';
        } else {
            // not a list item! close any existing list levels
            while (levelIndents.length) closeLevel();

            // like i said, no nested shenanigans - quotes only appear outside
            // of lists. sorry!
            const quoteMatch = line.match(/^> *(.*)$/);
            if (quoteMatch) {
                // is a quote! open a blockquote tag if it doesnt already exist
                if (!inBlockquote) {
                    inBlockquote = true;
                    outLines.push('<blockquote>');
                }
                indentThisLine = 1;
                lineContent = quoteMatch[1];
            } else if (inBlockquote) {
                // not a quote! close a blockquote tag if it exists
                inBlockquote = false;
                outLines.push('</blockquote>');
            }
        }

        if (lineTag === 'p') {
            // certain inline element tags should still be postioned within a
            // paragraph; other elements (e.g. headings) should be added as-is
            const elementMatch = line.match(/^<(.*?)[ >]/);
            if (elementMatch && !imageLine && !['a', 'abbr', 'b', 'bdo', 'br', 'cite', 'code', 'data', 'datalist', 'del', 'dfn', 'em', 'i', 'img', 'ins', 'kbd', 'mark', 'output', 'picture', 'q', 'ruby', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'svg', 'time', 'var', 'wbr'].includes(elementMatch[1])) {
                lineTag = '';
            }
        }

        let pushString = indentString.repeat(indentThisLine);
        if (lineTag) {
            pushString += `<${lineTag}>${lineContent}</${lineTag}>`;
        } else {
            pushString += lineContent;
        }
        outLines.push(pushString);
    }

    // after processing all lines...

    // if still in a list, close all levels
    while (levelIndents.length) closeLevel();

    // if still in a blockquote, close its tag
    if (inBlockquote) {
        inBlockquote = false;
        outLines.push('</blockquote>');
    }

    return outLines.join('\n');
}

function transformLyrics(text) {
    // Different from transformMultiline 'cuz it joins multiple lines together
    // with line 8reaks (<br>); transformMultiline treats each line as its own
    // complete paragraph (or list, etc).

    // If it looks like old data, then like, oh god.
    // Use the normal transformMultiline tool.
    if (text.includes('<br')) {
        return transformMultiline(text);
    }

    text = transformInline(text.trim());

    let buildLine = '';
    const addLine = () => outLines.push(`<p>${buildLine}</p>`);
    const outLines = [];
    for (const line of text.split('\n')) {
        if (line.length) {
            if (buildLine.length) {
                buildLine += '<br>';
            }
            buildLine += line;
        } else if (buildLine.length) {
            addLine();
            buildLine = '';
        }
    }
    if (buildLine.length) {
        addLine();
    }
    return outLines.join('\n');
}

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
    const album = {};

    album.name = getBasicField(albumSection, 'Album');
    album.artists = getContributionField(albumSection, 'Artists') || getContributionField(albumSection, 'Artist');
    album.wallpaperArtists = getContributionField(albumSection, 'Wallpaper Art');
    album.wallpaperStyle = getMultilineField(albumSection, 'Wallpaper Style');
    album.date = getBasicField(albumSection, 'Date');
    album.trackArtDate = getBasicField(albumSection, 'Track Art Date') || album.date;
    album.coverArtDate = getBasicField(albumSection, 'Cover Art Date') || album.date;
    album.coverArtists = getContributionField(albumSection, 'Cover Art');
    album.hasTrackArt = getBooleanField(albumSection, 'Has Track Art') ?? true;
    album.trackCoverArtists = getContributionField(albumSection, 'Track Art');
    album.artTags = getListField(albumSection, 'Art Tags') || [];
    album.commentary = getCommentaryField(albumSection);
    album.urls = getListField(albumSection, 'URLs') || [];
    album.groups = getListField(albumSection, 'Groups') || [];
    album.directory = getBasicField(albumSection, 'Directory');
    album.isMajorRelease = getBooleanField(albumSection, 'Major Release') ?? false;

    if (album.artists && album.artists.error) {
        return {error: `${album.artists.error} (in ${album.name})`};
    }

    if (album.coverArtists && album.coverArtists.error) {
        return {error: `${album.coverArtists.error} (in ${album.name})`};
    }

    if (album.commentary && album.commentary.error) {
        return {error: `${album.commentary.error} (in ${album.name})`};
    }

    if (album.trackCoverArtists && album.trackCoverArtists.error) {
        return {error: `${album.trackCoverArtists.error} (in ${album.name})`};
    }

    if (!album.coverArtists) {
        return {error: `The album "${album.name}" is missing the "Cover Art" field.`};
    }

    album.color = (
        getBasicField(albumSection, 'Color') ||
        getBasicField(albumSection, 'FG')
    );

    if (!album.name) {
        return {error: 'Expected "Album" (name) field!'};
    }

    if (!album.date) {
        return {error: 'Expected "Date" field!'};
    }

    if (isNaN(Date.parse(album.date))) {
        return {error: `Invalid Date field: "${album.date}"`};
    }

    album.date = new Date(album.date);
    album.trackArtDate = new Date(album.trackArtDate);
    album.coverArtDate = new Date(album.coverArtDate);

    if (isNaN(Date.parse(album.trackArtDate))) {
        return {error: `Invalid Track Art Date field: "${album.trackArtDate}"`};
    }

    if (isNaN(Date.parse(album.coverArtDate))) {
        return {error: `Invalid Cover Art Date field: "${album.coverArtDate}"`};
    }

    if (!album.directory) {
        album.directory = C.getKebabCase(album.name);
    }

    album.tracks = [];

    // will be overwritten if a group section is found!
    album.usesGroups = false;

    let group = '';
    let groupColor = album.color;

    for (const section of sections.slice(1)) {
        // Just skip empty sections. Sometimes I paste a 8unch of dividers,
        // and this lets the empty sections doing that creates (temporarily)
        // exist without raising an error.
        if (!section.filter(Boolean).length) {
            continue;
        }

        const groupName = getBasicField(section, 'Group');
        if (groupName) {
            group = groupName;
            groupColor = (
                getBasicField(section, 'Color') ||
                getBasicField(section, 'FG') ||
                album.color
            );
            album.usesGroups = true;
            continue;
        }

        const track = {};

        track.name = getBasicField(section, 'Track');
        track.commentary = getCommentaryField(section);
        track.lyrics = getMultilineField(section, 'Lyrics');
        track.originalDate = getBasicField(section, 'Original Date');
        track.coverArtDate = getBasicField(section, 'Cover Art Date') || track.originalDate || album.trackArtDate;
        track.references = getListField(section, 'References') || [];
        track.artists = getContributionField(section, 'Artists') || getContributionField(section, 'Artist');
        track.coverArtists = getContributionField(section, 'Track Art');
        track.artTags = getListField(section, 'Art Tags') || [];
        track.contributors = getContributionField(section, 'Contributors') || [];
        track.directory = getBasicField(section, 'Directory');
        track.aka = getBasicField(section, 'AKA');

        if (!track.name) {
            return {error: `A track section is missing the "Track" (name) field (in ${album.name}, previous: ${album.tracks[album.tracks.length - 1]?.name}).`};
        }

        let durationString = getBasicField(section, 'Duration') || '0:00';
        track.duration = getDurationInSeconds(durationString);

        if (track.contributors.error) {
            return {error: `${track.contributors.error} (in ${track.name}, ${album.name})`};
        }

        if (track.commentary && track.commentary.error) {
            return {error: `${track.commentary.error} (in ${track.name}, ${album.name})`};
        }

        if (!track.artists) {
            // If an al8um has an artist specified (usually 8ecause it's a solo
            // al8um), let tracks inherit that artist. We won't display the
            // "8y <artist>" string on the al8um listing.
            if (album.artists) {
                track.artists = album.artists;
            } else {
                return {error: `The track "${track.name}" is missing the "Artist" field (in ${album.name}).`};
            }
        }

        if (!track.coverArtists) {
            if (getBasicField(section, 'Track Art') !== 'none' && album.hasTrackArt) {
                if (album.trackCoverArtists) {
                    track.coverArtists = album.trackCoverArtists;
                } else {
                    return {error: `The track "${track.name}" is missing the "Track Art" field (in ${album.name}).`};
                }
            }
        }

        if (track.coverArtists && track.coverArtists.length && track.coverArtists[0] === 'none') {
            track.coverArtists = null;
        }

        if (!track.directory) {
            track.directory = C.getKebabCase(track.name);
        }

        if (track.originalDate) {
            if (isNaN(Date.parse(track.originalDate))) {
                return {error: `The track "${track.name}"'s has an invalid "Original Date" field: "${track.originalDate}"`};
            }
            track.date = new Date(track.originalDate);
        } else {
            track.date = album.date;
        }

        track.coverArtDate = new Date(track.coverArtDate);

        const hasURLs = getBooleanField(section, 'Has URLs') ?? true;

        track.urls = hasURLs && (getListField(section, 'URLs') || []).filter(Boolean);

        if (hasURLs && !track.urls.length) {
            return {error: `The track "${track.name}" should have at least one URL specified.`};
        }

        // 8ack-reference the al8um o8ject! This is very useful for when
        // we're outputting the track pages.
        track.album = album;

        track.group = group;

        if (group) {
            track.color = groupColor;
        } else {
            track.color = album.color;
        }

        album.tracks.push(track);
    }

    return album;
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

    return sections.filter(s => s.filter(Boolean).length).map(section => {
        const name = getBasicField(section, 'Artist');
        const urls = (getListField(section, 'URLs') || []).filter(Boolean);
        const alias = getBasicField(section, 'Alias');
        const note = getMultilineField(section, 'Note');
        let directory = getBasicField(section, 'Directory');

        if (!name) {
            return {error: 'Expected "Artist" (name) field!'};
        }

        if (!directory) {
            directory = C.getArtistDirectory(name);
        }

        if (alias) {
            return {name, directory, alias};
        } else {
            return {name, directory, urls, note};
        }
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

    let act, color;
    return sections.map(section => {
        if (getBasicField(section, 'ACT')) {
            act = getBasicField(section, 'ACT');
            color = (
                getBasicField(section, 'Color') ||
                getBasicField(section, 'FG')
            );
            const anchor = getBasicField(section, 'Anchor');
            const jump = getBasicField(section, 'Jump');
            const jumpColor = getBasicField(section, 'Jump Color') || color;
            return {act8r8k: true, act, color, anchor, jump, jumpColor};
        }

        const name = getBasicField(section, 'Flash');
        let page = getBasicField(section, 'Page');
        let directory = getBasicField(section, 'Directory');
        let date = getBasicField(section, 'Date');
        const jiff = getBasicField(section, 'Jiff');
        const tracks = getListField(section, 'Tracks') || [];
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

        return {name, page, directory, date, contributors, tracks, urls, act, color, jiff};
    });
}

async function processNewsDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        return {error: `Could not read ${file} (${error.code}).`};
    }

    const contentLines = contents.split('\n');
    const sections = Array.from(getSections(contentLines));

    return sections.map(section => {
        const name = getBasicField(section, 'Name');
        if (!name) {
            return {error: 'Expected "Name" field!'};
        }

        const directory = getBasicField(section, 'Directory') || getBasicField(section, 'ID');
        if (!directory) {
            return {error: 'Expected "Directory" field!'};
        }

        let body = getMultilineField(section, 'Body');
        if (!body) {
            return {error: 'Expected "Body" field!'};
        }

        let date = getBasicField(section, 'Date');
        if (!date) {
            return {error: 'Expected "Date" field!'};
        }

        if (isNaN(Date.parse(date))) {
            return {error: `Invalid date field: "${date}"`};
        }

        date = new Date(date);

        let bodyShort = body.split('<hr class="split">')[0];

        return {
            name,
            directory,
            body,
            bodyShort,
            date
        };
    });
}

async function processTagDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        } else {
            return {error: `Could not read ${file} (${error.code}).`};
        }
    }

    const contentLines = contents.split('\n');
    const sections = Array.from(getSections(contentLines));

    return sections.map(section => {
        let isCW = false;

        let name = getBasicField(section, 'Tag');
        if (!name) {
            name = getBasicField(section, 'CW');
            isCW = true;
            if (!name) {
                return {error: 'Expected "Tag" or "CW" field!'};
            }
        }

        let color;
        if (!isCW) {
            color = getBasicField(section, 'Color');
            if (!color) {
                return {error: 'Expected "Color" field!'};
            }
        }

        const directory = C.getKebabCase(name);

        return {
            name,
            directory,
            isCW,
            color
        };
    });
}

async function processGroupDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        } else {
            return {error: `Could not read ${file} (${error.code}).`};
        }
    }

    const contentLines = contents.split('\n');
    const sections = Array.from(getSections(contentLines));

    let category, color;
    return sections.map(section => {
        if (getBasicField(section, 'Category')) {
            category = getBasicField(section, 'Category');
            color = getBasicField(section, 'Color');
            return {isCategory: true, name: category, color};
        }

        const name = getBasicField(section, 'Group');
        if (!name) {
            return {error: 'Expected "Group" field!'};
        }

        let directory = getBasicField(section, 'Directory');
        if (!directory) {
            directory = C.getKebabCase(name);
        }

        let description = getMultilineField(section, 'Description');
        if (!description) {
            return {error: 'Expected "Description" field!'};
        }

        let descriptionShort = description.split('<hr class="split">')[0];

        const urls = (getListField(section, 'URLs') || []).filter(Boolean);

        return {
            isGroup: true,
            name,
            directory,
            description,
            descriptionShort,
            urls,
            category,
            color
        };
    });
}

async function processStaticPageDataFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        } else {
            return {error: `Could not read ${file} (${error.code}).`};
        }
    }

    const contentLines = contents.split('\n');
    const sections = Array.from(getSections(contentLines));

    return sections.map(section => {
        const name = getBasicField(section, 'Name');
        if (!name) {
            return {error: 'Expected "Name" field!'};
        }

        const shortName = getBasicField(section, 'Short Name') || name;

        let directory = getBasicField(section, 'Directory');
        if (!directory) {
            return {error: 'Expected "Directory" field!'};
        }

        let content = getMultilineField(section, 'Content');
        if (!content) {
            return {error: 'Expected "Content" field!'};
        }

        let stylesheet = getMultilineField(section, 'Style') || '';

        let listed = getBooleanField(section, 'Listed') ?? true;
        let treatAsHTML = getBooleanField(section, 'Treat as HTML') ?? false;

        return {
            name,
            shortName,
            directory,
            content,
            stylesheet,
            listed,
            treatAsHTML
        };
    });
}

async function processWikiInfoFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        return {error: `Could not read ${file} (${error.code}).`};
    }

    // Unlike other data files, the site info data file isn't 8roken up into
    // more than one entry. So we operate on the plain old contentLines array,
    // rather than dividing into sections like we usually do!
    const contentLines = contents.split('\n');

    const name = getBasicField(contentLines, 'Name');
    if (!name) {
        return {error: 'Expected "Name" field!'};
    }

    const shortName = getBasicField(contentLines, 'Short Name') || name;

    const color = getBasicField(contentLines, 'Color') || '#0088ff';

    // This is optional! Without it, <meta rel="canonical"> tags won't 8e
    // gener8ted.
    const canonicalBase = getBasicField(contentLines, 'Canonical Base');

    // Also optional! In charge of <meta rel="description">.
    const description = getBasicField(contentLines, 'Description');

    const footer = getMultilineField(contentLines, 'Footer') || '';

    // We've had a comment lying around for ages, just reading:
    // "Might ena8le this later... we'll see! Eventually. May8e."
    // We still haven't! 8ut hey, the option's here.
    const enableArtistAvatars = getBooleanField(contentLines, 'Enable Artist Avatars') ?? false;

    const enableFlashesAndGames = getBooleanField(contentLines, 'Enable Flashes & Games') ?? false;
    const enableListings = getBooleanField(contentLines, 'Enable Listings') ?? false;
    const enableNews = getBooleanField(contentLines, 'Enable News') ?? false;
    const enableArtTagUI = getBooleanField(contentLines, 'Enable Art Tag UI') ?? false;
    const enableGroupUI = getBooleanField(contentLines, 'Enable Group UI') ?? false;

    return {
        name,
        shortName,
        color,
        canonicalBase,
        description,
        footer,
        features: {
            artistAvatars: enableArtistAvatars,
            flashesAndGames: enableFlashesAndGames,
            listings: enableListings,
            news: enableNews,
            artTagUI: enableArtTagUI,
            groupUI: enableGroupUI
        }
    };
}

async function processHomepageInfoFile(file) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        return {error: `Could not read ${file} (${error.code}).`};
    }

    const contentLines = contents.split('\n');
    const sections = Array.from(getSections(contentLines));

    const [ firstSection, ...rowSections ] = sections;

    const sidebar = getMultilineField(firstSection, 'Sidebar');

    const validRowTypes = ['albums'];

    const rows = rowSections.map(section => {
        const name = getBasicField(section, 'Row');
        if (!name) {
            return {error: 'Expected "Row" (name) field!'};
        }

        const color = getBasicField(section, 'Color');

        const type = getBasicField(section, 'Type');
        if (!type) {
            return {error: 'Expected "Type" field!'};
        }

        if (!validRowTypes.includes(type)) {
            return {error: `Expected "Type" field to be one of: ${validRowTypes.join(', ')}`};
        }

        const row = {name, color, type};

        switch (type) {
            case 'albums': {
                const group = getBasicField(section, 'Group') || null;
                const albums = getListField(section, 'Albums') || [];

                if (!group && !albums) {
                    return {error: 'Expected "Group" and/or "Albums" field!'};
                }

                let groupCount = getBasicField(section, 'Count');
                if ((group || newReleases) && !groupCount) {
                    return {error: 'Expected "Count" field!'};
                }

                if (groupCount) {
                    if (isNaN(parseInt(groupCount))) {
                        return {error: `Invalid Count field: "${groupCount}"`};
                    }

                    groupCount = parseInt(groupCount);
                }

                const actions = getListField(section, 'Actions') || [];
                if (actions.some(x => !x.startsWith('<a'))) {
                    return {error: 'Expected every action to be a <a>-type link!'};
                }

                return {...row, group, groupCount, albums, actions};
            }
        }
    });

    return {sidebar, rows};
}

function getDateString({ date }) {
    /*
    const pad = val => val.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    */
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    date = new Date(date);
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function getDurationString(secTotal) {
    if (secTotal === 0) {
        return '_:__'
    }

    let hour = Math.floor(secTotal / 3600)
    let min = Math.floor((secTotal - hour * 3600) / 60)
    let sec = Math.floor(secTotal - hour * 3600 - min * 60)

    const pad = val => val.toString().padStart(2, '0')

    if (hour > 0) {
        return `${hour}:${pad(min)}:${pad(sec)}`
    } else {
        return `${min}:${pad(sec)}`
    }
}

function getDurationInSeconds(string) {
    const parts = string.split(':').map(n => parseInt(n))
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1]
    } else {
        return 0
    }
}

function getTotalDuration(tracks) {
    return tracks.reduce((duration, track) => duration + track.duration, 0);
}

const stringifyIndent = 0;

const toRefs = (label, objectOrArray) => {
    if (Array.isArray(objectOrArray)) {
        return objectOrArray.filter(Boolean).map(x => `${label}:${x.directory}`);
    } else if (objectOrArray.directory) {
        throw new Error('toRefs should not be passed a single object with directory');
    } else if (typeof objectOrArray === 'object') {
        return Object.fromEntries(Object.entries(objectOrArray)
            .map(([ key, value ]) => [key, toRefs(key, value)]));
    } else {
        throw new Error('toRefs should be passed an array or object of arrays');
    }
};

function stringifyRefs(key, value) {
    switch (key) {
        case 'tracks':
        case 'references':
        case 'referencedBy':
            return toRefs('track', value);
        case 'artists':
        case 'contributors':
        case 'coverArtists':
        case 'trackCoverArtists':
            return value && value.map(({ who, what }) => ({who: `artist:${who.directory}`, what}));
        case 'albums': return toRefs('album', value);
        case 'flashes': return toRefs('flash', value);
        case 'groups': return toRefs('group', value);
        case 'artTags': return toRefs('tag', value);
        case 'aka': return value && `track:${value.directory}`;
        default:
            return value;
    }
}

function stringifyAlbumData() {
    return JSON.stringify(albumData, (key, value) => {
        switch (key) {
            case 'commentary':
                return '';
            default:
                return stringifyRefs(key, value);
        }
    }, stringifyIndent);
}

function stringifyTrackData() {
    return JSON.stringify(trackData, (key, value) => {
        switch (key) {
            case 'album':
            case 'commentary':
            case 'otherReleases':
                return undefined;
            default:
                return stringifyRefs(key, value);
        }
    }, stringifyIndent);
}

function stringifyFlashData() {
    return JSON.stringify(flashData, (key, value) => {
        switch (key) {
            case 'act':
            case 'commentary':
                return undefined;
            default:
                return stringifyRefs(key, value);
        }
    }, stringifyIndent);
}

function stringifyArtistData() {
    return JSON.stringify(artistData, (key, value) => {
        switch (key) {
            case 'asAny':
                return;
            case 'asArtist':
            case 'asContributor':
            case 'asCoverArtist':
                return toRefs('track', value);
            default:
                return stringifyRefs(key, value);
        }
    }, stringifyIndent);
}

function escapeAttributeValue(value) {
    return value.toString().replace(/"/g, '&quot;');
}

function attributes(attribs) {
    return Object.entries(attribs)
        .filter(([ key, val ]) => val !== '')
        .map(([ key, val ]) => `${key}="${escapeAttributeValue(val)}"`)
        .join(' ');
}

function img({
    src = '',
    alt = '',
    reveal = '',
    id = '',
    width = '',
    height = '',
    link = false,
    lazy = false,
    square = false
}) {
    const willSquare = square;
    const willLink = typeof link === 'string' || link;

    const imgAttributes = attributes({
        id: link ? '' : id,
        alt,
        width,
        height
    });

    const nonlazyHTML = wrap(`<img src="${src}" ${imgAttributes}>`);
    const lazyHTML = lazy && wrap(`<img class="lazy" data-original="${src}" ${imgAttributes}>`, true);

    if (lazy) {
        return fixWS`
            <noscript>${nonlazyHTML}</noscript>
            ${lazyHTML}
        `;
    } else {
        return nonlazyHTML;
    }

    function wrap(html, hide = false) {
        html = fixWS`
            <div class="image-inner-area">${html}</div>
        `;

        html = fixWS`
            <div class="image-container">${html}</div>
        `;

        if (reveal) {
            html = fixWS`
                <div class="reveal">
                    ${html}
                    <span class="reveal-text">${reveal}</span>
                </div>
            `;
        }

        if (willSquare) {
            html = fixWS`<div ${classes('square', hide && !willLink && 'js-hide')}><div class="square-content">${html}</div></div>`;
        }

        if (willLink) {
            html = `<a ${classes('box', hide && 'js-hide')} ${attributes({
                id,
                href: typeof link === 'string' ? link : src
            })}>${html}</a>`;
        }

        return html;
    }
}

async function writePage(directoryParts, {
    title = '',
    meta = {},
    theme = '',
    stylesheet = '',

    // missing properties are auto-filled, see below!
    body = {},
    main = {},
    sidebarLeft = {},
    sidebarRight = {},
    nav = {},
    footer = {}
}) {
    body.style ??= '';

    theme = theme ?? getThemeString(wikiInfo);

    main.classes ??= [];
    main.content ??= '';

    sidebarLeft ??= {};
    sidebarRight ??= {};

    for (const sidebar of [sidebarLeft, sidebarRight]) {
        sidebar.classes ??= [];
        sidebar.content ??= '';
        sidebar.collapse ??= true;
    }

    nav.classes ??= [];
    nav.content ??= '';
    nav.links ??= [];

    footer.classes ??= [];
    footer.content ??= (wikiInfo.footer ? transformMultiline(wikiInfo.footer) : '');

    const directory = path.join(outputPath, ...directoryParts);
    const file = path.join(directory, 'index.html');
    const href = path.join(...directoryParts, 'index.html');

    let targetPath = directoryParts.join('/');
    if (directoryParts.length) {
        targetPath += '/';
    }

    let canonical = '';
    if (wikiInfo.canonicalBase) {
        canonical = wikiInfo.canonicalBase + targetPath;
    }

    const collapseSidebars = (sidebarLeft.collapse !== false) && (sidebarRight.collapse !== false);

    const mainHTML = main.content && fixWS`
        <main id="content" ${classes(...main.classes || [])}>
            ${main.content}
        </main>
    `;

    const footerHTML = footer.content && fixWS`
        <footer id="footer" ${classes(...footer.classes || [])}>
            ${footer.content}
        </footer>
    `;

    const generateSidebarHTML = (id, {
        content,
        multiple,
        classes: sidebarClasses = [],
        collapse = true,
        wide = false
    }) => (content ? fixWS`
        <div id="${id}" ${classes(
            'sidebar-column',
            'sidebar',
            wide && 'wide',
            !collapse && 'no-hide',
            ...sidebarClasses
        )}>
            ${content}
        </div>
    ` : multiple ? fixWS`
        <div id="${id}" ${classes(
            'sidebar-column',
            'sidebar-multiple',
            wide && 'wide',
            !collapse && 'no-hide'
        )}>
            ${multiple.map(content => fixWS`
                <div ${classes(
                    'sidebar',
                    ...sidebarClasses
                )}>
                    ${content}
                </div>
            `).join('\n')}
        </div>
    ` : '');

    const sidebarLeftHTML = generateSidebarHTML('sidebar-left', sidebarLeft);
    const sidebarRightHTML = generateSidebarHTML('sidebar-right', sidebarRight);

    if (nav.simple) {
        nav.links = [
            ['./', wikiInfo.shortName],
            [href, title]
        ]
    }

    const links = (nav.links || []).filter(Boolean);

    const navLinkParts = [];
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const prev = links[i - 1];
        const next = links[i + 1];
        const [ href, title ] = link;
        let part = '';
        if (href) {
            if (prev && prev[0]) {
                part = '/ ';
            }
            part += `<a href="${href}">${title}</a>`;
        } else {
            if (next && prev) {
                part = '/ ';
            }
            part += `<span>${title}</span>`;
        }
        navLinkParts.push(part);
    }

    const navContentHTML = [
        nav.links.length && fixWS`
            <h2 class="highlight-last-link">
                ${navLinkParts.join('\n')}
            </h2>
        `,
        nav.content
    ].filter(Boolean).join('\n');

    const navHTML = navContentHTML && fixWS`
        <nav id="header" ${classes(...nav.classes || [])}>
            ${navContentHTML}
        </nav>
    `;

    const layoutHTML = [
        navHTML,
        (sidebarLeftHTML || sidebarRightHTML) ? fixWS`
            <div ${classes('layout-columns', !collapseSidebars && 'vertical-when-thin')}>
                ${sidebarLeftHTML}
                ${mainHTML}
                ${sidebarRightHTML}
            </div>
        ` : mainHTML,
        footerHTML
    ].filter(Boolean).join('\n');

    await mkdirp(directory);
    await writeFile(file, filterEmptyLines(rebaseURLs(directory, fixWS`
        <!DOCTYPE html>
        <html data-rebase="${path.relative(directory, outputPath)}">
            <head>
                <title>${title}</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                ${Object.entries(meta).filter(([ key, value ]) => value).map(([ key, value ]) => `<meta ${key}="${escapeAttributeValue(value)}">`).join('\n')}
                ${canonical && `<link rel="canonical" href="${canonical}">`}
                <link rel="stylesheet" href="${C.STATIC_DIRECTORY}/site.css?${CACHEBUST}">
                ${(theme || stylesheet) && fixWS`
                    <style>
                        ${theme}
                        ${stylesheet}
                    </style>
                `}
                <script src="${C.STATIC_DIRECTORY}/lazy-loading.js?${CACHEBUST}"></script>
            </head>
            <body ${attributes({style: body.style || ''})}>
                <div id="page-container">
                    ${mainHTML && fixWS`
                        <div id="skippers">
                            <span class="skipper"><a href="#content">Skip to content</a></span>
                            ${sidebarLeftHTML && `<span class="skipper"><a href="#sidebar-left">Skip to sidebar ${sidebarRightHTML && '(left)'}</a></span>`}
                            ${sidebarRightHTML && `<span class="skipper"><a href="#sidebar-right">Skip to sidebar ${sidebarLeftHTML && '(right)'}</a></span>`}
                            ${footerHTML && `<span class="skipper"><a href="#footer">Skip to footer</a></span>`}
                        </div>
                    `}
                    ${layoutHTML}
                </div>
                <script src="${C.COMMON_DIRECTORY}/common.js?${CACHEBUST}"></script>
                <script src="${C.STATIC_DIRECTORY}/client.js?${CACHEBUST}"></script>
            </body>
        </html>
    `)));
}

function getGridHTML({
    entries,
    srcFn,
    hrefFn,
    altFn = () => '',
    details = false,
    lazy = true
}) {
    return entries.map(({ large, item }, i) => fixWS`
        <a ${classes('grid-item', 'box', large && 'large-grid-item')} href="${hrefFn(item)}" style="${getLinkThemeString(item)}">
            ${img({
                src: srcFn(item),
                alt: altFn(item),
                lazy: (typeof lazy === 'number' ? i >= lazy : lazy),
                square: true,
                reveal: getRevealString(item.artTags)
            })}
            <span>${item.name}</span>
            ${details && fixWS`
                <span>(${s(item.tracks.length, 'track')}, ${getDurationString(getTotalDuration(item.tracks))})</span>
            `}
        </a>
    `).join('\n');
}

function getAlbumGridHTML(props) {
    return getGridHTML({
        srcFn: getAlbumCover,
        hrefFn: album => `${C.ALBUM_DIRECTORY}/${album.directory}/`,
        ...props
    });
}

function getAlbumGridHTML(props) {
    return getGridHTML({
        srcFn: getAlbumCover,
        hrefFn: album => `${C.ALBUM_DIRECTORY}/${album.directory}/`,
        ...props
    });
}

function getFlashGridHTML(props) {
    return getGridHTML({
        srcFn: getFlashCover,
        hrefFn: flash => `${C.FLASH_DIRECTORY}/${flash.directory}/`,
        altFn: () => 'flash art',
        ...props
    });
}

function getNewReleases(numReleases) {
    const latestFirst = albumData.slice().reverse();
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

function writeSymlinks() {
    return progressPromiseAll('Building site symlinks.', [
        link(path.join(__dirname, C.COMMON_DIRECTORY), C.COMMON_DIRECTORY),
        link(path.join(__dirname, C.STATIC_DIRECTORY), C.STATIC_DIRECTORY),
        link(mediaPath, C.MEDIA_DIRECTORY)
    ]);

    async function link(directory, target) {
        const file = path.join(outputPath, target);
        try {
            await unlink(file);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        await symlink(path.resolve(directory), file);
    }
}

async function writeHomepage() {
    await writePage([], {
        title: wikiInfo.name,

        meta: {
            description: wikiInfo.description
        },

        main: {
            classes: ['top-index'],
            content: fixWS`
                <h1>${wikiInfo.name}</h1>
                ${homepageInfo.rows.map((row, i) => fixWS`
                    <section class="row" style="${getLinkThemeString(row)}">
                        <h2>${row.name}</h2>
                        ${row.type === 'albums' && fixWS`
                            <div class="grid-listing">
                                ${getAlbumGridHTML({
                                    entries: (
                                        row.group === 'new-releases' ? getNewReleases(row.groupCount) :
                                        ((getLinkedGroup(row.group)?.albums || [])
                                            .slice()
                                            .reverse()
                                            .slice(0, row.groupCount)
                                            .map(album => ({item: album})))
                                    ).concat(row.albums
                                        .map(getLinkedAlbum)
                                        .map(album => ({item: album}))
                                    ),
                                    lazy: i > 0
                                })}
                                ${row.actions.length && fixWS`
                                    <div class="grid-actions">
                                        ${row.actions.map(action => action
                                            .replace('<a', '<a class="box grid-item"')).join('\n')}
                                    </div>
                                `}
                            </div>
                        `}
                    </section>
                `).join('\n')}
            `
        },

        sidebarLeft: homepageInfo.sidebar && {
            wide: true,
            collapse: false,
            // This is a pretty filthy hack! 8ut otherwise, the [[news]] part
            // gets treated like it's a reference to the track named "news",
            // which o8viously isn't what we're going for. Gotta catch that
            // 8efore we pass it to transformMultiline, 'cuz otherwise it'll
            // get repl8ced with just the word "news" (or anything else that
            // transformMultiline does with references it can't match) -- and
            // we can't match that for replacing it with the news column!
            //
            // And no, I will not make [[news]] into part of transformMultiline
            // (even though that would 8e hilarious).
            content: transformMultiline(homepageInfo.sidebar.replace('[[news]]', '__GENERATE_NEWS__')).replace('<p>__GENERATE_NEWS__</p>', wikiInfo.features.news ? fixWS`
                <h1>News</h1>
                ${newsData.slice(0, 3).map((entry, i) => fixWS`
                    <article ${classes('news-entry', i === 0 && 'first-news-entry')}>
                        <h2><time>${getDateString(entry)}</time> <a href="${C.NEWS_DIRECTORY}/${entry.directory}/">${entry.name}</a></h2>
                        ${transformMultiline(entry.bodyShort)}
                        ${entry.bodyShort !== entry.body && `<a href="${C.NEWS_DIRECTORY}/${entry.directory}/">(View rest of entry!)</a>`}
                    </article>
                `).join('\n')}
            ` : `<p><i>News requested in content description but this feature isn't enabled</i></p>`)
        },

        nav: {
            content: fixWS`
                <h2 class="dot-between-spans">
                    <span><a class="current" href="./">${wikiInfo.shortName}</a></span>
                    ${wikiInfo.features.listings && fixWS`
                        <span><a href="${C.LISTING_DIRECTORY}/">Listings</a></span>
                    `}
                    ${wikiInfo.features.news && fixWS`
                        <span><a href="${C.NEWS_DIRECTORY}/">News</a></span>
                    `}
                    ${wikiInfo.features.flashesAndGames && fixWS`
                        <span><a href="${C.FLASH_DIRECTORY}/">Flashes &amp; Games</a></span>
                    `}
                    ${staticPageData.filter(page => page.listed).map(page => fixWS`
                        <span><a href="${page.directory}/">${page.shortName}</a></span>
                    `).join('\n')}
                </h2>
            `
        }
    });
}

function writeNewsPages() {
    if (!wikiInfo.features.news) {
        return;
    }

    return progressPromiseAll('Writing news pages.', queue([
        writeNewsIndex,
        ...newsData.map(curry(writeNewsPage))
    ], queueSize));
}

async function writeNewsIndex() {
    await writePage([C.NEWS_DIRECTORY], {
        title: 'News',
        main: {
            content: fixWS`
                <div class="long-content news-index">
                    <h1>News</h1>
                    ${newsData.map(entry => fixWS`
                        <article id="${entry.directory}">
                            <h2><time>${getDateString(entry)}</time> <a href="${C.NEWS_DIRECTORY}/${entry.directory}/">${entry.name}</a></h2>
                            ${transformMultiline(entry.bodyShort)}
                            ${entry.bodyShort !== entry.body && `<p><a href="${C.NEWS_DIRECTORY}/${entry.directory}/">(View rest of entry!)</a></p>`}
                        </article>
                    `).join('\n')}
                </div>
            `
        },
        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.NEWS_DIRECTORY}/`, 'News']
            ]
        }
    });
}

async function writeNewsPage(entry) {
    // The newsData list is sorted reverse chronologically (newest ones first),
    // so the way we find next/previous entries is flipped from normal.
    const index = newsData.indexOf(entry)
    const previous = newsData[index + 1];
    const next = newsData[index - 1];
    const nextPreviousLinks = [
        previous && `<a href="${C.NEWS_DIRECTORY}/${previous.directory}/" id="previous-button" title="${previous.name}">Previous</a>`,
        next && `<a href="${C.NEWS_DIRECTORY}/${next.directory}/" id="next-button" title="${next.name}">Next</a>`
    ].filter(Boolean).join(', ');

    await writePage([C.NEWS_DIRECTORY, entry.directory], {
        title: `News - ${entry.name}`,
        main: {
            content: fixWS`
                <div class="long-content">
                    <h1>${entry.name}</h1>
                    <p>(Published ${getDateString(entry)}.)</p>
                    ${transformMultiline(entry.body)}
                </div>
            `
        },
        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.NEWS_DIRECTORY}/`, 'News'],
                [null, getDateString(entry) + ':'],
                [`${C.NEWS_DIRECTORY}/${entry.directory}/`, entry.name],
                nextPreviousLinks && [null, `(${nextPreviousLinks})`]
            ]
        }
    });
}

function writeMiscellaneousPages() {
    return progressPromiseAll('Writing miscellaneous pages.', [
        writeHomepage(),

        groupData?.some(group => group.directory === 'fandom') &&
        mkdirp(path.join(outputPath, 'albums', 'fandom'))
            .then(() => writeFile(path.join(outputPath, 'albums', 'fandom', 'index.html'),
                generateRedirectPage('Fandom - Gallery', `/${C.GROUP_DIRECTORY}/fandom/gallery/`))),

        groupData?.some(group => group.directory === 'official') &&
        mkdirp(path.join(outputPath, 'albums', 'official'))
            .then(() => writeFile(path.join(outputPath, 'albums', 'official', 'index.html'),
                generateRedirectPage('Official - Gallery', `/${C.GROUP_DIRECTORY}/official/gallery/`))),

        wikiInfo.features.flashesAndGames &&
        writePage([C.FLASH_DIRECTORY], {
            title: `Flashes & Games`,
            main: {
                classes: ['flash-index'],
                content: fixWS`
                    <h1>Flashes &amp; Games</h1>
                    <div class="long-content">
                        <p class="quick-info">Jump to:</p>
                        <ul class="quick-info">
                            ${flashData.filter(act => act.act8r8k && act.jump).map(({ anchor, jump, jumpColor }) => fixWS`
                                <li><a href="#${anchor}" style="${getLinkThemeString({color: jumpColor})}">${jump}</a></li>
                            `).join('\n')}
                        </ul>
                    </div>
                    ${flashData.filter(flash => flash.act8r8k).map((act, i) => fixWS`
                        <h2 id="${act.anchor}" style="${getLinkThemeString(act)}"><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act === act.act))}/">${act.act}</a></h2>
                        <div class="grid-listing">
                            ${getFlashGridHTML({
                                entries: (flashData
                                    .filter(flash => !flash.act8r8k && flash.act === act.act)
                                    .map(flash => ({item: flash}))),
                                lazy: i === 0 ? 4 : true
                            })}
                        </div>
                    `).join('\n')}
                `
            },

            /*
            sidebarLeft: {
                content: generateSidebarForFlashes(null)
            },
            */

            nav: {simple: true}
        }),

        writeFile(path.join(outputPath, 'data.json'), fixWS`
            {
                "albumData": ${stringifyAlbumData()},
                ${wikiInfo.features.flashesAndGames && `"flashData": ${stringifyFlashData()},`}
                "artistData": ${stringifyArtistData()}
            }
        `)
    ].filter(Boolean));
}

function writeStaticPages() {
    return progressPromiseAll(`Writing static pages.`, queue(staticPageData.map(curry(writeStaticPage)), queueSize));
}

async function writeStaticPage(staticPage) {
    await writePage([staticPage.directory], {
        title: staticPage.name,
        stylesheet: staticPage.stylesheet,
        main: {
            content: fixWS`
                <div class="long-content">
                    <h1>${staticPage.name}</h1>
                    ${transformMultiline(staticPage.content, staticPage.treatAsHTML)}
                </div>
            `
        },
        nav: {simple: true}
    });
}

function getRevealString(tags = []) {
    return tags.some(tag => tag.isCW) && (
        'cw: ' + tags.filter(tag => tag.isCW).map(tag => `<span class="reveal-tag">${tag.name}</span>`).join(', ')) + '<br><span class="reveal-interaction">click to show</span>'
}

function generateCoverLink({
    src,
    alt,
    tags = []
}) {
    return fixWS`
        <div id="cover-art-container">
            ${img({
                src,
                alt,
                id: 'cover-art',
                link: true,
                square: true,
                reveal: getRevealString(tags)
            })}
            ${wikiInfo.features.artTagUI && tags.filter(tag => !tag.isCW).length && `<p class="tags">Tags:
                ${tags.filter(tag => !tag.isCW).map(tag => fixWS`
                    <a href="${C.TAG_DIRECTORY}/${tag.directory}/" style="${getLinkThemeString(tag)}">${tag.name}</a>
                `).join(',\n')}
            </p>`}
        </div>
    `;
}

// This function title is my gr8test work of art.
// (The 8ehavior... well, um. Don't tell anyone, 8ut it's even 8etter.)
/* // RIP, 2k20-2k20.
function writeIndexAndTrackPagesForAlbum(album) {
    return [
        () => writeAlbumPage(album),
        ...album.tracks.map(track => () => writeTrackPage(track))
    ];
}
*/

function writeAlbumPages() {
    return progressPromiseAll(`Writing album pages.`, queue(albumData.map(curry(writeAlbumPage)), queueSize));
}

async function writeAlbumPage(album) {
    const trackToListItem = track => fixWS`
        <li style="${getLinkThemeString(track)}">
            (${getDurationString(track.duration)})
            <a href="${C.TRACK_DIRECTORY}/${track.directory}/">${track.name}</a>
            ${track.artists !== album.artists && fixWS`
                <span class="by">by ${getArtistString(track.artists)}</span>
            `}
        </li>
    `;

    const commentaryEntries = [album, ...album.tracks].filter(x => x.commentary).length;

    const listTag = getAlbumListTag(album);
    await writePage([C.ALBUM_DIRECTORY, album.directory], {
        title: album.name,
        stylesheet: getAlbumStylesheet(album),
        theme: getThemeString(album, [
            `--album-directory: ${album.directory}`
        ]),
        main: {
            content: fixWS`
                ${generateCoverLink({
                    src: getAlbumCover(album),
                    alt: 'album cover',
                    tags: album.artTags
                })}
                <h1>${album.name}</h1>
                <p>
                    ${album.artists && `By ${getArtistString(album.artists, true)}.<br>`}
                    ${album.coverArtists &&  `Cover art by ${getArtistString(album.coverArtists, true)}.<br>`}
                    ${album.wallpaperArtists && `Wallpaper art by ${getArtistString(album.wallpaperArtists, true)}.<br>`}
                    Released ${getDateString(album)}.
                    ${+album.coverArtDate !== +album.date && `<br>Art released ${getDateString({date: album.coverArtDate})}.`}
                    <br>Duration: ~${getDurationString(getTotalDuration(album.tracks))}.
                </p>
                ${commentaryEntries && `<p>View <a href="${C.COMMENTARY_DIRECTORY}/${C.ALBUM_DIRECTORY}/${album.directory}/">commentary page</a>!</p>`}
                ${album.urls.length && `<p>Listen on ${joinNoOxford(album.urls.map(url => fancifyURL(url, {album: true})), 'or')}.</p>`}
                ${album.usesGroups ? fixWS`
                    <dl class="album-group-list">
                        ${album.tracks.flatMap((track, i, arr) => [
                            (i > 0 && track.group !== arr[i - 1].group) && `</${listTag}></dd>`,
                            (i === 0 || track.group !== arr[i - 1].group) && fixWS`
                                ${track.group && `<dt>${track.group} (~${getDurationString(getTotalDuration(album.tracks.filter(({ group }) => group === track.group)))}):</dt>`}
                                <dd><${listTag === 'ol' ? `ol start="${i + 1}"` : listTag}>
                            `,
                            trackToListItem(track),
                            i === arr.length && `</${listTag}></dd>`
                        ].filter(Boolean)).join('\n')}
                    </dl>
                ` : fixWS`
                    <${listTag}>
                        ${album.tracks.map(trackToListItem).join('\n')}
                    </${listTag}>
                `}
                ${album.commentary && fixWS`
                    <p>Artist commentary:</p>
                    <blockquote>
                        ${transformMultiline(album.commentary)}
                    </blockquote>
                `}
            `
        },
        sidebarLeft: generateSidebarForAlbum(album),
        sidebarRight: generateSidebarRightForAlbum(album),
        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.ALBUM_DIRECTORY}/${album.directory}/`, album.name],
                [null, generateAlbumNavLinks(album)]
            ],
            content: fixWS`
                <div>
                    ${generateAlbumChronologyLinks(album)}
                </div>
            `
        }
    });
}

function getAlbumStylesheet(album) {
    if (album.wallpaperArtists) {
        return fixWS`
            body::before {
                background-image: url("${C.MEDIA_DIRECTORY}/${C.MEDIA_ALBUM_ART_DIRECTORY}/${album.directory}/bg.jpg");
                ${album.wallpaperStyle}
            }
        `;
    } else {
        return '';
    }
}

function writeTrackPages() {
    return progressPromiseAll(`Writing track pages.`, queue(trackData.map(curry(writeTrackPage)), queueSize));
}

async function writeTrackPage(track) {
    const { album } = track;
    const tracksThatReference = track.referencedBy;
    const ttrFanon = tracksThatReference.filter(t => t.album.groups.every(group => group.directory !== C.OFFICIAL_GROUP_DIRECTORY));
    const ttrOfficial = tracksThatReference.filter(t => t.album.groups.some(group => group.directory === C.OFFICIAL_GROUP_DIRECTORY));
    const tracksReferenced = track.references;
    const otherReleases = track.otherReleases;
    const listTag = getAlbumListTag(track.album);

    let flashesThatFeature;
    if (wikiInfo.features.flashesAndGames) {
        flashesThatFeature = C.sortByDate([track, ...otherReleases]
            .flatMap(track => track.flashes.map(flash => ({flash, as: track}))));
    }

    const generateTrackList = tracks => fixWS`
        <ul>
            ${tracks.map(track => fixWS`
                <li ${classes(track.aka && 'rerelease')}>
                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                    <span class="by">by ${getArtistString(track.artists)}</span>
                    ${track.aka && `<span class="rerelease-label">(re-release)</span>`}
                </li>
            `).join('\n')}
        </ul>
    `;

    const commentary = [
        track.commentary,
        ...otherReleases.map(track =>
            (track.commentary?.split('\n')
                .filter(line => line.replace(/<\/b>/g, '').includes(':</i>'))
                .flatMap(line => [line, `<i>See <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>!</i>`])
                .join('\n')))
    ].filter(Boolean).join('\n');

    await writePage([C.TRACK_DIRECTORY, track.directory], {
        title: track.name,
        stylesheet: getAlbumStylesheet(track.album),
        theme: getThemeString(track, [
            `--album-directory: ${album.directory}`,
            `--track-directory: ${track.directory}`
        ]),

        sidebarLeft: generateSidebarForAlbum(album, track),
        sidebarRight: generateSidebarRightForAlbum(album, track),

        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.ALBUM_DIRECTORY}/${album.directory}/`, album.name],
                listTag === 'ol' && [null, album.tracks.indexOf(track) + 1 + '.'],
                [`${C.TRACK_DIRECTORY}/${track.directory}/`, track.name],
                [null, generateAlbumNavLinks(album, track)]
            ].filter(Boolean),
            content: fixWS`
                <div>
                    ${generateAlbumChronologyLinks(album, track)}
                </div>
            `
        },

        main: {
            content: fixWS`
                ${generateCoverLink({
                    src: getTrackCover(track),
                    alt: 'track cover',
                    tags: track.artTags
                })}
                <h1>${track.name}</h1>
                <p>
                    By ${getArtistString(track.artists, true)}.
                    ${track.coverArtists &&  `<br>Cover art by ${getArtistString(track.coverArtists, true)}.`}
                    ${album.directory !== C.UNRELEASED_TRACKS_DIRECTORY && `<br>Released ${getDateString(track)}.`}
                    ${+track.coverArtDate !== +track.date && `<br>Art released ${getDateString({date: track.coverArtDate})}.`}
                    ${track.duration && `<br>Duration: ${getDurationString(track.duration)}.`}
                </p>
                ${track.urls.length ? fixWS`
                    <p>Listen on ${joinNoOxford(track.urls.map(fancifyURL), 'or')}.</p>
                ` : fixWS`
                    <p>This track has no URLs at which it can be listened.</p>
                `}
                ${otherReleases.length && fixWS`
                    <p>Also released as:</p>
                    <ul>
                        ${otherReleases.map(track => fixWS`
                            <li>
                                <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                                (on <a href="${C.ALBUM_DIRECTORY}/${track.album.directory}/" style="${getLinkThemeString(track.album)}">${track.album.name}</a>)
                            </li>
                        `).join('\n')}
                    </ul>
                `}
                ${track.contributors.textContent && fixWS`
                    <p>Contributors:<br>${transformInline(track.contributors.textContent)}</p>
                `}
                ${track.contributors.length && fixWS`
                    <p>Contributors:</p>
                    <ul>
                        ${track.contributors.map(contrib => `<li>${getArtistString([contrib], true)}</li>`).join('\n')}
                    </ul>
                `}
                ${tracksReferenced.length && fixWS`
                    <p>Tracks that <i>${track.name}</i> references:</p>
                    ${generateTrackList(tracksReferenced)}
                `}
                ${tracksThatReference.length && fixWS`
                    <p>Tracks that reference <i>${track.name}</i>:</p>
                    <dl>
                        ${ttrOfficial.length && fixWS`
                            <dt>Official:</dt>
                            <dd>${generateTrackList(ttrOfficial)}</dd>
                        `}
                        ${ttrFanon.length && fixWS`
                            <dt>Fandom:</dt>
                            <dd>${generateTrackList(ttrFanon)}</dd>
                        `}
                    </dl>
                `}
                ${wikiInfo.features.flashesAndGames && flashesThatFeature.length && fixWS`
                    <p>Flashes &amp; games that feature <i>${track.name}</i>:</p>
                    <ul>
                        ${flashesThatFeature.map(({ flash, as }) => fixWS`
                            <li ${classes(as !== track && 'rerelease')}>
                                ${getFlashLinkHTML(flash)}
                                ${as !== track && fixWS`
                                    (as <a href="${C.TRACK_DIRECTORY}/${as.directory}/" style="${getLinkThemeString(as)}">${as.name}</a>)
                                `}
                            </li>
                        `).join('\n')}
                    </ul>
                `}
                ${track.lyrics && fixWS`
                    <p>Lyrics:</p>
                    <blockquote>
                        ${transformLyrics(track.lyrics)}
                    </blockquote>
                `}
                ${commentary && fixWS`
                    <p>Artist commentary:</p>
                    <blockquote>
                        ${transformMultiline(commentary)}
                    </blockquote>
                `}
            `
        }
    });
}

async function writeArtistPages() {
    await progressPromiseAll('Writing artist pages.', queue(artistData.map(curry(writeArtistPage)), queueSize));
}

async function writeArtistPage(artist) {
    if (artist.alias) {
        return writeArtistAliasPage(artist);
    }

    const {
        name,
        urls = [],
        note = ''
    } = artist;

    const artThingsAll = C.sortByDate(unique([...artist.tracks.asCoverArtist, ...artist.albums.asCoverArtist, ...artist.albums.asWallpaperArtist]));
    const artThingsGallery = C.sortByDate([...artist.albums.asCoverArtist, ...artist.tracks.asCoverArtist]);
    const commentaryThings = C.sortByDate([...artist.albums.asCommentator, ...artist.tracks.asCommentator]);

    let flashes;
    if (wikiInfo.features.flashesAndGames) {
        flashes = artist.flashes.asContributor;
    }

    const unreleasedTracks = unique([...artist.tracks.asArtist, ...artist.tracks.asContributor])
        .filter(track => track.album.directory === C.UNRELEASED_TRACKS_DIRECTORY);
    const releasedTracks = unique([...artist.tracks.asArtist, ...artist.tracks.asContributor])
        .filter(track => track.album.directory !== C.UNRELEASED_TRACKS_DIRECTORY);

    const generateTrackList = tracks => albumChunkedList(tracks, (track, i) => {
        const contrib = {
            who: artist,
            what: track.contributors.filter(({ who }) => who === artist).map(({ what }) => what).join(', ')
        };
        const { flashes } = track;
        return fixWS`
            <li ${classes(track.aka && 'rerelease')} title="${th(i + 1)} track by ${name}; ${th(track.album.tracks.indexOf(track) + 1)} in ${track.album.name}">
                ${track.duration && `(${getDurationString(track.duration)})`}
                <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                ${track.artists.some(({ who }) => who === artist) && track.artists.length > 1 && `<span class="contributed">(with ${getArtistString(track.artists.filter(({ who }) => who !== artist))})</span>`}
                ${contrib.what && `<span class="contributed">(${getContributionString(contrib) || 'contributed'})</span>`}
                ${wikiInfo.features.flashesAndGames && flashes.length && `<br><span class="flashes">(Featured in ${joinNoOxford(flashes.map(flash => getFlashLinkHTML(flash)))})</span></br>`}
                ${track.aka && `<span class="rerelease-label">(re-release)</span>`}
            </li>
        `;
    });

    // Shish!
    const index = `${C.ARTIST_DIRECTORY}/${artist.directory}/`;
    const avatarPath = path.join(C.MEDIA_ARTIST_AVATAR_DIRECTORY, artist.directory + '.jpg');
    await writePage([C.ARTIST_DIRECTORY, artist.directory], {
        title: name,

        main: {
            content: fixWS`
                ${(wikiInfo.features.artistAvatars &&
                    await access(path.join(mediaPath, avatarPath)).then(() => true, () => false) &&
                    generateCoverLink({
                        src: path.join(C.MEDIA_DIRECTORY, avatarPath),
                        alt: 'artist avatar'
                    })
                )}
                <h1>${name}</h1>
                ${note && fixWS`
                    <p>Note:</p>
                    <blockquote>
                        ${transformMultiline(note)}
                    </blockquote>
                    <hr>
                `}
                ${urls.length && `<p>Visit on ${joinNoOxford(urls.map(fancifyURL), 'or')}.</p>`}
                ${artThingsGallery.length && `<p>View <a href="${C.ARTIST_DIRECTORY}/${artist.directory}/gallery/">art gallery</a>!</p>`}
                <p>Jump to: ${[
                    [
                        [...releasedTracks, ...unreleasedTracks].length && `<a href="${index}#tracks">Tracks</a>`,
                        unreleasedTracks.length && `(<a href="${index}#unreleased-tracks">Unreleased Tracks</a>)`
                    ].filter(Boolean).join(' '),
                    artThingsAll.length && `<a href="${index}#art">Art</a>`,
                    wikiInfo.features.flashesAndGames && flashes.length && `<a href="${index}#flashes">Flashes &amp; Games</a>`,
                    commentaryThings.length && `<a href="${index}#commentary">Commentary</a>`
                ].filter(Boolean).join(', ')}.</p>
                ${[...releasedTracks, ...unreleasedTracks].length && fixWS`
                    <h2 id="tracks">Tracks</h2>
                `}
                ${releasedTracks.length && fixWS`
                    <p>${name} has contributed ~${getDurationString(getTotalDuration(releasedTracks))} ${getTotalDuration(releasedTracks) > 3600 ? 'hours' : 'minutes'} of music collected on this wiki.</p>
                    ${generateTrackList(releasedTracks)}
                `}
                ${unreleasedTracks.length && fixWS`
                    <h3 id="unreleased-tracks">Unreleased Tracks</h3>
                    ${generateTrackList(unreleasedTracks)}
                `}
                ${artThingsAll.length && fixWS`
                    <h2 id="art">Art</h2>
                    ${artThingsGallery.length && `<p>View <a href="${C.ARTIST_DIRECTORY}/${artist.directory}/gallery/">art gallery</a>! Or browse the list:</p>`}
                    ${albumChunkedList(artThingsAll, (thing, i) => {
                        const cover = {
                            artists: thing.coverArtists,
                            contrib: thing.coverArtists.find(({ who }) => who === artist)
                        };
                        const bg = {
                            artists: thing.wallpaperArtists,
                            contrib: thing.wallpaperArtists?.find(({ who }) => who === artist)
                        };
                        return [cover, bg].filter(x => x.contrib).map(({ artists, contrib }) => fixWS`
                            <li title="${th(i + 1)} art by ${name}${thing.album && `; ${th(thing.album.tracks.indexOf(thing) + 1)} track in ${thing.album.name}`}">
                                ${thing.album ? fixWS`
                                    <a href="${C.TRACK_DIRECTORY}/${thing.directory}/" style="${getLinkThemeString(thing)}">${thing.name}</a>
                                ` : (contrib === bg.contrib) ? '<i>(wallpaper art)</i>' : '<i>(cover art)</i>'}
                                ${artists.length > 1 && `<span class="contributed">(with ${getArtistString(artists.filter(({ who }) => who !== artist))})</span>`}
                                ${contrib.what && `<span class="contributed">(${getContributionString(contrib)})</span>`}
                            </li>
                        `).join('\n');
                    }, true, 'coverArtDate')}
                `}
                ${wikiInfo.features.flashesAndGames && flashes.length && fixWS`
                    <h2 id="flashes">Flashes &amp; Games</h2>
                    ${actChunkedList(flashes, flash => {
                        const contributionString = flash.contributors.filter(({ who }) => who === artist).map(getContributionString).join(' ');
                        return fixWS`
                            <li>
                                <a href="${C.FLASH_DIRECTORY}/${flash.directory}/" style="${getLinkThemeString(flash)}">${flash.name}</a>
                                ${contributionString && `<span class="contributed">(${contributionString})</span>`}
                                (${getDateString({date: flash.date})})
                            </li>
                        `
                    })}
                `}
                ${commentaryThings.length && fixWS`
                    <h2 id="commentary">Commentary</h2>
                    ${albumChunkedList(commentaryThings, thing => {
                        const { flashes } = thing;
                        return fixWS`
                            <li>
                                ${thing.album ? fixWS`
                                    <a href="${C.TRACK_DIRECTORY}/${thing.directory}/" style="${getLinkThemeString(thing)}">${thing.name}</a>
                                ` : '(album commentary)'}
                                ${wikiInfo.features.flashesAndGames && flashes?.length && `<br><span class="flashes">(Featured in ${joinNoOxford(flashes.map(flash => getFlashLinkHTML(flash)))})</span></br>`}
                            </li>
                        `
                    }, false)}
                    </ul>
                `}
            `
        },

        nav: {
            links: [
                ['./', wikiInfo.shortName],
                wikiInfo.features.listings && [`${C.LISTING_DIRECTORY}/`, 'Listings'],
                [null, 'Artist:'],
                [`${C.ARTIST_DIRECTORY}/${artist.directory}/`, name],
                artThingsGallery.length && [null, `(${[
                    `<a href="${C.ARTIST_DIRECTORY}/${artist.directory}/" class="current">Info</a>`,
                    `<a href="${C.ARTIST_DIRECTORY}/${artist.directory}/gallery/">Gallery</a>`
                ].join(', ')})`]
            ]
        }
    });

    if (artThingsGallery.length) {
        await writePage([C.ARTIST_DIRECTORY, artist.directory, 'gallery'], {
            title: name + ' - Gallery',

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${name} - Gallery</h1>
                    <p class="quick-info">(Contributed to ${s(artThingsGallery.length, 'cover art')})</p>
                    <div class="grid-listing">
                        ${getGridHTML({
                            entries: artThingsGallery.map(item => ({item})),
                            srcFn: thing => (thing.album
                                ? getTrackCover(thing)
                                : getAlbumCover(thing)),
                            hrefFn: thing => (thing.album
                                ? `${C.TRACK_DIRECTORY}/${thing.directory}/`
                                : `${C.ALBUM_DIRECTORY}/${thing.directory}`)
                        })}
                    </div>
                `
            },

            nav: {
                links: [
                    ['./', wikiInfo.shortName],
                    wikiInfo.features.listings && [`${C.LISTING_DIRECTORY}/`, 'Listings'],
                    [null, 'Artist:'],
                    [`${C.ARTIST_DIRECTORY}/${artist.directory}/`, name],
                    [null, `(${[
                        `<a href="${C.ARTIST_DIRECTORY}/${artist.directory}/">Info</a>`,
                        `<a href="${C.ARTIST_DIRECTORY}/${artist.directory}/gallery/" class="current">Gallery</a>`
                    ].join(', ')})`]
                ]
            }
        });
    }
}

async function writeArtistAliasPage(artist) {
    const { alias } = artist;

    const directory = path.join(outputPath, C.ARTIST_DIRECTORY, artist.directory);
    const file = path.join(directory, 'index.html');
    const target = `/${C.ARTIST_DIRECTORY}/${alias.directory}/`;

    await mkdirp(directory);
    await writeFile(file, generateRedirectPage(alias.name, target));
}

function generateRedirectPage(title, target) {
    return fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Moved to ${title}</title>
                <meta charset="utf-8">
                <meta http-equiv="refresh" content="0;url=${target}">
                <link rel="canonical" href="${target}">
                <link rel="stylesheet" href="static/site-basic.css">
            </head>
            <body>
                <main>
                    <h1>Moved to ${title}</h1>
                    <p>This page has been moved to <a href="${target}">${target}</a>.</p>
                </main>
            </body>
        </html>
    `;
}

function albumChunkedList(tracks, getLI, showDate = true, datePropertyOrFn = 'date') {
    const getAlbum = thing => thing.album ? thing.album : thing;
    const dateFn = (typeof datePropertyOrFn === 'function'
        ? datePropertyOrFn
        : track => track[datePropertyOrFn]);
    return fixWS`
        <dl>
            ${tracks.slice().sort((a, b) => dateFn(a) - dateFn(b)).map((thing, i, sorted) => {
                const li = getLI(thing, i);
                const album = getAlbum(thing);
                const previous = sorted[i - 1];
                if (i === 0 || album !== getAlbum(previous) || (showDate && +dateFn(thing) !== +dateFn(previous))) {
                    const heading = fixWS`
                        <dt>
                            <a href="${C.ALBUM_DIRECTORY}/${getAlbum(thing).directory}/" style="${getLinkThemeString(getAlbum(thing))}">${getAlbum(thing).name}</a>
                            ${showDate && `(${getDateString({date: dateFn(thing)})})`}
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
                            <a href="${C.FLASH_DIRECTORY}/${sorted.find(flash => !flash.act8r8k && flash.act === act).directory}/" style="${getLinkThemeString(flash)}">${flash.act}</a>
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
    await progressPromiseAll('Writing Flash pages.', queue(flashData
        .filter(flash => !flash.act8r8k)
        .map(curry(writeFlashPage)), queueSize));
}

async function writeFlashPage(flash) {
    const kebab = getFlashDirectory(flash);

    const flashes = flashData.filter(flash => !flash.act8r8k);
    const index = flashes.indexOf(flash);
    const previous = flashes[index - 1];
    const next = flashes[index + 1];
    const parts = [
        previous && `<a href="${getHrefOfAnythingMan(previous)}" id="previous-button" title="${previous.name}">Previous</a>`,
        next && `<a href="${getHrefOfAnythingMan(next)}" id="next-button" title="${next.name}">Next</a>`
    ].filter(Boolean);

    await writePage([C.FLASH_DIRECTORY, kebab], {
        title: flash.name,
        theme: getThemeString(flash, [
            `--flash-directory: ${flash.directory}`
        ]),
        main: {
            content: fixWS`
                <h1>${flash.name}</h1>
                ${generateCoverLink({
                    src: getFlashCover(flash),
                    alt: 'cover art'
                })}
                <p>Released ${getDateString(flash)}.</p>
                ${(flash.page || flash.urls.length) && `<p>Play on ${joinNoOxford(
                    [
                        flash.page && getFlashLink(flash),
                        ...flash.urls
                    ].map(url => fancifyFlashURL(url, flash)), 'or')}.</p>`}
                ${flash.contributors.textContent && fixWS`
                    <p>Contributors:<br>${transformInline(flash.contributors.textContent)}</p>
                `}
                ${flash.tracks.length && fixWS`
                    <p>Tracks featured in <i>${flash.name.replace(/\.$/, '')}</i>:</p>
                    <ul>
                        ${flash.tracks.map(track => fixWS`
                            <li>
                                <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                                <span class="by">by ${getArtistString(track.artists)}</span>
                            </li>
                        `).join('\n')}
                    </ul>
                `}
                ${flash.contributors.length && fixWS`
                    <p>Contributors:</p>
                    <ul>
                        ${flash.contributors.map(contrib => fixWS`<li>${getArtistString([contrib], true)}</li>`).join('\n')}
                    </ul>
                `}
            `
        },
        sidebarLeft: {
            content: generateSidebarForFlashes(flash)
        },
        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.FLASH_DIRECTORY}/`, `Flashes &amp; Games`],
                [`${C.FLASH_DIRECTORY}/${kebab}/`, flash.name],
                parts.length && [null, `(${parts.join(', ')})`]
            ].filter(Boolean),
            content: fixWS`
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
                    })}
                </div>
            `
        }
    });
}

function generateSidebarForFlashes(flash) {
    const act6 = flashData.findIndex(f => f.act.startsWith('Act 6'));
    const postCanon = flashData.findIndex(f => f.act.includes('Post Canon'));
    const outsideCanon = postCanon + flashData.slice(postCanon).findIndex(f => !f.act.includes('Post Canon'));
    const index = flashData.indexOf(flash);
    const side = (
        (index < 0) ? 0 :
        (index < act6) ? 1 :
        (index <= outsideCanon) ? 2 :
        3
    );
    const currentAct = flash && flash.act;

    return fixWS`
        <h1><a href="${C.FLASH_DIRECTORY}/">Flashes &amp; Games</a></h1>
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
            ).flatMap(({ act, color }) => [
                act.startsWith('Act 1') && `<dt ${classes('side', side === 1 && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act.startsWith('Act 1')))}/" style="--primary-color: #4ac925">Side 1 (Acts 1-5)</a></dt>`
                || act.startsWith('Act 6 Act 1') && `<dt ${classes('side', side === 2 && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act.startsWith('Act 6')))}/" style="--primary-color: #1076a2">Side 2 (Acts 6-7)</a></dt>`
                || act.startsWith('Hiveswap Act 1') && `<dt ${classes('side', side === 3 && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act.startsWith('Hiveswap')))}/" style="--primary-color: #008282">Outside Canon (Misc. Games)</a></dt>`,
                (
                    flashData.findIndex(f => f.act === act) < act6 ? side === 1 :
                    flashData.findIndex(f => f.act === act) < outsideCanon ? side === 2 :
                    true
                ) && `<dt ${classes(act === currentAct && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flashData.find(f => !f.act8r8k && f.act === act))}/" style="${getLinkThemeString({color})}">${act}</a></dt>`,
                act === currentAct && fixWS`
                    <dd><ul>
                        ${flashData.filter(f => !f.act8r8k && f.act === act).map(f => fixWS`
                            <li ${classes(f === flash && 'current')}><a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(f)}/" style="${getLinkThemeString(f)}">${f.name}</a></li>
                        `).join('\n')}
                    </ul></dd>
                `
            ]).filter(Boolean).join('\n')}
        </dl>
    `;
}

function writeListingPages() {
    if (!wikiInfo.features.listings) {
        return;
    }

    const reversedTracks = trackData.slice().reverse();
    const reversedArtThings = justEverythingSortedByArtDateMan.slice().reverse();

    const getAlbumLI = (album, extraText = '') => fixWS`
        <li>
            <a href="${C.ALBUM_DIRECTORY}/${album.directory}/" style="${getLinkThemeString(album)}">${album.name}</a>
            ${extraText}
        </li>
    `;

    const sortByName = (a, b) => {
        let an = a.name.toLowerCase();
        let bn = b.name.toLowerCase();
        if (an.startsWith('the ')) an = an.slice(4);
        if (bn.startsWith('the ')) bn = bn.slice(4);
        return an < bn ? -1 : an > bn ? 1 : 0;
    };

    const listingDescriptors = [
        [['albums', 'by-name'], `Albums - by Name`, albumData.slice()
            .sort(sortByName)
            .map(album => getAlbumLI(album, `(${album.tracks.length} tracks)`))],
        [['albums', 'by-tracks'], `Albums - by Tracks`, albumData.slice()
            .sort((a, b) => b.tracks.length - a.tracks.length)
            .map(album => getAlbumLI(album, `(${s(album.tracks.length, 'track')})`))],
        [['albums', 'by-duration'], `Albums - by Duration`, albumData.slice()
            .map(album => ({album, duration: getTotalDuration(album.tracks)}))
            .sort((a, b) => b.duration - a.duration)
            .map(({ album, duration }) => getAlbumLI(album, `(${getDurationString(duration)})`))],
        [['albums', 'by-date'], `Albums - by Date`, C.sortByDate(albumData.filter(album => album.directory !== C.UNRELEASED_TRACKS_DIRECTORY))
            .map(album => getAlbumLI(album, `(${getDateString(album)})`))],
        [['artists', 'by-name'], `Artists - by Name`, artistData
            .filter(artist => !artist.alias)
            .sort(sortByName)
            .map(artist => fixWS`
                <li>
                    <a href="${C.ARTIST_DIRECTORY}/${artist.directory}/">${artist.name}</a>
                    (${'' + C.getArtistNumContributions(artist)} <abbr title="contributions (to ${joinNoOxford(['music', 'art', wikiInfo.features.flashesAndGames && 'flashes'])})">c.</abbr>)
                </li>
            `)],
        [['artists', 'by-contribs'], `Artists - by Contributions`, fixWS`
            <div class="content-columns">
                <div class="column">
                    <h2>Track Contributors</h2>
                    <ul>
                        ${artistData
                            .filter(artist => !artist.alias)
                            .map(artist => ({
                                name: artist.name,
                                contribs: (
                                    artist.tracks.asContributor.length +
                                    artist.tracks.asArtist.length
                                )
                            }))
                            .sort((a, b) => b.contribs - a.contribs)
                            .filter(({ contribs }) => contribs)
                            .map(({ name, contribs }) => fixWS`
                                <li>
                                    <a href="${C.ARTIST_DIRECTORY}/${C.getArtistDirectory(name)}">${name}</a>
                                    (${contribs} <abbr title="contributions (to track music)">c.</abbr>)
                                </li>
                            `)
                            .join('\n')
                        }
                    </ul>
                </div>
                <div class="column">
                    <h2>Art${wikiInfo.features.flashesAndGames ? ` &amp; Flash` : ''} Contributors</h2>
                    <ul>
                        ${artistData
                            .filter(artist => !artist.alias)
                            .map(artist => ({
                                artist,
                                contribs: (
                                    artist.tracks.asCoverArtist.length +
                                    artist.albums.asCoverArtist.length +
                                    artist.albums.asWallpaperArtist.length +
                                    (wikiInfo.features.flashesAndGames ? artist.flashes.asContributor.length : 0)
                                )
                            }))
                            .sort((a, b) => b.contribs - a.contribs)
                            .filter(({ contribs }) => contribs)
                            .map(({ artist, contribs }) => fixWS`
                                <li>
                                    <a href="${C.ARTIST_DIRECTORY}/${artist.directory}">${artist.name}</a>
                                    (${contribs} <abbr title="contributions (to art${wikiInfo.features.flashesAndGames ? ' and flashes' : ''})">c.</abbr>)
                                </li>
                            `)
                            .join('\n')
                        }
                    </ul>
                </div>
            </div>
        `],
        [['artists', 'by-commentary'], `Artists - by Commentary Entries`, artistData
            .filter(artist => !artist.alias)
            .map(artist => ({artist, commentary: artist.tracks.asCommentator.length + artist.albums.asCommentator.length}))
            .filter(({ commentary }) => commentary > 0)
            .sort((a, b) => b.commentary - a.commentary)
            .map(({ artist, commentary }) => fixWS`
                <li>
                    <a href="${C.ARTIST_DIRECTORY}/${artist.directory}/#commentary">${artist.name}</a>
                    (${commentary} ${commentary === 1 ? 'entry' : 'entries'})
                </li>
            `)],
        [['artists', 'by-duration'], `Artists - by Duration`, artistData
            .filter(artist => !artist.alias)
            .map(artist => ({artist, duration: getTotalDuration(
                [...artist.tracks.asArtist, ...artist.tracks.asContributor].filter(track => track.album.directory !== C.UNRELEASED_TRACKS_DIRECTORY))
            }))
            .filter(({ duration }) => duration > 0)
            .sort((a, b) => b.duration - a.duration)
            .map(({ artist, duration }) => fixWS`
                <li>
                    <a href="${C.ARTIST_DIRECTORY}/${artist.directory}/#tracks">${artist.name}</a>
                    (~${getDurationString(duration)})
                </li>
            `)],
        [['artists', 'by-latest'], `Artists - by Latest Contribution`, fixWS`
            <div class="content-columns">
                <div class="column">
                    <h2>Track Contributors</h2>
                    <ul>
                        ${C.sortByDate(artistData
                            .filter(artist => !artist.alias)
                            .map(artist => ({
                                artist,
                                date: reversedTracks.find(({ album, artists, contributors }) => (
                                    album.directory !== C.UNRELEASED_TRACKS_DIRECTORY &&
                                    [...artists, ...contributors].some(({ who }) => who === artist)
                                ))?.date
                            }))
                            .filter(({ date }) => date)
                            .sort((a, b) => a.name < b.name ? 1 : a.name > b.name ? -1 : 0)
                        ).reverse().map(({ artist, date }) => fixWS`
                            <li>
                                <a href="${C.ARTIST_DIRECTORY}/${artist.directory}/">${artist.name}</a>
                                (${getDateString({date})})
                            </li>
                        `).join('\n')}
                    </ul>
                </div>
                <div class="column">
                    <h2>Art${wikiInfo.features.flashesAndGames ? ` &amp; Flash` : ''} Contributors</h2>
                    <ul>
                        ${C.sortByDate(artistData
                            .filter(artist => !artist.alias)
                            .map(artist => {
                                const thing = reversedArtThings.find(({ album, coverArtists, contributors }) => (
                                    album?.directory !== C.UNRELEASED_TRACKS_DIRECTORY &&
                                    [...coverArtists || [], ...!album && contributors || []].some(({ who }) => who === artist)
                                ));
                                return thing && {
                                    artist,
                                    date: (thing.coverArtists?.some(({ who }) => who === artist)
                                        ? thing.coverArtDate
                                        : thing.date)
                                };
                            })
                            .filter(Boolean)
                            .sort((a, b) => a.name < b.name ? 1 : a.name > b.name ? -1 : 0)
                        ).reverse().map(({ artist, date }) => fixWS`
                            <li>
                                <a href="${C.ARTIST_DIRECTORY}/${artist.directory}">${artist.name}</a>
                                (${getDateString({date})})
                            </li>
                        `).join('\n')}
                    </ul>
                </div>
            </div>
        `],
        wikiInfo.features.groupUI &&
        [['groups', 'by-name'], `Groups - by Name`, groupData
            .filter(x => x.isGroup)
            .sort(sortByName)
            .map(group => fixWS`
                <li><a href="${C.GROUP_DIRECTORY}/${group.directory}/" style="${getLinkThemeString(group)}">${group.name}</a></li>
            `)],
        wikiInfo.features.groupUI &&
        [['groups', 'by-category'], `Groups - by Category`, fixWS`
            <dl>
                ${groupData.filter(x => x.isCategory).map(category => fixWS`
                    <dt><a href="${C.GROUP_DIRECTORY}/${category.groups[0].directory}/" style="${getLinkThemeString(category)}">${category.name}</a></li>
                    <dd><ul>
                        ${category.groups.map(group => fixWS`
                            <li><a href="${C.GROUP_DIRECTORY}/${group.directory}/gallery/" style="${getLinkThemeString(group)}">${group.name}</a></li>
                        `).join('\n')}
                    </ul></dd>
                `).join('\n')}
            </dl>
        `],
        wikiInfo.features.groupUI &&
        [['groups', 'by-albums'], `Groups - by Albums`, groupData
            .filter(x => x.isGroup)
            .map(group => ({group, albums: group.albums.length}))
            .sort((a, b) => b.albums - a.albums)
            .map(({ group, albums }) => fixWS`
                <li><a href="${C.GROUP_DIRECTORY}/${group.directory}/" style="${getLinkThemeString(group)}">${group.name}</a> (${s(albums, 'album')})</li>
            `)],
        wikiInfo.features.groupUI &&
        [['groups', 'by-tracks'], `Groups - by Tracks`, groupData
            .filter(x => x.isGroup)
            .map(group => ({group, tracks: group.albums.reduce((acc, album) => acc + album.tracks.length, 0)}))
            .sort((a, b) => b.tracks - a.tracks)
            .map(({ group, tracks }) => fixWS`
                <li><a href="${C.GROUP_DIRECTORY}/${group.directory}/" style="${getLinkThemeString(group)}">${group.name}</a> (${s(tracks, 'track')})</li>
            `)],
        wikiInfo.features.groupUI &&
        [['groups', 'by-duration'], `Groups - by Duration`, groupData
            .filter(x => x.isGroup)
            .map(group => ({group, duration: getTotalDuration(group.albums.flatMap(album => album.tracks))}))
            .sort((a, b) => b.duration - a.duration)
            .map(({ group, duration }) => fixWS`
                <li><a href="${C.GROUP_DIRECTORY}/${group.directory}/" style="${getLinkThemeString(group)}">${group.name}</a> (${getDurationString(duration)})</li>
            `)],
        wikiInfo.features.groupUI &&
        [['groups', 'by-latest'], `Groups - by Latest Album`, C.sortByDate(groupData
            .filter(x => x.isGroup)
            .map(group => ({group, date: group.albums[group.albums.length - 1].date}))
            // So this is kinda tough to explain, 8ut 8asically, when we reverse the list after sorting it 8y d8te
            // (so that the latest d8tes come first), it also flips the order of groups which share the same d8te.
            // This happens mostly when a single al8um is the l8test in two groups. So, say one such al8um is in
            // the groups "Fandom" and "UMSPAF". Per category order, Fandom is meant to show up 8efore UMSPAF, 8ut
            // when we do the reverse l8ter, that flips them, and UMSPAF ends up displaying 8efore Fandom. So we do
            // an extra reverse here, which will fix that and only affect groups that share the same d8te (8ecause
            // groups that don't will 8e moved 8y the sortByDate call surrounding this).
            .reverse()
        ).reverse().map(({ group, date }) => fixWS`
            <li>
                <a href="${C.GROUP_DIRECTORY}/${group.directory}/" style="${getLinkThemeString(group)}">${group.name}</a>
                (${getDateString({date})})
            </li>
        `)],
        [['tracks', 'by-name'], `Tracks - by Name`, trackData.slice()
            .sort(sortByName)
            .map(track => fixWS`
                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a></li>
            `)],
        [['tracks', 'by-album'], `Tracks - by Album`, fixWS`
                <dl>
                    ${albumData.map(album => fixWS`
                        <dt><a href="${C.ALBUM_DIRECTORY}/${album.directory}/" style="${getLinkThemeString(album)}">${album.name}</a></dt>
                        <dd><ol>
                            ${album.tracks.map(track => fixWS`
                                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a></li>
                            `).join('\n')}
                        </ol></dd>
                    `).join('\n')}
                </dl>
            `],
        [['tracks', 'by-date'], `Tracks - by Date`, albumChunkedList(
            C.sortByDate(trackData.filter(track => track.album.directory !== C.UNRELEASED_TRACKS_DIRECTORY)),
            track => fixWS`
                <li ${classes(track.aka && 'rerelease')}><a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a> ${track.aka && `<span class="rerelease-label">(re-release)</span>`}</li>
            `)],
        [['tracks', 'by-duration'], `Tracks - by Duration`, C.sortByDate(trackData.slice())
            .filter(track => track.duration > 0)
            .sort((a, b) => b.duration - a.duration)
            .map(track => fixWS`
                <li>
                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                    (${getDurationString(track.duration)})
                </li>
            `)],
        [['tracks', 'by-duration-in-album'], `Tracks - by Duration (in Album)`, albumChunkedList(albumData.flatMap(album => album.tracks)
            .filter(track => track.duration > 0)
            .sort((a, b) => (
                b.album !== a.album ? 0 :
                b.duration - a.duration
            )),
            track => fixWS`
                <li>
                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                    (${getDurationString(track.duration)})
                </li>
            `,
            false,
            null)],
        [['tracks', 'by-times-referenced'], `Tracks - by Times Referenced`, C.sortByDate(trackData.slice())
            .filter(track => track.referencedBy.length > 0)
            .sort((a, b) => b.referencedBy.length - a.referencedBy.length)
            .map(track => fixWS`
                <li>
                    <a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a>
                    (${s(track.referencedBy.length, 'time')} referenced)
                </li>
            `)],
        wikiInfo.features.flashesAndGames &&
        [['tracks', 'in-flashes', 'by-album'], `Tracks - in Flashes &amp; Games (by Album)`, albumChunkedList(
            C.sortByDate(trackData.slice()).filter(track => track.album.directory !== C.UNRELEASED_TRACKS_DIRECTORY && track.flashes.length > 0),
            track => `<li><a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a></li>`)],
        wikiInfo.features.flashesAndGames &&
        [['tracks', 'in-flashes', 'by-flash'], `Tracks - in Flashes &amp; Games (by Flash)`, fixWS`
            <dl>
                ${C.sortByDate(flashData.filter(flash => !flash.act8r8k))
                    .map(flash => fixWS`
                        <dt>
                            <a href="${C.FLASH_DIRECTORY}/${flash.directory}/" style="${getLinkThemeString(flash)}">${flash.name}</a>
                            (${getDateString(flash)})
                        </dt>
                        <dd><ul>
                            ${flash.tracks.map(track => fixWS`
                                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a></li>
                            `).join('\n')}
                        </ul></dd>
                    `)
                    .join('\n')}
            </dl>
        `],
        [['tracks', 'with-lyrics'], `Tracks - with Lyrics`, albumChunkedList(
            C.sortByDate(trackData.slice())
            .filter(track => track.lyrics),
            track => fixWS`
                <li><a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a></li>
            `)],
        wikiInfo.features.artTagUI &&
        [['tags', 'by-name'], 'Tags - by Name', tagData.slice().sort(sortByName)
            .filter(tag => !tag.isCW)
            .map(tag => `<li><a href="${C.TAG_DIRECTORY}/${tag.directory}/" style="${getLinkThemeString(tag)}">${tag.name}</a></li>`)],
        wikiInfo.features.artTagUI &&
        [['tags', 'by-uses'], 'Tags - by Uses', tagData.slice().sort(sortByName)
            .filter(tag => !tag.isCW)
            .map(tag => ({tag, timesUsed: tag.things.length}))
            .sort((a, b) => b.timesUsed - a.timesUsed)
            .map(({ tag, timesUsed }) => `<li><a href="${C.TAG_DIRECTORY}/${tag.directory}/" style="${getLinkThemeString(tag)}">${tag.name}</a> (${s(timesUsed, 'time')})</li>`)]
    ].filter(Boolean);

    const releasedTracks = trackData.filter(track => track.album.directory !== C.UNRELEASED_TRACKS_DIRECTORY);
    const releasedAlbums = albumData.filter(album => album.directory !== C.UNRELEASED_TRACKS_DIRECTORY);

    return progressPromiseAll(`Writing listing pages.`, [
        writePage([C.LISTING_DIRECTORY], {
            title: `Listings Index`,

            main: {
                content: fixWS`
                    <h1>Listings</h1>
                    <p>${wikiInfo.name}: <b>${releasedTracks.length}</b> tracks across <b>${releasedAlbums.length}</b> albums, totaling <b>~${getDurationString(getTotalDuration(releasedTracks))}</b> ${getTotalDuration(releasedTracks) > 3600 ? 'hours' : 'minutes'}.</p>
                    <hr>
                    <p>Feel free to explore any of the listings linked below and in the sidebar!</p>
                    ${generateLinkIndexForListings(listingDescriptors)}
                `
            },

            sidebarLeft: {
                content: generateSidebarForListings(listingDescriptors)
            },

            nav: {
                links: [
                    ['./', wikiInfo.shortName],
                    [`${C.LISTINGS_DIRECTORY}/`, 'Listings']
                ]
            }
        }),

        mkdirp(path.join(outputPath, C.LISTING_DIRECTORY, 'all-commentary'))
            .then(() => writeFile(path.join(outputPath, C.LISTING_DIRECTORY, 'all-commentary', 'index.html'),
                generateRedirectPage('Album Commentary', `/${C.COMMENTARY_DIRECTORY}/`))),

        writePage([C.LISTING_DIRECTORY, 'random'], {
            title: 'Random Pages',

            main: {
                content: fixWS`
                    <h1>Random Pages</h1>
                    <p>Choose a link to go to a random page in that category or album! If your browser doesn't support relatively modern JavaScript or you've disabled it, these links won't work - sorry.</p>
                    <p class="js-hide-once-data">(Data files are downloading in the background! Please wait for data to load.)</p>
                    <p class="js-show-once-data">(Data files have finished being downloaded. The links should work!)</p>
                    <dl>
                        <dt>Miscellaneous:</dt>
                        <dd><ul>
                            <li>
                                <a href="${C.JS_DISABLED_DIRECTORY}/" data-random="artist">Random Artist</a>
                                (<a href="${C.JS_DISABLED_DIRECTORY}/" data-random="artist-more-than-one-contrib">&gt;1 contribution</a>)
                            </li>
                            <li><a href="${C.JS_DISABLED_DIRECTORY}/" data-random="album">Random Album (whole site)</a></li>
                            <li><a href="${C.JS_DISABLED_DIRECTORY}/" data-random="track">Random Track (whole site)</a></li>
                        </ul></dd>
                        ${[
                            {name: 'Official', albumData: officialAlbumData, code: 'official'},
                            {name: 'Fandom', albumData: fandomAlbumData, code: 'fandom'}
                        ].map(category => fixWS`
                            <dt>${category.name}: (<a href="${C.JS_DISABLED_DIRECTORY}/" data-random="album-in-${category.code}">Random Album</a>, <a href="${C.JS_DISABLED_DIRECTORY}/" data-random="track-in-${category.code}">Random Track</a>)</dt>
                            <dd><ul>${category.albumData.map(album => fixWS`
                                <li><a style="${getLinkThemeString(album)}; --album-directory: ${album.directory}" href="${C.JS_DISABLED_DIRECTORY}/" data-random="track-in-album">${album.name}</a></li>
                            `).join('\n')}</ul></dd>
                        `).join('\n')}
                    </dl>
                `
            },

            sidebarLeft: {
                content: generateSidebarForListings(listingDescriptors, 'all-commentary')
            },

            nav: {
                links: [
                    ['./', wikiInfo.shortName],
                    [`${C.LISTING_DIRECTORY}/`, 'Listings'],
                    [`${C.LISTING_DIRECTORY}/random`, 'Random Pages']
                ]
            }
        }),

        ...listingDescriptors.map(entry => writeListingPage(...entry, listingDescriptors))
    ]);
}

function writeListingPage(directoryParts, title, items, listingDescriptors) {
    return writePage([C.LISTING_DIRECTORY, ...directoryParts], {
        title,

        main: {
            content: fixWS`
                <h1>${title}</h1>
                ${typeof items === 'string' ? items : fixWS`
                    <ul>
                        ${items.join('\n')}
                    </ul>
                `}
            `
        },

        sidebarLeft: {
            content: generateSidebarForListings(listingDescriptors, directoryParts)
        },

        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.LISTING_DIRECTORY}/`, 'Listings'],
                [`${C.LISTING_DIRECTORY}/${directoryParts.join('/')}/`, title]
            ]
        }
    });
}

function generateSidebarForListings(listingDescriptors, currentDirectoryParts) {
    return fixWS`
        <h1><a href="${C.LISTING_DIRECTORY}/">Listings</a></h1>
        ${generateLinkIndexForListings(listingDescriptors, currentDirectoryParts)}
    `;
}

function generateLinkIndexForListings(listingDescriptors, currentDirectoryParts) {
    return fixWS`
        <ul>
            ${listingDescriptors.map(([ ldDirectoryParts, ldTitle ]) => fixWS`
                <li ${classes(currentDirectoryParts === ldDirectoryParts && 'current')}>
                    <a href="${C.LISTING_DIRECTORY}/${ldDirectoryParts.join('/')}/">${ldTitle}</a>
                </li>
            `).join('\n')}
            <li ${classes(currentDirectoryParts === 'all-commentary' && 'current')}>
                <a href="${C.LISTING_DIRECTORY}/all-commentary/">All Commentary</a>
            </li>
            <li ${classes(currentDirectoryParts === 'random' && 'current')}>
                <a href="${C.LISTING_DIRECTORY}/random/">Random Pages</a>
            </li>
        </ul>
    `;
}

function filterAlbumsByCommentary() {
    return albumData.filter(album => [album, ...album.tracks].some(x => x.commentary));
}

function getWordCount(str) {
    const wordCount = str.split(' ').length;
    return `${Math.floor(wordCount / 100) / 10}k`;
}

function writeCommentaryPages() {
    return progressPromiseAll('Writing commentary pages.', queue([
        writeCommentaryIndex,
        ...filterAlbumsByCommentary().map(curry(writeAlbumCommentaryPage))
    ], queueSize));
}

async function writeCommentaryIndex() {
    await writePage([C.COMMENTARY_DIRECTORY], {
        title: 'Commentary',

        main: {
            content: fixWS`
                <div class="long-content">
                    <h1>Commentary</h1>
                    <p><strong>${getWordCount(albumData.reduce((acc, a) => acc + [a, ...a.tracks].filter(x => x.commentary).map(x => x.commentary).join(' ')))}</strong> words across <strong>${albumData.reduce((acc, a) => acc + [a, ...a.tracks].filter(x => x.commentary).length, 0)}</strong> entries, in all.</p>
                    <p>Choose an album:</p>
                    <ul>
                        ${filterAlbumsByCommentary()
                            .map(album => fixWS`
                                <li>
                                    <a href="${C.COMMENTARY_DIRECTORY}/${C.ALBUM_DIRECTORY}/${album.directory}" style="${getLinkThemeString(album)}">${album.name}</a>
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
                </div>
            `
        },

        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.COMMENTARY_DIRECTORY}/`, 'Commentary']
            ]
        }
    });
}

async function writeAlbumCommentaryPage(album) {
    await writePage([C.COMMENTARY_DIRECTORY, C.ALBUM_DIRECTORY, album.directory], {
        title: `${album.name} - Commentary`,
        stylesheet: getAlbumStylesheet(album),
        theme: getThemeString(album),

        main: {
            content: fixWS`
                <div class="long-content">
                    <h1><a href="${C.ALBUM_DIRECTORY}/${album.directory}/">${album.name}</a> - Commentary</h2>
                    <p><strong>${getWordCount([album, ...album.tracks].filter(x => x.commentary).map(x => x.commentary).join(' '))}</strong> words across <strong>${[album, ...album.tracks].filter(x => x.commentary).length}</strong> entries.</p>
                    ${album.commentary && fixWS`
                        <h3>Album commentary</h3>
                        <blockquote>
                            ${transformMultiline(album.commentary)}
                        </blockquote>
                    `}
                    ${album.tracks.filter(t => t.commentary).map(track => fixWS`
                        <h3 id="${track.directory}"><a href="${C.TRACK_DIRECTORY}/${track.directory}/" style="${getLinkThemeString(track)}">${track.name}</a></h3>
                        <blockquote style="${getLinkThemeString(track)}">
                            ${transformMultiline(track.commentary)}
                        </blockquote>
                    `).join('\n')}
                </div>
            `
        },

        nav: {
            links: [
                ['./', wikiInfo.shortName],
                [`${C.COMMENTARY_DIRECTORY}/`, 'Commentary'],
                [null, 'Album:'],
                [`${C.COMMENTARY_DIRECTORY}/${C.ALBUM_DIRECTORY}/${album.directory}/`, album.name]
            ]
        }
    });
}

function writeTagPages() {
    if (!wikiInfo.features.artTagUI) {
        return;
    }

    return progressPromiseAll(`Writing tag pages.`, queue(tagData
        .filter(tag => !tag.isCW)
        .map(curry(writeTagPage)), queueSize));
}

function writeTagPage(tag) {
    const { things } = tag;

    return writePage([C.TAG_DIRECTORY, tag.directory], {
        title: tag.name,
        theme: getThemeString(tag),

        main: {
            classes: ['top-index'],
            content: fixWS`
                <h1>${tag.name}</h1>
                <p class="quick-info">(Appears in ${s(things.length, 'cover art')})</p>
                <div class="grid-listing">
                    ${getGridHTML({
                        entries: things.map(item => ({item})),
                        srcFn: thing => (thing.album
                            ? getTrackCover(thing)
                            : getAlbumCover(thing)),
                        hrefFn: thing => (thing.album
                            ? `${C.TRACK_DIRECTORY}/${thing.directory}/`
                            : `${C.ALBUM_DIRECTORY}/${thing.directory}`)
                    })}
                </div>
            `
        },

        nav: {
            links: [
                ['./', wikiInfo.shortName],
                wikiInfo.features.listings && [`${C.LISTING_DIRECTORY}/`, 'Listings'],
                [null, 'Tag:'],
                [`${C.TAG_DIRECTORY}/${tag.directory}/`, tag.name]
            ]
        }
    });
}

// This function is terri8le. Sorry!
function getContributionString({ what }) {
    return what
        ? what.replace(/\[(.*?)\]/g, (match, name) =>
            trackData.some(track => track.name === name)
                ? `<i><a href="${C.TRACK_DIRECTORY}/${trackData.find(track => track.name === name).directory}/">${name}</a></i>`
                : `<i>${name}</i>`)
        : '';
}

function getLinkedTrack(ref) {
    if (!ref) return null;

    if (ref.includes('track:')) {
        ref = ref.replace('track:', '');
        return trackData.find(track => track.directory === ref);
    }

    const match = ref.match(/\S:(.*)/);
    if (match) {
        const dir = match[1];
        return trackData.find(track => track.directory === dir);
    }

    let track;

    track = trackData.find(track => track.directory === ref);
    if (track) {
        return track;
    }

    track = trackData.find(track => track.name === ref);
    if (track) {
        return track;
    }

    track = trackData.find(track => track.name.toLowerCase() === ref.toLowerCase());
    if (track) {
        console.warn(`\x1b[33mBad capitalization:\x1b[0m`);
        console.warn(`\x1b[31m- ${ref}\x1b[0m`);
        console.warn(`\x1b[32m+ ${track.name}\x1b[0m`);
        return track;
    }

    return null;
}

function getLinkedAlbum(ref) {
    if (!ref) return null;
    ref = ref.replace('album:', '');
    let album;
    album = albumData.find(album => album.directory === ref);
    if (!album) album = albumData.find(album => album.name === ref);
    if (!album) {
        album = albumData.find(album => album.name.toLowerCase() === ref.toLowerCase());
        if (album) {
            console.warn(`\x1b[33mBad capitalization:\x1b[0m`);
            console.warn(`\x1b[31m- ${ref}\x1b[0m`);
            console.warn(`\x1b[32m+ ${album.name}\x1b[0m`);
            return album;
        }
    }
    return album;
}

function getLinkedGroup(ref) {
    if (!ref) return null;
    ref = ref.replace('group:', '');
    let group;
    group = groupData.find(group => group.directory === ref);
    if (!group) group = groupData.find(group => group.name === ref);
    if (!group) {
        group = groupData.find(group => group.name.toLowerCase() === ref.toLowerCase());
        if (group) {
            console.warn(`\x1b[33mBad capitalization:\x1b[0m`);
            console.warn(`\x1b[31m- ${ref}\x1b[0m`);
            console.warn(`\x1b[32m+ ${group.name}\x1b[0m`);
            return group;
        }
    }
    return group;
}

function getLinkedArtist(ref) {
    if (!ref) return null;
    ref = ref.replace('artist:', '');

    let artist = artistData.find(artist => C.getArtistDirectory(artist.name) === ref);
    if (artist) {
        return artist;
    }

    artist = artistData.find(artist => artist.name === ref);
    if (artist) {
        return artist;
    }

    return null;
}

function getLinkedFlash(ref) {
    if (!ref) return null;
    ref = ref.replace('flash:', '');
    return flashData?.find(flash => flash.directory === ref);
}

function getLinkedTag(ref) {
    if (!ref) return null;

    ref = ref.replace('tag:', '');

    let tag = tagData.find(tag => tag.directory === ref);
    if (tag) {
        return tag;
    }

    if (ref.startsWith('cw: ')) {
        ref = ref.slice(4);
    }

    tag = tagData.find(tag => tag.name === ref);
    if (tag) {
        return tag;
    }

    return null;
}

function getArtistString(artists, showIcons = false) {
    return joinNoOxford(artists.map(({ who, what }) => {
        if (!who) console.log(artists);
        const { urls, directory, name } = who;
        return (
            `<a href="${C.ARTIST_DIRECTORY}/${directory}/">${name}</a>` +
            (what ? ` (${getContributionString({what})})` : '') +
            (showIcons && urls.length ? ` <span class="icons">(${urls.map(iconifyURL).join(', ')})</span>` : '')
        );
    }));
}

// Graciously stolen from https://stackoverflow.com/a/54071699! ::::)
// in: r,g,b in [0,1], out: h in [0,360) and s,l in [0,1]
function rgb2hsl(r,g,b) {
    let a=Math.max(r,g,b), n=a-Math.min(r,g,b), f=(1-Math.abs(a+a-n-1));
    let h= n && ((a==r) ? (g-b)/n : ((a==g) ? 2+(b-r)/n : 4+(r-g)/n));
    return [60*(h<0?h+6:h), f ? n/f : 0, (a+a-n)/2];
}

function getColorVariables(color) {
    if (!color) {
        color = wikiInfo.color;
    }

    const [ r, g, b ] = color.slice(1)
        .match(/[0-9a-fA-F]{2,2}/g)
        .slice(0, 3)
        .map(val => parseInt(val, 16) / 255);
    const [ h, s, l ] = rgb2hsl(r, g, b);
    const dim = `hsl(${Math.round(h)}deg, ${Math.round(s * 50)}%, ${Math.round(l * 80)}%)`;

    return [
        `--primary-color: ${color}`,
        `--dim-color: ${dim}`
    ];
}

function getLinkThemeString(thing) {
    return getColorVariables(thing.color).join('; ');
}

function getThemeString(thing, additionalVariables = []) {
    const variables = [
        ...getColorVariables(thing.color),
        ...additionalVariables
    ].filter(Boolean);

    return fixWS`
        ${variables.length && fixWS`
            :root {
                ${variables.map(line => line + ';').join('\n')}
            }
        `}
    `;
}

function getFlashDirectory(flash) {
    // const kebab = getKebabCase(flash.name.replace('[S] ', ''));
    // return flash.page + (kebab ? '-' + kebab : '');
    // return '' + flash.page;
    return '' + flash.directory;
}

function getTagDirectory({name}) {
    return C.getKebabCase(name);
}

function getAlbumListTag(album) {
    if (album.directory === C.UNRELEASED_TRACKS_DIRECTORY) {
        return 'ul';
    } else {
        return 'ol';
    }
}

function fancifyURL(url, {album = false} = {}) {
    return fixWS`<a href="${url}" class="nowrap">${
        url.includes('bandcamp.com') ? 'Bandcamp' :
        (
            url.includes('music.solatrus.com')
        ) ? `Bandcamp (${new URL(url).hostname})` :
        (
            url.includes('types.pl')
        ) ? `Mastodon (${new URL(url).hostname})` :
        url.includes('youtu') ? (album ? (
            url.includes('list=') ? 'YouTube (Playlist)' : 'YouTube (Full Album)'
        ) : 'YouTube') :
        url.includes('soundcloud') ? 'SoundCloud' :
        url.includes('tumblr.com') ? 'Tumblr' :
        url.includes('twitter.com') ? 'Twitter' :
        url.includes('deviantart.com') ? 'DeviantArt' :
        url.includes('wikipedia.org') ? 'Wikipedia' :
        url.includes('poetryfoundation.org') ? 'Poetry Foundation' :
        url.includes('instagram.com') ? 'Instagram' :
        url.includes('patreon.com') ? 'Patreon' :
        new URL(url).hostname
    }</a>`;
}

function fancifyFlashURL(url, flash) {
    return `<span class="nowrap">${fancifyURL(url)}` + (
        url.includes('homestuck.com') ? ` (${isNaN(Number(flash.page)) ? 'secret page' : `page ${flash.page}`})` :
        url.includes('bgreco.net') ? ` (HQ audio)` :
        url.includes('youtu') ? ` (on any device)` :
        ''
    ) + `</span>`;
}

function iconifyURL(url) {
    const [ id, msg ] = (
        url.includes('bandcamp.com') ? ['bandcamp', 'Bandcamp'] :
        (
            url.includes('music.solatrus.com')
        ) ? ['bandcamp', `Bandcamp (${new URL(url).hostname})`] :
        (
            url.includes('types.pl')
        ) ? ['mastodon', `Mastodon (${new URL(url).hostname})`] :
        url.includes('youtu') ? ['youtube', 'YouTube'] :
        url.includes('soundcloud') ? ['soundcloud', 'SoundCloud'] :
        url.includes('tumblr.com') ? ['tumblr', 'Tumblr'] :
        url.includes('twitter.com') ? ['twitter', 'Twitter'] :
        url.includes('deviantart.com') ? ['deviantart', 'DeviantArt'] :
        url.includes('instagram.com') ? ['instagram', 'Instagram'] :
        ['globe', `External (${new URL(url).hostname})`]
    );
    return fixWS`<a href="${url}" class="icon"><svg><title>${msg}</title><use href="${C.STATIC_DIRECTORY}/icons.svg#icon-${id}"></use></svg></a>`;
}

function chronologyLinks(currentTrack, {
    mapProperty,
    toArtist,
    filters, // {property, toArtist}
    headingWord,
    sourceData = justEverythingMan
}) {
    const artists = Array.from(new Set(filters.flatMap(({ mapProperty, toArtist }) => currentTrack[mapProperty] && currentTrack[mapProperty].map(toArtist))));
    if (artists.length > 8) {
        return `<div class="chronology">(See artist pages for chronology info!)</div>`;
    }
    return artists.map(artist => {
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

        const heading = `${th(index + 1)} ${headingWord} by <a href="${C.ARTIST_DIRECTORY}/${artist.directory}/">${artist.name}</a>`;

        return fixWS`
            <div class="chronology">
                <span class="heading">${heading}</span>
                ${parts.length && `<span class="buttons">(${parts.join(', ')})</span>`}
            </div>
        `;
    }).filter(Boolean).join('\n');
}

function generateAlbumNavLinks(album, currentTrack = null) {
    if (album.tracks.length <= 1) {
        return '';
    }

    const index = currentTrack && album.tracks.indexOf(currentTrack)
    const previous = currentTrack && album.tracks[index - 1]
    const next = currentTrack && album.tracks[index + 1]

    const [ previousLine, nextLine, randomLine ] = [
        previous && `<a href="${C.TRACK_DIRECTORY}/${previous.directory}/" id="previous-button" title="${previous.name}">Previous</a>`,
        next && `<a href="${C.TRACK_DIRECTORY}/${next.directory}/" id="next-button" title="${next.name}">Next</a>`,
        `<a href="${C.JS_DISABLED_DIRECTORY}/" data-random="track-in-album" id="random-button">${currentTrack ? 'Random' : 'Random Track'}</a>`
    ];

    if (previousLine || nextLine) {
        return `(${[previousLine, nextLine].filter(Boolean).join(', ')}<span class="js-hide-until-data">, ${randomLine}</span>)`;
    } else {
        return `<span class="js-hide-until-data">(${randomLine})</span>`;
    }
}

function generateAlbumChronologyLinks(album, currentTrack = null) {
    return [
        currentTrack && chronologyLinks(currentTrack, {
            headingWord: 'track',
            sourceData: trackData,
            filters: [
                {
                    mapProperty: 'artists',
                    toArtist: ({ who }) => who
                },
                {
                    mapProperty: 'contributors',
                    toArtist: ({ who }) => who
                }
            ]
        }),
        chronologyLinks(currentTrack || album, {
            headingWord: 'cover art',
            sourceData: justEverythingSortedByArtDateMan,
            filters: [
                {
                    mapProperty: 'coverArtists',
                    toArtist: ({ who }) => who
                }
            ]
        })
    ].filter(Boolean).join('\n');
}

function generateSidebarForAlbum(album, currentTrack = null) {
    const trackToListItem = track => `<li ${classes(track === currentTrack && 'current')}><a href="${C.TRACK_DIRECTORY}/${track.directory}/">${track.name}</a></li>`;
    const listTag = getAlbumListTag(album);
    return {content: fixWS`
        <h1><a href="${C.ALBUM_DIRECTORY}/${album.directory}/">${album.name}</a></h1>
        ${album.usesGroups ? fixWS`
            <dl>
                ${album.tracks.flatMap((track, i, arr) => [
                    (i > 0 && track.group !== arr[i - 1].group) && `</${listTag}></dd>`,
                    (i === 0 || track.group !== arr[i - 1].group) && fixWS`
                        ${track.group && fixWS`
                            <dt style="${getLinkThemeString(track)}" ${classes(currentTrack && track.group === currentTrack.group && 'current')}>
                                <a href="${C.TRACK_DIRECTORY}/${track.directory}/">${track.group}</a>
                                ${listTag === 'ol' ? `(${i + 1}&ndash;${arr.length - arr.slice().reverse().findIndex(t => t.group === track.group)})` : `<!-- (here: track number range) -->`}
                            </dt>
                        `}
                        <dd style="${getLinkThemeString(track)}"><${listTag === 'ol' ? `ol start="${i + 1}"` : listTag}>
                    `,
                    (!currentTrack || track.group === currentTrack.group) && trackToListItem(track),
                    i === arr.length && `</${listTag}></dd>`
                ].filter(Boolean)).join('\n')}
            </dl>
        ` : fixWS`
            <${listTag}>
                ${album.tracks.map(trackToListItem).join('\n')}
            </${listTag}>
        `}
    `};
}

function generateSidebarRightForAlbum(album, currentTrack = null) {
    if (!wikiInfo.features.groupUI) {
        return null;
    }

    const { groups } = album;
    if (groups.length) {
        return {
            collapse: false,
            multiple: groups.map(group => {
                const index = group.albums.indexOf(album);
                const next = group.albums[index + 1];
                const previous = group.albums[index - 1];
                return {group, next, previous};
            }).map(({group, next, previous}) => fixWS`
                <h1><a href="${C.GROUP_DIRECTORY}/${group.directory}/">${group.name}</a></h1>
                ${!currentTrack && transformMultiline(group.descriptionShort)}
                ${group.urls.length && `<p>Visit on ${joinNoOxford(group.urls.map(fancifyURL), 'or')}.</p>`}
                ${!currentTrack && fixWS`
                    ${next && `<p class="group-chronology-link">Next: <a href="${C.ALBUM_DIRECTORY}/${next.directory}/" style="${getLinkThemeString(next)}">${next.name}</a></p>`}
                    ${previous && `<p class="group-chronology-link">Previous: <a href="${C.ALBUM_DIRECTORY}/${previous.directory}/" style="${getLinkThemeString(previous)}">${previous.name}</a></p>`}
                `}
            `)
        };
    };
}

function generateSidebarForGroup(isGallery = false, currentGroup = null) {
    if (!wikiInfo.features.groupUI) {
        return null;
    }

    return {
        content: fixWS`
            <h1>Groups</h1>
            <dl>
                ${groupData.filter(x => x.isCategory).map(category => [
                    fixWS`
                        <dt ${classes(currentGroup && category === currentGroup.category && 'current')}>
                            <a href="${C.GROUP_DIRECTORY}/${groupData.find(x => x.isGroup && x.category === category).directory}/${isGallery ? 'gallery/' : ''}" style="${getLinkThemeString(category)}">${category.name}</a>
                        </dt>
                        <dd><ul>
                            ${category.groups.map(group => fixWS`
                                <li ${classes(group === currentGroup && 'current')} style="${getLinkThemeString(group)}">
                                    <a href="${C.GROUP_DIRECTORY}/${group.directory}/${isGallery && 'gallery/'}">${group.name}</a>
                                </li>
                            `).join('\n')}
                        </ul></dd>
                    `
                ]).join('\n')}
            </dl>
        `
    };
}

function writeGroupPages() {
    return progressPromiseAll(`Writing group pages.`, queue(groupData.filter(x => x.isGroup).map(curry(writeGroupPage)), queueSize));
}

async function writeGroupPage(group) {
    const releasedAlbums = group.albums.filter(album => album.directory !== C.UNRELEASED_TRACKS_DIRECTORY);
    const releasedTracks = releasedAlbums.flatMap(album => album.tracks);
    const totalDuration = getTotalDuration(releasedTracks);

    const groups = groupData.filter(x => x.isGroup);
    const index = groups.indexOf(group);
    const previous = groups[index - 1];
    const next = groups[index + 1];

    const generateNextPrevious = isGallery => [
        previous && `<a href="${C.GROUP_DIRECTORY}/${previous.directory}/${isGallery ? 'gallery/' : ''}" id="previous-button" title="${previous.name}">Previous</a>`,
        next && `<a href="${C.GROUP_DIRECTORY}/${next.directory}/${isGallery ? 'gallery/' : ''}" id="next-button" title="${next.name}">Next</a>`
    ].filter(Boolean).join(', ');

    const npInfo = generateNextPrevious(false);
    const npGallery = generateNextPrevious(true);

    await writePage([C.GROUP_DIRECTORY, group.directory], {
        title: group.name,
        theme: getThemeString(group),
        main: {
            content: fixWS`
                <h1>${group.name}</h1>
                ${group.urls.length && `<p>Visit on ${joinNoOxford(group.urls.map(fancifyURL), 'or')}.</p>`}
                <blockquote>
                    ${transformMultiline(group.description)}
                </blockquote>
                <h2>Albums</h2>
                <p>View <a href="${C.GROUP_DIRECTORY}/${group.directory}/gallery/">album gallery</a>! Or browse the list:</p>
                <ul>
                    ${group.albums.map(album => fixWS`
                        <li>
                            (${album.date.getFullYear()})
                            <a href="${C.ALBUM_DIRECTORY}/${album.directory}/" style="${getLinkThemeString(album)}">${album.name}</a>
                        </li>
                    `).join('\n')}
                </ul>
            `
        },
        sidebarLeft: generateSidebarForGroup(false, group),
        nav: (wikiInfo.features.groupUI ? {
            links: [
                ['./', wikiInfo.shortName],
                wikiInfo.features.listings && [`${C.LISTING_DIRECTORY}/`, 'Listings'],
                [null, 'Group:'],
                [`${C.GROUP_DIRECTORY}/${group.directory}/`, group.name],
                [null, `(${[
                    `<a href="${C.GROUP_DIRECTORY}/${group.directory}/" class="current">Info</a>`,
                    `<a href="${C.GROUP_DIRECTORY}/${group.directory}/gallery/">Gallery</a>`
                ].join(', ') + (npInfo.length ? '; ' + npInfo : '')})`]
            ]
        } : {simple: true})
    });

    await writePage([C.GROUP_DIRECTORY, group.directory, 'gallery'], {
        title: `${group.name} - Gallery`,
        theme: getThemeString(group),
        main: {
            classes: ['top-index'],
            content: fixWS`
                <h1>${group.name} - Gallery</h1>
                <p class="quick-info"><b>${releasedTracks.length}</b> track${releasedTracks.length === 1 ? '' : 's'} across <b>${releasedAlbums.length}</b> album${releasedAlbums.length === 1 ? '' : 's'}, totaling <b>~${getDurationString(totalDuration)}</b> ${totalDuration > 3600 ? 'hours' : 'minutes'}.</p>
                ${wikiInfo.features.groupUI && wikiInfo.features.listings && `<p class="quick-info">(<a href="${C.LISTING_DIRECTORY}/groups/by-category/">Choose another group to filter by!</a>)</p>`}
                <div class="grid-listing">
                    ${getGridHTML({
                        entries: C.sortByDate(group.albums.map(item => ({item}))).reverse(),
                        srcFn: getAlbumCover,
                        hrefFn: album => `${C.ALBUM_DIRECTORY}/${album.directory}/`,
                        details: true
                    })}
                </div>
            `
        },
        sidebarLeft: generateSidebarForGroup(true, group),
        nav: (wikiInfo.features.groupUI ? {
            links: [
                ['./', wikiInfo.shortName],
                wikiInfo.features.listings && [`${C.LISTING_DIRECTORY}/`, 'Listings'],
                [null, 'Group:'],
                [`${C.GROUP_DIRECTORY}/${group.directory}/`, group.name],
                [null, `(${[
                    `<a href="${C.GROUP_DIRECTORY}/${group.directory}/">Info</a>`,
                    `<a href="${C.GROUP_DIRECTORY}/${group.directory}/gallery/" class="current">Gallery</a>`
                ].join(', ') + (npGallery.length ? '; ' + npGallery : '')})`]
            ]
        } : {simple: true})
    });
}

function getHrefOfAnythingMan(anythingMan) {
    return (
        albumData.includes(anythingMan) ? C.ALBUM_DIRECTORY :
        trackData.includes(anythingMan) ? C.TRACK_DIRECTORY :
        flashData?.includes(anythingMan) ? C.FLASH_DIRECTORY :
        'idk-bud'
    ) + '/' + (
        anythingMan.directory
    ) + '/';
}

function getAlbumCover(album) {
    const file = 'cover.jpg';
    return `${C.MEDIA_DIRECTORY}/${C.MEDIA_ALBUM_ART_DIRECTORY}/${album.directory}/${file}`;
}
function getTrackCover(track) {
    // Some al8ums don't have any track art at all, and in those, every track
    // just inherits the al8um's own cover art.
    if (track.coverArtists === null) {
        return getAlbumCover(track.album);
    } else {
        const file = `${track.directory}.jpg`;
        return `${C.MEDIA_DIRECTORY}/${C.MEDIA_ALBUM_ART_DIRECTORY}/${track.album.directory}/${file}`;
    }
}
function getFlashCover(flash) {
    const file = `${getFlashDirectory(flash)}.${flash.jiff === 'Yeah' ? 'gif' : 'jpg'}`;
    return `${C.MEDIA_DIRECTORY}/${C.MEDIA_FLASH_ART_DIRECTORY}/${file}`;
}

function getFlashLink(flash) {
    return `https://homestuck.com/story/${flash.page}`;
}

function getFlashLinkHTML(flash, name = null) {
    if (!name) {
        name = flash.name;
    }
    return `<a href="${C.FLASH_DIRECTORY}/${getFlashDirectory(flash)}/" title="Page ${flash.page}" style="${getLinkThemeString(flash)}">${name}</a>`;
}

function rebaseURLs(directory, html) {
    if (directory === '') {
        return html;
    }
    return html.replace(/(href|src|data-original)="(.*?)"/g, (match, attr, url) => {
        if (url.startsWith('#')) {
            return `${attr}="${url}"`;
        }

        try {
            new URL(url);
            // no error: it's a full url
        } catch (error) {
            // caught an error: it's a component!
            url = path.relative(directory, path.join(outputPath, url));
        }
        return `${attr}="${url}"`;
    }).replace(/url\("(.*?)"\)/g, (match, url) => {
        // same as above but for CSS url("...")-style values!
        try {
            new URL(url);
        } catch (error) {
            url = path.relative(directory, path.join(outputPath, url));
        }
        return `url("${url}")`;
    });
}

function classes(...args) {
    const values = args.filter(Boolean);
    // return values.length ? ` class="${values.join(' ')}"` : '';
    return `class="${values.join(' ')}"`;
}

async function main() {
    const miscOptions = await parseOptions(process.argv.slice(2), {
        // Data files for the site, including flash, artist, and al8um data,
        // and like a jillion other things too. Pretty much everything which
        // makes an individual wiki what it is goes here!
        'data': {
            type: 'value'
        },

        // Static media will 8e referenced in the site here! The contents are
        // categorized; check out MEDIA_DIRECTORY and rel8ted constants in
        // common/common.js. (This gets symlinked into the --data directory.)
        'media': {
            type: 'value'
        },

        // This is the output directory. It's the one you'll upload online with
        // rsync or whatever when you're pushing an upd8, and also the one
        // you'd archive if you wanted to make a 8ackup of the whole dang
        // site. Just keep in mind that the gener8ted result will contain a
        // couple symlinked directories, so if you're uploading, you're pro8a8ly
        // gonna want to resolve those yourself.
        'out': {
            type: 'value'
        },

        'queue-size': {
            type: 'value',
            validate(size) {
                if (parseInt(size) !== parseFloat(size)) return 'an integer';
                if (parseInt(size) < 0) return 'a counting number or zero';
                return true;
            }
        },
        queue: {alias: 'queue-size'},

        [parseOptions.handleUnknown]: () => {}
    });

    dataPath = miscOptions.data || process.env.HSMUSIC_DATA;
    mediaPath = miscOptions.media || process.env.HSMUSIC_MEDIA;
    outputPath = miscOptions.out || process.env.HSMUSIC_OUT;

    {
        let errored = false;
        const error = (cond, msg) => {
            if (cond) {
                console.error(`\x1b[31;1m${msg}\x1b[0m`);
                errored = true;
            }
        };
        error(!dataPath,   `Expected --data option or HSMUSIC_DATA to be set`);
        error(!mediaPath,  `Expected --media option or HSMUSIC_MEDIA to be set`);
        error(!outputPath, `Expected --out option or HSMUSIC_OUT to be set`);
        if (errored) {
            return;
        }
    }

    wikiInfo = await processWikiInfoFile(path.join(dataPath, WIKI_INFO_FILE));
    if (wikiInfo.error) {
        console.log(`\x1b[31;1m${wikiInfo.error}\x1b[0m`);
        return;
    }

    homepageInfo = await processHomepageInfoFile(path.join(dataPath, HOMEPAGE_INFO_FILE));

    if (homepageInfo.error) {
        console.log(`\x1b[31;1m${homepageInfo.error}\x1b[0m`);
        return;
    }

    {
        const errors = homepageInfo.rows.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

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
    const albumDataFiles = await findAlbumDataFiles(path.join(dataPath, C.DATA_ALBUM_DIRECTORY));

    // Technically, we could do the data file reading and output writing at the
    // same time, 8ut that kinda makes the code messy, so I'm not 8othering
    // with it.
    albumData = await progressPromiseAll(`Reading & processing album files.`, albumDataFiles.map(processAlbumDataFile));

    {
        const errors = albumData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    C.sortByDate(albumData);

    artistData = await processArtistDataFile(path.join(dataPath, ARTIST_DATA_FILE));
    if (artistData.error) {
        console.log(`\x1b[31;1m${artistData.error}\x1b[0m`);
        return;
    }

    {
        const errors = artistData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    trackData = C.getAllTracks(albumData);

    if (wikiInfo.features.flashesAndGames) {
        flashData = await processFlashDataFile(path.join(dataPath, FLASH_DATA_FILE));
        if (flashData.error) {
            console.log(`\x1b[31;1m${flashData.error}\x1b[0m`);
            return;
        }

        const errors = artistData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    artistNames = Array.from(new Set([
        ...artistData.filter(artist => !artist.alias).map(artist => artist.name),
        ...[
            ...albumData.flatMap(album => [
                ...album.artists || [],
                ...album.coverArtists || [],
                ...album.wallpaperArtists || [],
                ...album.tracks.flatMap(track => [
                    ...track.artists,
                    ...track.coverArtists || [],
                    ...track.contributors || []
                ])
            ]),
            ...(flashData?.flatMap(flash => [
                ...flash.contributors || []
            ]) || [])
        ].map(contribution => contribution.who)
    ]));

    tagData = await processTagDataFile(path.join(dataPath, TAG_DATA_FILE));
    if (tagData.error) {
        console.log(`\x1b[31;1m${tagData.error}\x1b[0m`);
        return;
    }

    {
        const errors = tagData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    groupData = await processGroupDataFile(path.join(dataPath, GROUP_DATA_FILE));
    if (groupData.error) {
        console.log(`\x1b[31;1m${groupData.error}\x1b[0m`);
        return;
    }

    {
        const errors = groupData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    staticPageData = await processStaticPageDataFile(path.join(dataPath, STATIC_PAGE_DATA_FILE));
    if (staticPageData.error) {
        console.log(`\x1b[31;1m${staticPageData.error}\x1b[0m`);
        return;
    }

    {
        const errors = staticPageData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    if (wikiInfo.features.news) {
        newsData = await processNewsDataFile(path.join(dataPath, NEWS_DATA_FILE));
        if (newsData.error) {
            console.log(`\x1b[31;1m${newsData.error}\x1b[0m`);
            return;
        }

        const errors = newsData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }

        C.sortByDate(newsData);
        newsData.reverse();
    }

    {
        const tagNames = new Set([...trackData, ...albumData].flatMap(thing => thing.artTags));

        for (let { name, isCW } of tagData) {
            if (isCW) {
                name = 'cw: ' + name;
            }
            tagNames.delete(name);
        }

        if (tagNames.size) {
            for (const name of Array.from(tagNames).sort()) {
                console.log(`\x1b[33;1m- Missing tag: "${name}"\x1b[0m`);
            }
            return;
        }
    }

    artistNames.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);

    justEverythingMan = C.sortByDate(albumData.concat(trackData, flashData?.filter(flash => !flash.act8r8k) || []));
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
        const showWhere = (name, color) => {
            const where = justEverythingMan.filter(thing => [
                ...thing.coverArtists || [],
                ...thing.contributors || [],
                ...thing.artists || []
            ].some(({ who }) => who === name));
            for (const thing of where) {
                console.log(`\x1b[${color}m- ` + (thing.album ? `(\x1b[1m${thing.album.name}\x1b[0;${color}m)` : '') + ` \x1b[1m${thing.name}\x1b[0m`);
            }
        };
        let CR4SH = false;
        for (let name of artistNames) {
            const entry = artistData.find(entry => entry.name === name || entry.name.toLowerCase() === name.toLowerCase());
            if (!entry) {
                clearBuffer();
                console.log(`\x1b[31mMissing entry for artist "\x1b[1m${name}\x1b[0;31m"\x1b[0m`);
                showWhere(name, 31);
                CR4SH = true;
            } else if (entry.alias) {
                console.log(`\x1b[33mArtist "\x1b[1m${name}\x1b[0;33m" should be named "\x1b[1m${entry.alias}\x1b[0;33m"\x1b[0m`);
                showWhere(name, 33);
                CR4SH = true;
            } else if (entry.name !== name) {
                console.log(`\x1b[33mArtist "\x1b[1m${name}\x1b[0;33m" should be named "\x1b[1m${entry.name}\x1b[0;33m"\x1b[0m`);
                showWhere(name, 33);
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
        for (const { directory, album } of trackData) {
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
        for (const { references, name, album } of trackData) {
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

    contributionData = Array.from(new Set([
        ...trackData.flatMap(track => [...track.artists || [], ...track.contributors || [], ...track.coverArtists || []]),
        ...albumData.flatMap(album => [...album.artists || [], ...album.coverArtists || [], ...album.wallpaperArtists || []]),
        ...(flashData?.flatMap(flash => [...flash.contributors || []]) || [])
    ]));

    // Now that we have all the data, resolve references all 8efore actually
    // gener8ting any of the pages, 8ecause page gener8tion is going to involve
    // accessing these references a lot, and there's no reason to resolve them
    // more than once. (We 8uild a few additional links that can't 8e cre8ted
    // at initial data processing time here too.)

    const filterNull = (parent, key) => {
        for (const obj of parent) {
            const array = obj[key];
            for (let i = 0; i < array.length; i++) {
                if (!Boolean(array[i])) {
                    const prev = array[i - 1] && array[i - 1].name;
                    const next = array[i + 1] && array[i + 1].name;
                    console.log(`\x1b[33mUnexpected null in ${obj.name} (${key}) - prev: ${prev}, next: ${next}\x1b[0m`);
                }
            }
            array.splice(0, array.length, ...array.filter(Boolean));
        }
    };

    trackData.forEach(track => mapInPlace(track.references, getLinkedTrack));
    trackData.forEach(track => track.aka = getLinkedTrack(track.aka));
    trackData.forEach(track => mapInPlace(track.artTags, getLinkedTag));
    albumData.forEach(album => mapInPlace(album.groups, getLinkedGroup));
    albumData.forEach(album => mapInPlace(album.artTags, getLinkedTag));
    artistData.forEach(artist => artist.alias = getLinkedArtist(artist.alias));
    contributionData.forEach(contrib => contrib.who = getLinkedArtist(contrib.who));

    filterNull(trackData, 'references');
    filterNull(albumData, 'groups');

    trackData.forEach(track1 => track1.referencedBy = trackData.filter(track2 => track2.references.includes(track1)));
    groupData.forEach(group => group.albums = albumData.filter(album => album.groups.includes(group)));
    tagData.forEach(tag => tag.things = C.sortByArtDate([...albumData, ...trackData]).filter(thing => thing.artTags.includes(tag)));

    trackData.forEach(track => track.otherReleases = [
        track.aka,
        ...trackData.filter(({ aka }) => aka === track)
    ].filter(Boolean));

    if (wikiInfo.features.flashesAndGames) {
        const actlessFlashData = flashData.filter(flash => !flash.act8r8k);

        actlessFlashData.forEach(flash => mapInPlace(flash.tracks, getLinkedTrack));

        filterNull(actlessFlashData, 'tracks');

        trackData.forEach(track => track.flashes = actlessFlashData.filter(flash => flash.tracks.includes(track)));
    }

    artistData.forEach(artist => {
        const filterProp = (array, prop) => array.filter(thing => thing[prop]?.some(({ who }) => who === artist));
        const filterCommentary = array => array.filter(thing => thing.commentary && thing.commentary.replace(/<\/?b>/g, '').includes('<i>' + artist.name + ':</i>'));
        artist.tracks = {
            asArtist: filterProp(trackData, 'artists'),
            asCommentator: filterCommentary(trackData),
            asContributor: filterProp(trackData, 'contributors'),
            asCoverArtist: filterProp(trackData, 'coverArtists'),
            asAny: trackData.filter(track => (
                [...track.artists, ...track.contributors, ...track.coverArtists || []].some(({ who }) => who === artist)
            ))
        };
        artist.albums = {
            asArtist: filterProp(albumData, 'artists'),
            asCommentator: filterCommentary(albumData),
            asCoverArtist: filterProp(albumData, 'coverArtists'),
            asWallpaperArtist: filterProp(albumData, 'wallpaperArtists')
        };
        if (wikiInfo.features.flashesAndGames) {
            artist.flashes = {
                asContributor: filterProp(flashData, 'contributors')
            };
        }
    });

    groupData.filter(x => x.isGroup).forEach(group => group.category = groupData.find(x => x.isCategory && x.name === group.category));
    groupData.filter(x => x.isCategory).forEach(category => category.groups = groupData.filter(x => x.isGroup && x.category === category));

    officialAlbumData = albumData.filter(album => album.groups.some(group => group.directory === C.OFFICIAL_GROUP_DIRECTORY));
    fandomAlbumData = albumData.filter(album => album.groups.every(group => group.directory !== C.OFFICIAL_GROUP_DIRECTORY));

    // Makes writing a little nicer on CPU theoretically, 8ut also costs in
    // performance right now 'cuz it'll w8 for file writes to 8e completed
    // 8efore moving on to more data processing. So, defaults to zero, which
    // disa8les the queue feature altogether.
    queueSize = +(miscOptions['queue-size'] ?? 0);

    // NOT for ena8ling or disa8ling specific features of the site!
    // This is only in charge of what general groups of files to 8uild.
    // They're here to make development quicker when you're only working
    // on some particular area(s) of the site rather than making changes
    // across all of them.
    const buildFlags = await parseOptions(process.argv.slice(2), {
        all: {type: 'flag'}, // Defaults to true if none 8elow specified.

        album: {type: 'flag'},
        artist: {type: 'flag'},
        commentary: {type: 'flag'},
        flash: {type: 'flag'},
        group: {type: 'flag'},
        list: {type: 'flag'},
        misc: {type: 'flag'},
        news: {type: 'flag'},
        static: {type: 'flag'},
        tag: {type: 'flag'},
        track: {type: 'flag'},

        [parseOptions.handleUnknown]: () => {}
    });

    const buildAll = !Object.keys(buildFlags).length || buildFlags.all;

    await writeSymlinks();
    if (buildAll || buildFlags.misc) await writeMiscellaneousPages();
    if (buildAll || buildFlags.static) await writeStaticPages();
    if (buildAll || buildFlags.news) await writeNewsPages();
    if (buildAll || buildFlags.list) await writeListingPages();
    if (buildAll || buildFlags.tag) await writeTagPages();
    if (buildAll || buildFlags.commentary) await writeCommentaryPages();
    if (buildAll || buildFlags.group) await writeGroupPages();
    if (buildAll || buildFlags.album) await writeAlbumPages();
    if (buildAll || buildFlags.track) await writeTrackPages();
    if (buildAll || buildFlags.artist) await writeArtistPages();
    if (buildAll || buildFlags.flash) if (wikiInfo.features.flashesAndGames) await writeFlashPages();

    decorateTime.displayTime();

    // The single most important step.
    console.log('Written!');
}

main().catch(error => console.error(error));
