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
    return html.template(slot =>
      slot('src', ([src]) =>
      slot('path', ([...path]) =>
      slot('thumb', ([thumbKey = '']) =>
      slot('link', ([link = false]) =>
      slot('lazy', ([lazy = false]) =>
      slot('square', ([willSquare = false]) => {
        let originalSrc;

        if (src) {
          originalSrc = src;
        } else if (!empty(path)) {
          originalSrc = to(...path);
        } else {
          originalSrc = '';
        }

        const thumbSrc =
          originalSrc &&
            (thumbKey
              ? thumb[thumbKey](originalSrc)
              : originalSrc);

        const willLink = typeof link === 'string' || link;
        const willReveal = originalSrc && !empty(data.contentWarnings);

        const idOnImg = willLink ? null : slot('id');
        const idOnLink = willLink ? slot('id') : null;

        if (!originalSrc) {
          return prepare(
            html.tag('div', {class: 'image-text-area'},
              slot('missingSourceContent')));
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

        const className = slot('class');
        const imgAttributes = {
          id: idOnImg,
          class: className,
          alt: slot('alt'),
          width: slot('width'),
          height: slot('height'),
          'data-original-size': fileSize,
        };

        const nonlazyHTML =
          originalSrc &&
            prepare(
              html.tag('img', {
                ...imgAttributes,
                src: thumbSrc,
              }));

        if (lazy) {
          return html.tags([
            html.tag('noscript', nonlazyHTML),
            prepare(
              html.tag('img',
                {
                  ...imgAttributes,
                  class: [className, 'lazy'],
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
              wrapped);

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
                  (typeof link === 'string'
                    ? link
                    : originalSrc),
              },
              wrapped);
          }

          return wrapped;
        }
      })))))));
    },
};
