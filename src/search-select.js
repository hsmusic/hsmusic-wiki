// Complements the specs in search-shape.js with the functions that actually
// process live wiki data into records that are appropriate for storage.
// These files totally go together, so read them side by side, okay?

import baseSearchSpec from '#search-shape';
import {getKebabCase} from '#wiki-data';

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

function baselineProcess(thing, _opts) {
  const fields = {};

  fields.primaryName =
    thing.name;

  fields.artwork =
    null;

  fields.color =
    thing.color;

  fields.disambiguator =
    null;

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

    wikiData.artTagData,

    wikiData.artistData
      .filter(artist => !artist.isAlias),

    wikiData.flashData,

    wikiData.groupData,

    sortByGroupRank(
      wikiData.trackData
        .filter(track =>
          track.isMainRelease ||
          (getKebabCase(track.name) !==
           getKebabCase(track.mainReleaseTrack.name)))),
  ].flat();
}

function genericProcess(thing, opts) {
  const fields = baselineProcess(thing, opts);

  const kind =
    thing.constructor[Symbol.for('Thing.referenceType')];

  const boundPrepareArtwork = artwork =>
    prepareArtwork(artwork, thing, opts);

  fields.artwork =
    (kind === 'track' && thing.hasUniqueCoverArt
      ? boundPrepareArtwork(thing.trackArtworks[0])
   : kind === 'track'
      ? boundPrepareArtwork(thing.album.coverArtworks[0])
   : kind === 'album'
      ? boundPrepareArtwork(thing.coverArtworks[0])
   : kind === 'flash'
      ? boundPrepareArtwork(thing.coverArtwork)
      : null);

  fields.parentName =
    (kind === 'track'
      ? thing.album.name
   : kind === 'group'
      ? thing.category.name
   : kind === 'flash'
      ? thing.act.name
      : null);

  fields.disambiguator =
    fields.parentName;

  fields.artTags =
    (Array.from(new Set(
      (kind === 'track'
        ? thing.trackArtworks.flatMap(artwork => artwork.artTags)
     : kind === 'album'
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
     thing.groups ??
     thing.album?.groups ??
     [];

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
