import {empty, stitchArrays} from '#sugar';

import {
  is,
  isStringNonEmpty,
  optional,
  validateArrayItems,
  validateInstanceOf,
  validateProperties,
} from '#validators';

export const externalLinkStyles = [
  'normal',
  'compact',
  'platform',
  'icon-id',
];

export const isExternalLinkStyle = is(...externalLinkStyles);

// This might need to be adjusted for YAML importing...
const isExternalLinkSpecRegex =
  validateInstanceOf(RegExp);

export const isExternalLinkHandleSpec =
  validateProperties({
    prefix: optional(isStringNonEmpty),

    url: optional(isExternalLinkSpecRegex),

    // TODO: Don't allow specifying both of these (they're aliases)
    domain: optional(isExternalLinkSpecRegex),
    hostname: optional(isExternalLinkSpecRegex),

    // TODO: Don't allow specifying both of these (they're aliases)
    path: optional(isExternalLinkSpecRegex),
    pathname: optional(isExternalLinkSpecRegex),
  });

export const isExternalLinkSpec =
  validateArrayItems(
    validateProperties({
      // TODO: Don't allow providing both of these, and require providing one
      matchDomain: optional(isStringNonEmpty),
      matchDomains: optional(validateArrayItems(isStringNonEmpty)),

      string: isStringNonEmpty,

      // TODO: Don't allow 'handle' options if handle isn't provided
      normal: optional(is('domain', 'handle')),
      compact: optional(is('domain', 'handle')),
      icon: optional(isStringNonEmpty),

      handle: optional(isExternalLinkHandleSpec),
    }));

export const fallbackDescriptor = {
  string: 'external',

  normal: 'domain',
  compact: 'domain',
  icon: 'globe',
};

// TODO: Define all this stuff in data as YAML!
export const externalLinkSpec = [
  {
    matchDomain: 'hsmusic.wiki',

    string: 'local',

    icon: 'globe',
  },

  {
    matchDomain: 'bandcamp.com',

    string: 'bandcamp',

    compact: 'handle',
    icon: 'bandcamp',

    handle: {domain: /^[^.]*/},
  },

  {
    matchDomains: ['bc.s3m.us', 'music.solatrux.com'],

    icon: 'bandcamp',
    string: 'bandcamp',

    normal: 'domain',
    compact: 'domain',
  },

  {
    matchDomains: ['types.pl'],

    icon: 'mastodon',
    string: 'mastodon',

    compact: 'domain',
  },

  {
    matchDomains: ['youtube.com', 'youtu.be'],

    icon: 'youtube',
    string: 'youtube',

    compact: 'handle',

    handle: {
      pathname: /^(@.*?)\/?$/,
    },
  },

  {
    matchDomain: 'soundcloud.com',

    icon: 'soundcloud',
    string: 'soundcloud',

    compact: 'handle',

    handle: /[^/]*\/?$/,
  },

  {
    matchDomain: 'tumblr.com',

    icon: 'tumblr',
    string: 'tumblr',

    compact: 'handle',

    handle: {domain: /^[^.]*/},
  },

  {
    matchDomain: 'twitter.com',

    icon: 'twitter',
    string: 'twitter',

    compact: 'handle',

    handle: {
      prefix: '@',
      pathname: /^@?.*\/?$/,
    },
  },

  {
    matchDomain: 'deviantart.com',

    icon: 'deviantart',
    string: 'deviantart',
  },

  {
    matchDomain: 'instagram.com',

    icon: 'instagram',
    string: 'instagram',
  },

  {
    matchDomain: 'newgrounds.com',

    icon: 'newgrounds',
    string: 'newgrounds',
  },
];

export function getMatchingDescriptorsForExternalLink(url, descriptors) {
  const {hostname: domain} = new URL(url);
  const compare = d => domain.includes(d);

  const matchingDescriptors =
    descriptors.filter(spec => {
      if (spec.matchDomain && compare(spec.matchDomain)) return true;
      if (spec.matchDomains && spec.matchDomains.some(compare)) return true;
      return false;
    });

  return [...matchingDescriptors, fallbackDescriptor];
}

export function getExternalLinkStringsFromDescriptor(url, descriptor, language) {
  const prefix = 'misc.external';

  const results =
    Object.fromEntries(externalLinkStyles.map(style => [style, null]));

  const {hostname: domain, pathname} = new URL(url);

  const place = language.$(prefix, descriptor.string);

  results['platform'] = place;

  if (descriptor.icon) {
    results['icon-id'] = descriptor.icon;
  }

  if (descriptor.normal === 'domain') {
    results['normal'] = language.$(prefix, 'withDomain', {place, domain});
  }

  if (descriptor.compact === 'domain') {
    results['compact'] = language.sanitize(domain.replace(/^www\./, ''));
  }

  let handle = null;

  if (descriptor.handle) {
    let regexen = [];
    let tests = [];

    let handlePrefix = '';

    if (descriptor.handle instanceof RegExp) {
      regexen.push(descriptor.handle);
      tests.push(url);
    } else {
      for (const [key, value] of Object.entries(descriptor.handle)) {
        switch (key) {
          case 'prefix':
            handlePrefix = value;
            continue;

          case 'url':
            tests.push(url);
            break;

          case 'domain':
          case 'hostname':
            tests.push(domain);
            break;

          case 'path':
          case 'pathname':
            tests.push(pathname.slice(1));
            break;

          default:
            tests.push('');
            break;
        }

        regexen.push(value);
      }
    }

    for (const {regex, test} of stitchArrays({
      regex: regexen,
      test: tests,
    })) {
      const match = test.match(regex);
      if (match) {
        handle = handlePrefix + (match[1] ?? match[0]);
        break;
      }
    }
  }

  if (descriptor.compact === 'handle') {
    results.compact = language.sanitize(handle);
  }

  if (descriptor.normal === 'handle' && handle) {
    results.normal = language.$(prefix, 'withHandle', {place, handle});
  }

  results.normal ??= language.$(prefix, descriptor.string);

  return results;
}

export function getExternalLinkStringsFromDescriptors(url, descriptors, language) {
  const results =
    Object.fromEntries(externalLinkStyles.map(style => [style, null]));

  const remainingKeys =
    new Set(Object.keys(results));

  const matchingDescriptors =
    getMatchingDescriptorsForExternalLink(url, descriptors);

  for (const descriptor of matchingDescriptors) {
    const descriptorResults =
      getExternalLinkStringsFromDescriptor(url, descriptor, language);

    const descriptorKeys =
      new Set(
        Object.entries(descriptorResults)
          .filter(entry => entry[1])
          .map(entry => entry[0]));

    for (const key of remainingKeys) {
      if (descriptorKeys.has(key)) {
        results[key] = descriptorResults[key];
        remainingKeys.delete(key);
      }
    }

    if (empty(remainingKeys)) {
      return results;
    }
  }

  return results;
}
