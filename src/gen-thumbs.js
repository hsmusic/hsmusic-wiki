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

// Thumbnail spec details:
//
// * `currentSpecbust` is the current version of the thumbnail specification
//   format, which will be written to new or updated cache entries;
//   it represents just the overall format for reading and writing macro
//   details, not individual thumbnail spec versions.
//
// For each spec entry:
//
// * `tackbust` is the current version of this thumbtack's specification.
//   If a cache entry's tackbust for this thumbtack is less than this value,
//   this particular thumbtack will be regenerated, but any others (whose
//   `tackbust` listed below is equal or below the cache-recorded bust) will be
//   reused. (Zero is a special value that means this tack's spec is still the
//   same as it would've been generated prior to thumbtack versioning; any new
//   kinds of thumbnails should start counting up from one.)
//
// * `size` is the maximum length of the image. It will be scaled down,
//   keeping aspect ratio, to fit in this dimension.
//
// * `quality` represents how much to trade a lower file size for better JPEG
//   image quality. Maximum is 100, but very high values tend to yield
//   diminishing returns.
//
const currentSpecbust = 2;
const thumbnailSpec = {
  'huge': {
    tackbust: 0,
    size: 1600,
    quality: 90,
  },

  'semihuge': {
    tackbust: 0,
    size: 1200,
    quality: 92,
  },

  'large': {
    tackbust: 0,
    size: 800,
    quality: 93,
  },

  'medium': {
    tackbust: 0,
    size: 400,
    quality: 95,
  },

  'small': {
    tackbust: 0,
    size: 250,
    quality: 85,
  },

  'adorb': {
    tackbust: 1,
    size: 64,
    quality: 90,
  },

  'mini': {
    tackbust: 2,
    size: 8,
    quality: 95,
  },
};

import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import * as path from 'node:path';

