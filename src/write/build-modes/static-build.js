import * as path from 'node:path';

import {
  copyFile,
  cp,
  mkdir,
  stat,
  symlink,
  writeFile,
  unlink,
} from 'node:fs/promises';

import {rimraf} from 'rimraf';

import {quickLoadContentDependencies} from '#content-dependencies';
import {quickEvaluate} from '#content-function';
import * as html from '#html';
import * as pageSpecs from '#page-specs';
import {empty, queue, withEntries} from '#sugar';

import {
  fileIssue,
  logError,
  logInfo,
  logWarn,
  progressPromiseAll,
} from '#cli';

import {
  getPagePathname,
  getURLsFrom,
  getURLsFromRoot,
} from '#urls';

import {bindUtilities} from '../bind-utilities.js';
import {generateRedirectHTML, generateRandomLinkDataJSON} from '../common-templates.js';

const pageFlags = Object.keys(pageSpecs);

export const description = `Generates all page content in one build (according to the contents of data files at build time) and writes them to disk, preparing the output folder for upload and serving by any static web host\n\nIntended for any production or public-facing release of a wiki; serviceable for local development, but can be a bit unwieldy and time/CPU-expensive`;

export const config = {
  fileSizes: {
    default: 'perform',
  },

  languageReloading: {
    applicable: false,
  },

  mediaValidation: {
    default: 'perform',
  },

  search: {
    default: 'perform',
  },

  thumbs: {
    default: 'perform',
  },

  webRoutes: {
    required: true,
  },
};

export function getCLIOptions() {
  return {
    // This is the output directory. It's the one you'll upload online with
    // rsync or whatever when you're pushing an upd8, and also the one
    // you'd archive if you wanted to make a 8ackup of the whole dang
    // site. Just keep in mind that the gener8ted result will contain a
    // couple symlinked directories, so if you're uploading, you're pro8a8ly
    // gonna want to resolve those yourself.
    'out-path': {
      help: `Specify path to output directory, into which HTML page files and other output are written and other directories are linked\n\nAlways required alongside --static-build mode, but may be provided via the HSMUSIC_OUT environment variable instead`,
      type: 'value',
    },

    // Working without a dev server and just using file:// URLs in your we8
    // 8rowser? This will automatically append index.html to links across
    // the site. Not recommended for production, since it isn't guaranteed
    // 100% error-free (and index.html-style links are less pretty anyway).
    'append-index-html': {
      help: `Apply "index.html" to the end of page links, instead of just linking to the directory (ex. "/track/ng2yu/"); useful when no local server hosting option is available and browsing build output directly off the disk drive\n\nDefinitely not intended for production: this option isn't extensively tested and may include conspicuous oddities`,
      type: 'flag',
    },

    // Only want to 8uild one language during testing? This can chop down
    // 8uild times a pretty 8ig chunk! Just pass a single language code.
    'lang': {
      help: `Skip rest and build only pages for this locale language (specify a language code)`,
      type: 'value',
    },

    // NOT for neatly ena8ling or disa8ling specific features of the site!
    // This is only in charge of what general groups of files to write.
    // They're here to make development quicker when you're only working
    // on some particular area(s) of the site rather than making changes
    // across all of them.
    ...withEntries(pageSpecs, entries => entries.map(
      ([key, spec]) => [key, {
        help: spec.description &&
          `Skip rest and build only:\n${spec.description}`,
        type: 'flag',
      }])),
  };
}

