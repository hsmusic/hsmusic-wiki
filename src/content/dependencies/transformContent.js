import {marked} from 'marked';

import {bindFind} from '../../util/find.js';
import {parseInput} from '../../util/replacer.js';

export const replacerSpec = {
  album: {
    find: 'album',
    link: 'album',
  },
  'album-commentary': {
    find: 'album',
    link: 'albumCommentary',
  },
  'album-gallery': {
    find: 'album',
    link: 'albumGallery',
  },
  artist: {
    find: 'artist',
    link: 'artist',
  },
  'artist-gallery': {
    find: 'artist',
    link: 'artistGallery',
  },
  'commentary-index': {
    find: null,
    link: 'commentaryIndex',
  },
  date: {
    find: null,
    value: (ref) => new Date(ref),
    html: (date, {html, language}) =>
      html.tag('time',
        {datetime: date.toUTCString()},
        language.formatDate(date)),
  },
  'flash-index': {
    find: null,
    link: 'flashIndex',
  },
  flash: {
    find: 'flash',
    link: 'flash',
    transformName(name, node, input) {
      const nextCharacter = input[node.iEnd];
      const lastCharacter = name[name.length - 1];
      if (![' ', '\n', '<'].includes(nextCharacter) && lastCharacter === '.') {
        return name.slice(0, -1);
      } else {
        return name;
      }
    },
  },
  group: {
    find: 'group',
    link: 'groupInfo',
  },
  'group-gallery': {
    find: 'group',
    link: 'groupGallery',
  },
  home: {
    find: null,
    link: 'home',
  },
  'listing-index': {
    find: null,
    link: 'listingIndex',
  },
  listing: {
    find: 'listing',
    link: 'listing',
  },
  media: {
    find: null,
    link: 'media',
  },
  'news-index': {
    find: null,
    link: 'newsIndex',
  },
  'news-entry': {
    find: 'newsEntry',
    link: 'newsEntry',
  },
  root: {
    find: null,
    link: 'root',
  },
  site: {
    find: null,
    link: 'site',
  },
  static: {
    find: 'staticPage',
    link: 'staticPage',
  },
  string: {
    find: null,
    value: (ref) => ref,
    html: (ref, {language, args}) => language.$(ref, args),
  },
  tag: {
    find: 'artTag',
    link: 'tag',
  },
  track: {
    find: 'track',
    link: 'track',
  },
};

const linkThingRelationMap = {
  album: 'linkAlbum',
  albumCommentary: 'linkAlbumCommentary',
  albumGallery: 'linkAlbumGallery',
  artist: 'linkArtist',
  artistGallery: 'linkArtistGallery',
  flash: 'linkFlash',
  groupInfo: 'linkGroup',
  groupGallery: 'linkGroupGallery',
  listing: 'linkListing',
  newsEntry: 'linkNewsEntry',
  staticPage: 'linkStaticPage',
  tag: 'linkArtTag',
  track: 'linkTrack',
};

const linkValueRelationMap = {
  media: 'linkPathFromMedia',
  root: 'linkPathFromRoot',
  site: 'linkPathFromSite',
};

const linkIndexRelationMap = {
  commentaryIndex: 'linkCommentaryIndex',
  flashIndex: 'linkFlashIndex',
  home: 'linkWikiHome',
  listingIndex: 'linkListingIndex',
  newsIndex: 'linkNewsIndex',
};

function getPlaceholder(node, content) {
  return {type: 'text', data: content.slice(node.i, node.iEnd)};
}