import {
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';

import dimensionsOf from 'image-size';

import CacheableObject from '#cacheable-object';
import {commandExists, isMain, promisifyProcess, traverse} from '#node-utils';
import {sortByName} from '#sort';

import {
  colors,
  fileIssue,
  logError,
  logInfo,
  logWarn,
  logicalPathTo,
  parseOptions,
  progressPromiseAll,
} from '#cli';

import {
  delay,
  empty,
  chunkMultipleArrays,
  filterMultipleArrays,
  queue,
  stitchArrays,
  unique,
} from '#sugar';

export const defaultMagickThreads = 8;

function getSpecbustForCacheEntry(entry) {
  const nope = () => {
    logWarn`Couldn't determine a spec version for:`;
    console.error(entry);
    return null;
  };

  if (!entry) {
    return null;
  }

  if (Array.isArray(entry)) {
    if (entry.length === 3) {
      return 0;
    } else if (entry.length > 3) {
      return entry[0];
    } else {
      return nope();
    }
  } else if (typeof entry === 'object') {
    if (entry.specbust) {
      return entry.specbust;
    } else {
      return nope();
    }
  } else {
    return nope();
  }
}

export function thumbnailCacheEntryToDetails(entry) {
  // Empty entries get no details.
  if (!entry) {
    return null;
  }

  // First attempt to identify a specification version (aka "bust") for this
  // entry. It'll be used to actually parse the contents.

  const bust = getSpecbustForCacheEntry(entry);
  if (bust === null) {
    return null;
  }

  // Now extract details, reading based on the spec version.

  const details = {
    bust,
    md5: null,
    width: null,
    height: null,
    mtime: null,
    tackbust: {},
  };

  if (bust === 0) {
    ([details.md5,
      details.width,
      details.height] =
      entry);
  }

  if (bust === 1) {
    ([details.md5,
      details.width,
      details.height,
      details.mtime] =
      entry.slice(1))
  }

  if (bust >= 2 && bust <= Infinity) {
    ({tackbust: details.tackbust,
      md5: details.md5,
      width: details.width,
      height: details.height,
      mtime: details.mtime} = entry);
  }

  return details;
}

function detailsToThumbnailCacheEntry({
  specbust,
  tackbust,
  md5,
  width,
  height,
  mtime,
}) {
  // It's not necessarily impossible to write an earlier version of the cache
  // entry format, but doing so would be a lie - an entry's bust should always
  // identify the version of the spec it was generated with, so that other code
  // can make assumptions about not only the format of the entry, but also the
  // content of the generated thumbnail.
  if (specbust !== currentSpecbust) {
    throw new Error(`Writing a different specbust than current is unsupported`);
  }

  return {
    specbust,
    tackbust,
    md5,
    width,
    height,
    mtime,
  };
}

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

function stringifyCache(cache) {
  if (Object.keys(cache).length === 0) {
    return `{}`;
  }

  const entries = Object.entries(cache);
  sortByName(entries, {getName: entry => entry[0]});

  return [
    `{`,
    entries
      .map(([key, value]) => [JSON.stringify(key), JSON.stringify(value)])
      .map(([key, value]) => `${key}: ${value}`)
      .map((line, index, array) =>
        (index < array.length - 1
          ? `${line},`
          : line))
      .map(line => `  ${line}`),
    `}`,
  ].flat().join('\n');
}

getThumbnailsAvailableForDimensions.all =
  Object.entries(thumbnailSpec)
    .map(([name, {size}]) => [name, size])
    .sort((a, b) => b[1] - a[1]);

function getCacheEntryForMediaPath(mediaPath, cache) {
  // Gets the cache entry for the provided image path, which should always be
  // a forward-slashes path (i.e. suitable for display online). Since the cache
  // file may have forward or back-slashes, this checks both.

  const entryFromMediaPath = cache[mediaPath];
  if (entryFromMediaPath) return entryFromMediaPath;

  const winPath = mediaPath.split(path.posix.sep).join(path.win32.sep);
  const entryFromWinPath = cache[winPath];
  if (entryFromWinPath) return entryFromWinPath;

  return null;
}

export function checkIfImagePathHasCachedThumbnails(mediaPath, cache) {
  // Generic utility for checking if the thumbnail cache includes any info for
  // the provided image path, so that the other functions don't hard-code the
  // cache format.

  return !!getCacheEntryForMediaPath(mediaPath, cache);
}

export function getDimensionsOfImagePath(mediaPath, cache) {
  // This function is really generic. It takes the gen-thumbs image cache and
  // returns the dimensions in that cache, so that other functions don't need
  // to hard-code the cache format.

  const cacheEntry = getCacheEntryForMediaPath(mediaPath, cache);

  if (!cacheEntry) {
    throw new Error(`Expected mediaPath to be included in cache, got ${mediaPath}`);
  }

  const details = thumbnailCacheEntryToDetails(cacheEntry);

  if (!details) {
    throw new Error(`Couldn't determine any details for this image (${mediaPath})`);
  }

  const {width, height} = details;

  if (typeof width !== 'number' && typeof height !== 'number') {
    throw new Error(`Details for this image don't appear to contain dimensions (${mediaPath})`);
  }

  return [width, height];
}

export function getThumbnailEqualOrSmaller(preferred, mediaPath, cache) {
  // This function is totally exclusive to page generation. It's a shorthand
  // for accessing dimensions from the thumbnail cache, calculating all the
  // thumbnails available, and selecting the one which is equal to or smaller
  // than the provided size. Since the path provided might not be the actual
  // one which is being thumbnail-ified, this just returns the name of the
  // selected thumbnail size.

  if (!getCacheEntryForMediaPath(mediaPath, cache)) {
    throw new Error(`Expected mediaPath to be included in cache, got ${mediaPath}`);
  }

  const {size: preferredSize} = thumbnailSpec[preferred];
  const [width, height] = getDimensionsOfImagePath(mediaPath, cache);
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

  try {
    await promisifyProcess(proc, false);
  } catch (error) {
    return null;
  }

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
    version = await getImageMagickVersion('magick');
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

// TODO: This function may read MD5, mtime (stats), and image dimensions, and
// all of those values are needed for writing a cache entry. Reusing them from
// the cache if they *weren't* checked is fine, but if they were checked, we
// don't have any way to extract the results of the check - and reuse them for
// writing the cache. This function probably needs a bit of a restructure to
// avoid duplicating that work.
async function determineThumbtacksNeededForFile({
  filePath,
  mediaPath,
  cache,

  reuseMismatchedMD5 = false,
  reuseFutureBust = false,
  reusePastBust = false,
}) {
  const allRightSize = async () => {
    const dimensions = await identifyImageDimensions(filePath);
    const sizes = getThumbnailsAvailableForDimensions(dimensions);
    return sizes.map(([thumbtack]) => thumbtack);
  };

  const cacheEntry = getCacheEntryForMediaPath(mediaPath, cache);
  const cacheDetails = thumbnailCacheEntryToDetails(cacheEntry);

  if (!cacheDetails) {
    return await allRightSize();
  }

  if (!reuseMismatchedMD5) checkMD5: {
    // Reading MD5 is expensive because it means reading all the file contents.
    // Skip out if the file's date modified matches what's recorded on the
    // cache.
    const results = await stat(filePath);
    if (+results.mtime === cacheDetails.mtime) {
      break checkMD5;
    }

    const md5 = await readFileMD5(filePath);
    if (md5 !== cacheDetails.md5) {
      return await allRightSize();
    }
  }

  const mismatchedBusts =
    Object.entries(thumbnailSpec)
      .filter(([thumbtack, specEntry]) =>
        (!reusePastBust && (cacheDetails.tackbust[thumbtack] ?? 0) < specEntry.tackbust) ||
        (!reuseFutureBust && (cacheDetails.tackbust[thumbtack] ?? 0) > specEntry.tackbust))
      .map(([thumbtack]) => thumbtack);

  if (empty(mismatchedBusts)) {
    return [];
  }

  const rightSize = new Set(await allRightSize());
  const mismatchedWithinRightSize =
    mismatchedBusts.filter(size => rightSize.has(size));

  return mismatchedWithinRightSize;
}

async function generateImageThumbnail(imagePath, thumbtack, {
  mediaPath,
  mediaCachePath,
  spawnConvert,
}) {
  const filePathInMedia =
    path.join(mediaPath, imagePath);

  const dirnameInCache =
    path.join(mediaCachePath, path.dirname(imagePath));

  const filename =
    path.basename(imagePath, path.extname(imagePath)) +
    `.${thumbtack}.jpg`;

  const filePathInCache =
    path.join(dirnameInCache, filename);

  await mkdir(dirnameInCache, {recursive: true});

  const specEntry = thumbnailSpec[thumbtack];
  const {size, quality} = specEntry;

  const convertProcess = spawnConvert([
    filePathInMedia,
    '-strip',
    '-resize',
    `${size}x${size}>`,
    '-interlace',
    'Plane',
    '-quality',
    `${quality}%`,
    filePathInCache,
  ]);

  await promisifyProcess(convertProcess, false);
}

export async function determineMediaCachePath({
  mediaPath,
  wikiCachePath,
  providedMediaCachePath,

  disallowDoubling = false,
  regenerateMissingThumbnailCache = false,
}) {
  if (!mediaPath) {
    return {
      annotation: 'media path not provided',
      mediaCachePath: null,
    };
  }

  if (providedMediaCachePath) {
    return {
      annotation: 'custom path provided',
      mediaCachePath: providedMediaCachePath,
    };
  }

  if (!wikiCachePath) {
    return {
      annotation: 'wiki cache path not provided',
      mediaCachePath: null,
    };
  }

  let mediaIncludesThumbnailCache;

  try {
    const files = await readdir(mediaPath);
    mediaIncludesThumbnailCache = files.includes(CACHE_FILE);
  } catch (error) {
    mediaIncludesThumbnailCache = false;
  }

  if (mediaIncludesThumbnailCache === true && !disallowDoubling) {
    return {
      annotation: 'media path doubles as cache',
      mediaCachePath: mediaPath,
    };
  }

  // Two inferred paths are possible - "adjacent" and "contained".
  // "Contained" is the preferred format and we'll create it if
  // neither of the inferred paths exists. (Of course, by this
  // point we've already determined that the media path itself
  // isn't doubling as the thumbnail cache.)

  const containedInferredPath =
    (wikiCachePath
      ? path.join(wikiCachePath, 'media-cache')
      : null);

  const adjacentInferredPath =
    path.join(
      path.dirname(mediaPath),
      path.basename(mediaPath) + '-cache');

  let containedIncludesThumbnailCache;
  let adjacentIncludesThumbnailCache;

  try {
    const files = await readdir(containedInferredPath);
    containedIncludesThumbnailCache = files.includes(CACHE_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      containedIncludesThumbnailCache = null;
    } else {
      containedIncludesThumbnailCache = undefined;
    }
  }

  try {
    const files = await readdir(adjacentInferredPath);
    adjacentIncludesThumbnailCache = files.includes(CACHE_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      adjacentIncludesThumbnailCache = null;
    } else {
      adjacentIncludesThumbnailCache = undefined;
    }
  }

  // Go ahead with the contained path if it exists and contains a cache -
  // no other conditions matter.
  if (containedIncludesThumbnailCache === true) {
    return {
      annotation: `contained path has cache`,
      mediaCachePath: containedInferredPath,
    };
  }

  // Reuse an existing adjacent cache before figuring out what to do
  // if there's no extant cache at all.
  if (adjacentIncludesThumbnailCache === true) {
    return {
      annotation: `adjacent path has cache`,
      mediaCachePath: adjacentInferredPath,
    };
  }

  // Throw a very high-priority tantrum if the contained cache exists but
  // isn't readable. It's the preferred cache and we can't tell if it's
  // available for use or not!
  if (containedIncludesThumbnailCache === undefined) {
    return {
      annotation: `contained path not readable`,
      mediaCachePath: null,
    };
  }

  // Throw a secondary tantrum if the adjacent cache exists but
  // isn't readable. This is just as big of a problem, but if for
  // some reason both the contained and adjacent caches exist,
  // the contained one is the one we'd rather have addressed.
  if (adjacentIncludesThumbnailCache === undefined) {
    return {
      annotation: `adjacent path not readable`,
      mediaCachePath: null,
    };
  }

  // Throw a high-priority tantrum if the contained cache exists but is
  // missing its cache file, again because it's the more preferred cache.
  // Unless we're indicated to regenerate such a missing cache file!
  if (containedIncludesThumbnailCache === false) {
    if (regenerateMissingThumbnailCache) {
      return {
        annotation: `contained path will regenerate missing cache`,
        mediaCachePath: containedInferredPath,
      };
    } else {
      return {
        annotation: `contained path does not have cache`,
        mediaCachePath: null,
      };
    }
  }

  // Throw a secondary tantrum if the adjacent cache exists but is
  // missing its cache file, because it's the less preferred cache.
  // Unless we're indicated to regenerate a missing cache file!
  if (adjacentIncludesThumbnailCache === false) {
    if (regenerateMissingThumbnailCache) {
      return {
        annotation: `adjacent path will regenerate missing cache`,
        mediaCachePath: adjacentInferredPath,
      };
    } else {
      return {
        annotation: `adjacent path does not have cache`,
        mediaCachePath: null,
      };
    }
  }

  // If we haven't found any information about either inferred
  // location (and so have fallen back to this base case), we'll
  // create the contained cache during this run.
  return {
    annotation: `contained path will be created`,
    mediaCachePath: containedInferredPath,
  };
}

export async function migrateThumbsIntoDedicatedCacheDirectory({
  mediaPath,
  mediaCachePath,

  queueSize = 0,
}) {
  if (!mediaPath) {
    throw new Error('Expected mediaPath');
  }

  if (!mediaCachePath) {
    throw new Error(`Expected mediaCachePath`);
  }

  logInfo`Migrating thumbnail files into dedicated directory.`;
  logInfo`Moving thumbs from: ${mediaPath}`;
  logInfo`Moving thumbs into: ${mediaCachePath}`;

  const thumbFiles = await traverse(mediaPath, {
    pathStyle: 'device',
    filterFile: file => isThumb(file),
    filterDir: name => name !== '.git',
  });

  if (thumbFiles.length) {
    // Double-check files.
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

    logInfo`Moving ${thumbFiles.length} thumbs.`;

    await mkdir(mediaCachePath, {recursive: true});

    const errored = [];

    await progressPromiseAll(`Moving thumbnail files`, queue(
      thumbFiles.map(file => async () => {
        try {
          const filePathInMedia = file;
          const filePath = path.relative(mediaPath, filePathInMedia);
          const filePathInCache = path.join(mediaCachePath, filePath);
          await mkdir(path.dirname(filePathInCache), {recursive: true});
          await rename(filePathInMedia, filePathInCache);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            errored.push(file);
          }
        }
      }),
      queueSize));

    if (errored.length) {
      logError`Couldn't move these paths (${errored.length}):`;
      for (const file of errored) {
        console.error(file);
      }
      logError`It's possible there were permission errors. After you've`;
      logError`investigated, running again should work to move these.`;
      return {success: false};
    } else {
      logInfo`Successfully moved all ${thumbFiles.length} thumbnail files!`;
    }
  } else {
    logInfo`Didn't find any thumbnails to move.`;
  }

  let cacheExists = false;
  try {
    await stat(path.join(mediaPath, CACHE_FILE));
    cacheExists = true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logInfo`No cache file present here. (${CACHE_FILE})`;
    } else {
      logWarn`Failed to access cache file. Check its permissions?`;
    }
  }

  if (cacheExists) {
    try {
      await rename(
        path.join(mediaPath, CACHE_FILE),
        path.join(mediaCachePath, CACHE_FILE));
      logInfo`Moved thumbnail cache file.`;
    } catch (error) {
      logWarn`Failed to move cache file. (${CACHE_FILE})`;
      logWarn`Check its permissions, or try copying/pasting.`;
    }
  }

  return {success: true};
}

