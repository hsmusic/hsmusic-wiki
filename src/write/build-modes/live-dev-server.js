import * as http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import * as path from 'node:path';
import {pipeline} from 'node:stream/promises'

import {logInfo, logWarn, progressCallAll} from '#cli';
import {watchContentDependencies} from '#content-dependencies';
import {quickEvaluate} from '#content-function';
import * as html from '#html';
import * as pageSpecs from '#page-specs';
import {serializeThings} from '#serialize';
import {empty} from '#sugar';

import {
  getPagePathname,
  getURLsFrom,
  getURLsFromRoot,
} from '#urls';

import {bindUtilities} from '../bind-utilities.js';
import {generateGlobalWikiDataJSON, generateRedirectHTML} from '../common-templates.js';

const defaultHost = '0.0.0.0';
const defaultPort = 8002;

export const description = `Hosts a local HTTP server which generates page content as it is requested, instead of all at once; reacts to changes in data files, so new reloads will be up-to-date with on-disk YAML data (<- not implemented yet, check back soon!)\n\nIntended for local development ONLY; this custom HTTP server is NOT rigorously tested and almost certainly has security flaws`;

export function getCLIOptions() {
  return {
    host: {
      help: `Hostname to which HTTP server is bound\nDefaults to ${defaultHost}`,
      type: 'value',
    },

    port: {
      help: `Port to which HTTP server is bound\nDefaults to ${defaultPort}`,
      type: 'value',
      validate(size) {
        if (parseInt(size) !== parseFloat(size)) return 'an integer';
        if (parseInt(size) < 1024 || parseInt(size) > 49151) return 'a user/registered port (1024-49151)';
        return true;
      },
    },

    'quiet-responses': {
      help: `Disables outputting [200] and [404] responses in the server log`,
      type: 'flag',
    },
  };
}

