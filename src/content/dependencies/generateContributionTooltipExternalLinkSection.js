import {stitchArrays} from '#sugar';

export default {
  relations: (relation, contribution) => ({
    icons:
      contribution.artist.urls
        .map(entry => relation('generateExternalIcon', entry.url)),

    handles:
      contribution.artist.urls
        .map(entry => relation('generateExternalHandle', entry.url)),

    platforms:
      contribution.artist.urls
        .map(entry => relation('generateExternalPlatform', entry.url)),
  }),

  data: (contribution) => ({
    urls:
      contribution.artist.urls
        .map(entry => entry.url),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.artistLink', capsule =>
      html.tags(
        stitchArrays({
          icon: relations.icons,
          handle: relations.handles,
          platform: relations.platforms,
          url: data.urls,
        }).map(({icon, handle, platform, url}) => {
            for (const template of [icon, handle, platform]) {
              template.setSlot('context', 'artist');
            }

            return [
              html.tag('a', {class: 'external-link'},
                {href: url},

                [
                  icon,

                  html.tag('span', {class: 'external-handle'},
                    (html.isBlank(handle)
                      ? platform
                      : handle)),
                ]),

              html.tag('span', {class: 'external-platform'},
                // This is a pretty ridiculous hack, but we currently
                // don't have a way of telling formatExternalLink to *not*
                // use the fallback string, which just formats the URL as
                // its host/domain... so is technically detectable.
                (((new URL(url))
                    .host
                    .endsWith(
                      html.resolve(platform, {normalize: 'string'})))

                  ? language.$(capsule, 'noExternalLinkPlatformName')
                  : platform)),
            ];
          }))),
};
