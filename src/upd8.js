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

import {execSync} from 'child_process';
import * as path from 'path';
import {fileURLToPath} from 'url';

import {
  copyFile,
  mkdir,
  stat,
  symlink,
  writeFile,
  unlink,
} from 'fs/promises';

import genThumbs from './gen-thumbs.js';
import {listingSpec, listingTargetSpec} from './listing-spec.js';
import urlSpec from './url-spec.js';

import {processLanguageFile} from './data/language.js';
import {serializeThings} from './data/serialize.js';

import CacheableObject from './data/things/cacheable-object.js';

import {
  filterDuplicateDirectories,
  filterReferenceErrors,
  linkWikiDataArrays,
  loadAndProcessDataDocuments,
  sortWikiDataArrays,
  WIKI_INFO_FILE,
} from './data/yaml.js';

import * as pageSpecs from './page/index.js';

import find from './util/find.js';
import {findFiles} from './util/io.js';
import link from './util/link.js';
import {isMain} from './util/node-utils.js';
import {validateReplacerSpec} from './util/replacer.js';
import {replacerSpec} from './util/transform-content.js';

import {
  color,
  decorateTime,
  logWarn,
  logInfo,
  logError,
  parseOptions,
  progressCallAll,
  progressPromiseAll,
} from './util/cli.js';

import {
  queue,
  showAggregate,
  withEntries,
} from './util/sugar.js';

import {
  generateURLs,
  getPagePaths,
  getURLsFrom,
} from './util/urls.js';

import {bindUtilities} from './write/bind-utilities.js';
import {validateWrites} from './write/validate-writes.js';

import {
  generateDocumentHTML,
  generateRedirectHTML,
  generateOEmbedJSON,
} from './write/page-template.js';

/*
import {
  serializeContribs,
  serializeCover,
  serializeGroupsForAlbum,
  serializeGroupsForTrack,
  serializeImagePaths,
  serializeLink,
} from './util/serialize.js';
*/

// Pensive emoji!
import { OFFICIAL_GROUP_DIRECTORY } from './util/magic-constants.js';

import FileSizePreloader from './file-size-preloader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CACHEBUST = 17;

let COMMIT;
try {
  COMMIT = execSync('git log --format="%h %B" -n 1 HEAD', {cwd: __dirname}).toString().trim();
} catch (error) {
  COMMIT = '(failed to detect)';
}

const BUILD_TIME = new Date();

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

// Automatically copied (if present) from media directory to site root.
const FAVICON_FILE = 'favicon.ico';

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

if (!validateReplacerSpec(replacerSpec, {find, link})) {
  process.exit();
}

function stringifyThings(thingData) {
  return JSON.stringify(serializeThings(thingData));
}

async function writePage({
  html,
  oEmbedJSON = '',
  paths,
}) {
  await mkdir(paths.output.directory, {recursive: true});

  await Promise.all(
    [
      writeFile(paths.output.documentHTML, html),

      oEmbedJSON &&
        writeFile(paths.output.oEmbedJSON, oEmbedJSON),
    ].filter(Boolean)
  );
}

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
    link(mediaPath, 'media.root'),
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
  const {groupData, wikiInfo} = wikiData;

  const redirect = async (title, from, urlKey, directory) => {
    const target = path.relative(
      from,
      urls.from('shared.root').to(urlKey, directory)
    );
    const content = generateRedirectHTML(title, target, {language});
    await mkdir(path.join(outputPath, from), {recursive: true});
    await writeFile(path.join(outputPath, from, 'index.html'), content);
  };

  return progressPromiseAll(`Writing files & pages shared across languages.`, [
    groupData?.some((group) => group.directory === 'fandom') &&
      redirect(
        'Fandom - Gallery',
        'albums/fandom',
        'localized.groupGallery',
        'fandom'
      ),

    groupData?.some((group) => group.directory === 'official') &&
      redirect(
        'Official - Gallery',
        'albums/official',
        'localized.groupGallery',
        'official'
      ),

    wikiInfo.enableListings &&
      redirect(
        'Album Commentary',
        'list/all-commentary',
        'localized.commentaryIndex',
        ''
      ),

    writeFile(
      path.join(outputPath, 'data.json'),
      (
        '{\n' +
        [
          `"albumData": ${stringifyThings(wikiData.albumData)},`,
          wikiInfo.enableFlashesAndGames &&
            `"flashData": ${stringifyThings(wikiData.flashData)},`,
          `"artistData": ${stringifyThings(wikiData.artistData)}`,
        ]
          .filter(Boolean)
          .map(line => '  ' + line)
          .join('\n') +
        '\n}')),
  ].filter(Boolean));
}

