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
//      Like three years later oh god: SURPISE! We went with the latter, but
//      they're YAML now. Probably. Assuming that hasn't changed, yet.
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
    copyFile,
    mkdir,
    readFile,
    stat,
    symlink,
    writeFile,
    unlink,
} from 'fs/promises';

import { inspect as nodeInspect } from 'util';

import genThumbs from './gen-thumbs.js';
import { listingSpec, listingTargetSpec } from './listing-spec.js';
import urlSpec from './url-spec.js';
import * as pageSpecs from './page/index.js';

import find, { bindFind } from './util/find.js';
import * as html from './util/html.js';
import unbound_link, {getLinkThemeString} from './util/link.js';
import { findFiles } from './util/io.js';

import CacheableObject from './data/cacheable-object.js';

import { serializeThings } from './data/serialize.js';

import {
    Language,
} from './data/things.js';

import {
    filterDuplicateDirectories,
    filterReferenceErrors,
    linkWikiDataArrays,
    loadAndProcessDataDocuments,
    sortWikiDataArrays,
    WIKI_INFO_FILE,
} from './data/yaml.js';

import {
    fancifyFlashURL,
    fancifyURL,
    generateAdditionalFilesShortcut,
    generateAdditionalFilesList,
    generateChronologyLinks,
    generateCoverLink,
    generateInfoGalleryLinks,
    generatePreviousNextLinks,
    getAlbumGridHTML,
    getAlbumStylesheet,
    getArtistString,
    getFlashGridHTML,
    getFooterLocalizationLinks,
    getGridHTML,
    getRevealStringFromTags,
    getRevealStringFromWarnings,
    getThemeString,
    iconifyURL
} from './misc-templates.js';

import {
    color,
    decorateTime,
    logWarn,
    logInfo,
    logError,
    parseOptions,
    progressPromiseAll,
    ENABLE_COLOR
} from './util/cli.js';

import {
    validateReplacerSpec,
    transformInline
} from './util/replacer.js';

import {
    chunkByConditions,
    chunkByProperties,
    getAlbumCover,
    getAlbumListTag,
    getAllTracks,
    getArtistAvatar,
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
    decorateErrorWithIndex,
    filterAggregateAsync,
    filterEmptyLines,
    mapAggregate,
    mapAggregateAsync,
    openAggregate,
    queue,
    showAggregate,
    splitArray,
    unique,
    withAggregate,
    withEntries
} from './util/sugar.js';

import {
    generateURLs,
    thumb
} from './util/urls.js';

// Pensive emoji!
import {
    FANDOM_GROUP_DIRECTORY,
    OFFICIAL_GROUP_DIRECTORY
} from './util/magic-constants.js';

import FileSizePreloader from './file-size-preloader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CACHEBUST = 8;

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

// This exists adjacent to index.html for any page with oEmbed metadata.
const OEMBED_JSON_FILE = 'oembed.json';

// Automatically copied (if present) from media directory to site root.
const FAVICON_FILE = 'favicon.ico';

function inspect(value) {
    return nodeInspect(value, {colors: ENABLE_COLOR});
}

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

const urls = generateURLs(urlSpec);

function splitLines(text) {
    return text.split(/\r\n|\r|\n/);
}

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
        html: (date, {language}) => `<time datetime="${date.toString()}">${language.formatDate(date)}</time>`
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
    'home': {
        find: null,
        link: 'home'
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
        html: (ref, {language, args}) => language.$(ref, args)
    },
    'tag': {
        find: 'artTag',
        link: 'tag'
    },
    'track': {
        find: 'track',
        link: 'track'
    }
};

