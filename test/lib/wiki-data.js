import CacheableObject from '#cacheable-object';
import find from '#find';
import {withEntries} from '#sugar';
import Thing from '#thing';
import thingConstructors from '#things';
import {linkWikiDataArrays} from '#yaml';

export function linkAndBindWikiData(wikiData, {
  inferAlbumsOwnTrackData = true,
} = {}) {
  function customLinkWikiDataArrays(wikiData, options = {}) {
    linkWikiDataArrays(
      (options.XXX_decacheWikiData
        ? withEntries(wikiData, entries => entries
            .map(([key, value]) => [key, value.slice()]))
        : wikiData));
  }

  customLinkWikiDataArrays(wikiData);

  return {
    // Mutate to make the below functions aware of new data objects, or of
    // reordering the existing ones. Don't mutate arrays such as trackData
    // in-place; assign completely new arrays to this wikiData object instead.
    wikiData,

    // Use this after you've mutated wikiData to assign new data arrays.
    // It'll automatically relink everything on wikiData so all the objects
    // are caught up to date.
    linkWikiDataArrays:
      customLinkWikiDataArrays
        .bind(null, wikiData),

    // Use this if you HAVEN'T mutated wikiData and just need to decache
    // indirect dependencies on exposed properties of other data objects.
    //
    // XXX_decacheWikiData option should be used specifically to mark points
    // where you *aren't* replacing any of the arrays under wikiData with
    // new values, and are using linkWikiDataArrays to instead "decache" data
    // properties which depend on any of them. It's currently not possible for
    // a CacheableObject to depend directly on the value of a property exposed
    // on some other CacheableObject, so when those values change, you have to
    // manually decache before the object will realize its cache isn't valid
    // anymore.
    //
    // The previous implementation for this involved overwriting the relevant
    // wikiData properties with null, then replacing it with the original
    // array, which effectively cleared a CacheableObject cache. But it isn't
    // enough to clear other caches that depend on the identity of wikiData
    // arrays, such as withReverseReferenceList, so now it replaces with fresh
    // copies of the data arrays instead; the original identities don't get
    // reused.
    XXX_decacheWikiData:
      customLinkWikiDataArrays
        .bind(null, wikiData, {XXX_decacheWikiData: true}),
  };
}

export function stubWikiData() {
  return {
    albumData: [],
    artistData: [],
    artTagData: [],
    flashData: [],
    flashActData: [],
    flashSideData: [],
    groupData: [],
    groupCategoryData: [],
    newsData: [],
    staticPageData: [],
    trackData: [],
    trackSectionData: [],
  };
}

export function stubThing(wikiData, constructor, properties = {}) {
  const thing = Reflect.construct(constructor, []);
  Object.assign(thing, properties);

  const wikiDataSpec = {
    Album: 'albumData',
    Artist: 'artistData',
    ArtTag: 'artTagData',
    Flash: 'flashData',
    FlashAct: 'flashActData',
    FlashSide: 'flashSideData',
    Group: 'groupData',
    GroupCategory: 'groupCategoryData',
    NewsEntry: 'newsData',
    StaticPage: 'staticPageData',
    Track: 'trackData',
    TrackSection: 'trackSectionData',
  };

  const wikiDataMap =
    new Map(
      Object.entries(wikiDataSpec)
        .map(([thingKey, wikiDataKey]) => [
          thingConstructors[thingKey],
          wikiData[wikiDataKey],
        ]));

  const wikiDataArray =
    wikiDataMap.get(constructor);

  wikiDataArray.push(thing);

  return thing;
}

export function stubTrackAndAlbum(wikiData, trackDirectory = null, albumDirectory = null) {
  const {Track, TrackSection, Album} = thingConstructors;

  const track =
    stubThing(wikiData, Track, {directory: trackDirectory});

  const section =
    stubThing(wikiData, TrackSection, {tracks: [track]});

  const album =
    stubThing(wikiData, Album, {directory: albumDirectory, trackSections: [section]});

  return {track, album, section};
}

export function stubArtistAndContribs(wikiData, artistName = `Test Artist`) {
  const {Artist} = thingConstructors;

  const artist =
    stubThing(wikiData, Artist, {name: artistName});

  const contribs =
    [{artist: artistName, annotation: null}];

  const badContribs =
    [{artist: `Figment of Your Imagination`, annotation: null}];

  return {artist, contribs, badContribs};
}

export function stubFlashAndAct(wikiData, flashDirectory = null) {
  const {Flash, FlashAct} = thingConstructors;

  const flash =
    stubThing(wikiData, Flash, {directory: flashDirectory});

  const flashAct =
    stubThing(wikiData, FlashAct, {
      flashes: [Thing.getReference(flash)],
    });

  return {flash, flashAct};
}
