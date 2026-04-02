import Jimp from 'jimp';

export default class Watermark {
  constructor(options = {}) {
    this.text = options.text ?? 'WATERMARK';
    this.fontSize = options.fontSize ?? 32;
    this.padding = options.padding ?? 10;
  }

  _getFontPath() {
    const fontMap = {
      16: Jimp.FONT_SANS_16_WHITE,
      32: Jimp.FONT_SANS_32_WHITE,
      64: Jimp.FONT_SANS_64_WHITE,
    };
    const sizes = Object.keys(fontMap).map(Number);
    const closest = sizes.reduce((a, b) =>
      Math.abs(b - this.fontSize) < Math.abs(a - this.fontSize) ? b : a
    );
    return fontMap[closest];
  }

  async apply(base64Input) {
    const buffer = Buffer.from(base64Input, 'base64');
    const image = await Jimp.read(buffer);
    const font = await Jimp.loadFont(this._getFontPath());

    const textWidth = Jimp.measureText(font, this.text);
    const textHeight = Jimp.measureTextHeight(font, this.text, textWidth);

    const x = image.bitmap.width - textWidth - this.padding;
    const y = this.padding;

    image.print(font, x, y, this.text, textWidth, textHeight);

    const outputBuffer = await image.getBufferAsync(image.getMIME());
    return outputBuffer.toString('base64');
  }
}
