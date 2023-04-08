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
import wrap from 'word-wrap';

import genThumbs, {
  clearThumbs,
  defaultMagickThreads,
  isThumb,
} from './gen-thumbs.js';

import bootRepl from './repl.js';
import {listingSpec, listingTargetSpec} from './listing-spec.js';
import urlSpec from './url-spec.js';

import {processLanguageFile} from './data/language.js';

import CacheableObject from './data/things/cacheable-object.js';

import {
  filterDuplicateDirectories,
  filterReferenceErrors,
  linkWikiDataArrays,
  loadAndProcessDataDocuments,
  sortWikiDataArrays,
  WIKI_INFO_FILE,
} from './data/yaml.js';

import find from './util/find.js';
import {findFiles} from './util/io.js';
import link from './util/link.js';
import {isMain, traverse} from './util/node-utils.js';
import {validateReplacerSpec} from './util/replacer.js';
import {empty, showAggregate, withEntries} from './util/sugar.js';
import {replacerSpec} from './util/transform-content.js';
import {generateURLs} from './util/urls.js';
import {sortByName} from './util/wiki-data.js';

import {generateDevelopersCommentHTML} from './write/page-template.js';
import * as buildModes from './write/build-modes/index.js';

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

import FileSizePreloader from './file-size-preloader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CACHEBUST = 19;

let COMMIT;
try {
  COMMIT = execSync('git log --format="%h %B" -n 1 HEAD', {cwd: __dirname}).toString().trim();
} catch (error) {
  COMMIT = '(failed to detect)';
}

const BUILD_TIME = new Date();

const DEFAULT_STRINGS_FILE = 'strings-default.json';

if (!validateReplacerSpec(replacerSpec, {find, link})) {
  process.exit();
}

