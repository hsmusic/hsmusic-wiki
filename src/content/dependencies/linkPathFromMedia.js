import {empty} from '#sugar';

export default {
  contentDependencies: ['linkTemplate'],

  extraDependencies: [
    'checkIfImagePathHasCachedThumbnails',
    'getDimensionsOfImagePath',
    'getSizeOfMediaFile',
    'getThumbnailsAvailableForDimensions',
    'html',
    'to',
  ],

  relations: (relation) =>
    ({link: relation('linkTemplate')}),

  data: (path) =>
    ({path}),

  generate(data, relations, {
    checkIfImagePathHasCachedThumbnails,
    getDimensionsOfImagePath,
    getSizeOfMediaFile,
    getThumbnailsAvailableForDimensions,
    html,
    to,
  }) {
    const attributes = html.attributes();

    if (checkIfImagePathHasCachedThumbnails(data.path)) {
      const dimensions = getDimensionsOfImagePath(data.path);
      const availableThumbs = getThumbnailsAvailableForDimensions(dimensions);
      const fileSize = getSizeOfMediaFile(data.path);

      const embedSrc =
        to('thumb.path', data.path.replace(/\.(png|jpg)$/, '.tack.jpg'));

      attributes.add([
        {class: 'image-media-link'},

        {'data-embed-src': embedSrc},

        fileSize &&
          {'data-original-size': fileSize},

        {'data-dimensions': dimensions.join('x')},

        !empty(availableThumbs) &&
          {'data-thumbs':
              availableThumbs
                .map(([name, size]) => `${name}:${size}`)
                .join(' ')},
      ]);
    }

    relations.link.setSlots({
      attributes,
      path: ['media.path', data.path],
    });

    return relations.link;
  },
};
