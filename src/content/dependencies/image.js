import {logInfo, logWarn} from '#cli';
import {empty} from '#sugar';

export default {
  extraDependencies: [
    'checkIfImagePathHasCachedThumbnails',
    'getDimensionsOfImagePath',
    'getSizeOfImagePath',
    'getThumbnailEqualOrSmaller',
    'getThumbnailsAvailableForDimensions',
    'html',
    'language',
    'missingImagePaths',
    'to',
  ],

  contentDependencies: ['generateColorStyleVariables'],

  relations: (relation) => ({
    colorVariables: relation('generateColorStyleVariables'),
  }),

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

    color: {
      validate: v => v.isColor,
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

  generate(data, relations, slots, {
    checkIfImagePathHasCachedThumbnails,
    getDimensionsOfImagePath,
    getSizeOfImagePath,
    getThumbnailEqualOrSmaller,
    getThumbnailsAvailableForDimensions,
    html,
    language,
    missingImagePaths,
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

    // TODO: This feels janky. It's necessary to deal with static content that
    // includes strings like <img src="media/misc/foo.png">, but processing the
    // src string directly when a parts-formed path *is* available seems wrong.
    // It should be possible to do urls.from(slots.path[0]).to(...slots.path),
    // for example, but will require reworking the control flow here a little.
    let mediaSrc = null;
    if (originalSrc.startsWith(to('media.root'))) {
      mediaSrc =
        originalSrc
          .slice(to('media.root').length)
          .replace(/^\//, '');
    }

    const isMissingImageFile =
      missingImagePaths.includes(mediaSrc);

    if (isMissingImageFile) {
      logInfo`No image file for ${mediaSrc} - build again for list of missing images.`;
    }

    const willLink =
      !isMissingImageFile &&
      (typeof slots.link === 'string' || slots.link);

    const customLink =
      typeof slots.link === 'string';

    const willReveal =
      slots.reveal &&
      originalSrc &&
      !isMissingImageFile &&
      !empty(data.contentWarnings);

    const colorStyle =
      slots.color &&
        relations.colorVariables
          .slot('color', slots.color)
          .content;

    const willSquare = slots.square;

    const idOnImg = willLink ? null : slots.id;
    const idOnLink = willLink ? slots.id : null;

    const classOnImg = willLink ? null : slots.class;
    const classOnLink = willLink ? slots.class : null;

    const styleOnContainer = willLink ? null : colorStyle;
    const styleOnLink = willLink ? colorStyle : null;

    if (!originalSrc || isMissingImageFile) {
      return prepare(
        html.tag('div', {class: 'image-text-area'},
          (html.isBlank(slots.missingSourceContent)
            ? language.$(`misc.missingImage`)
            : slots.missingSourceContent)));
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

    const hasThumbnails =
      mediaSrc &&
      checkIfImagePathHasCachedThumbnails(mediaSrc);

    // Warn for images that *should* have cached thumbnail information but are
    // missing from the thumbs cache.
    if (
      slots.thumb &&
      !hasThumbnails &&
      !mediaSrc.endsWith('.gif')
    ) {
      logWarn`No thumbnail info cached: ${mediaSrc} - displaying original image here (instead of ${slots.thumb})`;
    }

    // Important to note that these might not be set at all, even if
    // slots.thumb was provided.
    let thumbSrc = null;
    let availableThumbs = null;
    let originalLength = null;

    if (hasThumbnails && slots.thumb) {
      // Note: This provides mediaSrc to getThumbnailEqualOrSmaller, since
      // it's the identifier which thumbnail utilities use to query from the
      // thumbnail cache. But we use the result to operate on originalSrc,
      // which is the HTML output-appropriate path including `../../` or
      // another alternate base path.
      const selectedSize = getThumbnailEqualOrSmaller(slots.thumb, mediaSrc);
      thumbSrc = to('thumb.path', mediaSrc.replace(/\.(png|jpg)$/, `.${selectedSize}.jpg`));

      const dimensions = getDimensionsOfImagePath(mediaSrc);
      availableThumbs = getThumbnailsAvailableForDimensions(dimensions);

      const [width, height] = dimensions;
      originalLength = Math.max(width, height)
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

    // These attributes are only relevant when a thumbnail is available *and*
    // being used.
    if (hasThumbnails && slots.thumb) {
      if (fileSize) {
        imgAttributes['data-original-size'] = fileSize;
      }

      if (originalLength) {
        imgAttributes['data-original-length'] = originalLength;
      }

      if (!empty(availableThumbs)) {
        imgAttributes['data-thumbs'] =
          availableThumbs
            .map(([name, size]) => `${name}:${size}`)
            .join(' ');
      }
    }

    const nonlazyHTML =
      originalSrc &&
        prepare(
          html.tag('img', {
            ...imgAttributes,
            src: thumbSrc ?? originalSrc,
          }));

    if (slots.lazy) {
      return html.tags([
        html.tag('noscript', nonlazyHTML),
        prepare(
          html.tag('img',
            {
              ...imgAttributes,
              class: 'lazy',
              'data-original': thumbSrc ?? originalSrc,
            }),
          true),
      ]);
    }

    return nonlazyHTML;

    function prepare(content, hide = false) {
      let wrapped = content;

      wrapped =
        html.tag('div', {
          class: ['image-container', !originalSrc && 'placeholder-image'],
          style: styleOnContainer,
        }, [
          html.tag('div', {class: 'image-inner-area'},
            wrapped),
        ]);

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

            style: styleOnLink,

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
