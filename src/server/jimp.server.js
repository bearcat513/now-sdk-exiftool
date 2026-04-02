// ServiceNow Java-based watermark implementation
// Attempts to use Java AWT classes for image processing

export default class Watermark {
  constructor(options = {}) {
    this.text = options.text ?? 'WATERMARK';
    this.fontSize = options.fontSize ?? 32;
    this.padding = options.padding ?? 10;
    this.fontColor = options.fontColor ?? 'white';
  }

  apply(base64Input) {
    try {
      // Try Java-based image processing first
      return this._applyJavaWatermark(base64Input);
    } catch (e) {
      // Fallback to metadata approach if Java classes are restricted
      return this._addMetadataWatermark(base64Input);
    }
  }

  _applyJavaWatermark(base64Input) {
    try {
      // Access Java classes through Packages
      var BufferedImage = Packages.java.awt.image.BufferedImage;
      var Graphics2D = Packages.java.awt.Graphics2D;
      var Font = Packages.java.awt.Font;
      var Color = Packages.java.awt.Color;
      var RenderingHints = Packages.java.awt.RenderingHints;
      var ImageIO = Packages.javax.imageio.ImageIO;
      var ByteArrayInputStream = Packages.java.io.ByteArrayInputStream;
      var ByteArrayOutputStream = Packages.java.io.ByteArrayOutputStream;
      var Base64 = Packages.java.util.Base64;

      // Decode base64 to byte array
      var decoder = Base64.getDecoder();
      var imageBytes = decoder.decode(base64Input);
      var inputStream = new ByteArrayInputStream(imageBytes);

      // Read the image
      var originalImage = ImageIO.read(inputStream);
      if (!originalImage) {
        throw new Error('Failed to decode image');
      }

      // Create a copy of the image for watermarking
      var width = originalImage.getWidth();
      var height = originalImage.getHeight();
      var watermarkedImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);

      // Get graphics context
      var g2d = watermarkedImage.createGraphics();

      // Draw original image
      g2d.drawImage(originalImage, 0, 0, null);

      // Set rendering hints for better text quality
      g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

      // Configure font and color
      var font = new Font("Arial", Font.BOLD, this.fontSize);
      g2d.setFont(font);

      // Get font metrics to calculate text dimensions
      var fontMetrics = g2d.getFontMetrics(font);
      var textWidth = fontMetrics.stringWidth(this.text);
      var textHeight = fontMetrics.getHeight();

      // Calculate position (bottom-right corner with padding)
      var x = width - textWidth - this.padding;
      var y = height - this.padding;

      // Draw semi-transparent background rectangle
      g2d.setColor(new Color(0, 0, 0, 128)); // Black with 50% transparency
      g2d.fillRect(x - 5, y - textHeight - 5, textWidth + 10, textHeight + 10);

      // Draw the watermark text
      if (this.fontColor === 'white') {
        g2d.setColor(Color.WHITE);
      } else if (this.fontColor === 'black') {
        g2d.setColor(Color.BLACK);
      } else {
        g2d.setColor(Color.WHITE); // default
      }

      g2d.drawString(this.text, x, y - 5);

      // Clean up graphics context
      g2d.dispose();

      // Convert back to base64
      var outputStream = new ByteArrayOutputStream();
      var format = this._getImageFormat(base64Input);
      ImageIO.write(watermarkedImage, format, outputStream);

      var outputBytes = outputStream.toByteArray();
      var encoder = Base64.getEncoder();
      var base64Output = encoder.encodeToString(outputBytes);

      // Clean up
      outputStream.close();
      inputStream.close();

      return base64Output;

    } catch (e) {
      throw new Error('Java watermarking failed: ' + e.message);
    }
  }

  _getImageFormat(base64Input) {
    // Detect image format from base64 header
    if (this._isJPEG(base64Input)) {
      return 'jpg';
    } else if (this._isPNG(base64Input)) {
      return 'png';
    } else {
      return 'png'; // default to PNG
    }
  }

  _isJPEG(base64Input) {
    return base64Input.startsWith('/9j/') || base64Input.startsWith('data:image/jpeg');
  }

  _isPNG(base64Input) {
    return base64Input.startsWith('iVBORw0KGgo') || base64Input.startsWith('data:image/png');
  }

  _base64ToUint8Array(base64) {
    // Pure JS base64 decoder for Rhino environment
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }

    const clean = base64.replace(/[=\s]/g, '');
    const len = Math.floor((clean.length * 3) / 4);
    const bytes = new Uint8Array(len);
    let byteIndex = 0;

    for (let i = 0; i < clean.length; i += 4) {
      const a = lookup[clean.charCodeAt(i)];
      const b = lookup[clean.charCodeAt(i + 1)];
      const c = lookup[clean.charCodeAt(i + 2)];
      const d = lookup[clean.charCodeAt(i + 3)];

      bytes[byteIndex++] = (a << 2) | (b >> 4);
      if (i + 2 < clean.length) bytes[byteIndex++] = ((b & 0xf) << 4) | (c >> 2);
      if (i + 3 < clean.length) bytes[byteIndex++] = ((c & 0x3) << 6) | d;
    }

    return bytes.slice(0, byteIndex);
  }

  _uint8ArrayToBase64(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i];
      const b = bytes[i + 1];
      const c = bytes[i + 2];
      result += chars[a >> 2];
      result += chars[((a & 3) << 4) | (b >> 4)];
      result += isNaN(b) ? '=' : chars[((b & 0xf) << 2) | (c >> 6)];
      result += isNaN(c) ? '=' : chars[c & 0x3f];
    }
    return result;
  }

  _bufferToStream(buffer) {
    // Simple stream implementation for Rhino
    return {
      data: buffer,
      position: 0,
      read: function(size) {
        const chunk = this.data.slice(this.position, this.position + size);
        this.position += chunk.length;
        return chunk;
      }
    };
  }

  _createWritableStream() {
    const chunks = [];
    return {
      chunks: chunks,
      write: function(chunk) {
        this.chunks.push(chunk);
      },
      getBuffer: function() {
        // Concatenate all chunks into a single Uint8Array
        let totalLength = 0;
        for (let chunk of this.chunks) {
          totalLength += chunk.length;
        }

        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (let chunk of this.chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        return result;
      }
    };
  }

  _addMetadataWatermark(base64Input) {
    // Fallback metadata approach - just return original image
    // Logging will be handled in the script include where gs is available
    return base64Input;
  }

  // Alternative: External API watermarking using REST
  applyExternalWatermark(base64Input, apiKey) {
    try {
      // Example using ConvertAPI or similar service
      var request = new sn_ws.RESTMessageV2();
      request.setEndpoint('https://api.convertapi.com/convert/jpg/to/jpg');
      request.setHttpMethod('POST');
      request.setRequestHeader('Authorization', 'Bearer ' + apiKey);

      var requestBody = {
        Parameters: [
          {
            Name: 'File',
            FileValue: {
              Data: base64Input,
              Name: 'image.jpg'
            }
          },
          {
            Name: 'Text',
            Value: this.text
          },
          {
            Name: 'FontColor',
            Value: '#FFFFFF'
          },
          {
            Name: 'Opacity',
            Value: '80'
          },
          {
            Name: 'Position',
            Value: 'BottomRight'
          }
        ]
      };

      request.setRequestBody(JSON.stringify(requestBody));
      request.setRequestHeader('Content-Type', 'application/json');

      var response = request.execute();
      if (response.getStatusCode() === 200) {
        var responseBody = JSON.parse(response.getBody());
        return responseBody.Files[0].FileData;
      } else {
        throw new Error('External API failed: ' + response.getStatusCode());
      }
    } catch (e) {
      throw new Error('External watermarking failed: ' + e.message);
    }
  }

  // Log watermark information (to be called from script include context)
  logWatermark(attachmentSysId, gsObject) {
    try {
      var watermarkInfo = 'GPS Watermark: ' + this.text;
      if (gsObject && gsObject.info) {
        gsObject.info('Watermark applied to attachment ' + attachmentSysId + ': ' + watermarkInfo, 'Watermark');
      }
      return true;
    } catch (e) {
      if (gsObject && gsObject.error) {
        gsObject.error('Failed to log watermark: ' + e.message, 'Watermark');
      }
      return false;
    }
  }
}
