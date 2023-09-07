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

export const CACHE_FILE = 'thumbnail-cache.json';
const WARNING_DELAY_TIME = 10000;

const thumbnailSpec = {
  'huge': {size: 1600, quality: 90},
  'semihuge': {size: 1200, quality: 92},
  'large': {size: 800, quality: 93},
  'medium': {size: 400, quality: 95},
  'small': {size: 250, quality: 85},
};

import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, stat, unlink, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import dimensionsOf from 'image-size';

import {delay, empty, queue} from '#sugar';
import {CacheableObject} from '#things';

import {
  colors,
  fileIssue,
  logError,
  logInfo,
  logWarn,
  parseOptions,
  progressPromiseAll,
} from '#cli';

import {
  commandExists,
  isMain,
  promisifyProcess,
  traverse,
} from '#node-utils';

export const defaultMagickThreads = 8;

export function getThumbnailsAvailableForDimensions([width, height]) {
  // This function is intended to be portable, so it can be used both for
  // calculating which thumbnails to generate, and which ones will be ready
  // to reference in generated code. Sizes are in array [name, size] form
  // with larger sizes earlier in return. Keep in mind this isn't a direct
  // 1:1 mapping with the sizes listed in the thumbnail spec, because the
  // largest thumbnail (first in return) will be adjusted to the provided
  // dimensions.

  const {all} = getThumbnailsAvailableForDimensions;

  // Find the largest size which is beneath the passed dimensions. We use the
  // longer edge here (of width and height) so that each resulting thumbnail is
  // fully constrained within the size*size square defined by its spec.
  const longerEdge = Math.max(width, height);
  const index = all.findIndex(([name, size]) => size <= longerEdge);

  // Literal edge cases are handled specially. For dimensions which are bigger
  // than the biggest thumbnail in the spec, return all possible results.
  // These don't need any adjustments since the largest is already smaller than
  // the provided dimensions.
  if (index === 0) {
    return [
      ...all,
    ];
  }

  // For dimensions which are smaller than the smallest thumbnail, return only
  // the smallest, adjusted to the provided dimensions.
  if (index === -1) {
    const smallest = all[all.length - 1];
    return [
      [smallest[0], longerEdge],
    ];
  }

  // For non-edge cases, we return the largest size below the dimensions
  // as well as everything smaller, but also the next size larger - that way
  // there's a size which is as big as the original, but still JPEG compressed.
  // The size larger is adjusted to the provided dimensions to represent the
  // actual dimensions it'll provide.
  const larger = all[index - 1];
  const rest = all.slice(index);
  return [
    [larger[0], longerEdge],
    ...rest,
  ];
}

getThumbnailsAvailableForDimensions.all =
  Object.entries(thumbnailSpec)
    .map(([name, {size}]) => [name, size])
    .sort((a, b) => b[1] - a[1]);

export function checkIfImagePathHasCachedThumbnails(imagePath, cache) {
  // Generic utility for checking if the thumbnail cache includes any info for
  // the provided image path, so that the other functions don't hard-code the
  // cache format.

  return !!cache[imagePath];
}

export function getDimensionsOfImagePath(imagePath, cache) {
  // This function is really generic. It takes the gen-thumbs image cache and
  // returns the dimensions in that cache, so that other functions don't need
  // to hard-code the cache format.

  if (!cache[imagePath]) {
    throw new Error(`Expected imagePath to be included in cache, got ${imagePath}`);
  }

  const [width, height] = cache[imagePath].slice(1);
  return [width, height];
}

export function getThumbnailEqualOrSmaller(preferred, imagePath, cache) {
  // This function is totally exclusive to page generation. It's a shorthand
  // for accessing dimensions from the thumbnail cache, calculating all the
  // thumbnails available, and selecting the one which is equal to or smaller
  // than the provided size. Since the path provided might not be the actual
  // one which is being thumbnail-ified, this just returns the name of the
  // selected thumbnail size.

  if (!cache[imagePath]) {
    throw new Error(`Expected imagePath to be included in cache, got ${imagePath}`);
  }

  const {size: preferredSize} = thumbnailSpec[preferred];
  const [width, height] = getDimensionsOfImagePath(imagePath, cache);
  const available = getThumbnailsAvailableForDimensions([width, height]);
  const [selected] = available.find(([name, size]) => size <= preferredSize);
  return selected;
}

