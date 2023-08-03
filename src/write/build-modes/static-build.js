import * as path from 'path';

import {bindUtilities} from '../bind-utilities.js';
// import {validateWrites} from '../validate-writes.js';

import {
  quickLoadContentDependencies,
} from '../../content/dependencies/index.js';

import {quickEvaluate} from '../../content-function.js';

import {serializeThings} from '../../data/serialize.js';

import * as pageSpecs from '../../page/index.js';

import * as html from '../../util/html.js';
import {empty, queue, withEntries} from '../../util/sugar.js';

import {
  logError,
  logInfo,
  logWarn,
  progressCallAll,
  progressPromiseAll,
} from '../../util/cli.js';

import {
  getPagePathname,
  getPagePathnameAcrossLanguages,
  getURLsFrom,
  getURLsFromRoot,
} from '../../util/urls.js';

const pageFlags = Object.keys(pageSpecs);

export const description = `Generates all page content in one build (according to the contents of data files at build time) and writes them to disk, preparing the output folder for upload and serving by any static web host\n\nIntended for any production or public-facing release of a wiki; serviceable for local development, but can be a bit unwieldy and time/CPU-expensive`;

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
  _dataPath,
  mediaPath,
  queueSize,

  defaultLanguage,
  languages,
  srcRootPath,
  urls,
  urlSpec,
  wikiData,

  cachebust,
  developersComment,
  getSizeOfAdditionalFile,
  getSizeOfImageFile,
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

  await writeSymlinks({
    srcRootPath,
    mediaPath,
    outputPath,
    urls,
  });

  await writeFavicon({
    mediaPath,
    outputPath,
  });

  await writeSharedFilesAndPages({
    language: defaultLanguage,
    outputPath,
    urls,
    wikiData,
    /*
    wikiDataJSON: generateGlobalWikiDataJSON({
      serializeThings,
      wikiData,
    })
    */
  });

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

  const contentDependencies = await quickLoadContentDependencies();

  const perLanguageFn = async (language, i, entries) => {
    const baseDirectory =
      language === defaultLanguage ? '' : language.code;

    console.log(`\x1b[34;1m${`[${i + 1}/${entries.length}] ${language.code} (-> /${baseDirectory}) `.padEnd(60, '-')}\x1b[0m`);

    await progressPromiseAll(`Writing ${language.code}`, queue([
      ...pageWrites.map(page => () => {
        const pagePath = page.path;

        const localizedPathnames = getPagePathnameAcrossLanguages({
          defaultLanguage,
          languages,
          pagePath,
          urls,
        });

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
          absoluteTo,
          cachebust,
          defaultLanguage,
          getSizeOfAdditionalFile,
          getSizeOfImageFile,
          language,
          languages,
          pagePath,
          to,
          urls,
          wikiData,
        });

        const topLevelResult =
          quickEvaluate({
            contentDependencies,
            extraDependencies: {...bound, appendIndexHTML},

            name: page.contentFunction.name,
            args: page.contentFunction.args ?? [],
          });

        const {pageHTML, oEmbedJSON} = html.resolve(topLevelResult);

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

      /*
      ...redirectWrites.map(({fromPath, toPath, title: titleFn}) => () => {
        const title = titleFn({
          language,
        });

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
      */
    ], queueSize));
  };

  await wrapLanguages(perLanguageFn, {
    languages,
    writeOneLanguage,
  });

  // The single most important step.
  logInfo`Written!`;
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

import {
  copyFile,
  mkdir,
  stat,
  symlink,
  writeFile,
  unlink,
} from 'fs/promises';

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

function writeSymlinks({
  srcRootPath,
  mediaPath,
  outputPath,
  urls,
}) {
  return progressPromiseAll('Writing site symlinks.', [
    link(path.join(srcRootPath, 'util'), 'shared.utilityRoot'),
    link(path.join(srcRootPath, 'static'), 'shared.staticRoot'),
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
  language,
  outputPath,
  urls,
  wikiData,
  wikiDataJSON,
}) {
  const {groupData, wikiInfo} = wikiData;

  return progressPromiseAll(`Writing files & pages shared across languages.`, [
    /*
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
    */

    wikiDataJSON &&
      writeFile(
        path.join(outputPath, 'data.json'),
        wikiDataJSON),
  ].filter(Boolean));

  async function redirect(title, from, urlKey, directory) {
    const target = path.relative(
      from,
      urls.from('shared.root').to(urlKey, directory)
    );
    const content = generateRedirectHTML(title, target, {language});
    await mkdir(path.join(outputPath, from), {recursive: true});
    await writeFile(path.join(outputPath, from, 'index.html'), content);
  }
}