// Fill in missing details (usually on older entries) that don't actually
// require generating any thumbnails to determine. This makes sure all
// entries are using the latest specbust, too.
export async function refreshThumbnailCache(cache, {mediaPath, queueSize}) {
  if (Object.keys(cache).length === 0) {
    return;
  }

  await progressPromiseAll(`Refreshing existing entries on thumbnail cache`,
    queue(
      Object.entries(cache)
        .map(([imagePath, cacheEntry]) => async () => {
          const details = thumbnailCacheEntryToDetails(cacheEntry);

          // Couldn't parse this entry, it won't be used later on.
          // But leave it around just in case some other version of hsmusic
          // can get use out of it.
          if (!details) {
            return;
          }

          const {tackbust, width, height} = details;

          let {md5, mtime} = details;
          let updatedAnything = false;

          try {
            const filePathInMedia = path.join(mediaPath, imagePath);

            if (md5 === null) {
              md5 = await readFileMD5(filePathInMedia);
              updatedAnything = true;
            }

            if (mtime === null) {
              const statResults = await stat(filePathInMedia);
              mtime = +statResults.mtime;
              updatedAnything = true;
            }
          } catch (error) {
            if (error.code === 'ENOENT') {
              if (md5 === null) {
                md5 = "-";
                updatedAnything = true;
              }

              if (mtime === null) {
                mtime = 0;
                updatedAnything = true;
              }
            } else {
              throw error;
            }
          }

          if (!updatedAnything) {
            return;
          }

          cache[imagePath] = detailsToThumbnailCacheEntry({
            specbust: currentSpecbust,
            tackbust,
            width,
            height,
            md5,
            mtime,
          });
        }),
      queueSize));
}