export default {
  contentDependencies: [
    ...Object.values(linkThingRelationMap),
    ...Object.values(linkValueRelationMap),
    ...Object.values(linkIndexRelationMap),
    'image',
  ],

  extraDependencies: ['html', 'language', 'to', 'wikiData'],

  sprawl(wikiData, content) {
    const find = bindFind(wikiData);

    const parsedNodes = parseInput(content);

    return {
      nodes: parsedNodes
        .map(node => {
          if (node.type !== 'tag') {
            return node;
          }

          const placeholder = getPlaceholder(node, content);

          const replacerKeyImplied = !node.data.replacerKey;
          const replacerKey = replacerKeyImplied ? 'track' : node.data.replacerKey.data;

          // TODO: We don't support recursive nodes like before, at the moment. Sorry!
          // const replacerValue = transformNodes(node.data.replacerValue, opts);
          const replacerValue = node.data.replacerValue[0].data;

          const spec = replacerSpec[replacerKey];

          if (!spec) {
            return placeholder;
          }

          if (spec.link) {
            let data = {key: spec.link};

            determineData: {
              // No value at all: this is an index link.
              if (!replacerValue || replacerValue === '-') {
                data.toIndex = true;
                break determineData;
              }

              // Nothing to find: the link operates on a path or string, not a data object.
              if (!spec.find) {
                data.value = replacerValue;
                data.toIndex = false;
                break determineData;
              }

              const thing =
                find[spec.find](
                  (replacerKeyImplied
                    ? replacerValue
                    : replacerKey + `:` + replacerValue),
                  wikiData);

              // Nothing was found: this is unexpected, so return placeholder.
              if (!thing) {
                return placeholder;
              }

              // Something was found: the link operates on that thing.
              data.thing = thing;
              data.toIndex = false;
            }

            const {transformName} = spec;

            // TODO: Again, no recursive nodes. Sorry!
            // const enteredLabel = node.data.label && transformNode(node.data.label, opts);
            const enteredLabel = node.data.label?.data;
            const enteredHash = node.data.hash?.data;

            data.label =
              enteredLabel ??
                (transformName && data.thing.name
                  ? transformName(data.thing.name, node, content)
                  : null);

            data.hash = enteredHash ?? null;

            return {i: node.i, iEnd: node.iEnd, type: 'link', data};
          }

          // This will be another {type: 'tag'} node which gets processed in
          // generate. Extract replacerKey and replacerValue now, since it'd
          // be a pain to deal with later.
          return {
            ...node,
            data: {
              ...node.data,
              replacerKey: node.data.replacerKey.data,
              replacerValue: node.data.replacerValue[0].data,
            },
          };
        }),
    };
  },

  data(sprawl, content) {
    return {
      content,

      nodes:
        sprawl.nodes
          .map(node => {
            switch (node.type) {
              // Replace link nodes with a stub. It'll be replaced (by position)
              // with an item from relations.
              case 'link':
                return {type: 'link'};

              // Other nodes will get processed in generate.
              default:
                return node;
            }
          }),
    };
  },

  relations(relation, sprawl, content) {
    const {nodes} = sprawl;

    const relationOrPlaceholder =
      (node, name, arg) =>
        (name
          ? {
              link: relation(name, arg),
              label: node.data.label,
              hash: node.data.hash,
              toIndex: node.data.toIndex,
            }
          : getPlaceholder(node, content));

    return {
      links:
        nodes
          .filter(({type}) => type === 'link')
          .map(node => {
            const {key, thing, value} = node.data;

            if (thing) {
              return relationOrPlaceholder(node, linkThingRelationMap[key], thing);
            } else if (value && value !== '-') {
              return relationOrPlaceholder(node, linkValueRelationMap[key], value);
            } else {
              return relationOrPlaceholder(node, linkIndexRelationMap[key]);
            }
          }),

      images:
        nodes
          .filter(({type}) => type === 'image')
          .filter(({inline}) => !inline)
          .map(() => relation('image')),
    };
  },

  slots: {
    mode: {
      validate: v => v.is('inline', 'multiline', 'lyrics', 'single-link'),
      default: 'multiline',
    },

    preferShortLinkNames: {
      type: 'boolean',
      default: false,
    },

    thumb: {
      validate: v => v.is('small', 'medium', 'large'),
    },
  },

  generate(data, relations, slots, {html, language, to}) {
    let linkIndex = 0;
    let imageIndex = 0;

    // This array contains only straight text and link nodes, which are directly
    // representable in html (so no further processing is needed on the level of
    // individual nodes).
    const contentFromNodes =
      data.nodes.map(node => {
        switch (node.type) {
          case 'text':
            return {type: 'text', data: node.data};

          case 'image': {
            const src =
              (node.src.startsWith('media/')
                ? to('media.path', node.src.slice('media/'.length))
                : node.src);

            const {link, width, height} = node;

            if (node.inline) {
              return {
                type: 'image',
                data:
                  html.tag('img', {src, width, height}),
              };
            }

            const image = relations.images[imageIndex++];

            return {
              type: 'image',
              data:
                html.tag('div', {class: 'content-image'},
                  image.slots({
                    src,
                    link: link ?? true,
                    width: width ?? null,
                    height: height ?? null,
                    thumb: slots.thumb,
                  })),
            };
          }

          case 'link': {
            const linkNode = relations.links[linkIndex++];
            if (linkNode.type === 'text') {
              return {type: 'text', data: linkNode.data};
            }

            const {link, label, hash, toIndex} = linkNode;

            // These are removed from the typical combined slots({})-style
            // because we don't want to override slots that were already set
            // by something that's wrapping the linkTemplate or linkThing
            // template.
            if (label) link.setSlot('content', label);
            if (hash) link.setSlot('hash', hash);

            if (toIndex) {
              link.setSlot('preferShortName', slots.preferShortLinkNames);
            }

            return {type: 'link', data: link};
          }

          case 'tag': {
            const {replacerKey, replacerValue} = node.data;

            const spec = replacerSpec[replacerKey];

            if (!spec) {
              return getPlaceholder(node, data.content);
            }

            const {value: valueFn, html: htmlFn} = spec;

            const value =
              (valueFn
                ? valueFn(replacerValue)
                : replacerValue);

            const contents =
              (htmlFn
                ? htmlFn(value, {html, language})
                : value);

            return {type: 'text', data: contents};
          }

          default:
            return getPlaceholder(node, data.content);
        }
      });

    // In single-link mode, return the link node exactly as is - exposing
    // access to its slots.

    if (slots.mode === 'single-link') {
      const link = contentFromNodes.find(node => node.type === 'link');

      if (!link) {
        return html.blank();
      }

      return link.data;
    }

    // In inline mode, no further processing is needed!

    if (slots.mode === 'inline') {
      return html.tags(contentFromNodes.map(node => node.data));
    }

    // Multiline mode has a secondary processing stage where it's passed...
    // through marked! Rolling your own Markdown only gets you so far :D

    const markedOptions = {
      headerIds: false,
      mangle: false,
    };

    // This is separated into its own function just since we're gonna reuse
    // it in a minute if everything goes to heck in lyrics mode.
    const transformMultiline = () => {
      const markedInput =
        contentFromNodes
          .map(node => {
            if (node.type === 'text') {
              return node.data;
            } else {
              return node.data.toString();
            }
          })
          .join('')

          // Compress multiple line breaks into single line breaks.
          .replace(/\n{2,}/g, '\n')
          // Expand line breaks which don't follow a list, quote,
          // or <br> / "  ".
          .replace(/(?<!^ *-.*|^>.*|  $|<br>$)\n+/gm, '\n\n') /* eslint-disable-line no-regex-spaces */
          // Expand line breaks which are at the end of a list.
          .replace(/(?<=^ *-.*)\n+(?!^ *-)/gm, '\n\n')
          // Expand line breaks which are at the end of a quote.
          .replace(/(?<=^>.*)\n+(?!^>)/gm, '\n\n');

      const markedOutput =
        marked.parse(markedInput, markedOptions)
          // Images that were all on their own line need to be removed from
          // the surrounding <p> tag that marked generates. The HTML parser
          // treats a <div> that starts inside a <p> as a Crocker-class
          // misgiving, and will treat you very badly if you feed it that.
          .replace(
            /^<p>(<a class="[^"]*?image-link.*?<\/a>)<\/p>$/gm,
            (match, a) => a);

      return markedOutput;
    }

    if (slots.mode === 'multiline') {
      // Unfortunately, we kind of have to be super evil here and stringify
      // the links, or else parse marked's output into html tags, which is
      // very out of scope at the moment.
      return transformMultiline();
    }

    // Lyrics mode goes through marked too, but line breaks are processed
    // differently. Instead of having each line get its own paragraph,
    // "adjacent" lines are joined together (with blank lines separating
    // each verse/paragraph).

    if (slots.mode === 'lyrics') {
      // If it looks like old data, using <br> instead of bunched together
      // lines... then oh god... just use transformMultiline. Perishes.
      if (
        contentFromNodes.some(node =>
          node.type === 'text' &&
          node.data.includes('<br'))
      ) {
        return transformMultiline();
      }

      // Lyrics mode is also evil for the same stringifying reasons as
      // multiline.
      return marked.parse(
        contentFromNodes
          .map(node => {
            if (node.type === 'text') {
              return node.data.replace(/\b\n\b/g, '<br>\n');
            } else {
              return node.data.toString();
            }
          })
          .join(''),
        markedOptions);
    }
  },
}
