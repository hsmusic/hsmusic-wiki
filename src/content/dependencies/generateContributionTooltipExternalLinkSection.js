import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkExternalAsIcon'],
  extraDependencies: ['html', 'language'],

  relations: (relation, contribution) => ({
    artistIcons:
      contribution.artist.urls
        .map(url => relation('linkExternalAsIcon', url)),
  }),

  data: (contribution) => ({
    urls: contribution.artist.urls,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.artistLink', capsule =>
      stitchArrays({
        icon: relations.artistIcons,
        url: data.urls,
      }).map(({icon, url}) => {
          icon.setSlots({
            context: 'artist',
          });

          let platformText =
            language.formatExternalLink(url, {
              context: 'artist',
              style: 'platform',
            });

          // This is a pretty ridiculous hack, but we currently
          // don't have a way of telling formatExternalLink to *not*
          // use the fallback string, which just formats the URL as
          // its host/domain... so is technically detectable.
          if (platformText.toString() === (new URL(url)).host) {
            platformText =
              language.$(capsule, 'noExternalLinkPlatformName');
          }

          const platformSpan =
            html.tag('span', {class: 'icon-platform'},
              platformText);

          return [icon, platformSpan];
        })),
};