export async function go({
  cliOptions,
  _dataPath,
  mediaPath,

  defaultLanguage,
  languages,
  srcRootPath,
  thumbsCache,
  urls,
  wikiData,

  cachebust,
  developersComment,
  getSizeOfAdditionalFile,
  getSizeOfImagePath,
  niceShowAggregate,
}) {
  const showError = (error) => {
    if (error instanceof AggregateError && niceShowAggregate) {
      niceShowAggregate(error);
    } else {
      console.error(error);
    }
  };

  const host = cliOptions['host'] ?? defaultHost;
  const port = parseInt(cliOptions['port'] ?? defaultPort);
  const quietResponses = cliOptions['quiet-responses'] ?? false;

  const contentDependenciesWatcher = await watchContentDependencies();
  const {contentDependencies} = contentDependenciesWatcher;

  contentDependenciesWatcher.on('error', () => {});
  await new Promise(resolve => contentDependenciesWatcher.once('ready', resolve));

  let targetSpecPairs = getPageSpecsWithTargets({wikiData});
  const pages = progressCallAll(`Computing page data & paths for ${targetSpecPairs.length} targets.`,
    targetSpecPairs.flatMap(({
      pageSpec,
      target,
      targetless,
    }) => () => {
      if (targetless) {
        const result = pageSpec.pathsTargetless({wikiData});
        return Array.isArray(result) ? result : [result];
      } else {
        return pageSpec.pathsForTarget(target);
      }
    })).flat();

  logInfo`Will be serving a total of ${pages.length} pages.`;

  const urlToPageMap = Object.fromEntries(pages
    .filter(page => page.type === 'page' || page.type === 'redirect')
    .flatMap(page => {
      let servePath;
      if (page.type === 'page')
        servePath = page.path;
      else if (page.type === 'redirect')
        servePath = page.fromPath;

      return Object.values(languages).map(language => {
        const baseDirectory =
          language === defaultLanguage ? '' : language.code;

        const pathname = getPagePathname({
          baseDirectory,
          pagePath: servePath,
          urls,
        });

        return [pathname, {
          baseDirectory,
          language,
          page,
          servePath,
        }];
      });
    }));

  const server = http.createServer(async (request, response) => {
    const contentTypeHTML = {'Content-Type': 'text/html; charset=utf-8'};
    const contentTypeJSON = {'Content-Type': 'application/json; charset=utf-8'};
    const contentTypePlain = {'Content-Type': 'text/plain; charset=utf-8'};

    const requestTime = new Date().toLocaleDateString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    const requestHead = `${requestTime} - ${request.socket.remoteAddress}`;

    let url;
    try {
      url = new URL(request.url, `http://${request.headers.host}`);
    } catch (error) {
      response.writeHead(500, contentTypePlain);
      response.end('Failed to parse request URL\n');
      return;
    }

    const {pathname} = url;

    // Specialized routes

    if (pathname === '/data.json') {
      try {
        const json = generateGlobalWikiDataJSON({
          serializeThings,
          wikiData,
        });
        response.writeHead(200, contentTypeJSON);
        response.end(json);
        if (!quietResponses) console.log(`${requestHead} [200] /data.json`);
      } catch (error) {
        response.writeHead(500, contentTypeJSON);
        response.end(`Internal error serializing wiki JSON`);
        console.error(`${requestHead} [500] /data.json`);
        showError(error);
      }
      return;
    }

    const {
      area: localFileArea,
      path: localFilePath
    } = pathname.match(/^\/(?<area>static|util|media)\/(?<path>.*)/)?.groups ?? {};

    if (localFileArea) {
      // Not security tested, man, this is a dev server!!
      const safePath = path.posix.resolve('/', localFilePath).replace(/^\//, '');

      let localDirectory;
      if (localFileArea === 'static' || localFileArea === 'util') {
        localDirectory = path.join(srcRootPath, localFileArea);
      } else if (localFileArea === 'media') {
        localDirectory = mediaPath;
      }

      let filePath;
      try {
        filePath = path.resolve(localDirectory, decodeURI(safePath.split('/').join(path.sep)));
      } catch (error) {
        response.writeHead(404, contentTypePlain);
        response.end(`No ${localFileArea} file found for: ${safePath}`);
        console.log(`${requestHead} [404] ${pathname}`);
        console.log(`Failed to decode request pathname`);
      }

      try {
        await stat(filePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          response.writeHead(404, contentTypePlain);
          response.end(`No ${localFileArea} file found for: ${safePath}`);
          console.log(`${requestHead} [404] ${pathname}`);
          console.log(`ENOENT for stat: ${filePath}`);
        } else {
          response.writeHead(500, contentTypePlain);
          response.end(`Internal error accessing ${localFileArea} file for: ${safePath}`);
          console.error(`${requestHead} [500] ${pathname}`);
          showError(error);
        }
        return;
      }

      const extname = path.extname(safePath).slice(1).toLowerCase();

      const contentType = {
        // BRB covering all my bases
        'aac': 'audio/aac',
        'bmp': 'image/bmp',
        'css': 'text/css',
        'csv': 'text/csv',
        'gif': 'image/gif',
        'ico': 'image/vnd.microsoft.icon',
        'jpg': 'image/jpeg',
        'jpeg:': 'image/jpeg',
        'js': 'text/javascript',
        'mjs': 'text/javascript',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'oga': 'audio/ogg',
        'ogg': 'audio/ogg',
        'ogv': 'video/ogg',
        'opus': 'audio/opus',
        'png': 'image/png',
        'pdf': 'application/pdf',
        'svg': 'image/svg+xml',
        'ttf': 'font/ttf',
        'txt': 'text/plain',
        'wav': 'audio/wav',
        'weba': 'audio/webm',
        'webm': 'video/webm',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'xml': 'application/xml',
        'zip': 'application/zip',
      }[extname];

      try {
        const {size} = await stat(filePath);
        response.writeHead(200, contentType ? {
          'Content-Type': contentType,
          'Content-Length': size,
        } : {});
        await pipeline(
          createReadStream(filePath),
          response);
        if (!quietResponses) console.log(`${requestHead} [200] ${pathname}`);
      } catch (error) {
        response.writeHead(500, contentTypePlain);
        response.end(`Failed during file-to-response pipeline`);
        console.error(`${requestHead} [500] ${pathname}`);
        showError(error);
      }
      return;
    }

    // Other routes determined by page and URL specs

    // URL to page map expects trailing slash but no leading slash.
    const pathnameKey = pathname.replace(/^\//, '') + (pathname.endsWith('/') ? '' : '/');

    if (!Object.hasOwn(urlToPageMap, pathnameKey)) {
      response.writeHead(404, contentTypePlain);
      response.end(`No page found for: ${pathnameKey}\n`);
      if (!quietResponses) console.log(`${requestHead} [404] ${pathname}`);
      return;
    }

    // All pages expect to be served at a URL with a trailing slash, which must
    // be fulfilled for relative URLs (ex. href="../lofam5/") to work. Redirect
    // if there is no trailing slash in the request URL.
    if (!pathname.endsWith('/')) {
      const target = pathname + '/';
      response.writeHead(301, {
        ...contentTypePlain,
        'Location': target,
      });
      response.end(`Redirecting to: ${target}\n`);
      console.log(`${requestHead} [301] (trl. slash) ${pathname}`);
      return;
    }

    const {
      baseDirectory,
      language,
      page,
      servePath,
    } = urlToPageMap[pathnameKey];

    const to = getURLsFrom({
      baseDirectory,
      pagePath: servePath,
      urls,
    });

    const absoluteTo = getURLsFromRoot({
      baseDirectory,
      urls,
    });

    try {
      if (page.type === 'redirect') {
        const title =
          page.title ??
          page.getTitle?.({language});

        const target = to('localized.' + page.toPath[0], ...page.toPath.slice(1));

        response.writeHead(301, {
          ...contentTypeHTML,
          'Location': target,
        });

        const redirectHTML = generateRedirectHTML(title, target, {language});

        response.end(redirectHTML);

        console.log(`${requestHead} [301] (redirect) ${pathname}`);
        return;
      }

      const bound = bindUtilities({
        absoluteTo,
        cachebust,
        defaultLanguage,
        getSizeOfAdditionalFile,
        getSizeOfImagePath,
        language,
        languages,
        pagePath: servePath,
        thumbsCache,
        to,
        urls,
        wikiData,
      });

      const topLevelResult =
        quickEvaluate({
          contentDependencies,
          extraDependencies: {...bound, appendIndexHTML: false},

          name: page.contentFunction.name,
          args: page.contentFunction.args ?? [],
        });

      const {pageHTML} = html.resolve(topLevelResult);

      if (!quietResponses) console.log(`${requestHead} [200] ${pathname}`);
      response.writeHead(200, contentTypeHTML);
      response.end(pageHTML);
    } catch (error) {
      console.error(`${requestHead} [500] ${pathname}`);
      showError(error);
      response.writeHead(500, contentTypePlain);
      response.end(`Error generating page, view server log for details\n`);
    }
  });

  const address = `http://${host}:${port}/`;

  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      logWarn`Port ${port} is already in use - will (continually) retry after 10 seconds.`;
      logWarn`Press ^C here (control+C) to exit and change ${'--port'} number, or stop the server currently running on port ${port}.`;
      setTimeout(() => {
        server.close();
        server.listen(port, host);
      }, 10_000);
    } else {
      console.error(`Server error detected (code: ${error.code})`);
      showError(error);
    }
  });

  server.on('listening', () => {
    logInfo`${'All done!'} Listening at: ${address}`;
    logInfo`Press ^C here (control+C) to stop the server and exit.`;
    if (quietResponses) {
      logInfo`Suppressing [200] and [404] response logging.`;
    }
  });

  server.listen(port, host);

  // Just keep going... forever!!!
  await new Promise(() => {});

  return true;
}

function getPageSpecsWithTargets({
  wikiData,
}) {
  return Object.values(pageSpecs)
    .filter(pageSpec => pageSpec.condition?.({wikiData}) ?? true)
    .flatMap(pageSpec => [
      ...pageSpec.targets
        ? pageSpec.targets({wikiData})
            .map(target => ({pageSpec, target}))
        : [],
      Object.hasOwn(pageSpec, 'pathsTargetless') &&
        {pageSpec, targetless: true},
    ])
    .filter(Boolean);
}
