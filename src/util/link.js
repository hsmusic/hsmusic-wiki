/** @format */

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
import {getColors} from './colors.js';

import {
  Album,
  Artist,
  ArtTag,
  Flash,
  Group,
  NewsEntry,
  StaticPage,
  Track,
} from '../data/things.js';

export function getLinkThemeString(color) {
  if (!color) return '';

  const {primary, dim} = getColors(color);
  return `--primary-color: ${primary}; --dim-color: ${dim}`;
}

const appendIndexHTMLRegex = /^(?!https?:\/\/).+\/$/;

const linkHelper =
  (hrefFn, {color = true, attr = null} = {}) =>
  (
    thing,
    {
      to,
      text = '',
      attributes = null,
      class: className = '',
      color: color2 = true,
      hash = '',
    }
  ) => {
    let href = hrefFn(thing, {to});

    if (link.globalOptions.appendIndexHTML) {
      if (appendIndexHTMLRegex.test(href)) {
        href += 'index.html';
      }
    }

    if (hash) {
      href += (hash.startsWith('#') ? '' : '#') + hash;
    }

    return html.tag(
      'a',
      {
        ...(attr ? attr(thing) : {}),
        ...(attributes ? attributes : {}),
        href,
        style:
          typeof color2 === 'string'
            ? getLinkThemeString(color2)
            : color2 && color
            ? getLinkThemeString(thing.color)
            : '',
        class: className,
      },
      text || thing.name
    );
  };

const linkDirectory = (key, {expose = null, attr = null, ...conf} = {}) =>
  linkHelper((thing, {to}) => to('localized.' + key, thing.directory), {
    attr: (thing) => ({
      ...(attr ? attr(thing) : {}),
      ...(expose ? {[expose]: thing.directory} : {}),
    }),
    ...conf,
  });

const linkPathname = (key, conf) =>
  linkHelper(({directory: pathname}, {to}) => to(key, pathname), conf);
const linkIndex = (key, conf) =>
  linkHelper((_, {to}) => to('localized.' + key), conf);

// Mapping of Thing constructor classes to the key for a link.x() function.
// These represent a sensible "default" link, i.e. to the primary page for
// the given thing based on what it's an instance of. This is used for the
// link.anything() function.
const linkAnythingMapping = [
  [Album, 'album'],
  [Artist, 'artist'],
  [ArtTag, 'tag'],
  [Flash, 'flash'],
  [Group, 'groupInfo'],
  [NewsEntry, 'newsEntry'],
  [StaticPage, 'staticPage'],
  [Track, 'track'],
];

const link = {
  globalOptions: {
    // This should usually only 8e used during development! It'll take any
    // href that ends with `/` and append `index.html` to the returned
    // value (for to.thing() functions). This is handy when developing
    // without a local server (i.e. using file:// protocol URLs in your
    // 8rowser), 8ut isn't guaranteed to 8e 100% 8ug-free.
    appendIndexHTML: false,
  },

  album: linkDirectory('album'),
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
  track: linkDirectory('track', {expose: 'data-track'}),

  // TODO: This is a bit hacky. Files are just strings (not objects), so we
  // have to manually provide the album alongside the file. They also don't
  // follow the usual {name: whatever} type shape, so we have to provide that
  // ourselves.
  _albumAdditionalFileHelper: linkHelper(
    (fakeFileObject, {to}) =>
      to(
        'media.albumAdditionalFile',
        fakeFileObject.album.directory,
        fakeFileObject.name
      ),
    {color: false}
  ),
  albumAdditionalFile: ({file, album}, {to}) =>
    link._albumAdditionalFileHelper(
      {
        name: file,
        album,
      },
      {to}
    ),

  media: linkPathname('media.path', {color: false}),
  root: linkPathname('shared.path', {color: false}),
  data: linkPathname('data.path', {color: false}),
  site: linkPathname('localized.path', {color: false}),

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

export default link;
