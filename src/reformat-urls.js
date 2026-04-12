// Find-replace calls analogous to isCuratedURL in #validators.
// This can't catch everything, but should automate the greater bulk of it.

import * as path from 'node:path';

import {replaceInFile} from 'replace-in-file';

import {colors, logInfo} from '#cli';
import {escapeRegex, re} from '#sugar';

function or(options) {
  return options.map(escapeRegex).join('|');
}

function https(namespace, domain) {
  return [
    `${namespace}: http:// to https://`,

    re('gmi', [
      '^- http://',
      `(?=(?:` + domain + ')/)',
    ]),

    '- https://',
  ];
}

function trimQueryParameter(namespace, domain, parameter) {
  return [
    `${namespace}: trim ?${parameter} query parameter`,

    re('gmi', [
      '^(',
        '- https://',
        '(?:' + domain + ')',
        '\/.*',
      ')',

      '[&?]' + parameter + '=',
      '[^\n&?]+',
    ]),

    '$1',
  ];
}

function trimTrailingSlash(namespace, domain) {
  return [
    `${namespace}: trim trailing slash`,

    re('gmi', [
      '^(',
        '- https://',
        '(?:' + domain + ')',
        '\/.*',
      ')',

      '/',
      '(?=[#?]|$)',
    ]),

    '$1',
  ];
}


// Rules are evaluated top to bottom, in order,
// so each rule can build off previous ones.
const findreplace = [];

// General

findreplace.push([
  `general: add slash to stand in for empty path`,
  re('gmi', ['^(- [a-z]*://[^\n?#/]+)(?=[?#]|$)']),
  '$1/',
]);

// Apple Music

findreplace.push([
  `apple music: trim country code`,
  /^(- https:\/\/music.apple.com\/)[a-z][a-z]\//gmi,
  '$1',
]);

// SoundCloud

findreplace.push(trimTrailingSlash('soundcloud', 'soundcloud.com'));

// Spotify

findreplace.push(trimQueryParameter('spotify', 'open\.spotify\.com', 'si'));
findreplace.push(trimQueryParameter('spotify', 'open\.spotify\.com', 'nd'));

// Tumblr

findreplace.push([
  `tumblr: tumblr.com -> www.tumblr.com`,
  /^- https:\/\/tumblr\.com\//gmi,
  '- https://www.tumblr.com/',
]);

// Twitter

const twitterDomains =
  or([
    'www.twitter.com',
    'x.com',
  ]);

findreplace.push(https('twitter', twitterDomains));

findreplace.push([
  `twitter: www.twitter.com -> twitter.com`,
  /^- https:\/\/www\.twitter\.com\//gmi,
  '- https://twitter.com/',
]);

findreplace.push([
  `twitter: x.com -> twitter.com`,
  /^- https:\/\/x\.com\//gmi,
  '- https://twitter.com/',
]);

// YouTube

const youtubeDomains =
  or([
    'www.youtube.com',
    'youtube.com',
    'youtu.be',
  ]);

findreplace.push(https('youtube', youtubeDomains));

findreplace.push(trimQueryParameter('youtube', youtubeDomains, 'si'));

findreplace.push([
  `youtube: youtu.be -> www.youtube.com/watch?v=___`,
  /^- https:\/\/youtu\.be\/([a-z0-9_-]{11,11})$/gmi,
  '- https://www.youtube.com/watch?v=$1'
]);

findreplace.push([
  `youtube: youtu.be -> www.youtube.com/watch?v=___&t=___`,
  /^- https:\/\/youtu\.be\/([a-z0-9_-]{11,11})\?t=(\d+)$/gmi,
  '- https://www.youtube.com/watch?v=$1&t=$2',
]);

findreplace.push([
  `youtube: youtube.com -> www.youtube.com`,
  /^- https:\/\/youtube\.com\//gmi,
  '- https://www.youtube.com/',
]);


export async function reformatCuratedURLs({
  dataPath,
  showChangedFiles = true,
  showSatisfiedRules = true,
}) {
  if (!dataPath) {
    throw new Error(`Expected dataPath`);
  }

  let changedFiles = new Map();
  let errored = false;
  let anyChanged = false;

  try {
    for (const [message, find, replace] of findreplace) {
      const options = {
        files: dataPath + '/**/*.yaml',
        from: find,
        to: replace,
      };

      let anyChangedForThisRule = false;
      for (const result of await replaceInFile(options)) {
        if (result.hasChanged) {
          anyChanged = true;
          anyChangedForThisRule = true;
          if (changedFiles.has(result.file)) {
            changedFiles.get(result.file).push(message);
          } else {
            changedFiles.set(result.file, [message]);
          }
        }
      }

      if (showSatisfiedRules && !anyChangedForThisRule) {
        logInfo`Already satisfied: ${message}`;
      }
    }

    return changedFiles;
  } catch (caughtError) {
    errored = true;
    throw caughtError;
  } finally {
    const entries = Array.from(changedFiles.entries());
    entries.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? +1 : 0);

    if (showChangedFiles) {
      for (const [file, messages] of entries) {
        logInfo`Updated: ${path.relative(dataPath, file)}`;
        for (const message of messages) {
          console.log(colors.dim(` - ${message}`));
        }
      }
    }

    if (!errored) {
      return new Map(entries);
    }
  }
}
