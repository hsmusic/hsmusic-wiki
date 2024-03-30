import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'linkExternal (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('unknown domain (arbitrary world wide web path)', {
    name: 'linkExternal',
    args: ['https://snoo.ping.as/usual/i/see/'],
  });

  const urlsToArgs = urls =>
    urls.map(url => ({args: [url]}));

  const quickSnapshot = (message, urls, slots) =>
    evaluate.snapshot(message, {
      name: 'linkExternal',
      slots,
      multiple: urlsToArgs(urls),
    });

  const quickSnapshotAllStyles = (context, urls) => {
    for (const style of ['platform', 'handle']) {
      const message = `context: ${context}, style: ${style}`;
      quickSnapshot(message, urls, {context, style});
    }
  };

  // Try to comprehensively test every regular expression
  // (in `match` and extractions like `handle` or `details`).

  // For normal custom-domain matches (e.g. Mastodon),
  // it's OK to just test one custom domain in the list.

  // Generally match the sorting order in externalLinkSpec,
  // so corresponding and missing test cases are easy to locate.

  quickSnapshotAllStyles('generic', [
    // platform: bandcamp
    'https://music.solatrus.com/',
    'https://homestuck.bandcamp.com/',

    // platform: deviantart
    'https://www.deviantart.com/chesswanderlust-sama',

    // platform: fandom
    'https://mspaintadventures.fandom.com/',
    'https://mspaintadventures.fandom.com/wiki/',
    'https://mspaintadventures.fandom.com/wiki/Draconian_Dignitary',
    'https://community.fandom.com/',
    'https://community.fandom.com/wiki/',
    'https://community.fandom.com/wiki/Community_Central',

    // platform: instagram
    'https://www.instagram.com/levc_egm/',

    // platform: mastodon
    'https://types.pl/',

    // platform: newgrounds
    'https://buzinkai.newgrounds.com/',

    // platform: patreon
    'https://www.patreon.com/CecilyRenns',

    // platform: poetryFoundation
    'https://www.poetryfoundation.org/poets/christina-rossetti',

    // platform: soundcloud
    'https://soundcloud.com/plazmataz',

    // platform: spotify
    'https://open.spotify.com/artist/63SNNpNOicDzG3LY82G4q3',

    // platform: tumblr
    'https://aeritus.tumblr.com/',

    // platform: twitter
    'https://twitter.com/awkwarddoesart',

    // platform: wikipedia
    'https://en.wikipedia.org/wiki/Haydn_Quartet_(vocal_ensemble)',
  ]);

  quickSnapshotAllStyles('album', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('albumNoTracks', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('albumOneTrack', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('albumMultipleTracks', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('flash', [
    'https://www.bgreco.net/hsflash/002238.html',
    'https://homestuck.com/story/1234',
    'https://homestuck.com/story/pony',
    'https://www.youtube.com/watch?v=wKgOp3Kg2wI',
    'https://youtu.be/IOcvkkklWmY',
    'https://some.external.site/foo/bar/',
  ]);
});
