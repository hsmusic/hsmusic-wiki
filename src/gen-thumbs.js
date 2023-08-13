#!/usr/bin/env node

// Ok, so the d8te is 3 March 2021, and the music wiki was initially released
// on 15 November 2019. That is 474 days or 11376 hours. In my opinion, and
// pro8a8ly the opinions of at least one other person, that is WAY TOO LONG
// to go without media thum8nails!!!! So that's what this file is here to do.
//
// This program takes a path to the media folder (via --media or the environ.
// varia8le HSMUSIC_MEDIA), traverses su8directories to locate image files,
// and gener8tes lower-resolution/file-size versions of all that are new or
// have 8een modified since the last run. We use a JSON-format cache of MD5s
// for each file to perform this comparision; we gener8te files (using ffmpeg)
// in "medium" and "small" sizes adjacent to the existing PNG for easy and
// versatile access in site gener8tion code.
//
// So for example, on the very first run, you might have a media folder which
// looks something like this:
//
//   media/
//     album-art/
//       one-year-older/
//         cover.jpg
//         firefly-cloud.jpg
//         october.jpg
//         ...
//     flash-art/
//       413.jpg
//       ...
//     bg.jpg
//     ...
//
// After running gen-thumbs.js with the path to that folder passed, you'd end
// up with something like this:
//
//   media/
//     album-art/
//       one-year-older/
//         cover.jpg
//         cover.medium.jpg
//         cover.small.jpg
//         firefly-cloud.jpg
//         firefly-cloud.medium.jpg
//         firefly-cloud.small.jpg
//         october.jpg
//         october.medium.jpg
//         october.small.jpg
//         ...
//     flash-art/
//       413.jpg
//       413.medium.jpg
//       413.small.jpg
//       ...
//     bg.jpg
//     bg.medium.jpg
//     bg.small.jpg
//     thumbs-cache.json
//     ...
//
// (Do note that while 8oth JPG and PNG are supported, gener8ted files will
// always 8e in JPG format and file extension. GIFs are skipped since there
// aren't any super gr8 ways to make those more efficient!)
//
// And then in gener8tion code, you'd reference the medium/small or original
// version of each file, as decided is appropriate. Here are some guidelines:
//
// - Small: Grid tiles on the homepage and in galleries.
// - Medium: Cover art on individual al8um and track pages, etc.
// - Original: Only linked to, not embedded.
//
// The traversal code is indiscrimin8te: there are no special cases to, say,
// not gener8te thum8nails for the bg.jpg file (since those would generally go
// unused). This is just to make the code more porta8le and sta8le, long-term,
// since it avoids a lot of otherwise implic8ted maintenance.

'use strict';

const CACHE_FILE = 'thumbnail-cache.json';
const WARNING_DELAY_TIME = 10000;

const thumbnailSpec = {
  'huge': {size: 1600, quality: 90},
  'semihuge': {size: 1200, quality: 92},
  'large': {size: 800, quality: 93},
  'medium': {size: 400, quality: 95, square: true},
  'small': {size: 250, quality: 85, square: true},
};

import {spawn} from 'child_process';
import {createHash} from 'crypto';
import * as path from 'path';

import {
  readFile,
  stat,
  unlink,
  writeFile,
} from 'fs/promises'; // Whatcha know! Nice.

import {createReadStream} from 'fs'; // Still gotta import from 8oth tho, for createReadStream.

import {
  fileIssue,
  logError,
  logInfo,
  logWarn,
  parseOptions,
  progressPromiseAll,
} from './util/cli.js';

import {
  commandExists,
  isMain,
  promisifyProcess,
  traverse,
} from './util/node-utils.js';

import {delay, queue} from './util/sugar.js';

export const defaultMagickThreads = 8;

