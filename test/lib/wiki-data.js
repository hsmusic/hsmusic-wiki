import CacheableObject from '#cacheable-object';
import find from '#find';
import {withEntries} from '#sugar';
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

    // If albumData is present, automatically set albums' ownTrackData values
    // by resolving track sections' references against the full array. This is
    // just a nicety for working with albums throughout tests.
    if (inferAlbumsOwnTrackData && wikiData.albumData && wikiData.trackData) {
      for (const album of wikiData.albumData) {
        const trackSections =
          CacheableObject.getUpdateValue(album, 'trackSections');

        const trackRefs =
          trackSections.flatMap(section => section.tracks);

        album.ownTrackData =
          trackRefs.map(ref =>
            find.track(ref, wikiData.trackData, {mode: 'error'}));
      }
    }
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
