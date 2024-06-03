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

import '#import-heck';

import {execSync} from 'node:child_process';
import {readdir, readFile, stat} from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import wrap from 'word-wrap';

import {mapAggregate, showAggregate} from '#aggregate';
import CacheableObject from '#cacheable-object';
import {displayCompositeCacheAnalysis} from '#composite';
import {bindFind, getAllFindSpecs} from '#find';
import {processLanguageFile, watchLanguageFile, internalDefaultStringsFile}
  from '#language';
import {isMain, traverse} from '#node-utils';
import {writeSearchData} from '#search';
import {sortByName} from '#sort';
import {generateURLs, urlSpec} from '#urls';
import {identifyAllWebRoutes} from '#web-routes';

import {
  colors,
  decorateTime,
  fileIssue,
  logWarn,
  logInfo,
  logError,
  parseOptions,
  progressCallAll,
  showHelpForOptions as unboundShowHelpForOptions,
} from '#cli';

import {
  filterReferenceErrors,
  reportDirectoryErrors,
  reportContentTextErrors,
} from '#data-checks';

import {
  bindOpts,
  empty,
  indentWrap as unboundIndentWrap,
  withEntries,
} from '#sugar';

import genThumbs, {
  CACHE_FILE as thumbsCacheFile,
  defaultMagickThreads,
  determineMediaCachePath,
  isThumb,
  migrateThumbsIntoDedicatedCacheDirectory,
  verifyImagePaths,
} from '#thumbs';

import {
  getAllDataSteps,
  linkWikiDataArrays,
  loadYAMLDocumentsFromDataSteps,
  processThingsFromDataSteps,
  saveThingsFromDataSteps,
  sortWikiDataArrays,
} from '#yaml';

import FileSizePreloader from './file-size-preloader.js';
import {listingSpec, listingTargetSpec} from './listing-spec.js';
import * as buildModes from './write/build-modes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let COMMIT;
try {
  COMMIT = execSync('git log --format="%h %B" -n 1 HEAD', {cwd: __dirname}).toString().trim();
} catch (error) {
  COMMIT = '(failed to detect)';
}

