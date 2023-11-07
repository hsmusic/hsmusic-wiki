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

import {execSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import wrap from 'word-wrap';

import {displayCompositeCacheAnalysis} from '#composite';
import {processLanguageFile, watchLanguageFile} from '#language';
import {isMain, traverse} from '#node-utils';
import bootRepl from '#repl';
import {empty, showAggregate, withEntries} from '#sugar';
import {CacheableObject} from '#things';
import {generateURLs, urlSpec} from '#urls';
import {sortByName} from '#wiki-data';

import {
  colors,
  decorateTime,
  fileIssue,
  logWarn,
  logInfo,
  logError,
  parseOptions,
  progressCallAll,
  progressPromiseAll,
} from '#cli';

import genThumbs, {
  CACHE_FILE as thumbsCacheFile,
  defaultMagickThreads,
  determineMediaCachePath,
  isThumb,
  migrateThumbsIntoDedicatedCacheDirectory,
  verifyImagePaths,
} from '#thumbs';

import {
  filterDuplicateDirectories,
  filterReferenceErrors,
  linkWikiDataArrays,
  loadAndProcessDataDocuments,
  sortWikiDataArrays,
  WIKI_INFO_FILE,
} from '#yaml';

import FileSizePreloader from './file-size-preloader.js';
import {listingSpec, listingTargetSpec} from './listing-spec.js';
import * as buildModes from './write/build-modes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CACHEBUST = 22;

let COMMIT;
try {
  COMMIT = execSync('git log --format="%h %B" -n 1 HEAD', {cwd: __dirname}).toString().trim();
} catch (error) {
  COMMIT = '(failed to detect)';
}

const BUILD_TIME = new Date();

const DEFAULT_STRINGS_FILE = 'strings-default.json';

const STATUS_NOT_STARTED       = `not started`;
const STATUS_NOT_APPLICABLE    = `not applicable`;
const STATUS_STARTED_NOT_DONE  = `started but not yet done`;
const STATUS_DONE_CLEAN        = `done without warnings`;
const STATUS_FATAL_ERROR       = `fatal error`;
const STATUS_HAS_WARNINGS      = `has warnings`;

const defaultStepStatus = {status: STATUS_NOT_STARTED, annotation: null};

// Defined globally for quick access outside the main() function's contents.
// This will be initialized and mutated over the course of main().
let stepStatusSummary;
let showStepStatusSummary = false;

async function main() {
  Error.stackTraceLimit = Infinity;

  stepStatusSummary = {
    determineMediaCachePath:
      {...defaultStepStatus, name: `determine media cache path`},

    migrateThumbnails:
      {...defaultStepStatus, name: `migrate thumbnails`},

    loadThumbnailCache:
      {...defaultStepStatus, name: `load thumbnail cache file`},

    generateThumbnails:
      {...defaultStepStatus, name: `generate thumbnails`},

    loadDataFiles:
      {...defaultStepStatus, name: `load and process data files`},

    linkWikiDataArrays:
      {...defaultStepStatus, name: `link wiki data arrays`},

    precacheCommonData:
      {...defaultStepStatus, name: `precache common data`},

    filterDuplicateDirectories:
      {...defaultStepStatus, name: `filter duplicate directories`},

    filterReferenceErrors:
      {...defaultStepStatus, name: `filter reference errors`},

    sortWikiDataArrays:
      {...defaultStepStatus, name: `sort wiki data arrays`},

    precacheAllData:
      {...defaultStepStatus, name: `precache nearly all data`},

    loadInternalDefaultLanguage:
      {...defaultStepStatus, name: `load internal default language`},

    loadLanguageFiles:
      {...defaultStepStatus, name: `load custom language files`},

    initializeDefaultLanguage:
      {...defaultStepStatus, name: `initialize default language`},

    verifyImagePaths:
      {...defaultStepStatus, name: `verify missing/misplaced image paths`},

    preloadFileSizes:
      {...defaultStepStatus, name: `preload file sizes`},

    performBuild:
      {...defaultStepStatus, name: `perform selected build mode`},
  };

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
    return false;
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

    'media-cache-path': {
      help: `Specify path to media cache directory, including automatically generated thumbnails\n\nThis usually doesn't need to be provided, and will be inferred by adding "-cache" to the end of the media directory`,
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
      help: `Specify path to language directory, including JSON files that mapping internal string keys to localized language content, and various language metadata\n\nOptional for wiki building, unless the wiki's default language is not English; may be provided via the HSMUSIC_LANG environment variable instead`,
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

    'skip-reference-validation': {
      help: `Skips checking and reporting reference errors, which speeds up the build but may silently allow erroneous data to pass through`,
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

    'migrate-thumbs': {
      help: `Transfer automatically generated thumbnail files out of an existing media directory and into the easier-to-manage media-cache directory`,
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

    'show-step-summary': {
      help: `Show a summary of all the top-level build steps once hsmusic exits. This is mostly useful for progammer debugging!`,
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
      type: 'value',
      validate(threads) {
        if (parseInt(threads) !== parseFloat(threads)) return 'an integer';
        if (parseInt(threads) < 0) return 'a counting number or zero';
        return true;
      }
    },
    magick: {alias: 'magick-threads'},

    // This option is super slow and has the potential for bugs! It puts
    // CacheableObject in a mode where every instance is a Proxy which will
    // keep track of invalid property accesses.
    'show-invalid-property-accesses': {
      help: `Report accesses at runtime to nonexistant properties on wiki data objects, at a dramatic performance cost\n(Internal/development use only)`,
      type: 'flag',
    },

    'precache-mode': {
      help:
        `Change the way certain runtime-computed values are preemptively evaluated and cached\n\n` +
        `common: Preemptively compute certain properties which are needed for basic data loading and site generation\n\n` +
        `all: Compute every visible data property, optimizing rate of content generation, but causing a long stall before the build actually starts\n\n` +
        `none: Don't preemptively compute any values - strictly the most efficient, but may result in unpredictably "lopsided" performance for individual steps of loading data and building the site\n\n` +
        `Defaults to 'common'`,
      type: 'value',
      validate(value) {
        if (['common', 'all', 'none'].includes(value)) return true;
        return 'common, all, or none';
      },
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
      console.log(colors.bright(msg));

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

        console.log(colors.bright(` --` + name) +
          (aliases.length
            ? ` (or: ${aliases.map(alias => colors.bright(`--` + alias)).join(', ')})`
            : '') +
          (descriptor.help
            ? ''
            : colors.dim('  (no help provided)')));

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
      colors.bright(`hsmusic (aka. Homestuck Music Wiki)\n`) +
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

    return true;
  }

  const dataPath = cliOptions['data-path'] || process.env.HSMUSIC_DATA;
  const mediaPath = cliOptions['media-path'] || process.env.HSMUSIC_MEDIA;
  const langPath = cliOptions['lang-path'] || process.env.HSMUSIC_LANG; // Can 8e left unset!

  const migrateThumbs = cliOptions['migrate-thumbs'] ?? false;
  const skipThumbs = cliOptions['skip-thumbs'] ?? false;
  const thumbsOnly = cliOptions['thumbs-only'] ?? false;
  const skipReferenceValidation = cliOptions['skip-reference-validation'] ?? false;
  const noBuild = cliOptions['no-build'] ?? false;

  showStepStatusSummary = cliOptions['show-step-summary'] ?? false;

  const replFlag = cliOptions['repl'] ?? false;
  const disableReplHistory = cliOptions['no-repl-history'] ?? false;

  const showAggregateTraces = cliOptions['show-traces'] ?? false;

  const precacheMode = cliOptions['precache-mode'] ?? 'common';
  const showInvalidPropertyAccesses = cliOptions['show-invalid-property-accesses'] ?? false;

  // Makes writing nicer on the CPU and file I/O parts of the OS, with a
  // marginal performance deficit while waiting for file writes to finish
  // before proceeding to more page processing.
  const queueSize = +(cliOptions['queue-size'] ?? defaultQueueSize);

  const magickThreads = +(cliOptions['magick-threads'] ?? defaultMagickThreads);

  if (!dataPath) {
    logError`${`Expected --data-path option or HSMUSIC_DATA to be set`}`;
  }

  if (!mediaPath) {
    logError`${`Expected --media-path option or HSMUSIC_MEDIA to be set`}`;
  }

  if (!dataPath || !mediaPath) {
    return false;
  }

  if (replFlag) {
    return bootRepl({
      dataPath,
      mediaPath,

      disableHistory: disableReplHistory,
      showTraces: showAggregateTraces,
    });
  }

  // Prepare not-applicable steps before anything else.

  if (skipThumbs) {
    Object.assign(stepStatusSummary.generateThumbnails, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `provided --skip-thumbs`,
    });
  } else {
    Object.assign(stepStatusSummary.loadThumbnailCache, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `using cache from thumbnail generation`,
    });
  }

  if (!migrateThumbs) {
    Object.assign(stepStatusSummary.migrateThumbnails, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `--migrate-thumbs not provided`,
    });
  }

  if (skipReferenceValidation) {
    logWarn`Skipping reference validation. If any reference errors are present`;
    logWarn`in data, they will be silently passed along to the build.`;

    Object.assign(stepStatusSummary.filterReferenceErrors, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `--skip-reference-validation provided`,
    });
  }

  switch (precacheMode) {
    case 'common':
      Object.assign(stepStatusSummary.precacheAllData, {
        status: STATUS_NOT_APPLICABLE,
        annotation: `--precache-mode is common, not all`,
      });

      break;

    case 'all':
      Object.assign(stepStatusSummary.precacheCommonData, {
        status: STATUS_NOT_APPLICABLE,
        annotation: `--precache-mode is all, not common`,
      });

      break;

    case 'none':
      Object.assign(stepStatusSummary.precacheCommonData, {
        status: STATUS_NOT_APPLICABLE,
        annotation: `--precache-mode is none`,
      });

      Object.assign(stepStatusSummary.precacheAllData, {
        status: STATUS_NOT_APPLICABLE,
        annotation: `--precache-mode is none`,
      });

      break;
  }

  if (!langPath) {
    Object.assign(stepStatusSummary.loadLanguageFiles, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `neither --lang-path nor HSMUSIC_LANG provided`,
    });
  }

  if (noBuild) {
    Object.assign(stepStatusSummary.performBuild, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `--no-build provided`,
    });
  }

  if (skipThumbs && thumbsOnly) {
    logInfo`Well, you've put yourself rather between a roc and a hard place, hmmmm?`;
    return false;
  }

  Object.assign(stepStatusSummary.determineMediaCachePath, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  const {mediaCachePath, annotation: mediaCachePathAnnotation} =
    await determineMediaCachePath({
      mediaPath,
      providedMediaCachePath:
        cliOptions['media-cache-path'] || process.env.HSMUSIC_MEDIA_CACHE,
      disallowDoubling:
        migrateThumbs,
    });

  if (!mediaCachePath) {
    logError`Couldn't determine a media cache path. (${mediaCachePathAnnotation})`;

    switch (mediaCachePathAnnotation) {
      case 'inferred path does not have cache':
        logError`If you're certain this is the right path, you can provide it via`;
        logError`${'--media-cache-path'} or ${'HSMUSIC_MEDIA_CACHE'}, and it should work.`;
        break;

      case 'inferred path not readable':
        logError`The folder couldn't be read, which usually indicates`;
        logError`a permissions error. Try to resolve this, or provide`;
        logError`a new path with ${'--media-cache-path'} or ${'HSMUSIC_MEDIA_CACHE'}.`;
        break;

      case 'media path not provided': /* unreachable */
        logError`It seems a ${'--media-path'} (or ${'HSMUSIC_MEDIA'}) wasn't provided.`;
        logError`Make sure one of these is actually pointing to a path that exists.`;
        break;
    }

    Object.assign(stepStatusSummary.determineMediaCachePath, {
      status: STATUS_FATAL_ERROR,
      annotation: mediaCachePathAnnotation,
      timeEnd: Date.now(),
    });

    return false;
  }

  logInfo`Using media cache at: ${mediaCachePath} (${mediaCachePathAnnotation})`;

  Object.assign(stepStatusSummary.determineMediaCachePath, {
    status: STATUS_DONE_CLEAN,
    annotation: mediaCachePathAnnotation,
    timeEnd: Date.now(),
  });

  if (migrateThumbs) {
    Object.assign(stepStatusSummary.migrateThumbnails, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const result = await migrateThumbsIntoDedicatedCacheDirectory({
      mediaPath,
      mediaCachePath,
      queueSize,
    });

    if (result.succses) {
      Object.assign(stepStatusSummary.migrateThumbnails, {
        status: STATUS_FATAL_ERROR,
        annotation: `view log for details`,
        timeEnd: Date.now(),
      });

      return false;
    }

    logInfo`Good to go! Run hsmusic again without ${'--migrate-thumbs'} to start`;
    logInfo`using the migrated media cache.`;

    Object.assign(stepStatusSummary.migrateThumbnails, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });

    return true;
  }

  const niceShowAggregate = (error, ...opts) => {
    showAggregate(error, {
      showTraces: showAggregateTraces,
      pathToFileURL: (f) => path.relative(__dirname, fileURLToPath(f)),
      ...opts,
    });
  };

  let thumbsCache;

  if (skipThumbs) {
    Object.assign(stepStatusSummary.loadThumbnailCache, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const thumbsCachePath = path.join(mediaCachePath, thumbsCacheFile);

    try {
      thumbsCache = JSON.parse(await readFile(thumbsCachePath));
    } catch (error) {
      if (error.code === 'ENOENT') {
        logError`The thumbnail cache doesn't exist, and it's necessary to build`
        logError`the website. Please run once without ${'--skip-thumbs'} - after`
        logError`that you'll be good to go and don't need to process thumbnails`
        logError`again!`;

        Object.assign(stepStatusSummary.loadThumbnailCache, {
          status: STATUS_FATAL_ERROR,
          annotation: `cache does not exist`,
          timeEnd: Date.now(),
        });

        return false;
      } else {
        logError`Malformed or unreadable thumbnail cache file: ${error}`;
        logError`Path: ${thumbsCachePath}`;
        logError`The thumbbnail cache is necessary to build the site, so you'll`;
        logError`have to investigate this to get the build working. Try running`;
        logError`again without ${'--skip-thumbs'}. If you can't get it working,`;
        logError`you're welcome to message in the HSMusic Discord and we'll try`;
        logError`to help you out with troubleshooting!`;
        logError`${'https://hsmusic.wiki/discord/'}`;

        Object.assign(stepStatusSummary.loadThumbnailCache, {
          status: STATUS_FATAL_ERROR,
          annotation: `cache malformed or unreadable`,
          timeEnd: Date.now(),
        });

        return false;
      }
    }

    logInfo`Thumbnail cache file successfully read.`;

    Object.assign(stepStatusSummary.loadThumbnailCache, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });

    logInfo`Skipping thumbnail generation.`;
  } else {
    Object.assign(stepStatusSummary.generateThumbnails, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    logInfo`Begin thumbnail generation... -----+`;

    const result = await genThumbs({
      mediaPath,
      mediaCachePath,

      queueSize,
      magickThreads,
      quiet: !thumbsOnly,
    });

    logInfo`Done thumbnail generation! --------+`;

    if (!result.success) {
      Object.assign(stepStatusSummary.generateThumbnails, {
        status: STATUS_FATAL_ERROR,
        annotation: `view log for details`,
        timeEnd: Date.now(),
      });

      return false;
    }

    Object.assign(stepStatusSummary.generateThumbnails, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });

    if (thumbsOnly) {
      return true;
    }

    thumbsCache = result.cache;
  }

  if (noBuild) {
    logInfo`Not generating any site or page files this run (--no-build passed).`;
  } else if (usingDefaultBuildMode) {
    logInfo`No build mode specified, using default: ${selectedBuildModeFlag}`;
  } else {
    logInfo`Using specified build mode: ${selectedBuildModeFlag}`;
  }

  if (showInvalidPropertyAccesses) {
    CacheableObject.DEBUG_SLOW_TRACK_INVALID_PROPERTIES = true;
  }

  Object.assign(stepStatusSummary.loadDataFiles, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  let processDataAggregate, wikiDataResult;

  try {
    ({aggregate: processDataAggregate, result: wikiDataResult} =
        await loadAndProcessDataDocuments({dataPath}));
  } catch (error) {
    console.error(error);

    logError`There was a JavaScript error loading data files.`;
    fileIssue();

    Object.assign(stepStatusSummary.loadDataFiles, {
      status: STATUS_FATAL_ERROR,
      annotation: `javascript error - view log for details`,
      timeEnd: Date.now(),
    });

    return false;
  }

  Object.assign(wikiData, wikiDataResult);

  {
    const logThings = (thingDataProp, label) =>
      logInfo` - ${wikiData[thingDataProp]?.length ?? colors.red('(Missing!)')} ${colors.normal(colors.dim(label))}`;
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
      errorless = false;
    }

    if (!wikiData.wikiInfo) {
      logError`Can't proceed without wiki info file (${WIKI_INFO_FILE}) successfully loading`;

      Object.assign(stepStatusSummary.loadDataFiles, {
        status: STATUS_FATAL_ERROR,
        annotation: `wiki info object not available`,
        timeEnd: Date.now(),
      });

      return false;
    }

    if (errorless) {
      logInfo`All data files processed without any errors - nice!`;

      Object.assign(stepStatusSummary.loadDataFiles, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    } else {
      logWarn`If the remaining valid data is complete enough, the wiki will`;
      logWarn`still build - but all errored data will be skipped.`;
      logWarn`(Resolve errors for more complete output!)`;

      Object.assign(stepStatusSummary.loadDataFiles, {
        status: STATUS_HAS_WARNINGS,
        annotation: `view log for details`,
        timeEnd: Date.now(),
      });
    }
  }

  // Link data arrays so that all essential references between objects are
  // complete, so properties (like dates!) are inherited where that's
  // appropriate.

  Object.assign(stepStatusSummary.linkWikiDataArrays, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  linkWikiDataArrays(wikiData);

  Object.assign(stepStatusSummary.linkWikiDataArrays, {
    status: STATUS_DONE_CLEAN,
    timeEnd: Date.now(),
  });

  if (precacheMode === 'common') {
    Object.assign(stepStatusSummary.precacheCommonData, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const commonDataMap = {
      albumData: new Set([
        // Needed for sorting
        'date', 'tracks',
        // Needed for computing page paths
        'commentary',
      ]),

      artTagData: new Set([
        // Needed for computing page paths
        'isContentWarning',
      ]),

      artistAliasData: new Set([
        // Needed for computing page paths
        'aliasedArtist',
      ]),

      flashData: new Set([
        // Needed for sorting
        'act', 'date',
      ]),

      flashActData: new Set([
        // Needed for sorting
        'flashes',
      ]),

      groupData: new Set([
        // Needed for computing page paths
        'albums',
      ]),

      listingSpec: new Set([
        // Needed for computing page paths
        'contentFunction', 'featureFlag',
      ]),

      trackData: new Set([
        // Needed for sorting
        'album', 'date',
        // Needed for computing page paths
        'commentary',
      ]),
    };

    for (const [wikiDataKey, properties] of Object.entries(commonDataMap)) {
      const thingData = wikiData[wikiDataKey];
      const allProperties = new Set(['name', 'directory', ...properties]);
      for (const thing of thingData) {
        for (const property of allProperties) {
          void thing[property];
        }
      }
    }

    Object.assign(stepStatusSummary.precacheCommonData, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  }

  // Filter out any things with duplicate directories throughout the data,
  // warning about them too.

  Object.assign(stepStatusSummary.filterDuplicateDirectories, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  const filterDuplicateDirectoriesAggregate =
    filterDuplicateDirectories(wikiData);

  try {
    filterDuplicateDirectoriesAggregate.close();
    logInfo`No duplicate directories found - nice!`;

    Object.assign(stepStatusSummary.filterDuplicateDirectories, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  } catch (aggregate) {
    niceShowAggregate(aggregate);

    logWarn`The above duplicate directories were detected while reviewing data files.`;
    logWarn`Since it's impossible to automatically determine which one's directory is`;
    logWarn`correct, the build can't continue. Specify unique 'Directory' fields in`;
    logWarn`some or all of these data entries to resolve the errors.`;

    Object.assign(stepStatusSummary.filterDuplicateDirectories, {
      status: STATUS_FATAL_ERROR,
      annotation: `duplicate directories found`,
      timeEnd: Date.now(),
    });

    return false;
  }

  // Filter out any reference errors throughout the data, warning about them
  // too.

  if (!skipReferenceValidation) {
    Object.assign(stepStatusSummary.filterReferenceErrors, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const filterReferenceErrorsAggregate = filterReferenceErrors(wikiData);

    try {
      filterReferenceErrorsAggregate.close();

      logInfo`All references validated without any errors - nice!`;

      Object.assign(stepStatusSummary.filterReferenceErrors, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    } catch (error) {
      niceShowAggregate(error);

      logWarn`The above errors were detected while validating references in data files.`;
      logWarn`The wiki will still build, but these connections between data objects`;
      logWarn`will be completely skipped. Resolve the errors for more complete output.`;

      Object.assign(stepStatusSummary.filterReferenceErrors, {
        status: STATUS_HAS_WARNINGS,
        annotation: `view log for details`,
        timeEnd: Date.now(),
      });
    }
  }

  // Sort data arrays so that they're all in order! This may use properties
  // which are only available after the initial linking.

  Object.assign(stepStatusSummary.sortWikiDataArrays, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  sortWikiDataArrays(wikiData);

  Object.assign(stepStatusSummary.sortWikiDataArrays, {
    status: STATUS_DONE_CLEAN,
    timeEnd: Date.now(),
  });

  if (precacheMode === 'all') {
    Object.assign(stepStatusSummary.precacheAllData, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    // TODO: Aggregate errors here, instead of just throwing.
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

    Object.assign(stepStatusSummary.precacheAllData, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  }

  if (noBuild) {
    displayCompositeCacheAnalysis();

    if (precacheMode === 'all') {
      return true;
    }
  }

  Object.assign(stepStatusSummary.loadInternalDefaultLanguage, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  let internalDefaultLanguage;

  const internalDefaultLanguageWatcher =
    watchLanguageFile(path.join(__dirname, DEFAULT_STRINGS_FILE));

  try {
    await new Promise((resolve, reject) => {
      const watcher = internalDefaultLanguageWatcher;

      const onReady = () => {
        watcher.removeListener('ready', onReady);
        watcher.removeListener('error', onError);
        resolve();
      };

      const onError = error => {
        watcher.removeListener('ready', onReady);
        watcher.removeListener('error', onError);
        watcher.close();
        reject(error);
      };

      watcher.on('ready', onReady);
      watcher.on('error', onError);
    });

    internalDefaultLanguage = internalDefaultLanguageWatcher.language;
  } catch (_error) {
    // No need to display the error here - it's already printed by
    // watchLanguageFile.
    logError`There was an error reading the internal language file.`;
    fileIssue();

    Object.assign(stepStatusSummary.loadInternalDefaultLanguage, {
      status: STATUS_FATAL_ERROR,
      annotation: `see log for details`,
      timeEnd: Date.now(),
    });

    return false;
  }

  // Bypass node.js special-case handling for uncaught error events
  internalDefaultLanguageWatcher.on('error', () => {});

  Object.assign(stepStatusSummary.loadInternalDefaultLanguage, {
    status: STATUS_DONE_CLEAN,
    timeEnd: Date.now(),
  });

  let customLanguageWatchers;
  let languages;

  if (langPath) {
    Object.assign(stepStatusSummary.loadLanguageFiles, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const languageDataFiles = await traverse(langPath, {
      filterFile: name => path.extname(name) === '.json',
      pathStyle: 'device',
    });

    customLanguageWatchers =
      languageDataFiles.map(file => {
        const watcher = watchLanguageFile(file);

        // Bypass node.js special-case handling for uncaught error events
        watcher.on('error', () => {});

        return watcher;
      });

    const waitingOnWatchers = new Set(customLanguageWatchers);

    const initialResults =
      await Promise.allSettled(
        customLanguageWatchers.map(watcher =>
          new Promise((resolve, reject) => {
            const onReady = () => {
              watcher.removeListener('ready', onReady);
              watcher.removeListener('error', onError);
              waitingOnWatchers.delete(watcher);
              resolve();
            };

            const onError = error => {
              watcher.removeListener('ready', onReady);
              watcher.removeListener('error', onError);
              reject(error);
            };

            watcher.on('ready', onReady);
            watcher.on('error', onError);
          })));

    if (initialResults.some(({status}) => status === 'rejected')) {
      logWarn`There were errors loading custom languages from the language path`;
      logWarn`provided: ${langPath}`;

      if (noInput) {
        logError`Failed to load language files. Please investigate these, or don't provide`;
        logError`--lang-path (or HSMUSIC_LANG) and build again.`;

        Object.assign(stepStatusSummary.loadLanguageFiles, {
          status: STATUS_FATAL_ERROR,
          annotation: `see log for details`,
          timeEnd: Date.now(),
        });

        return false;
      }

      logWarn`The build should start automatically if you investigate these.`;
      logWarn`Or, exit by pressing ^C here (control+C) and run again without`;
      logWarn`providing ${'--lang-path'} (or ${'HSMUSIC_LANG'}) to build without custom`;
      logWarn`languages.`;

      await new Promise(resolve => {
        for (const watcher of waitingOnWatchers) {
          watcher.once('ready', () => {
            waitingOnWatchers.remove(watcher);
            if (empty(waitingOnWatchers)) {
              resolve();
            }
          });
        }
      });
    }

    languages =
      Object.fromEntries(
        customLanguageWatchers
          .map(watcher => [watcher.language.code, watcher.language]));

    Object.assign(stepStatusSummary.loadLanguageFiles, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  } else {
    languages = {};
  }

  Object.assign(stepStatusSummary.initializeDefaultLanguage, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  let finalDefaultLanguage;
  let finalDefaultLanguageWatcher;
  let finalDefaultLanguageAnnotation;

  if (wikiData.wikiInfo.defaultLanguage) {
    const customDefaultLanguage = languages[wikiData.wikiInfo.defaultLanguage];

    if (!customDefaultLanguage) {
      logError`Wiki info file specified default language is ${wikiData.wikiInfo.defaultLanguage}, but no such language file exists!`;
      if (langPath) {
        logError`Check if an appropriate file exists in ${langPath}?`;
      } else {
        logError`Be sure to specify ${'--lang-path'} or ${'HSMUSIC_LANG'} with the path to language files.`;
      }

      Object.assign(stepStatusSummary.initializeDefaultLanguage, {
        status: STATUS_FATAL_ERROR,
        annotation: `wiki specifies default language whose file is not available`,
        timeEnd: Date.now(),
      });

      return false;
    }

    logInfo`Applying new default strings from custom ${customDefaultLanguage.code} language file.`;

    finalDefaultLanguage = customDefaultLanguage;
    finalDefaultLanguageWatcher =
      customLanguageWatchers.find(({language}) => language === customDefaultLanguage);
    finalDefaultLanguageAnnotation = `using wiki-specified custom default language`;
  } else if (languages[internalDefaultLanguage.code]) {
    const customDefaultLanguage = languages[internalDefaultLanguage.code];
    finalDefaultLanguage = customDefaultLanguage;
    finalDefaultLanguageWatcher =
      customLanguageWatchers.find(({language}) => language === customDefaultLanguage);
    finalDefaultLanguageAnnotation = `using inferred custom default language`;
  } else {
    languages[internalDefaultLanguage.code] = internalDefaultLanguage;

    finalDefaultLanguage = internalDefaultLanguage;
    finalDefaultLanguageWatcher = internalDefaultLanguageWatcher;
    finalDefaultLanguageAnnotation = `no custom default language specified`;
  }

  const inheritStringsFromInternalLanguage = () => {
    if (finalDefaultLanguage === internalDefaultLanguage) return;
    const {strings: inheritedStrings} = internalDefaultLanguage;
    Object.assign(finalDefaultLanguage, {inheritedStrings});
  };

  const inheritStringsFromDefaultLanguage = () => {
    const {strings: inheritedStrings} = finalDefaultLanguage;
    for (const language of Object.values(languages)) {
      if (language === finalDefaultLanguage) continue;
      Object.assign(language, {inheritedStrings});
    }
  };

  // The custom default language, if set, will be the new one providing fallback
  // strings for other languages. But on its own, it still might not be a complete
  // list of strings - so it falls back to the internal default language, which
  // won't otherwise be presented in the build.
  if (finalDefaultLanguage !== internalDefaultLanguage) {
    inheritStringsFromInternalLanguage();
    internalDefaultLanguageWatcher.on('update', () => {
      inheritStringsFromInternalLanguage();
      inheritStringsFromDefaultLanguage();
    });
  }

  inheritStringsFromDefaultLanguage();
  finalDefaultLanguageWatcher.on('update', () => {
    inheritStringsFromDefaultLanguage();
  });

  logInfo`Loaded language strings: ${Object.keys(languages).join(', ')}`;

  Object.assign(stepStatusSummary.initializeDefaultLanguage, {
    status: STATUS_DONE_CLEAN,
    annotation: finalDefaultLanguageAnnotation,
    timeEnd: Date.now(),
  });

  const urls = generateURLs(urlSpec);

  Object.assign(stepStatusSummary.verifyImagePaths, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  const {missing: missingImagePaths, misplaced: misplacedImagePaths} =
    await verifyImagePaths(mediaPath, {urls, wikiData});

  if (empty(missingImagePaths) && empty(misplacedImagePaths)) {
    Object.assign(stepStatusSummary.verifyImagePaths, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  } else if (empty(missingImagePaths)) {
    Object.assign(stepStatusSummary.verifyImagePaths, {
      status: STATUS_HAS_WARNINGS,
      annotation: `misplaced images detected`,
      timeEnd: Date.now(),
    });
  } else if (empty(misplacedImagePaths)) {
    Object.assign(stepStatusSummary.verifyImagePaths, {
      status: STATUS_HAS_WARNINGS,
      annotation: `missing images detected`,
      timeEnd: Date.now(),
    });
  } else {
    Object.assign(stepStatusSummary.verifyImagePaths, {
      status: STATUS_HAS_WARNINGS,
      annotation: `missing and misplaced images detected`,
      timeEnd: Date.now(),
    });
  }

  Object.assign(stepStatusSummary.preloadFileSizes, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

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
  const imageFilePaths =
    await traverse(mediaPath, {
      pathStyle: 'device',
      filterDir: dir => dir !== '.git',
      filterFile: file =>
        ['.png', '.gif', '.jpg'].includes(path.extname(file)) &&
        !isThumb(file),
    }).then(files => files
        .map(file => ({
          device: file,
          media:
            urls
              .from('media.root')
              .to('media.path', path.relative(mediaPath, file).split(path.sep).join('/')),
        })));

  const getSizeOfMediaFileHelper = paths => (mediaPath) => {
    const pair = paths.find(({media}) => media === mediaPath);
    if (!pair) return null;
    return fileSizePreloader.getSizeOfPath(pair.device);
  };

  const getSizeOfAdditionalFile = getSizeOfMediaFileHelper(additionalFilePaths);
  const getSizeOfImagePath = getSizeOfMediaFileHelper(imageFilePaths);

  logInfo`Preloading filesizes for ${additionalFilePaths.length} additional files...`;

  fileSizePreloader.loadPaths(...additionalFilePaths.map((path) => path.device));
  await fileSizePreloader.waitUntilDoneLoading();

  logInfo`Preloading filesizes for ${imageFilePaths.length} full-resolution images...`;

  fileSizePreloader.loadPaths(...imageFilePaths.map((path) => path.device));
  await fileSizePreloader.waitUntilDoneLoading();

  if (fileSizePreloader.hasErrored) {
    logWarn`Some media files couldn't be read for preloading filesizes.`;
    logWarn`This means the wiki won't display file sizes for these files.`;
    logWarn`Investigate missing or unreadable files to get that fixed!`;

    Object.assign(stepStatusSummary.preloadFileSizes, {
      status: STATUS_HAS_WARNINGS,
      annotation: `see log for details`,
      timeEnd: Date.now(),
    });
  } else {
    logInfo`Done preloading filesizes without any errors - nice!`;

    Object.assign(stepStatusSummary.preloadFileSizes, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  }

  if (noBuild) {
    return true;
  }

  const developersComment =
    `<!--\n` + [
      wikiData.wikiInfo.canonicalBase
        ? `hsmusic.wiki - ${wikiData.wikiInfo.name}, ${wikiData.wikiInfo.canonicalBase}`
        : `hsmusic.wiki - ${wikiData.wikiInfo.name}`,
      'Code copyright 2019-2023 Quasar Nebula et al (MIT License)',
      ...wikiData.wikiInfo.canonicalBase === 'https://hsmusic.wiki/' ? [
        'Data avidly compiled and localization brought to you',
        'by our awesome team and community of wiki contributors',
        '***',
        'Want to contribute? Join our Discord or leave feedback!',
        '- https://hsmusic.wiki/discord/',
        '- https://hsmusic.wiki/feedback/',
        '- https://github.com/hsmusic/',
      ] : [
        'https://github.com/hsmusic/',
      ],
      '***',
      BUILD_TIME &&
        `Site built: ${BUILD_TIME.toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'long',
        })}`,
      COMMIT &&
        `Latest code commit: ${COMMIT}`,
    ]
      .filter(Boolean)
      .map(line => `    ` + line)
      .join('\n') + `\n-->`;

  Object.assign(stepStatusSummary.performBuild, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  let buildModeResult;

  try {
    buildModeResult = await selectedBuildMode.go({
      cliOptions,
      dataPath,
      mediaPath,
      mediaCachePath,
      queueSize,
      srcRootPath: __dirname,

      defaultLanguage: finalDefaultLanguage,
      languages,
      missingImagePaths,
      thumbsCache,
      urls,
      urlSpec,
      wikiData,

      cachebust: '?' + CACHEBUST,
      developersComment,
      getSizeOfAdditionalFile,
      getSizeOfImagePath,
      niceShowAggregate,
    });
  } catch (error) {
    console.error(error);

    logError`There was a JavaScript error performing the build.`;
    fileIssue();

    Object.assign(stepStatusSummary.performBuild, {
      status: STATUS_FATAL_ERROR,
      message: `javascript error - view log for details`,
      timeEnd: Date.now(),
    });

    return false;
  }

  if (buildModeResult !== true) {
    Object.assign(stepStatusSummary.performBuild, {
      status: STATUS_HAS_WARNINGS,
      annotation: `may not have completed - view log for details`,
      timeEnd: Date.now(),
    });

    return false;
  }

  Object.assign(stepStatusSummary.performBuild, {
    status: STATUS_DONE_CLEAN,
    timeEnd: Date.now(),
  });

  return true;
}

// TODO: isMain detection isn't consistent across platforms here
/* eslint-disable-next-line no-constant-condition */
if (true || isMain(import.meta.url) || path.basename(process.argv[1]) === 'hsmusic') {
  (async () => {
    let result;

    const totalTimeStart = Date.now();

    try {
      result = await main();
    } catch (error) {
      if (error instanceof AggregateError) {
        showAggregate(error);
      } else if (error.cause) {
        console.error(error);
        showAggregate(error);
      } else {
        console.error(error);
      }
    }

    const totalTimeEnd = Date.now();

    const formatDuration = timeDelta => {
      const seconds = timeDelta / 1000;

      if (seconds > 90) {
        const modSeconds = Math.floor(seconds % 60);
        const minutes = Math.floor(seconds - seconds % 60) / 60;
        return `${minutes}m${modSeconds}s`;
      }

      if (seconds < 0.1) {
        return 'instant';
      }

      const precision = (seconds > 1 ? 3 : 2);
      return `${seconds.toPrecision(precision)}s`;
    };

    if (showStepStatusSummary) {
      const totalDuration = formatDuration(totalTimeEnd - totalTimeStart);

      console.error(colors.bright(`Step summary:`));

      const longestNameLength =
        Math.max(...
          Object.values(stepStatusSummary)
            .map(({name}) => name.length));

      const stepsNotClean =
        Object.values(stepStatusSummary)
          .map(({status}) =>
            status === STATUS_HAS_WARNINGS ||
            status === STATUS_FATAL_ERROR ||
            status === STATUS_STARTED_NOT_DONE);

      const anyStepsNotClean =
        stepsNotClean.includes(true);

      const stepDetails = Object.values(stepStatusSummary);

      const stepDurations =
        stepDetails.map(({status, timeStart, timeEnd}) => {
          if (
            status === STATUS_NOT_APPLICABLE ||
            status === STATUS_NOT_STARTED ||
            status === STATUS_STARTED_NOT_DONE
          ) {
            return '-';
          }

          if (typeof timeStart !== 'number' || typeof timeEnd !== 'number') {
            return 'unknown';
          }

          return formatDuration(timeEnd - timeStart);
        });

      const longestDurationLength =
        Math.max(...stepDurations.map(duration => duration.length));

      for (let index = 0; index < stepDetails.length; index++) {
        const {name, status, annotation} = stepDetails[index];
        const duration = stepDurations[index];

        let message =
          (stepsNotClean[index]
            ? `!! `
            : ` - `);

        message += `(${duration})`.padStart(longestDurationLength + 2, ' ');
        message += ` `;
        message += `${name}: `.padEnd(longestNameLength + 4, '.');
        message += ` `;
        message += status;

        if (annotation) {
          message += ` (${annotation})`;
        }

        switch (status) {
          case STATUS_DONE_CLEAN:
            console.error(colors.green(message));
            break;

          case STATUS_NOT_STARTED:
          case STATUS_NOT_APPLICABLE:
            console.error(colors.dim(message));
            break;

          case STATUS_HAS_WARNINGS:
          case STATUS_STARTED_NOT_DONE:
            console.error(colors.yellow(message));
            break;

          case STATUS_FATAL_ERROR:
            console.error(colors.red(message));
            break;

          default:
            console.error(message);
            break;
        }
      }

      console.error(colors.bright(`Done in ${totalDuration}.`));

      if (result === true) {
        if (anyStepsNotClean) {
          console.error(colors.bright(`Final output is true, but some steps aren't clean.`));
          process.exit(1);
          return;
        } else {
          console.error(colors.bright(`Final output is true and all steps are clean.`));
        }
      } else if (result === false) {
        console.error(colors.bright(`Final output is false.`));
      } else {
        console.error(colors.bright(`Final output is not true (${result}).`));
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
