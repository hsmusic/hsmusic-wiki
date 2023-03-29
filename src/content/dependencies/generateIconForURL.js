const BANDCAMP_DOMAINS = [
  'bc.s3m.us',
  'music.solatrux.com',
];

const MASTODON_DOMAINS = [
  'types.pl',
];

export default {
  extraDependencies: ['html', 'language', 'to'],

  data(url) {
    return {url};
  },

  generate(data, {html, language, to}) {
    const domain = new URL(data.url).hostname;
    const [id, msg] = (
      domain.includes('bandcamp.com')
        ? ['bandcamp', language.$('misc.external.bandcamp')]
      : BANDCAMP_DOMAINS.includes(domain)
        ? ['bandcamp', language.$('misc.external.bandcamp.domain', {domain})]
      : MASTODON_DOMAINS.includes(domain)
        ? ['mastodon', language.$('misc.external.mastodon.domain', {domain})]
      : domain.includes('youtu')
        ? ['youtube', language.$('misc.external.youtube')]
      : domain.includes('soundcloud')
        ? ['soundcloud', language.$('misc.external.soundcloud')]
      : domain.includes('tumblr.com')
        ? ['tumblr', language.$('misc.external.tumblr')]
      : domain.includes('twitter.com')
        ? ['twitter', language.$('misc.external.twitter')]
      : domain.includes('deviantart.com')
        ? ['deviantart', language.$('misc.external.deviantart')]
      : domain.includes('instagram.com')
        ? ['instagram', language.$('misc.external.bandcamp')]
      : domain.includes('newgrounds.com')
        ? ['newgrounds', language.$('misc.external.newgrounds')]
        : ['globe', language.$('misc.external.domain', {domain})]);

    return html.tag('a',
      {href: data.url, class: 'icon'},
      html.tag('svg', [
        html.tag('title', msg),
        html.tag('use', {
          href: to('shared.staticFile', `icons.svg#icon-${id}`),
        }),
      ]));
  },
};
