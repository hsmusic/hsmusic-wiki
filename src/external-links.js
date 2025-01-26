import {empty, stitchArrays, withEntries} from '#sugar';

import {
  anyOf,
  is,
  isBoolean,
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
  'platform',
  'handle',
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

      handle: optional(isExternalLinkExtractSpec),

      detail:
        optional(anyOf(
          isStringNonEmpty,
          validateProperties({
            [validateProperties.validateOtherKeys]:
              isExternalLinkExtractSpec,

            substring: isStringNonEmpty,
          }))),

      unusualDomain: optional(isBoolean),

      icon: optional(isStringNonEmpty),
    }));

export const fallbackDescriptor = {
  platform: 'external',
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
    detail: 'playlist',

    icon: 'youtube',
  },

  {
    match: {
      context: 'albumMultipleTracks',
      domain: 'youtube.com',
      pathname: /^watch/,
    },

    platform: 'youtube',
    detail: 'fullAlbum',

    icon: 'youtube',
  },

  {
    match: {
      context: 'albumMultipleTracks',
      domain: 'youtu.be',
    },

    platform: 'youtube',
    detail: 'fullAlbum',

    icon: 'youtube',
  },

  // Special handling for flash links

  {
    match: {
      context: 'flash',
      domain: 'bgreco.net',
    },

    platform: 'bgreco',
    detail: 'flash',

    icon: 'globe',
  },

  // This takes precedence over the secretPage match below.
  {
    match: {
      context: 'flash',
      domain: 'homestuck.com',
    },

    platform: 'homestuck',

    detail: {
      substring: 'page',
      page: {pathname: /^story\/([0-9]+)\/?$/,},
    },

    icon: 'globe',
  },

  {
    match: {
      context: 'flash',
      domain: 'homestuck.com',
      pathname: /^story\/.+\/?$/,
    },

    platform: 'homestuck',
    detail: 'secretPage',

    icon: 'globe',
  },

  {
    match: {
      context: 'flash',
      domains: ['youtube.com', 'youtu.be'],
    },

    platform: 'youtube',
    detail: 'flash',

    icon: 'youtube',
  },

  // Generic domains, sorted alphabetically (by string)

  {
    match: {
      domains: [
        'music.amazon.co.jp',
        'music.amazon.com',
      ],
    },

    platform: 'amazonMusic',
    icon: 'globe',
  },

  {
    match: {domain: 'music.apple.com'},
    platform: 'appleMusic',
    icon: 'appleMusic',
  },

  {
    match: {domain: 'artstation.com'},

    platform: 'artstation',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'artstation',
  },

  {
    match: {domain: '.artstation.com'},

    platform: 'artstation',
    handle: {domain: /^[^.]+/},

    icon: 'artstation',
  },

  {
    match: {domains: ['bc.s3m.us', 'music.solatrus.com']},

    platform: 'bandcamp',
    handle: {domain: /.+/},
    unusualDomain: true,

    icon: 'bandcamp',
  },

  {
    match: {domain: '.bandcamp.com'},

    platform: 'bandcamp',
    handle: {domain: /^[^.]+/},

    icon: 'bandcamp',
  },

  {
    match: {domain: 'bsky.app'},

    platform: 'bluesky',
    handle: {pathname: /^profile\/([^/]+?)(?:\.bsky\.social)?\/?$/},

    icon: 'bluesky',
  },

  {
    match: {domain: '.carrd.co'},

    platform: 'carrd',
    handle: {domain: /^[^.]+/},

    icon: 'carrd',
  },

  {
    match: {domain: 'cohost.org'},

    platform: 'cohost',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'cohost',
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
    match: {domain: '.deviantart.com'},

    platform: 'deviantart',
    handle: {domain: /^[^.]+/},

    icon: 'deviantart',
  },

  {
    match: {domain: 'deviantart.com'},

    platform: 'deviantart',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'deviantart',
  },

  {
    match: {domain: 'deviantart.com'},
    platform: 'deviantart',
    icon: 'deviantart',
  },

  {
    match: {domain: 'facebook.com'},

    platform: 'facebook',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'facebook',
  },

  {
    match: {domain: 'facebook.com'},

    platform: 'facebook',
    handle: {pathname: /^(?:pages|people)\/([^/]+)\/[0-9]+\/?$/},

    icon: 'facebook',
  },

  {
    match: {domain: 'facebook.com'},
    platform: 'facebook',
    icon: 'facebook',
  },

  {
    match: {domain: 'm.nintendo.com'},

    platform: 'nintendoMusic',

    icon: 'nintendoMusic',
  },

  {
    match: {domain: 'mspaintadventures.fandom.com'},

    platform: 'fandom.mspaintadventures',

    detail: {
      substring: 'page',
      page: {
        pathname: /^wiki\/(.+)\/?$/,
        transform: [
          {command: 'decode-uri'},
          {command: 'find-replace', find: /_/g, replace: ' '},
        ],
      },
    },

    icon: 'globe',
  },

  {
    match: {domain: 'mspaintadventures.fandom.com'},

    platform: 'fandom.mspaintadventures',

    icon: 'globe',
  },

  {
    match: {domains: ['fandom.com', '.fandom.com']},
    platform: 'fandom',
    icon: 'globe',
  },

  {
    match: {domain: 'gamebanana.com'},
    platform: 'gamebanana',
    icon: 'globe',
  },

  {
    match: {domain: 'homestuck.com'},
    platform: 'homestuck',
    icon: 'globe',
  },

  {
    match: {
      domain: 'hsmusic.wiki',
      pathname: /^media\/misc\/archive/,
    },

    platform: 'hsmusic.archive',

    icon: 'globe',
  },

  {
    match: {domain: 'hsmusic.wiki'},
    platform: 'hsmusic',
    icon: 'globe',
  },

  {
    match: {domain: 'instagram.com'},

    platform: 'instagram',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'instagram',
  },

  {
    match: {domain: 'instagram.com'},
    platform: 'instagram',
    icon: 'instagram',
  },

  // The Wayback Machine is a separate entry.
  {
    match: {domain: 'archive.org'},
    platform: 'internetArchive',
    icon: 'internetArchive',
  },

  {
    match: {domain: '.itch.io'},

    platform: 'itch',
    handle: {domain: /^[^.]+/},

    icon: 'itch',
  },

  {
    match: {domain: 'itch.io'},

    platform: 'itch',
    handle: {pathname: /^profile\/([^/]+)\/?$/},

    icon: 'itch',
  },

  {
    match: {domain: 'ko-fi.com'},

    platform: 'kofi',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'kofi',
  },

  {
    match: {domain: 'linktr.ee'},

    platform: 'linktree',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'linktree',
  },

  {
    match: {domains: [
      'mastodon.social',
      'shrike.club',
      'types.pl',
    ]},

    platform: 'mastodon',
    handle: {domain: /.+/},
    unusualDomain: true,

    icon: 'mastodon',
  },

  {
    match: {domains: ['mspfa.com', '.mspfa.com']},
    platform: 'mspfa',
    icon: 'globe',
  },

  {
    match: {domain: '.neocities.org'},

    platform: 'neocities',
    handle: {domain: /.+/},

    icon: 'globe',
  },

  {
    match: {domain: '.newgrounds.com'},

    platform: 'newgrounds',
    handle: {domain: /^[^.]+/},

    icon: 'newgrounds',
  },

  {
    match: {domain: 'newgrounds.com'},
    platform: 'newgrounds',
    icon: 'newgrounds',
  },

  {
    match: {domain: 'patreon.com'},

    platform: 'patreon',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'patreon',
  },

  {
    match: {domain: 'patreon.com'},
    platform: 'patreon',
    icon: 'patreon',
  },

  {
    match: {domain: 'poetryfoundation.org'},
    platform: 'poetryFoundation',
    icon: 'globe',
  },

  {
    match: {domain: 'soundcloud.com'},

    platform: 'soundcloud',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'soundcloud',
  },

  {
    match: {domain: 'soundcloud.com'},
    platform: 'soundcloud',
    icon: 'soundcloud',
  },

  {
    match: {domains: ['spotify.com', 'open.spotify.com']},
    platform: 'spotify',
    icon: 'spotify',
  },

  {
    match: {domains: ['store.steampowered.com', 'steamcommunity.com']},
    platform: 'steam',
    icon: 'steam',
  },

  {
    match: {domain: 'tiktok.com'},

    platform: 'tiktok',
    handle: {pathname: /^@?([^/]+)\/?$/},

    icon: 'tiktok',
  },

  {
    match: {domain: 'toyhou.se'},

    platform: 'toyhouse',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'toyhouse',
  },

  {
    match: {domain: '.tumblr.com'},

    platform: 'tumblr',
    handle: {domain: /^[^.]+/},

    icon: 'tumblr',
  },

  {
    match: {domain: 'tumblr.com'},

    platform: 'tumblr',
    handle: {pathname: /^([^/]+)\/?$/},

    icon: 'tumblr',
  },

  {
    match: {domain: 'tumblr.com'},
    platform: 'tumblr',
    icon: 'tumblr',
  },

  {
    match: {domain: 'twitch.tv'},

    platform: 'twitch',
    handle: {pathname: /^(.+)\/?/},

    icon: 'twitch',
  },

  {
    match: {domain: 'twitter.com'},

    platform: 'twitter',
    handle: {pathname: /^@?([^/]+)\/?$/},

    icon: 'twitter',
  },

  {
    match: {domain: 'twitter.com'},
    platform: 'twitter',
    icon: 'twitter',
  },

  {
    match: {domain: 'web.archive.org'},
    platform: 'waybackMachine',
    icon: 'internetArchive',
  },

  {
    match: {domains: ['wikipedia.org', '.wikipedia.org']},
    platform: 'wikipedia',
    icon: 'misc',
  },

  {
    match: {domain: 'youtube.com'},

    platform: 'youtube',
    handle: {pathname: /^@([^/]+)\/?$/},

    icon: 'youtube',
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

  const compareDomain = string => {
    // A dot at the start of the descriptor's domain indicates
    // we're looking to match a subdomain.
    if (string.startsWith('.')) matchSubdomain: {
      // "www" is never an acceptable subdomain for this purpose.
      // Sorry to people whose usernames are www!!
      if (domain.startsWith('www.')) {
        return false;
      }

      return domain.endsWith(string);
    }

    // No dot means we're looking for an exact/full domain match.
    // But let "www" pass here too, implicitly.
    return domain === string || domain === 'www.' + string;
  };

  const comparePathname = regex => regex.test(pathname.slice(1));
  const compareQuery = regex => regex.test(query.slice(1));

  const compareExtractSpec = extract =>
    extractPartFromExternalLink(url, extract, {mode: 'test'});

  const contextArray =
    (Array.isArray(context)
      ? context
      : [context]).filter(Boolean);

  const matchingDescriptors =
    descriptors
      .filter(({match}) =>
        (match.domain
          ? compareDomain(match.domain)
       : match.domains
          ? match.domains.some(compareDomain)
          : false))

      .filter(({match}) =>
        (Array.isArray(match.context)
          ? match.context.some(c => contextArray.includes(c))
       : match.context
          ? contextArray.includes(match.context)
          : true))

      .filter(({match}) =>
        (match.pathname
          ? comparePathname(match.pathname)
       : match.pathnames
          ? match.pathnames.some(comparePathname)
          : true))

      .filter(({match}) =>
        (match.query
          ? compareQuery(match.query)
       : match.queries
          ? match.quieries.some(compareQuery)
          : true))

      .filter(({handle}) =>
        (handle
          ? compareExtractSpec(handle)
          : true))

      .filter(({detail}) =>
        (typeof detail === 'object'
          ? Object.entries(detail)
              .filter(([key]) => key !== 'substring')
              .map(([_key, value]) => value)
              .every(compareExtractSpec)
          : true));

  return [...matchingDescriptors, fallbackDescriptor];
}

