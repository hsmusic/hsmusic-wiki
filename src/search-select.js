// Complements the specs in search-shape.js with the functions that actually
// process live wiki data into records that are appropriate for storage.
// These files totally go together, so read them side by side, okay?

import baseSearchSpec from '#search-shape';
import {sortAlbumsTracksChronologically} from '#sort';
import {empty, unique} from '#sugar';
import {chunkByDivisions, compareKebabCase} from '#wiki-data';

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

function baselineProcess(entry, _opts) {
  const fields = {};
  const {thing} = entry;

  fields.primaryName =
    thing.name;

  fields.nameDetail =
    thing.nameDetailAcrossWiki ??
    thing.nameDetail;

  fields.directory =
    thing.directoryWithinAlbum ??
    thing.directory;

  fields.division =
    (entry.division
      ? [
          entry.division.constructor.getReference(entry.division),
          entry.division.name,
        ]
      : null);

  fields.artwork =
    null;

  fields.color =
    thing.color;

  fields.disambiguators =
    [];

  fields.attachedResults = [];

  return fields;
}

function genericSelect(wikiData) {
  const wikiDivisions =
    wikiData.wikiInfo.divideMusicBy;

  const sortByWikiDivisions = things =>
    chunkByDivisions(things, wikiDivisions, {duplicate: false})
      .flatMap(({division, things}) => things
        .map(thing => ({thing, division})));

  return [
    wikiData.artistData
      .filter(artist => !artist.isAlias)
      .map(artist => ({thing: artist})),

    wikiData.groupData
      .map(group => ({thing: group})),

    wikiData.artTagData
      .filter(artTag => !artTag.isContentWarning)
      .map(artTag => ({thing: artTag})),

    wikiData.flashData
      .map(flash => ({thing: flash})),

    sortByWikiDivisions(
      sortAlbumsTracksChronologically([
        ...wikiData.albumData,
        ...
          wikiData.trackData
            .filter(track =>
              track.isMainRelease ||
              !compareKebabCase(
                track.name,
                track.mainReleaseTrack.name)),
      ])),
  ].flat();
}

function genericProcess(entry, opts) {
  const fields = baselineProcess(entry, opts);
  const {thing} = entry;

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

  const boundProcessAttachedResult = thing => ({
    id: thing.constructor.getReference(thing),
    doc: {
      ...genericProcess({thing}, opts),
      artwork: null,
      attachedResults: [],
      disambiguators: [],
    },
  });

  fields.attachedResults =
    (thing.isTrack
      ? [...thing.ownFeaturedInFlashes,
         ...thing.ownPreviouslyFeaturedInFlashes]
          .filter(flash =>
            flash.side.directory === 's1' ||
            flash.side.directory === 's2')
          .map(boundProcessAttachedResult)

   : thing.isArtTag && thing.name.endsWith('(archetype)')
      ? thing.directDescendantArtTags
          .map(boundProcessAttachedResult)

   : []);

  fields.parentName =
    (thing.isTrack ? thing.album.name
   : thing.isGroup ? thing.category.name
   : thing.isFlash ? thing.act.name
      : null);

  fields.parentDirectory =
    (thing.isTrack ? thing.album.name
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

      : [fields.parentName]);

  fields.additionalNames =
    (thing.constructor.hasPropertyDescriptor('additionalNames')
      ? thing.additionalNames.map(entry => entry.name)
   : thing.constructor.hasPropertyDescriptor('artistAliases')
      ? thing.artistAliases.map(alias => alias.name)
      : []);

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
