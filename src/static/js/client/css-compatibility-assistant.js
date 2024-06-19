/* eslint-env browser */

export const info = {
  id: 'cssCompatibilityAssistantInfo',

  coverArtContainer: null,
  coverArtImageDetails: null,
};

export function getPageReferences() {
  info.coverArtContainer =
    document.getElementById('cover-art-container');

  info.coverArtImageDetails =
    info.coverArtContainer?.querySelector('.image-details');
}

export function mutatePageContent() {
  if (info.coverArtImageDetails) {
    info.coverArtContainer.classList.add('has-image-details');
  }
}
