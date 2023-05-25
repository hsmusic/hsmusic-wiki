import {bindFind} from '../../util/find.js';
import {parseInput} from '../../util/replacer.js';
import {replacerSpec} from '../../util/transform-content.js';

const linkThingRelationMap = {
  album: 'linkAlbum',
  albumCommentary: 'linkAlbumCommentary',
  albumGallery: 'linkAlbumGallery',
  artist: 'linkArtist',
  artistGallery: 'linkArtistGallery',
  flash: 'linkFlash',
  group: 'linkGroup',
  groupGallery: 'linkGroupGallery',
  listing: 'linkListing',
  newsEntry: 'linkNewsEntry',
  staticPage: 'linkStaticPage',
  tag: 'linkArtTag',
  track: 'linkTrack',
};

const linkValueRelationMap = {
  // media: 'linkPathFromMedia',
  // root: 'linkPathFromRoot',
  // site: 'linkPathFromSite',
};

const linkIndexRelationMap = {
  // commentaryIndex: 'linkCommentaryIndex',
  // flashIndex: 'linkFlashIndex',
  // home: 'linkHome',
  // listingIndex: 'linkListingIndex',
  // newsIndex: 'linkNewsIndex',
};

function getPlaceholder(node, content) {
  return {type: 'text', data: content.slice(node.i, node.iEnd)};
}

export default {
  contentDependencies: [
    ...Object.values(linkThingRelationMap),
    ...Object.values(linkValueRelationMap),
    ...Object.values(linkIndexRelationMap),
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

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
              if (!replacerValue) {
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
                  ? transformName(data.thing.name)
                  : null);

            data.hash = enteredHash ?? null;

            return {i: node.i, iEnd: node.iEnd, type: 'link', data};
          }

          // This will be another {type: 'tag'} node which gets processed in
          // generate.
          return node;
        }),
    };
  },

  data(sprawl, content) {
    return {
      content,

      nodes:
        sprawl.nodes
          .map(node => {
            // Replace link nodes with a stub. It'll be replaced (by position)
            // with an item from relations.
            if (node.type === 'link') {
              return {type: 'link'};
            }

            // Other nodes will get processed in generate.
            return node;
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
            } else if (value) {
              return relationOrPlaceholder(node, linkValueRelationMap[key], value);
            } else {
              return relationOrPlaceholder(node, linkIndexRelationMap[key]);
            }
          }),
    };
  },

  generate(data, relations, {html, language}) {
    let linkIndex = 0;

    // This array contains only straight text and link nodes, which are directly
    // representable in html (so no further processing is needed on the level of
    // individual nodes).
    const contentFromNodes =
      data.nodes.map(node => {
        if (node.type === 'text') {
          return {type: 'text', data: node.data};
        }

        if (node.type === 'link') {
          const {link, label, hash} = relations.links[linkIndex++];
          return {
            type: 'link',
            data: link.slots({content: label, hash}),
          };
        }

        if (node.type === 'tag') {
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

        return getPlaceholder(node, data.content);
      });

    return html.template({
      annotation: `transformContent`,

      slots: {
        mode: {
          validate: v => v.is('inline', 'multiline', 'lyrics'),
          default: 'multiline',
        },
      },

      content(slots) {
        // In inline mode, no further processing is needed!

        if (slots.mode === 'inline') {
          return html.tags(contentFromNodes.map(node => node.data));
        }

        // In multiline mode...

        if (slots.mode === 'multiline') {
          return html.tags(contentFromNodes.map(node => node.data));
        }

        // In lyrics mode...

        if (slots.mode === 'lyrics') {
          return html.tags(contentFromNodes.map(node => node.data));
        }
      },
    });
  },
}
