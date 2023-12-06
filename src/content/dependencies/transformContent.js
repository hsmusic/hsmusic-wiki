import {bindFind} from '#find';
import {parseInput} from '#replacer';

import {Marked} from 'marked';

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
  'flash-act': {
    find: 'flashAct',
    link: 'flashAct',
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
  flashAct: 'linkFlashAct',
  groupInfo: 'linkGroup',
  groupGallery: 'linkGroupGallery',
  listing: 'linkListing',
  newsEntry: 'linkNewsEntry',
  staticPage: 'linkStaticPage',
  tag: 'linkArtTag',
  track: 'linkTrackDynamically',
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

const commonMarkedOptions = {
  headerIds: false,
  mangle: false,
};

const multilineMarked = new Marked({
  ...commonMarkedOptions,
});

const inlineMarked = new Marked({
  ...commonMarkedOptions,

  renderer: {
    paragraph(text) {
      return text;
    },
  },
});

const lyricsMarked = new Marked({
  ...commonMarkedOptions,
});

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
                break determineData;
              }

              // Nothing to find: the link operates on a path or string, not a data object.
              if (!spec.find) {
                data.value = replacerValue;
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
      default: 'large',
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

            const {inline, link, width, height, pixelate} = node;

            if (inline) {
              return {
                type: 'image',
                inline: true,
                data:
                  html.tag('img', {
                    src, width, height,
                    class: pixelate && 'pixelate',
                  }),
              };
            }

            const image = relations.images[imageIndex++];

            return {
              type: 'image',
              inline: false,
              data:
                html.tag('div', {class: 'content-image'},
                  image.slots({
                    src,
                    link: link ?? true,
                    width: width ?? null,
                    height: height ?? null,
                    thumb: slots.thumb,
                    class: pixelate && 'pixelate',
                  })),
            };
          }

          case 'link': {
            const linkNode = relations.links[linkIndex++];
            if (linkNode.type === 'text') {
              return {type: 'text', data: linkNode.data};
            }

            const {link, label, hash} = linkNode;

            // These are removed from the typical combined slots({})-style
            // because we don't want to override slots that were already set
            // by something that's wrapping the linkTemplate or linkThing
            // template.
            if (label) link.setSlot('content', label);
            if (hash) link.setSlot('hash', hash);

            // TODO: This is obviously hacky.
            let hasPreferShortNameSlot;
            try {
              link.getSlotDescription('preferShortName');
              hasPreferShortNameSlot = true;
            } catch (error) {
              hasPreferShortNameSlot = false;
            }

            if (hasPreferShortNameSlot) {
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

            return {type: 'text', data: contents.toString()};
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

    // Content always goes through marked (i.e. parsing as Markdown).
    // This does require some attention to detail, mostly to do with line
    // breaks (in multiline mode) and extracting/re-inserting non-text nodes.

    // The content of non-text nodes can end up getting mangled by marked.
    // To avoid this, we replace them with mundane placeholders, then
    // reinsert the content in the correct positions. This also avoids
    // having to stringify tag content within this generate() function.

    const extractNonTextNodes = ({
      getTextNodeContents = node => node.data,
    } = {}) =>
      contentFromNodes
        .map((node, index) => {
          if (node.type === 'text') {
            return getTextNodeContents(node, index);
          }

          const attributes = html.attributes({
            class: 'INSERT-NON-TEXT',
            'data-type': node.type,
          });

          if (node.type === 'image') {
            attributes.set('data-inline', node.inline);
          }

          return `<span ${attributes}>${index}</span>`;
        })
        .join('');

    const reinsertNonTextNodes = (markedOutput) => {
      markedOutput = markedOutput.trim();

      const tags = [];
      const regexp = /<span class="INSERT-NON-TEXT" (.*?)>([0-9]+?)<\/span>/g;

      let deleteParagraph = false;

      const addText = (text) => {
        if (deleteParagraph) {
          text = text.replace(/^<\/p>/, '');
          deleteParagraph = false;
        }

        tags.push(text);
      };

      let match = null, parseFrom = 0;
      while (match = regexp.exec(markedOutput)) {
        addText(markedOutput.slice(parseFrom, match.index));
        parseFrom = match.index + match[0].length;

        const attributes = html.parseAttributes(match[1]);

        // Images that were all on their own line need to be removed from
        // the surrounding <p> tag that marked generates. The HTML parser
        // treats a <div> that starts inside a <p> as a Crocker-class
        // misgiving, and will treat you very badly if you feed it that.
        if (attributes.get('data-type') === 'image') {
          if (!attributes.get('data-inline')) {
            tags[tags.length - 1] = tags[tags.length - 1].replace(/<p>$/, '');
            deleteParagraph = true;
          }
        }

        const nonTextNodeIndex = match[2];
        tags.push(contentFromNodes[nonTextNodeIndex].data);
      }

      if (parseFrom !== markedOutput.length) {
        addText(markedOutput.slice(parseFrom));
      }

      return html.tags(tags, {[html.joinChildren]: ''});
    };

    if (slots.mode === 'inline') {
      const markedInput =
        extractNonTextNodes();

      const markedOutput =
        inlineMarked.parse(markedInput);

      return reinsertNonTextNodes(markedOutput);
    }

    // This is separated into its own function just since we're gonna reuse
    // it in a minute if everything goes to heck in lyrics mode.
    const transformMultiline = () => {
      const markedInput =
        extractNonTextNodes()
          // Compress multiple line breaks into single line breaks,
          // except when they're preceding or following indented
          // text (by at least two spaces).
          .replace(/(?<!  .*)\n{2,}(?!^  )/gm, '\n') /* eslint-disable-line no-regex-spaces */
          // Expand line breaks which don't follow a list, quote,
          // or <br> / "  ", and which don't precede or follow
          // indented text (by at least two spaces).
          .replace(/(?<!^ *-.*|^>.*|^  .*\n*|  $|<br>$)\n+(?!  |\n)/gm, '\n\n') /* eslint-disable-line no-regex-spaces */
          // Expand line breaks which are at the end of a list.
          .replace(/(?<=^ *-.*)\n+(?!^ *-)/gm, '\n\n')
          // Expand line breaks which are at the end of a quote.
          .replace(/(?<=^>.*)\n+(?!^>)/gm, '\n\n');

      const markedOutput =
        multilineMarked.parse(markedInput);

      return reinsertNonTextNodes(markedOutput);
    }

    if (slots.mode === 'multiline') {
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

      const markedInput =
        extractNonTextNodes({
          getTextNodeContents(node, index) {
            // First, replace line breaks that follow text content with
            // <br> tags.
            let content = node.data.replace(/(?!^)\n/gm, '<br>\n');

            // Scrap line breaks that are at the end of a verse.
            content = content.replace(/<br>$(?=\n\n)/gm, '');

            // If the node started with a line break, and it's not the
            // very first node, then whatever came before it was inline.
            // (This is an assumption based on text links being basically
            // the only tag that shows up in lyrics.) Since this text is
            // following content that was already inline, restore that
            // initial line break.
            if (node.data[0] === '\n' && index !== 0) {
              content = '<br>' + content;
            }

            return content;
          },
        });

      const markedOutput =
        lyricsMarked.parse(markedInput);

      return reinsertNonTextNodes(markedOutput);
    }
  },
}
