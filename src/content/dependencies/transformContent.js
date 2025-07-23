import {basename} from 'node:path';

import {logWarn} from '#cli';
import {bindFind} from '#find';
import {replacerSpec, parseContentNodes} from '#replacer';

import {Marked} from 'marked';
import striptags from 'striptags';

const commonMarkedOptions = {
  headerIds: false,
  mangle: false,

  tokenizer: {
    url(src) {
      // Don't link emails
      const cap = this.rules.inline.url.exec(src);
      if (cap?.[2] === '@') return;

      // Use normal tokenizer url behavior otherwise
      // Note that super.url doesn't work here because marked is binding or
      // applying this function on the tokenizer instance - super.prop would
      // just read the prototype of the containing object literal, not the
      // rebound tokenizer. (Thanks MDN.)
      return Object.getPrototypeOf(this).url.call(this, src);
    },
  },
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

function getArg(node, argKey) {
  return (
    node.data.args
      ?.find(({key}) => key.data === argKey)
      ?.value ??
    null);
}

export default {
  contentDependencies: [
    ...(
      Object.values(replacerSpec)
        .map(description => description.link)
        .filter(Boolean)),

    'image',
    'generateTextWithTooltip',
    'generateTooltip',
    'linkExternal',
  ],

  extraDependencies: [
    'html',
    'language',
    'niceShowAggregate',
    'to',
    'wikiData',
  ],

  sprawl(wikiData, content) {
    const find = bindFind(wikiData, {mode: 'quiet'});

    const {result: parsedNodes, error} =
      parseContentNodes(content ?? '', {errorMode: 'return'});

    return {
      error,

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
            let data = {link: spec.link};

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

            return {i: node.i, iEnd: node.iEnd, type: 'internal-link', data};
          }

          if (replacerKey === 'tooltip') {
            // TODO: Again, no recursive nodes. Sorry!
            // const enteredLabel = node.data.label && transformNode(node.data.label, opts);
            const enteredLabel = node.data.label?.data;

            return {
              i: node.i,
              iEnd: node.iEnd,
              type: 'tooltip',
              data: {
                tooltip:
                  replacerValue ?? '(empty tooltip...)',

                label:
                  enteredLabel ?? '(tooltip without label)',

                link:
                  (getArg(node, 'link')
                    ? getArg(node, 'link')[0].data
                    : null),
              },
            };
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

      error:
        sprawl.error,

      nodes:
        sprawl.nodes
          .map(node => {
            switch (node.type) {
              // Replace internal link nodes with a stub. It'll be replaced
              // (by position) with an item from relations.
              //
              // TODO: This should be where label and hash get passed through,
              // rather than in relations... (in which case there's no need to
              // handle it specially here, and we can really just return
              // data.nodes = sprawl.nodes)
              case 'internal-link':
                return {type: 'internal-link'};

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
              name: arg?.name,
              shortName: arg?.shortName ?? arg?.nameShort,
            }
          : getPlaceholder(node, content));

    return {
      textWithTooltip:
        relation('generateTextWithTooltip'),

      tooltip:
        relation('generateTooltip'),

      internalLinks:
        nodes
          .filter(({type}) => type === 'internal-link')
          .map(node => {
            const {link, thing, value} = node.data;

            if (thing) {
              return relationOrPlaceholder(node, link, thing);
            } else if (value && value !== '-') {
              return relationOrPlaceholder(node, link, value);
            } else {
              return relationOrPlaceholder(node, link);
            }
          }),

      externalLinks:
        nodes
          .filter(({type}) => type === 'external-link')
          .map(({data: {href}}) =>
            relation('linkExternal', href)),

      externalLinksForTooltipNodes:
        nodes
          .filter(({type}) => type === 'tooltip')
          .filter(({data}) => data.link)
          .map(({data: {link: href}}) =>
            relation('linkExternal', href)),

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

    indicateExternalLinks: {
      type: 'boolean',
      default: true,
    },

    absorbPunctuationFollowingExternalLinks: {
      type: 'boolean',
      default: true,
    },

    textOnly: {
      type: 'boolean',
      default: false,
    },

    thumb: {
      validate: v => v.is('small', 'medium', 'large'),
      default: 'large',
    },
  },

  generate(data, relations, slots, {html, language, niceShowAggregate, to}) {
    if (data.error) {
      logWarn`Error in content text.`;
      niceShowAggregate(data.error);
    }

    let imageIndex = 0;
    let internalLinkIndex = 0;
    let externalLinkIndex = 0;
    let externalLinkForTooltipNodeIndex = 0;

    let offsetTextNode = 0;

    const contentFromNodes =
      data.nodes.map((node, index) => {
        const nextNode = data.nodes[index + 1];

        const absorbFollowingPunctuation = template => {
          if (nextNode?.type !== 'text') {
            return;
          }

          const text = nextNode.data;
          const match = text.match(/^[.,;:?!…]+(?=[^\n]*[a-z])/i);
          const suffix = match?.[0];
          if (suffix) {
            template.setSlot('suffixNormalContent', suffix);
            offsetTextNode = suffix.length;
          }
        };

        switch (node.type) {
          case 'text': {
            const text = node.data.slice(offsetTextNode);

            offsetTextNode = 0;

            return {type: 'text', data: text};
          }

          case 'image': {
            const src =
              (node.src.startsWith('media/')
                ? to('media.path', node.src.slice('media/'.length))
                : node.src);

            const {
              link,
              style,
              warnings,
              width,
              height,
              align,
              pixelate,
            } = node;

            if (node.inline) {
              let content =
                html.tag('img',
                  src && {src},
                  width && {width},
                  height && {height},
                  style && {style},

                  align && !link &&
                    {class: 'align-' + align},

                  pixelate &&
                    {class: 'pixelate'});

              if (link) {
                content =
                  html.tag('a',
                    {href: link},
                    {target: '_blank'},

                    align &&
                      {class: 'align-' + align},

                    {title:
                      language.encapsulate('misc.external.opensInNewTab', capsule =>
                        language.$(capsule, {
                          link:
                            language.formatExternalLink(link, {
                              style: 'platform',
                            }),

                          annotation:
                            language.$(capsule, 'annotation'),
                        }).toString())},

                    content);
              }

              return {
                type: 'processed-image',
                inline: true,
                data: content,
              };
            }

            const image = relations.images[imageIndex++];

            image.setSlots({
              src,

              link: link ?? true,
              warnings: warnings ?? null,
              thumb: slots.thumb,
            });

            if (width || height) {
              image.setSlot('dimensions', [width ?? null, height ?? null]);
            }

            image.setSlot('attributes', [
              {class: 'content-image'},

              pixelate &&
                {class: 'pixelate'},
            ]);

            return {
              type: 'processed-image',
              inline: false,
              data:
                html.tag('div', {class: 'content-image-container'},
                  align &&
                    {class: 'align-' + align},

                  image),
            };
          }

          case 'video': {
            const src =
              (node.src.startsWith('media/')
                ? to('media.path', node.src.slice('media/'.length))
                : node.src);

            const {width, height, align, inline, pixelate} = node;

            const video =
              html.tag('video',
                src && {src},
                width && {width},
                height && {height},

                {controls: true},

                align && inline &&
                  {class: 'align-' + align},

                pixelate &&
                  {class: 'pixelate'});

            const content =
              (inline
                ? video
                : html.tag('div', {class: 'content-video-container'},
                    align &&
                      {class: 'align-' + align},

                    video));


            return {
              type: 'processed-video',
              data: content,
            };
          }

          case 'audio': {
            const src =
              (node.src.startsWith('media/')
                ? to('media.path', node.src.slice('media/'.length))
                : node.src);

            const {align, inline, nameless} = node;

            const audio =
              html.tag('audio',
                src && {src},

                align && inline &&
                  {class: 'align-' + align},

                {controls: true});

            const content =
              (inline
                ? audio
                : html.tag('div', {class: 'content-audio-container'},
                    align &&
                      {class: 'align-' + align},

                    [
                      !nameless &&
                        html.tag('a', {class: 'filename'},
                          src && {href: src},
                          language.sanitize(basename(node.src))),

                      audio,
                    ]));

            return {
              type: 'processed-audio',
              data: content,
            };
          }

          case 'internal-link': {
            const nodeFromRelations = relations.internalLinks[internalLinkIndex++];
            if (nodeFromRelations.type === 'text') {
              return {type: 'text', data: nodeFromRelations.data};
            }

            // TODO: Try `link.setSlot('linkSlots')` as another
            // way to provide the stuff below.

            // TODO: This is a bit hacky, like the stuff below,
            // but since we dressed it up in a utility function
            // maybe it's okay...
            const link =
              html.resolve(
                nodeFromRelations.link,
                {slots: ['content', 'hash']});

            const {label, hash, shortName, name} = nodeFromRelations;

            if (slots.textOnly) {
              if (label) {
                return {type: 'text', data: label};
              } else if (slots.preferShortLinkNames) {
                return {type: 'text', data: shortName ?? name};
              } else {
                return {type: 'text', data: name};
              }
            }

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
            } catch {
              hasPreferShortNameSlot = false;
            }

            if (hasPreferShortNameSlot) {
              link.setSlot('preferShortName', slots.preferShortLinkNames);
            }

            // TODO: The same, the same.
            let hasTooltipStyleSlot;
            try {
              link.getSlotDescription('tooltipStyle');
              hasTooltipStyleSlot = true;
            } catch {
              hasTooltipStyleSlot = false;
            }

            if (hasTooltipStyleSlot) {
              link.setSlot('tooltipStyle', 'none');
            }

            let doTheAbsorbyThing = false;

            // TODO: This is just silly.
            try {
              const tag = html.resolve(link, {normalize: 'tag'});
              doTheAbsorbyThing ||= tag.attributes.has('class', 'image-media-link');
            } catch {}

            if (doTheAbsorbyThing) {
              absorbFollowingPunctuation(link);
            }

            return {type: 'processed-internal-link', data: link};
          }

          case 'external-link': {
            const {label} = node.data;
            const externalLink = relations.externalLinks[externalLinkIndex++];

            if (slots.textOnly) {
              return {type: 'text', data: label};
            }

            externalLink.setSlots({
              content: label,
              fromContent: true,
            });

            if (slots.absorbPunctuationFollowingExternalLinks) {
              absorbFollowingPunctuation(externalLink);
            }

            if (slots.indicateExternalLinks) {
              externalLink.setSlots({
                indicateExternal: true,
                tab: 'separate',
                style: 'platform',
              });
            }

            return {type: 'processed-external-link', data: externalLink};
          }

          case 'tooltip': {
            const {label, link, tooltip: tooltipContent} = node.data;

            const externalLink =
              (link
                ? relations.externalLinksForTooltipNodes
                    .at(externalLinkForTooltipNodeIndex++)
                : null);

            if (externalLink) {
              externalLink.setSlots({
                content: label,
                fromContent: true,
              });

              if (slots.indicateExternalLinks) {
                externalLink.setSlots({
                  indicateExternal: true,
                  disableBrowserTooltip: true,
                  tab: 'separate',
                  style: 'platform',
                });
              }
            }

            const textWithTooltip = relations.textWithTooltip.clone();
            const tooltip = relations.tooltip.clone();

            tooltip.setSlots({
              attributes: {class: 'content-tooltip'},
              content: tooltipContent, // Not sanitized!
            });

            textWithTooltip.setSlots({
              attributes: [
                {class: 'content-tooltip-guy'},
                externalLink && {class: 'has-link'},
              ],

              text: externalLink ?? label,
              tooltip,
            });

            return {type: 'processed-tooltip', data: textWithTooltip};
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

            const content =
              (htmlFn
                ? htmlFn(value, {html, language})
                : value);

            const contentText =
              html.resolve(content, {normalize: 'string'});

            if (slots.textOnly) {
              return {type: 'text', data: striptags(contentText)};
            } else {
              return {type: 'text', data: contentText};
            }
          }

          default:
            return getPlaceholder(node, data.content);
        }
      });

    // In single-link mode, return the link node exactly as is - exposing
    // access to its slots.

    if (slots.mode === 'single-link') {
      const link =
        contentFromNodes.find(node =>
          node.type === 'processed-internal-link' ||
          node.type === 'processed-external-link');

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

          let attributes = `class="INSERT-NON-TEXT" data-type="${node.type}"`;

          if (node.type === 'processed-image' && node.inline) {
            attributes += ` data-inline`;
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

        // Images (or videos) that were all on their own line need to be
        // removed from the surrounding <p> tag that marked generates.
        // The HTML parser treats a <div> that starts inside a <p> as a
        // Crocker-class misgiving, and will treat you very badly if you
        // feed it that.
        if (
          (attributes.get('data-type') === 'processed-image' &&
          !attributes.get('data-inline')) ||
          attributes.get('data-type') === 'processed-video' ||
          attributes.get('data-type') === 'processed-audio'
        ) {
          tags[tags.length - 1] = tags[tags.length - 1].replace(/<p>$/, '');
          deleteParagraph = true;
        }

        const nonTextNodeIndex = match[2];
        tags.push(contentFromNodes[nonTextNodeIndex].data);
      }

      if (parseFrom !== markedOutput.length) {
        addText(markedOutput.slice(parseFrom));
      }

      return (
        html.tags(tags, {
          [html.joinChildren]: '',
          [html.onlyIfContent]: true,
        }));
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
          .replace(/(?<!^ *(?:-|\d+\.).*|^>.*|^  .*\n*|  $|<br>$)\n+(?!  |\n)/gm, '\n\n') /* eslint-disable-line no-regex-spaces */
          // Expand line breaks which are at the end of a list.
          .replace(/(?<=^ *(?:-|\d+\.).*)\n+(?!^ *(?:-|\d+\.))/gm, '\n\n')
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
          getTextNodeContents(node) {
            // Just insert <br> before every line break. The resulting
            // text will appear all in one paragraph - this is expected
            // for lyrics, and allows for multiple lines of proportional
            // space between stanzas.
            return node.data.replace(/\n/g, '<br>\n');
          },
        });

      const markedOutput =
        lyricsMarked.parse(markedInput);

      return reinsertNonTextNodes(markedOutput);
    }
  },
}
