import {stitchArrays} from '#sugar';

const fallbackDescriptor = {
  icon: 'globe',
  string: 'external',

  normal: 'domain',
  compact: 'domain',
};

// TODO: Define all this stuff in data!
const externalSpec = [
  {
    matchDomain: 'bandcamp.com',

    icon: 'bandcamp',
    string: 'bandcamp',

    compact: 'handle',

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

function determineLinkText(url, descriptor, {language}) {
  const prefix = 'misc.external';

  const {
    hostname: domain,
    pathname,
  } = new URL(url);

  let normal = null;
  let compact = null;

  const place = language.$(prefix, descriptor.string);

  if (descriptor.normal === 'domain') {
    normal = language.$(prefix, 'withDomain', {place, domain});
  }

  if (descriptor.compact === 'domain') {
    compact = domain.replace(/^www\./, '');
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
    compact = handle;
  }

  if (normal === 'handle' && handle) {
    normal = language.$(prefix, 'withHandle', {place, handle});
  }

  normal ??= language.$(prefix, descriptor.string);

  return {normal, compact};
}

export default {
  extraDependencies: ['html', 'language', 'to'],

  data(url) {
    return {url};
  },

  slots: {
    withText: {type: 'boolean'},
  },

  generate(data, slots, {html, language, to}) {
    const {hostname: domain} = new URL(data.url);

    const descriptor =
      externalSpec.find(({matchDomain, matchDomains}) => {
        const compare = d => domain.includes(d);
        if (matchDomain && compare(matchDomain)) return true;
        if (matchDomains && matchDomains.some(compare)) return true;
        return false;
      }) ?? fallbackDescriptor;

    const {normal: normalText, compact: compactText} =
      determineLinkText(data.url, descriptor, {language});

    return html.tag('a',
      {href: data.url, class: ['icon', slots.withText && 'has-text']},
      [
        html.tag('svg', [
          !slots.withText &&
            html.tag('title', normalText),

          html.tag('use', {
            href: to('shared.staticIcon', descriptor.icon),
          }),
        ]),

        slots.withText &&
          html.tag('span', {class: 'icon-text'},
            compactText ?? normalText),
      ]);
  },
};
