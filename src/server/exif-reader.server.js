import ExifReader from "exifreader";
// import { ImageWatermarker } from "./jimp.server.js";

// Pure-JS base64 → Uint8Array decoder.
// Does NOT go through Rhino's string layer, so no UTF-8 corruption of high bytes.
const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

function base64ToUint8Array(base64) {
  // Strip whitespace/line breaks that ServiceNow sometimes injects
  const clean = base64.replace(/[\s\r\n=]/g, "");
  const len = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(len);
  let byteIndex = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const a = B64_LOOKUP[clean.charCodeAt(i)];
    const b = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const c = B64_LOOKUP[clean.charCodeAt(i + 2)];
    const d = B64_LOOKUP[clean.charCodeAt(i + 3)];

    bytes[byteIndex++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) bytes[byteIndex++] = ((b & 0xf) << 4) | (c >> 2);
    if (i + 3 < clean.length) bytes[byteIndex++] = ((c & 0x3) << 6) | d;
  }

  return bytes.slice(0, byteIndex);
}

export class ExifReaderUtils {
  /**
   * Parse EXIF from a raw base64 string.
   * Uses a pure-JS decoder — avoids Rhino's UTF-8 string coercion
   * which corrupts bytes > 127 in binary files.
   * @param {string} base64String
   * @returns {Object}
   */
  // parseFromBase64(base64String) {
  //   try {
  //     const bytes = base64ToUint8Array(base64String);
  //     return this._parse(bytes);
  //   } catch (e) {
  //     return { _error: e.message };
  //   }
  // }

  // /**
  //  * Parse EXIF from a Uint8Array of raw bytes (if you already have them).
  //  * @param {Uint8Array} bytes
  //  * @returns {Object}
  //  */
  // parseFromBytes(bytes) {
  //   try {
  //     return this._parse(bytes);
  //   } catch (e) {
  //     return { _error: e.message };
  //   }
  // }

  getTag(tags, tagName) {
    return tags[tagName] || null;
  }

  _parse(bytes) {
    const tags = ExifReader.load(bytes.buffer);
    return this._normalizeTags(tags);
  }

  parseFromBytes(bytes) {
    try {
      // expanded: true adds a pre-computed `gps` group with signed Latitude/Longitude
      const allTags = ExifReader.load(bytes.buffer, { expanded: true });
      return {
        // flat tags for general use (same shape as before)
        tags: this._normalizeTags(allTags),
        // pre-signed GPS coordinates — ready to use directly
        gps: allTags.gps || null,
      };
    } catch (e) {
      return { tags: {}, gps: null, _error: e.message };
    }
  }

  parseFromBase64(base64String) {
    const bytes = base64ToUint8Array(base64String);
    return this.parseFromBytes(bytes);
  }

  /**
   * Returns { latitude, longitude } with correct signs applied,
   * or null if no GPS data is present.
   * Uses ExifReader's built-in expanded GPS group — no manual Ref handling.
   */
  extractCoordinates(base64String) {
    const { gps } = this.parseFromBase64(base64String);
    if (!gps || gps.Latitude == null || gps.Longitude == null) return null;
    return {
      latitude: gps.Latitude, // already signed: S → negative
      longitude: gps.Longitude, // already signed: W → negative
    };
  }

  _normalizeTags(rawTags) {
    return rawTags;
  }

  // _normalizeTags(rawTags) {
  //   const result = {};
  //   for (const [key, tag] of Object.entries(rawTags)) {
  //     if (tag && typeof tag === "object" && "description" in tag) {
  //       result[key] = tag.description;
  //     } else if (typeof tag !== "object") {
  //       result[key] = tag;
  //     }
  //   }
  //   return result;
  // }
}

function uint8ArrayToBase64(bytes) {
  const B64 =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1],
      c = bytes[i + 2];
    result += B64[a >> 2];
    result += B64[((a & 3) << 4) | (b >> 4)];
    result += isNaN(b) ? "=" : B64[((b & 0xf) << 2) | (c >> 6)];
    result += isNaN(c) ? "=" : B64[c & 0x3f];
  }
  return result;
}