export default async function genThumbs({
  mediaPath,
  mediaCachePath,

  queueSize = 0,
  magickThreads = defaultMagickThreads,
  quiet = false,
}) {
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

  let cache = {};
  let firstRun = false;

  try {
    cache = JSON.parse(await readFile(path.join(mediaCachePath, CACHE_FILE)));
    quietInfo`Cache file successfully read.`;
  } catch (error) {
    if (error.code === 'ENOENT') {
      firstRun = true;
    } else {
      logWarn`Malformed or unreadable cache file: ${error}`;
      logWarn`You may want to cancel and investigate this!`;
      logWarn`All-new thumbnails and cache will be generated for this run.`;
      await delay(WARNING_DELAY_TIME);
    }
  }

  await refreshThumbnailCache(cache, {mediaPath, queueSize});

  try {
    await mkdir(mediaCachePath, {recursive: true});
  } catch (error) {
    logError`Couldn't create the media cache directory: ${error.code}`;
    logError`That's where the media files are going to go, so you'll`;
    logError`have to investigate this - it's likely a permissions error.`;
    return {success: false};
  }

  try {
    await writeFile(
      path.join(mediaCachePath, CACHE_FILE),
      stringifyCache(cache));
    quietInfo`Writing to cache file appears to be working.`;
  } catch (error) {
    logWarn`Test of cache file writing failed: ${error}`;
    if (cache) {
      logWarn`Cache read succeeded: Any newly written thumbs will be unnecessarily regenerated on the next run.`;
    } else if (firstRun) {
      logWarn`No cache found: All thumbs will be generated now, and will be unnecessarily regenerated next run.`;
      logWarn`You may also have to provide ${'--media-cache-path'} ${mediaCachePath} next run.`;
    } else {
      logWarn`Cache read failed: All thumbs will be regenerated now, and will be unnecessarily regenerated again next run.`;
    }
    logWarn`You may want to cancel and investigate this!`;
    await delay(WARNING_DELAY_TIME);
  }

  if (firstRun) {
    cache = {};
  }

  const imagePaths = await traverseSourceImagePaths(mediaPath, {target: 'generate'});

  const imageThumbtacksNeeded =
    await progressPromiseAll(`Determining thumbtacks needed`,
      queue(
        imagePaths.map(imagePath => () =>
          determineThumbtacksNeededForFile({
            filePath: path.join(mediaPath, imagePath),
            mediaPath: imagePath,
            cache,
          }).catch(error => ({error}))),
        queueSize));

  {
    const erroredPaths = imagePaths.slice();
    const errors = imageThumbtacksNeeded.map(({error}) => error);
    filterMultipleArrays(erroredPaths, errors, (_imagePath, error) => error);

    for (const {imagePath, error} of stitchArrays({imagePath: erroredPaths, error: errors})) {
      logError`Failed to identify thumbs needed for ${imagePath}: ${error}`;
    }

    if (!empty(errors)) {
      logError`Failed to determine needed thumbnails for least one image file!`;
      logError`This indicates a thumbnail probably wouldn't be generated.`;
      logError`So, exiting early.`;
      return {success: false};
    } else {
      quietInfo`All image files successfully read.`;
    }
  }

  // We aren't going to need the original value of `imagePaths` again, so it's
  // fine to filter it here.
  filterMultipleArrays(
    imagePaths,
    imageThumbtacksNeeded,
    (_imagePath, needed) => !empty(needed));

  if (empty(imagePaths)) {
    logInfo`All image thumbnails are already up-to-date - nice!`;
    return {success: true, cache};
  }

  const imageDimensions =
    await progressPromiseAll(`Identifying dimensions of image files`,
      queue(
        imagePaths.map(imagePath => () =>
          identifyImageDimensions(path.join(mediaPath, imagePath))
            .catch(error => ({error}))),
        queueSize));

  {
    const erroredPaths = imagePaths.slice();
    const errors = imageDimensions.map(result => result.error);
    filterMultipleArrays(erroredPaths, errors, (_imagePath, error) => error);

    for (const {imagePath, error} of stitchArrays({imagePath: erroredPaths, error: errors})) {
      logError`Failed to identify dimensions for ${imagePath}: ${error}`;
    }

    if (!empty(errors)) {
      logError`Failed to identify dimensions for at least one image file!`;
      logError`This indicates a thumbnail probably wouldn't be generated.`;
      logError`So, exiting early.`;
      return {success: false};
    } else {
      quietInfo`All image files successfully had dimensions identified.`;
    }
  }

  let numFailed = 0;
  const writeMessageFn = () =>
    `Writing image thumbnails. [failed: ${numFailed}]`;

  const generateCallImageIndices =
    imageThumbtacksNeeded
      .flatMap(({length}, index) =>
        Array.from({length}, () => index));

  const generateCallImagePaths =
    generateCallImageIndices
      .map(index => imagePaths[index]);

  const generateCallThumbtacks =
    imageThumbtacksNeeded.flat();

  const generateCallFns =
    stitchArrays({
      imagePath: generateCallImagePaths,
      thumbtack: generateCallThumbtacks,
    }).map(({imagePath, thumbtack}) => () =>
        generateImageThumbnail(imagePath, thumbtack, {
          mediaPath,
          mediaCachePath,
          spawnConvert,
        }).catch(error => {
            numFailed++;
            return ({error});
          }));

  logInfo`Generating ${generateCallFns.length} thumbnails for ${imagePaths.length} media files.`;
  if (generateCallFns.length > 500) {
    logInfo`Go get a latte - this could take a while!`;
  }

  const generateCallResults =
    await progressPromiseAll(writeMessageFn,
      queue(generateCallFns, magickThreads));

  let successfulIndices;

  {
    const erroredIndices = generateCallImageIndices.slice();
    const erroredPaths = generateCallImagePaths.slice();
    const erroredThumbtacks = generateCallThumbtacks.slice();
    const errors = generateCallResults.map(result => result?.error);

    const {removed} =
      filterMultipleArrays(
        erroredIndices,
        erroredPaths,
        erroredThumbtacks,
        errors,
        (_index, _imagePath, _thumbtack, error) => error);

    successfulIndices = new Set(removed[0]);

    const chunks =
      chunkMultipleArrays(erroredPaths, erroredThumbtacks, errors,
        (imagePath, lastImagePath) => imagePath !== lastImagePath);

    // TODO: This should obviously be an aggregate error.
    // ...Just like every other error report here, and those dang aggregates
    // should be constructable from within the queue, rather than after.
    for (const [[imagePath], thumbtacks, errors] of chunks) {
      logError`Failed to generate thumbnails for ${imagePath}:`;
      for (const {thumbtack, error} of stitchArrays({thumbtack: thumbtacks, error: errors})) {
        logError`- ${thumbtack}: ${error}`;
      }
    }

    if (empty(errors)) {
      logInfo`All needed thumbnails generated successfully - nice!`;
    } else {
      logWarn`Result is incomplete - the above thumbnails should be checked for errors.`;
      logWarn`Successfully generated images won't be regenerated next run, though!`;
    }
  }

  filterMultipleArrays(
    imagePaths,
    imageThumbtacksNeeded,
    imageDimensions,
    (_imagePath, _thumbtacksNeeded, _dimensions, index) =>
      successfulIndices.has(index));

  for (const {
    imagePath,
    thumbtacksNeeded,
    dimensions,
  } of stitchArrays({
    imagePath: imagePaths,
    thumbtacksNeeded: imageThumbtacksNeeded,
    dimensions: imageDimensions,
  })) {
    const cacheEntry = cache[imagePath];
    const cacheDetails = thumbnailCacheEntryToDetails(cacheEntry);

    const updatedTackbust =
      (cacheDetails
        ? {...cacheDetails.tackbust}
        : {});

    for (const thumbtack of thumbtacksNeeded) {
      updatedTackbust[thumbtack] = thumbnailSpec[thumbtack].tackbust;
    }

    // We could reuse md5 and mtime values from the preivous cache entry, if
    // extant, but we can't identify the *reason* for why those thumbtacks
    // were generated, so it's possible these values were at fault. No getting
    // around computing them again here, at the moment.

    const filePathInMedia = path.join(mediaPath, imagePath);
    const md5 = await readFileMD5(filePathInMedia);

    const statResults = await stat(filePathInMedia);
    const mtime = +statResults.mtime;

    cache[imagePath] = detailsToThumbnailCacheEntry({
      specbust: currentSpecbust,
      tackbust: updatedTackbust,
      width: dimensions[0],
      height: dimensions[1],
      md5,
      mtime,
    });
  }

  try {
    await writeFile(
      path.join(mediaCachePath, CACHE_FILE),
      stringifyCache(cache));
    quietInfo`Updated cache file successfully written!`;
  } catch (error) {
    logWarn`Failed to write updated cache file: ${error}`;
    logWarn`Any newly (re)generated thumbnails will be regenerated next run.`;
    logWarn`Sorry about that!`;
  }

  return {success: true, cache};
}

