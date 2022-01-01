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

import * as path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// I made this dependency myself! A long, long time ago. It is pro8a8ly my
// most useful li8rary ever. I'm not sure 8esides me actually uses it, though.
import fixWS from 'fix-whitespace';
// Wait nevermind, I forgot a8out why-do-kids-love-the-taste-of-cinnamon-toast-
// crunch. THAT is my 8est li8rary.

// It stands for "HTML Entities", apparently. Cursed.
import he from 'he';

import {
    // This is the dum8est name for a function possi8le. Like, SURE, fine, may8e
    // the UNIX people had some valid reason to go with the weird truncated
    // lowercased convention they did. 8ut Node didn't have to ALSO use that
    // convention! Would it have 8een so hard to just name the function
    // something like fs.readDirectory???????? No, it wouldn't have 8een.
    readdir,
    // ~~ 8ut okay, like, look at me. DOING THE SAME THING. See, *I* could have
    // named my promisified function differently, and yet I did not. I literally
    // cannot explain why. We are all used to following in the 8ad decisions of
    // our ancestors, and never never never never never never never consider
    // that hey, may8e we don't need to make the exact same decisions they did.
    // Even when we're perfectly aware th8t's exactly what we're doing! ~~
    //
    // 2021 ADDENDUM: Ok, a year and a half later the a8ove is still true,
    //                except for the part a8out promisifying, since fs/promises
    //                already does that for us. 8ut I could STILL import it
    //                using my own name (`readdir as readDirectory`), and yet
    //                here I am, defin8tely not doing that.
    //                SOME THINGS NEVER CHANGE.
    //
    // Programmers, including me, are all pretty stupid.

    // 8ut I mean, come on. Look. Node decided to use readFile, instead of like,
    // what, cat? Why couldn't they rename readdir too???????? As Johannes
    // Kepler once so elegantly put it: "Shrug."
    readFile,
    writeFile,
    access,
    mkdir,
    symlink,
    unlink
} from 'fs/promises';

import genThumbs from './gen-thumbs.js';
import { listingSpec, listingTargetSpec } from './listing-spec.js';
import urlSpec from './url-spec.js';
import * as pageSpecs from './page/index.js';

import find from './util/find.js';
import * as html from './util/html.js';
import unbound_link, {getLinkThemeString} from './util/link.js';

import {
    fancifyFlashURL,
    fancifyURL,
    generateChronologyLinks,
    generateCoverLink,
    generateInfoGalleryLinks,
    generatePreviousNextLinks,
    getAlbumGridHTML,
    getAlbumStylesheet,
    getArtistString,
    getFlashGridHTML,
    getGridHTML,
    getRevealStringFromTags,
    getRevealStringFromWarnings,
    getThemeString,
    iconifyURL
} from './misc-templates.js';

import {
    decorateTime,
    logWarn,
    logInfo,
    logError,
    parseOptions,
    progressPromiseAll
} from './util/cli.js';

import {
    validateReplacerSpec,
    transformInline
} from './util/replacer.js';

import {
    genStrings,
    count,
    list
} from './util/strings.js';

import {
    chunkByConditions,
    chunkByProperties,
    getAlbumCover,
    getAlbumListTag,
    getAllTracks,
    getArtistCommentary,
    getArtistNumContributions,
    getFlashCover,
    getKebabCase,
    getTotalDuration,
    getTrackCover,
    sortByArtDate,
    sortByDate,
    sortByName
} from './util/wiki-data.js';

import {
    serializeContribs,
    serializeCover,
    serializeGroupsForAlbum,
    serializeGroupsForTrack,
    serializeImagePaths,
    serializeLink
} from './util/serialize.js';

import {
    bindOpts,
    call,
    filterEmptyLines,
    mapInPlace,
    queue,
    splitArray,
    unique,
    withEntries
} from './util/sugar.js';

import {
    generateURLs,
    thumb
} from './util/urls.js';

// Pensive emoji!
import {
    FANDOM_GROUP_DIRECTORY,
    OFFICIAL_GROUP_DIRECTORY,
    UNRELEASED_TRACKS_DIRECTORY
} from './util/magic-constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CACHEBUST = 7;

const WIKI_INFO_FILE = 'wiki-info.txt';
const HOMEPAGE_INFO_FILE = 'homepage.txt';
const ARTIST_DATA_FILE = 'artists.txt';
const FLASH_DATA_FILE = 'flashes.txt';
const NEWS_DATA_FILE = 'news.txt';
const TAG_DATA_FILE = 'tags.txt';
const GROUP_DATA_FILE = 'groups.txt';
const STATIC_PAGE_DATA_FILE = 'static-pages.txt';
const DEFAULT_STRINGS_FILE = 'strings-default.json';

// Code that's common 8etween the 8uild code (i.e. upd8.js) and gener8ted
// site code should 8e put here. Which, uh, ~~only really means this one
// file~~ is now a variety of useful utilities!
//
// Rather than hard code it, anything in this directory can 8e shared across
// 8oth ends of the code8ase.
// (This gets symlinked into the --data-path directory.)
const UTILITY_DIRECTORY = 'util';

// Code that's used only in the static site! CSS, cilent JS, etc.
// (This gets symlinked into the --data-path directory.)
const STATIC_DIRECTORY = 'static';

// Su8directory under provided --data-path directory for al8um files, which are
// read from and processed to compose the majority of album and track data.
const DATA_ALBUM_DIRECTORY = 'album';

// Shared varia8les! These are more efficient to access than a shared varia8le
// (or at least I h8pe so), and are easier to pass across functions than a
// 8unch of specific arguments.
//
// Upd8: Okay yeah these aren't actually any different. Still cleaner than
// passing around a data object containing all this, though.
let dataPath;
let mediaPath;
let langPath;
let outputPath;

// Glo8al data o8ject shared 8etween 8uild functions and all that. This keeps
// everything encapsul8ted in one place, so it's easy to pass and share across
// modules!
let wikiData = {};

let queueSize;

let languages;

const urls = generateURLs(urlSpec);

// Note there isn't a 'find track data files' function. I plan on including the
// data for all tracks within an al8um collected in the single metadata file
// for that al8um. Otherwise there'll just 8e way too many files, and I'd also
// have to worry a8out linking track files to al8um files (which would contain
// only the track listing, not track data itself), and dealing with errors of
// missing track files (or track files which are not linked to al8ums). All a
// 8unch of stuff that's a pain to deal with for no apparent 8enefit.
async function findFiles(dataPath, filter = f => true) {
    return (await readdir(dataPath))
        .map(file => path.join(dataPath, file))
        .filter(file => filter(file));
}

function splitLines(text) {
    return text.split(/\r|\n|\r\n/);
}

function* getSections(lines) {
    // ::::)
    const isSeparatorLine = line => /^-{8,}/.test(line);
    yield* splitArray(lines, isSeparatorLine);
}

function getBasicField(lines, name) {
    const line = lines.find(line => line.startsWith(name + ':'));
    return line && line.slice(name.length + 1).trim();
}

