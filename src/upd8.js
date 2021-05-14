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

import find from './util/find.js';
import genThumbs from './gen-thumbs.js';
import * as html from './util/html.js';
import link from './util/link.js';

import {
    decorateTime,
    logWarn,
    logInfo,
    logError,
    parseOptions,
    progressPromiseAll
} from './util/cli.js';

import {
    getLinkThemeString,
    getThemeString
} from './util/colors.js';

import {
    genStrings,
    count,
    list
} from './util/strings.js';

import {
    chunkByConditions,
    chunkByProperties,
    getAllTracks,
    getArtistCommentary,
    getArtistNumContributions,
    getKebabCase,
    sortByArtDate,
    sortByDate,
    sortByName
} from './util/wiki-data.js';

import {
    call,
    escapeRegex,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CACHEBUST = 6;

const WIKI_INFO_FILE = 'wiki-info.txt';
const HOMEPAGE_INFO_FILE = 'homepage.txt';
const ARTIST_DATA_FILE = 'artists.txt';
const FLASH_DATA_FILE = 'flashes.txt';
const NEWS_DATA_FILE = 'news.txt';
const TAG_DATA_FILE = 'tags.txt';
const GROUP_DATA_FILE = 'groups.txt';
const STATIC_PAGE_DATA_FILE = 'static-pages.txt';
const DEFAULT_STRINGS_FILE = 'strings-default.json';

const UNRELEASED_TRACKS_DIRECTORY = 'unreleased-tracks';
const OFFICIAL_GROUP_DIRECTORY = 'official';
const FANDOM_GROUP_DIRECTORY = 'fandom';

// Code that's common 8etween the 8uild code (i.e. upd8.js) and gener8ted
// site code should 8e put here. Which, uh, ~~only really means this one
// file~~ is now a variety of useful utilities!
//
// Rather than hard code it, anything in this directory can 8e shared across
// 8oth ends of the code8ase.
// (This gets symlinked into the --data directory.)
const UTILITY_DIRECTORY = 'util';

// Code that's used only in the static site! CSS, cilent JS, etc.
// (This gets symlinked into the --data directory.)
const STATIC_DIRECTORY = 'static';

// Su8directory under provided --data directory for al8um files, which are
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

const urlSpec = {
    data: {
        prefix: 'data/',

        paths: {
            root: '',
            path: '<>',

            album: 'album/<>',
            artist: 'artist/<>',
            track: 'track/<>'
        }
    },

    localized: {
        // TODO: Implement this.
        // prefix: '_languageCode',

        paths: {
            root: '',
            path: '<>',

            home: '',

            album: 'album/<>/',
            albumCommentary: 'commentary/album/<>/',

            artist: 'artist/<>/',
            artistGallery: 'artist/<>/gallery/',

            commentaryIndex: 'commentary/',

            flashIndex: 'flash/',
            flash: 'flash/<>/',

            groupInfo: 'group/<>/',
            groupGallery: 'group/<>/gallery/',

            listingIndex: 'list/',
            listing: 'list/<>/',

            newsIndex: 'news/',
            newsEntry: 'news/<>/',

            staticPage: '<>/',
            tag: 'tag/<>/',
            track: 'track/<>/'
        }
    },

    shared: {
        paths: {
            root: '',
            path: '<>',

            utilityRoot: 'util',
            staticRoot: 'static',

            utilityFile: 'util/<>',
            staticFile: 'static/<>'
        }
    },

    media: {
        prefix: 'media/',

        paths: {
            root: '',
            path: '<>',

            albumCover: 'album-art/<>/cover.jpg',
            albumWallpaper: 'album-art/<>/bg.jpg',
            albumBanner: 'album-art/<>/banner.jpg',
            trackCover: 'album-art/<>/<>.jpg',
            artistAvatar: 'artist-avatar/<>.jpg',
            flashArt: 'flash-art/<>.jpg'
        }
    }
};

// This gets automatically switched in place when working from a baseDirectory,
// so it should never be referenced manually.
urlSpec.localizedWithBaseDirectory = {
    paths: withEntries(
        urlSpec.localized.paths,
        entries => entries.map(([key, path]) => [key, '<>/' + path])
    )
};

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

function* getSections(lines) {
    // ::::)
    const isSeparatorLine = line => /^-{8,}$/.test(line);
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

{
    let error = false;
    for (const [key, {link: linkKey, find: findKey, value, html}] of Object.entries(replacerSpec)) {
        if (!html && !link[linkKey]) {
            logError`The replacer spec ${key} has invalid link key ${linkKey}! Specify it in link specs or fix typo.`;
            error = true;
        }
        if (findKey && !find[findKey]) {
            logError`The replacer spec ${key} has invalid find key ${findKey}! Specify it in find specs or fix typo.`;
            error = true;
        }
    }
    if (error) process.exit();

    // Syntax literals.
    const tagBeginning = '[[';
    const tagEnding = ']]';
    const tagReplacerValue = ':';
    const tagHash = '#';
    const tagArgument = '*';
    const tagArgumentValue = '=';
    const tagLabel = '|';

    const noPrecedingWhitespace = '(?<!\\s)';

    const R_tagBeginning =
        escapeRegex(tagBeginning);

    const R_tagEnding =
        escapeRegex(tagEnding);

    const R_tagReplacerValue =
        noPrecedingWhitespace +
        escapeRegex(tagReplacerValue);

    const R_tagHash =
        noPrecedingWhitespace +
        escapeRegex(tagHash);

    const R_tagArgument =
        escapeRegex(tagArgument);

    const R_tagArgumentValue =
        escapeRegex(tagArgumentValue);

    const R_tagLabel =
        escapeRegex(tagLabel);

    const regexpCache = {};

    const makeError = (i, message) => ({i, type: 'error', data: {message}});
    const endOfInput = (i, comment) => makeError(i, `Unexpected end of input (${comment}).`);

    // These are 8asically stored on the glo8al scope, which might seem odd
    // for a recursive function, 8ut the values are only ever used immediately
    // after they're set.
    let stopped,
        stop_iMatch,
        stop_iParse,
        stop_literal;

    const parseOneTextNode = function(input, i, stopAt) {
        return parseNodes(input, i, stopAt, true)[0];
    };

    const parseNodes = function(input, i, stopAt, textOnly) {
        let nodes = [];
        let escapeNext = false;
        let string = '';
        let iString = 0;

        stopped = false;

        const pushTextNode = (isLast) => {
            string = input.slice(iString, i);

            // If this is the last text node 8efore stopping (at a stopAt match
            // or the end of the input), trim off whitespace at the end.
            if (isLast) {
                string = string.trimEnd();
            }

            if (string.length) {
                nodes.push({i: iString, iEnd: i, type: 'text', data: string});
                string = '';
            }
        };

        const literalsToMatch = stopAt ? stopAt.concat([R_tagBeginning]) : [R_tagBeginning];

        // The 8ackslash stuff here is to only match an even (or zero) num8er
        // of sequential 'slashes. Even amounts always cancel out! Odd amounts
        // don't, which would mean the following literal is 8eing escaped and
        // should 8e counted only as part of the current string/text.
        //
        // Inspired 8y this: https://stackoverflow.com/a/41470813
        const regexpSource = `(?<!\\\\)(?:\\\\{2})*(${literalsToMatch.join('|')})`;

        // There are 8asically only a few regular expressions we'll ever use,
        // 8ut it's a pain to hard-code them all, so we dynamically gener8te
        // and cache them for reuse instead.
        let regexp;
        if (regexpCache.hasOwnProperty(regexpSource)) {
            regexp = regexpCache[regexpSource];
        } else {
            regexp = new RegExp(regexpSource);
            regexpCache[regexpSource] = regexp;
        }

        // Skip whitespace at the start of parsing. This is run every time
        // parseNodes is called (and thus parseOneTextNode too), so spaces
        // at the start of syntax elements will always 8e skipped. We don't
        // skip whitespace that shows up inside content (i.e. once we start
        // parsing below), though!
        const whitespaceOffset = input.slice(i).search(/[^\s]/);

        // If the string is all whitespace, that's just zero content, so
        // return the empty nodes array.
        if (whitespaceOffset === -1) {
            return nodes;
        }

        i += whitespaceOffset;

        while (i < input.length) {
            const match = input.slice(i).match(regexp);

            if (!match) {
                iString = i;
                i = input.length;
                pushTextNode(true);
                break;
            }

            const closestMatch = match[0];
            const closestMatchIndex = i + match.index;

            if (textOnly && closestMatch === tagBeginning)
                throw makeError(i, `Unexpected [[tag]] - expected only text here.`);

            const stopHere = (closestMatch !== tagBeginning);

            iString = i;
            i = closestMatchIndex;
            pushTextNode(stopHere);

            i += closestMatch.length;

            if (stopHere) {
                stopped = true;
                stop_iMatch = closestMatchIndex;
                stop_iParse = i;
                stop_literal = closestMatch;
                break;
            }

            if (closestMatch === tagBeginning) {
                const iTag = closestMatchIndex;

                let N;

                // Replacer key (or value)

                N = parseOneTextNode(input, i, [R_tagReplacerValue, R_tagHash, R_tagArgument, R_tagLabel, R_tagEnding]);

                if (!stopped) throw endOfInput(i, `reading replacer key`);

                if (!N) {
                    switch (stop_literal) {
                        case tagReplacerValue:
                        case tagArgument:
                            throw makeError(i, `Expected text (replacer key).`);
                        case tagLabel:
                        case tagHash:
                        case tagEnding:
                            throw makeError(i, `Expected text (replacer key/value).`);
                    }
                }

                const replacerFirst = N;
                i = stop_iParse;

                // Replacer value (if explicit)

                let replacerSecond;

                if (stop_literal === tagReplacerValue) {
                    N = parseNodes(input, i, [R_tagHash, R_tagArgument, R_tagLabel, R_tagEnding]);

                    if (!stopped) throw endOfInput(i, `reading replacer value`);
                    if (!N.length) throw makeError(i, `Expected content (replacer value).`);

                    replacerSecond = N;
                    i = stop_iParse
                }

                // Assign first & second to replacer key/value

                let replacerKey,
                    replacerValue;

                // Value is an array of nodes, 8ut key is just one (or null).
                // So if we use replacerFirst as the value, we need to stick
                // it in an array (on its own).
                if (replacerSecond) {
                    replacerKey = replacerFirst;
                    replacerValue = replacerSecond;
                } else {
                    replacerKey = null;
                    replacerValue = [replacerFirst];
                }

                // Hash

                let hash;

                if (stop_literal === tagHash) {
                    N = parseNodes(input, i, [R_tagArgument, R_tagLabel, R_tagEnding]);

                    if (!stopped) throw endOfInput(i, `reading hash`);

                    if (!N)
                        throw makeError(i, `Expected content (hash).`);

                    hash = N;
                    i = stop_iParse;
                }

                // Arguments

                const args = [];

                while (stop_literal === tagArgument) {
                    N = parseOneTextNode(input, i, [R_tagArgumentValue, R_tagArgument, R_tagLabel, R_tagEnding]);

                    if (!stopped) throw endOfInput(i, `reading argument key`);

                    if (stop_literal !== tagArgumentValue)
                        throw makeError(i, `Expected ${tagArgumentValue.literal} (tag argument).`);

                    if (!N)
                        throw makeError(i, `Expected text (argument key).`);

                    const key = N;
                    i = stop_iParse;

                    N = parseNodes(input, i, [R_tagArgument, R_tagLabel, R_tagEnding]);

                    if (!stopped) throw endOfInput(i, `reading argument value`);
                    if (!N.length) throw makeError(i, `Expected content (argument value).`);

                    const value = N;
                    i = stop_iParse;

                    args.push({key, value});
                }

                let label;

                if (stop_literal === tagLabel) {
                    N = parseOneTextNode(input, i, [R_tagEnding]);

                    if (!stopped) throw endOfInput(i, `reading label`);
                    if (!N) throw makeError(i, `Expected text (label).`);

                    label = N;
                    i = stop_iParse;
                }

                nodes.push({i: iTag, iEnd: i, type: 'tag', data: {replacerKey, replacerValue, hash, args, label}});

                continue;
            }
        }

        return nodes;
    };

    transformInline.parse = function(input) {
        try {
            return parseNodes(input, 0);
        } catch (errorNode) {
            if (errorNode.type !== 'error') {
                throw errorNode;
            }

            const { i, data: { message } } = errorNode;

            let lineStart = input.slice(0, i).lastIndexOf('\n');
            if (lineStart >= 0) {
                lineStart += 1;
            } else {
                lineStart = 0;
            }

            let lineEnd = input.slice(i).indexOf('\n');
            if (lineEnd >= 0) {
                lineEnd += i;
            } else {
                lineEnd = input.length;
            }

            const line = input.slice(lineStart, lineEnd);

            const cursor = i - lineStart;

            throw new SyntaxError(fixWS`
                Parse error (at pos ${i}): ${message}
                ${line}
                ${'-'.repeat(cursor) + '^'}
            `);
        }
    };
}

/*
{
    const show = input => process.stdout.write(`-- ${input}\n` + util.inspect(
        transformInline.parse(input),
        {
            depth: null,
            colors: true
        }
    ) + '\n\n');

    show(`[[album:are-you-lost|Cristata's new album]]`);
    show(`[[string:content.donate.patreonLine*link=[[external:https://www.patreon.com/qznebula|Patreon]]]]`);
}

{
    const test = input => {
        let n = 0;
        const s = 5;
        const start = Date.now();
        const end = start + s * 1000;
        while (Date.now() < end) {
            transformInline.parse(input);
            n++;
        }
        console.log(`Ran ${Math.round(n / s)} times/sec.`);
    }

    test(fixWS`
        [[string:content.donate.patreonLine*link=[[external:https://www.patreon.com/qznebula|Patreon]]]]
        Hello, world! Wow [[album:the-beans-zone]] is some cool stuff.
    `);
    process.exit();
}
*/

{
    const evaluateTag = function(node, opts) {
        const { input, strings, to, wikiData } = opts;

        const source = input.slice(node.i, node.iEnd);

        const replacerKey = node.data.replacerKey?.data || 'track';

        if (!replacerSpec[replacerKey]) {
            logWarn`The link ${source} has an invalid replacer key!`;
            return source;
        }

        const {
            find: findKey,
            link: linkKey,
            value: valueFn,
            html: htmlFn,
            transformName
        } = replacerSpec[replacerKey];

        const replacerValue = transformNodes(node.data.replacerValue, opts);

        const value = (
            valueFn ? valueFn(replacerValue) :
            findKey ? find[findKey](replacerValue, {wikiData}) :
            {
                directory: replacerValue,
                name: null
            });

        if (!value) {
            logWarn`The link ${source} does not match anything!`;
            return source;
        }

        const enteredLabel = node.data.label && transformNode(node.data.label, opts);

        const label = (enteredLabel
            || transformName && transformName(value.name, node, input)
            || value.name);

        if (!valueFn && !label) {
            logWarn`The link ${source} requires a label be entered!`;
            return source;
        }

        const hash = node.data.hash && transformNodes(node.data.hash, opts);

        const args = node.data.args && Object.fromEntries(node.data.args.map(
            ({ key, value }) => [
                transformNode(key, opts),
                transformNodes(value, opts)
            ]));

        const fn = (htmlFn
            ? htmlFn
            : strings.link[linkKey]);

        try {
            return fn(value, {text: label, hash, args, strings, to});
        } catch (error) {
            logError`The link ${source} failed to be processed: ${error}`;
            return source;
        }
    };

    const transformNode = function(node, opts) {
        if (!node) {
            throw new Error('Expected a node!');
        }

        if (Array.isArray(node)) {
            throw new Error('Got an array - use transformNodes here!');
        }

        switch (node.type) {
            case 'text':
                return node.data;
            case 'tag':
                return evaluateTag(node, opts);
            default:
                throw new Error(`Unknown node type ${node.type}`);
        }
    };

    const transformNodes = function(nodes, opts) {
        if (!nodes || !Array.isArray(nodes)) {
            throw new Error(`Expected an array of nodes! Got: ${nodes}`);
        }

        return nodes.map(node => transformNode(node, opts)).join('');
    };

    Object.assign(transformInline, {
        evaluateTag,
        transformNode,
        transformNodes
    });
}

function transformInline(input, {strings, to, wikiData}) {
    if (!strings) throw new Error('Expected strings');
    if (!to) throw new Error('Expected to');
    if (!wikiData) throw new Error('Expected wikiData');

    const nodes = transformInline.parse(input);
    return transformInline.transformNodes(nodes, {input, strings, to, wikiData});
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

function transformMultiline(text, {strings, to, wikiData}) {
    // Heck yes, HTML magics.

    if (!strings) throw new Error('Expected strings');
    if (!to) throw new Error('Expected to');
    if (!wikiData) throw new Error('Expected wikiData');

    text = transformInline(text.trim(), {strings, to, wikiData});

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
            thumb: 'medium',
            ...parseAttributes(attributes, {to})
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

function transformLyrics(text, {strings, to, wikiData}) {
    // Different from transformMultiline 'cuz it joins multiple lines together
    // with line 8reaks (<br>); transformMultiline treats each line as its own
    // complete paragraph (or list, etc).

    // If it looks like old data, then like, oh god.
    // Use the normal transformMultiline tool.
    if (text.includes('<br')) {
        return transformMultiline(text, {strings, to, wikiData});
    }

    text = transformInline(text.trim(), {strings, to, wikiData});

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
                startIndex: trackIndex,
                tracks: []
            };
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

    const contentLines = contents.split('\n');
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
    src = '',
    alt = '',
    thumb: thumbKey = '',
    reveal = '',
    id = '',
    class: className = '',
    width = '',
    height = '',
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

function serializeImagePaths(original) {
    return {
        original,
        medium: thumb.medium(original),
        small: thumb.small(original)
    };
}

function serializeLink(thing) {
    const ret = {};
    ret.name = thing.name;
    ret.directory = thing.directory;
    if (thing.color) ret.color = thing.color;
    return ret;
}

function serializeContribs(contribs) {
    return contribs.map(({ who, what }) => {
        const ret = {};
        ret.artist = serializeLink(who);
        if (what) ret.contribution = what;
        return ret;
    });
}

function serializeCover(thing, pathFunction) {
    const coverPath = pathFunction(thing, {
        to: urls.from('media.root').to
    });

    const { artTags } = thing;

    const cwTags = artTags.filter(tag => tag.isCW);
    const linkTags = artTags.filter(tag => !tag.isCW);

    return {
        paths: serializeImagePaths(coverPath),
        tags: linkTags.map(serializeLink),
        warnings: cwTags.map(tag => tag.name)
    };
}

function serializeGroupsForAlbum(album) {
    return album.groups.map(group => {
        const index = group.albums.indexOf(album);
        const next = group.albums[index + 1] || null;
        const previous = group.albums[index - 1] || null;
        return {group, index, next, previous};
    }).map(({group, index, next, previous}) => ({
        link: serializeLink(group),
        descriptionShort: group.descriptionShort,
        albumIndex: index,
        nextAlbum: next && serializeLink(next),
        previousAlbum: previous && serializeLink(previous),
        urls: group.urls
    }));
}

function serializeGroupsForTrack(track) {
    return track.album.groups.map(group => ({
        link: serializeLink(group),
        urls: group.urls,
    }));
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

    const expectedArgs = paths[specifiedKey].match(/<>/g).length;
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

async function writePage(pageSubKey, directory, pageFn, {baseDirectory, strings, wikiData}) {
    // Generally this function shouldn't 8e called directly - instead use the
    // shadowed version provided 8y wrapLanguages, which automatically provides
    // the appropriate baseDirectory and strings arguments. (The utility
    // functions attached to this function are generally useful, though!)

    const paths = writePage.paths(baseDirectory, 'localized.' + pageSubKey, directory);

    const to = (targetFullKey, ...args) => {
        const [ groupKey, subKey ] = targetFullKey.split('.')[0];
        let path = paths.subdirectoryPrefix
        // When linking to *outside* the localized area of the site, we need to
        // make sure the result is correctly relative to the 8ase directory.
        if (groupKey !== 'localized' && baseDirectory) {
            path += urls.from('localizedWithBaseDirectory.' + pageSubKey).to(targetFullKey, ...args);
        } else {
            // If we're linking inside the localized area (or there just is no
            // 8ase directory), the 8ase directory doesn't matter.
            path += urls.from('localized.' + pageSubKey).to(targetFullKey, ...args);
        }
        // console.log(pageSubKey, '->', targetFullKey, '=', path);
        return path;
    };

    const content = writePage.html(pageFn, {paths, strings, to, wikiData});
    await writePage.write(content, {paths});
}

writePage.html = (pageFn, {paths, strings, to, wikiData}) => {
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
    footer.content ??= (wikiInfo.footer ? transformMultiline(wikiInfo.footer, {strings, to, wikiData}) : '');

    const canonical = (wikiInfo.canonicalBase
        ? wikiInfo.canonicalBase + paths.pathname
        : '');

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
            {
                href: to('localized.home'),
                title: wikiInfo.shortName
            },
            {
                href: '',
                title
            }
        ];
    }

    const links = (nav.links || []).filter(Boolean);

    const navLinkParts = [];
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const prev = links[i - 1];
        const next = links[i + 1];
        const { html, href, title, divider = true } = link;
        let part = prev && divider ? '/ ' : '';
        if (typeof href === 'string') {
            part += `<a href="${href}" ${classes(i === links.length - 1 && 'current')}>${title}</a>`;
        } else if (html) {
            part += `<span>${html}</span>`;
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

    const bannerHTML = banner.position && banner.src && html.tag('div',
        {
            id: 'banner',
            class: banner.classes
        },
        html.tag('img', {
            src: banner.src,
            alt: banner.alt,
            width: banner.dimensions[0] || 1100,
            height: banner.dimensions[1] || 200
        })
    );

    const layoutHTML = [
        navHTML,
        banner.position === 'top' && bannerHTML,
        (sidebarLeftHTML || sidebarRightHTML) ? fixWS`
            <div ${classes('layout-columns', !collapseSidebars && 'vertical-when-thin')}>
                ${sidebarLeftHTML}
                ${mainHTML}
                ${sidebarRightHTML}
            </div>
        ` : mainHTML,
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
writePage.paths = (baseDirectory, fullKey, directory, {
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

function getGridHTML({
    strings,
    entries,
    srcFn,
    hrefFn,
    altFn = () => '',
    detailsFn = null,
    lazy = true
}) {
    return entries.map(({ large, item }, i) => fixWS`
        <a ${classes('grid-item', 'box', large && 'large-grid-item')} href="${hrefFn(item)}" style="${getLinkThemeString(item.color)}">
            ${img({
                src: srcFn(item),
                alt: altFn(item),
                thumb: 'small',
                lazy: (typeof lazy === 'number' ? i >= lazy : lazy),
                square: true,
                reveal: getRevealStringFromTags(item.artTags, {strings})
            })}
            <span>${item.name}</span>
            ${detailsFn && `<span>${detailsFn(item)}</span>`}
        </a>
    `).join('\n');
}

function getAlbumGridHTML({strings, to, details = false, ...props}) {
    return getGridHTML({
        strings,
        srcFn: album => getAlbumCover(album, {to}),
        hrefFn: album => to('localized.album', album.directory),
        detailsFn: details && (album => strings('misc.albumGridDetails', {
            tracks: strings.count.tracks(album.tracks.length, {unit: true}),
            time: strings.count.duration(getTotalDuration(album.tracks))
        })),
        ...props
    });
}

function getFlashGridHTML({strings, to, ...props}) {
    return getGridHTML({
        strings,
        srcFn: flash => to('media.flashArt', flash.directory),
        hrefFn: flash => to('localized.flash', flash.directory),
        ...props
    });
}

function getNewReleases(numReleases, {wikiData}) {
    const { albumData } = wikiData;

    const latestFirst = albumData.filter(album => album.isListedOnHomepage).reverse();
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

function getNewAdditions(numAlbums, {wikiData}) {
    const { albumData } = wikiData;

    // Sort al8ums, in descending order of priority, 8y...
    //
    // * D8te of addition to the wiki (descending).
    // * Major releases first.
    // * D8te of release (descending).
    //
    // Major releases go first to 8etter ensure they show up in the list (and
    // are usually at the start of the final output for a given d8 of release
    // too).
    const sortedAlbums = albumData.filter(album => album.isListedOnHomepage).sort((a, b) => {
        if (a.dateAdded > b.dateAdded) return -1;
        if (a.dateAdded < b.dateAdded) return 1;
        if (a.isMajorRelease && !b.isMajorRelease) return -1;
        if (!a.isMajorRelease && b.isMajorRelease) return 1;
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
    });

    // When multiple al8ums are added to the wiki at a time, we want to show
    // all of them 8efore pulling al8ums from the next (earlier) date. We also
    // want to show a diverse selection of al8ums - with limited space, we'd
    // rather not show only the latest al8ums, if those happen to all 8e
    // closely rel8ted!
    //
    // Specifically, we're concerned with avoiding too much overlap amongst
    // the primary (first/top-most) group. We do this 8y collecting every
    // primary group present amongst the al8ums for a given d8 into one
    // (ordered) array, initially sorted (inherently) 8y latest al8um from
    // the group. Then we cycle over the array, adding one al8um from each
    // group until all the al8ums from that release d8 have 8een added (or
    // we've met the total target num8er of al8ums). Once we've added all the
    // al8ums for a given group, it's struck from the array (so the groups
    // with the most additions on one d8 will have their oldest releases
    // collected more towards the end of the list).

    const albums = [];

    let i = 0;
    outerLoop: while (i < sortedAlbums.length) {
        // 8uild up a list of groups and their al8ums 8y order of decending
        // release, iter8ting until we're on a different d8. (We use a map for
        // indexing so we don't have to iter8te through the entire array each
        // time we access one of its entries. This is 8asically unnecessary
        // since this will never 8e an expensive enough task for that to
        // matter.... 8ut it's nicer code. BBBB) )
        const currentDate = sortedAlbums[i].dateAdded;
        const groupMap = new Map();
        const groupArray = [];
        for (let album; (album = sortedAlbums[i]) && +album.dateAdded === +currentDate; i++) {
            const primaryGroup = album.groups[0];
            if (groupMap.has(primaryGroup)) {
                groupMap.get(primaryGroup).push(album);
            } else {
                const entry = [album]
                groupMap.set(primaryGroup, entry);
                groupArray.push(entry);
            }
        }

        // Then cycle over that sorted array, adding one al8um from each to
        // the main array until we've run out or have met the target num8er
        // of al8ums.
        while (groupArray.length) {
            let j = 0;
            while (j < groupArray.length) {
                const entry = groupArray[j];
                const album = entry.shift();
                albums.push(album);


                // This is the only time we ever add anything to the main al8um
                // list, so it's also the only place we need to check if we've
                // met the target length.
                if (albums.length === numAlbums) {
                    // If we've met it, 8r8k out of the outer loop - we're done
                    // here!
                    break outerLoop;
                }

                if (entry.length) {
                    j++;
                } else {
                    groupArray.splice(j, 1);
                }
            }
        }
    }

    // Finally, do some quick mapping shenanigans to 8etter display the result
    // in a grid. (This should pro8a8ly 8e a separ8te, shared function, 8ut
    // whatevs.)
    return albums.map(album => ({large: album.isMajorRelease, item: album}));
}

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
        await symlink(path.resolve(directory), file);
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

function writeHomepage({wikiData}) {
    const { newsData, staticPageData, homepageInfo, wikiInfo } = wikiData;

    return ({strings, writePage}) => writePage('home', '', ({to}) => ({
        title: wikiInfo.name,

        meta: {
            description: wikiInfo.description
        },

        main: {
            classes: ['top-index'],
            content: fixWS`
                <h1>${wikiInfo.name}</h1>
                ${homepageInfo.rows.map((row, i) => fixWS`
                    <section class="row" style="${getLinkThemeString(row.color)}">
                        <h2>${row.name}</h2>
                        ${row.type === 'albums' && fixWS`
                            <div class="grid-listing">
                                ${getAlbumGridHTML({
                                    strings, to,
                                    entries: (
                                        row.group === 'new-releases' ? getNewReleases(row.groupCount, {wikiData}) :
                                        row.group === 'new-additions' ? getNewAdditions(row.groupCount, {wikiData}) :
                                        ((find.group(row.group, {wikiData})?.albums || [])
                                            .slice()
                                            .reverse()
                                            .slice(0, row.groupCount)
                                            .map(album => ({item: album})))
                                    ).concat(row.albums
                                        .map(album => find.album(album, {wikiData}))
                                        .map(album => ({item: album}))
                                    ),
                                    lazy: i > 0
                                })}
                                ${row.actions.length && fixWS`
                                    <div class="grid-actions">
                                        ${row.actions.map(action => transformInline(action, {strings, to, wikiData})
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
            content: (transformMultiline(homepageInfo.sidebar.replace('[[news]]', '__GENERATE_NEWS__'), {strings, to, wikiData})
                .replace('<p>__GENERATE_NEWS__</p>', wikiInfo.features.news ? fixWS`
                    <h1>${strings('homepage.news.title')}</h1>
                    ${newsData.slice(0, 3).map((entry, i) => fixWS`
                        <article ${classes('news-entry', i === 0 && 'first-news-entry')}>
                            <h2><time>${strings.count.date(entry.date)}</time> ${strings.link.newsEntry(entry, {to})}</h2>
                            ${transformMultiline(entry.bodyShort, {strings, to, wikiData})}
                            ${entry.bodyShort !== entry.body && strings.link.newsEntry(entry, {
                                to,
                                text: strings('homepage.news.entry.viewRest')
                            })}
                        </article>
                    `).join('\n')}
                ` : `<p><i>News requested in content description but this feature isn't enabled</i></p>`))
        },

        nav: {
            content: fixWS`
                <h2 class="dot-between-spans">
                    ${[
                        strings.link.home('', {text: wikiInfo.shortName, class: 'current', to}),
                        wikiInfo.features.listings &&
                        strings.link.listingIndex('', {text: strings('listingIndex.title'), to}),
                        wikiInfo.features.news &&
                        strings.link.newsIndex('', {text: strings('newsIndex.title'), to}),
                        wikiInfo.features.flashesAndGames &&
                        strings.link.flashIndex('', {text: strings('flashIndex.title'), to}),
                        ...staticPageData.filter(page => page.listed).map(page => strings.link.staticPage(page, {to}))
                    ].filter(Boolean).map(link => `<span>${link}</span>`).join('\n')}
                </h2>
            `
        }
    }));
}

function writeMiscellaneousPages({wikiData}) {
    return [
        writeHomepage({wikiData})
    ];
}

function writeNewsPages({wikiData}) {
    const { newsData, wikiInfo } = wikiData;

    if (!wikiInfo.features.news) {
        return;
    }

    return [
        writeNewsIndex({wikiData}),
        ...newsData.map(entry => writeNewsEntryPage(entry, {wikiData}))
    ];
}

function writeNewsIndex({wikiData}) {
    const { newsData } = wikiData;

    return ({strings, writePage}) => writePage('newsIndex', '', ({to}) => ({
        title: strings('newsIndex.title'),

        main: {
            content: fixWS`
                <div class="long-content news-index">
                    <h1>${strings('newsIndex.title')}</h1>
                    ${newsData.map(entry => fixWS`
                        <article id="${entry.directory}">
                            <h2><time>${strings.count.date(entry.date)}</time> ${strings.link.newsEntry(entry, {to})}</h2>
                            ${transformMultiline(entry.bodyShort, {strings, to, wikiData})}
                            ${entry.bodyShort !== entry.body && `<p>${strings.link.newsEntry(entry, {
                                to,
                                text: strings('newsIndex.entry.viewRest')
                            })}</p>`}
                        </article>
                    `).join('\n')}
                </div>
            `
        },

        nav: {simple: true}
    }));
}

function writeNewsEntryPage(entry, {wikiData}) {
    return ({strings, writePage}) => writePage('newsEntry', entry.directory, ({to}) => ({
        title: strings('newsEntryPage.title', {entry: entry.name}),

        main: {
            content: fixWS`
                <div class="long-content">
                    <h1>${strings('newsEntryPage.title', {entry: entry.name})}</h1>
                    <p>${strings('newsEntryPage.published', {date: strings.count.date(entry.date)})}</p>
                    ${transformMultiline(entry.body, {strings, to, wikiData})}
                </div>
            `
        },

        nav: generateNewsEntryNav(entry, {strings, to, wikiData})
    }));
}

function generateNewsEntryNav(entry, {strings, to, wikiData}) {
    const { wikiInfo, newsData } = wikiData;

    // The newsData list is sorted reverse chronologically (newest ones first),
    // so the way we find next/previous entries is flipped from normal.
    const previousNextLinks = generatePreviousNextLinks('localized.newsEntry', entry, newsData.slice().reverse(), {strings, to});

    return {
        links: [
            {
                href: to('localized.home'),
                title: wikiInfo.shortName
            },
            {
                href: to('localized.newsIndex'),
                title: strings('newsEntryPage.nav.news')
            },
            {
                html: strings('newsEntryPage.nav.entry', {
                    date: strings.count.date(entry.date),
                    entry: strings.link.newsEntry(entry, {class: 'current', to})
                })
            },
            previousNextLinks &&
            {
                divider: false,
                html: `(${previousNextLinks})`
            }
        ]
    };
}

function writeStaticPages({wikiData}) {
    return wikiData.staticPageData.map(staticPage => writeStaticPage(staticPage, {wikiData}));
}

function writeStaticPage(staticPage, {wikiData}) {
    return ({strings, writePage}) => writePage('staticPage', staticPage.directory, ({to}) => ({
        title: staticPage.name,
        stylesheet: staticPage.stylesheet,

        main: {
            content: fixWS`
                <div class="long-content">
                    <h1>${staticPage.name}</h1>
                    ${transformMultiline(staticPage.content, {strings, to, wikiData})}
                </div>
            `
        },

        nav: {simple: true}
    }));
}


function getRevealStringFromWarnings(warnings, {strings}) {
    return strings('misc.contentWarnings', {warnings}) + `<br><span class="reveal-interaction">${strings('misc.contentWarnings.reveal')}</span>`
}

function getRevealStringFromTags(tags, {strings}) {
    return tags && tags.some(tag => tag.isCW) && (
        getRevealStringFromWarnings(strings.list.unit(tags.filter(tag => tag.isCW).map(tag => tag.name)), {strings}));
}

function generateCoverLink({
    strings, to, wikiData,
    src,
    alt,
    tags = []
}) {
    const { wikiInfo } = wikiData;

    return fixWS`
        <div id="cover-art-container">
            ${img({
                src,
                alt,
                thumb: 'medium',
                id: 'cover-art',
                link: true,
                square: true,
                reveal: getRevealStringFromTags(tags, {strings})
            })}
            ${wikiInfo.features.artTagUI && tags.filter(tag => !tag.isCW).length && fixWS`
                <p class="tags">
                    ${strings('releaseInfo.artTags')}
                    ${(tags
                        .filter(tag => !tag.isCW)
                        .map(tag => strings.link.tag(tag, {to}))
                        .join(',\n'))}
                </p>
            `}
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

function writeAlbumPages({wikiData}) {
    return wikiData.albumData.map(album => writeAlbumPage(album, {wikiData}));
}

function writeAlbumPage(album, {wikiData}) {
    const { wikiInfo } = wikiData;

    const trackToListItem = (track, {strings, to}) => {
        const itemOpts = {
            duration: strings.count.duration(track.duration),
            track: strings.link.track(track, {to})
        };
        return `<li style="${getLinkThemeString(track.color)}">${
            (track.artists === album.artists
                ? strings('trackList.item.withDuration', itemOpts)
                : strings('trackList.item.withDuration.withArtists', {
                    ...itemOpts,
                    by: `<span class="by">${
                        strings('trackList.item.withArtists.by', {
                            artists: getArtistString(track.artists, {strings, to})
                        })
                    }</span>`
                }))
        }</li>`;
    };

    const commentaryEntries = [album, ...album.tracks].filter(x => x.commentary).length;
    const albumDuration = getTotalDuration(album.tracks);

    const listTag = getAlbumListTag(album);

    const data = {
        type: 'data',
        path: ['album', album.directory],
        data: () => ({
            name: album.name,
            directory: album.directory,
            dates: {
                released: album.date,
                trackArtAdded: album.trackArtDate,
                coverArtAdded: album.coverArtDate,
                addedToWiki: album.dateAdded
            },
            duration: albumDuration,
            color: album.color,
            cover: serializeCover(album, getAlbumCover),
            artists: serializeContribs(album.artists || []),
            coverArtists: serializeContribs(album.coverArtists || []),
            wallpaperArtists: serializeContribs(album.wallpaperArtists || []),
            bannerArtists: serializeContribs(album.bannerArtists || []),
            groups: serializeGroupsForAlbum(album),
            trackGroups: album.trackGroups?.map(trackGroup => ({
                name: trackGroup.name,
                color: trackGroup.color,
                tracks: trackGroup.tracks.map(track => track.directory)
            })),
            tracks: album.tracks.map(track => ({
                link: serializeLink(track),
                duration: track.duration
            }))
        })
    };

    const page = {type: 'page', path: ['album', album.directory], page: ({strings, to}) => ({
        title: strings('albumPage.title', {album: album.name}),
        stylesheet: getAlbumStylesheet(album, {to}),
        theme: getThemeString(album.color, [
            `--album-directory: ${album.directory}`
        ]),

        banner: album.bannerArtists && {
            dimensions: album.bannerDimensions,
            src: to('media.albumBanner', album.directory),
            alt: strings('misc.alt.albumBanner'),
            position: 'top'
        },

        main: {
            content: fixWS`
                ${generateCoverLink({
                    strings, to, wikiData,
                    src: to('media.albumCover', album.directory),
                    alt: strings('misc.alt.albumCover'),
                    tags: album.artTags
                })}
                <h1>${strings('albumPage.title', {album: album.name})}</h1>
                <p>
                    ${[
                        album.artists && strings('releaseInfo.by', {
                            artists: getArtistString(album.artists, {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })
                        }),
                        album.coverArtists && strings('releaseInfo.coverArtBy', {
                            artists: getArtistString(album.coverArtists, {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })
                        }),
                        album.wallpaperArtists && strings('releaseInfo.wallpaperArtBy', {
                            artists: getArtistString(album.wallpaperArtists, {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })
                        }),
                        album.bannerArtists && strings('releaseInfo.bannerArtBy', {
                            artists: getArtistString(album.bannerArtists, {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })
                        }),
                        strings('releaseInfo.released', {
                            date: strings.count.date(album.date)
                        }),
                        +album.coverArtDate !== +album.date && strings('releaseInfo.artReleased', {
                            date: strings.count.date(album.coverArtDate)
                        }),
                        strings('releaseInfo.duration', {
                            duration: strings.count.duration(albumDuration, {approximate: album.tracks.length > 1})
                        })
                    ].filter(Boolean).join('<br>\n')}
                </p>
                ${commentaryEntries && `<p>${
                    strings('releaseInfo.viewCommentary', {
                        link: `<a href="${to('localized.albumCommentary', album.directory)}">${
                            strings('releaseInfo.viewCommentary.link')
                        }</a>`
                    })
                }</p>`}
                ${album.urls.length && `<p>${
                    strings('releaseInfo.listenOn', {
                        links: strings.list.or(album.urls.map(url => fancifyURL(url, {album: true, strings})))
                    })
                }</p>`}
                ${album.trackGroups ? fixWS`
                    <dl class="album-group-list">
                        ${album.trackGroups.map(({ name, color, startIndex, tracks }) => fixWS`
                            <dt>${
                                strings('trackList.group', {
                                    duration: strings.count.duration(getTotalDuration(tracks), {approximate: tracks.length > 1}),
                                    group: name
                                })
                            }</dt>
                            <dd><${listTag === 'ol' ? `ol start="${startIndex + 1}"` : listTag}>
                                ${tracks.map(t => trackToListItem(t, {strings, to})).join('\n')}
                            </${listTag}></dd>
                        `).join('\n')}
                    </dl>
                ` : fixWS`
                    <${listTag}>
                        ${album.tracks.map(t => trackToListItem(t, {strings, to})).join('\n')}
                    </${listTag}>
                `}
                <p>
                    ${[
                        strings('releaseInfo.addedToWiki', {
                            date: strings.count.date(album.dateAdded)
                        })
                    ].filter(Boolean).join('<br>\n')}
                </p>
                ${album.commentary && fixWS`
                    <p>${strings('releaseInfo.artistCommentary')}</p>
                    <blockquote>
                        ${transformMultiline(album.commentary, {strings, to, wikiData})}
                    </blockquote>
                `}
            `
        },

        sidebarLeft: generateSidebarForAlbum(album, null, {strings, to, wikiData}),

        nav: {
            links: [
                {
                    href: to('localized.home'),
                    title: wikiInfo.shortName
                },
                {
                    html: strings('albumPage.nav.album', {
                        album: strings.link.album(album, {class: 'current', to})
                    })
                },
                {
                    divider: false,
                    html: generateAlbumNavLinks(album, null, {strings, to})
                }
            ],
            content: fixWS`
                <div>
                    ${generateAlbumChronologyLinks(album, null, {strings, to})}
                </div>
            `
        }
    })};

    return [page, data];
}

function getAlbumStylesheet(album, {to}) {
    return [
        album.wallpaperArtists && fixWS`
            body::before {
                background-image: url("${to('media.albumWallpaper', album.directory)}");
                ${album.wallpaperStyle}
            }
        `,
        album.bannerStyle && fixWS`
            #banner img {
                ${album.bannerStyle}
            }
        `
    ].filter(Boolean).join('\n');
}

function writeTrackPages({wikiData}) {
    return wikiData.trackData.map(track => writeTrackPage(track, {wikiData}));
}

function writeTrackPage(track, {wikiData}) {
    const { groupData, wikiInfo } = wikiData;
    const { album } = track;

    const tracksThatReference = track.referencedBy;
    const useDividedReferences = groupData.some(group => group.directory === OFFICIAL_GROUP_DIRECTORY);
    const ttrFanon = (useDividedReferences &&
        tracksThatReference.filter(t => t.album.groups.every(group => group.directory !== OFFICIAL_GROUP_DIRECTORY)));
    const ttrOfficial = (useDividedReferences &&
        tracksThatReference.filter(t => t.album.groups.some(group => group.directory === OFFICIAL_GROUP_DIRECTORY)));

    const tracksReferenced = track.references;
    const otherReleases = track.otherReleases;
    const listTag = getAlbumListTag(album);

    let flashesThatFeature;
    if (wikiInfo.features.flashesAndGames) {
        flashesThatFeature = sortByDate([track, ...otherReleases]
            .flatMap(track => track.flashes.map(flash => ({flash, as: track}))));
    }

    const generateTrackList = (tracks, {strings, to}) => html.tag('ul',
        tracks.map(track => {
            const line = strings('trackList.item.withArtists', {
                track: strings.link.track(track, {to}),
                by: `<span class="by">${strings('trackList.item.withArtists.by', {
                    artists: getArtistString(track.artists, {strings, to})
                })}</span>`
            });
            return (track.aka
                ? `<li class="rerelease">${strings('trackList.item.rerelease', {track: line})}</li>`
                : `<li>${line}</li>`);
        })
    );

    const hasCommentary = track.commentary || otherReleases.some(t => t.commentary);
    const generateCommentary = ({strings, to}) => transformMultiline(
        [
            track.commentary,
            ...otherReleases.map(track =>
                (track.commentary?.split('\n')
                    .filter(line => line.replace(/<\/b>/g, '').includes(':</i>'))
                    .map(line => fixWS`
                        ${line}
                        ${strings('releaseInfo.artistCommentary.seeOriginalRelease', {
                            original: strings.link.track(track, {to})
                        })}
                    `)
                    .join('\n')))
        ].filter(Boolean).join('\n'),
        {strings, to, wikiData});

    const data = {
        type: 'data',
        path: ['track', track.directory],
        data: () => ({
            name: track.name,
            directory: track.directory,
            dates: {
                released: track.date,
                originallyReleased: track.originalDate,
                coverArtAdded: track.coverArtDate
            },
            duration: track.duration,
            color: track.color,
            cover: serializeCover(track, getTrackCover),
            artists: serializeContribs(track.artists),
            contributors: serializeContribs(track.contributors),
            coverArtists: serializeContribs(track.coverArtists || []),
            album: serializeLink(track.album),
            groups: serializeGroupsForTrack(track),
            references: track.references.map(serializeLink),
            referencedBy: track.referencedBy.map(serializeLink),
            alsoReleasedAs: otherReleases.map(track => ({
                track: serializeLink(track),
                album: serializeLink(track.album)
            }))
        })
    };

    const page = {type: 'page', path: ['track', track.directory], page: ({strings, to}) => ({
        title: strings('trackPage.title', {track: track.name}),
        stylesheet: getAlbumStylesheet(album, {to}),
        theme: getThemeString(track.color, [
            `--album-directory: ${album.directory}`,
            `--track-directory: ${track.directory}`
        ]),

        // disabled for now! shifting banner position per height of page is disorienting
        /*
        banner: album.bannerArtists && {
            classes: ['dim'],
            dimensions: album.bannerDimensions,
            src: to('media.albumBanner', album.directory),
            alt: strings('misc.alt.albumBanner'),
            position: 'bottom'
        },
        */

        main: {
            content: fixWS`
                ${generateCoverLink({
                    strings, to, wikiData,
                    src: getTrackCover(track, {to}),
                    alt: strings('misc.alt.trackCover'),
                    tags: track.artTags
                })}
                <h1>${strings('trackPage.title', {track: track.name})}</h1>
                <p>
                    ${[
                        strings('releaseInfo.by', {
                            artists: getArtistString(track.artists, {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })
                        }),
                        track.coverArtists && strings('releaseInfo.coverArtBy', {
                            artists: getArtistString(track.coverArtists, {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })
                        }),
                        album.directory !== UNRELEASED_TRACKS_DIRECTORY && strings('releaseInfo.released', {
                            date: strings.count.date(track.date)
                        }),
                        +track.coverArtDate !== +track.date && strings('releaseInfo.artReleased', {
                            date: strings.count.date(track.coverArtDate)
                        }),
                        track.duration && strings('releaseInfo.duration', {
                            duration: strings.count.duration(track.duration)
                        })
                    ].filter(Boolean).join('<br>\n')}
                </p>
                <p>${
                    (track.urls.length
                        ? strings('releaseInfo.listenOn', {
                            links: strings.list.or(track.urls.map(url => fancifyURL(url, {strings})))
                        })
                        : strings('releaseInfo.listenOn.noLinks'))
                }</p>
                ${otherReleases.length && fixWS`
                    <p>${strings('releaseInfo.alsoReleasedAs')}</p>
                    <ul>
                        ${otherReleases.map(track => fixWS`
                            <li>${strings('releaseInfo.alsoReleasedAs.item', {
                                track: strings.link.track(track, {to}),
                                album: strings.link.album(track.album, {to})
                            })}</li>
                        `).join('\n')}
                    </ul>
                `}
                ${track.contributors.textContent && fixWS`
                    <p>
                        ${strings('releaseInfo.contributors')}
                        <br>
                        ${transformInline(track.contributors.textContent, {strings, to, wikiData})}
                    </p>
                `}
                ${track.contributors.length && fixWS`
                    <p>${strings('releaseInfo.contributors')}</p>
                    <ul>
                        ${(track.contributors
                            .map(contrib => `<li>${getArtistString([contrib], {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })}</li>`)
                            .join('\n'))}
                    </ul>
                `}
                ${tracksReferenced.length && fixWS`
                    <p>${strings('releaseInfo.tracksReferenced', {track: `<i>${track.name}</i>`})}</p>
                    ${generateTrackList(tracksReferenced, {strings, to})}
                `}
                ${tracksThatReference.length && fixWS`
                    <p>${strings('releaseInfo.tracksThatReference', {track: `<i>${track.name}</i>`})}</p>
                    ${useDividedReferences && fixWS`
                        <dl>
                            ${ttrOfficial.length && fixWS`
                                <dt>${strings('trackPage.referenceList.official')}</dt>
                                <dd>${generateTrackList(ttrOfficial, {strings, to})}</dd>
                            `}
                            ${ttrFanon.length && fixWS`
                                <dt>${strings('trackPage.referenceList.fandom')}</dt>
                                <dd>${generateTrackList(ttrFanon, {strings, to})}</dd>
                            `}
                        </dl>
                    `}
                    ${!useDividedReferences && generateTrackList(tracksThatReference, {strings, to})}
                `}
                ${wikiInfo.features.flashesAndGames && flashesThatFeature.length && fixWS`
                    <p>${strings('releaseInfo.flashesThatFeature', {track: `<i>${track.name}</i>`})}</p>
                    <ul>
                        ${flashesThatFeature.map(({ flash, as }) => fixWS`
                            <li ${classes(as !== track && 'rerelease')}>${
                                (as === track
                                    ? strings('releaseInfo.flashesThatFeature.item', {
                                        flash: strings.link.flash(flash, {to})
                                    })
                                    : strings('releaseInfo.flashesThatFeature.item.asDifferentRelease', {
                                        flash: strings.link.flash(flash, {to}),
                                        track: strings.link.track(as, {to})
                                    }))
                            }</li>
                        `).join('\n')}
                    </ul>
                `}
                ${track.lyrics && fixWS`
                    <p>${strings('releaseInfo.lyrics')}</p>
                    <blockquote>
                        ${transformLyrics(track.lyrics, {strings, to, wikiData})}
                    </blockquote>
                `}
                ${hasCommentary && fixWS`
                    <p>${strings('releaseInfo.artistCommentary')}</p>
                    <blockquote>
                        ${generateCommentary({strings, to})}
                    </blockquote>
                `}
            `
        },

        sidebarLeft: generateSidebarForAlbum(album, track, {strings, to, wikiData}),

        nav: {
            links: [
                {
                    href: to('localized.home'),
                    title: wikiInfo.shortName
                },
                {
                    href: to('localized.album', album.directory),
                    title: album.name
                },
                listTag === 'ol' ? {
                    html: strings('trackPage.nav.track.withNumber', {
                        number: album.tracks.indexOf(track) + 1,
                        track: strings.link.track(track, {class: 'current', to})
                    })
                } : {
                    html: strings('trackPage.nav.track', {
                        track: strings.link.track(track, {class: 'current', to})
                    })
                },
                {
                    divider: false,
                    html: generateAlbumNavLinks(album, track, {strings, to})
                }
            ].filter(Boolean),
            content: fixWS`
                <div>
                    ${generateAlbumChronologyLinks(album, track, {strings, to})}
                </div>
            `
        }
    })};

    return [data, page];
}

function writeArtistPages({wikiData}) {
    return [
        ...wikiData.artistData.map(artist => writeArtistPage(artist, {wikiData})),
        ...wikiData.artistAliasData.map(artist => writeArtistAliasPage(artist, {wikiData}))
    ];
}

function writeArtistPage(artist, {wikiData}) {
    const { groupData, wikiInfo } = wikiData;

    const {
        name,
        urls = [],
        note = ''
    } = artist;

    const artThingsAll = sortByDate(unique([...artist.albums.asCoverArtist, ...artist.albums.asWallpaperArtist, ...artist.albums.asBannerArtist, ...artist.tracks.asCoverArtist]));
    const artThingsGallery = sortByDate([...artist.albums.asCoverArtist, ...artist.tracks.asCoverArtist]);
    const commentaryThings = sortByDate([...artist.albums.asCommentator, ...artist.tracks.asCommentator]);

    const hasGallery = artThingsGallery.length > 0;

    const getArtistsAndContrib = (thing, key) => ({
        artists: thing[key]?.filter(({ who }) => who !== artist),
        contrib: thing[key]?.find(({ who }) => who === artist),
        thing,
        key
    });

    const artListChunks = chunkByProperties(artThingsAll.flatMap(thing =>
        (['coverArtists', 'wallpaperArtists', 'bannerArtists']
            .map(key => getArtistsAndContrib(thing, key))
            .filter(({ contrib }) => contrib)
            .map(props => ({
                album: thing.album || thing,
                track: thing.album ? thing : null,
                date: +(thing.coverArtDate || thing.date),
                ...props
            })))
    ), ['date', 'album']);

    const commentaryListChunks = chunkByProperties(commentaryThings.map(thing => ({
        album: thing.album || thing,
        track: thing.album ? thing : null
    })), ['album']);

    const allTracks = sortByDate(unique([...artist.tracks.asArtist, ...artist.tracks.asContributor]));
    const unreleasedTracks = allTracks.filter(track => track.album.directory === UNRELEASED_TRACKS_DIRECTORY);
    const releasedTracks = allTracks.filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY);

    const chunkTracks = tracks => (
        chunkByProperties(tracks.map(track => ({
            track,
            date: +track.date,
            album: track.album,
            duration: track.duration,
            artists: (track.artists.some(({ who }) => who === artist)
                ? track.artists.filter(({ who }) => who !== artist)
                : track.contributors.filter(({ who }) => who !== artist)),
            contrib: {
                who: artist,
                what: [
                    track.artists.find(({ who }) => who === artist)?.what,
                    track.contributors.find(({ who }) => who === artist)?.what
                ].filter(Boolean).join(', ')
            }
        })), ['date', 'album'])
        .map(({date, album, chunk}) => ({
            date, album, chunk,
            duration: getTotalDuration(chunk),
        })));

    const unreleasedTrackListChunks = chunkTracks(unreleasedTracks);
    const releasedTrackListChunks = chunkTracks(releasedTracks);

    const totalReleasedDuration = getTotalDuration(releasedTracks);

    const countGroups = things => {
        const usedGroups = things.flatMap(thing => thing.groups || thing.album?.groups || []);
        return groupData
            .map(group => ({
                group,
                contributions: usedGroups.filter(g => g === group).length
            }))
            .filter(({ contributions }) => contributions > 0)
            .sort((a, b) => b.contributions - a.contributions);
    };

    const musicGroups = countGroups(releasedTracks);
    const artGroups = countGroups(artThingsAll);

    let flashes, flashListChunks;
    if (wikiInfo.features.flashesAndGames) {
        flashes = sortByDate(artist.flashes.asContributor.slice());
        flashListChunks = (
            chunkByProperties(flashes.map(flash => ({
                act: flash.act,
                flash,
                date: flash.date,
                // Manual artists/contrib properties here, 8ecause we don't
                // want to show the full list of other contri8utors inline.
                // (It can often 8e very, very large!)
                artists: [],
                contrib: flash.contributors.find(({ who }) => who === artist)
            })), ['act'])
            .map(({ act, chunk }) => ({
                act, chunk,
                dateFirst: chunk[0].date,
                dateLast: chunk[chunk.length - 1].date
            })));
    }

    const generateEntryAccents = ({ aka, entry, artists, contrib, strings, to }) =>
        (aka
            ? strings('artistPage.creditList.entry.rerelease', {entry})
            : (artists.length
                ? (contrib.what
                    ? strings('artistPage.creditList.entry.withArtists.withContribution', {
                        entry,
                        artists: getArtistString(artists, {strings, to}),
                        contribution: contrib.what
                    })
                    : strings('artistPage.creditList.entry.withArtists', {
                        entry,
                        artists: getArtistString(artists, {strings, to})
                    }))
                : (contrib.what
                    ? strings('artistPage.creditList.entry.withContribution', {
                        entry,
                        contribution: contrib.what
                    })
                    : entry)));

    const generateTrackList = (chunks, {strings, to}) => fixWS`
        <dl>
            ${chunks.map(({date, album, chunk, duration}) => fixWS`
                <dt>${strings('artistPage.creditList.album.withDate.withDuration', {
                    album: strings.link.album(album, {to}),
                    date: strings.count.date(date),
                    duration: strings.count.duration(duration, {approximate: true})
                })}</dt>
                <dd><ul>
                    ${(chunk
                        .map(({track, ...props}) => ({
                            aka: track.aka,
                            entry: strings('artistPage.creditList.entry.track.withDuration', {
                                track: strings.link.track(track, {to}),
                                duration: strings.count.duration(track.duration, {to})
                            }),
                            ...props
                        }))
                        .map(({aka, ...opts}) => `<li ${classes(aka && 'rerelease')}>${generateEntryAccents({strings, to, aka, ...opts})}</li>`)
                        .join('\n'))}
                </ul></dd>
            `).join('\n')}
        </dl>
    `;

    const serializeArtistsAndContrib = key => thing => {
        const { artists, contrib } = getArtistsAndContrib(thing, key);
        const ret = {};
        ret.link = serializeLink(thing);
        if (contrib.what) ret.contribution = contrib.what;
        if (artists.length) ret.otherArtists = serializeContribs(artists);
        return ret;
    };

    const serializeTrackListChunks = chunks =>
        chunks.map(({date, album, chunk, duration}) => ({
            album: serializeLink(album),
            date,
            duration,
            tracks: chunk.map(({ track }) => ({
                link: serializeLink(track),
                duration: track.duration
            }))
        }));

    const data = {
        type: 'data',
        path: ['artist', artist.directory],
        data: () => ({
            albums: {
                asCoverArtist: artist.albums.asCoverArtist.map(serializeArtistsAndContrib('coverArtists')),
                asWallpaperArtist: artist.albums.asWallpaperArtist.map(serializeArtistsAndContrib('wallpaperArtists')),
                asBannerArtist: artist.albums.asBannerArtist.map(serializeArtistsAndContrib('bannerArtists'))
            },
            flashes: wikiInfo.features.flashesAndGames ? {
                asContributor: artist.flashes.asContributor
                    .map(flash => getArtistsAndContrib(flash, 'contributors'))
                    .map(({ contrib, thing: flash }) => ({
                        link: serializeLink(flash),
                        contribution: contrib.what
                    }))
            } : null,
            tracks: {
                asArtist: artist.tracks.asArtist.map(serializeArtistsAndContrib('artists')),
                asContributor: artist.tracks.asContributor.map(serializeArtistsAndContrib('contributors')),
                chunked: {
                    released: serializeTrackListChunks(releasedTrackListChunks),
                    unreleased: serializeTrackListChunks(unreleasedTrackListChunks)
                }
            }
        })
    };

    const infoPage = {
        type: 'page',
        path: ['artist', artist.directory],
        page: ({strings, to}) => ({
            title: strings('artistPage.title', {artist: name}),

            main: {
                content: fixWS`
                    ${artist.hasAvatar && generateCoverLink({
                        strings, to, wikiData,
                        src: to('localized.artistAvatar', artist.directory),
                        alt: strings('misc.alt.artistAvatar')
                    })}
                    <h1>${strings('artistPage.title', {artist: name})}</h1>
                    ${note && fixWS`
                        <p>${strings('releaseInfo.note')}</p>
                        <blockquote>
                            ${transformMultiline(note, {strings, to, wikiData})}
                        </blockquote>
                        <hr>
                    `}
                    ${urls.length && `<p>${strings('releaseInfo.visitOn', {
                        links: strings.list.or(urls.map(url => fancifyURL(url, {strings})))
                    })}</p>`}
                    ${hasGallery && `<p>${strings('artistPage.viewArtGallery', {
                        link: strings.link.artistGallery(artist, {
                            to,
                            text: strings('artistPage.viewArtGallery.link')
                        })
                    })}</p>`}
                    <p>${strings('misc.jumpTo.withLinks', {
                        links: strings.list.unit([
                            [
                                [...releasedTracks, ...unreleasedTracks].length && `<a href="#tracks">${strings('artistPage.trackList.title')}</a>`,
                                unreleasedTracks.length && `(<a href="#unreleased-tracks">${strings('artistPage.unreleasedTrackList.title')}</a>)`
                            ].filter(Boolean).join(' '),
                            artThingsAll.length && `<a href="#art">${strings('artistPage.artList.title')}</a>`,
                            wikiInfo.features.flashesAndGames && flashes.length && `<a href="#flashes">${strings('artistPage.flashList.title')}</a>`,
                            commentaryThings.length && `<a href="#commentary">${strings('artistPage.commentaryList.title')}</a>`
                        ].filter(Boolean))
                    })}</p>
                    ${(releasedTracks.length || unreleasedTracks.length) && fixWS`
                        <h2 id="tracks">${strings('artistPage.trackList.title')}</h2>
                    `}
                    ${releasedTracks.length && fixWS`
                        <p>${strings('artistPage.contributedDurationLine', {
                            artist: artist.name,
                            duration: strings.count.duration(totalReleasedDuration, {approximate: true, unit: true})
                        })}</p>
                        <p>${strings('artistPage.musicGroupsLine', {
                            groups: strings.list.unit(musicGroups
                                .map(({ group, contributions }) => strings('artistPage.groupsLine.item', {
                                    group: strings.link.groupInfo(group, {to}),
                                    contributions: strings.count.contributions(contributions)
                                })))
                        })}</p>
                        ${generateTrackList(releasedTrackListChunks, {strings, to})}
                    `}
                    ${unreleasedTracks.length && fixWS`
                        <h3 id="unreleased-tracks">${strings('artistPage.unreleasedTrackList.title')}</h3>
                        ${generateTrackList(unreleasedTrackListChunks, {strings, to})}
                    `}
                    ${artThingsAll.length && fixWS`
                        <h2 id="art">${strings('artistPage.artList.title')}</h2>
                        ${hasGallery && `<p>${strings('artistPage.viewArtGallery.orBrowseList', {
                            link: strings.link.artistGallery(artist, {
                                to,
                                text: strings('artistPage.viewArtGallery.link')
                            })
                        })}</p>`}
                        <p>${strings('artistPage.artGroupsLine', {
                            groups: strings.list.unit(artGroups
                                .map(({ group, contributions }) => strings('artistPage.groupsLine.item', {
                                    group: strings.link.groupInfo(group, {to}),
                                    contributions: strings.count.contributions(contributions)
                                })))
                        })}</p>
                        <dl>
                            ${artListChunks.map(({date, album, chunk}) => fixWS`
                                <dt>${strings('artistPage.creditList.album.withDate', {
                                    album: strings.link.album(album, {to}),
                                    date: strings.count.date(date)
                                })}</dt>
                                <dd><ul>
                                    ${(chunk
                                        .map(({album, track, key, ...props}) => ({
                                            entry: (track
                                                ? strings('artistPage.creditList.entry.track', {
                                                    track: strings.link.track(track, {to})
                                                })
                                                : `<i>${strings('artistPage.creditList.entry.album.' + {
                                                    wallpaperArtists: 'wallpaperArt',
                                                    bannerArtists: 'bannerArt',
                                                    coverArtists: 'coverArt'
                                                }[key])}</i>`),
                                            ...props
                                        }))
                                        .map(opts => generateEntryAccents({strings, to, ...opts}))
                                        .map(row => `<li>${row}</li>`)
                                        .join('\n'))}
                                </ul></dd>
                            `).join('\n')}
                        </dl>
                    `}
                    ${wikiInfo.features.flashesAndGames && flashes.length && fixWS`
                        <h2 id="flashes">${strings('artistPage.flashList.title')}</h2>
                        <dl>
                            ${flashListChunks.map(({act, chunk, dateFirst, dateLast}) => fixWS`
                                <dt>${strings('artistPage.creditList.flashAct.withDateRange', {
                                    act: strings.link.flash(chunk[0].flash, {to, text: act.name}),
                                    dateRange: strings.count.dateRange([dateFirst, dateLast])
                                })}</dt>
                                <dd><ul>
                                    ${(chunk
                                        .map(({flash, ...props}) => ({
                                            entry: strings('artistPage.creditList.entry.flash', {
                                                flash: strings.link.flash(flash, {to})
                                            }),
                                            ...props
                                        }))
                                        .map(opts => generateEntryAccents({strings, to, ...opts}))
                                        .map(row => `<li>${row}</li>`)
                                        .join('\n'))}
                                </ul></dd>
                            `).join('\n')}
                        </dl>
                    `}
                    ${commentaryThings.length && fixWS`
                        <h2 id="commentary">${strings('artistPage.commentaryList.title')}</h2>
                        <dl>
                            ${commentaryListChunks.map(({album, chunk}) => fixWS`
                                <dt>${strings('artistPage.creditList.album', {
                                    album: strings.link.album(album, {to})
                                })}</dt>
                                <dd><ul>
                                    ${(chunk
                                        .map(({album, track, ...props}) => track
                                            ? strings('artistPage.creditList.entry.track', {
                                                track: strings.link.track(track, {to})
                                            })
                                            : `<i>${strings('artistPage.creditList.entry.album.commentary')}</i>`)
                                        .map(row => `<li>${row}</li>`)
                                        .join('\n'))}
                                </ul></dd>
                            `).join('\n')}
                        </dl>
                    `}
                `
            },

            nav: generateNavForArtist(artist, {isGallery: false, hasGallery, strings, to, wikiData})
        })
    };

    const galleryPage = hasGallery && {
        type: 'page',
        path: ['artistGallery', artist.directory],
        page: ({strings, to}) => ({
            title: strings('artistGalleryPage.title', {artist: name}),

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${strings('artistGalleryPage.title', {artist: name})}</h1>
                    <p class="quick-info">${strings('artistGalleryPage.infoLine', {
                        coverArts: strings.count.coverArts(artThingsGallery.length, {unit: true})
                    })}</p>
                    <div class="grid-listing">
                        ${getGridHTML({
                            strings, to,
                            entries: artThingsGallery.map(item => ({item})),
                            srcFn: thing => (thing.album
                                ? getTrackCover(thing, {to})
                                : getAlbumCover(thing, {to})),
                            hrefFn: thing => (thing.album
                                ? to('localized.track', thing.directory)
                                : to('localized.album', thing.directory))
                        })}
                    </div>
                `
            },

            nav: generateNavForArtist(artist, {isGallery: true, hasGallery, strings, to, wikiData})
        })
    };

    return [data, infoPage, galleryPage].filter(Boolean);
}

function generateNavForArtist(artist, {isGallery, hasGallery, strings, to, wikiData}) {
    const { wikiInfo } = wikiData;

    const infoGalleryLinks = (hasGallery &&
        generateInfoGalleryLinks('artist', 'artistGallery', artist, isGallery, {strings, to}))

    return {
        links: [
            {
                href: to('localized.home'),
                title: wikiInfo.shortName
            },
            wikiInfo.features.listings &&
            {
                href: to('localized.listingIndex'),
                title: strings('listingIndex.title')
            },
            {
                html: strings('artistPage.nav.artist', {
                    artist: strings.link.artist(artist, {class: 'current', to})
                })
            },
            hasGallery &&
            {
                divider: false,
                html: `(${infoGalleryLinks})`
            }
        ]
    };
}

function writeArtistAliasPage(artist, {wikiData}) {
    // This function doesn't actually use wikiData, 8ut, um, consistency?

    const { alias } = artist;

    return async ({baseDirectory, strings, writePage}) => {
        const { code } = strings;
        const paths = writePage.paths(baseDirectory, 'artist', alias.directory);
        const content = generateRedirectPage(alias.name, paths.pathname, {strings});
        await writePage.write(content, {paths});
    };
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

function writeFlashPages({wikiData}) {
    const { flashData, wikiInfo } = wikiData;

    if (!wikiInfo.features.flashesAndGames) {
        return;
    }

    return [
        writeFlashIndex({wikiData}),
        ...flashData.map(flash => writeFlashPage(flash, {wikiData}))
    ];
}

function writeFlashIndex({wikiData}) {
    const { flashActData } = wikiData;

    return ({strings, writePage}) => writePage('flashIndex', '', ({to}) => ({
        title: strings('flashIndex.title'),

        main: {
            classes: ['flash-index'],
            content: fixWS`
                <h1>${strings('flashIndex.title')}</h1>
                <div class="long-content">
                    <p class="quick-info">${strings('misc.jumpTo')}</p>
                    <ul class="quick-info">
                        ${flashActData.filter(act => act.jump).map(({ anchor, jump, jumpColor }) => fixWS`
                            <li><a href="#${anchor}" style="${getLinkThemeString(jumpColor)}">${jump}</a></li>
                        `).join('\n')}
                    </ul>
                </div>
                ${flashActData.map((act, i) => fixWS`
                    <h2 id="${act.anchor}" style="${getLinkThemeString(act.color)}"><a href="${to('localized.flash', act.flashes[0].directory)}">${act.name}</a></h2>
                    <div class="grid-listing">
                        ${getFlashGridHTML({
                            strings, to,
                            entries: act.flashes.map(flash => ({item: flash})),
                            lazy: i === 0 ? 4 : true
                        })}
                    </div>
                `).join('\n')}
            `
        },

        nav: {simple: true}
    }));
}

function writeFlashPage(flash, {wikiData}) {
    return ({strings, writePage}) => writePage('flash', flash.directory, ({to}) => ({
        title: strings('flashPage.title', {flash: flash.name}),
        theme: getThemeString(flash.color, [
            `--flash-directory: ${flash.directory}`
        ]),

        main: {
            content: fixWS`
                <h1>${strings('flashPage.title', {flash: flash.name})}</h1>
                ${generateCoverLink({
                    strings, to, wikiData,
                    src: to('media.flashArt', flash.directory),
                    alt: strings('misc.alt.flashArt')
                })}
                <p>${strings('releaseInfo.released', {date: strings.count.date(flash.date)})}</p>
                ${(flash.page || flash.urls.length) && `<p>${strings('releaseInfo.playOn', {
                    links: strings.list.or([
                        flash.page && getFlashLink(flash),
                        ...flash.urls
                    ].map(url => fancifyFlashURL(url, flash, {strings})))
                })}</p>`}
                ${flash.tracks.length && fixWS`
                    <p>Tracks featured in <i>${flash.name.replace(/\.$/, '')}</i>:</p>
                    <ul>
                        ${(flash.tracks
                            .map(track => strings('trackList.item.withArtists', {
                                track: strings.link.track(track, {strings, to}),
                                by: `<span class="by">${
                                    strings('trackList.item.withArtists.by', {
                                        artists: getArtistString(track.artists, {strings, to})
                                    })
                                }</span>`
                            }))
                            .map(row => `<li>${row}</li>`)
                            .join('\n'))}
                    </ul>
                `}
                ${flash.contributors.textContent && fixWS`
                    <p>
                        ${strings('releaseInfo.contributors')}
                        <br>
                        ${transformInline(flash.contributors.textContent, {strings, to, wikiData})}
                    </p>
                `}
                ${flash.contributors.length && fixWS`
                    <p>${strings('releaseInfo.contributors')}</p>
                    <ul>
                        ${flash.contributors
                            .map(contrib => `<li>${getArtistString([contrib], {
                                strings, to,
                                showContrib: true,
                                showIcons: true
                            })}</li>`)
                            .join('\n')}
                    </ul>
                `}
            `
        },

        sidebarLeft: generateSidebarForFlash(flash, {strings, to, wikiData}),
        nav: generateNavForFlash(flash, {strings, to, wikiData})
    }));
}

function generateNavForFlash(flash, {strings, to, wikiData}) {
    const { flashData, wikiInfo } = wikiData;

    const previousNextLinks = generatePreviousNextLinks('localized.flash', flash, flashData, {strings, to});

    return {
        links: [
            {
                href: to('localized.home'),
                title: wikiInfo.shortName
            },
            {
                href: to('localized.flashIndex'),
                title: strings('flashIndex.title')
            },
            {
                html: strings('flashPage.nav.flash', {
                    flash: strings.link.flash(flash, {class: 'current', to})
                })
            },
            previousNextLinks &&
            {
                divider: false,
                html: `(${previousNextLinks})`
            }
        ],

        content: fixWS`
            <div>
                ${chronologyLinks(flash, {
                    strings, to, wikiData,
                    headingString: 'misc.chronology.heading.flash',
                    contribKey: 'contributors',
                    getThings: artist => artist.flashes.asContributor
                })}
            </div>
        `
    };
}

function generateSidebarForFlash(flash, {strings, to, wikiData}) {
    // all hard-coded, sorry :(
    // this doesnt have a super portable implementation/design...yet!!

    const { flashActData } = wikiData;

    const act6 = flashActData.findIndex(act => act.name.startsWith('Act 6'));
    const postCanon = flashActData.findIndex(act => act.name.includes('Post Canon'));
    const outsideCanon = postCanon + flashActData.slice(postCanon).findIndex(act => !act.name.includes('Post Canon'));
    const actIndex = flashActData.indexOf(flash.act);
    const side = (
        (actIndex < 0) ? 0 :
        (actIndex < act6) ? 1 :
        (actIndex <= outsideCanon) ? 2 :
        3
    );
    const currentAct = flash && flash.act;

    return {
        content: fixWS`
            <h1>${strings.link.flashIndex('', {to, text: strings('flashIndex.title')})}</h1>
            <dl>
                ${flashActData.filter(act =>
                    act.name.startsWith('Act 1') ||
                    act.name.startsWith('Act 6 Act 1') ||
                    act.name.startsWith('Hiveswap') ||
                    // Sorry not sorry -Yiffy
                    (({index = flashActData.indexOf(act)} = {}) => (
                        index < act6 ? side === 1 :
                        index < outsideCanon ? side === 2 :
                        true
                    ))()
                ).flatMap(act => [
                    act.name.startsWith('Act 1') && `<dt ${classes('side', side === 1 && 'current')}><a href="${to('localized.flash', act.flashes[0].directory)}" style="--primary-color: #4ac925">Side 1 (Acts 1-5)</a></dt>`
                    || act.name.startsWith('Act 6 Act 1') && `<dt ${classes('side', side === 2 && 'current')}><a href="${to('localized.flash', act.flashes[0].directory)}" style="--primary-color: #1076a2">Side 2 (Acts 6-7)</a></dt>`
                    || act.name.startsWith('Hiveswap Act 1') && `<dt ${classes('side', side === 3 && 'current')}><a href="${to('localized.flash', act.flashes[0].directory)}" style="--primary-color: #008282">Outside Canon (Misc. Games)</a></dt>`,
                    (({index = flashActData.indexOf(act)} = {}) => (
                        index < act6 ? side === 1 :
                        index < outsideCanon ? side === 2 :
                        true
                    ))()
                    && `<dt ${classes(act === currentAct && 'current')}><a href="${to('localized.flash', act.flashes[0].directory)}" style="${getLinkThemeString(act.color)}">${act.name}</a></dt>`,
                    act === currentAct && fixWS`
                        <dd><ul>
                            ${act.flashes.map(f => fixWS`
                                <li ${classes(f === flash && 'current')}>${strings.link.flash(f, {to})}</li>
                            `).join('\n')}
                        </ul></dd>
                    `
                ]).filter(Boolean).join('\n')}
            </dl>
        `
    };
}

const listingSpec = [
    {
        directory: 'albums/by-name',
        title: ({strings}) => strings('listingPage.listAlbums.byName.title'),

        data({wikiData}) {
            return wikiData.albumData.slice()
                .sort(sortByName);
        },

        row(album, {strings, to}) {
            return strings('listingPage.listAlbums.byName.item', {
                album: strings.link.album(album, {to}),
                tracks: strings.count.tracks(album.tracks.length, {unit: true})
            });
        }
    },

    {
        directory: 'albums/by-tracks',
        title: ({strings}) => strings('listingPage.listAlbums.byTracks.title'),

        data({wikiData}) {
            return wikiData.albumData.slice()
                .sort((a, b) => b.tracks.length - a.tracks.length);
        },

        row(album, {strings, to}) {
            return strings('listingPage.listAlbums.byTracks.item', {
                album: strings.link.album(album, {to}),
                tracks: strings.count.tracks(album.tracks.length, {unit: true})
            });
        }
    },

    {
        directory: 'albums/by-duration',
        title: ({strings}) => strings('listingPage.listAlbums.byDuration.title'),

        data({wikiData}) {
            return wikiData.albumData
                .map(album => ({album, duration: getTotalDuration(album.tracks)}))
                .sort((a, b) => b.duration - a.duration);
        },

        row({album, duration}, {strings, to}) {
            return strings('listingPage.listAlbums.byDuration.item', {
                album: strings.link.album(album, {to}),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'albums/by-date',
        title: ({strings}) => strings('listingPage.listAlbums.byDate.title'),

        data({wikiData}) {
            return sortByDate(wikiData.albumData
                .filter(album => album.directory !== UNRELEASED_TRACKS_DIRECTORY));
        },

        row(album, {strings, to}) {
            return strings('listingPage.listAlbums.byDate.item', {
                album: strings.link.album(album, {to}),
                date: strings.count.date(album.date)
            });
        }
    },

    {
        directory: 'albusm/by-date-added',
        title: ({strings}) => strings('listingPage.listAlbums.byDateAdded.title'),

        data({wikiData}) {
            return chunkByProperties(wikiData.albumData.slice().sort((a, b) => {
                if (a.dateAdded < b.dateAdded) return -1;
                if (a.dateAdded > b.dateAdded) return 1;
            }), ['dateAdded']);
        },

        html(chunks, {strings, to}) {
            return fixWS`
                <dl>
                    ${chunks.map(({dateAdded, chunk: albums}) => fixWS`
                        <dt>${strings('listingPage.listAlbums.byDateAdded.date', {
                            date: strings.count.date(dateAdded)
                        })}</dt>
                        <dd><ul>
                            ${(albums
                                .map(album => strings('listingPage.listAlbums.byDateAdded.album', {
                                    album: strings.link.album(album, {to})
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'artists/by-name',
        title: ({strings}) => strings('listingPage.listArtists.byName.title'),

        data({wikiData}) {
            return wikiData.artistData.slice()
                .sort(sortByName)
                .map(artist => ({artist, contributions: getArtistNumContributions(artist)}));
        },

        row({artist, contributions}, {strings, to}) {
            return strings('listingPage.listArtists.byName.item', {
                artist: strings.link.artist(artist, {to}),
                contributions: strings.count.contributions(contributions, {to, unit: true})
            });
        }
    },

    {
        directory: 'artists/by-contribs',
        title: ({strings}) => strings('listingPage.listArtists.byContribs.title'),

        data({wikiData}) {
            return {
                toTracks: (wikiData.artistData
                    .map(artist => ({
                        artist,
                        contributions: (
                            artist.tracks.asContributor.length +
                            artist.tracks.asArtist.length
                        )
                    }))
                    .sort((a, b) => b.contributions - a.contributions)
                    .filter(({ contributions }) => contributions)),

                toArtAndFlashes: (wikiData.artistData
                    .map(artist => ({
                        artist,
                        contributions: (
                            artist.tracks.asCoverArtist.length +
                            artist.albums.asCoverArtist.length +
                            artist.albums.asWallpaperArtist.length +
                            artist.albums.asBannerArtist.length +
                            (wikiData.wikiInfo.features.flashesAndGames
                                ? artist.flashes.asContributor.length
                                : 0)
                        )
                    }))
                    .sort((a, b) => b.contributions - a.contributions)
                    .filter(({ contributions }) => contributions)),

                // This is a kinda naughty hack, 8ut like, it's the only place
                // we'd 8e passing wikiData to html() otherwise, so like....
                // (Ok we do do this again once later.)
                showAsFlashes: wikiData.wikiInfo.features.flashesAndGames
            };
        },

        html({toTracks, toArtAndFlashes, showAsFlashes}, {strings, to}) {
            return fixWS`
                <div class="content-columns">
                    <div class="column">
                        <h2>${strings('listingPage.misc.trackContributors')}</h2>
                        <ul>
                            ${(toTracks
                                .map(({ artist, contributions }) => strings('listingPage.listArtists.byContribs.item', {
                                    artist: strings.link.artist(artist, {to}),
                                    contributions: strings.count.contributions(contributions, {unit: true})
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                         </ul>
                    </div>
                    <div class="column">
                        <h2>${strings('listingPage.misc' +
                            (showAsFlashes
                                ? '.artAndFlashContributors'
                                : '.artContributors'))}</h2>
                        <ul>
                            ${(toArtAndFlashes
                                .map(({ artist, contributions }) => strings('listingPage.listArtists.byContribs.item', {
                                    artist: strings.link.artist(artist, {to}),
                                    contributions: strings.count.contributions(contributions, {unit: true})
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul>
                    </div>
                </div>
            `;
        }
    },

    {
        directory: 'artists/by-commentary',
        title: ({strings}) => strings('listingPage.listArtists.byCommentary.title'),

        data({wikiData}) {
            return wikiData.artistData
                .map(artist => ({artist, entries: artist.tracks.asCommentator.length + artist.albums.asCommentator.length}))
                .filter(({ entries }) => entries)
                .sort((a, b) => b.entries - a.entries);
        },

        row({artist, entries}, {strings, to}) {
            return strings('listingPage.listArtists.byCommentary.item', {
                artist: strings.link.artist(artist, {to}),
                entries: strings.count.commentaryEntries(entries, {unit: true})
            });
        }
    },

    {
        directory: 'artists/by-duration',
        title: ({strings}) => strings('listingPage.listArtists.byDuration.title'),

        data({wikiData}) {
            return wikiData.artistData
                .map(artist => ({artist, duration: getTotalDuration(
                    [...artist.tracks.asArtist, ...artist.tracks.asContributor].filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY))
                }))
                .filter(({ duration }) => duration > 0)
                .sort((a, b) => b.duration - a.duration);
        },

        row({artist, duration}, {strings, to}) {
            return strings('listingPage.listArtists.byDuration.item', {
                artist: strings.link.artist(artist, {to}),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'artists/by-latest',
        title: ({strings}) => strings('listingPage.listArtists.byLatest.title'),

        data({wikiData}) {
            const reversedTracks = wikiData.trackData.slice().reverse();
            const reversedArtThings = wikiData.justEverythingSortedByArtDateMan.slice().reverse();

            return {
                toTracks: sortByDate(wikiData.artistData
                    .filter(artist => !artist.alias)
                    .map(artist => ({
                        artist,
                        date: reversedTracks.find(({ album, artists, contributors }) => (
                            album.directory !== UNRELEASED_TRACKS_DIRECTORY &&
                            [...artists, ...contributors].some(({ who }) => who === artist)
                        ))?.date
                    }))
                    .filter(({ date }) => date)
                    .sort((a, b) => a.name < b.name ? 1 : a.name > b.name ? -1 : 0)).reverse(),

                toArtAndFlashes: sortByDate(wikiData.artistData
                    .filter(artist => !artist.alias)
                    .map(artist => {
                        const thing = reversedArtThings.find(({ album, coverArtists, contributors }) => (
                            album?.directory !== UNRELEASED_TRACKS_DIRECTORY &&
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
                ).reverse(),

                // (Ok we did it again.)
                // This is a kinda naughty hack, 8ut like, it's the only place
                // we'd 8e passing wikiData to html() otherwise, so like....
                showAsFlashes: wikiData.wikiInfo.features.flashesAndGames
            };
        },

        html({toTracks, toArtAndFlashes, showAsFlashes}, {strings, to}) {
            return fixWS`
                <div class="content-columns">
                    <div class="column">
                        <h2>${strings('listingPage.misc.trackContributors')}</h2>
                        <ul>
                            ${(toTracks
                                .map(({ artist, date }) => strings('listingPage.listArtists.byLatest.item', {
                                    artist: strings.link.artist(artist, {to}),
                                    date: strings.count.date(date)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul>
                    </div>
                    <div class="column">
                        <h2>${strings('listingPage.misc' +
                            (showAsFlashes
                                ? '.artAndFlashContributors'
                                : '.artContributors'))}</h2>
                        <ul>
                            ${(toArtAndFlashes
                                .map(({ artist, date }) => strings('listingPage.listArtists.byLatest.item', {
                                    artist: strings.link.artist(artist, {to}),
                                    date: strings.count.date(date)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul>
                    </div>
                </div>
            `;
        }
    },

    {
        directory: 'groups/by-name',
        title: ({strings}) => strings('listingPage.listGroups.byName.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.groupUI,
        data: ({wikiData}) => wikiData.groupData.slice().sort(sortByName),

        row(group, {strings, to}) {
            return strings('listingPage.listGroups.byCategory.group', {
                group: strings.link.groupInfo(group, {to}),
                gallery: strings.link.groupGallery(group, {
                    to,
                    text: strings('listingPage.listGroups.byCategory.group.gallery')
                })
            });
        }
    },

    {
        directory: 'groups/by-category',
        title: ({strings}) => strings('listingPage.listGroups.byCategory.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.groupUI,
        data: ({wikiData}) => wikiData.groupCategoryData,

        html(groupCategoryData, {strings, to}) {
            return fixWS`
                <dl>
                    ${groupCategoryData.map(category => fixWS`
                        <dt>${strings('listingPage.listGroups.byCategory.category', {
                            category: strings.link.groupInfo(category.groups[0], {to, text: category.name})
                        })}</dt>
                        <dd><ul>
                            ${(category.groups
                                .map(group => strings('listingPage.listGroups.byCategory.group', {
                                    group: strings.link.groupInfo(group, {to}),
                                    gallery: strings.link.groupGallery(group, {
                                        to,
                                        text: strings('listingPage.listGroups.byCategory.group.gallery')
                                    })
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'groups/by-albums',
        title: ({strings}) => strings('listingPage.listGroups.byAlbums.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.groupUI,

        data({wikiData}) {
            return wikiData.groupData
                .map(group => ({group, albums: group.albums.length}))
                .sort((a, b) => b.albums - a.albums);
        },

        row({group, albums}, {strings, to}) {
            return strings('listingPage.listGroups.byAlbums.item', {
                group: strings.link.groupInfo(group, {to}),
                albums: strings.count.albums(albums, {unit: true})
            });
        }
    },

    {
        directory: 'groups/by-tracks',
        title: ({strings}) => strings('listingPage.listGroups.byTracks.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.groupUI,

        data({wikiData}) {
            return wikiData.groupData
                .map(group => ({group, tracks: group.albums.reduce((acc, album) => acc + album.tracks.length, 0)}))
                .sort((a, b) => b.tracks - a.tracks);
        },

        row({group, tracks}, {strings, to}) {
            return strings('listingPage.listGroups.byTracks.item', {
                group: strings.link.groupInfo(group, {to}),
                tracks: strings.count.tracks(tracks, {unit: true})
            });
        }
    },

    {
        directory: 'groups/by-duration',
        title: ({strings}) => strings('listingPage.listGroups.byDuration.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.groupUI,

        data({wikiData}) {
            return wikiData.groupData
                .map(group => ({group, duration: getTotalDuration(group.albums.flatMap(album => album.tracks))}))
                .sort((a, b) => b.duration - a.duration);
        },

        row({group, duration}, {strings, to}) {
            return strings('listingPage.listGroups.byDuration.item', {
                group: strings.link.groupInfo(group, {to}),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'groups/by-latest-album',
        title: ({strings}) => strings('listingPage.listGroups.byLatest.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.groupUI,

        data({wikiData}) {
            return sortByDate(wikiData.groupData
                .map(group => ({group, date: group.albums[group.albums.length - 1].date}))
                // So this is kinda tough to explain, 8ut 8asically, when we
                // reverse the list after sorting it 8y d8te (so that the latest
                // d8tes come first), it also flips the order of groups which
                // share the same d8te.  This happens mostly when a single al8um
                // is the l8test in two groups. So, say one such al8um is in the
                // groups "Fandom" and "UMSPAF". Per category order, Fandom is
                // meant to show up 8efore UMSPAF, 8ut when we do the reverse
                // l8ter, that flips them, and UMSPAF ends up displaying 8efore
                // Fandom. So we do an extra reverse here, which will fix that
                // and only affect groups that share the same d8te (8ecause
                // groups that don't will 8e moved 8y the sortByDate call
                // surrounding this).
                .reverse()).reverse()
        },

        row({group, date}, {strings, to}) {
            return strings('listingPage.listGroups.byLatest.item', {
                group: strings.link.groupInfo(group, {to}),
                date: strings.count.date(date)
            });
        }
    },

    {
        directory: 'tracks/by-name',
        title: ({strings}) => strings('listingPage.listTracks.byName.title'),

        data({wikiData}) {
            return wikiData.trackData.slice().sort(sortByName);
        },

        row(track, {strings, to}) {
            return strings('listingPage.listTracks.byName.item', {
                track: strings.link.track(track, {to})
            });
        }
    },

    {
        directory: 'tracks/by-album',
        title: ({strings}) => strings('listingPage.listTracks.byAlbum.title'),
        data: ({wikiData}) => wikiData.albumData,

        html(albumData, {strings, to}) {
            return fixWS`
                <dl>
                    ${albumData.map(album => fixWS`
                        <dt>${strings('listingPage.listTracks.byAlbum.album', {
                            album: strings.link.album(album, {to})
                        })}</dt>
                        <dd><ol>
                            ${(album.tracks
                                .map(track => strings('listingPage.listTracks.byAlbum.track', {
                                    track: strings.link.track(track, {to})
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ol></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/by-date',
        title: ({strings}) => strings('listingPage.listTracks.byDate.title'),

        data({wikiData}) {
            return chunkByProperties(
                sortByDate(wikiData.trackData.filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY)),
                ['album', 'date']
            );
        },

        html(chunks, {strings, to}) {
            return fixWS`
                <dl>
                    ${chunks.map(({album, date, chunk: tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.byDate.album', {
                            album: strings.link.album(album, {to}),
                            date: strings.count.date(date)
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => track.aka
                                    ? `<li class="rerelease">${strings('listingPage.listTracks.byDate.track.rerelease', {
                                        track: strings.link.track(track, {to})
                                    })}</li>`
                                    : `<li>${strings('listingPage.listTracks.byDate.track', {
                                        track: strings.link.track(track, {to})
                                    })}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/by-duration',
        title: ({strings}) => strings('listingPage.listTracks.byDuration.title'),

        data({wikiData}) {
            return wikiData.trackData
                .filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY)
                .map(track => ({track, duration: track.duration}))
                .filter(({ duration }) => duration > 0)
                .sort((a, b) => b.duration - a.duration);
        },

        row({track, duration}, {strings, to}) {
            return strings('listingPage.listTracks.byDuration.item', {
                track: strings.link.track(track, {to}),
                duration: strings.count.duration(duration)
            });
        }
    },

    {
        directory: 'tracks/by-duration-in-album',
        title: ({strings}) => strings('listingPage.listTracks.byDurationInAlbum.title'),

        data({wikiData}) {
            return wikiData.albumData.map(album => ({
                album,
                tracks: album.tracks.slice().sort((a, b) => b.duration - a.duration)
            }));
        },

        html(albums, {strings, to}) {
            return fixWS`
                <dl>
                    ${albums.map(({album, tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.byDurationInAlbum.album', {
                            album: strings.link.album(album, {to})
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => strings('listingPage.listTracks.byDurationInAlbum.track', {
                                    track: strings.link.track(track, {to}),
                                    duration: strings.count.duration(track.duration)
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </dd></ul>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/by-times-referenced',
        title: ({strings}) => strings('listingPage.listTracks.byTimesReferenced.title'),

        data({wikiData}) {
            return wikiData.trackData
                .map(track => ({track, timesReferenced: track.referencedBy.length}))
                .filter(({ timesReferenced }) => timesReferenced > 0)
                .sort((a, b) => b.timesReferenced - a.timesReferenced);
        },

        row({track, timesReferenced}, {strings, to}) {
            return strings('listingPage.listTracks.byTimesReferenced.item', {
                track: strings.link.track(track, {to}),
                timesReferenced: strings.count.timesReferenced(timesReferenced, {unit: true})
            });
        }
    },

    {
        directory: 'tracks/in-flashes/by-album',
        title: ({strings}) => strings('listingPage.listTracks.inFlashes.byAlbum.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.flashesAndGames,

        data({wikiData}) {
            return chunkByProperties(wikiData.trackData
                .filter(t => t.flashes.length > 0), ['album'])
                .filter(({ album }) => album.directory !== UNRELEASED_TRACKS_DIRECTORY);
        },

        html(chunks, {strings, to}) {
            return fixWS`
                <dl>
                    ${chunks.map(({album, chunk: tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.inFlashes.byAlbum.album', {
                            album: strings.link.album(album, {to}),
                            date: strings.count.date(album.date)
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => strings('listingPage.listTracks.inFlashes.byAlbum.track', {
                                    track: strings.link.track(track, {to}),
                                    flashes: strings.list.and(track.flashes.map(flash => strings.link.flash(flash, {to})))
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </dd></ul>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/in-flashes/by-flash',
        title: ({strings}) => strings('listingPage.listTracks.inFlashes.byFlash.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.flashesAndGames,
        data: ({wikiData}) => wikiData.flashData,

        html(flashData, {strings, to}) {
            return fixWS`
                <dl>
                    ${sortByDate(flashData.slice()).map(flash => fixWS`
                        <dt>${strings('listingPage.listTracks.inFlashes.byFlash.flash', {
                            flash: strings.link.flash(flash, {to}),
                            date: strings.count.date(flash.date)
                        })}</dt>
                        <dd><ul>
                            ${(flash.tracks
                                .map(track => strings('listingPage.listTracks.inFlashes.byFlash.track', {
                                    track: strings.link.track(track, {to}),
                                    album: strings.link.album(track.album, {to})
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </ul></dd>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tracks/with-lyrics',
        title: ({strings}) => strings('listingPage.listTracks.withLyrics.title'),

        data({wikiData}) {
            return chunkByProperties(wikiData.trackData.filter(t => t.lyrics), ['album']);
        },

        html(chunks, {strings, to}) {
            return fixWS`
                <dl>
                    ${chunks.map(({album, chunk: tracks}) => fixWS`
                        <dt>${strings('listingPage.listTracks.withLyrics.album', {
                            album: strings.link.album(album, {to}),
                            date: strings.count.date(album.date)
                        })}</dt>
                        <dd><ul>
                            ${(tracks
                                .map(track => strings('listingPage.listTracks.withLyrics.track', {
                                    track: strings.link.track(track, {to}),
                                }))
                                .map(row => `<li>${row}</li>`)
                                .join('\n'))}
                        </dd></ul>
                    `).join('\n')}
                </dl>
            `;
        }
    },

    {
        directory: 'tags/by-name',
        title: ({strings}) => strings('listingPage.listTags.byName.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.artTagUI,

        data({wikiData}) {
            return wikiData.tagData
                .filter(tag => !tag.isCW)
                .sort(sortByName)
                .map(tag => ({tag, timesUsed: tag.things.length}));
        },

        row({tag, timesUsed}, {strings, to}) {
            return strings('listingPage.listTags.byName.item', {
                tag: strings.link.tag(tag, {to}),
                timesUsed: strings.count.timesUsed(timesUsed, {unit: true})
            });
        }
    },

    {
        directory: 'tags/by-uses',
        title: ({strings}) => strings('listingPage.listTags.byUses.title'),
        condition: ({wikiData}) => wikiData.wikiInfo.features.artTagUI,

        data({wikiData}) {
            return wikiData.tagData
                .filter(tag => !tag.isCW)
                .map(tag => ({tag, timesUsed: tag.things.length}))
                .sort((a, b) => b.timesUsed - a.timesUsed);
        },

        row({tag, timesUsed}, {strings, to}) {
            return strings('listingPage.listTags.byUses.item', {
                tag: strings.link.tag(tag, {to}),
                timesUsed: strings.count.timesUsed(timesUsed, {unit: true})
            });
        }
    },

    {
        directory: 'random',
        title: ({strings}) => `Random Pages`,

        data: ({wikiData}) => ({
            officialAlbumData: wikiData.officialAlbumData,
            fandomAlbumData: wikiData.fandomAlbumData
        }),

        html: ({officialAlbumData, fandomAlbumData}, {strings, to}) => fixWS`
            <p>Choose a link to go to a random page in that category or album! If your browser doesn't support relatively modern JavaScript or you've disabled it, these links won't work - sorry.</p>
            <p class="js-hide-once-data">(Data files are downloading in the background! Please wait for data to load.)</p>
            <p class="js-show-once-data">(Data files have finished being downloaded. The links should work!)</p>
            <dl>
                <dt>Miscellaneous:</dt>
                <dd><ul>
                    <li>
                        <a href="#" data-random="artist">Random Artist</a>
                        (<a href="#" data-random="artist-more-than-one-contrib">&gt;1 contribution</a>)
                    </li>
                    <li><a href="#" data-random="album">Random Album (whole site)</a></li>
                    <li><a href="#" data-random="track">Random Track (whole site)</a></li>
                </ul></dd>
                ${[
                    {name: 'Official', albumData: officialAlbumData, code: 'official'},
                    {name: 'Fandom', albumData: fandomAlbumData, code: 'fandom'}
                ].map(category => fixWS`
                    <dt>${category.name}: (<a href="#" data-random="album-in-${category.code}">Random Album</a>, <a href="#" data-random="track-in-${category.code}">Random Track</a>)</dt>
                    <dd><ul>${category.albumData.map(album => fixWS`
                        <li><a style="${getLinkThemeString(album.color)}; --album-directory: ${album.directory}" href="#" data-random="track-in-album">${album.name}</a></li>
                    `).join('\n')}</ul></dd>
                `).join('\n')}
            </dl>
        `
    }
];

function writeListingPages({wikiData}) {
    const { listingSpec, wikiInfo } = wikiData;

    if (!wikiInfo.features.listings) {
        return;
    }

    return [
        writeListingIndex({wikiData}),
        ...listingSpec.map(listing => writeListingPage(listing, {wikiData})).filter(Boolean)
    ];
}

function writeListingIndex({wikiData}) {
    const { albumData, trackData, wikiInfo } = wikiData;

    const releasedTracks = trackData.filter(track => track.album.directory !== UNRELEASED_TRACKS_DIRECTORY);
    const releasedAlbums = albumData.filter(album => album.directory !== UNRELEASED_TRACKS_DIRECTORY);
    const duration = getTotalDuration(releasedTracks);

    return ({strings, writePage}) => writePage('listingIndex', '', ({to}) => ({
        title: strings('listingIndex.title'),

        main: {
            content: fixWS`
                <h1>${strings('listingIndex.title')}</h1>
                <p>${strings('listingIndex.infoLine', {
                    wiki: wikiInfo.name,
                    tracks: `<b>${strings.count.tracks(releasedTracks.length, {unit: true})}</b>`,
                    albums: `<b>${strings.count.albums(releasedAlbums.length, {unit: true})}</b>`,
                    duration: `<b>${strings.count.duration(duration, {approximate: true, unit: true})}</b>`
                })}</p>
                <hr>
                <p>${strings('listingIndex.exploreList')}</p>
                ${generateLinkIndexForListings(null, {strings, to, wikiData})}
            `
        },

        sidebarLeft: {
            content: generateSidebarForListings(null, {strings, to, wikiData})
        },

        nav: {simple: true}
    }))
}

function writeListingPage(listing, {wikiData}) {
    if (listing.condition && !listing.condition({wikiData})) {
        return null;
    }

    const { wikiInfo } = wikiData;

    const data = (listing.data
        ? listing.data({wikiData})
        : null);

    return ({strings, writePage}) => writePage('listing', listing.directory, ({to}) => ({
        title: listing.title({strings}),

        main: {
            content: fixWS`
                <h1>${listing.title({strings})}</h1>
                ${listing.html && (listing.data
                    ? listing.html(data, {strings, to})
                    : listing.html({strings, to}))}
                ${listing.row && fixWS`
                    <ul>
                        ${(data
                            .map(item => listing.row(item, {strings, to}))
                            .map(row => `<li>${row}</li>`)
                            .join('\n'))}
                    </ul>
                `}
            `
        },

        sidebarLeft: {
            content: generateSidebarForListings(listing, {strings, to, wikiData})
        },

        nav: {
            links: [
                {
                    href: to('localized.home'),
                    title: wikiInfo.shortName
                },
                {
                    href: to('localized.listingIndex'),
                    title: strings('listingIndex.title')
                },
                {
                    href: '',
                    title: listing.title({strings})
                }
            ]
        }
    }));
}

function generateSidebarForListings(currentListing, {strings, to, wikiData}) {
    return fixWS`
        <h1>${strings.link.listingIndex('', {text: strings('listingIndex.title'), to})}</h1>
        ${generateLinkIndexForListings(currentListing, {strings, to, wikiData})}
    `;
}

function generateLinkIndexForListings(currentListing, {strings, to, wikiData}) {
    const { listingSpec } = wikiData;

    return fixWS`
        <ul>
            ${(listingSpec
                .filter(({ condition }) => !condition || condition({wikiData}))
                .map(listing => fixWS`
                    <li ${classes(listing === currentListing && 'current')}>
                        <a href="${to('localized.listing', listing.directory)}">${listing.title({strings})}</a>
                    </li>
                `)
                .join('\n'))}
        </ul>
    `;
}

function filterAlbumsByCommentary(albums) {
    return albums.filter(album => [album, ...album.tracks].some(x => x.commentary));
}

function writeCommentaryPages({wikiData}) {
    const albums = filterAlbumsByCommentary(wikiData.albumData);

    if (!albums.length) {
        return;
    }

    return [
        writeCommentaryIndex({wikiData}),
        ...albums.map(album => writeAlbumCommentaryPage(album, {wikiData}))
    ];
}

function writeCommentaryIndex({wikiData}) {
    const data = filterAlbumsByCommentary(wikiData.albumData)
        .map(album => ({
            album,
            entries: [album, ...album.tracks].filter(x => x.commentary).map(x => x.commentary)
        }))
        .map(({ album, entries }) => ({
            album, entries,
            words: entries.join(' ').split(' ').length
        }));

    const totalEntries = data.reduce((acc, {entries}) => acc + entries.length, 0);
    const totalWords = data.reduce((acc, {words}) => acc + words, 0);

    return ({strings, writePage}) => writePage('commentaryIndex', '', ({to}) => ({
        title: strings('commentaryIndex.title'),

        main: {
            content: fixWS`
                <div class="long-content">
                    <h1>${strings('commentaryIndex.title')}</h1>
                    <p>${strings('commentaryIndex.infoLine', {
                        words: `<b>${strings.count.words(totalWords, {unit: true})}</b>`,
                        entries: `<b>${strings.count.commentaryEntries(totalEntries, {unit: true})}</b>`
                    })}</p>
                    <p>${strings('commentaryIndex.albumList.title')}</p>
                    <ul>
                        ${data
                            .map(({ album, entries, words }) => fixWS`
                                <li>${strings('commentaryIndex.albumList.item', {
                                    album: strings.link.albumCommentary(album, {to}),
                                    words: strings.count.words(words, {unit: true}),
                                    entries: strings.count.commentaryEntries(entries.length, {unit: true})
                                })}</li>
                            `)
                            .join('\n')}
                    </ul>
                </div>
            `
        },

        nav: {simple: true}
    }));
}

function writeAlbumCommentaryPage(album, {wikiData}) {
    const { wikiInfo } = wikiData;

    const entries = [album, ...album.tracks].filter(x => x.commentary).map(x => x.commentary);
    const words = entries.join(' ').split(' ').length;

    return ({strings, writePage}) => writePage('albumCommentary', album.directory, ({to}) => ({
        title: strings('albumCommentaryPage.title', {album: album.name}),
        stylesheet: getAlbumStylesheet(album, {to}),
        theme: getThemeString(album.color),

        main: {
            content: fixWS`
                <div class="long-content">
                    <h1>${strings('albumCommentaryPage.title', {
                        album: strings.link.album(album, {to})
                    })}</h1>
                    <p>${strings('albumCommentaryPage.infoLine', {
                        words: `<b>${strings.count.words(words, {unit: true})}</b>`,
                        entries: `<b>${strings.count.commentaryEntries(entries.length, {unit: true})}</b>`
                    })}</p>
                    ${album.commentary && fixWS`
                        <h3>${strings('albumCommentaryPage.entry.title.albumCommentary')}</h3>
                        <blockquote>
                            ${transformMultiline(album.commentary, {strings, to, wikiData})}
                        </blockquote>
                    `}
                    ${album.tracks.filter(t => t.commentary).map(track => fixWS`
                        <h3 id="${track.directory}">${strings('albumCommentaryPage.entry.title.trackCommentary', {
                            track: strings.link.track(track, {to})
                        })}</h3>
                        <blockquote style="${getLinkThemeString(track.color)}">
                            ${transformMultiline(track.commentary, {strings, to, wikiData})}
                        </blockquote>
                    `).join('\n')}
                </div>
            `
        },

        nav: {
            links: [
                {
                    href: to('localized.home'),
                    title: wikiInfo.shortName
                },
                {
                    href: to('localized.commentaryIndex'),
                    title: strings('commentaryIndex.title')
                },
                {
                    html: strings('albumCommentaryPage.nav.album', {
                        album: strings.link.albumCommentary(album, {class: 'current', to})
                    })
                }
            ]
        }
    }));
}

function writeTagPages({wikiData}) {
    const { tagData, wikiInfo } = wikiData;

    if (!wikiInfo.features.artTagUI) {
        return;
    }

    return tagData
        .filter(tag => !tag.isCW)
        .map(tag => writeTagPage(tag, {wikiData}));
}

function writeTagPage(tag, {wikiData}) {
    const { wikiInfo } = wikiData;
    const { things } = tag;

    return ({strings, writePage}) => writePage('tag', tag.directory, ({to}) => ({
        title: strings('tagPage.title', {tag: tag.name}),
        theme: getThemeString(tag.color),

        main: {
            classes: ['top-index'],
            content: fixWS`
                <h1>${strings('tagPage.title', {tag: tag.name})}</h1>
                <p class="quick-info">${strings('tagPage.infoLine', {
                    coverArts: strings.count.coverArts(things.length, {unit: true})
                })}</p>
                <div class="grid-listing">
                    ${getGridHTML({
                        strings, to,
                        entries: things.map(item => ({item})),
                        srcFn: thing => (thing.album
                            ? getTrackCover(thing, {to})
                            : getAlbumCover(thing, {to})),
                        hrefFn: thing => (thing.album
                            ? to('localized.track', thing.directory)
                            : to('localized.album', thing.directory))
                    })}
                </div>
            `
        },

        nav: {
            links: [
                {
                    href: to('localized.home'),
                    title: wikiInfo.shortName
                },
                wikiInfo.features.listings &&
                {
                    href: to('localized.listingIndex'),
                    title: strings('listingIndex.title')
                },
                {
                    html: strings('tagPage.nav.tag', {
                        tag: strings.link.tag(tag, {class: 'current', to})
                    })
                }
            ]
        }
    }));
}

function getArtistString(artists, {strings, to, showIcons = false, showContrib = false}) {
    return strings.list.and(artists.map(({ who, what }) => {
        const { urls, directory, name } = who;
        return [
            strings.link.artist(who, {to}),
            showContrib && what && `(${what})`,
            showIcons && urls.length && `<span class="icons">(${
                strings.list.unit(urls.map(url => iconifyURL(url, {strings, to})))
            })</span>`
        ].filter(Boolean).join(' ');
    }));
}

function getFlashDirectory(flash) {
    // const kebab = getKebabCase(flash.name.replace('[S] ', ''));
    // return flash.page + (kebab ? '-' + kebab : '');
    // return '' + flash.page;
    return '' + flash.directory;
}

function getTagDirectory({name}) {
    return getKebabCase(name);
}

function getAlbumListTag(album) {
    if (album.directory === UNRELEASED_TRACKS_DIRECTORY) {
        return 'ul';
    } else {
        return 'ol';
    }
}

function fancifyURL(url, {strings, album = false} = {}) {
    const domain = new URL(url).hostname;
    return fixWS`<a href="${url}" class="nowrap">${
        domain.includes('bandcamp.com') ? strings('misc.external.bandcamp') :
        [
            'music.solatrux.com'
        ].includes(domain) ? strings('misc.external.bandcamp.domain', {domain}) :
        [
            'types.pl'
        ].includes(domain) ? strings('misc.external.mastodon.domain', {domain}) :
        domain.includes('youtu') ? (album
            ? (url.includes('list=')
                ? strings('misc.external.youtube.playlist')
                : strings('misc.external.youtube.fullAlbum'))
            : strings('misc.external.youtube')) :
        domain.includes('soundcloud') ? strings('misc.external.soundcloud') :
        domain.includes('tumblr.com') ? strings('misc.external.tumblr') :
        domain.includes('twitter.com') ? strings('misc.external.twitter') :
        domain.includes('deviantart.com') ? strings('misc.external.deviantart') :
        domain.includes('wikipedia.org') ? strings('misc.external.wikipedia') :
        domain.includes('poetryfoundation.org') ? strings('misc.external.poetryFoundation') :
        domain.includes('instagram.com') ? strings('misc.external.instagram') :
        domain.includes('patreon.com') ? strings('misc.external.patreon') :
        domain
    }</a>`;
}

function fancifyFlashURL(url, flash, {strings}) {
    const link = fancifyURL(url, {strings});
    return `<span class="nowrap">${
        url.includes('homestuck.com') ? (isNaN(Number(flash.page))
            ? strings('misc.external.flash.homestuck.secret', {link})
            : strings('misc.external.flash.homestuck.page', {link, page: flash.page})) :
        url.includes('bgreco.net') ? strings('misc.external.flash.bgreco', {link}) :
        url.includes('youtu') ? strings('misc.external.flash.youtube', {link}) :
        link
    }</span>`;
}

function iconifyURL(url, {strings, to}) {
    const domain = new URL(url).hostname;
    const [ id, msg ] = (
        domain.includes('bandcamp.com') ? ['bandcamp', strings('misc.external.bandcamp')] :
        (
            domain.includes('music.solatrus.com')
        ) ? ['bandcamp', strings('misc.external.bandcamp.domain', {domain})] :
        (
            domain.includes('types.pl')
        ) ? ['mastodon', strings('misc.external.mastodon.domain', {domain})] :
        domain.includes('youtu') ? ['youtube', strings('misc.external.youtube')] :
        domain.includes('soundcloud') ? ['soundcloud', strings('misc.external.soundcloud')] :
        domain.includes('tumblr.com') ? ['tumblr', strings('misc.external.tumblr')] :
        domain.includes('twitter.com') ? ['twitter', strings('misc.external.twitter')] :
        domain.includes('deviantart.com') ? ['deviantart', strings('misc.external.deviantart')] :
        domain.includes('instagram.com') ? ['instagram', strings('misc.external.bandcamp')] :
        ['globe', strings('misc.external.domain', {domain})]
    );
    return fixWS`<a href="${url}" class="icon"><svg><title>${msg}</title><use href="${to('shared.staticFile', `icons.svg#icon-${id}`)}"></use></svg></a>`;
}

function chronologyLinks(currentThing, {
    strings, to, wikiData,
    headingString,
    contribKey,
    getThings
}) {
    const { albumData } = wikiData;

    const contributions = currentThing[contribKey];
    if (!contributions) {
        return '';
    }

    if (contributions.length > 8) {
        return `<div class="chronology">${strings('misc.chronology.seeArtistPages')}</div>`;
    }

    return contributions.map(({ who: artist }) => {
        const things = sortByDate(unique(getThings(artist)));
        const releasedThings = things.filter(thing => {
            const album = albumData.includes(thing) ? thing : thing.album;
            return !(album && album.directory === UNRELEASED_TRACKS_DIRECTORY);
        });
        const index = releasedThings.indexOf(currentThing);

        if (index === -1) return '';

        // TODO: This can pro8a8ly 8e made to use generatePreviousNextLinks?
        // We'd need to make generatePreviousNextLinks use toAnythingMan tho.
        const previous = releasedThings[index - 1];
        const next = releasedThings[index + 1];
        const parts = [
            previous && `<a href="${toAnythingMan(previous, {to, wikiData})}" title="${previous.name}">Previous</a>`,
            next && `<a href="${toAnythingMan(next, {to, wikiData})}" title="${next.name}">Next</a>`
        ].filter(Boolean);

        const stringOpts = {
            index: strings.count.index(index + 1, {strings}),
            artist: strings.link.artist(artist, {to})
        };

        return fixWS`
            <div class="chronology">
                <span class="heading">${strings(headingString, stringOpts)}</span>
                ${parts.length && `<span class="buttons">(${parts.join(', ')})</span>`}
            </div>
        `;
    }).filter(Boolean).join('\n');
}

function generateAlbumNavLinks(album, currentTrack, {strings, to}) {
    if (album.tracks.length <= 1) {
        return '';
    }

    const previousNextLinks = currentTrack && generatePreviousNextLinks('localized.track', currentTrack, album.tracks, {strings, to})
    const randomLink = `<a href="#" data-random="track-in-album" id="random-button">${
        (currentTrack
            ? strings('trackPage.nav.random')
            : strings('albumPage.nav.randomTrack'))
    }</a>`;

    return (previousNextLinks
        ? `(${previousNextLinks}<span class="js-hide-until-data">, ${randomLink}</span>)`
        : `<span class="js-hide-until-data">(${randomLink})</span>`);
}

function generateAlbumChronologyLinks(album, currentTrack, {strings, to}) {
    return [
        currentTrack && chronologyLinks(currentTrack, {
            strings, to, wikiData,
            headingString: 'misc.chronology.heading.track',
            contribKey: 'artists',
            getThings: artist => [...artist.tracks.asArtist, ...artist.tracks.asContributor]
        }),
        chronologyLinks(currentTrack || album, {
            strings, to, wikiData,
            headingString: 'misc.chronology.heading.coverArt',
            contribKey: 'coverArtists',
            getThings: artist => [...artist.albums.asCoverArtist, ...artist.tracks.asCoverArtist]
        })
    ].filter(Boolean).join('\n');
}

function generateSidebarForAlbum(album, currentTrack, {strings, to, wikiData}) {
    const listTag = getAlbumListTag(album);

    const trackToListItem = track => `<li ${classes(track === currentTrack && 'current')}>${
        strings('albumSidebar.trackList.item', {
            track: strings.link.track(track, {to})
        })
    }</li>`;

    const trackListPart = fixWS`
        <h1><a href="${to('localized.album', album.directory)}">${album.name}</a></h1>
        ${(album.trackGroups
            ? album.trackGroups.map(({ name, color, startIndex, tracks }) =>
                html.tag('details', {
                    // Leave side8ar track groups collapsed on al8um homepage,
                    // since there's already a view of all the groups expanded
                    // in the main content area.
                    open: currentTrack && tracks.includes(currentTrack),
                    class: tracks.includes(currentTrack) && 'current'
                }, [
                    html.tag('summary',
                        {style: getLinkThemeString(color)},
                        (listTag === 'ol'
                            ? strings('albumSidebar.trackList.group.withRange', {
                                group: `<span class="group-name">${name}</span>`,
                                range: `${startIndex + 1}&ndash;${startIndex + tracks.length}`
                            })
                            : strings('albumSidebar.trackList.group', {
                                group: `<span class="group-name">${name}</span>`
                            }))
                    ),
                    fixWS`
                        <${listTag === 'ol' ? `ol start="${startIndex + 1}"` : listTag}>
                            ${tracks.map(trackToListItem).join('\n')}
                        </${listTag}>
                    `
                ])).join('\n')
            : fixWS`
                <${listTag}>
                    ${album.tracks.map(trackToListItem).join('\n')}
                </${listTag}>
            `)}
    `;

    const { groups } = album;

    const groupParts = groups.map(group => {
        const index = group.albums.indexOf(album);
        const next = group.albums[index + 1];
        const previous = group.albums[index - 1];
        return {group, next, previous};
    }).map(({group, next, previous}) => fixWS`
        <h1>${
            strings('albumSidebar.groupBox.title', {
                group: `<a href="${to('localized.groupInfo', group.directory)}">${group.name}</a>`
            })
        }</h1>
        ${!currentTrack && transformMultiline(group.descriptionShort, {strings, to, wikiData})}
        ${group.urls.length && `<p>${
            strings('releaseInfo.visitOn', {
                links: strings.list.or(group.urls.map(url => fancifyURL(url, {strings})))
            })
        }</p>`}
        ${!currentTrack && fixWS`
            ${next && `<p class="group-chronology-link">${
                strings('albumSidebar.groupBox.next', {
                    album: `<a href="${to('localized.album', next.directory)}" style="${getLinkThemeString(next.color)}">${next.name}</a>`
                })
            }</p>`}
            ${previous && `<p class="group-chronology-link">${
                strings('albumSidebar.groupBox.previous', {
                    album: `<a href="${to('localized.album', previous.directory)}" style="${getLinkThemeString(previous.color)}">${previous.name}</a>`
                })
            }</p>`}
        `}
    `);

    if (groupParts.length) {
        if (currentTrack) {
            const combinedGroupPart = groupParts.join('\n<hr>\n');
            return {
                multiple: [
                    trackListPart,
                    combinedGroupPart
                ]
            };
        } else {
            return {
                multiple: [
                    ...groupParts,
                    trackListPart
                ]
            };
        }
    } else {
        return {
            content: trackListPart
        };
    }
}

function generateSidebarForGroup(currentGroup, {isGallery, strings, to, wikiData}) {
    const { groupCategoryData, wikiInfo } = wikiData;

    if (!wikiInfo.features.groupUI) {
        return null;
    }

    const urlKey = isGallery ? 'localized.groupGallery' : 'localized.groupInfo';

    return {
        content: fixWS`
            <h1>${strings('groupSidebar.title')}</h1>
            <dl>
                ${groupCategoryData.map(category => [
                    fixWS`
                        <dt ${classes(category === currentGroup.category && 'current')}>${
                            strings('groupSidebar.groupList.category', {
                                category: `<a href="${to(urlKey, category.groups[0].directory)}" style="${getLinkThemeString(category.color)}">${category.name}</a>`
                            })
                        }</dt>
                        <dd><ul>
                            ${category.groups.map(group => fixWS`
                                <li ${classes(group === currentGroup && 'current')} style="${getLinkThemeString(group.color)}">${
                                    strings('groupSidebar.groupList.item', {
                                        group: `<a href="${to(urlKey, group.directory)}">${group.name}</a>`
                                    })
                                }</li>
                            `).join('\n')}
                        </ul></dd>
                    `
                ]).join('\n')}
            </dl>
        `
    };
}

function generateInfoGalleryLinks(urlKeyInfo, urlKeyGallery, currentThing, isGallery, {strings, to}) {
    return [
        strings.link[urlKeyInfo](currentThing, {
            to,
            class: isGallery ? '' : 'current',
            text: strings('misc.nav.info')
        }),
        strings.link[urlKeyGallery](currentThing, {
            to,
            class: isGallery ? 'current' : '',
            text: strings('misc.nav.gallery')
        })
    ].join(', ');
}

function generatePreviousNextLinks(urlKey, currentThing, thingData, {strings, to}) {
    const index = thingData.indexOf(currentThing);
    const previous = thingData[index - 1];
    const next = thingData[index + 1];

    return [
        previous && `<a href="${to(urlKey, previous.directory)}" id="previous-button" title="${previous.name}">${strings('misc.nav.previous')}</a>`,
        next && `<a href="${to(urlKey, next.directory)}" id="next-button" title="${next.name}">${strings('misc.nav.next')}</a>`
    ].filter(Boolean).join(', ');
}

function generateNavForGroup(currentGroup, {isGallery, strings, to, wikiData}) {
    const { groupData, wikiInfo } = wikiData;

    if (!wikiInfo.features.groupUI) {
        return {simple: true};
    }

    const urlKey = isGallery ? 'localized.groupGallery' : 'localized.groupInfo';
    const linkKey = isGallery ? 'groupGallery' : 'groupInfo';

    const infoGalleryLinks = generateInfoGalleryLinks('groupInfo', 'groupGallery', currentGroup, isGallery, {strings, to});
    const previousNextLinks = generatePreviousNextLinks(urlKey, currentGroup, groupData, {strings, to})

    return {
        links: [
            {
                href: to('localized.home'),
                title: wikiInfo.shortName
            },
            wikiInfo.features.listings &&
            {
                href: to('localized.listingIndex'),
                title: strings('listingIndex.title')
            },
            {
                html: strings('groupPage.nav.group', {
                    group: strings.link[linkKey](currentGroup, {class: 'current', to})
                })
            },
            {
                divider: false,
                html: (previousNextLinks
                    ? `(${infoGalleryLinks}; ${previousNextLinks})`
                    : `(${previousNextLinks})`)
            }
        ]
    };
}

function writeGroupPages({wikiData}) {
    return wikiData.groupData.map(group => writeGroupPage(group, {wikiData}));
}

function writeGroupPage(group, {wikiData}) {
    const { wikiInfo } = wikiData;

    const releasedAlbums = group.albums.filter(album => album.directory !== UNRELEASED_TRACKS_DIRECTORY);
    const releasedTracks = releasedAlbums.flatMap(album => album.tracks);
    const totalDuration = getTotalDuration(releasedTracks);

    return async ({strings, writePage}) => {
        await writePage('groupInfo', group.directory, ({to}) => ({
            title: strings('groupInfoPage.title', {group: group.name}),
            theme: getThemeString(group.color),

            main: {
                content: fixWS`
                    <h1>${strings('groupInfoPage.title', {group: group.name})}</h1>
                    ${group.urls.length && `<p>${
                        strings('releaseInfo.visitOn', {
                            links: strings.list.or(group.urls.map(url => fancifyURL(url, {strings})))
                        })
                    }</p>`}
                    <blockquote>
                        ${transformMultiline(group.description, {strings, to, wikiData})}
                    </blockquote>
                    <h2>${strings('groupInfoPage.albumList.title')}</h2>
                    <p>${
                        strings('groupInfoPage.viewAlbumGallery', {
                            link: `<a href="${to('localized.groupGallery', group.directory)}">${
                                strings('groupInfoPage.viewAlbumGallery.link')
                            }</a>`
                        })
                    }</p>
                    <ul>
                        ${group.albums.map(album => fixWS`
                            <li>${
                                strings('groupInfoPage.albumList.item', {
                                    year: album.date.getFullYear(),
                                    album: `<a href="${to('localized.album', album.directory)}" style="${getLinkThemeString(album.color)}">${album.name}</a>`
                                })
                            }</li>
                        `).join('\n')}
                    </ul>
                `
            },

            sidebarLeft: generateSidebarForGroup(group, {isGallery: false, strings, to, wikiData}),
            nav: generateNavForGroup(group, {isGallery: false, strings, to, wikiData})
        }));

        await writePage('groupGallery', group.directory, ({to}) => ({
            title: strings('groupGalleryPage.title', {group: group.name}),
            theme: getThemeString(group.color),

            main: {
                classes: ['top-index'],
                content: fixWS`
                    <h1>${strings('groupGalleryPage.title', {group: group.name})}</h1>
                    <p class="quick-info">${
                        strings('groupGalleryPage.infoLine', {
                            tracks: `<b>${strings.count.tracks(releasedTracks.length, {unit: true})}</b>`,
                            albums: `<b>${strings.count.albums(releasedAlbums.length, {unit: true})}</b>`,
                            time: `<b>${strings.count.duration(totalDuration, {unit: true})}</b>`
                        })
                    }</p>
                    ${wikiInfo.features.groupUI && wikiInfo.features.listings && `<p class="quick-info">(<a href="${to('localized.listing', 'groups/by-category')}">Choose another group to filter by!</a>)</p>`}
                    <div class="grid-listing">
                        ${getAlbumGridHTML({
                            strings, to,
                            entries: sortByDate(group.albums.map(item => ({item}))).reverse(),
                            details: true
                        })}
                    </div>
                `
            },

            sidebarLeft: generateSidebarForGroup(group, {isGallery: true, strings, to, wikiData}),
            nav: generateNavForGroup(group, {isGallery: true, strings, to, wikiData})
        }));
    };
}

function toAnythingMan(anythingMan, {to, wikiData}) {
    return (
        wikiData.albumData.includes(anythingMan) ? to('localized.album', anythingMan.directory) :
        wikiData.trackData.includes(anythingMan) ? to('localized.track', anythingMan.directory) :
        wikiData.flashData?.includes(anythingMan) ? to('localized.flash', anythingMan.directory) :
        'idk-bud'
    )
}

function getAlbumCover(album, {to}) {
    return to('media.albumCover', album.directory);
}

function getTrackCover(track, {to}) {
    // Some al8ums don't have any track art at all, and in those, every track
    // just inherits the al8um's own cover art.
    if (track.coverArtists === null) {
        return getAlbumCover(track.album, {to});
    } else {
        return to('media.trackCover', track.album.directory, track.directory);
    }
}

function getFlashLink(flash) {
    return `https://homestuck.com/story/${flash.page}`;
}

function classes(...args) {
    const values = args.filter(Boolean);
    return `class="${values.join(' ')}"`;
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
            link, // Technically unnecessary 8ut future-proofing, 'mkay?
            list
        }
    });
}

// Wrapper function for running a function once for all languages. It provides:
// * the language strings
// * a shadowing writePages function for outputing to the appropriate subdir
// * a shadowing urls object for linking to the appropriate relative paths
async function wrapLanguages(fn, {writeOneLanguage = null, wikiData}) {
    const k = writeOneLanguage
    const languagesToRun = (k
        ? {[k]: languages[k]}
        : languages)

    const entries = Object.entries(languagesToRun)
        .filter(([ key ]) => key !== 'default');

    for (let i = 0; i < entries.length; i++) {
        const [ key, strings ] = entries[i];

        const baseDirectory = (strings === languages.default ? '' : strings.code);

        const shadow_writePage = (urlKey, directory, pageFn) => writePage(urlKey, directory, pageFn, {baseDirectory, strings, wikiData});

        // 8ring the utility functions over too!
        Object.assign(shadow_writePage, writePage);

        await fn({
            baseDirectory,
            strings,
            wikiData,
            writePage: shadow_writePage
        }, i, entries);
    }
}

async function main() {
    const WD = wikiData;

    WD.listingSpec = listingSpec;

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
        error(!dataPath,   `Expected --data option or HSMUSIC_DATA to be set`);
        error(!mediaPath,  `Expected --media option or HSMUSIC_MEDIA to be set`);
        error(!outputPath, `Expected --out option or HSMUSIC_OUT to be set`);
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
            }
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

    // NOT for ena8ling or disa8ling specific features of the site!
    // This is only in charge of what general groups of files to 8uild.
    // They're here to make development quicker when you're only working
    // on some particular area(s) of the site rather than making changes
    // across all of them.
    const writeFlags = await parseOptions(process.argv.slice(2), {
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

    const writeAll = !Object.keys(writeFlags).length || writeFlags.all;

    logInfo`Writing site pages: ${writeAll ? 'all' : Object.keys(writeFlags).join(', ')}`;

    await writeSymlinks();
    await writeSharedFilesAndPages({strings: defaultStrings, wikiData});

    const buildDictionary = {
        misc: writeMiscellaneousPages,
        news: writeNewsPages,
        list: writeListingPages,
        tag: writeTagPages,
        commentary: writeCommentaryPages,
        static: writeStaticPages,
        group: writeGroupPages,
        album: writeAlbumPages,
        track: writeTrackPages,
        artist: writeArtistPages,
        flash: writeFlashPages
    };

    const buildSteps = (writeAll
        ? Object.values(buildDictionary)
        : (Object.entries(buildDictionary)
            .filter(([ flag ]) => writeFlags[flag])
            .map(([ flag, fn ]) => fn)));

    // *NB: While what's 8elow is 8asically still true in principle, the
    //      format is QUITE DIFFERENT than what's descri8ed here! There
    //      will 8e actual document8tion on like, what the return format
    //      looks like soon, once we implement a 8unch of other pages and
    //      are certain what they actually, uh, will look like, in the end.*
    //
    // The writeThingPages functions don't actually immediately do any file
    // writing themselves; an initial call will only gather the relevant data
    // which is *then* used for writing. So the return value is a function
    // (or an array of functions) which expects {writePage, strings}, and
    // *that's* what we call after -- multiple times, once for each language.
    let writes;
    {
        let error = false;

        writes = buildSteps.flatMap(fn => {
            const fns = fn({wikiData}) || [];

            // Do a quick valid8tion! If one of the writeThingPages functions go
            // wrong, this will stall out early and tell us which did.
            if (!Array.isArray(fns)) {
                logError`${fn.name} didn't return an array!`;
                error = true;
            } else if (fns.every(entry => Array.isArray(entry))) {
                if (!(
                    fns.every(entry => entry.every(obj => typeof obj === 'object')) &&
                    fns.every(entry => entry.every(obj => {
                        const result = validateWriteObject(obj);
                        if (result.error) {
                            logError`Validating write object failed: ${result.error}`;
                            return false;
                        } else {
                            return true;
                        }
                    }))
                )) {
                    logError`${fn.name} uses updated format, but entries are invalid!`;
                    error = true;
                }

                return fns.flatMap(writes => writes);
            } else if (fns.some(fn => typeof fn !== 'function')) {
                logError`${fn.name} didn't return all functions or all arrays!`;
                error = true;
            }

            return fns;
        });

        if (error) {
            return;
        }

        // The modern(TM) return format for each writeThingPages function is an
        // array of arrays, each of which's items are 8ig Complicated Objects
        // that 8asically look like {type, path, content}. 8ut surprise, these
        // aren't actually implemented in most places yet! So, we transform
        // stuff in the old format here. 'Scept keep in mind, the OLD FORMAT
        // doesn't really give us most of the info we want for Cool And Modern
        // Reasons, so they're going into a fancy {type: 'legacy'} sort of
        // o8ject, with a plain {write} property for, uh, the writing stuff,
        // same as usual.
        //
        // I promise this document8tion will get 8etter when we make progress
        // actually moving old pages over. Also it'll 8e hecks of less work
        // than previous restructures, don't worry.
        writes = writes.map(entry =>
            typeof entry === 'object' ? entry :
            typeof entry === 'function' ? {type: 'legacy', write: entry} :
            {type: 'wut', entry});

        const wut = writes.filter(({ type }) => type === 'wut');
        if (wut.length) {
            // Oh g*d oh h*ck.
            logError`Uhhhhh writes contains something 8esides o8jects and functions?`;
            logError`Definitely a 8ug!`;
            console.log(wut);
            return;
        }
    }

    const localizedWrites = writes.filter(({ type }) => type === 'page' || type === 'legacy');
    const dataWrites = writes.filter(({ type }) => type === 'data');

    await progressPromiseAll(`Writing data files shared across languages.`, queue(
        // TODO: This only supports one <>-style argument.
        dataWrites.map(({path, data}) => () => writeData(path[0], path[1], data())),
        queueSize
    ));

    await wrapLanguages(async ({strings, ...opts}, i, entries) => {
        console.log(`\x1b[34;1m${
            (`[${i + 1}/${entries.length}] ${strings.code} (-> /${opts.baseDirectory}) `
                .padEnd(60, '-'))
        }\x1b[0m`);
        await progressPromiseAll(`Writing ${strings.code}`, queue(
            localizedWrites.map(({type, ...props}) => () => {
                switch (type) {
                    case 'legacy': {
                        const { write } = props;
                        return write({strings, ...opts});
                    }
                    case 'page': {
                        const { path, page } = props;
                        // TODO: This only supports one <>-style argument.
                        return opts.writePage(path[0], path[1], ({to}) => page({strings, to}));
                    }
                }
            }),
            queueSize
        ));
    }, {writeOneLanguage, wikiData});

    decorateTime.displayTime();

    // The single most important step.
    logInfo`Written!`;
}

main().catch(error => console.error(error));
