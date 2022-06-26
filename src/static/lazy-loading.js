// Lazy loading! Roll your own. Woot.
// This file includes a 8unch of fall8acks and stuff like that, and is written
// with fairly Olden JavaScript(TM), so as to work on pretty much any 8rowser
// with JS ena8led. (If it's disa8led, there are gener8ted <noscript> tags to
// work there.)

var observer;

function loadImage(image) {
  image.src = image.dataset.original;
}

function lazyLoad(elements) {
  for (var i = 0; i < elements.length; i++) {
    var item = elements[i];
    if (item.intersectionRatio > 0) {
      observer.unobserve(item.target);
      loadImage(item.target);
    }
  }
}

function lazyLoadMain() {
  // This is a live HTMLCollection! We can't iter8te over it normally 'cuz
  // we'd 8e mutating its value just 8y interacting with the DOM elements it
  // contains. A while loop works just fine, even though you'd think reading
  // over this code that this would 8e an infinitely hanging loop. It isn't!
  var elements = document.getElementsByClassName("js-hide");
  while (elements.length) {
    elements[0].classList.remove("js-hide");
  }

  var lazyElements = document.getElementsByClassName("lazy");
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(lazyLoad, {
      rootMargin: "200px",
      threshold: 1.0,
    });
    for (var i = 0; i < lazyElements.length; i++) {
      observer.observe(lazyElements[i]);
    }
  } else {
    for (var i = 0; i < lazyElements.length; i++) {
      var element = lazyElements[i];
      var original = element.getAttribute("data-original");
      element.setAttribute("src", original);
    }
  }
}

document.addEventListener("DOMContentLoaded", lazyLoadMain);
