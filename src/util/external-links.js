import {empty, stitchArrays} from '#sugar';

import {
  anyOf,
  is,
  isObject,
  isStringNonEmpty,
  looseArrayOf,
  optional,
  validateAllPropertyValues,
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
  'albumOneTrack',
  'albumMultipleTracks',
  'albumNoTracks',
  'artist',
  'flash',
  'generic',
  'group',
  'track',
];

export const isExternalLinkContext =
  anyOf(
    is(...externalLinkContexts),
    looseArrayOf(is(...externalLinkContexts)));

// This might need to be adjusted for YAML importing...
const isRegExp =
  validateInstanceOf(RegExp);

export const isExternalLinkTransformCommand =
  is(...[
    'decode-uri',
    'find-replace',
  ]);

export const isExternalLinkTransformSpec =
  anyOf(
    isExternalLinkTransformCommand,
    validateProperties({
      [validateProperties.allowOtherKeys]: true,
      command: isExternalLinkTransformCommand,
    }));

export const isExternalLinkExtractSpec =
  validateProperties({
    prefix: optional(isStringNonEmpty),
    transform: optional(validateArrayItems(isExternalLinkTransformSpec)),
    url: optional(isRegExp),
    domain: optional(isRegExp),
    pathname: optional(isRegExp),
    query: optional(isRegExp),
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

      platform: isStringNonEmpty,
      substring: optional(isStringNonEmpty),

      // TODO: Don't allow 'handle' or 'custom' options if the corresponding
      // properties aren't provided
      normal: optional(is('domain', 'handle', 'custom')),
      compact: optional(is('domain', 'handle', 'custom')),
      icon: optional(isStringNonEmpty),

      handle: optional(isExternalLinkExtractSpec),

      // TODO: This should validate each value with isExternalLinkExtractSpec.
      custom: optional(validateAllPropertyValues(isExternalLinkExtractSpec)),
    }));

