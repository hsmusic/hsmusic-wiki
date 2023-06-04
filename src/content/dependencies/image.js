import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: [
    'getSizeOfImageFile',
    'html',
    'language',
    'thumb',
    'to',
  ],

  data(artTags) {
    const data = {};

    if (artTags) {
      data.contentWarnings =
        artTags
          .filter(tag => tag.isContentWarning)
          .map(tag => tag.name);
    } else {
      data.contentWarnings = null;
    }

    return data;
  },

  generate(data, {
    getSizeOfImageFile,
    html,
    language,
    thumb,
    to,
  }) {
    return html.template({
      annotation: 'image',

      slots: {
        src: {
          type: 'string',
        },

        path: {
          validate: v => v.validateArrayItems(v.isString),
        },

        thumb: {type: 'string'},

        reveal: {type: 'boolean', default: true},
        link: {type: 'boolean', default: false},
        lazy: {type: 'boolean', default: false},
        square: {type: 'boolean', default: false},

        id: {type: 'string'},
        alt: {type: 'string'},
        width: {type: 'number'},
        height: {type: 'number'},

        missingSourceContent: {type: 'html'},
      },

      content(slots) {
        let originalSrc;

        if (slots.src) {
          originalSrc = slots.src;
        } else if (!empty(slots.path)) {
          originalSrc = to(...slots.path);
        } else {
          originalSrc = '';
        }

        const thumbSrc =
          originalSrc &&
            (slots.thumb
              ? thumb[slots.thumb](originalSrc)
              : originalSrc);

        const willLink = typeof slots.link === 'string' || slots.link;

        const willReveal =
          slots.reveal &&
          originalSrc &&
          !empty(data.contentWarnings);

        const willSquare = slots.square;

        const idOnImg = willLink ? null : slots.id;
        const idOnLink = willLink ? slots.id : null;

        if (!originalSrc) {
          return prepare(
            html.tag('div', {class: 'image-text-area'},
              slots.missingSourceContent));
        }

        let fileSize = null;
        if (willLink) {
          const mediaRoot = to('media.root');
          if (originalSrc.startsWith(mediaRoot)) {
            fileSize =
              getSizeOfImageFile(
                originalSrc
                  .slice(mediaRoot.length)
                  .replace(/^\//, ''));
          }
        }

        let reveal = null;
        if (willReveal) {
          reveal = [
            language.$('misc.contentWarnings', {
              warnings: language.formatUnitList(data.contentWarnings),
            }),
            html.tag('br'),
            html.tag('span', {class: 'reveal-interaction'},
              language.$('misc.contentWarnings.reveal')),
          ];
        }

        const imgAttributes = {
          id: idOnImg,
          alt: slots.alt,
          width: slots.width,
          height: slots.height,
          'data-original-size': fileSize,
        };

        const nonlazyHTML =
          originalSrc &&
            prepare(
              html.tag('img', {
                ...imgAttributes,
                src: thumbSrc,
              }));

        if (slots.lazy) {
          return html.tags([
            html.tag('noscript', nonlazyHTML),
            prepare(
              html.tag('img',
                {
                  ...imgAttributes,
                  class: 'lazy',
                  'data-original': thumbSrc,
                }),
              true),
          ]);
        }

        return nonlazyHTML;

        function prepare(content, hide = false) {
          let wrapped = content;

          wrapped =
            html.tag('div', {class: 'image-container'},
              html.tag('div', {class: 'image-inner-area'},
                wrapped));

          if (willReveal) {
            wrapped =
              html.tag('div', {class: 'reveal'}, [
                wrapped,
                html.tag('span', {class: 'reveal-text-container'},
                  html.tag('span', {class: 'reveal-text'},
                    reveal)),
              ]);
          }

          if (willSquare) {
            wrapped =
              html.tag('div',
                {
                  class: [
                    'square',
                    hide && !willLink && 'js-hide'
                  ],
                },

                html.tag('div', {class: 'square-content'},
                  wrapped));
          }

          if (willLink) {
            wrapped = html.tag('a',
              {
                id: idOnLink,
                class: [
                  'box',
                  'image-link',
                  hide && 'js-hide',
                ],

                href:
                  (typeof slots.link === 'string'
                    ? slots.link
                    : originalSrc),
              },
              wrapped);
          }

          return wrapped;
        }
      },
    });
  }
};
