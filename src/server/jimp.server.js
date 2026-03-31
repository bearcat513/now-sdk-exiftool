import Jimp from "jimp-compact";

/**
 * Overlays EXIF metadata as a text watermark onto an image.
 * Both input and output are Uint8Array — no file system, no Canvas, no DOM.
 */
export class ImageWatermarker {
  /**
   * @param {object} options
   * @param {string[]} [options.fields]    EXIF tag names to include in the watermark.
   *                                       Defaults to a sensible set of photo metadata fields.
   * @param {string}  [options.position]   'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
   * @param {number}  [options.opacity]    0–1, default 0.75
   * @param {number}  [options.fontSize]   Jimp font constant index (1–8), default 4 (16px white)
   */
  constructor(options = {}) {
    this.fields = options.fields || [
      "Make",
      "Model",
      "DateTime",
      "GPSLatitude",
      "GPSLongitude",
      "ExposureTime",
      "FNumber",
      "ISOSpeedRatings",
    ];
    this.position = options.position || "bottom-left";
    this.opacity = options.opacity !== undefined ? options.opacity : 0.75;
    // Jimp ships bitmap fonts as constants; FONT_SANS_16_WHITE is a safe, readable default
    this._fontKey = options.fontKey || Jimp.FONT_SANS_16_WHITE;
  }

  /**
   * Compose a watermark string from an EXIF tag map.
   * Only includes tags that are actually present in the image.
   * @param {object} tags - output of ExifReaderUtils.parseFromBase64()
   * @returns {string}
   */
  buildWatermarkText(tags) {
    const lines = [];

    for (const field of this.fields) {
      if (
        tags[field] !== undefined &&
        tags[field] !== null &&
        tags[field] !== ""
      ) {
        // Human-readable label formatting
        const label = field
          .replace(/([A-Z])/g, " $1") // CamelCase → space-separated
          .trim();
        lines.push(`${label}: ${tags[field]}`);
      }
    }

    return lines.join("\n") || "No EXIF metadata";
  }

  /**
   * Overlay EXIF metadata as a watermark on the image.
   * @param {Uint8Array} imageBytes  - raw image bytes (PNG or JPEG)
   * @param {object}     tags        - EXIF tag map from ExifReaderUtils
   * @returns {Promise<Uint8Array>}  - watermarked image as Uint8Array (same format as input)
   */
  async watermark(imageBytes, tags) {
    const buffer = Buffer.from(imageBytes.buffer);
    const image = await Jimp.read(buffer);
    const font = await Jimp.loadFont(this._fontKey);

    const text = this.buildWatermarkText(tags);
    const imgW = image.getWidth();
    const imgH = image.getHeight();
    const padX = 12;
    const padY = 12;
    const lineH = 18; // approximate px per line for 16px font
    const lines = text.split("\n");
    const textH = lines.length * lineH;

    // Calculate top-left corner of the text block based on position
    let x, y;
    switch (this.position) {
      case "top-left":
        x = padX;
        y = padY;
        break;
      case "top-right":
        x = imgW - 180;
        y = padY;
        break;
      case "bottom-right":
        x = imgW - 180;
        y = imgH - textH - padY;
        break;
      case "bottom-left":
      default:
        x = padX;
        y = imgH - textH - padY;
        break;
    }

    // Draw a semi-transparent dark background rectangle for readability
    const bgImage = new Jimp(180, textH + padY * 2, 0x00000000);
    bgImage.opacity(0.45);
    image.composite(bgImage, x - padX / 2, y - padY / 2);

    // Print each line individually (Jimp.print doesn't handle \n in all versions)
    for (let i = 0; i < lines.length; i++) {
      image.print(font, x, y + i * lineH, lines[i]);
    }

    // Return as Uint8Array in the original MIME type
    const outBuffer = await image.getBufferAsync(image.getMIME());
    return new Uint8Array(outBuffer);
  }
}
