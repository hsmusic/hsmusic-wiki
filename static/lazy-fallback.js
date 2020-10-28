// Fall8ack code for lazy loading. 8asically, this runs if the stuff in
// lazy-loading.js doesn't; while that file's written with the same kinda
// modern syntax/APIs used all over the site, displaying the images is a pretty
// damn important thing to do, so we have this goodol' Olde JavaScripte fix for
// 8rowsers which have JS ena8led (and so won't display gener8ted <noscript>
// tags) 8ut don't support what we use for lazy loading.

if (!window.lazyLoadingExecuted) {
    lazyLoadingFallback();
}

function lazyLoadingFallback() {
    var lazyElements = document.getElementsByClassName('lazy');
    for (var i = 0; i < lazyElements.length; i++) {
        var element = lazyElements[i];
        var original = element.getAttribute('data-original');
        element.setAttribute('src', original);
    }
}