export const fallbackDescriptor = {
  platform: 'external',

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

    platform: 'youtube',
    substring: 'playlist',

    icon: 'youtube',
  },

  {
    match: {
      context: 'albumMultipleTracks',
      domain: 'youtube.com',
      pathname: /^watch/,
    },

    platform: 'youtube',
    substring: 'fullAlbum',

    icon: 'youtube',
  },

  {
    match: {
      context: 'albumMultipleTracks',
      domain: 'youtu.be',
    },

    platform: 'youtube',
    substring: 'fullAlbum',

    icon: 'youtube',
  },

  // Special handling for artist links

  {
    match: {
      domain: 'patreon.com',
      context: 'artist',
    },

    platform: 'patreon',

    normal: 'handle',
    compact: 'handle',
    icon: 'globe',

    handle: /([^/]*)\/?$/,
  },

  {
    match: {
      context: 'artist',
      domain: 'youtube.com',
    },

    platform: 'youtube',

    normal: 'handle',
    compact: 'handle',
    icon: 'youtube',

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

    platform: 'bgreco',
    substring: 'flash',

    icon: 'globe',
  },

  // This takes precedence over the secretPage match below.
  {
    match: {
      context: 'flash',
      domain: 'homestuck.com',
      pathname: /^story\/[0-9]+\/?$/,
    },

    platform: 'homestuck',
    substring: 'page',

    normal: 'custom',
    icon: 'globe',

    custom: {
      page: {
        pathname: /[0-9]+/,
      },
    },
  },

  {
    match: {
      context: 'flash',
      domain: 'homestuck.com',
      pathname: /^story\/.+\/?$/,
    },

    platform: 'homestuck',
    substring: 'secretPage',

    icon: 'globe',
  },

  {
    match: {
      context: 'flash',
      domains: ['youtube.com', 'youtu.be'],
    },

    platform: 'youtube',
    substring: 'flash',

    icon: 'youtube',
  },

  // Generic domains, sorted alphabetically (by string)

  {
    match: {domains: ['bc.s3m.us', 'music.solatrus.com']},

    platform: 'bandcamp',

    normal: 'domain',
    compact: 'domain',
    icon: 'bandcamp',
  },

  {
    match: {domain: '.bandcamp.com'},

    platform: 'bandcamp',

    compact: 'handle',
    icon: 'bandcamp',

    handle: {domain: /^[^.]*/},
  },

  {
    match: {domain: 'music.deconreconstruction.com'},
    platform: 'deconreconstruction.music',
    icon: 'globe',
  },

  {
    match: {domain: 'deconreconstruction.com'},
    platform: 'deconreconstruction',
    icon: 'globe',
  },

  {
    match: {domain: 'deviantart.com'},
    platform: 'deviantart',
    icon: 'deviantart',
  },

  {
    match: {
      domain: 'mspaintadventures.fandom.com',
      pathname: /^wiki\/(.+)\/?$/,
    },

    platform: 'fandom',
    substring: 'mspaintadventures.page',

    normal: 'custom',
    icon: 'globe',

    custom: {
      page: {
        pathname: /^wiki\/(.+)\/?$/,
        transform: [
          {command: 'decode-uri'},
          {command: 'find-replace', find: /_/g, replace: ' '},
        ],
      },
    },
  },

  {
    match: {domain: 'mspaintadventures.fandom.com'},

    platform: 'fandom',
    substring: 'mspaintadventures',

    icon: 'globe',
  },

  {
    match: {domain: 'fandom.com'},
    platform: 'fandom',
    icon: 'globe',
  },

  {
    match: {domain: 'homestuck.com'},
    platform: 'homestuck',
    icon: 'globe',
  },

  {
    match: {domain: 'hsmusic.wiki'},
    platform: 'local',
    icon: 'globe',
  },

  {
    match: {domain: 'instagram.com'},
    platform: 'instagram',
    icon: 'instagram',
  },

  {
    match: {domains: ['types.pl']},

    platform: 'mastodon',

    normal: 'domain',
    compact: 'domain',
    icon: 'mastodon',
  },

  {
    match: {domain: 'newgrounds.com'},
    platform: 'newgrounds',
    icon: 'newgrounds',
  },

  {
    match: {domain: 'patreon.com'},
    platform: 'patreon',
    icon: 'globe',
  },

  {
    match: {domain: 'poetryfoundation.org'},
    platform: 'poetryFoundation',
    icon: 'globe',
  },

  {
    match: {domain: 'soundcloud.com'},

    platform: 'soundcloud',

    compact: 'handle',
    icon: 'soundcloud',

    handle: /([^/]*)\/?$/,
  },

  {
    match: {domain: 'spotify.com'},
    platform: 'spotify',
    icon: 'globe',
  },

  {
    match: {domain: '.tumblr.com'},

    platform: 'tumblr',

    compact: 'handle',
    icon: 'tumblr',

    handle: {domain: /^[^.]*/},
  },

  {
    match: {domain: 'twitter.com'},

    platform: 'twitter',

    compact: 'handle',
    icon: 'twitter',

    handle: {
      prefix: '@',
      pathname: /^@?([a-zA-Z0-9_]*)\/?$/,
    },
  },

  {
    match: {domain: 'wikipedia.org'},
    platform: 'wikipedia',
    icon: 'misc',
  },

  {
    match: {domains: ['youtube.com', 'youtu.be']},
    platform: 'youtube',
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

function createEmptyResults() {
  return Object.fromEntries(externalLinkStyles.map(style => [style, null]));
}

export function getMatchingDescriptorsForExternalLink(url, descriptors, {
  context = 'generic',
} = {}) {
  const {domain, pathname, query} = urlParts(url);

  const compareDomain = string => domain.includes(string);
  const comparePathname = regex => regex.test(pathname.slice(1));
  const compareQuery = regex => regex.test(query.slice(1));

  const contextArray =
    (Array.isArray(context)
      ? context
      : [context]).filter(Boolean);

  const matchingDescriptors =
    descriptors
      .filter(({match}) => {
        if (match.domain) return compareDomain(match.domain);
        if (match.domains) return match.domains.some(compareDomain);
        return false;
      })
      .filter(({match}) => {
        if (Array.isArray(match.context))
          return match.context.some(c => contextArray.includes(c));
        if (match.context)
          return contextArray.includes(match.context);
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

export function extractPartFromExternalLink(url, extract) {
  const {domain, pathname, query} = urlParts(url);

  let regexen = [];
  let tests = [];
  let transform = [];
  let prefix = '';

  if (extract instanceof RegExp) {
    regexen.push(extract);
    tests.push(url);
  } else {
    for (const [key, value] of Object.entries(extract)) {
      switch (key) {
        case 'prefix':
          prefix = value;
          continue;

        case 'transform':
          for (const entry of value) {
            const command =
              (typeof entry === 'string'
                ? command
                : entry.command);

            const options =
              (typeof entry === 'string'
                ? {}
                : entry);

            switch (command) {
              case 'decode-uri':
                transform.push(value =>
                  decodeURIComponent(value));
                break;

              case 'find-replace':
                transform.push(value =>
                  value.replace(options.find, options.replace));
                break;
            }
          }
          continue;

        case 'url':
          tests.push(url);
          break;

        case 'domain':
          tests.push(domain);
          break;

        case 'pathname':
          tests.push(pathname.slice(1));
          break;

        case 'query':
          tests.push(query.slice(1));
          break;

        default:
          tests.push('');
          break;
      }

      regexen.push(value);
    }
  }

  let value;
  for (const {regex, test} of stitchArrays({
    regex: regexen,
    test: tests,
  })) {
    const match = test.match(regex);
    if (match) {
      value = prefix + (match[1] ?? match[0]);
      break;
    }
  }

  if (!value) {
    return null;
  }

  for (const fn of transform) {
    value = fn(value);
  }

  return value;
}

export function extractAllCustomPartsFromExternalLink(url, custom) {
  const customParts = {};

  // All or nothing: if one part doesn't match, all results are scrapped.
  for (const [key, value] of Object.entries(custom)) {
    customParts[key] = extractPartFromExternalLink(url, value);
    if (!customParts[key]) return null;
  }

  return customParts;
}

export function getExternalLinkStringOfStyleFromDescriptor(url, style, descriptor, {language}) {
  const prefix = 'misc.external';

  function getPlatform() {
    return language.$(prefix, descriptor.platform);
  }

  function getDomain() {
    return urlParts(url).domain;
  }

  function getCustom() {
    if (!descriptor.custom) {
      return null;
    }

    const customParts =
      extractAllCustomPartsFromExternalLink(url, descriptor.custom);

    if (!customParts) {
      return null;
    }

    return language.$(prefix, descriptor.platform, descriptor.substring, customParts);
  }

  function getHandle() {
    if (!descriptor.handle) {
      return null;
    }

    return extractPartFromExternalLink(url, descriptor.handle);
  }

  function getNormal() {
    if (descriptor.custom) {
      if (descriptor.normal === 'custom') {
        return getCustom();
      } else {
        return null;
      }
    }

    if (descriptor.normal === 'domain') {
      const platform = getPlatform();
      const domain = getDomain();

      if (!platform || !domain) {
        return null;
      }

      return language.$(prefix, 'withDomain', {platform, domain});
    }

    if (descriptor.normal === 'handle') {
      const platform = getPlatform();
      const handle = getHandle();

      if (!platform || !handle) {
        return null;
      }

      return language.$(prefix, 'withHandle', {platform, handle});
    }

    return language.$(prefix, descriptor.platform, descriptor.substring);
  }

  function getCompact() {
    if (descriptor.custom) {
      if (descriptor.compact === 'custom') {
        return getCustom();
      } else {
        return null;
      }
    }

    if (descriptor.compact === 'domain') {
      const domain = getDomain();

      if (!domain) {
        return null;
      }

      return language.sanitize(domain.replace(/^www\./, ''));
    }

    if (descriptor.compact === 'handle') {
      const handle = getHandle();

      if (!handle) {
        return null;
      }

      return language.sanitize(handle);
    }
  }

  function getIconId() {
    return descriptor.icon ?? null;
  }

  switch (style) {
    case 'normal': return getNormal();
    case 'compact': return getCompact();
    case 'platform': return getPlatform();
    case 'icon-id': return getIconId();
  }
}

export function couldDescriptorSupportStyle(descriptor, style) {
  if (style === 'normal') {
    if (descriptor.custom) {
      return descriptor.normal === 'custom';
    } else {
      return true;
    }
  }

  if (style === 'compact') {
    if (descriptor.custom) {
      return descriptor.compact === 'custom';
    } else {
      return !!descriptor.compact;
    }
  }

  if (style === 'platform') {
    return true;
  }

  if (style === 'icon-id') {
    return !!descriptor.icon;
  }
}

export function getExternalLinkStringOfStyleFromDescriptors(url, style, descriptors, {
  language,
  context = 'generic',
}) {
  const matchingDescriptors =
    getMatchingDescriptorsForExternalLink(url, descriptors, {context});

  const styleFilteredDescriptors =
    matchingDescriptors.filter(descriptor =>
      couldDescriptorSupportStyle(descriptor, style));

  for (const descriptor of styleFilteredDescriptors) {
    const descriptorResult =
      getExternalLinkStringOfStyleFromDescriptor(url, style, descriptor, {language});

    if (descriptorResult) {
      return descriptorResult;
    }
  }

  return null;
}

export function getExternalLinkStringsFromDescriptor(url, descriptor, {language}) {
  const getStyle = style =>
    getExternalLinkStringOfStyleFromDescriptor(url, style, descriptor, {language});

  return {
    'normal': getStyle('normal'),
    'compact': getStyle('compact'),
    'platform': getStyle('platform'),
    'icon-id': getStyle('icon-id'),
  };
}

export function getExternalLinkStringsFromDescriptors(url, descriptors, {
  language,
  context = 'generic',
}) {
  const results = createEmptyResults();
  const remainingKeys = new Set(Object.keys(results));

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