function readFileMD5(filePath) {
  return new Promise((resolve, reject) => {
    const md5 = createHash('md5');
    const stream = createReadStream(filePath);
    stream.on('data', (data) => md5.update(data));
    stream.on('end', () => resolve(md5.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

async function getImageMagickVersion(spawnConvert) {
  const proc = spawnConvert(['--version'], false);

  let allData = '';
  proc.stdout.on('data', (data) => {
    allData += data.toString();
  });

  await promisifyProcess(proc, false);

  if (!allData.match(/ImageMagick/i)) {
    return null;
  }

  const match = allData.match(/Version: (.*)/i);
  if (!match) {
    return 'unknown version';
  }

  return match[1];
}

async function getSpawnConvert() {
  let fn, description, version;
  if (await commandExists('convert')) {
    fn = (args) => spawn('convert', args);
    description = 'convert';
  } else if (await commandExists('magick')) {
    fn = (args, prefix = true) =>
      spawn('magick', prefix ? ['convert', ...args] : args);
    description = 'magick convert';
  } else {
    return [`no convert or magick binary`, null];
  }

  version = await getImageMagickVersion(fn);

  if (version === null) {
    return [`binary --version output didn't indicate it's ImageMagick`];
  }

  return [`${description} (${version})`, fn];
}

function generateImageThumbnails(filePath, {spawnConvert}) {
  const dirname = path.dirname(filePath);
  const extname = path.extname(filePath);
  const basename = path.basename(filePath, extname);
  const output = (name) => path.join(dirname, basename + name + '.jpg');

  const convert = (name, {size, quality, square}) =>
    spawnConvert([
      filePath,
      ...
        (square
          // Scale so the smaller length matches the specified size.
          // Then crop about the center. The result will always be
          // a square image, scaled as to retain the best resolution
          // in the specified dimensions.
          ? ['-thumbnail', `${size}x${size}^`,
             '-gravity', 'center',
             '-extent', `${size}x${size}`]
          // Scale so the longer length matches the specified size.
          // The result will retain the original aspect ratio.
          : ['-thumbnail', `${size}x${size}>`]),
      '-interlace', 'Plane',
      '-quality', `${quality}%`,
      output(name),
    ]);

  return Promise.all(
    Object.entries(thumbnailSpec)
      .map(([ext, details]) =>
        promisifyProcess(convert('.' + ext, details), false)));
}

export async function clearThumbs(mediaPath, {
  queueSize = 0,
} = {}) {
  if (!mediaPath) {
    throw new Error('Expected mediaPath to be passed');
  }

  logInfo`Looking for thumbnails to clear out...`;

  const thumbFiles = await traverse(mediaPath, {
    filterFile: file => isThumb(file),
    filterDir: name => name !== '.git',
  });

  if (thumbFiles.length) {
    // Double-check files. Since we're unlinking (deleting) files,
    // we're better off safe than sorry!
    const thumbtacks = Object.keys(thumbnailSpec);
    const unsafeFiles = thumbFiles.filter(file => {
      if (path.extname(file) !== '.jpg') return true;
      if (thumbtacks.every(tack => !file.includes(tack))) return true;
      return false;
    });

    if (unsafeFiles.length > 0) {
      logError`Detected files which we thought were safe, but don't actually seem to be thumbnails!`;
      logError`List of files that were invalid: ${`(Please remove any personal files before reporting)`}`;
      for (const file of unsafeFiles) {
        console.error(file);
      }
      fileIssue();
      return;
    }

    logInfo`Clearing out ${thumbFiles.length} thumbs.`;

    const errored = [];

    await progressPromiseAll(`Removing thumbnail files`, queue(
      thumbFiles.map(file => async () => {
        try {
          await unlink(path.join(mediaPath, file));
        } catch (error) {
          if (error.code !== 'ENOENT') {
            errored.push(file);
          }
        }
      }),
      queueSize));

    if (errored.length) {
      logError`Couldn't remove these paths (${errored.length}):`;
      for (const file of errored) {
        console.error(file);
      }
      logError`Check for permission errors?`;
    } else {
      logInfo`Successfully deleted all ${thumbFiles.length} thumbnail files!`;
    }
  } else {
    logInfo`Didn't find any thumbs in media directory.`;
    logInfo`${mediaPath}`;
  }

  let cacheExists = false;
  try {
    await stat(path.join(mediaPath, CACHE_FILE));
    cacheExists = true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logInfo`Cache file already missing, nothing to remove there.`;
    } else {
      logWarn`Failed to access cache file. Check its permissions?`;
    }
  }

  if (cacheExists) {
    try {
      unlink(path.join(mediaPath, CACHE_FILE));
      logInfo`Removed thumbnail cache file.`;
    } catch (error) {
      logWarn`Failed to remove cache file. Check its permissions?`;
    }
  }
}

export default async function genThumbs(mediaPath, {
  queueSize = 0,
  magickThreads = defaultMagickThreads,
  quiet = false,
} = {}) {
  if (!mediaPath) {
    throw new Error('Expected mediaPath to be passed');
  }

  const quietInfo = quiet ? () => null : logInfo;

  const filterFile = (name) => {
    const ext = path.extname(name);
    if (ext !== '.jpg' && ext !== '.png') return false;
    if (isThumb(name)) return false;

    return true;
  };

  const filterDir = (name) => {
    if (name === '.git') return false;
    return true;
  };

  const [convertInfo, spawnConvert] = (await getSpawnConvert()) ?? [];
  if (!spawnConvert) {
    logError`${`It looks like you don't have ImageMagick installed.`}`;
    logError`ImageMagick is required to generate thumbnails for display on the wiki.`;
    logError`(Error message: ${convertInfo})`;
    logInfo`You can find info to help install ImageMagick on Linux, Windows, or macOS`;
    logInfo`from its official website: ${`https://imagemagick.org/script/download.php`}`;
    logInfo`If you have trouble working ImageMagick and would like some help, feel free`;
    logInfo`to drop a message in the HSMusic Discord server! ${'https://hsmusic.wiki/discord/'}`;
    return false;
  } else {
    logInfo`Found ImageMagick binary: ${convertInfo}`;
  }

  quietInfo`Running up to ${magickThreads + ' magick threads'} simultaneously.`;

  let cache,
    firstRun = false;
  try {
    cache = JSON.parse(await readFile(path.join(mediaPath, CACHE_FILE)));
    quietInfo`Cache file successfully read.`;
  } catch (error) {
    cache = {};
    if (error.code === 'ENOENT') {
      firstRun = true;
    } else {
      logWarn`Malformed or unreadable cache file: ${error}`;
      logWarn`You may want to cancel and investigate this!`;
      logWarn`All-new thumbnails and cache will be generated for this run.`;
      await delay(WARNING_DELAY_TIME);
    }
  }

  try {
    await writeFile(path.join(mediaPath, CACHE_FILE), JSON.stringify(cache));
    quietInfo`Writing to cache file appears to be working.`;
  } catch (error) {
    logWarn`Test of cache file writing failed: ${error}`;
    if (cache) {
      logWarn`Cache read succeeded: Any newly written thumbs will be unnecessarily regenerated on the next run.`;
    } else if (firstRun) {
      logWarn`No cache found: All thumbs will be generated now, and will be unnecessarily regenerated next run.`;
    } else {
      logWarn`Cache read failed: All thumbs will be regenerated now, and will be unnecessarily regenerated again next run.`;
    }
    logWarn`You may want to cancel and investigate this!`;
    await delay(WARNING_DELAY_TIME);
  }

  const imagePaths = await traverse(mediaPath, {filterFile, filterDir});

  const imageToMD5Entries = await progressPromiseAll(
    `Generating MD5s of image files`,
    queue(
      imagePaths.map(
        (imagePath) => () =>
          readFileMD5(path.join(mediaPath, imagePath)).then(
            (md5) => [imagePath, md5],
            (error) => [imagePath, {error}]
          )
      ),
      queueSize
    )
  );

  {
    let error = false;
    for (const entry of imageToMD5Entries) {
      if (entry[1].error) {
        logError`Failed to read ${entry[0]}: ${entry[1].error}`;
        error = true;
      }
    }
    if (error) {
      logError`Failed to read at least one image file!`;
      logError`This implies a thumbnail probably won't be generatable.`;
      logError`So, exiting early.`;
      return false;
    } else {
      quietInfo`All image files successfully read.`;
    }
  }

  // Technically we could pro8a8ly mut8te the cache varia8le in-place?
  // 8ut that seems kinda iffy.
  const updatedCache = Object.assign({}, cache);

  const entriesToGenerate = imageToMD5Entries.filter(
    ([filePath, md5]) => md5 !== cache[filePath]
  );

  if (entriesToGenerate.length === 0) {
    logInfo`All image thumbnails are already up-to-date - nice!`;
    return true;
  }

  logInfo`Generating thumbnails for ${entriesToGenerate.length} media files.`;
  if (entriesToGenerate.length > 250) {
    logInfo`Go get a latte - this could take a while!`;
  }

  const failed = [];
  const succeeded = [];
  const writeMessageFn = () =>
    `Writing image thumbnails. [failed: ${failed.length}]`;

  await progressPromiseAll(writeMessageFn,
    queue(
      entriesToGenerate.map(([filePath, md5]) => () =>
        generateImageThumbnails(path.join(mediaPath, filePath), {spawnConvert}).then(
          () => {
            updatedCache[filePath] = md5;
            succeeded.push(filePath);
          },
          error => {
            failed.push([filePath, error]);
          })),
      magickThreads));

  if (failed.length > 0) {
    for (const [path, error] of failed) {
      logError`Thumbnails failed to generate for ${path} - ${error}`;
    }
    logWarn`Result is incomplete - the above ${failed.length} thumbnails should be checked for errors.`;
    logWarn`${succeeded.length} successfully generated images won't be regenerated next run, though!`;
  } else {
    logInfo`Generated all (updated) thumbnails successfully!`;
  }

  try {
    await writeFile(
      path.join(mediaPath, CACHE_FILE),
      JSON.stringify(updatedCache)
    );
    quietInfo`Updated cache file successfully written!`;
  } catch (error) {
    logWarn`Failed to write updated cache file: ${error}`;
    logWarn`Any newly (re)generated thumbnails will be regenerated next run.`;
    logWarn`Sorry about that!`;
  }

  return true;
}

export function isThumb(file) {
  const thumbnailLabel = file.match(/\.([^.]+)\.jpg$/)?.[1];
  return Object.keys(thumbnailSpec).includes(thumbnailLabel);
}

if (isMain(import.meta.url)) {
  (async function () {
    const miscOptions = await parseOptions(process.argv.slice(2), {
      'media-path': {
        type: 'value',
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
    });

    const mediaPath = miscOptions['media-path'] || process.env.HSMUSIC_MEDIA;
    const queueSize = +(miscOptions['queue-size'] ?? 0);

    await genThumbs(mediaPath, {queueSize});
  })().catch((err) => {
    console.error(err);
  });
}
