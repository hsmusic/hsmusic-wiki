// Complements the specs in search-shape.js with the functions that actually
// process live wiki data into records that are appropriate for storage.
// These files totally go together, so read them side by side, okay?

import baseSearchSpec from '#search-shape';
import {empty, unique} from '#sugar';
import {compareKebabCase} from '#wiki-data';

function prepareArtwork(artwork, thing, {
  checkIfImagePathHasCachedThumbnails,
  getThumbnailEqualOrSmaller,
  urls,
}) {
  if (!artwork) {
    return undefined;
  }

  const hasWarnings =
    artwork.artTags?.some(artTag => artTag.isContentWarning);

  const artworkPath =
    artwork.path;

  if (!artworkPath) {
    return undefined;
  }

  const mediaSrc =
    urls
      .from('media.root')
      .to(...artworkPath);

  if (!checkIfImagePathHasCachedThumbnails(mediaSrc)) {
    return undefined;
  }

  const selectedSize =
    getThumbnailEqualOrSmaller(
      (hasWarnings ? 'mini' : 'adorb'),
      mediaSrc);

  const mediaSrcJpeg =
    mediaSrc.replace(/\.(png|jpg)$/, `.${selectedSize}.jpg`);

  const displaySrc =
    urls
      .from('thumb.root')
      .to('thumb.path', mediaSrcJpeg);

  const serializeSrc =
    displaySrc.replace(thing.directory, '<>');

  return serializeSrc;
}

function determineArtistGroups(artist, opts) {
  const contributions = [
    artist.musicContributions,
    artist.artworkContributions
      .filter(contrib => !contrib.annotation?.includes('edits for wiki')),
  ].flat();

  const contributionGroups =
    contributions.flatMap(contrib => contrib.groups);

  const groupToZero =
    new Map(unique(contributionGroups).map(group => [group, 0]));

  const scores = new Map(groupToZero);
  const counts = new Map(groupToZero);

  const artistNames =
    [artist, ...artist.artistAliases]
      .map(({name}) => name);

  group:
  for (const group of scores.keys()) {
    for (const artistName of artistNames) {
      if (compareKebabCase(group.name, artistName)) {
        scores.delete(group);
        counts.delete(group);
        continue group;
      }
    }
  }

  for (const group of contributionGroups) {
    scores.set(group, scores.get(group) + 1 / contributions.length);
    counts.set(group, counts.get(group) + 1);
  }

  const dividingGroups =
    opts.wikiInfo.divideTrackListsByGroups;

  const dividingGroupScoreThreshold =
    (contributions.length < 50 ? 0.08 : 0.16);

  const generalGroupScoreThreshold =
    (contributions.length < 50 ? 0.00 : 0.12);

  const dividingGroupCountThreshold = 15;
  const generalGroupCountThreshold = 20;

  for (const group of scores.keys()) {
    const [scoreThreshold, countThreshold] =
      (dividingGroups.includes(group)
        ? [dividingGroupScoreThreshold, dividingGroupCountThreshold]
        : [generalGroupScoreThreshold, generalGroupCountThreshold]);

    if (scores.get(group) >= scoreThreshold);
    else if (counts.get(group) >= countThreshold);
    else scores.delete(group);
  }

  return Array.from(scores.keys());
}

function baselineProcess(thing, _opts) {
  const fields = {};

  fields.primaryName =
    thing.name;

  fields.artwork =
    null;

  fields.color =
    thing.color;

  fields.disambiguators =
    [];

  return fields;
}

function genericSelect(wikiData) {
  const groupOrder =
    wikiData.wikiInfo.divideTrackListsByGroups;

  const getGroupRank = thing => {
    const relevantRanks =
      Array.from(groupOrder.entries())
        .filter(({1: group}) => thing.groups.includes(group))
        .map(({0: index}) => index);

    if (relevantRanks.length === 0) {
      return Infinity;
    } else if (relevantRanks.length === 1) {
      return relevantRanks[0];
    } else {
      return relevantRanks[0] + 0.5;
    }
  }

  const sortByGroupRank = things =>
    things.sort((a, b) => getGroupRank(a) - getGroupRank(b));

  return [
    sortByGroupRank(wikiData.albumData.slice()),

    wikiData.artTagData
      .filter(artTag => !artTag.isContentWarning),

    wikiData.artistData
      .filter(artist => !artist.isAlias),

    wikiData.flashData,

    wikiData.groupData,

    sortByGroupRank(
      wikiData.trackData
        .filter(track =>
          track.isMainRelease ||
          !compareKebabCase(
            track.name,
            track.mainReleaseTrack.name))),
  ].flat();
}

function genericProcess(thing, opts) {
  const fields = baselineProcess(thing, opts);

  const boundPrepareArtwork = artwork =>
    prepareArtwork(artwork, thing, opts);

  fields.artwork =
    (thing.isTrack && thing.hasUniqueCoverArt
      ? boundPrepareArtwork(thing.trackArtworks[0])
   : thing.isTrack
      ? boundPrepareArtwork(thing.album.coverArtworks[0])
   : thing.isAlbum
      ? boundPrepareArtwork(thing.coverArtworks[0])
   : thing.isFlash
      ? boundPrepareArtwork(thing.coverArtwork)
      : null);

  fields.parentName =
    (thing.isTrack ? thing.album.name
   : thing.isGroup ? thing.category.name
   : thing.isFlash ? thing.act.name
      : null);

  fields.classification =
    (thing.isAlbum ? thing.style
   : thing.isTrack ?
      (thing.album.style === 'single' &&
       thing === thing.album.tracks[0]
        ? 'single'
        : 'track')
      : null);

  fields.disambiguators =
    (thing.isTrack
      ? [
          (fields.classification === 'single'
            ? null
            : fields.parentName),

          (empty(thing.artistContribs)
            ? null
            : thing.artistContribs
                .map(contrib =>
                  contrib.artistText ??
                  contrib.artist.name)
                .join(', ')),
        ]

      : [thing.parentName]);

  fields.artTags =
    (Array.from(new Set(
      (thing.isTrack
        ? thing.trackArtworks.flatMap(artwork => artwork.artTags)
     : thing.isAlbum
        ? thing.coverArtworks.flatMap(artwork => artwork.artTags)
        : []))))

      .map(artTag => artTag.nameShort);

  fields.additionalNames =
    (thing.constructor.hasPropertyDescriptor('additionalNames')
      ? thing.additionalNames.map(entry => entry.name)
   : thing.constructor.hasPropertyDescriptor('artistAliases')
      ? thing.artistAliases.map(alias => alias.name)
      : []);

  const contribKeys = [
    'artistContribs',
    'contributorContribs',
  ];

  const contributions =
    contribKeys
      .flatMap(key => thing[key] ?? []);

  fields.contributors =
    contributions
      .flatMap(({artist}) => [
        artist.name,
        ...artist.artistAliases.map(alias => alias.name),
      ]);

  const groups =
    (thing.isAlbum ? thing.groups
   : thing.isTrack ? thing.album.groups
   : thing.isArtist ? determineArtistGroups(thing, opts)
   : []);

  const mainContributorNames =
    contributions
      .map(({artist}) => artist.name);

  fields.groups =
    groups
      .filter(group => !mainContributorNames.includes(group.name))
      .map(group => group.name);

  return fields;
}

const spiffySearchSpec = {
  generic: {
    ...baseSearchSpec.generic,

    select: genericSelect,
    process: genericProcess,
  },

  verbatim: {
    ...baseSearchSpec.verbatim,

    select: genericSelect,
    process: genericProcess,
  },
};

export default spiffySearchSpec;