async function main() {
  Error.stackTraceLimit = Infinity;

  const defaultQueueSize = 500;

  const buildModeFlagOptions = (
    withEntries(buildModes, entries =>
      entries.map(([key, mode]) => [key, {
        help: mode.description,
        type: 'flag',
      }])));

  const selectedBuildModeFlags = Object.keys(
    await parseOptions(process.argv.slice(2), {
      [parseOptions.handleUnknown]: () => {},
      ...buildModeFlagOptions,
    }));

  let selectedBuildModeFlag;
  let usingDefaultBuildMode;

  if (empty(selectedBuildModeFlags)) {
    selectedBuildModeFlag = 'static-build';
    usingDefaultBuildMode = true;
  } else if (selectedBuildModeFlags.length > 1) {
    logError`Building multiple modes (${selectedBuildModeFlags.join(', ')}) at once not supported.`;
    logError`Please specify a maximum of one build mode.`;
    return;
  } else {
    selectedBuildModeFlag = selectedBuildModeFlags[0];
    usingDefaultBuildMode = false;
  }

  const selectedBuildMode = buildModes[selectedBuildModeFlag];

  // This is about to get a whole lot more stuff put in it.
  const wikiData = {
    listingSpec,
    listingTargetSpec,
  };

  const buildOptions = selectedBuildMode.getCLIOptions();

  const commonOptions = {
    'help': {
      help: `Display usage info and basic information for the \`hsmusic\` command`,
      type: 'flag',
    },

    // Data files for the site, including flash, artist, and al8um data,
    // and like a jillion other things too. Pretty much everything which
    // makes an individual wiki what it is goes here!
    'data-path': {
      help: `Specify path to data directory, including YAML files that cover all info about wiki content, layout, and structure\n\nAlways required for wiki building, but may be provided via the HSMUSIC_DATA environment variable instead`,
      type: 'value',
    },

    // Static media will 8e referenced in the site here! The contents are
    // categorized; check out MEDIA_ALBUM_ART_DIRECTORY and other constants
    // near the top of this file (upd8.js).
    'media-path': {
      help: `Specify path to media directory, including album artwork and additional files, as well as custom site layout media and other media files for reference or linking in wiki content\n\nAlways required for wiki building, but may be provided via the HSMUSIC_MEDIA environment variable instead`,
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
      help: `Specify path to language directory, including JSON files that mapping internal string keys to localized language content, and various language metadata`,
      type: 'value',
    },

    'repl': {
      help: `Boot into the HSMusic REPL for command-line interactive access to data objects`,
      type: 'flag',
    },

    'no-repl-history': {
      help: `Disable locally logging commands entered into the REPL in your home directory`,
      type: 'flag',
    },

    // Thum8nail gener8tion is *usually* something you want, 8ut it can 8e
    // kinda a pain to run every time, since it does necessit8te reading
    // every media file at run time. Pass this to skip it.
    'skip-thumbs': {
      help: `Skip processing and generating thumbnails in media directory (speeds up subsequent builds, but remove this option [or use --thumbs-only] and re-run once when you add or modify media files to ensure thumbnails stay up-to-date!)`,
      type: 'flag',
    },

    // Or, if you *only* want to gener8te newly upd8ted thum8nails, you can
    // pass this flag! It exits 8efore 8uilding the rest of the site.
    'thumbs-only': {
      help: `Skip everything besides processing media directory and generating up-to-date thumbnails (useful when using --skip-thumbs for most runs)`,
      type: 'flag',
    },

    'clear-thumbs': {
      help: `Clear the thumbnail cache and remove generated thumbnail files from media directory\n\n(This skips building. Run again without --clear-thumbs to build the site.)`,
      type: 'flag',
    },

    // Just working on data entries and not interested in actually
    // generating site HTML yet? This flag will cut execution off right
    // 8efore any site 8uilding actually happens.
    'no-build': {
      help: `Don't run a build of the site at all; only process data/media and report any errors detected`,
      type: 'flag',
    },

    // Want sweet, sweet trace8ack info in aggreg8te error messages? This
    // will print all the juicy details (or at least the first relevant
    // line) right to your output, 8ut also pro8a8ly give you a headache
    // 8ecause wow that is a lot of visual noise.
    'show-traces': {
      help: `Show JavaScript source code paths for reported errors in "aggregate" error displays\n\n(Debugging use only, but please enable this if you're reporting bugs for our issue tracker!)`,
      type: 'flag',
    },

    'queue-size': {
      help: `Process more or fewer disk files at once to optimize performance or avoid I/O errors, unlimited if set to 0 (between 500 and 700 is usually a safe range for building HSMusic on Windows machines)\nDefaults to ${defaultQueueSize}`,
      type: 'value',
      validate(size) {
        if (parseInt(size) !== parseFloat(size)) return 'an integer';
        if (parseInt(size) < 0) return 'a counting number or zero';
        return true;
      },
    },
    queue: {alias: 'queue-size'},

    'magick-threads': {
      help: `Process more or fewer thumbnail files at once with ImageMagick when generating thumbnails. (Each ImageMagick thread may also make use of multi-core processing at its own utility.)`,
    },
    magick: {alias: 'magick-threads'},

    // This option is super slow and has the potential for bugs! It puts
    // CacheableObject in a mode where every instance is a Proxy which will
    // keep track of invalid property accesses.
    'show-invalid-property-accesses': {
      help: `Report accesses at runtime to nonexistant properties on wiki data objects, at a dramatic performance cost\n(Internal/development use only)`,
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
      help: `Compute all runtime-cached values for wiki data objects before proceeding to site build (optimizes rate of content generation/serving, but waits a lot longer before build actually starts, and may compute data which is never required for this build)`,
      type: 'flag',
    },
  };

  const cliOptions = await parseOptions(process.argv.slice(2), {
    // We don't want to error when we receive these options, so specify them
    // here, even though we won't be doing anything with them later.
    // (This is a bit of a hack.)
    ...buildModeFlagOptions,

    ...commonOptions,
    ...buildOptions,
  });

  if (cliOptions['help']) {
    const indentWrap = (spaces, str) => wrap(str, {width: 60 - spaces, indent: ' '.repeat(spaces)});

    const showOptions = (msg, options) => {
      console.log(color.bright(msg));

      const entries = Object.entries(options);
      const sortedOptions = sortByName(entries
        .map(([name, descriptor]) => ({name, descriptor})));

      if (!sortedOptions.length) {
        console.log(`(No options available)`)
      }

      let justInsertedPaddingLine = false;

      for (const {name, descriptor} of sortedOptions) {
        if (descriptor.alias) {
          continue;
        }

        const aliases = entries
          .filter(([_name, {alias}]) => alias === name)
          .map(([name]) => name);

        let wrappedHelp, wrappedHelpLines = 0;
        if (descriptor.help) {
          wrappedHelp = indentWrap(4, descriptor.help);
          wrappedHelpLines = wrappedHelp.split('\n').length;
        }

        if (wrappedHelpLines > 0 && !justInsertedPaddingLine) {
          console.log('');
        }

        console.log(color.bright(` --` + name) +
          (aliases.length
            ? ` (or: ${aliases.map(alias => color.bright(`--` + alias)).join(', ')})`
            : '') +
          (descriptor.help
            ? ''
            : color.dim('  (no help provided)')));

        if (wrappedHelp) {
          console.log(wrappedHelp);
        }

        if (wrappedHelpLines > 1) {
          console.log('');
          justInsertedPaddingLine = true;
        } else {
          justInsertedPaddingLine = false;
        }
      }

      if (!justInsertedPaddingLine) {
        console.log(``);
      }
    };

    console.log(
      color.bright(`hsmusic (aka. Homestuck Music Wiki)\n`) +
      `static wiki software cataloguing collaborative creation\n`);

    console.log(indentWrap(0,
      `The \`hsmusic\` command provides basic control over all parts of generating user-visible HTML pages and website content/structure from provided data, media, and language directories.\n` +
      `\n` +
      `CLI options are divided into three groups:\n`));
    console.log(` 1) ` + indentWrap(4,
      `Common options: These are shared by all build modes and always have the same essential behavior`).trim());
    console.log(` 2) ` + indentWrap(4,
      `Build mode selection: One build mode may be selected (or else the default, --static-build, is used), and it decides which entire set of behavior to use for providing site content to the user`).trim());
    console.log(` 3) ` + indentWrap(4,
      `Build options: Each build mode has a set of unique options which customize behavior for that build mode`).trim());
    console.log(``);

    showOptions(`Common options`, commonOptions);
    showOptions(`Build mode selection`, buildModeFlagOptions);

    if (buildOptions) {
      showOptions(`Build options for --${selectedBuildModeFlag} (${
        usingDefaultBuildMode ? 'default' : 'selected'
      })`, buildOptions);
    }

    return;
  }

  const dataPath = cliOptions['data-path'] || process.env.HSMUSIC_DATA;
  const mediaPath = cliOptions['media-path'] || process.env.HSMUSIC_MEDIA;
  const langPath = cliOptions['lang-path'] || process.env.HSMUSIC_LANG; // Can 8e left unset!

  const skipThumbs = cliOptions['skip-thumbs'] ?? false;
  const thumbsOnly = cliOptions['thumbs-only'] ?? false;
  const clearThumbsFlag = cliOptions['clear-thumbs'] ?? false;
  const noBuild = cliOptions['no-build'] ?? false;

  const replFlag = cliOptions['repl'] ?? false;
  const disableReplHistory = cliOptions['no-repl-history'] ?? false;

  const showAggregateTraces = cliOptions['show-traces'] ?? false;

  const precacheData = cliOptions['precache-data'] ?? false;
  const showInvalidPropertyAccesses = cliOptions['show-invalid-property-accesses'] ?? false;

  // Makes writing nicer on the CPU and file I/O parts of the OS, with a
  // marginal performance deficit while waiting for file writes to finish
  // before proceeding to more page processing.
  const queueSize = +(cliOptions['queue-size'] ?? defaultQueueSize);

  const magickThreads = +(cliOptions['magick-threads'] ?? defaultMagickThreads);

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
    if (errored) {
      return;
    }
  }

  if (replFlag) {
    return bootRepl({
      dataPath,
      mediaPath,

      disableHistory: disableReplHistory,
      showTraces: showAggregateTraces,
    });
  }

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

  if (clearThumbsFlag) {
    await clearThumbs(mediaPath, {queueSize});

    logInfo`All done! Remove ${'--clear-thumbs'} to run the next build.`;
    if (skipThumbs) {
      logInfo`And don't forget to remove ${'--skip-thumbs'} too, eh?`;
    }
    return;
  }

  if (skipThumbs) {
    logInfo`Skipping thumbnail generation.`;
  } else {
    logInfo`Begin thumbnail generation... -----+`;
    const result = await genThumbs(mediaPath, {
      queueSize,
      magickThreads,
      quiet: !thumbsOnly,
    });
    logInfo`Done thumbnail generation! --------+`;
    if (!result) return;
    if (thumbsOnly) return;
  }

  if (usingDefaultBuildMode) {
    logInfo`No build mode specified, using default: ${selectedBuildModeFlag}`;
  } else {
    logInfo`Using specified build mode: ${selectedBuildModeFlag}`;
  }

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

  if (!wikiData.wikiInfo) {
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
        key !== 'listingTargetSpec')
      .map(([key, value]) =>
        key === 'wikiInfo' ? [key, [value]] :
        key === 'homepageLayout' ? [key, [value]] :
        [key, value])
      .flatMap(([_key, things]) => things)
      .map(thing => () => CacheableObject.cacheAllExposedProperties(thing)));
  }

  const internalDefaultLanguage = await processLanguageFile(
    path.join(__dirname, DEFAULT_STRINGS_FILE));

  let languages;
  if (langPath) {
    const languageDataFiles = await findFiles(langPath, {
      filter: (f) => path.extname(f) === '.json',
    });

    const results = await progressPromiseAll(`Reading & processing language files.`,
      languageDataFiles.map((file) => processLanguageFile(file)));

    languages = Object.fromEntries(
      results.map((language) => [language.code, language]));
  } else {
    languages = {};
  }

  const customDefaultLanguage =
    languages[wikiData.wikiInfo.defaultLanguage ?? internalDefaultLanguage.code];
  let finalDefaultLanguage;

  if (customDefaultLanguage) {
    logInfo`Applying new default strings from custom ${customDefaultLanguage.code} language file.`;
    customDefaultLanguage.inheritedStrings = internalDefaultLanguage.strings;
    finalDefaultLanguage = customDefaultLanguage;
  } else if (wikiData.wikiInfo.defaultLanguage) {
    logError`Wiki info file specified default language is ${wikiData.wikiInfo.defaultLanguage}, but no such language file exists!`;
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
  }

  {
    const tagRefs = new Set(
      [...wikiData.trackData, ...wikiData.albumData]
        .flatMap((thing) => thing.artTagsByRef ?? []));

    for (const ref of tagRefs) {
      if (find.artTag(ref, wikiData.artTagData)) {
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

  const urls = generateURLs(urlSpec);

  const fileSizePreloader = new FileSizePreloader();

  // File sizes of additional files need to be precalculated before we can
  // actually reference 'em in site building, so get those loading right
  // away. We actually need to keep track of two things here - the on-device
  // file paths we're actually reading, and the corresponding on-site media
  // paths that will be exposed in site build code. We'll build a mapping
  // function between them so that when site code requests a site path,
  // it'll get the size of the file at the corresponding device path.
  const additionalFilePaths = [
    ...wikiData.albumData.flatMap((album) =>
      [
        ...(album.additionalFiles ?? []),
        ...album.tracks.flatMap((track) => [
          ...(track.additionalFiles ?? []),
          ...(track.sheetMusicFiles ?? []),
          ...(track.midiProjectFiles ?? []),
        ]),
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

  // Same dealio for images. Since just about any image can be embedded and
  // we can't super easily know which ones are referenced at runtime, just
  // cheat and get file sizes for all images under media. (This includes
  // additional files which are images.)
  const imageFilePaths = (await traverse(mediaPath, {
    filterDir: dir => dir !== '.git',
    filterFile: file => (
      ['.png', '.gif', '.jpg'].includes(path.extname(file)) &&
        !isThumb(file)),
  }))
    .map(file => ({
      device: path.join(mediaPath, file),
      media:
        urls
          .from('media.root')
          .to('media.path', file.split(path.sep).join('/')),
    }));

  const getSizeOfMediaFileHelper = paths => (mediaPath) => {
    const pair = paths.find(({media}) => media === mediaPath);
    if (!pair) return null;
    return fileSizePreloader.getSizeOfPath(pair.device);
  };

  const getSizeOfAdditionalFile = getSizeOfMediaFileHelper(additionalFilePaths);
  const getSizeOfImageFile = getSizeOfMediaFileHelper(imageFilePaths);

  logInfo`Preloading filesizes for ${additionalFilePaths.length} additional files...`;

  fileSizePreloader.loadPaths(...additionalFilePaths.map((path) => path.device));
  await fileSizePreloader.waitUntilDoneLoading();

  logInfo`Preloading filesizes for ${imageFilePaths.length} full-resolution images...`;

  fileSizePreloader.loadPaths(...imageFilePaths.map((path) => path.device));
  await fileSizePreloader.waitUntilDoneLoading();

  logInfo`Done preloading filesizes!`;

  if (noBuild) return;

  const developersComment = generateDevelopersCommentHTML({
    buildTime: BUILD_TIME,
    commit: COMMIT,
    wikiData,
  });

  return selectedBuildMode.go({
    cliOptions,
    dataPath,
    mediaPath,
    queueSize,
    srcRootPath: __dirname,

    defaultLanguage: finalDefaultLanguage,
    languages,
    wikiData,
    urls,
    urlSpec,

    cachebust: '?' + CACHEBUST,
    developersComment,
    getSizeOfAdditionalFile,
    getSizeOfImageFile,
    niceShowAggregate,
  });
}

// TODO: isMain detection isn't consistent across platforms here
/* eslint-disable-next-line no-constant-condition */
if (true || isMain(import.meta.url) || path.basename(process.argv[1]) === 'hsmusic') {
  (async () => {
    let result;

    try {
      result = await main();
    } catch (error) {
      if (error instanceof AggregateError) {
        showAggregate(error);
      } else {
        console.error(error);
      }
    }

    if (result !== true) {
      process.exit(1);
      return;
    }

    decorateTime.displayTime();
    CacheableObject.showInvalidAccesses();

    process.exit(0);
  })();
}
