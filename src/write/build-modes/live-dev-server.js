import * as http from 'http';
import {createReadStream} from 'fs';
import {stat} from 'fs/promises';
import * as path from 'path';
import {pipeline} from 'stream/promises'

import {bindUtilities} from '../bind-utilities.js';

import {serializeThings} from '../../data/serialize.js';

import * as pageSpecs from '../../page/index.js';

import {logInfo, logWarn, progressCallAll} from '../../util/cli.js';
import {withEntries} from '../../util/sugar.js';

import {
  getPagePathname,
  getPageSubdirectoryPrefix,
  getURLsFrom,
} from '../../util/urls.js';

import {
  generateDocumentHTML,
  generateGlobalWikiDataJSON,
  generateRedirectHTML,
} from '../page-template.js';

export function getCLIOptions() {
  return {
    host: {
      type: 'value',
    },

    port: {
      type: 'value',
      validate(size) {
        if (parseInt(size) !== parseFloat(size)) return 'an integer';
        if (parseInt(size) < 1024 || parseInt(size) > 49151) return 'a user/registered port (1024-49151)';
        return true;
      },
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
  urls,
  wikiData,

  cachebust,
  developersComment,
  getSizeOfAdditionalFile,
}) {
  const host = cliOptions['host'] ?? '0.0.0.0';
  const port = parseInt(cliOptions['port'] ?? 8002);

  let targetSpecPairs = getPageSpecsWithTargets({wikiData});
  const pages = progressCallAll(`Computing page data & paths for ${targetSpecPairs.length} targets.`,
    targetSpecPairs.map(({
      pageSpec,
      target,
      targetless,
    }) => () =>
      targetless
        ? pageSpec.writeTargetless({wikiData})
        : pageSpec.write(target, {wikiData}))).flat();

  logInfo`Will be serving a total of ${pages.length} pages.`;

  const urlToPageMap = Object.fromEntries(pages
    .filter(page => page.type === 'page' || page.type === 'redirect')
    .flatMap(page => {
      let servePath;
      if (page.type === 'page')
        servePath = page.path;
      else if (page.type === 'redirect')
        servePath = page.fromPath;

      const fullKey = 'localized.' + servePath[0];
      const urlArgs = servePath.slice(1);

      return Object.values(languages).map(language => {
        const baseDirectory =
          language === defaultLanguage ? '' : language.code;

        const pathname = getPagePathname({
          baseDirectory,
          fullKey,
          urlArgs,
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
        console.log(`${requestHead} [200] /data.json`);
      } catch (error) {
        response.writeHead(500, contentTypeJSON);
        response.end({error: `Internal error serializing wiki JSON`});
        console.error(`${requestHead} [500] /data.json`);
        console.error(error);
      }
      return;
    }

    const {
      area: localFileArea,
      path: localFilePath
    } = pathname.match(/^\/(?<area>static|util|media)\/(?<path>.*)/)?.groups ?? {};

    if (localFileArea) {
      // Not security tested, man, this is a dev server!!
      const safePath = path.resolve('/', localFilePath).replace(/^\//, '');

      let localDirectory;
      if (localFileArea === 'static' || localFileArea === 'util') {
        localDirectory = path.join(srcRootPath, localFileArea);
      } else if (localFileArea === 'media') {
        localDirectory = mediaPath;
      }

      const filePath = path.resolve(localDirectory, safePath);

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
          console.error(error);
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
        response.writeHead(200, contentType ? {'Content-Type': contentType} : {});
        await pipeline(
          createReadStream(filePath),
          response);
        console.log(`${requestHead} [200] ${pathname}`);
      } catch (error) {
        response.writeHead(500, contentTypePlain);
        response.end(`Failed during file-to-response pipeline`);
        console.error(`${requestHead} [500] ${pathname}`);
        console.error(error);
      }
      return;
    }

    // Other routes determined by page and URL specs

    // URL to page map expects trailing slash but no leading slash.
    const pathnameKey = pathname.replace(/^\//, '') + (pathname.endsWith('/') ? '' : '/');

    if (!Object.hasOwn(urlToPageMap, pathnameKey)) {
      response.writeHead(404, contentTypePlain);
      response.end(`No page found for: ${pathnameKey}\n`);
      console.log(`${requestHead} [404] ${pathname}`);
      return;
    }

    const {
      baseDirectory,
      language,
      page,
      servePath,
    } = urlToPageMap[pathnameKey];

    const to = getURLsFrom({
      urls,
      baseDirectory,
      pageSubKey: servePath[0],
      subdirectoryPrefix: getPageSubdirectoryPrefix({
        urlArgs: servePath.slice(1),
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

    try {
      const pageSubKey = servePath[0];
      const urlArgs = servePath.slice(1);

      if (page.type === 'redirect') {
        response.writeHead(301, contentTypeHTML);

        const target = to('localized.' + page.toPath[0], ...page.toPath.slice(1));
        const redirectHTML = generateRedirectHTML(page.title, target, {language});

        response.end(redirectHTML);

        console.log(`${requestHead} [301] (redirect) ${pathname}`);
        return;
      }

      response.writeHead(200, contentTypeHTML);

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

      const bound = bindUtilities({
        language,
        to,
        wikiData,
      });

      const pageInfo = page.page({
        ...bound,

        absoluteTo,
        relativeTo: to,
        to,
        urls,

        getSizeOfAdditionalFile,
      });

      const pageHTML = generateDocumentHTML(pageInfo, {
        cachebust,
        defaultLanguage,
        developersComment,
        getThemeString: bound.getThemeString,
        language,
        languages,
        localizedPathnames,
        oEmbedJSONHref: null, // No oEmbed support for live dev server
        pageSubKey,
        pathname,
        urlArgs,
        to,
        transformMultiline: bound.transformMultiline,
        wikiData,
      });

      console.log(`${requestHead} [200] ${pathname}`);
      response.end(pageHTML);
    } catch (error) {
      response.writeHead(500, contentTypePlain);
      response.end(`Error generating page, view server log for details\n`);
      console.error(`${requestHead} [500] ${pathname}`);
      console.error(error);
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
      console.error(error);
    }
  });

  server.on('listening', () => {
    logInfo`${'All done!'} Listening at: ${address}`;
    logInfo`Press ^C here (control+C) to stop the server and exit.`;
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
      Object.hasOwn(pageSpec, 'writeTargetless') &&
        {pageSpec, targetless: true},
    ])
    .filter(Boolean);
}
