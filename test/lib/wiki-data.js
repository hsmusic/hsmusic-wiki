import {linkWikiDataArrays} from '#yaml';

export function linkAndBindWikiData(wikiData) {
  linkWikiDataArrays(wikiData);

  return {
    // Mutate to make the below functions aware of new data objects, or of
    // reordering the existing ones. Don't mutate arrays such as trackData
    // in-place; assign completely new arrays to this wikiData object instead.
    wikiData,

    // Use this after you've mutated wikiData to assign new data arrays.
    // It'll automatically relink everything on wikiData so all the objects
    // are caught up to date.
    linkWikiDataArrays:
      linkWikiDataArrays.bind(null, wikiData),

    // Use this if you HAVEN'T mutated wikiData and just need to decache
    // indirect dependencies on exposed properties of other data objects.
    // See documentation on linkWikiDataArarys (in yaml.js) for more info.
    XXX_decacheWikiData:
      linkWikiDataArrays.bind(null, wikiData, {XXX_decacheWikiData: true}),
  };
}
