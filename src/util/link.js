// This file is essentially one level of a8straction a8ove urls.js (and the
// urlSpec it gets its paths from). It's a 8unch of utility functions which
// take certain types of wiki data o8jects (colloquially known as "things")
// and return actual <a href> HTML link tags.
//
// The functions we're cre8ting here (all factory-style) take a "to" argument,
// which is roughly a function which takes a urlSpec key and spits out a path
// to 8e stuck in an href or src or suchever. There are also a few other
// options availa8le in all the functions, making a common interface for
// gener8ting just a8out any link on the site.

import * as html from './html.js';

import T from '../data/things/index.js';

export function unbound_getLinkThemeString(color, {
  getColors,
}) {
  if (!color) return '';

  const {primary, dim} = getColors(color);
  return `--primary-color: ${primary}; --dim-color: ${dim}`;
}

const appendIndexHTMLRegex = /^(?!https?:\/\/).+\/$/;

function linkHelper({
  path: pathOption,

  expectThing = true,
  color: colorOption = true,

  attr: attrOption = null,
  data: dataOption = null,
  text: textOption = null,
}) {
  const generateLink = (data, {
    getLinkThemeString,
    to,

    text = '',
    attributes = null,
    class: className = '',
    color = true,
    hash = '',
    preferShortName = false,
  }) => {
    const path = (expectThing ? pathOption(data) : pathOption());
    let href = to(...path);

    if (link.globalOptions.appendIndexHTML) {
      if (appendIndexHTMLRegex.test(href)) {
        href += 'index.html';
      }
    }

    if (hash) {
      href += (hash.startsWith('#') ? '' : '#') + hash;
    }

    return html.tag('a',
      {
        ...(attrOption ? attrOption(data) : {}),
        ...(attributes ? attributes : {}),
        href,
        style:
          typeof color === 'string'
            ? getLinkThemeString(color)
            : color && colorOption
            ? getLinkThemeString(data.color)
            : '',
        class: className,
      },

      (text ||
        (textOption
          ? textOption(data)
          : (preferShortName
              ? data.nameShort ?? data.name
              : data.name))));
  };

  generateLink.data = thing => {
    if (!expectThing) {
      throw new Error(`This kind of link doesn't need any data serialized`);
    }

    const data = (dataOption ? dataOption(thing) : {});

    if (colorOption) {
      data.color = thing.color;
    }

    if (!textOption) {
      data.name = thing.name;
      data.nameShort = thing.nameShort ?? thing.name;
    }

    return data;
  };

  return generateLink;
}

function linkDirectory(key, {
  exposeDirectory = null,
  prependLocalized = true,

  data = null,
  attr = null,
  ...conf
}) {
  return linkHelper({
    data: thing => ({
      ...(data ? data(thing) : {}),
      directory: thing.directory,
    }),

    path: data =>
      (prependLocalized
        ? ['localized.' + key, data.directory]
        : [key, data.directory]),

    attr: (data) => ({
      ...(attr ? attr(data) : {}),
      ...(exposeDirectory ? {[exposeDirectory]: data.directory} : {}),
    }),

    ...conf,
  });
}

function linkIndex(key, conf) {
  return linkHelper({
    path: () => [key],

    expectThing: false,
    ...conf,
  });
}

function linkAdditionalFile(key, conf) {
  return linkHelper({
    data: ({file, album}) => ({
      directory: album.directory,
      file,
    }),

    path: data => ['media.albumAdditionalFile', data.directory, data.file],

    color: false,
    ...conf,
  });
}

// Mapping of Thing constructor classes to the key for a link.x() function.
// These represent a sensible "default" link, i.e. to the primary page for
// the given thing based on what it's an instance of. This is used for the
// link.anything() function.
const linkAnythingMapping = [
  [T.Album, 'album'],
  [T.Artist, 'artist'],
  [T.ArtTag, 'tag'],
  [T.Flash, 'flash'],
  [T.Group, 'groupInfo'],
  [T.NewsEntry, 'newsEntry'],
  [T.StaticPage, 'staticPage'],
  [T.Track, 'track'],
];

const link = {
  globalOptions: {
    // This should usually only 8e used during development! It'll take any
    // href that ends with `/` and append `index.html` to the returned
    // value (for to.thing() functions). This is handy when developing
    // without a local server (i.e. using file:// protocol URLs in your
    // we8 8rowser), 8ut isn't guaranteed to 8e 100% 8ug-free.
    appendIndexHTML: false,
  },

  album: linkDirectory('album'),
  albumAdditionalFile: linkAdditionalFile('albumAdditionalFile'),
  albumGallery: linkDirectory('albumGallery'),
  albumCommentary: linkDirectory('albumCommentary'),
  artist: linkDirectory('artist', {color: false}),
  artistGallery: linkDirectory('artistGallery', {color: false}),
  commentaryIndex: linkIndex('commentaryIndex', {color: false}),
  flashIndex: linkIndex('flashIndex', {color: false}),
  flash: linkDirectory('flash'),
  groupInfo: linkDirectory('groupInfo'),
  groupGallery: linkDirectory('groupGallery'),
  home: linkIndex('home', {color: false}),
  listingIndex: linkIndex('listingIndex'),
  listing: linkDirectory('listing'),
  newsIndex: linkIndex('newsIndex', {color: false}),
  newsEntry: linkDirectory('newsEntry', {color: false}),
  staticPage: linkDirectory('staticPage', {color: false}),
  tag: linkDirectory('tag'),
  track: linkDirectory('track', {exposeDirectory: 'data-track'}),

  media: linkDirectory('media.path', {
    prependLocalized: false,
    color: false,
  }),

  root: linkDirectory('shared.path', {
    prependLocalized: false,
    color: false,
  }),
  data: linkDirectory('data.path', {
    prependLocalized: false,
    color: false,
  }),

  site: linkDirectory('localized.path', {
    prependLocalized: false,
    color: false,
  }),

  // This is NOT an arrow functions because it should be callable for other
  // "this" objects - i.e, if we bind arguments in other functions on the same
  // link object, link.anything() should use those bound functions, not the
  // original ones we're exporting here.
  //
  // This function has been through a lot of names:
  //   - getHrefOfAnythingMan (2020-05-25)
  //   - toAnythingMan (2021-03-02)
  //   - linkAnythingMan (2021-05-14)
  //   - link.anything (2022-09-15)
  // ...And it'll probably end up being renamed yet again one day!
  //
  anything(...args) {
    if (!this) {
      throw new Error(`Missing value for \`this\` - investigate JS call stack`);
    }

    const [thing] = args;

    for (const [constructor, fnKey] of linkAnythingMapping) {
      if (thing instanceof constructor) {
        return Reflect.apply(this[fnKey], this, args);
      }
    }

    throw new Error(`Unrecognized type of thing for linking: ${thing}`);
  },
};

export {
  unbound_getLinkThemeString as getLinkThemeString,
};

export default link;
