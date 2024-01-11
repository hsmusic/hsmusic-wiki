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

  contentDependencies: ['generateColorStyleAttribute'],

  relations: (relation) => ({
    colorStyle:
      relation('generateColorStyleAttribute'),
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
      validate: v => v.anyOf(v.isBoolean, v.isString),
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

    missingSourceContent: {
      type: 'html',
      mutable: false,
    },
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

    const willSquare = slots.square;

    const imgAttributes = html.attributes([
      {class: 'image'},

      slots.alt && {alt: slots.alt},
      slots.width && {width: slots.width},
      slots.height && {height: slots.height},
    ]);

    const linkAttributes = html.attributes([
      (customLink
        ? {href: slots.link}
        : {href: originalSrc}),

      customLink &&
        {class: 'no-image-preview'},
    ]);

    const containerAttributes = html.attributes();

    if (slots.id) {
      if (willLink) {
        linkAttributes.set('id', slots.id);
      } else {
        imgAttributes.set('id', slots.id);
      }
    }

    if (slots.class) {
      if (willLink) {
        linkAttributes.set('class', slots.class);
      } else {
        imgAttributes.set('class', slots.class);
      }
    }

    if (slots.color) {
      const colorStyle =
        relations.colorStyle.slots({
          color: slots.color,
          context: 'image-box',
        });

      if (willLink) {
        linkAttributes.add(colorStyle);
      } else {
        containerAttributes.add(colorStyle);
      }
    }

    if (!originalSrc || isMissingImageFile) {
      return prepare(
        html.tag('div', {class: 'image-text-area'},
          (html.isBlank(slots.missingSourceContent)
            ? language.$('misc.missingImage')
            : slots.missingSourceContent)));
    }

    let reveal = null;
    if (willReveal) {
      reveal = [
        html.tag('span', {class: 'reveal-heading'},
          language.$('misc.contentWarnings.heading')),

        html.tag('br'),

        html.tag('span', {class: 'reveal-warnings'},
          language.$('misc.contentWarnings.warnings', {
            warnings: language.formatUnitList(data.contentWarnings),
          })),

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

    let displaySrc = originalSrc;

    // If thumbnails are available *and* being used, calculate thumbSrc,
    // and provide some attributes relevant to the large image overlay.
    if (hasThumbnails && slots.thumb) {
      const selectedSize =
        getThumbnailEqualOrSmaller(slots.thumb, mediaSrc);

      const mediaSrcJpeg =
        mediaSrc.replace(/\.(png|jpg)$/, `.${selectedSize}.jpg`);

      displaySrc =
        to('thumb.path', mediaSrcJpeg);

      const dimensions = getDimensionsOfImagePath(mediaSrc);
      const availableThumbs = getThumbnailsAvailableForDimensions(dimensions);

      const [width, height] = dimensions;
      const originalLength = Math.max(width, height)

      const fileSize =
        (willLink && mediaSrc
          ? getSizeOfImagePath(mediaSrc)
          : null);

      imgAttributes.add([
        fileSize &&
          {'data-original-size': fileSize},

        originalLength &&
          {'data-original-length': originalLength},

        !empty(availableThumbs) &&
          {'data-thumbs':
              availableThumbs
                .map(([name, size]) => `${name}:${size}`)
                .join(' ')},
      ]);
    }

    if (!displaySrc) {
      return (
        prepareVisible(
          html.tag('img', imgAttributes)));
    }

    const nonlazyHTML =
      prepareVisible(
        html.tag('img',
          imgAttributes,
          {src: displaySrc}));

    if (slots.lazy) {
      return html.tags([
        html.tag('noscript',
          nonlazyHTML),

        prepareHidden(
          html.tag('img', {class: 'lazy'},
            imgAttributes,
            {'data-original': displaySrc})),
      ]);
    } else {
      return nonlazyHTML;
    }

    function prepareVisible(content) {
      return prepare(content, false);
    }

    function prepareHidden(content) {
      return prepare(content, true);
    }

    function prepare(content, hide) {
      let wrapped = content;

      wrapped =
        html.tag('div', {class: 'image-container'},
          containerAttributes,

          !originalSrc &&
            {class: 'placeholder-image'},

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
          html.tag('div', {class: 'square'},
            hide && !willLink &&
              {class: 'js-hide'},

            html.tag('div', {class: 'square-content'},
              wrapped));
      }

      if (willLink) {
        wrapped =
          html.tag('a', {class: ['box', 'image-link']},
            linkAttributes,

            hide &&
              {class: 'js-hide'},

            wrapped);
      }

      return wrapped;
    }
  },
};