export async function go({
  cliOptions,
  queueSize,

  universalUtilities,

  mediaPath,

  defaultLanguage,
  languages,
  urls,
  webRoutes,
  wikiData,

  niceShowAggregate,
}) {
  const outputPath = cliOptions['out-path'] || process.env.HSMUSIC_OUT;
  const appendIndexHTML = cliOptions['append-index-html'] ?? false;
  const writeOneLanguage = cliOptions['lang'] ?? null;

  if (!outputPath) {
    logError`Expected ${'--out-path'} option or ${'HSMUSIC_OUT'} to be set`;
    return false;
  }

  if (appendIndexHTML) {
    logWarn`Appending index.html to link hrefs. (Note: not recommended for production release!)`;
  }

  if (writeOneLanguage && !(writeOneLanguage in languages)) {
    logError`Specified to write only ${writeOneLanguage}, but there is no strings file with this language code!`;
    return false;
  } else if (writeOneLanguage) {
    logInfo`Writing only language ${writeOneLanguage} this run.`;
  } else {
    logInfo`Writing all languages.`;
  }

  const selectedPageFlags = Object.keys(cliOptions)
    .filter(key => pageFlags.includes(key));

  const writeAll = empty(selectedPageFlags) || selectedPageFlags.includes('all');
  logInfo`Writing site pages: ${writeAll ? 'all' : selectedPageFlags.join(', ')}`;

  await mkdir(outputPath, {recursive: true});

  await writeWebRouteSymlinks({
    outputPath,
    webRoutes,
  });

  await writeWebRouteCopies({
    outputPath,
    webRoutes,
  });

  if (writeAll) {
    await writeFavicon({
      mediaPath,
      outputPath,
    });

    await writeSharedFilesAndPages({
      outputPath,
      randomLinkDataJSON: generateRandomLinkDataJSON({wikiData}),
    });
  } else {
    logInfo`Skipping favicon and shared files (not writing all site pages).`
  }

  const buildSteps = writeAll
    ? Object.entries(pageSpecs)
    : Object.entries(pageSpecs)
        .filter(([flag]) => selectedPageFlags.includes(flag));

  let writes;
  {
    let error = false;

    // TODO: Port this to aggregate error
    writes = buildSteps
      .map(([flag, pageSpec]) => {
        if (pageSpec.condition && !pageSpec.condition({wikiData})) {
          return null;
        }

        const paths = [];

        if (pageSpec.pathsTargetless) {
          const result = pageSpec.pathsTargetless({wikiData});
          if (Array.isArray(result)) {
            paths.push(...result);
          } else {
            paths.push(result);
          }
        }

        if (pageSpec.targets) {
          if (!pageSpec.pathsForTarget) {
            logError`${flag + '.targets'} is specified, but ${flag + '.pathsForTarget'} is missing!`;
            error = true;
            return null;
          }

          const targets = pageSpec.targets({wikiData});

          if (!Array.isArray(targets)) {
            logError`${flag + '.targets'} was called, but it didn't return an array! (${targets})`;
            error = true;
            return null;
          }

          paths.push(...targets.flatMap(target => pageSpec.pathsForTarget(target)));
          // TODO: Validate each pathsForTargets entry
        }

        return paths;
      })
      .filter(Boolean)
      .flat();

    if (error) {
      return false;
    }
  }

  const pageWrites = writes.filter(({type}) => type === 'page');
  const dataWrites = writes.filter(({type}) => type === 'data');
  const redirectWrites = writes.filter(({type}) => type === 'redirect');

  if (writes.length) {
    logInfo`Total of ${writes.length} writes returned. (${pageWrites.length} page, ${dataWrites.length} data [currently skipped], ${redirectWrites.length} redirect)`;
  } else {
    logWarn`No writes returned at all, so exiting early. This is probably a bug!`;
    return false;
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

  let errored = false;

  const contentDependencies = await quickLoadContentDependencies({
    showAggregate: niceShowAggregate,
  });

  const commonUtilities = {...universalUtilities};

  const perLanguageFn = async (language, i, entries) => {
    const baseDirectory =
      language === defaultLanguage ? '' : language.code;

    console.log(`\x1b[34;1m${`[${i + 1}/${entries.length}] ${language.code} (-> /${baseDirectory}) `.padEnd(60, '-')}\x1b[0m`);

    await progressPromiseAll(`Writing ${language.code}`, queue([
      ...pageWrites.map(page => () => {
        const pagePath = page.path;

        const pathname = getPagePathname({
          baseDirectory,
          pagePath,
          urls,
        });

        const to = getURLsFrom({
          baseDirectory,
          pagePath,
          urls,
        });

        const absoluteTo = getURLsFromRoot({
          baseDirectory,
          urls,
        });

        const bound = bindUtilities({
          ...commonUtilities,

          absoluteTo,
          language,
          pagePath,
          pagePathStringFromRoot: pathname,
          to,
        });

        let pageHTML, oEmbedJSON;
        try {
          const topLevelResult =
            quickEvaluate({
              contentDependencies,
              extraDependencies: {...bound, appendIndexHTML},

              name: page.contentFunction.name,
              args: page.contentFunction.args ?? [],
            });

          ({pageHTML, oEmbedJSON} = html.resolve(topLevelResult));
        } catch (error) {
          logError`\rError generating page: ${pathname}`;
          niceShowAggregate(error);
          errored = true;
          return;
        }

        return writePage({
          pageHTML,
          oEmbedJSON,
          outputDirectory: path.join(outputPath, getPagePathname({
            baseDirectory,
            device: true,
            pagePath,
            urls,
          })),
        });
      }),

      ...redirectWrites.map(({fromPath, toPath, title, getTitle}) => () => {
        title ??= getTitle?.({language});

        const to = getURLsFrom({
          baseDirectory,
          pagePath: fromPath,
          urls,
        });

        const target = to('localized.' + toPath[0], ...toPath.slice(1));
        const pageHTML = generateRedirectHTML(title, target, {language});

        return writePage({
          pageHTML,
          outputDirectory: path.join(outputPath, getPagePathname({
            baseDirectory,
            device: true,
            pagePath: fromPath,
            urls,
          })),
        });
      }),
    ], queueSize));
  };

  await wrapLanguages(perLanguageFn, {
    languages,
    writeOneLanguage,
  });

  // The single most important step.
  logInfo`Written!`;

  if (errored) {
    logWarn`The code generating content for some pages ended up erroring.`;
    logWarn`These pages were skipped, so if you ran a build previously and`;
    logWarn`they didn't error that time, then the old version is still`;
    logWarn`available - albeit possibly outdated! Please scroll up and send`;
    logWarn`the HSMusic developers a copy of the errors:`;
    fileIssue({topMessage: null});

    return false;
  }

  return true;
}

// Wrapper function for running a function once for all languages.
async function wrapLanguages(fn, {
  languages,
  writeOneLanguage = null,
}) {
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

async function writePage({
  pageHTML,
  oEmbedJSON = '',
  outputDirectory,
}) {
  await mkdir(outputDirectory, {recursive: true});

  await Promise.all([
    writeFile(path.join(outputDirectory, 'index.html'), pageHTML),

    oEmbedJSON &&
      writeFile(path.join(outputDirectory, 'oembed.json'), oEmbedJSON),
  ].filter(Boolean));
}

function writeWebRouteSymlinks({
  outputPath,
  webRoutes,
}) {
  const symlinkRoutes =
    webRoutes.filter(route => route.statically === 'symlink');

  const promises =
    symlinkRoutes.map(async route => {
      const parts = route.to.split('/');
      const parentDirectoryParts = parts.slice(0, -1);
      const symlinkNamePart = parts.at(-1);

      const parentDirectory = path.join(outputPath, ...parentDirectoryParts);
      const symlinkPath = path.join(parentDirectory, symlinkNamePart);

      try {
        await unlink(symlinkPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      await mkdir(parentDirectory, {recursive: true});

      try {
        await symlink(route.from, symlinkPath);
      } catch (error) {
        if (error.code === 'EPERM') {
          await symlink(route.from, symlinkPath, 'junction');
        } else {
          throw error;
        }
      }
    });

  return progressPromiseAll(`Writing web route symlinks.`, promises);
}

async function writeWebRouteCopies({
  outputPath,
  webRoutes,
}) {
  const copyRoutes =
    webRoutes.filter(route => route.statically === 'copy');

  const promises =
    copyRoutes.map(async route => {
      const permissionName = '__hsmusic-ok-for-deletion.txt';

      const parts = route.to.split('/');
      const parentDirectoryParts = parts.slice(0, -1);
      const copyNamePart = parts.at(-1);

      const parentDirectory = path.join(outputPath, ...parentDirectoryParts);
      const copyPath = path.join(parentDirectory, copyNamePart);

      // We're going to do a rimraf call! This is freaking terrifying,
      // so nope out on a couple important conditions.

      let needsDelete;
      try {
        await stat(copyPath);
        needsDelete = true;
      } catch (error) {
        if (error.code === 'ENOENT') {
          needsDelete = false;
        } else {
          throw error;
        }
      }

      if (needsDelete) {
        // First remove it directly, in case it's a symlink.
        try {
          await unlink(copyPath);
          needsDelete = false;
        } catch (error) {
          // EPERM is POSIX, but libuv may or may not flat-out just raise
          // the system error (which is ostensibly EISDIR on Linux).
          // https://github.com/nodejs/node-v0.x-archive/issues/5791
          // https://man7.org/linux/man-pages/man2/unlink.2.html
          //
          // Both of these indidcate "a directory, probably" and we'll
          // still check for the deletion permission file where we expect
          // it before actually touching anything.
          if (error.code !== 'EPERM' && error.code !== 'EISDIR') {
            throw error;
          }
        }
      }

      if (needsDelete) {
        // Then check that the deletion permission file exists
        // where we expect it.
        try {
          await stat(path.join(copyPath, permissionName));
        } catch (error) {
          if (error.code === 'ENOENT') {
            throw new Error(`Couldn't find ${permissionName} in ${copyPath} - please delete or move away this folder manually`);
          } else {
            throw error;
          }
        }

        // And *then* actually delete that directory.
        await rimraf(copyPath);
      }

      // Actually copy the source path where it's wanted.
      await cp(route.from, copyPath, {recursive: true});

      // And certify that it's OK to delete this path, next time around.
      await writeFile(path.join(copyPath, permissionName),
        `The presence of this file (by its name, not its contents)\n` +
        `indicates hsmusic may delete everything contained in this\n` +
        `directory (the one which directly contains this file, *not*\n` +
        `any further-up parent directories).\n` +
        `\n` +
        `If you make edits, or add any files, they will be deleted or\n` +
        `overwritten the next time you run the build.\n` +
        `\n` +
        `If you delete *this* file, hsmusic will error during the next\n` +
        `build, and will ask that you delete the containing directory\n` +
        `yourself.\n`);
    });

  const results =
    await Promise.allSettled(promises);

  const errors =
    results
      .filter(({status}) => status === 'rejected')
      .map(({reason}) => reason)
      .map(err =>
        (err.message.startsWith(`Couldn't find`)
          ? err.message
          : err));

  if (empty(errors)) {
    logInfo`Wrote web route copies.`;
  } else {
    throw new AggregateError(errors, `Errors copying internal files ("web routes")`);
  }
}

async function writeFavicon({
  mediaPath,
  outputPath,
}) {
  const faviconFile = 'favicon.ico';

  try {
    await stat(path.join(mediaPath, faviconFile));
  } catch (error) {
    return;
  }

  try {
    await copyFile(
      path.join(mediaPath, faviconFile),
      path.join(outputPath, faviconFile));
  } catch (error) {
    logWarn`Failed to copy favicon! ${error.message}`;
    return;
  }

  logInfo`Copied favicon to site root.`;
}

async function writeSharedFilesAndPages({
  outputPath,
  randomLinkDataJSON,
}) {
  return progressPromiseAll(`Writing files & pages shared across languages.`, [
    randomLinkDataJSON &&
      writeFile(
        path.join(outputPath, 'random-link-data.json'),
        randomLinkDataJSON),
  ].filter(Boolean));
}
