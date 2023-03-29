// TODO: Define these as extra dependencies and pass them somewhere
const BANDCAMP_DOMAINS = ['bc.s3m.us', 'music.solatrux.com'];
const MASTODON_DOMAINS = ['types.pl'];

export default {
  extraDependencies: ['html', 'language'],

  data(url, {
    type = 'generic',
  } = {}) {
    const types = ['generic', 'album'];
    if (!types.includes(type)) {
      throw new TypeError(`Expected type to be one of ${types}`);
    }

    return {
      url,
      type,
    };
  },

  generate(data, {html, language}) {
    let isLocal;
    let domain;
    try {
      domain = new URL(data.url).hostname;
    } catch (error) {
      // No support for relative local URLs yet, sorry! (I.e, local URLs must
      // be absolute relative to the domain name in order to work.)
      isLocal = true;
    }

    const a = html.tag('a',
      {
        href: data.url,
        class: 'nowrap',
      },

      // truly unhinged indentation here
      isLocal
        ? language.$('misc.external.local')

    : domain.includes('bandcamp.com')
        ? language.$('misc.external.bandcamp')

    : BANDCAMP_DOMAINS.includes(domain)
        ? language.$('misc.external.bandcamp.domain', {domain})

    : MASTODON_DOMAINS.includes(domain)
        ? language.$('misc.external.mastodon.domain', {domain})

    : domain.includes('youtu')
        ? data.type === 'album'
          ? url.includes('list=')
            ? language.$('misc.external.youtube.playlist')
            : language.$('misc.external.youtube.fullAlbum')
          : language.$('misc.external.youtube')

    : domain.includes('soundcloud')
        ? language.$('misc.external.soundcloud')

    : domain.includes('tumblr.com')
        ? language.$('misc.external.tumblr')

    : domain.includes('twitter.com')
        ? language.$('misc.external.twitter')

    : domain.includes('deviantart.com')
        ? language.$('misc.external.deviantart')

    : domain.includes('wikipedia.org')
        ? language.$('misc.external.wikipedia')

    : domain.includes('poetryfoundation.org')
        ? language.$('misc.external.poetryFoundation')

    : domain.includes('instagram.com')
        ? language.$('misc.external.instagram')

    : domain.includes('patreon.com')
        ? language.$('misc.external.patreon')

    : domain.includes('spotify.com')
        ? language.$('misc.external.spotify')

    : domain.includes('newgrounds.com')
        ? language.$('misc.external.newgrounds')

        : domain);

    return a;
  }
};
