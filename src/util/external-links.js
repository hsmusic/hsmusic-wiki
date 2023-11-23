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

export const externalLinkContexts = [
  'album',
  'artist',
  'flash',
  'generic',
  'group',
  'track',
];

export const isExternalLinkContext = is(...externalLinkContexts);

// This might need to be adjusted for YAML importing...
const isRegExp =
  validateInstanceOf(RegExp);

export const isExternalLinkHandleSpec =
  validateProperties({
    prefix: optional(isStringNonEmpty),

    url: optional(isRegExp),
    domain: optional(isRegExp),
    pathname: optional(isRegExp),
  });

export const isExternalLinkSpec =
  validateArrayItems(
    validateProperties({
      match: validateProperties({
        // TODO: Don't allow providing both of these, and require providing one
        domain: optional(isStringNonEmpty),
        domains: optional(validateArrayItems(isStringNonEmpty)),

        // TODO: Don't allow providing both of these
        pathname: optional(isRegExp),
        pathnames: optional(validateArrayItems(isRegExp)),

        // TODO: Don't allow providing both of these
        query: optional(isRegExp),
        queries: optional(validateArrayItems(isRegExp)),

        context: optional(isExternalLinkContext),
      }),

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
  // Special handling for album links

  {
    match: {
      context: 'album',
      domain: 'youtube.com',
      pathname: /^playlist/,
    },

    string: 'youtube.playlist',
    icon: 'youtube',
  },

  {
    match: {
      context: 'album',
      domain: 'youtube.com',
      pathname: /^watch/,
    },

    string: 'youtube.fullAlbum',
    icon: 'youtube',
  },

  {
    match: {
      context: 'album',
      domain: 'youtu.be',
    },

    string: 'youtube.fullAlbum',
    icon: 'youtube',
  },

  // Special handling for artist links

  {
    match: {
      context: 'artist',
      domains: ['youtube.com', 'youtu.be'],
    },

    string: 'youtube',
    icon: 'youtube',

    compact: 'handle',

    handle: {
      pathname: /^(@.*?)\/?$/,
    },
  },

  // Special handling for flash links

  {
    match: {
      context: 'flash',
      domain: 'bgreco.net',
    },

    string: 'bgreco.flash',
    icon: 'external',
  },

  {
    match: {
      context: 'flash',
      domains: ['youtube.com', 'youtu.be'],
    },

    string: 'youtube.flash',
    icon: 'youtube',
  },

  // Generic domains, sorted alphabetically (by string)

  {
    match: {domains: ['bc.s3m.us', 'music.solatrux.com']},

    icon: 'bandcamp',
    string: 'bandcamp',

    normal: 'domain',
    compact: 'domain',
  },

  {
    match: {domain: 'bandcamp.com'},

    string: 'bandcamp',

    compact: 'handle',
    icon: 'bandcamp',

    handle: {domain: /^[^.]*/},
  },

  {
    match: {domain: 'deviantart.com'},

    string: 'deviantart',
    icon: 'deviantart',
  },

  {
    match: {domain: 'instagram.com'},

    string: 'instagram',
    icon: 'instagram',
  },

  {
    match: {domain: 'homestuck.com'},

    string: 'homestuck',
    icon: 'globe', // The horror!
  },

  {
    match: {domain: 'hsmusic.wiki'},

    string: 'local',

    icon: 'globe',
  },

  {
    match: {domains: ['types.pl']},

    icon: 'mastodon',
    string: 'mastodon',

    compact: 'domain',
  },

  {
    match: {domain: 'newgrounds.com'},

    string: 'newgrounds',
    icon: 'newgrounds',
  },

  {
    match: {domain: 'soundcloud.com'},

    string: 'soundcloud',
    icon: 'soundcloud',

    compact: 'handle',

    handle: /[^/]*\/?$/,
  },

  {
    match: {domain: 'tumblr.com'},

    string: 'tumblr',
    icon: 'tumblr',

    compact: 'handle',

    handle: {domain: /^[^.]*/},
  },

  {
    match: {domain: 'twitter.com'},

    string: 'twitter',
    icon: 'twitter',

    compact: 'handle',

    handle: {
      prefix: '@',
      pathname: /^@?([a-zA-Z0-9_]*)\/?$/,
    },
  },

  {
    match: {domains: ['youtube.com', 'youtu.be']},

    string: 'youtube',
    icon: 'youtube',
  },
];

function urlParts(url) {
  const {
    hostname: domain,
    pathname,
    search: query,
  } = new URL(url);

  return {domain, pathname, query};
}

export function getMatchingDescriptorsForExternalLink(url, descriptors, {
  context = 'generic',
} = {}) {
  const {domain, pathname, query} = urlParts(url);

  const compareDomain = string => domain.includes(string);
  const comparePathname = regex => regex.test(pathname.slice(1));
  const compareQuery = regex => regex.test(query.slice(1));

  const matchingDescriptors =
    descriptors
      .filter(({match}) => {
        if (match.domain) return compareDomain(match.domain);
        if (match.domains) return match.domains.some(compareDomain);
        return false;
      })
      .filter(({match}) => {
        if (match.context) return context === match.context;
        return true;
      })
      .filter(({match}) => {
        if (match.pathname) return comparePathname(match.pathname);
        if (match.pathnames) return match.pathnames.some(comparePathname);
        return true;
      })
      .filter(({match}) => {
        if (match.query) return compareQuery(match.query);
        if (match.queries) return match.quieries.some(compareQuery);
        return true;
      });

  return [...matchingDescriptors, fallbackDescriptor];
}

export function getExternalLinkStringsFromDescriptor(url, descriptor, {
  language,
}) {
  const prefix = 'misc.external';

  const results =
    Object.fromEntries(externalLinkStyles.map(style => [style, null]));

  const {domain, pathname, query} = urlParts(url);

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
            tests.push(pathname.slice(1) + query);
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

export function getExternalLinkStringsFromDescriptors(url, descriptors, {
  language,
  context = 'generic',
}) {
  const results =
    Object.fromEntries(externalLinkStyles.map(style => [style, null]));

  const remainingKeys =
    new Set(Object.keys(results));

  const matchingDescriptors =
    getMatchingDescriptorsForExternalLink(url, descriptors, {context});

  for (const descriptor of matchingDescriptors) {
    const descriptorResults =
      getExternalLinkStringsFromDescriptor(url, descriptor, {language});

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