// Wrapper function for running a function once for all languages.
async function wrapLanguages(fn, {languages, writeOneLanguage = null}) {
  const k = writeOneLanguage;
  const languagesToRun = k ? {[k]: languages[k]} : languages;

  const entries = Object.entries(languagesToRun).filter(
    ([key]) => key !== 'default'
  );

  for (let i = 0; i < entries.length; i++) {
    const [_key, language] = entries[i];

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
      type: 'value',
    },

    // Static media will 8e referenced in the site here! The contents are
    // categorized; check out MEDIA_ALBUM_ART_DIRECTORY and other constants
    // near the top of this file (upd8.js).
    'media-path': {
      type: 'value',
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
      type: 'value',
    },

    // This is the output directory. It's the one you'll upload online with
    // rsync or whatever when you're pushing an upd8, and also the one
    // you'd archive if you wanted to make a 8ackup of the whole dang
    // site. Just keep in mind that the gener8ted result will contain a
    // couple symlinked directories, so if you're uploading, you're pro8a8ly
    // gonna want to resolve those yourself.
    'out-path': {
      type: 'value',
    },

    // Thum8nail gener8tion is *usually* something you want, 8ut it can 8e
    // kinda a pain to run every time, since it does necessit8te reading
    // every media file at run time. Pass this to skip it.
    'skip-thumbs': {
      type: 'flag',
    },

    // Or, if you *only* want to gener8te newly upd8ted thum8nails, you can
    // pass this flag! It exits 8efore 8uilding the rest of the site.
    'thumbs-only': {
      type: 'flag',
    },

    // Just working on data entries and not interested in actually
    // generating site HTML yet? This flag will cut execution off right
    // 8efore any site 8uilding actually happens.
    'no-build': {
      type: 'flag',
    },

    // Only want to 8uild one language during testing? This can chop down
    // 8uild times a pretty 8ig chunk! Just pass a single language code.
    lang: {
      type: 'value',
    },

    // Working without a dev server and just using file:// URLs in your we8
    // 8rowser? This will automatically append index.html to links across
    // the site. Not recommended for production, since it isn't guaranteed
    // 100% error-free (and index.html-style links are less pretty anyway).
    'append-index-html': {
      type: 'flag',
    },

    // Want sweet, sweet trace8ack info in aggreg8te error messages? This
    // will print all the juicy details (or at least the first relevant
    // line) right to your output, 8ut also pro8a8ly give you a headache
    // 8ecause wow that is a lot of visual noise.
    'show-traces': {
      type: 'flag',
    },

    'queue-size': {
      type: 'value',
      validate(size) {
        if (parseInt(size) !== parseFloat(size)) return 'an integer';
        if (parseInt(size) < 0) return 'a counting number or zero';
        return true;
      },
    },
    queue: {alias: 'queue-size'},

    // This option is super slow and has the potential for bugs! It puts
    // CacheableObject in a mode where every instance is a Proxy which will
    // keep track of invalid property accesses.
    'show-invalid-property-accesses': {
      type: 'flag',
    },

    // Compute ALL data properties before moving on to building. This ensures
    // writes are processed at a stable speed (since they don't have to perform
    // any additional data computation besides what is done for the page
    // itself), but it'll also take a long while for the initial caching to
    // complete. This shouldn't have any overall difference on efficiency as
    // it's the same amount of processing being done regardless; the option is
    // mostly present for optimization testing (i.e. if you want to focus on
    // efficiency of data calculation or write generation separately instead of
    // mixed together).
    'precache-data': {
      type: 'flag',
    },

    [parseOptions.handleUnknown]: () => {},
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
    error(!dataPath, `Expected --data-path option or HSMUSIC_DATA to be set`);
    error(!mediaPath, `Expected --media-path option or HSMUSIC_MEDIA to be set`);
    error(!outputPath, `Expected --out-path option or HSMUSIC_OUT to be set`);
    if (errored) {
      return;
    }
  }

  const appendIndexHTML = miscOptions['append-index-html'] ?? false;
  if (appendIndexHTML) {
    logWarn`Appending index.html to link hrefs. (Note: not recommended for production release!)`;
    link.globalOptions.appendIndexHTML = true;
  }

  const skipThumbs = miscOptions['skip-thumbs'] ?? false;
  const thumbsOnly = miscOptions['thumbs-only'] ?? false;
  const noBuild = miscOptions['no-build'] ?? false;
  const showAggregateTraces = miscOptions['show-traces'] ?? false;
  const precacheData = miscOptions['precache-data'] ?? false;

  // NOT for ena8ling or disa8ling specific features of the site!
  // This is only in charge of what general groups of files to 8uild.
  // They're here to make development quicker when you're only working
  // on some particular area(s) of the site rather than making changes
  // across all of them.
  const writeFlags = await parseOptions(process.argv.slice(2), {
    all: {type: 'flag'}, // Defaults to true if none 8elow specified.

    // Kinda a hack t8h!
    ...Object.fromEntries(
      Object.keys(pageSpecs).map((key) => [key, {type: 'flag'}])
    ),

    [parseOptions.handleUnknown]: () => {},
  });

  const writeAll = !Object.keys(writeFlags).length || writeFlags.all;

  logInfo`Writing site pages: ${
    writeAll ? 'all' : Object.keys(writeFlags).join(', ')
  }`;

  const niceShowAggregate = (error, ...opts) => {
    showAggregate(error, {
      showTraces: showAggregateTraces,
      pathToFileURL: (f) => path.relative(__dirname, fileURLToPath(f)),
      ...opts,
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

  const showInvalidPropertyAccesses =
    miscOptions['show-invalid-property-accesses'] ?? false;

  if (showInvalidPropertyAccesses) {
    CacheableObject.DEBUG_SLOW_TRACK_INVALID_PROPERTIES = true;
  }

  const {aggregate: processDataAggregate, result: wikiDataResult} =
    await loadAndProcessDataDocuments({dataPath});

  Object.assign(wikiData, wikiDataResult);

  {
    const logThings = (thingDataProp, label) =>
      logInfo` - ${wikiData[thingDataProp]?.length ?? color.red('(Missing!)')} ${color.normal(color.dim(label))}`;
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
        logInfo` - ${1} homepage layout (${
          wikiData.homepageLayout.rows.length
        } rows)`;
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
      logInfo`(This means all references between things, such as leitmotif references`;
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

  if (precacheData) {
    progressCallAll('Caching all data values', Object.entries(wikiData)
      .filter(([key]) =>
        key !== 'listingSpec' &&
        key !== 'listingTargetSpec' &&
        key !== 'officialAlbumData' &&
        key !== 'fandomAlbumData')
      .map(([key, value]) =>
        key === 'wikiInfo' ? [key, [value]] :
        key === 'homepageLayout' ? [key, [value]] :
        [key, value])
      .flatMap(([_key, things]) => things)
      .map(thing => () => CacheableObject.cacheAllExposedProperties(thing)));
  }

  const internalDefaultLanguage = await processLanguageFile(
    path.join(__dirname, DEFAULT_STRINGS_FILE)
  );

  let languages;
  if (langPath) {
    const languageDataFiles = await findFiles(langPath, {
      filter: (f) => path.extname(f) === '.json',
    });

    const results = await progressPromiseAll(
      `Reading & processing language files.`,
      languageDataFiles.map((file) => processLanguageFile(file))
    );

    languages = Object.fromEntries(
      results.map((language) => [language.code, language])
    );
  } else {
    languages = {};
  }

  const customDefaultLanguage =
    languages[WD.wikiInfo.defaultLanguage ?? internalDefaultLanguage.code];
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
    languages[internalDefaultLanguage.code] = internalDefaultLanguage;
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
    const tagRefs = new Set(
      [...WD.trackData, ...WD.albumData]
        .flatMap((thing) => thing.artTagsByRef ?? []));

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

  WD.officialAlbumData = WD.albumData
    .filter((album) => album.groups.some((group) => group.directory === OFFICIAL_GROUP_DIRECTORY));
  WD.fandomAlbumData = WD.albumData
    .filter((album) => album.groups.every((group) => group.directory !== OFFICIAL_GROUP_DIRECTORY));

  const fileSizePreloader = new FileSizePreloader();

  // File sizes of additional files need to be precalculated before we can
  // actually reference 'em in site building, so get those loading right
  // away. We actually need to keep track of two things here - the on-device
  // file paths we're actually reading, and the corresponding on-site media
  // paths that will be exposed in site build code. We'll build a mapping
  // function between them so that when site code requests a site path,
  // it'll get the size of the file at the corresponding device path.
  const additionalFilePaths = [
    ...WD.albumData.flatMap((album) =>
      [
        ...(album.additionalFiles ?? []),
        ...album.tracks.flatMap((track) => track.additionalFiles ?? []),
      ]
        .flatMap((fileGroup) => fileGroup.files)
        .map((file) => ({
          device: path.join(
            mediaPath,
            urls
              .from('media.root')
              .toDevice('media.albumAdditionalFile', album.directory, file)
          ),
          media: urls
            .from('media.root')
            .to('media.albumAdditionalFile', album.directory, file),
        }))
    ),
  ];

  const getSizeOfAdditionalFile = (mediaPath) => {
    const {device} =
      additionalFilePaths.find(({media}) => media === mediaPath) || {};
    if (!device) return null;
    return fileSizePreloader.getSizeOfPath(device);
  };

  logInfo`Preloading filesizes for ${additionalFilePaths.length} additional files...`;

  fileSizePreloader.loadPaths(...additionalFilePaths.map((path) => path.device));
  await fileSizePreloader.waitUntilDoneLoading();

  logInfo`Done preloading filesizes!`;

  if (noBuild) return;

  // Makes writing a little nicer on CPU theoretically, 8ut also costs in
  // performance right now 'cuz it'll w8 for file writes to 8e completed
  // 8efore moving on to more data processing. So, defaults to zero, which
  // disa8les the queue feature altogether.
  queueSize = +(miscOptions['queue-size'] ?? 0);

  const buildDictionary = pageSpecs;

  await writeFavicon();
  await writeSymlinks();
  await writeSharedFilesAndPages({language: finalDefaultLanguage, wikiData});

  const buildSteps = writeAll
    ? Object.entries(buildDictionary)
    : Object.entries(buildDictionary).filter(([flag]) => writeFlags[flag]);

  let writes;
  {
    let error = false;

    const buildStepsWithTargets = buildSteps
      .map(([flag, pageSpec]) => {
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
      })
      .filter(Boolean);

    if (error) {
      return;
    }

    writes = progressCallAll('Computing page & data writes.', buildStepsWithTargets.flatMap(({flag, pageSpec, targets}) => {
      const writesFns = targets.map(target => () => {
        const writes = pageSpec.write(target, {wikiData})?.slice() || [];
        const valid = validateWrites(writes, {
          functionName: flag + '.write',
          urlSpec,
        });
        error ||=! valid;
        return valid ? writes : [];
      });

      if (pageSpec.writeTargetless) {
        writesFns.push(() => {
          const writes = pageSpec.writeTargetless({wikiData});
          const valid = validateWrites(writes, {
            functionName: flag + '.writeTargetless',
            urlSpec,
          });
          error ||=! valid;
          return valid ? writes : [];
        });
      }

      return writesFns;
    })).flat();

    if (error) {
      return;
    }
  }

  const pageWrites = writes.filter(({type}) => type === 'page');
  const dataWrites = writes.filter(({type}) => type === 'data');
  const redirectWrites = writes.filter(({type}) => type === 'redirect');

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
      return writeData(path[0], path[1], data({...bound}));
    }),
    queueSize
  ));
  */

  const perLanguageFn = async (language, i, entries) => {
    const baseDirectory =
      language === finalDefaultLanguage ? '' : language.code;

    console.log(`\x1b[34;1m${`[${i + 1}/${entries.length}] ${language.code} (-> /${baseDirectory}) `.padEnd(60, '-')}\x1b[0m`);

    await progressPromiseAll(`Writing ${language.code}`, queue([
      ...pageWrites.map((props) => () => {
        const {path, page} = props;

        const pageSubKey = path[0];
        const urlArgs = path.slice(1);

        const localizedPaths = withEntries(languages, entries => entries
          .filter(([key, language]) => key !== 'default' && !language.hidden)
          .map(([_key, language]) => [
            language.code,
            getPagePaths({
              outputPath,
              urls,

              baseDirectory:
                (language === finalDefaultLanguage
                  ? ''
                  : language.code),
              fullKey: 'localized.' + pageSubKey,
              urlArgs,
            }),
          ]));

        const paths = getPagePaths({
          outputPath,
          urls,

          baseDirectory,
          fullKey: 'localized.' + pageSubKey,
          urlArgs,
        });

        const to = getURLsFrom({
          urls,
          baseDirectory,
          pageSubKey,
          paths,
        });

        const absoluteTo = (targetFullKey, ...args) => {
          const [groupKey, subKey] = targetFullKey.split('.');
          const from = urls.from('shared.root');
          return (
            '/' +
            (groupKey === 'localized' && baseDirectory
              ? from.to(
                  'localizedWithBaseDirectory.' + subKey,
                  baseDirectory,
                  ...args
                )
              : from.to(targetFullKey, ...args))
          );
        };

        const bound = bindUtilities({
          language,
          to,
          wikiData,
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

        const oEmbedJSON = generateOEmbedJSON(pageInfo, {
          language,
          wikiData,
        });

        const oEmbedJSONHref =
          oEmbedJSON &&
          wikiData.wikiInfo.canonicalBase &&
          wikiData.wikiInfo.canonicalBase +
            urls
              .from('shared.root')
              .to('shared.path', paths.pathname + 'oembed.json');

        const pageHTML = generateDocumentHTML(pageInfo, {
          buildTime: BUILD_TIME,
          cachebust: '?' + CACHEBUST,
          commit: COMMIT,
          defaultLanguage: finalDefaultLanguage,
          getThemeString: bound.getThemeString,
          language,
          languages,
          localizedPaths,
          oEmbedJSONHref,
          paths,
          to,
          transformMultiline: bound.transformMultiline,
          wikiData,
        });

        return writePage({
          html: pageHTML,
          oEmbedJSON,
          paths,
        });
      }),
      ...redirectWrites.map(({fromPath, toPath, title: titleFn}) => () => {
        const title = titleFn({
          language,
        });

        const from = getPagePaths({
          outputPath,
          urls,

          baseDirectory,
          fullKey: 'localized.' + fromPath[0],
          urlArgs: fromPath.slice(1),
        });

        const to = getURLsFrom({
          urls,
          baseDirectory,
          pageSubKey: fromPath[0],
          paths: from,
        });

        const target = to('localized.' + toPath[0], ...toPath.slice(1));
        const html = generateRedirectHTML(title, target, {language});
        return writePage({html, paths: from});
      }),
    ], queueSize));
  };

  await wrapLanguages(perLanguageFn, {
    languages,
    writeOneLanguage,
  });

  // The single most important step.
  logInfo`Written!`;
}

// TODO: isMain detection isn't consistent across platforms here
/* eslint-disable-next-line no-constant-condition */
if (true || isMain(import.meta.url) || path.basename(process.argv[1]) === 'hsmusic') {
  main()
    .catch((error) => {
      if (error instanceof AggregateError) {
        showAggregate(error);
      } else {
        console.error(error);
      }
    })
    .then(() => {
      decorateTime.displayTime();
      CacheableObject.showInvalidAccesses();
    });
}