function getDimensionsField(lines, name) {
    const string = getBasicField(lines, name);
    if (!string) return string;
    const parts = string.split(/[x,* ]+/g);
    if (parts.length !== 2) throw new Error(`Invalid dimensions: ${string} (expected width & height)`);
    const nums = parts.map(part => Number(part.trim()));
    if (nums.includes(NaN)) throw new Error(`Invalid dimensions: ${string} (couldn't parse as numbers)`);
    return nums;
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

const replacerSpec = {
    'album': {
        find: 'album',
        link: 'album'
    },
    'album-commentary': {
        find: 'album',
        link: 'albumCommentary'
    },
    'artist': {
        find: 'artist',
        link: 'artist'
    },
    'artist-gallery': {
        find: 'artist',
        link: 'artistGallery'
    },
    'commentary-index': {
        find: null,
        link: 'commentaryIndex'
    },
    'date': {
        find: null,
        value: ref => new Date(ref),
        html: (date, {strings}) => `<time datetime="${date.toString()}">${strings.count.date(date)}</time>`
    },
    'flash': {
        find: 'flash',
        link: 'flash',
        transformName(name, node, input) {
            const nextCharacter = input[node.iEnd];
            const lastCharacter = name[name.length - 1];
            if (
                ![' ', '\n', '<'].includes(nextCharacter) &&
                lastCharacter === '.'
            ) {
                return name.slice(0, -1);
            } else {
                return name;
            }
        }
    },
    'group': {
        find: 'group',
        link: 'groupInfo'
    },
    'group-gallery': {
        find: 'group',
        link: 'groupGallery'
    },
    'listing-index': {
        find: null,
        link: 'listingIndex'
    },
    'listing': {
        find: 'listing',
        link: 'listing'
    },
    'media': {
        find: null,
        link: 'media'
    },
    'news-index': {
        find: null,
        link: 'newsIndex'
    },
    'news-entry': {
        find: 'newsEntry',
        link: 'newsEntry'
    },
    'root': {
        find: null,
        link: 'root'
    },
    'site': {
        find: null,
        link: 'site'
    },
    'static': {
        find: 'staticPage',
        link: 'staticPage'
    },
    'string': {
        find: null,
        value: ref => ref,
        html: (ref, {strings, args}) => strings(ref, args)
    },
    'tag': {
        find: 'tag',
        link: 'tag'
    },
    'track': {
        find: 'track',
        link: 'track'
    }
};

if (!validateReplacerSpec(replacerSpec, unbound_link)) {
    process.exit();
}

function parseAttributes(string, {to}) {
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
            if (attribute === 'src' && value.startsWith('media/')) {
                attributes[attribute] = to('media.path', value.slice('media/'.length));
            } else {
                attributes[attribute] = value;
            }
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

function transformMultiline(text, {
    parseAttributes,
    transformInline
}) {
    // Heck yes, HTML magics.

    text = transformInline(text.trim());

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

    for (let line of splitLines(text)) {
        const imageLine = line.startsWith('<img');
        line = line.replace(/<img (.*?)>/g, (match, attributes) => img({
            lazy: true,
            link: true,
            thumb: 'medium',
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

function transformLyrics(text, {
    transformInline,
    transformMultiline
}) {
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

    const contentLines = contents.split(/\r\n|\r|\n/);

    // In this line of code I defeat the purpose of using a generator in the
    // first place. Sorry!!!!!!!!
    const sections = Array.from(getSections(contentLines));

    const albumSection = sections[0];
    const album = {};

    album.name = getBasicField(albumSection, 'Album');
    album.artists = getContributionField(albumSection, 'Artists') || getContributionField(albumSection, 'Artist');
    album.wallpaperArtists = getContributionField(albumSection, 'Wallpaper Art');
    album.wallpaperStyle = getMultilineField(albumSection, 'Wallpaper Style');
    album.bannerArtists = getContributionField(albumSection, 'Banner Art');
    album.bannerStyle = getMultilineField(albumSection, 'Banner Style');
    album.bannerDimensions = getDimensionsField(albumSection, 'Banner Dimensions');
    album.date = getBasicField(albumSection, 'Date');
    album.trackArtDate = getBasicField(albumSection, 'Track Art Date') || album.date;
    album.coverArtDate = getBasicField(albumSection, 'Cover Art Date') || album.date;
    album.dateAdded = getBasicField(albumSection, 'Date Added');
    album.coverArtists = getContributionField(albumSection, 'Cover Art');
    album.hasTrackArt = getBooleanField(albumSection, 'Has Track Art') ?? true;
    album.trackCoverArtists = getContributionField(albumSection, 'Track Art');
    album.artTags = getListField(albumSection, 'Art Tags') || [];
    album.commentary = getCommentaryField(albumSection);
    album.urls = getListField(albumSection, 'URLs') || [];
    album.groups = getListField(albumSection, 'Groups') || [];
    album.directory = getBasicField(albumSection, 'Directory');
    album.isMajorRelease = getBooleanField(albumSection, 'Major Release') ?? false;
    album.isListedOnHomepage = getBooleanField(albumSection, 'Listed on Homepage') ?? true;

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
        return {error: `Expected "Album" (name) field!`};
    }

    if (!album.date) {
        return {error: `Expected "Date" field! (in ${album.name})`};
    }

    if (!album.dateAdded) {
        return {error: `Expected "Date Added" field! (in ${album.name})`};
    }

    if (isNaN(Date.parse(album.date))) {
        return {error: `Invalid Date field: "${album.date}" (in ${album.name})`};
    }

    if (isNaN(Date.parse(album.trackArtDate))) {
        return {error: `Invalid Track Art Date field: "${album.trackArtDate}" (in ${album.name})`};
    }

    if (isNaN(Date.parse(album.coverArtDate))) {
        return {error: `Invalid Cover Art Date field: "${album.coverArtDate}" (in ${album.name})`};
    }

    if (isNaN(Date.parse(album.dateAdded))) {
        return {error: `Invalid Date Added field: "${album.dateAdded}" (in ${album.name})`};
    }

    album.date = new Date(album.date);
    album.trackArtDate = new Date(album.trackArtDate);
    album.coverArtDate = new Date(album.coverArtDate);
    album.dateAdded = new Date(album.dateAdded);

    if (!album.directory) {
        album.directory = getKebabCase(album.name);
    }

    album.tracks = [];

    // will be overwritten if a group section is found!
    album.trackGroups = null;

    let group = null;
    let trackIndex = 0;

    for (const section of sections.slice(1)) {
        // Just skip empty sections. Sometimes I paste a 8unch of dividers,
        // and this lets the empty sections doing that creates (temporarily)
        // exist without raising an error.
        if (!section.filter(Boolean).length) {
            continue;
        }

        const groupName = getBasicField(section, 'Group');
        if (groupName) {
            group = {
                name: groupName,
                color: (
                    getBasicField(section, 'Color') ||
                    getBasicField(section, 'FG') ||
                    album.color
                ),
                originalDate: getBasicField(section, 'Original Date'),
                startIndex: trackIndex,
                tracks: []
            };
            if (group.originalDate) {
                if (isNaN(Date.parse(group.originalDate))) {
                    return {error: `The track group "${group.name}" has an invalid "Original Date" field: "${group.originalDate}"`};
                }
                group.originalDate = new Date(group.originalDate);
                group.date = group.originalDate;
            } else {
                group.date = album.date;
            }
            if (album.trackGroups) {
                album.trackGroups.push(group);
            } else {
                album.trackGroups = [group];
            }
            continue;
        }

        trackIndex++;

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
            track.directory = getKebabCase(track.name);
        }

        if (track.originalDate) {
            if (isNaN(Date.parse(track.originalDate))) {
                return {error: `The track "${track.name}"'s has an invalid "Original Date" field: "${track.originalDate}"`};
            }
            track.originalDate = new Date(track.originalDate);
            track.date = new Date(track.originalDate);
        } else if (group && group.originalDate) {
            track.originalDate = group.originalDate;
            track.date = group.originalDate;
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

        if (group) {
            track.color = group.color;
            group.tracks.push(track);
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

    const contentLines = splitLines(contents);
    const sections = Array.from(getSections(contentLines));

    return sections.filter(s => s.filter(Boolean).length).map(section => {
        const name = getBasicField(section, 'Artist');
        const urls = (getListField(section, 'URLs') || []).filter(Boolean);
        const alias = getBasicField(section, 'Alias');
        const hasAvatar = getBooleanField(section, 'Has Avatar') ?? false;
        const note = getMultilineField(section, 'Note');
        let directory = getBasicField(section, 'Directory');

        if (!name) {
            return {error: 'Expected "Artist" (name) field!'};
        }

        if (!directory) {
            directory = getKebabCase(name);
        }

        if (alias) {
            return {name, directory, alias};
        } else {
            return {name, directory, urls, note, hasAvatar};
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

    const contentLines = splitLines(contents);
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
            return {act8r8k: true, name: act, color, anchor, jump, jumpColor};
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

    const contentLines = splitLines(contents);
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

    const contentLines = splitLines(contents);
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

        const directory = getKebabCase(name);

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

    const contentLines = splitLines(contents);
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
            directory = getKebabCase(name);
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

    const contentLines = splitLines(contents);
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

        return {
            name,
            shortName,
            directory,
            content,
            stylesheet,
            listed
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
    const contentLines = splitLines(contents);

    const name = getBasicField(contentLines, 'Name');
    if (!name) {
        return {error: 'Expected "Name" field!'};
    }

    const shortName = getBasicField(contentLines, 'Short Name') || name;

    const color = getBasicField(contentLines, 'Color') || '#0088ff';

    // This is optional! Without it, <meta rel="canonical"> tags won't 8e
    // gener8ted.
    const canonicalBase = getBasicField(contentLines, 'Canonical Base');

    // This is optional! Without it, the site will default to 8uilding in
    // English. (This is only really relevant if you've provided string files
    // for non-English languages.)
    const defaultLanguage = getBasicField(contentLines, 'Default Language');

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
        defaultLanguage,
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

    const contentLines = splitLines(contents);
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
                if (group && !groupCount) {
                    return {error: 'Expected "Count" field!'};
                }

                if (groupCount) {
                    if (isNaN(parseInt(groupCount))) {
                        return {error: `Invalid Count field: "${groupCount}"`};
                    }

                    groupCount = parseInt(groupCount);
                }

                const actions = getListField(section, 'Actions') || [];

                return {...row, group, groupCount, albums, actions};
            }
        }
    });

    return {sidebar, rows};
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

function stringifyAlbumData({wikiData}) {
    return JSON.stringify(wikiData.albumData, (key, value) => {
        switch (key) {
            case 'commentary':
                return '';
            default:
                return stringifyRefs(key, value);
        }
    }, stringifyIndent);
}

function stringifyTrackData({wikiData}) {
    return JSON.stringify(wikiData.trackData, (key, value) => {
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

function stringifyFlashData({wikiData}) {
    return JSON.stringify(wikiData.flashData, (key, value) => {
        switch (key) {
            case 'act':
            case 'commentary':
                return undefined;
            default:
                return stringifyRefs(key, value);
        }
    }, stringifyIndent);
}

function stringifyArtistData({wikiData}) {
    return JSON.stringify(wikiData.artistData, (key, value) => {
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

function img({
    src,
    alt,
    thumb: thumbKey,
    reveal,
    id,
    class: className,
    width,
    height,
    link = false,
    lazy = false,
    square = false
}) {
    const willSquare = square;
    const willLink = typeof link === 'string' || link;

    const originalSrc = src;
    const thumbSrc = thumbKey ? thumb[thumbKey](src) : src;

    const imgAttributes = html.attributes({
        id: link ? '' : id,
        class: className,
        alt,
        width,
        height
    });

    const nonlazyHTML = wrap(`<img src="${thumbSrc}" ${imgAttributes}>`);
    const lazyHTML = lazy && wrap(`<img class="lazy" data-original="${thumbSrc}" ${imgAttributes}>`, true);

    if (lazy) {
        return fixWS`
            <noscript>${nonlazyHTML}</noscript>
            ${lazyHTML}
        `;
    } else {
        return nonlazyHTML;
    }

    function wrap(input, hide = false) {
        let wrapped = input;

        wrapped = `<div class="image-inner-area">${wrapped}</div>`;
        wrapped = `<div class="image-container">${wrapped}</div>`;

        if (reveal) {
            wrapped = fixWS`
                <div class="reveal">
                    ${wrapped}
                    <span class="reveal-text">${reveal}</span>
                </div>
            `;
        }

        if (willSquare) {
            wrapped = html.tag('div', {class: 'square-content'}, wrapped);
            wrapped = html.tag('div', {class: ['square', hide && !willLink && 'js-hide']}, wrapped);
        }

        if (willLink) {
            wrapped = html.tag('a', {
                id,
                class: ['box', hide && 'js-hide'],
                href: typeof link === 'string' ? link : originalSrc
            }, wrapped);
        }

        return wrapped;
    }
}

function validateWritePath(path, urlGroup) {
    if (!Array.isArray(path)) {
        return {error: `Expected array, got ${path}`};
    }

    const { paths } = urlGroup;

    const definedKeys = Object.keys(paths);
    const specifiedKey = path[0];

    if (!definedKeys.includes(specifiedKey)) {
        return {error: `Specified key ${specifiedKey} isn't defined`};
    }

    const expectedArgs = paths[specifiedKey].match(/<>/g)?.length ?? 0;
    const specifiedArgs = path.length - 1;

    if (specifiedArgs !== expectedArgs) {
        return {error: `Expected ${expectedArgs} arguments, got ${specifiedArgs}`};
    }

    return {success: true};
}

function validateWriteObject(obj) {
    if (typeof obj !== 'object') {
        return {error: `Expected object, got ${typeof obj}`};
    }

    if (typeof obj.type !== 'string') {
        return {error: `Expected type to be string, got ${obj.type}`};
    }

    switch (obj.type) {
        case 'legacy': {
            if (typeof obj.write !== 'function') {
                return {error: `Expected write to be string, got ${obj.write}`};
            }

            break;
        }

        case 'page': {
            const path = validateWritePath(obj.path, urlSpec.localized);
            if (path.error) {
                return {error: `Path validation failed: ${path.error}`};
            }

            if (typeof obj.page !== 'function') {
                return {error: `Expected page to be function, got ${obj.content}`};
            }

            break;
        }

        case 'data': {
            const path = validateWritePath(obj.path, urlSpec.data);
            if (path.error) {
                return {error: `Path validation failed: ${path.error}`};
            }

            if (typeof obj.data !== 'function') {
                return {error: `Expected data to be function, got ${obj.data}`};
            }

            break;
        }

        case 'redirect': {
            const fromPath = validateWritePath(obj.fromPath, urlSpec.localized);
            if (fromPath.error) {
                return {error: `Path (fromPath) validation failed: ${fromPath.error}`};
            }

            const toPath = validateWritePath(obj.toPath, urlSpec.localized);
            if (toPath.error) {
                return {error: `Path (toPath) validation failed: ${toPath.error}`};
            }

            if (typeof obj.title !== 'function') {
                return {error: `Expected title to be function, got ${obj.title}`};
            }

            break;
        }

        default: {
            return {error: `Unknown type: ${obj.type}`};
        }
    }

    return {success: true};
}

async function writeData(subKey, directory, data) {
    const paths = writePage.paths('', 'data.' + subKey, directory, {file: 'data.json'});
    await writePage.write(JSON.stringify(data), {paths});
}

// This used to 8e a function! It's long 8een divided into multiple helper
// functions, and nowadays we just directly access those, rather than ever
// touching the original one (which had contained everything).
const writePage = {};

writePage.to = ({
    baseDirectory,
    pageSubKey,
    paths
}) => (targetFullKey, ...args) => {
    const [ groupKey, subKey ] = targetFullKey.split('.');
    let path = paths.subdirectoryPrefix;
    // When linking to *outside* the localized area of the site, we need to
    // make sure the result is correctly relative to the 8ase directory.
    if (groupKey !== 'localized' && baseDirectory) {
        path += urls.from('localizedWithBaseDirectory.' + pageSubKey).to(targetFullKey, ...args);
    } else {
        // If we're linking inside the localized area (or there just is no
        // 8ase directory), the 8ase directory doesn't matter.
        path += urls.from('localized.' + pageSubKey).to(targetFullKey, ...args);
    }
    return path;
};

writePage.html = (pageFn, {
    paths,
    strings,
    to,
    transformMultiline,
    wikiData
}) => {
    const { wikiInfo } = wikiData;

    let {
        title = '',
        meta = {},
        theme = '',
        stylesheet = '',

        // missing properties are auto-filled, see below!
        body = {},
        banner = {},
        main = {},
        sidebarLeft = {},
        sidebarRight = {},
        nav = {},
        footer = {}
    } = pageFn({to});

    body.style ??= '';

    theme = theme || getThemeString(wikiInfo.color);

    banner ||= {};
    banner.classes ??= [];
    banner.src ??= '';
    banner.position ??= '';
    banner.dimensions ??= [0, 0];

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

    const canonical = (wikiInfo.canonicalBase
        ? wikiInfo.canonicalBase + paths.pathname
        : '');

    const collapseSidebars = (sidebarLeft.collapse !== false) && (sidebarRight.collapse !== false);

    const mainHTML = main.content && html.tag('main', {
        id: 'content',
        class: main.classes
    }, main.content);

    const footerHTML = footer.content && html.tag('footer', {
        id: 'footer',
        class: footer.classes
    }, footer.content);

    const generateSidebarHTML = (id, {
        content,
        multiple,
        classes,
        collapse = true,
        wide = false
    }) => (content
        ? html.tag('div',
            {id, class: [
                'sidebar-column',
                'sidebar',
                wide && 'wide',
                !collapse && 'no-hide',
                ...classes
            ]},
            content)
        : multiple ? html.tag('div',
            {id, class: [
                'sidebar-column',
                'sidebar-multiple',
                wide && 'wide',
                !collapse && 'no-hide'
            ]},
            multiple.map(content => html.tag('div',
                {class: ['sidebar', ...classes]},
                content)))
        : '');

    const sidebarLeftHTML = generateSidebarHTML('sidebar-left', sidebarLeft);
    const sidebarRightHTML = generateSidebarHTML('sidebar-right', sidebarRight);

    if (nav.simple) {
        nav.links = [
            {toHome: true},
            {toCurrentPage: true}
        ];
    }

    const links = (nav.links || []).filter(Boolean);

    const navLinkParts = [];
    for (let i = 0; i < links.length; i++) {
        let cur = links[i];
        const prev = links[i - 1];
        const next = links[i + 1];

        let { title: linkTitle } = cur;

        if (cur.toHome) {
            linkTitle ??= wikiInfo.shortName;
        } else if (cur.toCurrentPage) {
            linkTitle ??= title;
        }

        let part = prev && (cur.divider ?? true) ? '/ ' : '';

        if (typeof cur.html === 'string') {
            if (!cur.html) {
                logWarn`Empty HTML in nav link ${JSON.stringify(cur)}`;
            }
            part += `<span>${cur.html}</span>`;
        } else {
            const attributes = {
                class: (cur.toCurrentPage || i === links.length - 1) && 'current',
                href: (
                    cur.toCurrentPage ? '' :
                    cur.toHome ? to('localized.home') :
                    cur.path ? to(...cur.path) :
                    cur.href ? call(() => {
                        logWarn`Using legacy href format nav link in ${paths.pathname}`;
                        return cur.href;
                    }) :
                    null)
            };
            if (attributes.href === null) {
                throw new Error(`Expected some href specifier for link to ${linkTitle} (${JSON.stringify(cur)})`);
            }
            part += html.tag('a', attributes, linkTitle);
        }
        navLinkParts.push(part);
    }

    const navHTML = html.tag('nav', {
        [html.onlyIfContent]: true,
        id: 'header',
        class: nav.classes
    }, [
        links.length && html.tag('h2', {class: 'highlight-last-link'}, navLinkParts),
        nav.content
    ]);

    const bannerSrc = (
        banner.src ? banner.src :
        banner.path ? to(...banner.path) :
        null);

    const bannerHTML = banner.position && bannerSrc && html.tag('div',
        {
            id: 'banner',
            class: banner.classes
        },
        html.tag('img', {
            src: bannerSrc,
            alt: banner.alt,
            width: banner.dimensions[0] || 1100,
            height: banner.dimensions[1] || 200
        })
    );

    const layoutHTML = [
        navHTML,
        banner.position === 'top' && bannerHTML,
        html.tag('div',
            {class: ['layout-columns', !collapseSidebars && 'vertical-when-thin']},
            [
                sidebarLeftHTML,
                mainHTML,
                sidebarRightHTML
            ]),
        banner.position === 'bottom' && bannerHTML,
        footerHTML
    ].filter(Boolean).join('\n');

    const infoCardHTML = fixWS`
        <div id="info-card-container">
            <div class="info-card-decor">
                <div class="info-card">
                    <div class="info-card-art-container no-reveal">
                        ${img({
                            class: 'info-card-art',
                            src: '',
                            link: true,
                            square: true
                        })}
                    </div>
                    <div class="info-card-art-container reveal">
                        ${img({
                            class: 'info-card-art',
                            src: '',
                            link: true,
                            square: true,
                            reveal: getRevealStringFromWarnings('<span class="info-card-art-warnings"></span>', {strings})
                        })}
                    </div>
                    <h1 class="info-card-name"><a></a></h1>
                    <p class="info-card-album">${strings('releaseInfo.from', {album: '<a></a>'})}</p>
                    <p class="info-card-artists">${strings('releaseInfo.by', {artists: '<span></span>'})}</p>
                    <p class="info-card-cover-artists">${strings('releaseInfo.coverArtBy', {artists: '<span></span>'})}</p>
                </div>
            </div>
        </div>
    `;

    return filterEmptyLines(fixWS`
        <!DOCTYPE html>
        <html ${html.attributes({
            lang: strings.code,
            'data-rebase-localized': to('localized.root'),
            'data-rebase-shared': to('shared.root'),
            'data-rebase-media': to('media.root'),
            'data-rebase-data': to('data.root')
        })}>
            <head>
                <title>${title}</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                ${Object.entries(meta).filter(([ key, value ]) => value).map(([ key, value ]) => `<meta ${key}="${html.escapeAttributeValue(value)}">`).join('\n')}
                ${canonical && `<link rel="canonical" href="${canonical}">`}
                <link rel="stylesheet" href="${to('shared.staticFile', `site.css?${CACHEBUST}`)}">
                ${(theme || stylesheet) && fixWS`
                    <style>
                        ${theme}
                        ${stylesheet}
                    </style>
                `}
                <script src="${to('shared.staticFile', `lazy-loading.js?${CACHEBUST}`)}"></script>
            </head>
            <body ${html.attributes({style: body.style || ''})}>
                <div id="page-container">
                    ${mainHTML && fixWS`
                        <div id="skippers">
                            ${[
                                ['#content', strings('misc.skippers.skipToContent')],
                                sidebarLeftHTML && ['#sidebar-left', (sidebarRightHTML
                                    ? strings('misc.skippers.skipToSidebar.left')
                                    : strings('misc.skippers.skipToSidebar'))],
                                sidebarRightHTML && ['#sidebar-right', (sidebarLeftHTML
                                    ? strings('misc.skippers.skipToSidebar.right')
                                    : strings('misc.skippers.skipToSidebar'))],
                                footerHTML && ['#footer', strings('misc.skippers.skipToFooter')]
                            ].filter(Boolean).map(([ href, title ]) => fixWS`
                                <span class="skipper"><a href="${href}">${title}</a></span>
                            `).join('\n')}
                        </div>
                    `}
                    ${layoutHTML}
                </div>
                ${infoCardHTML}
                <script type="module" src="${to('shared.staticFile', `client.js?${CACHEBUST}`)}"></script>
            </body>
        </html>
    `);
};

writePage.write = async (content, {paths}) => {
    await mkdir(paths.outputDirectory, {recursive: true});
    await writeFile(paths.outputFile, content);
};

// TODO: This only supports one <>-style argument.
writePage.paths = (baseDirectory, fullKey, directory = '', {
    file = 'index.html'
} = {}) => {
    const [ groupKey, subKey ] = fullKey.split('.');

    const pathname = (groupKey === 'localized' && baseDirectory
        ? urls.from('shared.root').to('localizedWithBaseDirectory.' + subKey, baseDirectory, directory)
        : urls.from('shared.root').to(fullKey, directory));

    // Needed for the rare directory which itself contains a slash, e.g. for
    // listings, with directories like 'albums/by-name'.
    const subdirectoryPrefix = '../'.repeat(directory.split('/').length - 1);

    const outputDirectory = path.join(outputPath, pathname);
    const outputFile = path.join(outputDirectory, file);

    return {
        pathname,
        subdirectoryPrefix,
        outputDirectory, outputFile
    };
};

function writeSymlinks() {
    return progressPromiseAll('Writing site symlinks.', [
        link(path.join(__dirname, UTILITY_DIRECTORY), 'shared.utilityRoot'),
        link(path.join(__dirname, STATIC_DIRECTORY), 'shared.staticRoot'),
        link(mediaPath, 'media.root')
    ]);

    async function link(directory, urlKey) {
        const pathname = urls.from('shared.root').to(urlKey);
        const file = path.join(outputPath, pathname);
        try {
            await unlink(file);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        try {
            await symlink(path.resolve(directory), file);
        } catch (error) {
            if (error.code === 'EPERM') {
                await symlink(path.resolve(directory), file, 'junction');
            }
        }
    }
}

function writeSharedFilesAndPages({strings, wikiData}) {
    const { groupData, wikiInfo } = wikiData;

    const redirect = async (title, from, urlKey, directory) => {
        const target = path.relative(from, urls.from('shared.root').to(urlKey, directory));
        const content = generateRedirectPage(title, target, {strings});
        await mkdir(path.join(outputPath, from), {recursive: true});
        await writeFile(path.join(outputPath, from, 'index.html'), content);
    };

    return progressPromiseAll(`Writing files & pages shared across languages.`, [
        groupData?.some(group => group.directory === 'fandom') &&
        redirect('Fandom - Gallery', 'albums/fandom', 'localized.groupGallery', 'fandom'),

        groupData?.some(group => group.directory === 'official') &&
        redirect('Official - Gallery', 'albums/official', 'localized.groupGallery', 'official'),

        wikiInfo.features.listings &&
        redirect('Album Commentary', 'list/all-commentary', 'localized.commentaryIndex', ''),

        writeFile(path.join(outputPath, 'data.json'), fixWS`
            {
                "albumData": ${stringifyAlbumData({wikiData})},
                ${wikiInfo.features.flashesAndGames && `"flashData": ${stringifyFlashData({wikiData})},`}
                "artistData": ${stringifyArtistData({wikiData})}
            }
        `)
    ].filter(Boolean));
}

function generateRedirectPage(title, target, {strings}) {
    return fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <title>${strings('redirectPage.title', {title})}</title>
                <meta charset="utf-8">
                <meta http-equiv="refresh" content="0;url=${target}">
                <link rel="canonical" href="${target}">
                <link rel="stylesheet" href="static/site-basic.css">
            </head>
            <body>
                <main>
                    <h1>${strings('redirectPage.title', {title})}</h1>
                    <p>${strings('redirectPage.infoLine', {
                        target: `<a href="${target}">${target}</a>`
                    })}</p>
                </main>
            </body>
        </html>
    `;
}

// RIP toAnythingMan (previously getHrefOfAnythingMan), 2020-05-25<>2021-05-14.
// ........Yet the function 8reathes life anew as linkAnythingMan! ::::)
function linkAnythingMan(anythingMan, {link, wikiData, ...opts}) {
    return (
        wikiData.albumData.includes(anythingMan) ? link.album(anythingMan, opts) :
        wikiData.trackData.includes(anythingMan) ? link.track(anythingMan, opts) :
        wikiData.flashData?.includes(anythingMan) ? link.flash(anythingMan, opts) :
        'idk bud'
    )
}

async function processLanguageFile(file, defaultStrings = null) {
    let contents;
    try {
        contents = await readFile(file, 'utf-8');
    } catch (error) {
        return {error: `Could not read ${file} (${error.code}).`};
    }

    let json;
    try {
        json = JSON.parse(contents);
    } catch (error) {
        return {error: `Could not parse JSON from ${file} (${error}).`};
    }

    return genStrings(json, {
        he,
        defaultJSON: defaultStrings?.json,
        bindUtilities: {
            count,
            list
        }
    });
}

// Wrapper function for running a function once for all languages.
async function wrapLanguages(fn, {writeOneLanguage = null}) {
    const k = writeOneLanguage;
    const languagesToRun = (k
        ? {[k]: languages[k]}
        : languages);

    const entries = Object.entries(languagesToRun)
        .filter(([ key ]) => key !== 'default');

    for (let i = 0; i < entries.length; i++) {
        const [ key, strings ] = entries[i];

        const baseDirectory = (strings === languages.default ? '' : strings.code);

        await fn({
            baseDirectory,
            strings
        }, i, entries);
    }
}

async function main() {
    Error.stackTraceLimit = Infinity;

    const WD = wikiData;

    WD.listingSpec = listingSpec;
    WD.listingTargetSpec = listingTargetSpec;

    const miscOptions = await parseOptions(process.argv.slice(2), {
        // Data files for the site, including flash, artist, and al8um data,
        // and like a jillion other things too. Pretty much everything which
        // makes an individual wiki what it is goes here!
        'data-path': {
            type: 'value'
        },

        // Static media will 8e referenced in the site here! The contents are
        // categorized; check out MEDIA_ALBUM_ART_DIRECTORY and other constants
        // near the top of this file (upd8.js).
        'media-path': {
            type: 'value'
        },

        // String files! For the most part, this is used for translating the
        // site to different languages, though you can also customize strings
        // for your own 8uild of the site if you'd like. Files here should all
        // match the format in strings-default.json in this repository. (If a
        // language file is missing any strings, the site code will fall 8ack
        // to what's specified in strings-default.json.)
        //
        // Unlike the other options here, this one's optional - the site will
        // 8uild with the default (English) strings if this path is left
        // unspecified.
        'lang-path': {
            type: 'value'
        },

        // This is the output directory. It's the one you'll upload online with
        // rsync or whatever when you're pushing an upd8, and also the one
        // you'd archive if you wanted to make a 8ackup of the whole dang
        // site. Just keep in mind that the gener8ted result will contain a
        // couple symlinked directories, so if you're uploading, you're pro8a8ly
        // gonna want to resolve those yourself.
        'out-path': {
            type: 'value'
        },

        // Thum8nail gener8tion is *usually* something you want, 8ut it can 8e
        // kinda a pain to run every time, since it does necessit8te reading
        // every media file at run time. Pass this to skip it.
        'skip-thumbs': {
            type: 'flag'
        },

        // Or, if you *only* want to gener8te newly upd8ted thum8nails, you can
        // pass this flag! It exits 8efore 8uilding the rest of the site.
        'thumbs-only': {
            type: 'flag'
        },

        // Only want 8uild one language during testing? This can chop down
        // 8uild times a pretty 8ig chunk! Just pass a single language code.
        'lang': {
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

    dataPath = miscOptions['data-path'] || process.env.HSMUSIC_DATA;
    mediaPath = miscOptions['media-path'] || process.env.HSMUSIC_MEDIA;
    langPath = miscOptions['lang-path'] || process.env.HSMUSIC_LANG; // Can 8e left unset!
    outputPath = miscOptions['out-path'] || process.env.HSMUSIC_OUT;

    const writeOneLanguage = miscOptions['lang'];

    {
        let errored = false;
        const error = (cond, msg) => {
            if (cond) {
                console.error(`\x1b[31;1m${msg}\x1b[0m`);
                errored = true;
            }
        };
        error(!dataPath,   `Expected --data-path option or HSMUSIC_DATA to be set`);
        error(!mediaPath,  `Expected --media-path option or HSMUSIC_MEDIA to be set`);
        error(!outputPath, `Expected --out-path option or HSMUSIC_OUT to be set`);
        if (errored) {
            return;
        }
    }

    const skipThumbs = miscOptions['skip-thumbs'] ?? false;
    const thumbsOnly = miscOptions['thumbs-only'] ?? false;

    if (skipThumbs && thumbsOnly) {
        logInfo`Well, you've put yourself rather between a roc and a hard place, hmmmm?`;
        return;
    }

    if (skipThumbs) {
        logInfo`Skipping thumbnail generation.`;
    } else {
        logInfo`Begin thumbnail generation... -----+`;
        const result = await genThumbs(mediaPath, {queueSize, quiet: true});
        logInfo`Done thumbnail generation! --------+`;
        if (!result) return;
        if (thumbsOnly) return;
    }

    const defaultStrings = await processLanguageFile(path.join(__dirname, DEFAULT_STRINGS_FILE));
    if (defaultStrings.error) {
        logError`Error loading default strings: ${defaultStrings.error}`;
        return;
    }

    if (langPath) {
        const languageDataFiles = await findFiles(langPath, f => path.extname(f) === '.json');
        const results = await progressPromiseAll(`Reading & processing language files.`, languageDataFiles
            .map(file => processLanguageFile(file, defaultStrings)));

        let error = false;
        for (const strings of results) {
            if (strings.error) {
                logError`Error loading provided strings: ${strings.error}`;
                error = true;
            }
        }
        if (error) return;

        languages = Object.fromEntries(results.map(strings => [strings.code, strings]));
    } else {
        languages = {};
    }

    if (!languages[defaultStrings.code]) {
        languages[defaultStrings.code] = defaultStrings;
    }

    logInfo`Loaded language strings: ${Object.keys(languages).join(', ')}`;

    if (writeOneLanguage && !(writeOneLanguage in languages)) {
        logError`Specified to write only ${writeOneLanguage}, but there is no strings file with this language code!`;
        return;
    } else if (writeOneLanguage) {
        logInfo`Writing only language ${writeOneLanguage} this run.`;
    } else {
        logInfo`Writing all languages.`;
    }

    WD.wikiInfo = await processWikiInfoFile(path.join(dataPath, WIKI_INFO_FILE));
    if (WD.wikiInfo.error) {
        console.log(`\x1b[31;1m${WD.wikiInfo.error}\x1b[0m`);
        return;
    }

    // Update languages o8ject with the wiki-specified default language!
    // This will make page files for that language 8e gener8ted at the root
    // directory, instead of the language-specific su8directory.
    if (WD.wikiInfo.defaultLanguage) {
        if (Object.keys(languages).includes(WD.wikiInfo.defaultLanguage)) {
            languages.default = languages[WD.wikiInfo.defaultLanguage];
        } else {
            logError`Wiki info file specified default language is ${WD.wikiInfo.defaultLanguage}, but no such language file exists!`;
            if (langPath) {
                logError`Check if an appropriate file exists in ${langPath}?`;
            } else {
                logError`Be sure to specify ${'--lang'} or ${'HSMUSIC_LANG'} with the path to language files.`;
            }
            return;
        }
    } else {
        languages.default = defaultStrings;
    }

    WD.homepageInfo = await processHomepageInfoFile(path.join(dataPath, HOMEPAGE_INFO_FILE));

    if (WD.homepageInfo.error) {
        console.log(`\x1b[31;1m${WD.homepageInfo.error}\x1b[0m`);
        return;
    }

    {
        const errors = WD.homepageInfo.rows.filter(obj => obj.error);
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
    const albumDataFiles = await findFiles(path.join(dataPath, DATA_ALBUM_DIRECTORY));

    // Technically, we could do the data file reading and output writing at the
    // same time, 8ut that kinda makes the code messy, so I'm not 8othering
    // with it.
    WD.albumData = await progressPromiseAll(`Reading & processing album files.`, albumDataFiles.map(processAlbumDataFile));

    {
        const errors = WD.albumData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    sortByDate(WD.albumData);

    WD.artistData = await processArtistDataFile(path.join(dataPath, ARTIST_DATA_FILE));
    if (WD.artistData.error) {
        console.log(`\x1b[31;1m${WD.artistData.error}\x1b[0m`);
        return;
    }

    {
        const errors = WD.artistData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    WD.artistAliasData = WD.artistData.filter(x => x.alias);
    WD.artistData = WD.artistData.filter(x => !x.alias);

    WD.trackData = getAllTracks(WD.albumData);

    if (WD.wikiInfo.features.flashesAndGames) {
        WD.flashData = await processFlashDataFile(path.join(dataPath, FLASH_DATA_FILE));
        if (WD.flashData.error) {
            console.log(`\x1b[31;1m${WD.flashData.error}\x1b[0m`);
            return;
        }

        const errors = WD.flashData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    WD.flashActData = WD.flashData?.filter(x => x.act8r8k);
    WD.flashData = WD.flashData?.filter(x => !x.act8r8k);

    WD.tagData = await processTagDataFile(path.join(dataPath, TAG_DATA_FILE));
    if (WD.tagData.error) {
        console.log(`\x1b[31;1m${WD.tagData.error}\x1b[0m`);
        return;
    }

    {
        const errors = WD.tagData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    WD.tagData.sort(sortByName);

    WD.groupData = await processGroupDataFile(path.join(dataPath, GROUP_DATA_FILE));
    if (WD.groupData.error) {
        console.log(`\x1b[31;1m${WD.groupData.error}\x1b[0m`);
        return;
    }

    {
        const errors = WD.groupData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    WD.groupCategoryData = WD.groupData.filter(x => x.isCategory);
    WD.groupData = WD.groupData.filter(x => x.isGroup);

    WD.staticPageData = await processStaticPageDataFile(path.join(dataPath, STATIC_PAGE_DATA_FILE));
    if (WD.staticPageData.error) {
        console.log(`\x1b[31;1m${WD.staticPageData.error}\x1b[0m`);
        return;
    }

    {
        const errors = WD.staticPageData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }
    }

    if (WD.wikiInfo.features.news) {
        WD.newsData = await processNewsDataFile(path.join(dataPath, NEWS_DATA_FILE));
        if (WD.newsData.error) {
            console.log(`\x1b[31;1m${WD.newsData.error}\x1b[0m`);
            return;
        }

        const errors = WD.newsData.filter(obj => obj.error);
        if (errors.length) {
            for (const error of errors) {
                console.log(`\x1b[31;1m${error.error}\x1b[0m`);
            }
            return;
        }

        sortByDate(WD.newsData);
        WD.newsData.reverse();
    }

    {
        const tagNames = new Set([...WD.trackData, ...WD.albumData].flatMap(thing => thing.artTags));

        for (let { name, isCW } of WD.tagData) {
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

    WD.justEverythingMan = sortByDate([...WD.albumData, ...WD.trackData, ...(WD.flashData || [])]);
    WD.justEverythingSortedByArtDateMan = sortByArtDate(WD.justEverythingMan.slice());
    // console.log(JSON.stringify(justEverythingSortedByArtDateMan.map(toAnythingMan), null, 2));

    const artistNames = Array.from(new Set([
        ...WD.artistData.filter(artist => !artist.alias).map(artist => artist.name),
        ...[
            ...WD.albumData.flatMap(album => [
                ...album.artists || [],
                ...album.coverArtists || [],
                ...album.wallpaperArtists || [],
                ...album.tracks.flatMap(track => [
                    ...track.artists,
                    ...track.coverArtists || [],
                    ...track.contributors || []
                ])
            ]),
            ...(WD.flashData?.flatMap(flash => [
                ...flash.contributors || []
            ]) || [])
        ].map(contribution => contribution.who)
    ]));

    artistNames.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);

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
            const where = WD.justEverythingMan.filter(thing => [
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
            const entry = [...WD.artistData, ...WD.artistAliasData].find(entry => entry.name === name || entry.name.toLowerCase() === name.toLowerCase());
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
        }
    }

    {
        const directories = [];
        for (const { directory, name } of WD.albumData) {
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
        for (const { directory, album } of WD.trackData) {
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
        for (const { references, name, album } of WD.trackData) {
            for (const ref of references) {
                if (!find.track(ref, {wikiData})) {
                    logWarn`Track not found "${ref}" in ${name} (${album.name})`;
                }
            }
        }
    }

    WD.contributionData = Array.from(new Set([
        ...WD.trackData.flatMap(track => [...track.artists || [], ...track.contributors || [], ...track.coverArtists || []]),
        ...WD.albumData.flatMap(album => [...album.artists || [], ...album.coverArtists || [], ...album.wallpaperArtists || [], ...album.bannerArtists || []]),
        ...(WD.flashData?.flatMap(flash => [...flash.contributors || []]) || [])
    ]));

    // Now that we have all the data, resolve references all 8efore actually
    // gener8ting any of the pages, 8ecause page gener8tion is going to involve
    // accessing these references a lot, and there's no reason to resolve them
    // more than once. (We 8uild a few additional links that can't 8e cre8ted
    // at initial data processing time here too.)

    const filterNullArray = (parent, key) => {
        for (const obj of parent) {
            const array = obj[key];
            for (let i = 0; i < array.length; i++) {
                if (!array[i]) {
                    const prev = array[i - 1] && array[i - 1].name;
                    const next = array[i + 1] && array[i + 1].name;
                    logWarn`Unexpected null in ${obj.name} (${obj.what}) (array key ${key} - prev: ${prev}, next: ${next})`;
                }
            }
            array.splice(0, array.length, ...array.filter(Boolean));
        }
    };

    const filterNullValue = (parent, key) => {
        parent.splice(0, parent.length, ...parent.filter(obj => {
            if (!obj[key]) {
                logWarn`Unexpected null in ${obj.name} (value key ${key})`;
                return false;
            }
            return true;
        }));
    };

    WD.trackData.forEach(track => mapInPlace(track.references, r => find.track(r, {wikiData})));
    WD.trackData.forEach(track => track.aka = find.track(track.aka, {wikiData}));
    WD.trackData.forEach(track => mapInPlace(track.artTags, t => find.tag(t, {wikiData})));
    WD.albumData.forEach(album => mapInPlace(album.groups, g => find.group(g, {wikiData})));
    WD.albumData.forEach(album => mapInPlace(album.artTags, t => find.tag(t, {wikiData})));
    WD.artistAliasData.forEach(artist => artist.alias = find.artist(artist.alias, {wikiData}));
    WD.contributionData.forEach(contrib => contrib.who = find.artist(contrib.who, {wikiData}));

    filterNullArray(WD.trackData, 'references');
    filterNullArray(WD.trackData, 'artTags');
    filterNullArray(WD.albumData, 'groups');
    filterNullArray(WD.albumData, 'artTags');
    filterNullValue(WD.artistAliasData, 'alias');
    filterNullValue(WD.contributionData, 'who');

    WD.trackData.forEach(track1 => track1.referencedBy = WD.trackData.filter(track2 => track2.references.includes(track1)));
    WD.groupData.forEach(group => group.albums = WD.albumData.filter(album => album.groups.includes(group)));
    WD.tagData.forEach(tag => tag.things = sortByArtDate([...WD.albumData, ...WD.trackData]).filter(thing => thing.artTags.includes(tag)));

    WD.groupData.forEach(group => group.category = WD.groupCategoryData.find(x => x.name === group.category));
    WD.groupCategoryData.forEach(category => category.groups = WD.groupData.filter(x => x.category === category));

    WD.trackData.forEach(track => track.otherReleases = [
        track.aka,
        ...WD.trackData.filter(({ aka }) => aka === track || (track.aka && aka === track.aka)),
    ].filter(x => x && x !== track));

    if (WD.wikiInfo.features.flashesAndGames) {
        WD.flashData.forEach(flash => mapInPlace(flash.tracks, t => find.track(t, {wikiData})));
        WD.flashData.forEach(flash => flash.act = WD.flashActData.find(act => act.name === flash.act));
        WD.flashActData.forEach(act => act.flashes = WD.flashData.filter(flash => flash.act === act));

        filterNullArray(WD.flashData, 'tracks');

        WD.trackData.forEach(track => track.flashes = WD.flashData.filter(flash => flash.tracks.includes(track)));
    }

    WD.artistData.forEach(artist => {
        const filterProp = (array, prop) => array.filter(thing => thing[prop]?.some(({ who }) => who === artist));
        const filterCommentary = array => array.filter(thing => thing.commentary && thing.commentary.replace(/<\/?b>/g, '').includes('<i>' + artist.name + ':</i>'));
        artist.tracks = {
            asArtist: filterProp(WD.trackData, 'artists'),
            asCommentator: filterCommentary(WD.trackData),
            asContributor: filterProp(WD.trackData, 'contributors'),
            asCoverArtist: filterProp(WD.trackData, 'coverArtists'),
            asAny: WD.trackData.filter(track => (
                [...track.artists, ...track.contributors, ...track.coverArtists || []].some(({ who }) => who === artist)
            ))
        };
        artist.albums = {
            asArtist: filterProp(WD.albumData, 'artists'),
            asCommentator: filterCommentary(WD.albumData),
            asCoverArtist: filterProp(WD.albumData, 'coverArtists'),
            asWallpaperArtist: filterProp(WD.albumData, 'wallpaperArtists'),
            asBannerArtist: filterProp(WD.albumData, 'bannerArtists')
        };
        if (WD.wikiInfo.features.flashesAndGames) {
            artist.flashes = {
                asContributor: filterProp(WD.flashData, 'contributors')
            };
        }
    });

    WD.officialAlbumData = WD.albumData.filter(album => album.groups.some(group => group.directory === OFFICIAL_GROUP_DIRECTORY));
    WD.fandomAlbumData = WD.albumData.filter(album => album.groups.every(group => group.directory !== OFFICIAL_GROUP_DIRECTORY));

    // Makes writing a little nicer on CPU theoretically, 8ut also costs in
    // performance right now 'cuz it'll w8 for file writes to 8e completed
    // 8efore moving on to more data processing. So, defaults to zero, which
    // disa8les the queue feature altogether.
    queueSize = +(miscOptions['queue-size'] ?? 0);

    const buildDictionary = pageSpecs;

    // NOT for ena8ling or disa8ling specific features of the site!
    // This is only in charge of what general groups of files to 8uild.
    // They're here to make development quicker when you're only working
    // on some particular area(s) of the site rather than making changes
    // across all of them.
    const writeFlags = await parseOptions(process.argv.slice(2), {
        all: {type: 'flag'}, // Defaults to true if none 8elow specified.

        // Kinda a hack t8h!
        ...Object.fromEntries(Object.keys(buildDictionary)
            .map(key => [key, {type: 'flag'}])),

        [parseOptions.handleUnknown]: () => {}
    });

    const writeAll = !Object.keys(writeFlags).length || writeFlags.all;

    logInfo`Writing site pages: ${writeAll ? 'all' : Object.keys(writeFlags).join(', ')}`;

    await writeSymlinks();
    await writeSharedFilesAndPages({strings: defaultStrings, wikiData});

    const buildSteps = (writeAll
        ? Object.entries(buildDictionary)
        : (Object.entries(buildDictionary)
            .filter(([ flag ]) => writeFlags[flag])));

    let writes;
    {
        let error = false;

        const buildStepsWithTargets = buildSteps.map(([ flag, pageSpec ]) => {
            // Condition not met: skip this build step altogether.
            if (pageSpec.condition && !pageSpec.condition({wikiData})) {
                return null;
            }

            // May still call writeTargetless if present.
            if (!pageSpec.targets) {
                return {flag, pageSpec, targets: []};
            }

            if (!pageSpec.write) {
                logError`${flag + '.targets'} is specified, but ${flag + '.write'} is missing!`;
                error = true;
                return null;
            }

            const targets = pageSpec.targets({wikiData});
            return {flag, pageSpec, targets};
        }).filter(Boolean);

        if (error) {
            return;
        }

        const validateWrites = (writes, fnName) => {
            // Do a quick valid8tion! If one of the writeThingPages functions go
            // wrong, this will stall out early and tell us which did.

            if (!Array.isArray(writes)) {
                logError`${fnName} didn't return an array!`;
                error = true;
                return false;
            }

            if (!(
                writes.every(obj => typeof obj === 'object') &&
                writes.every(obj => {
                    const result = validateWriteObject(obj);
                    if (result.error) {
                        logError`Validating write object failed: ${result.error}`;
                        return false;
                    } else {
                        return true;
                    }
                })
            )) {
                logError`${fnName} returned invalid entries!`;
                error = true;
                return false;
            }

            return true;
        };

        writes = buildStepsWithTargets.flatMap(({ flag, pageSpec, targets }) => {
            const writes = targets.flatMap(target =>
                pageSpec.write(target, {wikiData})?.slice() || []);

            if (!validateWrites(writes, flag + '.write')) {
                return [];
            }

            if (pageSpec.writeTargetless) {
                const writes2 = pageSpec.writeTargetless({wikiData});

                if (!validateWrites(writes2, flag + '.writeTargetless')) {
                    return [];
                }

                writes.push(...writes2);
            }

            return writes;
        });

        if (error) {
            return;
        }
    }

    const pageWrites = writes.filter(({ type }) => type === 'page');
    const dataWrites = writes.filter(({ type }) => type === 'data');
    const redirectWrites = writes.filter(({ type }) => type === 'redirect');

    if (writes.length) {
        logInfo`Total of ${writes.length} writes returned. (${pageWrites.length} page, ${dataWrites.length} data, ${redirectWrites.length} redirect)`;
    } else {
        logWarn`No writes returned at all, so exiting early. This is probably a bug!`;
        return;
    }

    await progressPromiseAll(`Writing data files shared across languages.`, queue(
        dataWrites.map(({path, data}) => () => {
            const bound = {};

            bound.serializeLink = bindOpts(serializeLink, {});

            bound.serializeContribs = bindOpts(serializeContribs, {});

            bound.serializeImagePaths = bindOpts(serializeImagePaths, {
                thumb
            });

            bound.serializeCover = bindOpts(serializeCover, {
                [bindOpts.bindIndex]: 2,
                serializeImagePaths: bound.serializeImagePaths,
                urls
            });

            bound.serializeGroupsForAlbum = bindOpts(serializeGroupsForAlbum, {
                serializeLink
            });

            bound.serializeGroupsForTrack = bindOpts(serializeGroupsForTrack, {
                serializeLink
            });

            // TODO: This only supports one <>-style argument.
            return writeData(path[0], path[1], data({
                ...bound
            }));
        }),
        queueSize
    ));

    const perLanguageFn = async ({strings, ...opts}, i, entries) => {
        console.log(`\x1b[34;1m${
            (`[${i + 1}/${entries.length}] ${strings.code} (-> /${opts.baseDirectory}) `
                .padEnd(60, '-'))
        }\x1b[0m`);

        await progressPromiseAll(`Writing ${strings.code}`, queue([
            ...pageWrites.map(({type, ...props}) => () => {
                const { path, page } = props;
                const { baseDirectory } = opts;

                // TODO: This only supports one <>-style argument.
                const pageSubKey = path[0];
                const directory = path[1];

                const paths = writePage.paths(baseDirectory, 'localized.' + pageSubKey, directory);
                const to = writePage.to({baseDirectory, pageSubKey, paths});

                // TODO: Is there some nicer way to define these,
                // may8e without totally re-8inding everything for
                // each page?
                const bound = {};

                bound.link = withEntries(unbound_link, entries => entries
                    .map(([ key, fn ]) => [key, bindOpts(fn, {to})]));

                bound.linkAnythingMan = bindOpts(linkAnythingMan, {
                    link: bound.link,
                    wikiData
                });

                bound.parseAttributes = bindOpts(parseAttributes, {
                    to
                });

                bound.transformInline = bindOpts(transformInline, {
                    link: bound.link,
                    replacerSpec,
                    strings,
                    to,
                    wikiData
                });

                bound.transformMultiline = bindOpts(transformMultiline, {
                    transformInline: bound.transformInline,
                    parseAttributes: bound.parseAttributes
                });

                bound.transformLyrics = bindOpts(transformLyrics, {
                    transformInline: bound.transformInline,
                    transformMultiline: bound.transformMultiline
                });

                bound.iconifyURL = bindOpts(iconifyURL, {
                    strings,
                    to
                });

                bound.fancifyURL = bindOpts(fancifyURL, {
                    strings
                });

                bound.fancifyFlashURL = bindOpts(fancifyFlashURL, {
                    [bindOpts.bindIndex]: 2,
                    strings
                });

                bound.getLinkThemeString = getLinkThemeString;

                bound.getThemeString = getThemeString;

                bound.getArtistString = bindOpts(getArtistString, {
                    iconifyURL: bound.iconifyURL,
                    link: bound.link,
                    strings
                });

                bound.getAlbumCover = bindOpts(getAlbumCover, {
                    to
                });

                bound.getTrackCover = bindOpts(getTrackCover, {
                    to
                });

                bound.getFlashCover = bindOpts(getFlashCover, {
                    to
                });

                bound.generateChronologyLinks = bindOpts(generateChronologyLinks, {
                    link: bound.link,
                    linkAnythingMan: bound.linkAnythingMan,
                    strings,
                    wikiData
                });

                bound.generateCoverLink = bindOpts(generateCoverLink, {
                    [bindOpts.bindIndex]: 0,
                    img,
                    link: bound.link,
                    strings,
                    to,
                    wikiData
                });

                bound.generateInfoGalleryLinks = bindOpts(generateInfoGalleryLinks, {
                    [bindOpts.bindIndex]: 2,
                    link: bound.link,
                    strings
                });

                bound.generatePreviousNextLinks = bindOpts(generatePreviousNextLinks, {
                    link: bound.link,
                    strings
                });

                bound.getGridHTML = bindOpts(getGridHTML, {
                    [bindOpts.bindIndex]: 0,
                    img,
                    strings
                });

                bound.getAlbumGridHTML = bindOpts(getAlbumGridHTML, {
                    [bindOpts.bindIndex]: 0,
                    getAlbumCover: bound.getAlbumCover,
                    getGridHTML: bound.getGridHTML,
                    link: bound.link,
                    strings
                });

                bound.getFlashGridHTML = bindOpts(getFlashGridHTML, {
                    [bindOpts.bindIndex]: 0,
                    getFlashCover: bound.getFlashCover,
                    getGridHTML: bound.getGridHTML,
                    link: bound.link
                });

                bound.getRevealStringFromTags = bindOpts(getRevealStringFromTags, {
                    strings
                });

                bound.getRevealStringFromWarnings = bindOpts(getRevealStringFromWarnings, {
                    strings
                });

                bound.getAlbumStylesheet = bindOpts(getAlbumStylesheet, {
                    to
                });

                const pageFn = () => page({
                    ...bound,
                    strings,
                    to
                });

                const content = writePage.html(pageFn, {
                    paths,
                    strings,
                    to,
                    transformMultiline: bound.transformMultiline,
                    wikiData
                });

                return writePage.write(content, {paths});
            }),
            ...redirectWrites.map(({fromPath, toPath, title: titleFn}) => () => {
                const { baseDirectory } = opts;

                const title = titleFn({
                    strings
                });

                // TODO: This only supports one <>-style argument.
                const fromPaths = writePage.paths(baseDirectory, 'localized.' + fromPath[0], fromPath[1]);
                const to = writePage.to({baseDirectory, pageSubKey: fromPath[0], paths: fromPaths});

                const target = to('localized.' + toPath[0], ...toPath.slice(1));
                const content = generateRedirectPage(title, target, {strings});
                return writePage.write(content, {paths: fromPaths});
            })
        ], queueSize));
    };

    await wrapLanguages(perLanguageFn, {
        writeOneLanguage,
        wikiData
    });

    decorateTime.displayTime();

    // The single most important step.
    logInfo`Written!`;
}

main().catch(error => console.error(error));
