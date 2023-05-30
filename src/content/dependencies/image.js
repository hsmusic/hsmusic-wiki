import {empty} from '#sugar';

export default {
  extraDependencies: [
    'getDimensionsOfImagePath',
    'getSizeOfImagePath',
    'getThumbnailEqualOrSmaller',
    'getThumbnailsAvailableForDimensions',
    'html',
    'language',
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

  slots: {
    src: {type: 'string'},

    path: {
      validate: v => v.validateArrayItems(v.isString),
    },

    thumb: {type: 'string'},

    link: {
      validate: v => v.oneOf(v.isBoolean, v.isString),
      default: false,
    },

    reveal: {type: 'boolean', default: true},
    lazy: {type: 'boolean', default: false},
    square: {type: 'boolean', default: false},

    id: {type: 'string'},
    class: {type: 'string'},
    alt: {type: 'string'},
    width: {type: 'number'},
    height: {type: 'number'},

    missingSourceContent: {type: 'html'},
  },

  generate(data, slots, {
    getDimensionsOfImagePath,
    getSizeOfImagePath,
    getThumbnailEqualOrSmaller,
    getThumbnailsAvailableForDimensions,
    html,
    language,
    to,
  }) {
    let originalSrc;

    if (slots.src) {
      originalSrc = slots.src;
    } else if (!empty(slots.path)) {
      originalSrc = to(...slots.path);
    } else {
      originalSrc = '';
    }

    const willLink = typeof slots.link === 'string' || slots.link;
    const customLink = typeof slots.link === 'string';

    const willReveal =
      slots.reveal &&
      originalSrc &&
      !empty(data.contentWarnings);

    const willSquare = slots.square;

    const idOnImg = willLink ? null : slots.id;
    const idOnLink = willLink ? slots.id : null;
    const classOnImg = willLink ? null : slots.class;
    const classOnLink = willLink ? slots.class : null;

    if (!originalSrc) {
      return prepare(
        html.tag('div', {class: 'image-text-area'},
          slots.missingSourceContent));
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

    let mediaSrc = null;
    if (originalSrc.startsWith(to('media.root'))) {
      mediaSrc =
        originalSrc
          .slice(to('media.root').length)
          .replace(/^\//, '');
    }

    let thumbSrc = null;
    if (mediaSrc) {
      // Note: This provides mediaSrc to getThumbnailEqualOrSmaller, since
      // it's the identifier which thumbnail utilities use to query from the
      // thumbnail cache. But we use the result to operate on originalSrc,
      // which is the HTML output-appropriate path including `../../` or
      // another alternate base path.
      const selectedSize = getThumbnailEqualOrSmaller(slots.thumb, mediaSrc);
      thumbSrc = originalSrc.replace(/\.(jpg|png)$/, `.${selectedSize}.jpg`);
    }

    let originalWidth = null;
    let originalHeight = null;
    let availableThumbs = null;
    if (mediaSrc) {
      [originalWidth, originalHeight] =
        getDimensionsOfImagePath(mediaSrc);
      availableThumbs =
        getThumbnailsAvailableForDimensions([originalWidth, originalHeight]);
    }

    let fileSize = null;
    if (willLink && mediaSrc) {
      fileSize = getSizeOfImagePath(mediaSrc);
    }

    const imgAttributes = {
      id: idOnImg,
      class: classOnImg,
      alt: slots.alt,
      width: slots.width,
      height: slots.height,
    };

    if (customLink) {
      imgAttributes['data-no-image-preview'] = true;
    }

    if (fileSize) {
      imgAttributes['data-original-size'] = fileSize;
    }

    if (originalWidth && originalHeight) {
      imgAttributes['data-original-length'] = Math.max(originalWidth, originalHeight);
    }

    if (!empty(availableThumbs)) {
      imgAttributes['data-thumbs'] =
        availableThumbs
          .map(([name, size]) => `${name}:${size}`)
          .join(' ');
    }

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
        html.tag('div', {class: ['image-container', !originalSrc && 'placeholder-image']},
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
              classOnLink,
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
};
