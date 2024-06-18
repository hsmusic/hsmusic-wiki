import {isExternalLinkContext} from '#external-links';

export default {
  contentDependencies: [
    'generateExternalHandle',
    'generateExternalIcon',
    'generateExternalPlatform',
  ],

  extraDependencies: ['html'],

  relations: (relation, url) => ({
    icon:
      relation('generateExternalIcon', url),

    handle:
      relation('generateExternalHandle', url),

    platform:
      relation('generateExternalPlatform', url),
  }),

  data: (url) => ({url}),

  slots: {
    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate(data, relations, slots, {html}) {
    for (const template of [
      relations.icon,
      relations.handle,
      relations.platform,
    ]) {
      template.setSlot('context', slots.context);
    }

    return (
      html.tag('a', {class: 'icon'},
        {href: data.url},
        {class: 'has-text'},

        [
          relations.icon,

          html.tag('span', {class: 'icon-text'},
            (html.isBlank(relations.handle)
              ? relations.platform
              : relations.handle)),
        ]));
  },
};
