(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};

  class SpatialHash {
    constructor(cellSize) {
      this.cellSize = cellSize;
      this.map = new Map();
    }

    clear() {
      this.map.clear();
    }

    _key(ix, iy) {
      return ix + ':' + iy;
    }

    insert(x, y, value) {
      const ix = Math.floor(x / this.cellSize);
      const iy = Math.floor(y / this.cellSize);
      const key = this._key(ix, iy);
      let bucket = this.map.get(key);
      if (!bucket) {
        bucket = [];
        this.map.set(key, bucket);
      }
      bucket.push(value);
    }

    query(x, y, radius, out) {
      const minX = Math.floor((x - radius) / this.cellSize);
      const maxX = Math.floor((x + radius) / this.cellSize);
      const minY = Math.floor((y - radius) / this.cellSize);
      const maxY = Math.floor((y + radius) / this.cellSize);
      for (let iy = minY; iy <= maxY; iy++) {
        for (let ix = minX; ix <= maxX; ix++) {
          const bucket = this.map.get(this._key(ix, iy));
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i++) {
            out.push(bucket[i]);
          }
        }
      }
      return out;
    }
  }

  lib.SpatialHash = SpatialHash;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpatialHash };
  }
})(typeof window !== 'undefined' ? window : globalThis);
