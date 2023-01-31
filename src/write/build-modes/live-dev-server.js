import * as http from 'http';
import {createReadStream} from 'fs';
import {stat} from 'fs/promises';
import * as path from 'path';
import {pipeline} from 'stream/promises'

import {bindUtilities} from '../bind-utilities.js';

import {serializeThings} from '../../data/serialize.js';

import * as pageSpecs from '../../page/index.js';

import {logInfo, logWarn, progressCallAll} from '../../util/cli.js';

import {
  getPagePathname,
  getPagePathnameAcrossLanguages,
  getURLsFrom,
  getURLsFromRoot,
} from '../../util/urls.js';

import {
  generateDocumentHTML,
  generateGlobalWikiDataJSON,
  generateRedirectHTML,
} from '../page-template.js';

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
  const host = cliOptions['host'] ?? defaultHost;
  const port = parseInt(cliOptions['port'] ?? defaultPort);

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
      const safePath = path.posix.resolve('/', localFilePath).replace(/^\//, '');

      let localDirectory;
      if (localFileArea === 'static' || localFileArea === 'util') {
        localDirectory = path.join(srcRootPath, localFileArea);
      } else if (localFileArea === 'media') {
        localDirectory = mediaPath;
      }

      const filePath = path.resolve(localDirectory, safePath.split('/').join(path.sep));

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
        const target = to('localized.' + page.toPath[0], ...page.toPath.slice(1));

        response.writeHead(301, {
          ...contentTypeHTML,
          'Location': target,
        });

        const redirectHTML = generateRedirectHTML(page.title, target, {language});

        response.end(redirectHTML);

        console.log(`${requestHead} [301] (redirect) ${pathname}`);
        return;
      }

      response.writeHead(200, contentTypeHTML);

      const localizedPathnames = getPagePathnameAcrossLanguages({
        defaultLanguage,
        languages,
        pagePath: servePath,
        urls,
      });

      const bound = bindUtilities({
        absoluteTo,
        defaultLanguage,
        getSizeOfAdditionalFile,
        language,
        languages,
        to,
        urls,
        wikiData,
      });

      const pageInfo = page.page(bound);

      const pageHTML = generateDocumentHTML(pageInfo, {
        ...bound,
        cachebust,
        developersComment,
        localizedPathnames,
        oEmbedJSONHref: null, // No oEmbed support for live dev server
        pagePath: servePath,
        pathname,
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
