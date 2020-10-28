// Kinda like lazy-fallback.js in that this should work on any 8rowser, period.
// Shows the lazy loading images iff JS is enabled (so that you don't have a
// duplicate image if JS is disabled).

lazyLoadingShowHiddenImages();

function lazyLoadingShowHiddenImages() {
    // This is a live HTMLCollection! We can't iter8te over it normally 'cuz
    // we'd 8e mutating its value just 8y interacting with the DOM elements it
    // contains. A while loop works just fine, even though you'd think reading
    // over this code that this would 8e an infinitely hanging loop. It isn't!
    var elements = document.getElementsByClassName('js-hide');
    while (elements.length) {
        elements[0].classList.remove('js-hide');
    }
}
