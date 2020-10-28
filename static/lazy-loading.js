// Lazy loading! Roll your own. Woot.

function loadImage(image) {
    image.src = image.dataset.original;
}

function lazyLoad(elements) {
    for (const item of elements) {
        if (item.intersectionRatio > 0) {
            observer.unobserve(item.target);
            loadImage(item.target);
        }
    }
}

const observer = new IntersectionObserver(lazyLoad, {
    rootMargin: '200px',
    threshold: 1.0
});

for (const image of document.querySelectorAll('img.lazy')) {
    observer.observe(image);
}

window.lazyLoadingExecuted = true;