if (!validateReplacerSpec(replacerSpec, {find, link: unbound_link})) {
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

function joinLineBreaks(sourceLines) {
    const outLines = [];

    let lineSoFar = '';
    for (let i = 0; i < sourceLines.length; i++) {
        const line = sourceLines[i];
        lineSoFar += line;
        if (!line.endsWith('<br>')) {
            outLines.push(lineSoFar);
            lineSoFar = '';
        }
    }

    if (lineSoFar) {
        outLines.push(lineSoFar);
    }

    return outLines;
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

    let lines = splitLines(text);
    lines = joinLineBreaks(lines);
    for (let line of lines) {
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

            // let some escaped symbols display as the normal symbol, since the
            // point of escaping them is just to avoid having them be treated as
            // syntax markers!
            if (lineContent.match(/( *)\\-/)) {
                lineContent = lineContent.replace('\\-', '-');
            } else if (lineContent.match(/( *)\\>/)) {
                lineContent = lineContent.replace('\\>', '>');
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

function stringifyThings(thingData) {
    return JSON.stringify(serializeThings(thingData));
}

function img({
    src,
    alt,
    noSrcText = '',
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
    const thumbSrc = src && (thumbKey ? thumb[thumbKey](src) : src);

    const imgAttributes = html.attributes({
        id: link ? '' : id,
        class: className,
        alt,
        width,
        height
    });

    const noSrcHTML = !src && wrap(`<div class="image-text-area">${noSrcText}</div>`);
    const nonlazyHTML = src && wrap(`<img src="${thumbSrc}" ${imgAttributes}>`);
    const lazyHTML = src && lazy && wrap(`<img class="lazy" data-original="${thumbSrc}" ${imgAttributes}>`, true);

    if (!src) {
        return noSrcHTML;
    } else if (lazy) {
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

/*
async function writeData(subKey, directory, data) {
    const paths = writePage.paths('', 'data.' + subKey, directory, {file: 'data.json'});
    await writePage.write(JSON.stringify(data), {paths});
}
*/

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

    let from;
    let to;

    // When linking to *outside* the localized area of the site, we need to
    // make sure the result is correctly relative to the 8ase directory.
    if (groupKey !== 'localized' && groupKey !== 'localizedDefaultLanguage' && baseDirectory) {
        from = 'localizedWithBaseDirectory.' + pageSubKey;
        to = targetFullKey;
    } else if (groupKey === 'localizedDefaultLanguage' && baseDirectory) {
        // Special case for specifically linking *from* a page with base
        // directory *to* a page without! Used for the language switcher and
        // hopefully nothing else oh god.
        from = 'localizedWithBaseDirectory.' + pageSubKey;
        to = 'localized.' + subKey;
    } else if (groupKey === 'localizedDefaultLanguage') {
        // Linking to the default, except surprise, we're already IN the default
        // (no baseDirectory set).
        from = 'localized.' + pageSubKey;
        to = 'localized.' + subKey;
    } else {
        // If we're linking inside the localized area (or there just is no
        // 8ase directory), the 8ase directory doesn't matter.
        from = 'localized.' + pageSubKey;
        to = targetFullKey;
    }

    path += urls.from(from).to(to, ...args);

    return path;
};

writePage.html = (pageInfo, {
    defaultLanguage,
    language,
    languages,
    localizedPaths,
    paths,
    oEmbedJSONHref,
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
        footer = {},
        socialEmbed = {},
    } = pageInfo;

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
    footer.content ??= (wikiInfo.footerContent ? transformMultiline(wikiInfo.footerContent) : '');

    footer.content += '\n' + getFooterLocalizationLinks(paths.pathname, {
        defaultLanguage, languages, paths, language, to
    });

    const canonical = (wikiInfo.canonicalBase
        ? wikiInfo.canonicalBase + (paths.pathname === '/' ? '' : paths.pathname)
        : '');

    const localizedCanonical = (wikiInfo.canonicalBase
        ? Object.entries(localizedPaths).map(([ code, { pathname } ]) => ({
            lang: code,
            href: wikiInfo.canonicalBase + (pathname === '/' ? '' : pathname)
        }))
        : []);

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
            linkTitle ??= wikiInfo.nameShort;
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
                    cur.href ? (() => {
                        logWarn`Using legacy href format nav link in ${paths.pathname}`;
                        return cur.href;
                    })() :
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
                            reveal: getRevealStringFromWarnings('<span class="info-card-art-warnings"></span>', {language})
                        })}
                    </div>
                    <h1 class="info-card-name"><a></a></h1>
                    <p class="info-card-album">${language.$('releaseInfo.from', {album: '<a></a>'})}</p>
                    <p class="info-card-artists">${language.$('releaseInfo.by', {artists: '<span></span>'})}</p>
                    <p class="info-card-cover-artists">${language.$('releaseInfo.coverArtBy', {artists: '<span></span>'})}</p>
                </div>
            </div>
        </div>
    `;

    const socialEmbedHTML = [
        socialEmbed.title && html.tag('meta', {property: 'og:title', content: socialEmbed.title}),
        socialEmbed.description && html.tag('meta', {property: 'og:description', content: socialEmbed.description}),
        socialEmbed.image && html.tag('meta', {property: 'og:image', content: socialEmbed.image}),
        socialEmbed.color && html.tag('meta', {name: 'theme-color', content: socialEmbed.color}),
        oEmbedJSONHref && html.tag('link', {type: 'application/json+oembed', href: oEmbedJSONHref}),
    ].filter(Boolean).join('\n');

    return filterEmptyLines(fixWS`
        <!DOCTYPE html>
        <html ${html.attributes({
            lang: language.code,
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
                ${localizedCanonical.map(({ lang, href }) => `<link rel="alternate" hreflang="${lang}" href="${href}">`).join('\n')}
                ${socialEmbedHTML}
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
                                ['#content', language.$('misc.skippers.skipToContent')],
                                sidebarLeftHTML && ['#sidebar-left', (sidebarRightHTML
                                    ? language.$('misc.skippers.skipToSidebar.left')
                                    : language.$('misc.skippers.skipToSidebar'))],
                                sidebarRightHTML && ['#sidebar-right', (sidebarLeftHTML
                                    ? language.$('misc.skippers.skipToSidebar.right')
                                    : language.$('misc.skippers.skipToSidebar'))],
                                footerHTML && ['#footer', language.$('misc.skippers.skipToFooter')]
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

writePage.oEmbedJSON = (pageInfo, {
    language,
    wikiData,
}) => {
    const { socialEmbed } = pageInfo;
    const { wikiInfo } = wikiData;
    const { canonicalBase, nameShort } = wikiInfo;

    if (!socialEmbed) return '';

    const entries = [
        socialEmbed.heading && ['author_name',
            language.$('misc.socialEmbed.heading', {
                wikiName: nameShort,
                heading: socialEmbed.heading
            })],
        socialEmbed.headingLink && canonicalBase && ['author_url',
            canonicalBase.replace(/\/$/, '') + '/' +
            socialEmbed.headingLink.replace(/^\//, '')],
    ].filter(Boolean);

    if (!entries.length) return '';

    return JSON.stringify(Object.fromEntries(entries));
};

writePage.write = async ({
    html,
    oEmbedJSON = '',
    paths,
}) => {
    await mkdir(paths.outputDirectory, {recursive: true});
    await Promise.all([
        writeFile(paths.outputFile, html),
        oEmbedJSON && writeFile(paths.oEmbedJSONFile, oEmbedJSON)
    ].filter(Boolean));
};

// TODO: This only supports one <>-style argument.
writePage.paths = (baseDirectory, fullKey, directory = '', {
    file = 'index.html'
} = {}) => {
    const [ groupKey, subKey ] = fullKey.split('.');

    const pathname = (groupKey === 'localized' && baseDirectory
        ? urls.from('shared.root').toDevice('localizedWithBaseDirectory.' + subKey, baseDirectory, directory)
        : urls.from('shared.root').toDevice(fullKey, directory));

    // Needed for the rare directory which itself contains a slash, e.g. for
    // listings, with directories like 'albums/by-name'.
    const subdirectoryPrefix = '../'.repeat(directory.split('/').length - 1);

    const outputDirectory = path.join(outputPath, pathname);
    const outputFile = path.join(outputDirectory, file);
    const oEmbedJSONFile = path.join(outputDirectory, OEMBED_JSON_FILE);

    return {
        toPath: [fullKey, directory],
        pathname,
        subdirectoryPrefix,
        outputDirectory, outputFile,
        oEmbedJSONFile,
    };
};

async function writeFavicon() {
    try {
        await stat(path.join(mediaPath, FAVICON_FILE));
    } catch (error) {
        return;
    }

    try {
        await copyFile(
            path.join(mediaPath, FAVICON_FILE),
            path.join(outputPath, FAVICON_FILE)
        );
    } catch (error) {
        logWarn`Failed to copy favicon! ${error.message}`;
        return;
    }

    logInfo`Copied favicon to site root.`;
}

function writeSymlinks() {
    return progressPromiseAll('Writing site symlinks.', [
        link(path.join(__dirname, UTILITY_DIRECTORY), 'shared.utilityRoot'),
        link(path.join(__dirname, STATIC_DIRECTORY), 'shared.staticRoot'),
        link(mediaPath, 'media.root')
    ]);

    async function link(directory, urlKey) {
        const pathname = urls.from('shared.root').toDevice(urlKey);
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

function writeSharedFilesAndPages({language, wikiData}) {
    const { groupData, wikiInfo } = wikiData;

    const redirect = async (title, from, urlKey, directory) => {
        const target = path.relative(from, urls.from('shared.root').to(urlKey, directory));
        const content = generateRedirectPage(title, target, {language});
        await mkdir(path.join(outputPath, from), {recursive: true});
        await writeFile(path.join(outputPath, from, 'index.html'), content);
    };

    return progressPromiseAll(`Writing files & pages shared across languages.`, [
        groupData?.some(group => group.directory === 'fandom') &&
        redirect('Fandom - Gallery', 'albums/fandom', 'localized.groupGallery', 'fandom'),

        groupData?.some(group => group.directory === 'official') &&
        redirect('Official - Gallery', 'albums/official', 'localized.groupGallery', 'official'),

        wikiInfo.enableListings &&
        redirect('Album Commentary', 'list/all-commentary', 'localized.commentaryIndex', ''),

        writeFile(path.join(outputPath, 'data.json'), fixWS`
            {
                "albumData": ${stringifyThings(wikiData.albumData)},
                ${wikiInfo.enableFlashesAndGames && `"flashData": ${stringifyThings(wikiData.flashData)},`}
                "artistData": ${stringifyThings(wikiData.artistData)}
            }
        `)
    ].filter(Boolean));
}

function generateRedirectPage(title, target, {language}) {
    return fixWS`
        <!DOCTYPE html>
        <html>
            <head>
                <title>${language.$('redirectPage.title', {title})}</title>
                <meta charset="utf-8">
                <meta http-equiv="refresh" content="0;url=${target}">
                <link rel="canonical" href="${target}">
                <link rel="stylesheet" href="static/site-basic.css">
            </head>
            <body>
                <main>
                    <h1>${language.$('redirectPage.title', {title})}</h1>
                    <p>${language.$('redirectPage.infoLine', {
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

async function processLanguageFile(file) {
    const contents = await readFile(file, 'utf-8');
    const json = JSON.parse(contents);

    const code = json['meta.languageCode'];
    if (!code) {
        throw new Error(`Missing language code (file: ${file})`);
    }
    delete json['meta.languageCode'];

    const intlCode = json['meta.languageIntlCode'] ?? null;
    delete json['meta.languageIntlCode'];

    const name = json['meta.languageName'];
    if (!name) {
        throw new Error(`Missing language name (${code})`);
    }
    delete json['meta.languageName'];

    if (json['meta.baseDirectory']) {
        logWarn`(${code}) Language JSON still has unused meta.baseDirectory`;
        delete json['meta.baseDirectory'];
    }

    const language = new Language();
    language.code = code;
    language.intlCode = intlCode;
    language.name = name;
    language.escapeHTML = string => he.encode(string, {useNamedReferences: true});
    language.strings = json;
    return language;
}

// Wrapper function for running a function once for all languages.
async function wrapLanguages(fn, {languages, writeOneLanguage = null}) {
    const k = writeOneLanguage;
    const languagesToRun = (k
        ? {[k]: languages[k]}
        : languages);

    const entries = Object.entries(languagesToRun)
        .filter(([ key ]) => key !== 'default');

    for (let i = 0; i < entries.length; i++) {
        const [ key, language ] = entries[i];

        await fn(language, i, entries);
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

        // Just working on data entries and not interested in actually
        // generating site HTML yet? This flag will cut execution off right
        // 8efore any site 8uilding actually happens.
        'no-build': {
            type: 'flag'
        },

        // Only want to 8uild one language during testing? This can chop down
        // 8uild times a pretty 8ig chunk! Just pass a single language code.
        'lang': {
            type: 'value'
        },

        // Working without a dev server and just using file:// URLs in your we8
        // 8rowser? This will automatically append index.html to links across
        // the site. Not recommended for production, since it isn't guaranteed
        // 100% error-free (and index.html-style links are less pretty anyway).
        'append-index-html': {
            type: 'flag'
        },

        // Want sweet, sweet trace8ack info in aggreg8te error messages? This
        // will print all the juicy details (or at least the first relevant
        // line) right to your output, 8ut also pro8a8ly give you a headache
        // 8ecause wow that is a lot of visual noise.
        'show-traces': {
            type: 'flag'
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

        // This option is super slow and has the potential for bugs! It puts
        // CacheableObject in a mode where every instance is a Proxy which will
        // keep track of invalid property accesses.
        'show-invalid-property-accesses': {
            type: 'flag'
        },

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

    const appendIndexHTML = miscOptions['append-index-html'] ?? false;
    if (appendIndexHTML) {
        logWarn`Appending index.html to link hrefs. (Note: not recommended for production release!)`;
        unbound_link.globalOptions.appendIndexHTML = true;
    }

    const skipThumbs = miscOptions['skip-thumbs'] ?? false;
    const thumbsOnly = miscOptions['thumbs-only'] ?? false;
    const noBuild = miscOptions['no-build'] ?? false;
    const showAggregateTraces = miscOptions['show-traces'] ?? false;

    const niceShowAggregate = (error, ...opts) => {
        showAggregate(error, {
            showTraces: showAggregateTraces,
            pathToFile: f => path.relative(__dirname, f),
            ...opts
        });
    };

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

    const showInvalidPropertyAccesses = miscOptions['show-invalid-property-accesses'] ?? false;

    if (showInvalidPropertyAccesses) {
        CacheableObject.DEBUG_SLOW_TRACK_INVALID_PROPERTIES = true;
    }

    const {
        aggregate: processDataAggregate,
        result: wikiDataResult
    } = await loadAndProcessDataDocuments({dataPath});

    Object.assign(wikiData, wikiDataResult);

    {
        const logThings = (thingDataProp, label) => logInfo` - ${wikiData[thingDataProp]?.length ?? color.red('(Missing!)')} ${color.normal(color.dim(label))}`;
        try {
            logInfo`Loaded data and processed objects:`;
            logThings('albumData', 'albums');
            logThings('trackData', 'tracks');
            logThings('artistData', 'artists');
            if (wikiData.flashData) {
                logThings('flashData', 'flashes');
                logThings('flashActData', 'flash acts');
            }
            logThings('groupData', 'groups');
            logThings('groupCategoryData', 'group categories');
            logThings('artTagData', 'art tags');
            if (wikiData.newsData) {
                logThings('newsData', 'news entries');
            }
            logThings('staticPageData', 'static pages');
            if (wikiData.homepageLayout) {
                logInfo` - ${1} homepage layout (${wikiData.homepageLayout.rows.length} rows)`;
            }
            if (wikiData.wikiInfo) {
                logInfo` - ${1} wiki config file`;
            }
        } catch (error) {
            console.error(`Error showing data summary:`, error);
        }

        let errorless = true;
        try {
            processDataAggregate.close();
        } catch (error) {
            niceShowAggregate(error);
            logWarn`The above errors were detected while processing data files.`;
            logWarn`If the remaining valid data is complete enough, the wiki will`;
            logWarn`still build - but all errored data will be skipped.`;
            logWarn`(Resolve errors for more complete output!)`;
            errorless = false;
        }

        if (errorless) {
            logInfo`All data processed without any errors - nice!`;
            logInfo`(This means all source files will be fully accounted for during page generation.)`;
        }
    }

    if (!WD.wikiInfo) {
        logError`Can't proceed without wiki info file (${WIKI_INFO_FILE}) successfully loading`;
        return;
    }

    let duplicateDirectoriesErrored = false;

    function filterAndShowDuplicateDirectories() {
        const aggregate = filterDuplicateDirectories(wikiData);
        let errorless = true;
        try {
            aggregate.close();
        } catch (aggregate) {
            niceShowAggregate(aggregate);
            logWarn`The above duplicate directories were detected while reviewing data files.`;
            logWarn`Each thing listed above will been totally excempt from this build of the site!`;
            logWarn`Specify unique 'Directory' fields in data entries to resolve these.`;
            logWarn`${`Note:`} This will probably result in reference errors below.`;
            logWarn`${`. . .`} You should fix duplicate directories first!`;
            logWarn`(Resolve errors for more complete output!)`;
            duplicateDirectoriesErrored = true;
            errorless = false;
        }
        if (errorless) {
            logInfo`No duplicate directories found - nice!`;
        }
    }

    function filterAndShowReferenceErrors() {
        const aggregate = filterReferenceErrors(wikiData);
        let errorless = true;
        try {
            aggregate.close();
        } catch (error) {
            niceShowAggregate(error);
            logWarn`The above errors were detected while validating references in data files.`;
            logWarn`If the remaining valid data is complete enough, the wiki will still build -`;
            logWarn`but all errored references will be skipped.`;
            if (duplicateDirectoriesErrored) {
                logWarn`${`Note:`} Duplicate directories were found as well. Review those first,`;
                logWarn`${`. . .`} as they may have caused some of the errors detected above.`;
            }
            logWarn`(Resolve errors for more complete output!)`;
            errorless = false;
        }
        if (errorless) {
            logInfo`All references validated without any errors - nice!`;
            logInfo`(This means all references between things, such as leitmotif references`
            logInfo` and artist credits, will be fully accounted for during page generation.)`;
        }
    }

    // Link data arrays so that all essential references between objects are
    // complete, so properties (like dates!) are inherited where that's
    // appropriate.
    linkWikiDataArrays(wikiData);

    // Filter out any things with duplicate directories throughout the data,
    // warning about them too.
    filterAndShowDuplicateDirectories();

    // Filter out any reference errors throughout the data, warning about them
    // too.
    filterAndShowReferenceErrors();

    // Sort data arrays so that they're all in order! This may use properties
    // which are only available after the initial linking.
    sortWikiDataArrays(wikiData);

    const internalDefaultLanguage = await processLanguageFile(path.join(__dirname, DEFAULT_STRINGS_FILE));

    let languages;
    if (langPath) {
        const languageDataFiles = await findFiles(langPath, {
            filter: f => path.extname(f) === '.json'
        });

        const results = await progressPromiseAll(`Reading & processing language files.`, languageDataFiles
            .map(file => processLanguageFile(file)));

        languages = Object.fromEntries(results.map(language => [language.code, language]));
    } else {
        languages = {};
    }

    const customDefaultLanguage = languages[WD.wikiInfo.defaultLanguage ?? internalDefaultLanguage.code];
    let finalDefaultLanguage;

    if (customDefaultLanguage) {
        logInfo`Applying new default strings from custom ${customDefaultLanguage.code} language file.`;
        customDefaultLanguage.inheritedStrings = internalDefaultLanguage.strings;
        finalDefaultLanguage = customDefaultLanguage;
    } else if (WD.wikiInfo.defaultLanguage) {
        logError`Wiki info file specified default language is ${WD.wikiInfo.defaultLanguage}, but no such language file exists!`;
        if (langPath) {
            logError`Check if an appropriate file exists in ${langPath}?`;
        } else {
            logError`Be sure to specify ${'--lang'} or ${'HSMUSIC_LANG'} with the path to language files.`;
        }
        return;
    } else {
        languages[defaultLanguage.code] = internalDefaultLanguage;
        finalDefaultLanguage = internalDefaultLanguage;
    }

    for (const language of Object.values(languages)) {
        if (language === finalDefaultLanguage) {
            continue;
        }

        language.inheritedStrings = finalDefaultLanguage.strings;
    }

    logInfo`Loaded language strings: ${Object.keys(languages).join(', ')}`;

    if (noBuild) {
        logInfo`Not generating any site or page files this run (--no-build passed).`;
    } else if (writeOneLanguage && !(writeOneLanguage in languages)) {
        logError`Specified to write only ${writeOneLanguage}, but there is no strings file with this language code!`;
        return;
    } else if (writeOneLanguage) {
        logInfo`Writing only language ${writeOneLanguage} this run.`;
    } else {
        logInfo`Writing all languages.`;
    }

    {
        const tagRefs = new Set([...WD.trackData, ...WD.albumData].flatMap(thing => thing.artTagsByRef ?? []));

        for (const ref of tagRefs) {
            if (find.artTag(ref, WD.artTagData)) {
                tagRefs.delete(ref);
            }
        }

        if (tagRefs.size) {
            for (const ref of Array.from(tagRefs).sort()) {
                console.log(`\x1b[33;1m- Missing tag: "${ref}"\x1b[0m`);
            }
            return;
        }
    }

    WD.justEverythingMan = sortByDate([...WD.albumData, ...WD.trackData, ...(WD.flashData || [])]);
    WD.justEverythingSortedByArtDateMan = sortByArtDate(WD.justEverythingMan.slice());
    // console.log(JSON.stringify(justEverythingSortedByArtDateMan.map(toAnythingMan), null, 2));

    WD.officialAlbumData = WD.albumData.filter(album => album.groups.some(group => group.directory === OFFICIAL_GROUP_DIRECTORY));
    WD.fandomAlbumData = WD.albumData.filter(album => album.groups.every(group => group.directory !== OFFICIAL_GROUP_DIRECTORY));

    const fileSizePreloader = new FileSizePreloader();

    // File sizes of additional files need to be precalculated before we can
    // actually reference 'em in site building, so get those loading right
    // away. We actually need to keep track of two things here - the on-device
    // file paths we're actually reading, and the corresponding on-site media
    // paths that will be exposed in site build code. We'll build a mapping
    // function between them so that when site code requests a site path,
    // it'll get the size of the file at the corresponding device path.
    const additionalFilePaths = [
        ...WD.albumData.flatMap(album => (
            [
                ...album.additionalFiles ?? [],
                ...album.tracks.flatMap(track => track.additionalFiles ?? [])
            ]
            .flatMap(fileGroup => fileGroup.files)
            .map(file => ({
                device: (path.join(mediaPath, urls
                    .from('media.root')
                    .toDevice('media.albumAdditionalFile', album.directory, file))),
                media: (urls
                    .from('media.root')
                    .to('media.albumAdditionalFile', album.directory, file))
            })))),
    ];

    const getSizeOfAdditionalFile = mediaPath => {
        const { device = null } = additionalFilePaths.find(({ media }) => media === mediaPath) || {};
        if (!device) return null;
        return fileSizePreloader.getSizeOfPath(device);
    };

    logInfo`Preloading filesizes for ${additionalFilePaths.length} additional files...`;

    fileSizePreloader.loadPaths(...additionalFilePaths.map(path => path.device));
    await fileSizePreloader.waitUntilDoneLoading();

    logInfo`Done preloading filesizes!`;

    if (noBuild) return;

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

    await writeFavicon();
    await writeSymlinks();
    await writeSharedFilesAndPages({language: finalDefaultLanguage, wikiData});

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
            if (!Array.isArray(targets)) {
                logError`${flag + '.targets'} was called, but it didn't return an array! (${typeof targets})`;
                error = true;
                return null;
            }

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

        // return;

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
        logInfo`Total of ${writes.length} writes returned. (${pageWrites.length} page, ${dataWrites.length} data [currently skipped], ${redirectWrites.length} redirect)`;
    } else {
        logWarn`No writes returned at all, so exiting early. This is probably a bug!`;
        return;
    }

    /*
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
    */

    const perLanguageFn = async (language, i, entries) => {
        const baseDirectory = (language === finalDefaultLanguage ? '' : language.code);

        console.log(`\x1b[34;1m${
            (`[${i + 1}/${entries.length}] ${language.code} (-> /${baseDirectory}) `
                .padEnd(60, '-'))
        }\x1b[0m`);

        await progressPromiseAll(`Writing ${language.code}`, queue([
            ...pageWrites.map(({type, ...props}) => () => {
                const { path, page } = props;

                // TODO: This only supports one <>-style argument.
                const pageSubKey = path[0];
                const directory = path[1];

                const localizedPaths = Object.fromEntries(Object.entries(languages)
                    .filter(([ key ]) => key !== 'default')
                    .map(([ key, language ]) => [language.code, writePage.paths(
                        (language === finalDefaultLanguage ? '' : language.code),
                        'localized.' + pageSubKey,
                        directory
                    )]));

                const paths = writePage.paths(
                    baseDirectory,
                    'localized.' + pageSubKey,
                    directory
                );

                const to = writePage.to({
                    baseDirectory,
                    pageSubKey,
                    paths
                });

                const absoluteTo = (targetFullKey, ...args) => {
                    const [ groupKey, subKey ] = targetFullKey.split('.');
                    const from = urls.from('shared.root');
                    return '/' + (groupKey === 'localized' && baseDirectory
                        ? from.to('localizedWithBaseDirectory.' + subKey, baseDirectory, ...args)
                        : from.to(targetFullKey, ...args));
                };

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

                bound.find = bindFind(wikiData, {mode: 'warn'});

                bound.transformInline = bindOpts(transformInline, {
                    find: bound.find,
                    link: bound.link,
                    replacerSpec,
                    language,
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
                    language,
                    to
                });

                bound.fancifyURL = bindOpts(fancifyURL, {
                    language
                });

                bound.fancifyFlashURL = bindOpts(fancifyFlashURL, {
                    [bindOpts.bindIndex]: 2,
                    language
                });

                bound.getLinkThemeString = getLinkThemeString;

                bound.getThemeString = getThemeString;

                bound.getArtistString = bindOpts(getArtistString, {
                    iconifyURL: bound.iconifyURL,
                    link: bound.link,
                    language
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

                bound.getArtistAvatar = bindOpts(getArtistAvatar, {
                    to
                });

                bound.generateAdditionalFilesShortcut = bindOpts(generateAdditionalFilesShortcut, {
                    language
                });

                bound.generateAdditionalFilesList = bindOpts(generateAdditionalFilesList, {
                    language
                });

                bound.generateChronologyLinks = bindOpts(generateChronologyLinks, {
                    link: bound.link,
                    linkAnythingMan: bound.linkAnythingMan,
                    language,
                    wikiData
                });

                bound.generateCoverLink = bindOpts(generateCoverLink, {
                    [bindOpts.bindIndex]: 0,
                    img,
                    link: bound.link,
                    language,
                    to,
                    wikiData
                });

                bound.generateInfoGalleryLinks = bindOpts(generateInfoGalleryLinks, {
                    [bindOpts.bindIndex]: 2,
                    link: bound.link,
                    language
                });

                bound.generatePreviousNextLinks = bindOpts(generatePreviousNextLinks, {
                    link: bound.link,
                    language
                });

                bound.getGridHTML = bindOpts(getGridHTML, {
                    [bindOpts.bindIndex]: 0,
                    img,
                    language
                });

                bound.getAlbumGridHTML = bindOpts(getAlbumGridHTML, {
                    [bindOpts.bindIndex]: 0,
                    getAlbumCover: bound.getAlbumCover,
                    getGridHTML: bound.getGridHTML,
                    link: bound.link,
                    language
                });

                bound.getFlashGridHTML = bindOpts(getFlashGridHTML, {
                    [bindOpts.bindIndex]: 0,
                    getFlashCover: bound.getFlashCover,
                    getGridHTML: bound.getGridHTML,
                    link: bound.link
                });

                bound.getRevealStringFromTags = bindOpts(getRevealStringFromTags, {
                    language
                });

                bound.getRevealStringFromWarnings = bindOpts(getRevealStringFromWarnings, {
                    language
                });

                bound.getAlbumStylesheet = bindOpts(getAlbumStylesheet, {
                    to
                });

                const pageInfo = page({
                    ...bound,

                    language,

                    absoluteTo,
                    relativeTo: to,
                    to,
                    urls,

                    getSizeOfAdditionalFile,
                });

                const oEmbedJSON = writePage.oEmbedJSON(pageInfo, {
                    language,
                    wikiData,
                });

                const oEmbedJSONHref = (oEmbedJSON && wikiData.wikiInfo.canonicalBase) && (
                    wikiData.wikiInfo.canonicalBase + urls.from('shared.root').to('shared.path', paths.pathname + OEMBED_JSON_FILE));

                const html = writePage.html(pageInfo, {
                    defaultLanguage: finalDefaultLanguage,
                    language,
                    languages,
                    localizedPaths,
                    oEmbedJSONHref,
                    paths,
                    to,
                    transformMultiline: bound.transformMultiline,
                    wikiData
                });

                return writePage.write({
                    html,
                    oEmbedJSON,
                    paths,
                });
            }),
            ...redirectWrites.map(({fromPath, toPath, title: titleFn}) => () => {
                const title = titleFn({
                    language
                });

                // TODO: This only supports one <>-style argument.
                const fromPaths = writePage.paths(baseDirectory, 'localized.' + fromPath[0], fromPath[1]);
                const to = writePage.to({baseDirectory, pageSubKey: fromPath[0], paths: fromPaths});

                const target = to('localized.' + toPath[0], ...toPath.slice(1));
                const content = generateRedirectPage(title, target, {language});
                return writePage.write(content, {paths: fromPaths});
            })
        ], queueSize));
    };

    await wrapLanguages(perLanguageFn, {
        languages,
        writeOneLanguage,
    });

    // The single most important step.
    logInfo`Written!`;
}

main().catch(error => {
    if (error instanceof AggregateError) {
        showAggregate(error);
    } else {
        console.error(error);
    }
}).then(() => {
    decorateTime.displayTime();
    CacheableObject.showInvalidAccesses();
});
