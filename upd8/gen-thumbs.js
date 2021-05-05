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

const { spawn } = require('child_process');
const crypto = require('crypto');
const fsp = require('fs/promises'); // Whatcha know! Nice.
const fs = require('fs'); // Still gotta include 8oth tho, for createReadStream.
const path = require('path');

const {
    delay,
    logError,
    logInfo,
    logWarn,
    parseOptions,
    progressPromiseAll,
    promisifyProcess,
    queue,
} = require('./util');

function traverse(startDirPath, {
    filterFile = () => true,
    filterDir = () => true
} = {}) {
    const recursive = (names, subDirPath) => Promise
        .all(names.map(name => fsp.readdir(path.join(startDirPath, subDirPath, name)).then(
            names => filterDir(name) ? recursive(names, path.join(subDirPath, name)) : [],
            err => filterFile(name) ? [path.join(subDirPath, name)] : [])))
        .then(pathArrays => pathArrays.flatMap(x => x));

    return fsp.readdir(startDirPath)
        .then(names => recursive(names, ''));
}

function readFileMD5(filePath) {
    return new Promise((resolve, reject) => {
        const md5 = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => md5.update(data));
        stream.on('end', data => resolve(md5.digest('hex')));
        stream.on('error', err => reject(err));
    });
}

function generateImageThumbnails(filePath) {
    const dirname = path.dirname(filePath);
    const extname = path.extname(filePath);
    const basename = path.basename(filePath, extname);
    const output = name => path.join(dirname, basename + name + '.jpg');

    const convert = (name, {size, quality}) => spawn('convert', [
        '-strip',
        '-resize', `${size}x${size}>`,
        '-interlace', 'Plane',
        '-quality', `${quality}%`,
        filePath,
        output(name)
    ]);

    return Promise.all([
        promisifyProcess(convert('.medium', {size: 400, quality: 95}), false),
        promisifyProcess(convert('.small', {size: 250, quality: 85}), false)
    ]);

    return new Promise((resolve, reject) => {
        if (Math.random() < 0.2) {
            reject(new Error(`Them's the 8r8ks, kiddo!`));
        } else {
            resolve();
        }
    });
}

async function genThumbs(mediaPath, {
    queueSize = 0,
    quiet = false
} = {}) {
    if (!mediaPath) {
        throw new Error('Expected mediaPath to be passed');
    }

    const quietInfo = (quiet
        ? () => null
        : logInfo);

    const filterFile = name => {
        // TODO: Why is this not working????????
        // thumbnail-cache.json is 8eing passed through, for some reason.

        const ext = path.extname(name);
        if (ext !== '.jpg' && ext !== '.png') return false;

        const rest = path.basename(name, ext);
        if (rest.endsWith('.medium') || rest.endsWith('.small')) return false;

        return true;
    };

    const filterDir = name => {
        if (name === '.git') return false;
        return true;
    };

    let cache, firstRun = false, failedReadingCache = false;
    try {
        cache = JSON.parse(await fsp.readFile(path.join(mediaPath, CACHE_FILE)));
        quietInfo`Cache file successfully read.`;
    } catch (error) {
        cache = {};
        if (error.code === 'ENOENT') {
            firstRun = true;
        } else {
            failedReadingCache = true;
            logWarn`Malformed or unreadable cache file: ${error}`;
            logWarn`You may want to cancel and investigate this!`;
            logWarn`All-new thumbnails and cache will be generated for this run.`;
            await delay(WARNING_DELAY_TIME);
        }
    }

    try {
        await fsp.writeFile(path.join(mediaPath, CACHE_FILE), JSON.stringify(cache));
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

    const imageToMD5Entries = await progressPromiseAll(`Generating MD5s of image files`, queue(
        imagePaths.map(imagePath => () => readFileMD5(path.join(mediaPath, imagePath)).then(
            md5 => [imagePath, md5],
            error => [imagePath, {error}]
        )),
        queueSize
    ));

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

    const entriesToGenerate = imageToMD5Entries
        .filter(([filePath, md5]) => md5 !== cache[filePath]);

    if (entriesToGenerate.length === 0) {
        logInfo`All image thumbnails are already up-to-date - nice!`;
        return true;
    }

    const failed = [];
    const succeeded = [];
    const writeMessageFn = () => `Writing image thumbnails. [failed: ${failed.length}]`;

    // This is actually sort of a lie, 8ecause we aren't doing synchronicity.
    // (We pass queueSize = 1 to queue().) 8ut we still use progressPromiseAll,
    // 'cuz the progress indic8tor is very cool and good.
    await progressPromiseAll(writeMessageFn, queue(entriesToGenerate.map(([filePath, md5]) =>
        () => generateImageThumbnails(path.join(mediaPath, filePath)).then(
            () => {
                updatedCache[filePath] = md5;
                succeeded.push(filePath);
            },
            error => {
                failed.push([filePath, error]);
            }
        )
    )));

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
        await fsp.writeFile(path.join(mediaPath, CACHE_FILE), JSON.stringify(updatedCache));
        quietInfo`Updated cache file successfully written!`;
    } catch (error) {
        logWarn`Failed to write updated cache file: ${error}`;
        logWarn`Any newly (re)generated thumbnails will be regenerated next run.`;
        logWarn`Sorry about that!`;
    }

    return true;
};

module.exports = genThumbs;

if (require.main === module) {
    (async () => {
        const miscOptions = await parseOptions(process.argv.slice(2), {
            'media': {
                type: 'value'
            },

            'queue-size': {
                type: 'value',
                validate(size) {
                    if (parseInt(size) !== parseFloat(size)) return 'an integer';
                    if (parseInt(size) < 0) return 'a counting number or zero';
                    return true;
                }
            },
            queue: {alias: 'queue-size'}
        });

        const mediaPath = miscOptions.media || process.env.HSMUSIC_MEDIA;
        if (!mediaPath) {
            logError`Expected --media option or HSMUSIC_MEDIA to be set`;
        }

        const queueSize = +(miscOptions['queue-size'] ?? 0);

        await genThumbs(mediaPath, {queueSize});
    })().catch(err => console.error(err));
}
