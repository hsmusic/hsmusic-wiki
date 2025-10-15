import {stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'cssCompatibilityAssistantInfo',

  coverArtworks: null,
  coverArtworkImageDetails: null,
};

export function getPageReferences() {
  info.coverArtworks =
    Array.from(document.querySelectorAll('.cover-artwork'));

  info.coverArtworkImageDetails =
    info.coverArtworks
      .map(artwork => artwork.querySelector('.image-details'));
}

export function mutatePageContent() {
  stitchArrays({
    coverArtwork: info.coverArtworks,
    imageDetails: info.coverArtworkImageDetails,
  }).forEach(({coverArtwork, imageDetails}) => {
      if (imageDetails) {
        coverArtwork.classList.add('has-image-details');
      }
    });
}