function readFileMD5(filePath) {
  return new Promise((resolve, reject) => {
    const md5 = createHash('md5');
    const stream = createReadStream(filePath);
    stream.on('data', (data) => md5.update(data));
    stream.on('end', () => resolve(md5.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

async function identifyImageDimensions(filePath) {
  // See: https://github.com/image-size/image-size/issues/96
  const buffer = await readFile(filePath);
  const dimensions = dimensionsOf(buffer);
  return [dimensions.width, dimensions.height];
}

async function getImageMagickVersion(binary) {
  const proc = spawn(binary, ['--version']);

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

async function getSpawnMagick(tool) {
  if (tool !== 'identify' && tool !== 'convert') {
    throw new Error(`Expected identify or convert`);
  }

  let fn = null;
  let description = null;
  let version = null;

  if (await commandExists(tool)) {
    version = await getImageMagickVersion(tool);
    if (version !== null) {
      fn = (args) => spawn(tool, args);
      description = tool;
    }
  }

  if (fn === null && await commandExists('magick')) {
    version = await getImageMagickVersion(fn);
    if (version !== null) {
      fn = (args) => spawn('magick', [tool, ...args]);
      description = `magick ${tool}`;
    }
  }

  if (fn === null) {
    return [`no ${tool} or magick binary`, null];
  }

  return [`${description} (${version})`, fn];
}

// Note: This returns an array of no-argument functions, suitable for passing
// to queue().
function generateImageThumbnails({
  filePath,
  dimensions,
  spawnConvert,
}) {
  const dirname = path.dirname(filePath);
  const extname = path.extname(filePath);
  const basename = path.basename(filePath, extname);
  const output = (name) => path.join(dirname, basename + name + '.jpg');

  const convert = (name, {size, quality}) =>
    spawnConvert([
      filePath,
      '-strip',
      '-resize',
      `${size}x${size}>`,
      '-interlace',
      'Plane',
      '-quality',
      `${quality}%`,
      output(name),
    ]);

  return (
    getThumbnailsAvailableForDimensions(dimensions)
      .map(([name]) => [name, thumbnailSpec[name]])
      .map(([name, details]) => () =>
        promisifyProcess(convert('.' + name, details), false)));
}

export async function clearThumbs(mediaPath, {
  queueSize = 0,
} = {}) {
  if (!mediaPath) {
    throw new Error('Expected mediaPath to be passed');
  }

  logInfo`Looking for thumbnails to clear out...`;

  const thumbFiles = await traverse(mediaPath, {
    pathStyle: 'device',
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
      if (path.relative(mediaPath, file).startsWith('../')) return true;
      return false;
    });

    if (unsafeFiles.length > 0) {
      logError`Detected files which we thought were safe, but don't actually seem to be thumbnails!`;
      logError`List of files that were invalid: ${`(Please remove any personal files before reporting)`}`;
      for (const file of unsafeFiles) {
        console.error(file);
      }
      fileIssue();
      return {success: false};
    }

    logInfo`Clearing out ${thumbFiles.length} thumbs.`;

    const errored = [];

    await progressPromiseAll(`Removing thumbnail files`, queue(
      thumbFiles.map(file => async () => {
        try {
          await unlink(file);
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
      return {success: false};
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

  return {success: true};
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

  const [convertInfo, spawnConvert] = await getSpawnMagick('convert');

  if (!spawnConvert) {
    logError`${`It looks like you don't have ImageMagick installed.`}`;
    logError`ImageMagick is required to generate thumbnails for display on the wiki.`;
    for (const error of [convertInfo].filter(Boolean)) {
      logError`(Error message: ${error})`;
    }
    logInfo`You can find info to help install ImageMagick on Linux, Windows, or macOS`;
    logInfo`from its official website: ${`https://imagemagick.org/script/download.php`}`;
    logInfo`If you have trouble working ImageMagick and would like some help, feel free`;
    logInfo`to drop a message in the HSMusic Discord server! ${'https://hsmusic.wiki/discord/'}`;
    return {success: false};
  } else {
    logInfo`Found ImageMagick binary:  ${convertInfo}`;
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

  const imagePaths = await traverseSourceImagePaths(mediaPath, {target: 'generate'});

  const imageToMD5Entries =
    await progressPromiseAll(
      `Generating MD5s of image files`,
      queue(
        imagePaths.map(imagePath => () =>
          readFileMD5(path.join(mediaPath, imagePath))
            .then(
              md5 => [imagePath, md5],
              error => [imagePath, {error}])),
        queueSize));

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
      return {success: false};
    } else {
      quietInfo`All image files successfully read.`;
    }
  }

  const imageToDimensionsEntries =
    await progressPromiseAll(
      `Identifying dimensions of image files`,
      queue(
        imagePaths.map(imagePath => () =>
          identifyImageDimensions(path.join(mediaPath, imagePath))
            .then(
              dimensions => [imagePath, dimensions],
              error => [imagePath, {error}])),
        queueSize));

  {
    let error = false;
    for (const entry of imageToDimensionsEntries) {
      if (entry[1].error) {
        logError`Failed to identify dimensions ${entry[0]}: ${entry[1].error}`;
        error = true;
      }
    }
    if (error) {
      logError`Failed to identify dimensions of at least one image file!`;
      logError`This implies a thumbnail probably won't be generatable.`;
      logError`So, exiting early.`;
      return {success: false};
    } else {
      quietInfo`All image files successfully had dimensions identified.`;
    }
  }

  const imageToDimensions = Object.fromEntries(imageToDimensionsEntries);

  // Technically we could pro8a8ly mut8te the cache varia8le in-place?
  // 8ut that seems kinda iffy.
  const updatedCache = Object.assign({}, cache);

  const entriesToGenerate = imageToMD5Entries.filter(
    ([filePath, md5]) => md5 !== cache[filePath]?.[0]);

  if (empty(entriesToGenerate)) {
    logInfo`All image thumbnails are already up-to-date - nice!`;
    return {success: true, cache};
  }

  logInfo`Generating thumbnails for ${entriesToGenerate.length} media files.`;
  if (entriesToGenerate.length > 250) {
    logInfo`Go get a latte - this could take a while!`;
  }

  const failed = [];

  const writeMessageFn = () =>
    `Writing image thumbnails. [failed: ${failed.length}]`;

  const generateCalls =
    entriesToGenerate.flatMap(([filePath, md5]) =>
      generateImageThumbnails({
        filePath: path.join(mediaPath, filePath),
        dimensions: imageToDimensions[filePath],
        spawnConvert,
      }).map(call => async () => {
        try {
          await call();
        } catch (error) {
          failed.push([filePath, error]);
        }
      }));

  await progressPromiseAll(writeMessageFn,
    queue(generateCalls, magickThreads));

  // Sort by file path.
  failed.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);

  const failedFilePaths = new Set(failed.map(([filePath]) => filePath));

  for (const [filePath, md5] of entriesToGenerate) {
    if (failedFilePaths.has(filePath)) continue;
    updatedCache[filePath] = [md5, ...imageToDimensions[filePath]];
  }

  if (empty(failed)) {
    logInfo`Generated all (updated) thumbnails successfully!`;
  } else {
    for (const [path, error] of failed) {
      logError`Thumbnail failed to generate for ${path} - ${error}`;
    }
    logWarn`Result is incomplete - the above thumbnails should be checked for errors.`;
    logWarn`Successfully generated images won't be regenerated next run, though!`;
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

  return {success: true, cache: updatedCache};
}

export function getExpectedImagePaths(mediaPath, {urls, wikiData}) {
  const fromRoot = urls.from('media.root');

  return [
    wikiData.albumData
      .flatMap(album => [
        album.hasCoverArt && fromRoot.to('media.albumCover', album.directory, album.coverArtFileExtension),
        !empty(CacheableObject.getUpdateValue(album, 'bannerArtistContribs')) && fromRoot.to('media.albumBanner', album.directory, album.bannerFileExtension),
        !empty(CacheableObject.getUpdateValue(album, 'wallpaperArtistContribs')) && fromRoot.to('media.albumWallpaper', album.directory, album.wallpaperFileExtension),
      ])
      .filter(Boolean),

    wikiData.trackData
      .filter(track => track.hasUniqueCoverArt)
      .map(track => fromRoot.to('media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension)),

    wikiData.artistData
      .filter(artist => artist.hasAvatar)
      .map(artist => fromRoot.to('media.artistAvatar', artist.directory, artist.avatarFileExtension)),

    wikiData.flashData
      .map(flash => fromRoot.to('media.flashArt', flash.directory, flash.coverArtFileExtension)),
  ].flat();
}

export function checkMissingMisplacedMediaFiles(expectedImagePaths, extantImagePaths) {
  expectedImagePaths = expectedImagePaths.map(path => path.toLowerCase());
  extantImagePaths = extantImagePaths.map(path => path.toLowerCase());

  return {
    missing:
      expectedImagePaths
        .filter(f => !extantImagePaths.includes(f)),

    misplaced:
      extantImagePaths
        .filter(f =>
          // todo: This is a hack to match only certain directories - the ones
          // which expectedImagePaths will detect. The rest of the code here is
          // urls-agnostic (meaning you could swap out a different URL spec and
          // it would still work), but this part is hard-coded.
          f.includes('album-art/') ||
          f.includes('artist-avatar/') ||
          f.includes('flash-art/'))
        .filter(f => !expectedImagePaths.includes(f)),
  };
}

export async function verifyImagePaths(mediaPath, {urls, wikiData}) {
  const expectedPaths = getExpectedImagePaths(mediaPath, {urls, wikiData});
  const extantPaths = await traverseSourceImagePaths(mediaPath, {target: 'verify'});
  const {missing, misplaced} = checkMissingMisplacedMediaFiles(expectedPaths, extantPaths);

  if (empty(missing) && empty(misplaced)) {
    logInfo`All image paths are good - nice! None are missing or misplaced.`;
    return;
  }

  if (!empty(missing)) {
    logWarn`** Some image files are missing! (${missing.length + ' files'}) **`;
    for (const file of missing) {
      console.warn(colors.yellow(` - `) + file);
    }
  }

  if (!empty(misplaced)) {
    logWarn`** Some image files are misplaced! (${misplaced.length + ' files'}) **`;
    for (const file of misplaced) {
      console.warn(colors.yellow(` - `) + file);
    }
  }
}

// Recursively traverses the provided (extant) media path, filtering so only
// "source" images are returned - no thumbnails and no non-images. Provide
// target as 'generate' or 'verify' to indicate the desired use of the results.
//
// Under 'verify':
//
// * All source files are returned, so that their existence can be verified
//   against a list of expected source files.
//
// * Source files are returned in "wiki" path style, AKA with POSIX-style
//   forward slashes, regardless the system being run on.
//
// Under 'generate':
//
// * All files which shouldn't actually have thumbnails generated are excluded.
//
// * Source files are returned in device-style, with backslashes on Windows.
//   These are suitable to be passed as command-line arguments to ImageMagick.
//
// Both modes return paths relative to mediaPath, with no ./ or .\ at the
// front.
//
export async function traverseSourceImagePaths(mediaPath, {target}) {
  if (target !== 'verify' && target !== 'generate') {
    throw new Error(`Expected target to be 'verify' or 'generate', got ${target}`);
  }

  return await traverse(mediaPath, {
    pathStyle: (target === 'verify' ? 'posix' : 'device'),
    prefixPath: '',

    filterFile(name) {
      const ext = path.extname(name);

      if (!['.jpg', '.png', '.gif'].includes(ext)) {
        return false;
      }

      if (target === 'generate' && ext === '.gif') {
        return false;
      }

      if (isThumb(name)) {
        return false;
      }

      return true;
    },

    filterDir(name) {
      if (name === '.git') {
        return false;
      }

      return true;
    },
  });
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
