/* eslint-env browser */

async function initSearch() {
  const {FlexSearch} = window;

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
    }),
  };

  const searchData =
    await fetch('/search-data/index.json')
      .then(resp => resp.json());

  for (const [indexName, indexData] of Object.entries(searchData)) {
    for (const [key, value] of Object.entries(indexData)) {
      window.indexes[index_key].import(key, value);
    }
  }
}

function searchAll(query, options = {}) {
  const results = {};

  for (const [indexName, index] of Object.entries(window.indexes)) {
    results[indexName] = index.search(query, options);
  }

  return results;
}

document.addEventListener('DOMContentLoaded', initSearch);
