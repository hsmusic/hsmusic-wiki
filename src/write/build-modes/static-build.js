import * as path from 'path';

import {bindUtilities} from '../bind-utilities.js';
import {validateWrites} from '../validate-writes.js';

import {
  generateDocumentHTML,
  generateGlobalWikiDataJSON,
  generateOEmbedJSON,
  generateRedirectHTML,
} from '../page-template.js';

import {serializeThings} from '../../data/serialize.js';

import * as pageSpecs from '../../page/index.js';

import link from '../../util/link.js';
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
  getPagePaths,
  getPageSubdirectoryPrefix,
  getURLsFrom,
} from '../../util/urls.js';

const pageFlags = Object.keys(pageSpecs);

export function getCLIOptions() {
  return {
    // This is the output directory. It's the one you'll upload online with
    // rsync or whatever when you're pushing an upd8, and also the one
    // you'd archive if you wanted to make a 8ackup of the whole dang
    // site. Just keep in mind that the gener8ted result will contain a
    // couple symlinked directories, so if you're uploading, you're pro8a8ly
    // gonna want to resolve those yourself.
    'out-path': {
      type: 'value',
    },

    // Working without a dev server and just using file:// URLs in your we8
    // 8rowser? This will automatically append index.html to links across
    // the site. Not recommended for production, since it isn't guaranteed
    // 100% error-free (and index.html-style links are less pretty anyway).
    'append-index-html': {
      type: 'flag',
    },

    // Only want to 8uild one language during testing? This can chop down
    // 8uild times a pretty 8ig chunk! Just pass a single language code.
    'lang': {
      type: 'value',
    },

    // NOT for neatly ena8ling or disa8ling specific features of the site!
    // This is only in charge of what general groups of files to write.
    // They're here to make development quicker when you're only working
    // on some particular area(s) of the site rather than making changes
    // across all of them.
    ...Object.fromEntries(pageFlags.map((key) => [key, {type: 'flag'}])),
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
    link.globalOptions.appendIndexHTML = true;
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
    wikiDataJSON: generateGlobalWikiDataJSON({
      serializeThings,
      wikiData,
    })
  });

  const buildSteps = writeAll
    ? Object.entries(pageSpecs)
    : Object.entries(pageSpecs)
        .filter(([flag]) => selectedPageFlags.includes(flag));

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
      return false;
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

  const perLanguageFn = async (language, i, entries) => {
    const baseDirectory =
      language === defaultLanguage ? '' : language.code;

    console.log(`\x1b[34;1m${`[${i + 1}/${entries.length}] ${language.code} (-> /${baseDirectory}) `.padEnd(60, '-')}\x1b[0m`);

    await progressPromiseAll(`Writing ${language.code}`, queue([
      ...pageWrites.map((props) => () => {
        const {path, page} = props;

        const pageSubKey = path[0];
        const urlArgs = path.slice(1);

        const localizedPathnames = withEntries(languages, entries => entries
          .filter(([key, language]) => key !== 'default' && !language.hidden)
          .map(([_key, language]) => [
            language.code,
            getPagePathname({
              baseDirectory:
                (language === defaultLanguage
                  ? ''
                  : language.code),
              fullKey: 'localized.' + pageSubKey,
              urlArgs,
              urls,
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
          subdirectoryPrefix: getPageSubdirectoryPrefix({
            urlArgs: page.path.slice(1),
          }),
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
          cachebust,
          defaultLanguage,
          developersComment,
          getThemeString: bound.getThemeString,
          language,
          languages,
          localizedPathnames,
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
          subdirectoryPrefix: getPageSubdirectoryPrefix({
            urlArgs: fromPath.slice(1),
          }),
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
  html,
  oEmbedJSON = '',
  paths,
}) {
  await mkdir(paths.output.directory, {recursive: true});

  await Promise.all([
    writeFile(paths.output.documentHTML, html),

    oEmbedJSON &&
      writeFile(paths.output.oEmbedJSON, oEmbedJSON),
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
