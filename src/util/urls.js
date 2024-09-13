// Code that deals with URLs (really the pathnames that get referenced all
// throughout the gener8ted HTML). Most nota8ly here is generateURLs, which
// is in charge of pre-gener8ting a complete network of template strings
// which can really quickly take su8stitute parameters to link from any one
// place to another; 8ut there are also a few other utilities, too.

import * as path from 'node:path';

import {withEntries} from '#sugar';

// This export is only provided for convenience, i.e. to enable the following:
//
//   import {urlSpec} from '#urls';
//
// It's not actually defined in this module's variable scope, and functions
// exported here require a urlSpec (whether this default one or another) to be
// passed directly.
//
export {default as urlSpec} from '../url-spec.js';

export function generateURLs(urlSpec) {
  const getValueForFullKey = (obj, fullKey) => {
    const [groupKey, subKey] = fullKey.split('.');
    if (!groupKey || !subKey) {
      throw new Error(`Expected group key and subkey (got ${fullKey})`);
    }

    if (!Object.hasOwn(obj, groupKey)) {
      throw new Error(`Expected valid group key (got ${groupKey})`);
    }

    const group = obj[groupKey];

    if (!Object.hasOwn(group, subKey)) {
      throw new Error(`Expected valid subkey (got ${subKey} for group ${groupKey})`);
    }

    return {
      value: group[subKey],
      group,
    };
  };

  // This should be called on values which are going to be passed to
  // path.relative, because relative will resolve a leading slash as the root
  // directory of the working device, which we aren't looking for here.
  const trimLeadingSlash = (P) => (P.startsWith('/') ? P.slice(1) : P);

  const generateTo = (fromPath, fromGroup) => {
    const A = trimLeadingSlash(fromPath);

    const rebasePrefix = '../'
      .repeat((fromGroup.prefix || '').split('/').filter(Boolean).length);

    const pathHelper = (toPath, toGroup) => {
      let B = trimLeadingSlash(toPath);

      let argIndex = 0;
      B = B.replaceAll('<>', () => `<${argIndex++}>`);

      if (toGroup.prefix !== fromGroup.prefix) {
        // TODO: Handle differing domains in prefixes.
        B = rebasePrefix + (toGroup.prefix || '') + B;
      }

      const suffix = toPath.endsWith('/') ? '/' : '';

      return {
        posix: path.posix.relative(A, B) + suffix,
        device: path.relative(A, B) + suffix,
      };
    };

    const groupSymbol = Symbol();

    const groupHelper = (urlGroup) => ({
      [groupSymbol]: urlGroup,
      ...withEntries(urlGroup.paths, (entries) =>
        entries.map(([key, path]) => [key, pathHelper(path, urlGroup)])
      ),
    });

    const relative = withEntries(urlSpec, (entries) =>
      entries.map(([key, urlGroup]) => [key, groupHelper(urlGroup)])
    );

    const toHelper =
      ({device}) =>
      (key, ...args) => {
        const {
          value: {
            [device ? 'device' : 'posix']: template,
          },
        } = getValueForFullKey(relative, key);

        let missing = 0;
        let result = template.replaceAll(/<([0-9]+)>/g, (match, n) => {
          if (n < args.length) {
            const value = args[n];
            if (device) {
              return value;
            } else {
              let encoded = encodeURIComponent(value);
              encoded = encoded.replaceAll('%2F', '/');
              return encoded;
            }
          } else {
            missing++;
          }
        });

        if (missing) {
          throw new Error(
            `Expected ${missing + args.length} arguments, got ${
              args.length
            } (key ${key}, args [${args}])`
          );
        }

        return result;
      };

    const to =
      toHelper({device: false});

    const toDevice =
      toHelper({device: true});

    const toLocalizedHelper =
      ({to}) =>
      (path, {baseDirectory = ''} = {}) =>
        (baseDirectory
          ? to('localizedWithBaseDirectory.' + path[0], baseDirectory, ...path.slice(1))
          : to('localized.' + path[0], ...path.slice(1)));

    const toLocalized =
      toLocalizedHelper({to: to});

    const toDeviceLocalized =
      toLocalizedHelper({to: toDevice});

    return {
      to,
      toDevice,
      toLocalized,
      toDeviceLocalized,
    };
  };

  const generateFrom = () => {
    const map = withEntries(
      urlSpec,
      (entries) => entries.map(([key, group]) => [
        key,
        withEntries(group.paths, (entries) =>
          entries.map(([key, path]) => [key, generateTo(path, group)])
        ),
      ]));

    const from = (key) => getValueForFullKey(map, key).value;

    return {from, map};
  };

  return generateFrom();
}

const thumbnailHelper = (name) => (file) =>
  file.replace(/\.(jpg|png)$/, name + '.jpg');

export const thumb = {
  large: thumbnailHelper('.large'),
  medium: thumbnailHelper('.medium'),
  small: thumbnailHelper('.small'),
};

// Makes the generally-used and wiki-specialized "to" page utility.
// "to" returns a relative path from the current page to the target.
export function getURLsFrom(path, {baseDirectory, urls}) {
  const pageSubKey = path[0];
  const subdirectoryPrefix = getPathSubdirectoryPrefix(path);

  return (targetFullKey, ...args) => {
    const [groupKey, subKey] = targetFullKey.split('.');
    let from, to;

    // When linking to *outside* the localized area of the site, we need to
    // make sure the result is correctly relative to the 8ase directory.
    if (
      groupKey !== 'localized' &&
      groupKey !== 'localizedDefaultLanguage' &&
      baseDirectory
    ) {
      from = 'localizedWithBaseDirectory.' + pageSubKey;
      to = targetFullKey;
    } else if (groupKey === 'localizedDefaultLanguage' && baseDirectory) {
      // Special case for specifically linking *from* a page with base
      // directory *to* a page without! Used for the language switcher and
      // hopefully nothing else oh god.
      from = 'localizedWithBaseDirectory.' + pageSubKey;
      to = 'localized.' + subKey;
    } else if (groupKey === 'localizedDefaultLanguage') {
      // Linking to the default, except surprise, we're already IN the default
      // (no baseDirectory set).
      from = 'localized.' + pageSubKey;
      to = 'localized.' + subKey;
    } else {
      // If we're linking inside the localized area (or there just is no
      // 8ase directory), the 8ase directory doesn't matter.
      from = 'localized.' + pageSubKey;
      to = targetFullKey;
    }

    return (
      subdirectoryPrefix +
      urls.from(from).to(to, ...args));
  };
}

// Makes the generally-used and wiki-specialized "absoluteTo" page utility.
// "absoluteTo" returns an absolute path, starting at site root (/) leading
// to the target.
export function getURLsFromRoot({
  baseDirectory,
  urls,
}) {
  const {to} = urls.from('shared.root');

  return (targetFullKey, ...args) => {
    const [groupKey, subKey] = targetFullKey.split('.');
    return (
      '/' +
      (groupKey === 'localized' && baseDirectory
        ? to(
            'localizedWithBaseDirectory.' + subKey,
            baseDirectory,
            ...args
          )
        : to(targetFullKey, ...args))
    );
  };
}

// Needed for the rare path arguments which themselves contains one or more
// slashes, e.g. for listings, with arguments like 'albums/by-name'.
export function getPathSubdirectoryPrefix(path) {
  const timesNestedDeeply =
    path
      .slice(1) // skip URL key, only check arguments
      .join('/')
      .split('/')
      .length - 1;

  return '../'.repeat(timesNestedDeeply);
}
