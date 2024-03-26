/* eslint-env browser */

async function initSearch() {
  const FlexSearch = window.FlexSearch;

  // Copied directly from server search.js
  window.indexes = {
    albums: new FlexSearch.Document({
      id: "reference",
      index: ["name", "groups"],
    }),
    tracks: new FlexSearch.Document({
      id: "reference",
      index: ["track", "album", "artists", "directory", "additionalNames"],
    }),
    artists: new FlexSearch.Document({
      id: "reference",
      index: ["names"],
    })
  }

  let searchData = await fetch('/media/search_index.json').then(resp => resp.json())

  Object.entries(searchData).forEach(key_index_pair => {
    const [index_key, index_data] = key_index_pair
    Object.entries(index_data).forEach(key_value_pair => {
      const [key, value] = key_value_pair
      window.indexes[index_key].import(key, value);
    })
  })
}

function searchAll(query, options) {
  options = options || {}
  return Object.entries(window.indexes).reduce((a, pair) => {
    const [k, v] = pair
    a[k] = v.search(query, options)
    return a
  }, {})
}

document.addEventListener('DOMContentLoaded', initSearch);
