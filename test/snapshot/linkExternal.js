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

  // Try to *also* represent a reasonable variety of what kinds
  // of URLs appear throughout the wiki. (This should serve to
  // identify areas which #external-links is expected to
  // accommodate, regardless whether or not there is special
  // attention given in the actual descriptors.)

  // For normal custom-domain matches (e.g. Mastodon),
  // it's OK to just test one custom domain in the list.

  // Generally match the sorting order in externalLinkSpec,
  // so corresponding and missing test cases are easy to locate.

  quickSnapshotAllStyles('generic', [
    // platform: appleMusic
    'https://music.apple.com/us/artist/system-of-a-down/462715',

    // platform: artstation
    'https://www.artstation.com/eevaningtea',
    'https://witnesstheabsurd.artstation.com/',

    // platform: bandcamp
    'https://music.solatrus.com/',
    'https://homestuck.bandcamp.com/',

    // platform: bluesky
    'https://bsky.app/profile/jacobtheloofah.bsky.social',

    // platform: carrd
    'https://aliceflare.carrd.co',
    'https://bigchaslappa.carrd.co/',

    // platform: deconreconstruction.music
    'https://music.deconreconstruction.com/albums/catch-322',
    'https://music.deconreconstruction.com/albums/catch-322?track=arcjecs-theme',

    // platform: deconreconstruction
    'https://www.deconreconstruction.com/',

    // platform: deviantart
    'https://culdhira.deviantart.com',
    'https://www.deviantart.com/chesswanderlust-sama',
    'https://www.deviantart.com/shilloshilloh/art/Homestuck-Jake-English-268874606',

    // platform: facebook
    'https://www.facebook.com/DoomedCloud/',
    'https://www.facebook.com/pages/WoodenToaster/280642235307371',
    'https://www.facebook.com/Svixy/posts/400018786702633',

    // platform: fandom.mspaintadventures
    'https://mspaintadventures.fandom.com/wiki/Draconian_Dignitary',
    'https://mspaintadventures.fandom.com/wiki/',
    'https://mspaintadventures.fandom.com/',

    // platform: fandom
    'https://community.fandom.com/',
    'https://community.fandom.com/wiki/',
    'https://community.fandom.com/wiki/Community_Central',

    // platform: homestuck
    'https://homestuck.com/',

    // platform: internetArchive
    'https://archive.org/details/a-life-well-lived',
    'https://archive.org/details/VastError_Volume1/11+Renaissance.mp3',

    // platform: instagram
    'https://www.instagram.com/levc_egm/',

    // platform: itch
    'https://tuyoki.itch.io/',
    'https://itch.io/profile/bravelittletoreador',

    // platform: ko-fi
    'https://ko-fi.com/gnaach',

    // platform: local
    'https://hsmusic.wiki/feedback/',
    'https://hsmusic.wiki/media/misc/archive/Firefly%20Cloud%20Remix.mp3',

    // platform: mastodon
    'https://types.pl/',

    // platform: neocities
    'https://wodaro.neocities.org',
    'https://neomints.neocities.org/',

    // platform: newgrounds
    'https://buzinkai.newgrounds.com/',
    'https://www.newgrounds.com/audio/listen/1256058',

    // platform: patreon
    'https://www.patreon.com/CecilyRenns',

    // platform: poetryFoundation
    'https://www.poetryfoundation.org/poets/christina-rossetti',
    'https://www.poetryfoundation.org/poems/45000/remember-56d224509b7ae',

    // platform: soundcloud
    'https://soundcloud.com/plazmataz',
    'https://soundcloud.com/worthikids/1-i-accidentally-broke-my',

    // platform: spotify
    'https://open.spotify.com/artist/63SNNpNOicDzG3LY82G4q3',
    'https://open.spotify.com/album/0iHvPD8rM3hQa0qeVtPQ3t',
    'https://open.spotify.com/track/6YEGQH32aAXb9vQQbBrPlw',

    // platform: tiktok
    'https://www.tiktok.com/@richaadeb',

    // platform: tumblr
    'https://aeritus.tumblr.com/',
    'https://vol5anthology.tumblr.com/post/159528808107/hey-everyone-its-413-and-that-means-we-have',
    'https://www.tumblr.com/electricwestern',
    'https://www.tumblr.com/spellmynamewithabang/142767566733/happy-413-this-is-the-first-time-anyones-heard',

    // platform: twitch
    'https://www.twitch.tv/ajhebard',
    'https://www.twitch.tv/vargskelethor/',

    // platform: twitter
    'https://twitter.com/awkwarddoesart',
    'https://twitter.com/purenonsens/',
    'https://twitter.com/circlejourney/status/1202265927183548416',

    // platform: waybackMachine
    'https://web.archive.org/web/20120405160556/https://homestuck.bandcamp.com/album/colours-and-mayhem-universe-a',
    'https://web.archive.org/web/20160807111207/http://griffinspacejam.com:80/',

    // platform: wikipedia
    'https://en.wikipedia.org/wiki/Haydn_Quartet_(vocal_ensemble)',

    // platform: youtube
    'https://youtube.com/@bani-chan8949',
    'https://www.youtube.com/@Razzie16',
    'https://www.youtube.com/channel/UCQXfvlKkpbOqEz4BepHqK7g',
    'https://www.youtube.com/watch?v=6ekVnZm29kw',
    'https://youtu.be/WBkC038wSio',
    'https://www.youtube.com/playlist?list=PLy5UGIMKOXpONMExgI7lVYFwQa54QFp_H',
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
