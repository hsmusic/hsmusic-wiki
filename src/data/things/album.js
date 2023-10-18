import {input} from '#composite';
import find from '#find';
import {isDate} from '#validators';

import {exposeDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {exitWithoutContribs} from '#composite/wiki-data';

import {
  additionalFiles,
  commentary,
  color,
  commentatorArtists,
  contribsPresent,
  contributionList,
  dimensions,
  directory,
  fileExtension,
  flag,
  name,
  referenceList,
  simpleDate,
  simpleString,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {
  withTracks,
  withTrackSections,
} from '#composite/things/album';

import Thing from './thing.js';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({ArtTag, Artist, Group, Track}) => ({
    // Update & expose

    name: name('Unnamed Album'),
    color: color(),
    directory: directory(),
    urls: urls(),

    date: simpleDate(),
    trackArtDate: simpleDate(),
    dateAddedToWiki: simpleDate(),

    coverArtDate: [
      exitWithoutContribs({contribs: 'coverArtistContribs'}),

      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      exposeDependency({dependency: 'date'}),
    ],

    coverArtFileExtension: [
      exitWithoutContribs({contribs: 'coverArtistContribs'}),
      fileExtension('jpg'),
    ],

    trackCoverArtFileExtension: fileExtension('jpg'),

    wallpaperFileExtension: [
      exitWithoutContribs({contribs: 'wallpaperArtistContribs'}),
      fileExtension('jpg'),
    ],

    bannerFileExtension: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      fileExtension('jpg'),
    ],

    wallpaperStyle: [
      exitWithoutContribs({contribs: 'wallpaperArtistContribs'}),
      simpleString(),
    ],

    bannerStyle: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      simpleString(),
    ],

    bannerDimensions: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      dimensions(),
    ],

    hasTrackNumbers: flag(true),
    isListedOnHomepage: flag(true),
    isListedInGalleries: flag(true),

    commentary: commentary(),
    additionalFiles: additionalFiles(),

    trackSections: [
      withTrackSections(),
      exposeDependency({dependency: '#trackSections'}),
    ],

    artistContribs: contributionList(),
    coverArtistContribs: contributionList(),
    trackCoverArtistContribs: contributionList(),
    wallpaperArtistContribs: contributionList(),
    bannerArtistContribs: contributionList(),

    groups: referenceList({
      class: input.value(Group),
      find: input.value(find.group),
      data: 'groupData',
    }),

    artTags: referenceList({
      class: input.value(ArtTag),
      find: input.value(find.artTag),
      data: 'artTagData',
    }),

    // Update only

    artistData: wikiData(Artist),
    artTagData: wikiData(ArtTag),
    groupData: wikiData(Group),
    trackData: wikiData(Track),

    // Expose only

    commentatorArtists: commentatorArtists(),

    hasCoverArt: contribsPresent({contribs: 'coverArtistContribs'}),
    hasWallpaperArt: contribsPresent({contribs: 'wallpaperArtistContribs'}),
    hasBannerArt: contribsPresent({contribs: 'bannerArtistContribs'}),

    tracks: [
      withTracks(),
      exposeDependency({dependency: '#tracks'}),
    ],
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    color: S.id,
    directory: S.id,
    urls: S.id,

    date: S.id,
    coverArtDate: S.id,
    trackArtDate: S.id,
    dateAddedToWiki: S.id,

    artistContribs: S.toContribRefs,
    coverArtistContribs: S.toContribRefs,
    trackCoverArtistContribs: S.toContribRefs,
    wallpaperArtistContribs: S.toContribRefs,
    bannerArtistContribs: S.toContribRefs,

    coverArtFileExtension: S.id,
    trackCoverArtFileExtension: S.id,
    wallpaperStyle: S.id,
    wallpaperFileExtension: S.id,
    bannerStyle: S.id,
    bannerFileExtension: S.id,
    bannerDimensions: S.id,

    hasTrackArt: S.id,
    isListedOnHomepage: S.id,

    commentary: S.id,
    additionalFiles: S.id,

    tracks: S.toRefs,
    groups: S.toRefs,
    artTags: S.toRefs,
    commentatorArtists: S.toRefs,
  });
}

export class TrackSectionHelper extends Thing {
  static [Thing.friendlyName] = `Track Section`;

  static [Thing.getPropertyDescriptors] = () => ({
    name: name('Unnamed Track Section'),
    color: color(),
    dateOriginallyReleased: simpleDate(),
    isDefaultTrackGroup: flag(false),
  })
}