export function extractPartFromExternalLink(url, extract, {
  // Set to 'test' to just see if this would extract anything.
  // This disables running custom transformations.
  mode = 'extract',
} = {}) {
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
      value = match[1] ?? match[0];
      break;
    }
  }

  if (mode === 'test') {
    return !!value;
  }

  if (!value) {
    return null;
  }

  if (prefix) {
    value = prefix + value;
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

  function getDetail() {
    if (!descriptor.detail) {
      return null;
    }

    if (typeof descriptor.detail === 'string') {
      return language.$(prefix, descriptor.platform, descriptor.detail);
    } else {
      const {substring, ...rest} = descriptor.detail;

      const opts =
        withEntries(rest, entries => entries
          .map(([key, value]) => [
            key,
            extractPartFromExternalLink(url, value),
          ]));

      return language.$(prefix, descriptor.platform, substring, opts);
    }
  }

  switch (style) {
    case 'platform': {
      const platform = language.$(prefix, descriptor.platform);
      const domain = urlParts(url).domain;

      if (descriptor === fallbackDescriptor) {
        // The fallback descriptor has a "platform" which is just
        // the word "External". This isn't really useful when you're
        // looking for platform info!
        if (domain) {
          return language.sanitize(domain.replace(/^www\./, ''));
        } else {
          return platform;
        }
      } else if (descriptor.detail) {
        return getDetail();
      } else if (descriptor.unusualDomain && domain) {
        return language.$(prefix, 'withDomain', {platform, domain});
      } else {
        return platform;
      }
    }

    case 'handle': {
      if (descriptor.handle) {
        return extractPartFromExternalLink(url, descriptor.handle);
      } else {
        return null;
      }
    }

    case 'icon-id': {
      if (descriptor.icon) {
        return descriptor.icon;
      } else {
        return null;
      }
    }
  }
}

export function couldDescriptorSupportStyle(descriptor, style) {
  if (style === 'platform') {
    return true;
  }

  if (style === 'handle') {
    return !!descriptor.handle;
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
  return (
    Object.fromEntries(
      externalLinkStyles.map(style =>
        getExternalLinkStringOfStyleFromDescriptor(
          url,
          style,
          descriptor, {language}))));
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
