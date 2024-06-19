/* eslint-env browser */

import {info as liveMousePositionInfo} from './client/live-mouse-position.js';

export class WikiRect extends DOMRect {
  // Useful constructors

  static fromWindow() {
    const {clientWidth: width, clientHeight: height} =
      document.documentElement;

    return Reflect.construct(this, [0, 0, width, height]);
  }

  static fromElement(element) {
    return this.fromRect(element.getBoundingClientRect());
  }

  static fromMouse() {
    const {clientX, clientY} = liveMousePositionInfo.state;

    return WikiRect.fromRect({
      x: clientX,
      y: clientY,
      width: 0,
      height: 0,
    });
  }

  static fromElementUnderMouse(element) {
    const mouseRect = WikiRect.fromMouse();

    const rects =
      Array.from(element.getClientRects())
        .map(rect => WikiRect.fromRect(rect));

    const rectUnderMouse =
      rects.find(rect => rect.contains(mouseRect));

    if (rectUnderMouse) {
      return rectUnderMouse;
    } else {
      return rects[0];
    }
  }

  static leftOf(origin, offset = 0) {
    // Returns a rectangle representing everywhere to the left of the provided
    // point or rectangle (with no top or bottom bounds), towards negative x.
    // If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'x',
      extent: 'width',
      edge: 'left',
      direction: -Infinity,
      construct: from =>
        [from, -Infinity, -Infinity, Infinity],
    });
  }

  static rightOf(origin, offset = 0) {
    // Returns a rectangle representing everywhere to the right of the
    // provided point or rectangle (with no top or bottom bounds), towards
    // positive x. If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'x',
      extent: 'width',
      edge: 'right',
      direction: Infinity,
      construct: from =>
        [from, -Infinity, Infinity, Infinity],
    });
  }

  static above(origin, offset = 0) {
    // Returns a rectangle representing everywhere above the provided point
    // or rectangle (with no left or right bounds), towards negative y.
    // If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'y',
      extent: 'height',
      edge: 'top',
      direction: -Infinity,
      construct: from =>
        [-Infinity, from, Infinity, -Infinity],
    });
  }

  static beneath(origin, offset = 0) {
    // Returns a rectangle representing everywhere beneath the provided point
    // or rectangle (with no left or right bounds), towards positive y.
    // If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'y',
      extent: 'height',
      edge: 'bottom',
      direction: Infinity,
      construct: from =>
        [-Infinity, from, Infinity, Infinity],
    });
  }

  // Constructor helpers

  static #past(origin, offset, opts) {
    if (!isFinite(offset)) {
      throw new TypeError(`Didn't expect infinite offset`);
    }

    const {direction, edge} = opts;

    if (typeof origin === 'object') {
      const {origin: originProperty, extent: extentProperty} = opts;

      const normalized =
        WikiRect.fromRect(origin).toNormalized();

      if (normalized[extentProperty] === direction) {
        throw new TypeError(`Provided rectangle already extends to ${edge} edge`);
      }

      if (normalized[extentProperty] === -direction) {
        return this.#past(normalized[originProperty], offset, opts);
      }

      if (normalized.y === direction) {
        throw new TypeError(`Provided rectangle already starts at ${edge} edge`);
      }

      return this.#past(normalized[edge], offset, opts);
    }

    const {construct} = opts;

    if (origin === direction) {
      throw new TypeError(`Provided point is already at ${edge} edge`);
    }

    return Reflect.construct(this, construct(origin + offset)).toNormalized();
  }

  // Predicates

  static rejectInfiniteOriginNonZeroFiniteExtent({origin, extent}) {
    // Indicate that, in this context, it's meaningless to provide
    // a finite extent starting at an infinite origin and going towards
    // or away from zero (i.e. a rectangle along a cardinal edge).

    if (!isFinite(origin) && isFinite(extent) && extent !== 0) {
      throw new TypeError(`Didn't expect infinite origin paired with finite extent`);
    }
  }

  static rejectInfiniteOriginZeroExtent({origin, extent}) {
    // Indicate that, in this context, it's meaningless to provide
    // a zero extent at an infinite origin (i.e. a cardinal edge).

    if (!isFinite(origin) && extent === 0) {
      throw new TypeError(`Didn't expect infinite origin paired with zero extent`);
    }
  }

  static rejectNonOpposingInfiniteOriginInfiniteExtent({origin, extent}) {
    // Indicate that, in this context, it's meaningless to provide
    // an infinite extent going in the same direction as its infinite
    // origin (an area "infinitely past" a cardinal edge).

    if (!isFinite(origin) && origin === extent) {
      throw new TypeError(`Didn't expect non-opposing infinite origin and extent`);
    }
  }

  // Transformations

  static normalizeOriginExtent({origin, extent}) {
    // Varying behavior based on inputs:
    //
    //  - For finite origin and finite extent, flip the orientation
    //    (if necessary) so that extent is positive.
    //  - For finite origin and infinite extent (i.e. an origin up to
    //    a cardinal edge), leave as-is.
    //  - For infinite origin and infinite extent, flip the orientation
    //    (if necessary) so origin is negative and extent is positive.
    //  - For infinite origin and zero extent (i.e. a cardinal edge),
    //    leave as-is.
    //  - For all other cases, error.
    //

    this.rejectInfiniteOriginNonZeroFiniteExtent({origin, extent});
    this.rejectNonOpposingInfiniteOriginInfiniteExtent({origin, extent});

    if (isFinite(origin) && isFinite(extent) && extent < 0) {
      return {origin: origin + extent, extent: -extent};
    }

    if (!isFinite(origin) && !isFinite(extent)) {
      return {origin: -Infinity, extent: Infinity};
    }

    return {origin, extent};
  }

  toNormalized() {
    const {origin: newX, extent: newWidth} =
      WikiRect.normalizeOriginExtent({
        origin: this.x,
        extent: this.width,
      });

    const {origin: newY, extent: newHeight} =
      WikiRect.normalizeOriginExtent({
        origin: this.y,
        extent: this.height,
      });

    return Reflect.construct(this.constructor, [newX, newY, newWidth, newHeight]);
  }

  static intersectionFromOriginsExtents(...entries) {
    // An intersection is the common subsection across two or more regions.

    const [first, second, ...rest] = entries;

    if (entries.length >= 3) {
      return this.intersection(first, this.intersection(second, ...rest));
    }

    if (entries.length === 2) {
      if (first === null || second === null) {
        return null;
      }

      this.rejectInfiniteOriginZeroExtent(first);
      this.rejectInfiniteOriginZeroExtent(second);

      const {origin: origin1, extent: extent1} = this.normalizeOriginExtent(first);
      const {origin: origin2, extent: extent2} = this.normalizeOriginExtent(second);

      // After normalizing, *each* region will be one of these:
      //
      //  - Finite origin, finite extent
      //    (a standard region, bounded on both sides)
      //  - Finite origin, infinite extent
      //    (everything to one direction of a given origin)
      //  - Infinite origin, infinite extent
      //    (everything everywhere)
      //
      // So we need to handle any *combination* of these kinds of regions.

      // If either origin is infinite, that region represents everywhere,
      // so it'll never limit the region of the other.

      if (!isFinite(origin1)) {
        return {origin: origin2, extent: extent2};
      }

      if (!isFinite(origin2)) {
        return {origin: origin1, extent: extent1};
      }

      // If neither origin is infinite, both regions are bounded on at least
      // one side, and may limit the other accordingly. Find the minimum and
      // maximum points in each region, letting Infinity propagate through,
      // which represents no boundary in that direction.

      const minimum1 = Math.min(origin1, origin1 + extent1);
      const minimum2 = Math.min(origin2, origin2 + extent2);
      const maximum1 = Math.max(origin1, origin1 + extent1);
      const maximum2 = Math.max(origin2, origin2 + extent2);

      // Now get the maximum of the regions' minimums, and the minimum of the
      // regions' maximums. These are the limits of the new region; computing
      // with minimums and maximums in this way "polarizes" the limits, so we
      // can perform specific polarized math in the following steps.
      //
      // Infinity will also propagate here, but with some important
      // restricitons: only maxOfMinimums can be positive Infinity, and only
      // minOfMaximums can be negative Infinity; and if either is Infinity,
      // the other is not, since otherwise we'd be working with two everywhere
      // regions, and would've just returned an everywhere region above.

      const maxOfMinimums = Math.max(minimum1, minimum2);
      const minOfMaximums = Math.min(maximum1, maximum2);

      // Now check if the maximum of minimums is greater than the minimum of
      // maximums. If so, the regions don't have any overlap - one region
      // limits the overlap to end before the other region starts. This works
      // because we've polarized the limits above!

      if (maxOfMinimums > minOfMaximums) {
        return null;
      }

      // Otherwise there's at least some overlap, even if it's just one point
      // (i.e. one ends exactly where the other begins). We have to take care
      // of infinities in particular, now. As mentioned above, only one of the
      // points will be infinity (at most). So the origin is the non-infinite
      // point, and the extent is in the direction of the infinite point.

      if (minOfMaximums === -Infinity) {
        return {origin: maxOfMinimums, extent: -Infinity};
      }

      if (maxOfMinimums === Infinity) {
        return {origin: minOfMaximums, extent: Infinity};
      }

      // If neither point is infinity, we're working with two regions that are
      // both bounded on both sides, so the overlapping region is just the
      // region constrained by the limits above. Since these are polarized,
      // start from maxOfMinimums and extend to minOfMaximums, resulting in
      // a standard, already-normalized region.

      return {
        origin: maxOfMinimums,
        extent: minOfMaximums - maxOfMinimums,
      };
    }

    if (entries.length === 1) {
      return first;
    }

    throw new TypeError(`Expected at least one {origin, extent} entry`);
  }

  intersectionWith(rect) {
    const horizontalIntersection =
      WikiRect.intersectionFromOriginsExtents(
        {origin: this.x, extent: this.width},
        {origin: rect.x, extent: rect.width});

    const verticalIntersection =
      WikiRect.intersectionFromOriginsExtents(
        {origin: this.y, extent: this.height},
        {origin: rect.y, extent: rect.height});

    if (!horizontalIntersection) return null;
    if (!verticalIntersection) return null;

    const {origin: x, extent: width} = horizontalIntersection;
    const {origin: y, extent: height} = verticalIntersection;

    return Reflect.construct(this.constructor, [x, y, width, height]);
  }

  chopExtendingOutside(rect) {
    this.intersectionWith(rect).writeOnto(this);
  }

  static insetOriginExtent({origin, extent, start = 0, end = 0}) {
    const normalized =
      this.normalizeOriginExtent({origin, extent});

    // If this would crush the bounds past each other, just return
    // the halfway point.
    if (extent < start + end) {
      return {origin: origin + (start + end) / 2, extent: 0};
    }

    return {
      origin: normalized.origin + start,
      extent: normalized.extent - start - end,
    };
  }

  toInset(arg1, arg2) {
    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      return this.toInset({
        left: arg2,
        right: arg2,
        top: arg1,
        bottom: arg1,
      });
    } else if (typeof arg1 === 'number') {
      return this.toInset({
        left: arg1,
        right: arg1,
        top: arg1,
        bottom: arg1,
      });
    }

    const {top, left, bottom, right} = arg1;

    const {origin: x, extent: width} =
      WikiRect.insetOriginExtent({
        origin: this.x,
        extent: this.width,
        start: left,
        end: right,
      });

    const {origin: y, extent: height} =
      WikiRect.insetOriginExtent({
        origin: this.y,
        extent: this.height,
        start: top,
        end: bottom,
      });

    return Reflect.construct(this.constructor, [x, y, width, height]);
  }

  static extendOriginExtent({origin, extent, start = 0, end = 0}) {
    const normalized =
      this.normalizeOriginExtent({origin, extent});

    return {
      origin: normalized.origin - start,
      extent: normalized.extent + start + end,
    };
  }

  toExtended(arg1, arg2) {
    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      return this.toExtended({
        left: arg2,
        right: arg2,
        top: arg1,
        bottom: arg1,
      });
    } else if (typeof arg1 === 'number') {
      return this.toExtended({
        left: arg1,
        right: arg1,
        top: arg1,
        bottom: arg1,
      });
    }

    const {top, left, bottom, right} = arg1;

    const {origin: x, extent: width} =
      WikiRect.extendOriginExtent({
        origin: this.x,
        extent: this.width,
        start: left,
        end: right,
      });

    const {origin: y, extent: height} =
      WikiRect.extendOriginExtent({
        origin: this.y,
        extent: this.height,
        start: top,
        end: bottom,
      });

    return Reflect.construct(this.constructor, [x, y, width, height]);
  }

  // Comparisons

  equals(rect) {
    const rectNormalized = WikiRect.fromRect(rect).toNormalized();
    const thisNormalized = this.toNormalized();

    return (
      rectNormalized.x === thisNormalized.x &&
      rectNormalized.y === thisNormalized.y &&
      rectNormalized.width === thisNormalized.width &&
      rectNormalized.height === thisNormalized.height
    );
  }

  contains(rect) {
    return !!this.intersectionWith(rect)?.equals(rect);
  }

  containedWithin(rect) {
    return !!this.intersectionWith(rect)?.equals(this);
  }

  fits(rect) {
    const rectNormalized = WikiRect.fromRect(rect).toNormalized();
    const thisNormalized = this.toNormalized();

    return (
      (!isFinite(this.width) || rectNormalized.width <= thisNormalized.width) &&
      (!isFinite(this.height) || rectNormalized.height <= thisNormalized.height)
    );
  }

  fitsWithin(rect) {
    const rectNormalized = WikiRect.fromRect(rect).toNormalized();
    const thisNormalized = this.toNormalized();

    return (
      (!isFinite(rect.width) || thisNormalized.width <= rectNormalized.width) &&
      (!isFinite(rect.height) || thisNormalized.height <= rectNormalized.height)
    );
  }

  // Interfacing utilities

  static fromRect(rect) {
    return Reflect.construct(this, [rect.x, rect.y, rect.width, rect.height]);
  }

  writeOnto(destination) {
    Object.assign(destination, {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    });
  }
}