export function getExpectedImagePaths(mediaPath, {urls, wikiData}) {
  const fromRoot = urls.from('media.root');

  const paths = [
    wikiData.albumData
      .flatMap(album => [
        album.hasCoverArt && fromRoot.to('media.albumCover', album.directory, album.coverArtFileExtension),
        !empty(CacheableObject.getUpdateValue(album, 'bannerArtistContribs')) && fromRoot.to('media.albumBanner', album.directory, album.bannerFileExtension),
        !empty(CacheableObject.getUpdateValue(album, 'wallpaperArtistContribs')) && fromRoot.to('media.albumWallpaper', album.directory, album.wallpaperFileExtension),
      ])
      .filter(Boolean),

    wikiData.artistData
      .filter(artist => artist.hasAvatar)
      .map(artist => fromRoot.to('media.artistAvatar', artist.directory, artist.avatarFileExtension)),

    wikiData.flashData
      .map(flash => fromRoot.to('media.flashArt', flash.directory, flash.coverArtFileExtension)),

    wikiData.trackData
      .filter(track => track.hasUniqueCoverArt)
      .map(track => fromRoot.to('media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension)),
  ].flat();

  sortByName(paths, {getName: path => path});

  return paths;
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

  const {missing: missingPaths, misplaced: misplacedPaths} =
    checkMissingMisplacedMediaFiles(expectedPaths, extantPaths);

  if (empty(missingPaths) && empty(misplacedPaths)) {
    logInfo`All image paths are good - nice! None are missing or misplaced.`;
    return {missing: [], misplaced: []};
  }

  const relativeMediaPath = await logicalPathTo(mediaPath);

  const dirnamesOfExpectedPaths =
    unique(expectedPaths.map(file => path.dirname(file)));

  const dirnamesOfExtantPaths =
    unique(extantPaths.map(file => path.dirname(file)));

  const dirnamesOfMisplacedPaths =
    unique(misplacedPaths.map(file => path.dirname(file)));

  const completelyMisplacedDirnames =
    dirnamesOfMisplacedPaths
      .filter(dirname => !dirnamesOfExpectedPaths.includes(dirname));

  const completelyMissingDirnames =
    dirnamesOfExpectedPaths
      .filter(dirname => !dirnamesOfExtantPaths.includes(dirname));

  const individuallyMisplacedPaths =
    misplacedPaths
      .filter(file => !completelyMisplacedDirnames.includes(path.dirname(file)));

  const individuallyMissingPaths =
    missingPaths
      .filter(file => !completelyMissingDirnames.includes(path.dirname(file)));

  const wrongExtensionPaths =
    misplacedPaths
      .map(file => {
        const stripExtension = file =>
          path.join(
            path.dirname(file),
            path.basename(file, path.extname(file)));

        const extantExtension = path.extname(file);
        const basename = stripExtension(file);

        const expectedPath =
          missingPaths
            .find(file => stripExtension(file) === basename);

        if (!expectedPath) return null;

        const expectedExtension = path.extname(expectedPath);
        return {basename, extantExtension, expectedExtension};
      })
      .filter(Boolean);

  if (!empty(missingPaths)) {
    if (missingPaths.length === 1) {
      logWarn`${1} expected image file is missing from ${relativeMediaPath}:`;
    } else {
      logWarn`${missingPaths.length} expected image files are missing:`;
    }

    for (const dirname of completelyMissingDirnames) {
      console.log(` - (missing) All files under ${colors.bright(dirname)}`);
    }

    for (const file of individuallyMissingPaths) {
      console.log(` - (missing) ${file}`);
    }
  }

  if (!empty(misplacedPaths)) {
    if (misplacedPaths.length === 1) {
      logWarn`${1} image file, present in ${relativeMediaPath}, wasn't expected:`;
    } else {
      logWarn`${misplacedPaths.length} image files, present in ${relativeMediaPath}, weren't expected:`;
    }

    for (const dirname of completelyMisplacedDirnames) {
      console.log(` - (misplaced) All files under ${colors.bright(dirname)}`);
    }

    for (const file of individuallyMisplacedPaths) {
      console.log(` - (misplaced) ${file}`);
    }
  }

  if (!empty(wrongExtensionPaths)) {
    if (wrongExtensionPaths.length === 1) {
      logWarn`Of these, ${1} has an unexpected file extension:`;
    } else {
      logWarn`Of these, ${wrongExtensionPaths.length} have an unexpected file extension:`;
    }

    for (const {basename, extantExtension, expectedExtension} of wrongExtensionPaths) {
      console.log(` - (expected ${colors.green(expectedExtension)}) ${basename + colors.red(extantExtension)}`);
    }

    logWarn`To handle unexpected file extensions:`;
    logWarn` * Source and ${`replace`} with the correct file, or`;
    logWarn` * Add ${`"Cover Art File Extension"`} field (or similar)`;
    logWarn`   to the respective document in YAML data files.`;
  }

  return {missing: missingPaths, misplaced: misplacedPaths};
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

  const paths = await traverse(mediaPath, {
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

  sortByName(paths, {getName: path => path});

  return paths;
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
