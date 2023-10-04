import {logInfo, logWarn} from '#cli';
import {empty} from '#sugar';

export default {
  extraDependencies: [
    'cachebust',
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
          .filter(artTag => artTag.isContentWarning)
          .map(artTag => artTag.name);
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

    alt: {type: 'string'},
    width: {type: 'number'},
    height: {type: 'number'},

    attributes: {
      type: 'attributes',
      mutable: false,
    },

    missingSourceContent: {
      type: 'html',
      mutable: false,
    },
  },

  generate(data, relations, slots, {
    cachebust,
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

    const isPlaceholder =
      !originalSrc || isMissingImageFile;

    if (isPlaceholder) {
      return (
        prepare(
          html.tag('div', {class: 'image-text-area'},
            (html.isBlank(slots.missingSourceContent)
              ? language.$('misc.missingImage')
              : slots.missingSourceContent)),
          'visible'));
    }

    let reveal = null;
    if (willReveal) {
      reveal = [
        html.tag('img', {class: 'reveal-symbol'},
          {src: to('shared.staticFile', 'warning.svg', cachebust)}),

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

    // This is only distinguished from displaySrc by being a thumbnail,
    // so it won't be set if thumbnails aren't available.
    let revealSrc = null;

    // If thumbnails are available *and* being used, calculate thumbSrc,
    // and provide some attributes relevant to the large image overlay.
    if (hasThumbnails && slots.thumb) {
      const selectedSize =
        getThumbnailEqualOrSmaller(slots.thumb, mediaSrc);

      const mediaSrcJpeg =
        mediaSrc.replace(/\.(png|jpg)$/, `.${selectedSize}.jpg`);

      displaySrc =
        to('thumb.path', mediaSrcJpeg);

      if (willReveal) {
        const miniSize =
          getThumbnailEqualOrSmaller('mini', mediaSrc);

        const mediaSrcJpeg =
          mediaSrc.replace(/\.(png|jpg)$/, `.${miniSize}.jpg`);

        revealSrc =
          to('thumb.path', mediaSrcJpeg);
      }

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
        prepare(
          html.tag('img', imgAttributes),
          'visible'));
    }

    const images = {
      displayStatic:
        html.tag('img',
          imgAttributes,
          {src: displaySrc}),

      displayLazy:
        slots.lazy &&
          html.tag('img',
            imgAttributes,
            {class: 'lazy', 'data-original': displaySrc}),

      revealStatic:
        revealSrc &&
          html.tag('img', {class: 'reveal-thumbnail'},
            imgAttributes,
            {src: revealSrc}),

      revealLazy:
        slots.lazy &&
        revealSrc &&
          html.tag('img', {class: 'reveal-thumbnail'},
            imgAttributes,
            {class: 'lazy', 'data-original': revealSrc}),
    };

    const staticImageContent =
      html.tags([images.displayStatic, images.revealStatic]);

    if (slots.lazy) {
      const lazyImageContent =
        html.tags([images.displayLazy, images.revealLazy]);

      return html.tags([
        html.tag('noscript',
          prepare(staticImageContent, 'visible')),

        prepare(lazyImageContent, 'hidden'),
      ]);
    } else {
      return prepare(staticImageContent, 'visible');
    }

    function prepare(imageContent, visibility) {
      let wrapped = imageContent;

      if (willReveal) {
        wrapped =
          html.tags([
            wrapped,
            html.tag('span', {class: 'reveal-text-container'},
              html.tag('span', {class: 'reveal-text'},
                reveal)),
          ]);
      }

      wrapped =
        html.tag('div', {class: 'image-inner-area'},
          wrapped);

      if (willLink) {
        wrapped =
          html.tag('a', {class: 'image-link'},
            (typeof slots.link === 'string'
              ? {href: slots.link}
              : {href: originalSrc}),

            wrapped);
      }

      wrapped =
        html.tag('div', {class: 'image-outer-area'},
          willSquare &&
            {class: 'square-content'},

          wrapped);

      wrapped =
        html.tag('div', {class: 'image-container'},
          willSquare &&
            {class: 'square'},

          typeof slots.link === 'string' &&
            {class: 'no-image-preview'},

          (isPlaceholder
            ? {class: 'placeholder-image'}
            : [
                willLink &&
                  {class: 'has-link'},

                willReveal &&
                  {class: 'reveal'},

                revealSrc &&
                  {class: 'has-reveal-thumbnail'},
              ]),

          visibility === 'hidden' &&
            {class: 'js-hide'},

          slots.color &&
            relations.colorStyle.slots({
              color: slots.color,
              context: 'image-box',
            }),

          slots.attributes,

          wrapped);

      return wrapped;
    }
  },
};