const BUILD_TIME = new Date();

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

  let paragraph = true;

  stepStatusSummary = {
    determineMediaCachePath:
      {...defaultStepStatus, name: `determine media cache path`,
        for: ['thumbs', 'build']},

    migrateThumbnails:
      {...defaultStepStatus, name: `migrate thumbnails`,
        for: ['thumbs']},

    loadThumbnailCache:
      {...defaultStepStatus, name: `load thumbnail cache file`,
        for: ['thumbs', 'build']},

    generateThumbnails:
      {...defaultStepStatus, name: `generate thumbnails`,
        for: ['thumbs']},

    loadDataFiles:
      {...defaultStepStatus, name: `load and process data files`,
        for: ['build']},

    linkWikiDataArrays:
      {...defaultStepStatus, name: `link wiki data arrays`,
        for: ['build']},

    precacheCommonData:
      {...defaultStepStatus, name: `precache common data`,
        for: ['build']},

    reportDirectoryErrors:
      {...defaultStepStatus, name: `report directory errors`,
        for: ['verify']},

    filterReferenceErrors:
      {...defaultStepStatus, name: `filter reference errors`,
        for: ['verify']},

    reportContentTextErrors:
      {...defaultStepStatus, name: `report content text errors`,
        for: ['verify']},

    sortWikiDataArrays:
      {...defaultStepStatus, name: `sort wiki data arrays`,
        for: ['build']},

    precacheAllData:
      {...defaultStepStatus, name: `precache nearly all data`,
        for: ['build']},

    // TODO: This should be split into load/watch steps.
    loadInternalDefaultLanguage:
      {...defaultStepStatus, name: `load internal default language`,
        for: ['build']},

    loadLanguageFiles:
      {...defaultStepStatus, name: `statically load custom language files`,
        for: ['build']},

    watchLanguageFiles:
      {...defaultStepStatus, name: `watch custom language files`,
        for: ['build']},

    initializeDefaultLanguage:
      {...defaultStepStatus, name: `initialize default language`,
        for: ['build']},

    verifyImagePaths:
      {...defaultStepStatus, name: `verify missing/misplaced image paths`,
        for: ['verify']},

    preloadFileSizes:
      {...defaultStepStatus, name: `preload file sizes`,
        for: ['build']},

    buildSearchIndex:
      {...defaultStepStatus, name: `generate search index`,
        for: ['build', 'search']},

    identifyWebRoutes:
      {...defaultStepStatus, name: `identify web routes`,
        for: ['build']},

    performBuild:
      {...defaultStepStatus, name: `perform selected build mode`,
        for: ['build']},
  };

  const stepsWhich = condition =>
    Object.entries(stepStatusSummary)
      .filter(([_key, value]) => condition(value))
      .map(([key]) => key);

  /* eslint-disable-next-line no-unused-vars */
  const stepsFor = (...which) =>
    stepsWhich(step =>
      which.some(w => step.for?.includes(w)));

  const stepsNotFor = (...which) =>
    stepsWhich(step =>
      which.every(w => !step.for?.includes(w)));

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

  if (empty(selectedBuildModeFlags)) {
    // No build mode selected. This is not a valid state for building the wiki,
    // but we want to let access to --help, so we'll show a message about what
    // to do later.
    selectedBuildModeFlag = null;
  } else if (selectedBuildModeFlags.length > 1) {
    logError`Building multiple modes (${selectedBuildModeFlags.join(', ')}) at once not supported.`;
    logError`Please specify one build mode.`;
    return false;
  } else {
    selectedBuildModeFlag = selectedBuildModeFlags[0];
  }

  const selectedBuildMode =
    (selectedBuildModeFlag
      ? buildModes[selectedBuildModeFlag]
      : null);

  // This is about to get a whole lot more stuff put in it.
  const wikiData = {
    listingSpec,
    listingTargetSpec,
  };

  const buildOptions =
    (selectedBuildMode
      ? selectedBuildMode.getCLIOptions()
      : {});

  const commonOptions = {
    'help': {
      help: `Display usage info and basic information for the \`hsmusic\` command`,
      type: 'flag',
    },

    // Data files for the site, including flash, artist, and al8um data,
    // and like a jillion other things too. Pretty much everything which
    // makes an individual wiki what it is goes here!
    'data-path': {
      help: `Specify path to data directory, including YAML files that cover all info about wiki content, layout, and structure\n\nAlways required for wiki building; may be provided via the HSMUSIC_DATA environment variable`,
      type: 'value',
    },

    // Static media will 8e referenced in the site here! The contents are
    // categorized; check out MEDIA_ALBUM_ART_DIRECTORY and other constants
    // near the top of this file (upd8.js).
    'media-path': {
      help: `Specify path to media directory, including album artwork and additional files, as well as custom site layout media and other media files for reference or linking in wiki content\n\nAlways required for wiki building; may be provided via the HSMUSIC_MEDIA environment variable`,
      type: 'value',
    },

    'media-cache-path': {
      help: `Specify path to media cache directory, including automatically generated thumbnails\n\nThis usually doesn't need to be provided, and will be inferred either by loading "media-cache" from --cache-path, or by adding "-cache" to the end of the media directory\n\nMay be provided via the HSMUSIC_MEDIA_CACHE environment variable`,
      type: 'value',
    },

    'cache-path': {
      help: `Specify path to general cache directory, usually containing generated thumbnails and assorted files reused between builds\n\nAlways required for wiki building; may be provided via the HSMUSIC_CACHE environment varaible`,
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

    'new-thumbs': {
      help: `Repair a media cache that's completely missing its index file by starting clean and not reusing any existing thumbnails`,
      type: 'flag',
    },

    'skip-file-sizes': {
      help: `Skips preloading file sizes for images and additional files, which will be left blank in the build`,
      type: 'flag',
    },

    'skip-media-validation': {
      help: `Skips checking and reporting missing and misplaced media files, which isn't necessary if you aren't adding or removing data or updating directories`,
      type: 'flag',
    },

    'refresh-search': {
      help: `Generate the text search index this build, instead of waiting for the automatic delay`,
      type: 'flag',
    },

    'skip-search': {
      help: `Skip creation of the text search index no matter what, even if it'd normally be scheduled for now`,
      type: 'flag',
    },

    // Just working on data entries and not interested in actually
    // generating site HTML yet? This flag will cut execution off right
    // 8efore any site 8uilding actually happens.
    'no-build': {
      help: `Don't run a build of the site at all; only process data/media and report any errors detected`,
      type: 'flag',
    },

    'no-input': {
      help: `Don't wait on input from stdin - assume the device is headless`,
      type: 'flag',
    },

    'no-language-reloading': {
      help: `Don't reload language files while the build is running\n\nApplied by default for --static-build`,
      type: 'flag',
    },

    'no-language-reload': {alias: 'no-language-reloading'},

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

  const indentWrap =
    bindOpts(unboundIndentWrap, {
      wrap,
    });

  const showHelpForOptions =
    bindOpts(unboundShowHelpForOptions, {
      [bindOpts.bindIndex]: 0,
      indentWrap,
      sort: sortByName,
    });

  const cliOptions = await parseOptions(process.argv.slice(2), {
    // We don't want to error when we receive these options, so specify them
    // here, even though we won't be doing anything with them later.
    // (This is a bit of a hack.)
    ...buildModeFlagOptions,

    ...commonOptions,
    ...buildOptions,
  });

  showStepStatusSummary = cliOptions['show-step-summary'] ?? false;

  if (cliOptions['help']) {
    console.log(
      colors.bright(`hsmusic (aka. Homestuck Music Wiki, HSMusic Wiki)\n`) +
      `static wiki software cataloguing collaborative creation\n`);

    console.log(indentWrap(
      `The \`hsmusic\` command provides basic control over ` +
      `all parts of generating user-visible HTML pages ` +
      `and website content/structure ` +
      `from provided data, media, and language directories.\n` +
      `\n` +
      `CLI options are divided into three groups:\n`));

    console.log(` 1) ` + indentWrap(
      `Common options: ` +
      `These are shared by all build modes ` +
      `and always have the same essential behavior`,
      {spaces: 4, bullet: true}));

    console.log(` 2) ` + indentWrap(
      `Build mode selection: ` +
      `One build mode should be selected, ` +
      `and it decides the main set of behavior to use ` +
      `for presenting or interacting with site content`,
      {spaces: 4, bullet: true}));

    console.log(` 3) ` + indentWrap(
      `Build options: ` +
      `Each build mode has a set of unique options ` +
      `which customize behavior for that build mode`,
      {spaces: 4, bullet: true}));

    console.log(``);

    showHelpForOptions({
      heading: `Common options`,
      options: commonOptions,
      wrap,
    });

    showHelpForOptions({
      heading: `Build mode selection`,
      options: buildModeFlagOptions,
      wrap,
    });

    if (selectedBuildMode) {
      showHelpForOptions({
        heading: `Build options for --${selectedBuildModeFlag}`,
        options: buildOptions,
        wrap,
      });
    } else {
      console.log(
        `Specify a build mode and run with ${colors.bright('--help')} again for info\n` +
        `about the options for that build mode.`);
    }

    for (const step of Object.values(stepStatusSummary)) {
      Object.assign(step, {
        status: STATUS_NOT_APPLICABLE,
        annotation: `--help provided`,
      });
    }

    return true;
  }

  const dataPath = cliOptions['data-path'] || process.env.HSMUSIC_DATA;
  const mediaPath = cliOptions['media-path'] || process.env.HSMUSIC_MEDIA;
  const wikiCachePath = cliOptions['cache-path'] || process.env.HSMUSIC_CACHE;
  const langPath = cliOptions['lang-path'] || process.env.HSMUSIC_LANG; // Can 8e left unset!

  const thumbsOnly = cliOptions['thumbs-only'] ?? false;
  const noInput = cliOptions['no-input'] ?? false;

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

  if (!wikiCachePath) {
    logError`${`Expected --cache-path option or HSMUSIC_CACHE to be set`}`;
  }

  if (!dataPath || !mediaPath || !wikiCachePath) {
    return false;
  }

  if (cliOptions['no-build']) {
    logInfo`Won't generate any site or page files this run (--no-build passed).`;

    Object.assign(stepStatusSummary.performBuild, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `--no-build provided`,
    });
  }

  // Finish setting up defaults by combining information from all options.

  const _fallbackStep = (stepKey, {
    default: defaultValue,
    cli: cliArg,
    buildConfig: buildConfigKey = null,
  }) => {
    const buildConfig = selectedBuildMode?.config?.[buildConfigKey];
    const {[stepKey]: step} = stepStatusSummary;

    const cliEntries =
      (cliArg === null || cliArg === undefined
        ? []
     : Array.isArray(cliArg)
        ? cliArg
        : [cliArg]);

    for (const {
      flag: cliFlag = null,
      negate: cliFlagNegates = false,
      warn: cliFlagWarning = null,
      disable: cliFlagDisablesSteps = [],
    } of cliEntries) {
      if (!cliOptions[cliFlag]) {
        continue;
      }

      const cliPart = `--` + cliFlag;
      const modePart = `--` + selectedBuildModeFlag;

      if (buildConfig?.applicable === false) {
        if (cliFlagNegates) {
          logWarn`${cliPart} provided, but ${modePart} already skips this step`;
          logWarn`Redundant option ${cliPart}`;
          continue;
        } else {
          logWarn`${cliPart} provided, but this step isn't applicable for ${modePart}`;
          logWarn`Ignoring option ${cliPart}`;
          continue;
        }
      }

      if (buildConfig?.required === true) {
        if (cliFlagNegates) {
          logWarn`${cliPart} provided, but ${modePart} requires this step`;
          logWarn`Ignoring option ${cliPart}`;
          continue;
        } else {
          logWarn`${cliPart} provided, but ${modePart} already requires this step`;
          logWarn`Redundant option ${cliPart}`;
          continue;
        }
      }

      step.status =
        (cliFlagNegates
          ? STATUS_NOT_APPLICABLE
          : STATUS_NOT_STARTED);

      step.annotation = `--${cliFlag} provided`;

      if (cliFlagWarning) {
        for (const line of cliFlagWarning.split('\n')) {
          logWarn(line);
        }
      }

      for (const step of cliFlagDisablesSteps) {
        const summary = stepStatusSummary[step];
        if (summary.status === STATUS_NOT_APPLICABLE && summary.annotation) {
          stepStatusSummary.performBuild.annotation += `; --${cliFlag} provided`;
        } else {
          summary.status = STATUS_NOT_APPLICABLE;
          summary.annotation = `--${cliFlag} provided`;
        }
      }

      return;
    }

    if (buildConfig?.required === true) {
      step.status = STATUS_NOT_STARTED;
      step.annotation = `required for --${selectedBuildModeFlag}`;
      return;
    }

    if (buildConfig?.applicable === false) {
      step.status = STATUS_NOT_APPLICABLE;
      step.annotation = `N/A for --${selectedBuildModeFlag}`;
      return;
    }

    if (buildConfig?.default === 'skip') {
      step.status = STATUS_NOT_APPLICABLE;
      step.annotation = `default for --${selectedBuildModeFlag}`;
      return;
    }

    if (buildConfig?.default === 'perform') {
      step.status = STATUS_NOT_STARTED;
      step.annotation = `default for --${selectedBuildModeFlag}`;
      return;
    }

    switch (defaultValue) {
      case 'skip': {
        step.status = STATUS_NOT_APPLICABLE;

        const enablingFlags =
          cliEntries
            .filter(({negate}) => !negate)
            .map(({flag}) => flag);

        if (!empty(enablingFlags)) {
          step.annotation =
            enablingFlags.map(flag => `--${flag}`).join(', ') +
            ` not provided`;
        }

        break;
      }

      case 'perform':
        break;

      default:
        throw new Error(`Invalid default step status ${defaultValue}`);
    }
  };

  {
    let errored = false;

    const fallbackStep = (stepKey, options) => {
      try {
        _fallbackStep(stepKey, options);
      } catch (error) {
        logError`Error determining fallback for step ${stepKey}`;
        showAggregate(error);
        errored = true;
      }
    };

    fallbackStep('filterReferenceErrors', {
      default: 'perform',
      cli: {
        flag: 'skip-reference-validation',
        negate: true,
        warn:
          `Skipping reference validation. If any reference errors are present\n` +
          `in data, they will be silently passed along to the build.`,
      }
    });

    fallbackStep('generateThumbnails', {
      default: 'perform',
      buildConfig: 'thumbs',
      cli: [
        {flag: 'thumbs-only', disable: stepsNotFor('thumbs')},
        {flag: 'skip-thumbs', negate: true},
      ],
    });

    fallbackStep('migrateThumbnails', {
      default: 'skip',
      cli: {
        flag: 'migrate-thumbs',
        disable: [
          ...stepsNotFor('thumbs'),
          'generateThumbnails',
        ],
      },
    });

    fallbackStep('preloadFileSizes', {
      default: 'perform',
      buildConfig: 'fileSizes',
      cli: {
        flag: 'skip-file-sizes',
        negate: true,
      },
    });

    fallbackStep('identifyWebRoutes', {
      default: 'perform',
      buildConfig: 'webRoutes',
    });

    decideBuildSearchIndex: {
      fallbackStep('buildSearchIndex', {
        default: 'skip',
        buildConfig: 'search',
        cli: [
          {flag: 'refresh-search'},
          {flag: 'skip-search', negate: true},
        ],
      });

      if (cliOptions['refresh-search'] || cliOptions['skip-search']) {
        if (cliOptions['refresh-search']) {
          logInfo`${'--refresh-search'} provided, will generate search fresh this build.`;
        }

        break decideBuildSearchIndex;
      }

      if (stepStatusSummary.buildSearchIndex.status !== STATUS_NOT_APPLICABLE) {
        break decideBuildSearchIndex;
      }

      if (selectedBuildMode?.config?.search?.default === 'skip') {
        break decideBuildSearchIndex;
      }

      // TODO: OK this is a little silly.
      if (stepStatusSummary.buildSearchIndex.annotation?.startsWith('N/A')) {
        break decideBuildSearchIndex;
      }

      const indexFile = path.join(wikiCachePath, 'search', 'index.json')
      let stats;
      try {
        stats = await stat(indexFile);
      } catch (error) {
        if (error.code === 'ENOENT') {
          Object.assign(stepStatusSummary.buildSearchIndex, {
            status: STATUS_NOT_STARTED,
            annotation: `search/index.json not present, will create`,
          });

          logInfo`Looks like the search cache doesn't exist.`;
          logInfo`It'll be generated fresh, this build!`;
        } else {
          Object.assign(stepStatusSummary.buildSearchIndex, {
            status: STATUS_NOT_APPLICABLE,
            annotation: `error getting search index stats`,
          });

          if (!paragraph) console.log('');
          console.error(error);

          logWarn`There was an error checking the search index file, located at:`;
          logWarn`${indexFile}`;
          logWarn`You may want to toss out the "search" folder; it'll be generated`;
          logWarn`anew, if you do, and may fix this error.`;
        }

        paragraph = false;
        break decideBuildSearchIndex;
      }

      const delta = Date.now() - stats.mtimeMs;
      const minute = 60 * 1000;
      const delay = 45 * minute;

      const whenst = duration => `~${Math.ceil(duration / minute)} min`;

      if (delta < delay) {
        logInfo`Search index was generated recently, skipping for this build.`;
        logInfo`Next scheduled is in ${whenst(delay - delta)}, or by using ${'--refresh-search'}.`;
        Object.assign(stepStatusSummary.buildSearchIndex, {
          status: STATUS_NOT_APPLICABLE,
          annotation: `earlier than scheduled based on file mtime`,
        });
      } else {
        logInfo`Search index hasn't been generated for a little while.`;
        logInfo`It'll be generated this build, then again in ${whenst(delay)}.`;
        Object.assign(stepStatusSummary.buildSearchIndex, {
          status: STATUS_NOT_STARTED,
          annotation: `past when shceduled based on file mtime`,
        });
      }

      paragraph = false;
    }

    fallbackStep('verifyImagePaths', {
      default: 'perform',
      buildConfig: 'mediaValidation',
      cli: {
        flag: 'skip-media-validation',
        negate: true,
        warning:
          `Skipping media validation. If any media files are missing or misplaced,\n` +
          `those errors will be silently passed along to the build.`,
      },
    });

    fallbackStep('watchLanguageFiles', {
      default: 'perform',
      buildConfig: 'languageReloading',
      cli: {
        flag: 'no-language-reloading',
        negate: true,
      },
    });

    if (errored) {
      return false;
    }
  }

  if (stepStatusSummary.generateThumbnails.status === STATUS_NOT_STARTED) {
    Object.assign(stepStatusSummary.loadThumbnailCache, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `using cache from thumbnail generation`,
    });
  }

  if (stepStatusSummary.watchLanguageFiles.status === STATUS_NOT_STARTED) {
    Object.assign(stepStatusSummary.loadLanguageFiles, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `watching for changes instead`,
    });
  }

  // TODO: These should error if the option was actually provided but
  // the relevant steps were already disabled for some other reason.
  switch (precacheMode) {
    case 'common':
      if (stepStatusSummary.precacheAllData.status === STATUS_NOT_STARTED) {
        Object.assign(stepStatusSummary.precacheAllData, {
          status: STATUS_NOT_APPLICABLE,
          annotation: `--precache-mode is common, not all`,
        });
      }

      break;

    case 'all':
      if (stepStatusSummary.precacheCommonData.status === STATUS_NOT_STARTED) {
        Object.assign(stepStatusSummary.precacheCommonData, {
          status: STATUS_NOT_APPLICABLE,
          annotation: `--precache-mode is all, not common`,
        });
      }

      break;

    case 'none':
      if (stepStatusSummary.precacheCommonData.status === STATUS_NOT_STARTED) {
        Object.assign(stepStatusSummary.precacheCommonData, {
          status: STATUS_NOT_APPLICABLE,
          annotation: `--precache-mode is none`,
        });
      }

      if (stepStatusSummary.precacheAllData.status === STATUS_NOT_STARTED) {
        Object.assign(stepStatusSummary.precacheAllData, {
          status: STATUS_NOT_APPLICABLE,
          annotation: `--precache-mode is none`,
        });
      }

      break;
  }

  if (!langPath) {
    Object.assign(stepStatusSummary.loadLanguageFiles, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `neither --lang-path nor HSMUSIC_LANG provided`,
    });

    Object.assign(stepStatusSummary.watchLanguageFiles, {
      status: STATUS_NOT_APPLICABLE,
      annotation: `neither --lang-path nor HSMUSIC_LANG provided`,
    });
  }

  if (stepStatusSummary.generateThumbnails.status === STATUS_NOT_APPLICABLE && thumbsOnly) {
    logInfo`Well, you've put yourself rather between a roc and a hard place, hmmmm?`;
    return false;
  }

  // If we're going to require a build mode and none is specified,
  // exit and show what to do. This must not precede anything that might
  // disable the build (e.g. changing its status to STATUS_NOT_APPLICABLE).

  if (stepStatusSummary.performBuild.status === STATUS_NOT_STARTED) {
    if (selectedBuildMode) {
      logInfo`Will use specified build mode: ${selectedBuildModeFlag}`;
    } else {
      showHelpForOptions({
        heading: `Please specify a build mode:`,
        options: buildModeFlagOptions,
      });

      console.log(
        `(Use ${colors.bright('--help')} for general info and all options, or specify\n` +
        ` a build mode alongside ${colors.bright('--help')} for that mode's options!`);

      for (const step of Object.values(stepStatusSummary)) {
        Object.assign(step, {
          status: STATUS_NOT_APPLICABLE,
          annotation: `no build mode provided`,
        });
      }

      return false;
    }
  } else if (selectedBuildMode) {
    if (stepStatusSummary.performBuild.annotation) {
      logError`You've specified a build mode, ${selectedBuildModeFlag}, but it won't be used,`;
      logError`according to the message: ${`"${stepStatusSummary.performBuild.annotation}"`}`;
    } else {
      logError`You've specified a build mode, ${selectedBuildModeFlag}, but it won't be used,`;
      logError`probably because of another option you've provided.`;
    }
    logError`Please remove ${'--' + selectedBuildModeFlag} or the conflicting option.`;
    return false;
  }

  Object.assign(stepStatusSummary.determineMediaCachePath, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  const regenerateMissingThumbnailCache =
    cliOptions['new-thumbs'] ?? false;

  const {mediaCachePath, annotation: mediaCachePathAnnotation} =
    await determineMediaCachePath({
      mediaPath,
      wikiCachePath,

      providedMediaCachePath:
        cliOptions['media-cache-path'] || process.env.HSMUSIC_MEDIA_CACHE,

      regenerateMissingThumbnailCache,

      disallowDoubling:
        stepStatusSummary.migrateThumbnails.status === STATUS_NOT_STARTED,
    });

  if (regenerateMissingThumbnailCache) {
    if (
      mediaCachePathAnnotation !== `contained path will regenerate missing cache` &&
      mediaCachePathAnnotation !== `adjacent path will regenerate missing cache`
    ) {
      if (mediaCachePath) {
        logError`Determined a media cache path. (${mediaCachePathAnnotation})`;
        console.error('');
        logWarn`By using ${'--new-thumbs'}, you requested to generate completely`;
        logWarn`new thumbnails, but there's already a ${'thumbnail-cache.json'}`;
        logWarn`file where it's expected, within this media cache:`;
        logWarn`${path.resolve(mediaCachePath)}`;
        console.error('');
        logWarn`If you really do want to completely regenerate all thumbnails`;
        logWarn`and not reuse any existing ones, move aside ${'thumbnail-cache.json'}`;
        logWarn`and run with ${'--new-thumbs'} again.`;

        Object.assign(stepStatusSummary.determineMediaCachePath, {
          status: STATUS_FATAL_ERROR,
          annotation: `--new-thumbs provided but regeneration not needed`,
          timeEnd: Date.now(),
        });

        return false;
      } else {
        logError`Couldn't determine a media cache path. (${mediaCachePathAnnotation})`;
        console.error('');
        logWarn`You requested to generate completely new thumbnails, but`;
        logWarn`the media cache wasn't readable or just couldn't be found.`;
        logWarn`Run again without ${'--new-thumbs'} - you should investigate`;
        logWarn`what's going on before continuing.`;

        Object.assign(stepStatusSummary.determineMediaCachePath, {
          status: STATUS_FATAL_ERROR,
          annotation: mediaCachePathAnnotation,
          timeEnd: Date.now(),
        });

        return false;
      }
    }
  }

  if (!mediaCachePath) {
    logError`Couldn't determine a media cache path. (${mediaCachePathAnnotation})`;

    switch (mediaCachePathAnnotation) {
      case `contained path does not have cache`:
        console.error('');
        logError`You've provided a ${'--cache-path'} or ${'HSMUSIC_CACHE_PATH'},`;
        logError`${path.resolve(wikiCachePath)}`;
        console.error('');
        logError`It contains a ${'media-cache'} folder, but this folder is`;
        logError`missing its ${'thumbnail-cache.json'} file. This means there's`;
        logError`no information available to reuse. If you use this cache,`;
        logError`hsmusic will generate any existing thumbnails over again.`;
        console.error('');
        logError`* Try to see if you can recover or locate a copy of your`;
        logError`  ${'thumbnail-cache.json'} file and put it back in place;`;
        logError`* Or, generate all-new thumbnails with ${'--new-thumbs'}.`;
        break;

      case 'adjacent path does not have cache':
        console.error('');
        logError`You have an existing ${'media-cache'} folder next to your media path,`;
        logError`${path.resolve(mediaPath)}`;
        console.error('');
        logError`The ${'media-cache'} folder is missing its ${'thumbnail-cache.json'}`;
        logError`file. This means there's no information available to reuse,`;
        logError`and if you use this cache, hsmusic will generate any existing`;
        logError`thumbnails over again.`;
        console.error('');
        logError`* Try to see if you can recover or locate a copy of your`;
        logError`  ${'thumbnail-cache.json'} file and put it back in place;`;
        logError`* Or, generate all-new thumbnails with ${'--new-thumbs'}.`;
        break;

      case `contained path not readable`:
      case `adjacent path not readable`:
        console.error('');
        logError`The folder couldn't be read, which usually indicates`;
        logError`a permissions error. Try to resolve this, or provide`;
        logError`a new path with ${'--media-cache-path'} or ${'HSMUSIC_MEDIA_CACHE'}.`;
        break;

      case `media path not provided`: /* unreachable */
        console.error('');
        logError`It seems a ${'--media-path'} (or ${'HSMUSIC_MEDIA'}) wasn't provided.`;
        logError`Make sure one of these is actually pointing to a path that exists.`;
        break;

      case `cache path not provided`: /* unreachable */
        console.error('');
        logError`It seems a ${'--cache-path'} (or ${'HSMUSIC_CACHE'}) wasn't provided.`;
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

  if (stepStatusSummary.migrateThumbnails.status === STATUS_NOT_STARTED) {
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

  if (
    stepStatusSummary.loadThumbnailCache.status === STATUS_NOT_STARTED &&
    stepStatusSummary.generateThumbnails.status === STATUS_NOT_STARTED
  ) {
    throw new Error(`Unable to continue with both loadThumbnailCache and generateThumbnails`);
  }

  let thumbsCache;

  if (stepStatusSummary.loadThumbnailCache.status === STATUS_NOT_STARTED) {
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
  } else if (stepStatusSummary.generateThumbnails.status === STATUS_NOT_STARTED) {
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
  } else {
    thumbsCache = {};
  }

  if (showInvalidPropertyAccesses) {
    CacheableObject.DEBUG_SLOW_TRACK_INVALID_PROPERTIES = true;
  }

  Object.assign(stepStatusSummary.loadDataFiles, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  let yamlDataSteps;
  let yamlDocumentProcessingAggregate;

  {
    const whoops = (error, stage) => {
      if (!paragraph) console.log('');

      console.error(error);
      niceShowAggregate(error);

      logError`There was a JavaScript error ${stage}.`;
      fileIssue();

      Object.assign(stepStatusSummary.loadDataFiles, {
        status: STATUS_FATAL_ERROR,
        annotation: `javascript error - view log for details`,
        timeEnd: Date.now(),
      });

      return false;
    };

    let loadAggregate, loadResult;
    let processAggregate, processResult;
    let saveAggregate, saveResult;

    const dataSteps = getAllDataSteps();

    try {
      ({aggregate: loadAggregate, result: loadResult} =
          await loadYAMLDocumentsFromDataSteps(
            dataSteps,
            {dataPath}));
    } catch (error) {
      return whoops(error, `loading data files`);
    }

    try {
      loadAggregate.close();
    } catch (error) {
      if (!paragraph) console.log('');
      niceShowAggregate(error);

      logError`The above errors were detected while loading data files.`;
      logError`Since this indicates some files weren't able to load at all,`;
      logError`there would probably be pretty bad reference errors if the`;
      logError`build were to continue. Please resolve these errors and`;
      logError`then give it another go.`;

      paragraph = true;
      console.log('');

      Object.assign(stepStatusSummary.loadDataFiles, {
        status: STATUS_FATAL_ERROR,
        annotation: `error loading data files`,
        timeEnd: Date.now(),
      });

      return false;
    }

    try {
      ({aggregate: processAggregate, result: processResult} =
          await processThingsFromDataSteps(
            loadResult.documentLists,
            loadResult.fileLists,
            dataSteps,
            {dataPath}));
    } catch (error) {
      return whoops(error, `processing data files`);
    }

    try {
      ({aggregate: saveAggregate, result: saveResult} =
          saveThingsFromDataSteps(
            processResult,
            dataSteps));

      saveAggregate.close();
      saveAggregate = undefined;
    } catch (error) {
      return whoops(error, `finalizing data files`);
    }

    yamlDataSteps = dataSteps;
    yamlDocumentProcessingAggregate = processAggregate;

    Object.assign(wikiData, saveResult);
  }

  {
    const logThings = (prop, label) => {
      const array =
        (Array.isArray(prop)
          ? prop
          : wikiData[prop]);

      logInfo` - ${array?.length ?? colors.red('(Missing!)')} ${colors.normal(colors.dim(label))}`;
    }

    try {
      if (!paragraph) console.log('');

      logInfo`Loaded data and processed objects:`;
      logThings('albumData', 'albums');
      logThings('trackData', 'tracks');
      logThings(
        (wikiData.artistData
          ? wikiData.artistData.filter(artist => !artist.isAlias)
          : null),
        'artists');
      if (wikiData.flashData) {
        logThings('flashData', 'flashes');
        logThings('flashActData', 'flash acts');
        logThings('flashSideData', 'flash sides');
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

      console.log('');
      paragraph = true;
    } catch (error) {
      console.error(`Error showing data summary:`, error);
      paragraph = false;
    }

    let errorless = true;
    try {
      yamlDocumentProcessingAggregate.close();
    } catch (error) {
      if (!paragraph) console.log('');
      niceShowAggregate(error);

      logWarn`The above errors were detected while processing data files.`;

      errorless = false;
    }

    if (!wikiData.wikiInfo) {
      logError`Can't proceed without wiki info file successfully loading.`;

      Object.assign(stepStatusSummary.loadDataFiles, {
        status: STATUS_FATAL_ERROR,
        annotation: `wiki info object not available`,
        timeEnd: Date.now(),
      });

      return false;
    }

    if (errorless) {
      logInfo`All data files processed without any errors - nice!`;
      paragraph = false;

      Object.assign(stepStatusSummary.loadDataFiles, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    } else {
      logWarn`This might indicate some fields in the YAML data weren't formatted`;
      logWarn`correctly, for example. The build should still work, but invalid`;
      logWarn`fields will be skipped. Take a look at the report above to see`;
      logWarn`what needs fixing up, for a more complete build!`;

      console.log('');
      paragraph = true;

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
        'aliasedArtist', 'commentary', 'coverArtistContribs',
      ]),

      artTagData: new Set([
        // Needed for computing page paths
        'isContentWarning',
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
        'commentary', 'coverArtistContribs',
      ]),
    };

    try {
      for (const [wikiDataKey, properties] of Object.entries(commonDataMap)) {
        const thingData = wikiData[wikiDataKey];
        const allProperties = new Set(['name', 'directory', ...properties]);
        for (const thing of thingData) {
          for (const property of allProperties) {
            void thing[property];
          }
        }
      }
    } catch (error) {
      if (!paragraph) console.log('');
      niceShowAggregate(error);
      console.log('');

      logError`There was an error precaching internal data objects.`;
      fileIssue();

      Object.assign(stepStatusSummary.precacheCommonData, {
        status: STATUS_FATAL_ERROR,
        annotation: `see log for details`,
        timeEnd: Date.now(),
      });

      return false;
    }

    Object.assign(stepStatusSummary.precacheCommonData, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  }

  const urls = generateURLs(urlSpec);

  // Filter out any things with duplicate directories throughout the data,
  // warning about them too.

  Object.assign(stepStatusSummary.reportDirectoryErrors, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  try {
    reportDirectoryErrors(wikiData, {getAllFindSpecs});
    logInfo`No duplicate directories found - nice!`;
    paragraph = false;

    Object.assign(stepStatusSummary.reportDirectoryErrors, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  } catch (aggregate) {
    if (!paragraph) console.log('');
    niceShowAggregate(aggregate);

    logWarn`The above duplicate directories were detected while reviewing data files.`;
    logWarn`Since it's impossible to automatically determine which one's directory is`;
    logWarn`correct, the build can't continue. Specify unique 'Directory' fields in`;
    logWarn`some or all of these data entries to resolve the errors.`;

    console.log('');
    paragraph = true;

    Object.assign(stepStatusSummary.reportDirectoryErrors, {
      status: STATUS_FATAL_ERROR,
      annotation: `duplicate directories found`,
      timeEnd: Date.now(),
    });

    return false;
  }

  // Filter out any reference errors throughout the data, warning about them
  // too.

  if (stepStatusSummary.filterReferenceErrors.status === STATUS_NOT_STARTED) {
    Object.assign(stepStatusSummary.filterReferenceErrors, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const filterReferenceErrorsAggregate =
      filterReferenceErrors(wikiData, {bindFind});

    try {
      filterReferenceErrorsAggregate.close();

      logInfo`All references validated without any errors - nice!`;
      paragraph = false;

      Object.assign(stepStatusSummary.filterReferenceErrors, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    } catch (error) {
      if (!paragraph) console.log('');
      niceShowAggregate(error);

      logWarn`The above errors were detected while validating references in data files.`;
      logWarn`The wiki should still build, but these connections between data objects`;
      logWarn`will be skipped, which might have unexpected consequences. Take a look at`;
      logWarn`the report above to see what needs fixing up, for a more complete build!`;

      console.log('');
      paragraph = true;

      Object.assign(stepStatusSummary.filterReferenceErrors, {
        status: STATUS_HAS_WARNINGS,
        annotation: `view log for details`,
        timeEnd: Date.now(),
      });
    }
  }

  if (stepStatusSummary.reportContentTextErrors.status === STATUS_NOT_STARTED) {
    Object.assign(stepStatusSummary.reportContentTextErrors, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    try {
      reportContentTextErrors(wikiData, {bindFind});

      logInfo`All content text validated without any errors - nice!`;
      paragraph = false;

      Object.assign(stepStatusSummary.reportContentTextErrors, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    } catch (error) {
      if (!paragraph) console.log('');
      niceShowAggregate(error);

      logWarn`The above errors were detected while processing content text in data files.`;
      logWarn`The wiki will still build, but placeholders will be displayed in these spots.`;
      logWarn`Resolve the errors for more complete output.`;

      console.log('');
      paragraph = true;

      Object.assign(stepStatusSummary.reportContentTextErrors, {
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

  sortWikiDataArrays(yamlDataSteps, wikiData);

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

  if (stepStatusSummary.performBuild.status === STATUS_NOT_APPLICABLE) {
    displayCompositeCacheAnalysis();

    if (precacheMode === 'all') {
      return true;
    }
  }

  const languageReloading =
    stepStatusSummary.watchLanguageFiles.status === STATUS_NOT_STARTED;

  Object.assign(stepStatusSummary.loadInternalDefaultLanguage, {
    status: STATUS_STARTED_NOT_DONE,
    timeStart: Date.now(),
  });

  let internalDefaultLanguage;
  let internalDefaultLanguageWatcher;

  let errorLoadingInternalDefaultLanguage = false;

  if (languageReloading) {
    internalDefaultLanguageWatcher = watchLanguageFile(internalDefaultStringsFile);

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
      errorLoadingInternalDefaultLanguage = true;
    }
  } else {
    internalDefaultLanguageWatcher = null;

    try {
      internalDefaultLanguage = await processLanguageFile(internalDefaultStringsFile);
    } catch (error) {
      niceShowAggregate(error);
      errorLoadingInternalDefaultLanguage = true;
    }
  }

  if (errorLoadingInternalDefaultLanguage) {
    logError`There was an error reading the internal language file.`;
    fileIssue();

    Object.assign(stepStatusSummary.loadInternalDefaultLanguage, {
      status: STATUS_FATAL_ERROR,
      annotation: `see log for details`,
      timeEnd: Date.now(),
    });

    return false;
  }

  if (languageReloading) {
    // Bypass node.js special-case handling for uncaught error events
    internalDefaultLanguageWatcher.on('error', () => {});
  }

  Object.assign(stepStatusSummary.loadInternalDefaultLanguage, {
    status: STATUS_DONE_CLEAN,
    timeEnd: Date.now(),
  });

  let customLanguageWatchers;
  let languages;

  if (langPath) {
    if (languageReloading) {
      Object.assign(stepStatusSummary.watchLanguageFiles, {
        status: STATUS_STARTED_NOT_DONE,
        timeStart: Date.now(),
      });
    } else {
      Object.assign(stepStatusSummary.loadLanguageFiles, {
        status: STATUS_STARTED_NOT_DONE,
        timeStart: Date.now(),
      });
    }

    const languageDataFiles =
      (await readdir(langPath))
        .filter(name => ['.json', '.yaml'].includes(path.extname(name)))
        .map(name => path.join(langPath, name));

    let errorLoadingCustomLanguages = false;

    if (languageReloading) watchCustomLanguages: {
      Object.assign(stepStatusSummary.watchLanguageFiles, {
        status: STATUS_STARTED_NOT_DONE,
        timeStart: Date.now(),
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
          customLanguageWatchers
            .map(watcher => new Promise((resolve, reject) => {
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
          internalDefaultLanguageWatcher.close();

          for (const watcher of Object.values(customLanguageWatchers)) {
            watcher.close();
          }

          Object.assign(stepStatusSummary.watchLanguageFiles, {
            status: STATUS_FATAL_ERROR,
            annotation: `see log for details`,
            timeEnd: Date.now(),
          });

          errorLoadingCustomLanguages = true;
          break watchCustomLanguages;
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
            .map(({language}) => [language.code, language]));

      Object.assign(stepStatusSummary.watchLanguageFiles, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    } else {
      languages = {};

      const results =
        await Promise.allSettled(
          languageDataFiles
            .map(file => processLanguageFile(file)));

      for (const {status, value: language, reason: error} of results) {
        if (status === 'rejected') {
          errorLoadingCustomLanguages = true;
          niceShowAggregate(error);
        } else {
          languages[language.code] = language;
        }
      }

      if (errorLoadingCustomLanguages) {
        Object.assign(stepStatusSummary.loadLanguageFiles, {
          status: STATUS_FATAL_ERROR,
          annotation: `see log for details`,
          timeEnd: Date.now(),
        });
      } else {
        Object.assign(stepStatusSummary.loadLanguageFiles, {
          status: STATUS_DONE_CLEAN,
          timeEnd: Date.now(),
        });
      }
    }

    if (errorLoadingCustomLanguages) {
      logError`Failed to load language files. Please investigate these, or don't provide`;
      logError`--lang-path (or HSMUSIC_LANG) and build again.`;
      return false;
    }
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
    paragraph = false;

    finalDefaultLanguage = customDefaultLanguage;
    finalDefaultLanguageAnnotation = `using wiki-specified custom default language`;

    if (languageReloading) {
      finalDefaultLanguageWatcher =
        customLanguageWatchers
          .find(({language}) => language === customDefaultLanguage);
    }
  } else if (languages[internalDefaultLanguage.code]) {
    const customDefaultLanguage = languages[internalDefaultLanguage.code];

    finalDefaultLanguage = customDefaultLanguage;
    finalDefaultLanguageAnnotation = `using inferred custom default language`;

    if (languageReloading) {
      finalDefaultLanguageWatcher =
        customLanguageWatchers
          .find(({language}) => language === customDefaultLanguage);
    }
  } else {
    languages[internalDefaultLanguage.code] = internalDefaultLanguage;

    finalDefaultLanguage = internalDefaultLanguage;
    finalDefaultLanguageAnnotation = `no custom default language specified`;

    if (languageReloading) {
      finalDefaultLanguageWatcher = internalDefaultLanguageWatcher;
    }
  }

  const closeLanguageWatchers = () => {
    if (languageReloading) {
      for (const watcher of [
        internalDefaultLanguageWatcher,
        ...customLanguageWatchers,
      ]) {
        watcher.close();
      }
    }
  };

  const inheritStringsFromInternalLanguage = () => {
    // The custom default language, if set, will be the new one providing fallback
    // strings for other languages. But on its own, it still might not be a complete
    // list of strings - so it falls back to the internal default language, which
    // won't otherwise be presented in the build.
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

  if (finalDefaultLanguage !== internalDefaultLanguage) {
    inheritStringsFromInternalLanguage();
  }

  inheritStringsFromDefaultLanguage();

  if (languageReloading) {
    if (finalDefaultLanguage !== internalDefaultLanguage) {
      internalDefaultLanguageWatcher.on('update', () => {
        inheritStringsFromInternalLanguage();
        inheritStringsFromDefaultLanguage();
      });
    }

    finalDefaultLanguageWatcher.on('update', () => {
      inheritStringsFromDefaultLanguage();
    });
  }

  logInfo`Loaded language strings: ${Object.keys(languages).join(', ')}`;
  paragraph = false;

  Object.assign(stepStatusSummary.initializeDefaultLanguage, {
    status: STATUS_DONE_CLEAN,
    annotation: finalDefaultLanguageAnnotation,
    timeEnd: Date.now(),
  });

  let missingImagePaths;

  if (stepStatusSummary.verifyImagePaths.status === STATUS_NOT_APPLICABLE) {
    missingImagePaths = [];
  } else if (stepStatusSummary.verifyImagePaths.status === STATUS_NOT_STARTED) {
    Object.assign(stepStatusSummary.verifyImagePaths, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const results =
      await verifyImagePaths(mediaPath, {urls, wikiData});

    missingImagePaths = results.missing;
    const misplacedImagePaths = results.misplaced;

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
  }

  let getSizeOfAdditionalFile;
  let getSizeOfImagePath;

  if (stepStatusSummary.preloadFileSizes.status === STATUS_NOT_APPLICABLE) {
    getSizeOfAdditionalFile = () => null;
    getSizeOfImagePath = () => null;
  } else if (stepStatusSummary.preloadFileSizes.status === STATUS_NOT_STARTED) {
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
          .flatMap((fileGroup) => fileGroup.files ?? [])
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

    getSizeOfAdditionalFile = getSizeOfMediaFileHelper(additionalFilePaths);
    getSizeOfImagePath = getSizeOfMediaFileHelper(imageFilePaths);

    logInfo`Preloading filesizes for ${additionalFilePaths.length} additional files...`;

    fileSizePreloader.loadPaths(...additionalFilePaths.map((path) => path.device));
    await fileSizePreloader.waitUntilDoneLoading();

    logInfo`Preloading filesizes for ${imageFilePaths.length} full-resolution images...`;
    paragraph = false;

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
      paragraph = false;

      Object.assign(stepStatusSummary.preloadFileSizes, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    }
  }

  if (stepStatusSummary.buildSearchIndex.status === STATUS_NOT_STARTED) {
    Object.assign(stepStatusSummary.buildSearchIndex, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    try {
      await writeSearchData({
        thumbsCache,
        urls,
        wikiCachePath,
        wikiData,
      });

      logInfo`Search data successfully written - nice!`;
      paragraph = false;

      Object.assign(stepStatusSummary.buildSearchIndex, {
        status: STATUS_DONE_CLEAN,
        timeEnd: Date.now(),
      });
    } catch (error) {
      if (!paragraph) console.log('');
      niceShowAggregate(error);

      logError`There was an error preparing or writing search data.`;
      fileIssue();
      logWarn`Any existing search data will be reused, and search may be`;
      logWarn`generally dysfunctional. The site should work otherwise, though!`;

      console.log('');
      paragraph = true;

      Object.assign(stepStatusSummary.buildSearchIndex, {
        status: STATUS_HAS_WARNINGS,
        annotation: `see log for details`,
        timeEnd: Date.now(),
      });
    }
  }

  let webRouteSources = null;
  let preparedWebRoutes = null;

  if (stepStatusSummary.identifyWebRoutes.status === STATUS_NOT_STARTED) {
    Object.assign(stepStatusSummary.identifyWebRoutes, {
      status: STATUS_STARTED_NOT_DONE,
      timeStart: Date.now(),
    });

    const fromRoot = urls.from('shared.root');

    try {
      webRouteSources = await identifyAllWebRoutes({
        mediaCachePath,
        mediaPath,
        wikiCachePath,
      });

      const {aggregate, result} =
        mapAggregate(
          webRouteSources,
          ({to, ...rest}) => ({
            ...rest,
            to: fromRoot.to(...to),
          }),
          {message: `Errors computing effective web route paths`},);

      aggregate.close();
      preparedWebRoutes = result;
    } catch (error) {
      if (!paragraph) console.log('');
      niceShowAggregate(error);

      logError`There was an issue identifying web routes!`;
      fileIssue();

      console.log('');
      paragraph = true;

      Object.assign(stepStatusSummary.identifyWebRoutes, {
        status: STATUS_FATAL_ERROR,
        message: `JavaScript error - view log for details`,
        timeEnd: Date.now(),
      });

      return false;
    }

    logInfo`Successfully determined web routes - nice!`;
    paragraph = false;

    Object.assign(stepStatusSummary.identifyWebRoutes, {
      status: STATUS_DONE_CLEAN,
      timeEnd: Date.now(),
    });
  }

  wikiData.wikiInfo.searchDataAvailable =
    (webRouteSources
      ? webRouteSources
          .some(({to}) => to[0].startsWith('searchData'))
      : null);

  if (stepStatusSummary.performBuild.status === STATUS_NOT_APPLICABLE) {
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

  logInfo`Passing control over to build mode: ${selectedBuildModeFlag}`;
  console.log('');

  try {
    buildModeResult = await selectedBuildMode.go({
      cliOptions,
      dataPath,
      mediaPath,
      mediaCachePath,
      wikiCachePath,
      queueSize,
      srcRootPath: __dirname,

      defaultLanguage: finalDefaultLanguage,
      languages,
      missingImagePaths,
      thumbsCache,
      urls,
      urlSpec,
      webRoutes: preparedWebRoutes,
      wikiData,

      closeLanguageWatchers,
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
