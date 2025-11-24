import {logWarn} from '#cli';
import {empty} from '#sugar';

export default {
  relations: (relation, _artwork) => ({
    colorStyle:
      relation('generateColorStyleAttribute'),
  }),

  data: (artwork) => ({
    path:
      (artwork
        ? artwork.path
        : null),

    warnings:
      (artwork
        ? artwork.artTags
            .filter(artTag => artTag.isContentWarning)
            .map(artTag => artTag.name)
        : null),

    dimensions:
      (artwork
        ? artwork.dimensions
        : null),
  }),

  slots: {
    thumb: {type: 'string'},
    responsiveThumb: {type: 'boolean', default: false},
    responsiveSizes: {type: 'string'},

    reveal: {type: 'boolean', default: true},
    lazy: {type: 'boolean', default: false},
    square: {type: 'boolean', default: false},

    link: {
      validate: v => v.anyOf(v.isBoolean, v.isString),
      default: false,
    },

    color: {validate: v => v.isColor},

    // Added to the .image-container.
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    // Added to the <img>.
    imgAttributes: {
      type: 'attributes',
      mutable: false,
    },

    // Added to the <img> itself.
    alt: {type: 'string'},

    // Specify 'src' or 'path', or the path will be used from the artwork.
    // If none of the above is present, the message in missingSourceContent
    // will be displayed instead.

    src: {type: 'string'},

    path: {
      validate: v => v.validateArrayItems(v.isString),
    },

    missingSourceContent: {
      type: 'html',
      mutable: false,
    },

    // These will also be used from the artwork if not specified as slots.

    warnings: {
      validate: v => v.looseArrayOf(v.isString),
    },

    dimensions: {
      validate: v => v.isDimensions,
    },
  },

  generate(data, relations, slots, {
    checkIfImagePathHasCachedThumbnails,
    getDimensionsOfImagePath,
    getSizeOfMediaFile,
    getThumbnailEqualOrSmaller,
    getThumbnailsAvailableForDimensions,
    html,
    language,
    missingImagePaths,
    to,
  }) {
    const originalSrc =
      (slots.src
        ? slots.src
     : slots.path
        ? to(...slots.path)
     : data.path
        ? to(...data.path)
        : '');

    // TODO: This feels janky. It's necessary to deal with static content that
    // includes strings like <img src="media/misc/foo.png">, but processing the
    // src string directly when a parts-formed path *is* available seems wrong.
    // It should be possible to do urls.from(slots.path[0]).to(...slots.path),
    // for example, but will require reworking the control flow here a little.
    let mediaSrc = decodeURIComponent(originalSrc);
    if (originalSrc.startsWith(to('media.root'))) {
      mediaSrc = mediaSrc
        .slice(to('media.root').length)
        .replace(/^\//, '');
    }

    const isMissingImageFile =
      missingImagePaths.includes(mediaSrc);

    const willLink =
      !isMissingImageFile &&
      (typeof slots.link === 'string' || slots.link);

    const warnings = slots.warnings ?? data.warnings;
    const dimensions = slots.dimensions ?? data.dimensions;

    const willReveal =
      slots.reveal &&
      originalSrc &&
      !isMissingImageFile &&
      !empty(warnings);

    const imgAttributes = html.attributes([
      {class: 'image'},

      slots.imgAttributes,

      slots.alt && {alt: slots.alt},

      dimensions &&
      dimensions[0] &&
        {width: dimensions[0]},

      dimensions &&
      dimensions[1] &&
        {height: dimensions[1]},
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
          {src: to('staticMisc.path', 'warning.svg')}),

        html.tag('br'),

        html.tag('span', {class: 'reveal-warnings'},
          language.$('misc.contentWarnings.warnings', {
            warnings: language.formatUnitList(warnings),
          })),

        html.tag('br'),

        html.tag('span', {class: 'reveal-interaction'},
          language.$('misc.contentWarnings.reveal')),
      ];
    }

    const hasThumbnails =
      mediaSrc &&
      checkIfImagePathHasCachedThumbnails(mediaSrc);

    let displaySrc = originalSrc;

    // This is only distinguished from displaySrc by being a thumbnail,
    // so it won't be set if thumbnails aren't available.
    let revealSrc = null;

    let originalDimensions;
    let availableThumbs;
    let selectedThumbtack;

    const getThumbSrc = (thumbtack) =>
      to('thumb.path', mediaSrc.replace(/\.(png|jpg)$/, `.${thumbtack}.jpg`));

    // If thumbnails are available *and* being used, calculate thumbSrc,
    // and provide some attributes relevant to the large image overlay.
    if (hasThumbnails && slots.thumb) {
      selectedThumbtack =
        getThumbnailEqualOrSmaller(slots.thumb, mediaSrc);

      displaySrc =
        getThumbSrc(selectedThumbtack);

      if (willReveal) {
        revealSrc =
          getThumbSrc(getThumbnailEqualOrSmaller('mini', mediaSrc));
      }

      originalDimensions = getDimensionsOfImagePath(mediaSrc);
      availableThumbs = getThumbnailsAvailableForDimensions(originalDimensions);

      const fileSize =
        (willLink && mediaSrc
          ? getSizeOfMediaFile(mediaSrc)
          : null);

      imgAttributes.add([
        fileSize &&
          {'data-original-size': fileSize},

        {'data-dimensions': originalDimensions.join('x')},

        !empty(availableThumbs) &&
          {'data-thumbs':
              availableThumbs
                .map(([tack, size]) => `${tack}:${size}`)
                .join(' ')},
      ]);
    }

    let displayStaticImg =
      html.tag('img',
        imgAttributes,
        {src: displaySrc});

    if (hasThumbnails && slots.responsiveThumb) responsive: {
      if (slots.lazy) {
        logWarn`${'responsiveThumb'} and ${'lazy'} are used together, but not compatible`;
        break responsive;
      }

      if (!slots.thumb) {
        logWarn`${'responsiveThumb'} must be used alongside a default ${'thumb'}`;
        break responsive;
      }

      const srcset = [
        // Never load the original source, which might be a very large
        // uncompressed file. Bah!
        /* [originalSrc, `${Math.min(...originalDimensions)}w`], */

        ...availableThumbs.map(([tack, size]) =>
          [getThumbSrc(tack), `${Math.floor(0.95 * size)}w`]),

        // fallback
        [displaySrc],
      ].map(line => line.join(' ')).join(',\n');

      displayStaticImg =
        html.tag('img',
          imgAttributes,

          {sizes:
            (slots.responsiveSizes.match(/(?=(?:,|^))\s*\S/)
                // slot provided fallback size
              ? slots.responsiveSizes
                // default fallback size
              : slots.responsiveSizes + ',\n' +
                new Map(availableThumbs).get(selectedThumbtack) + 'px')},

          {srcset});
    }

    if (!displaySrc) {
      return (
        prepare(
          html.tag('img', imgAttributes),
          'visible'));
    }

    const images = {
      displayStatic: displayStaticImg,

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
          slots.square &&
            {class: 'square-content'},

          wrapped);

      wrapped =
        html.tag('div', {class: 'image-container'},
          slots.square &&
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
