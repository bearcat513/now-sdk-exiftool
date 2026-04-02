// src/fluent/exifReaderInclude.js
import "@servicenow/sdk/global";
import { ScriptInclude } from "@servicenow/sdk/core";

ScriptInclude({
  $id: Now.ID["x-require-si"],
  name: "x_require",
  description:
    "Thin bridge that exposes require() to classic script contexts and cross-scope callers.",
  active: true,
  script: `
var x_require = function(path) {
  return require(path);
};
  `,
});

ScriptInclude({
  $id: Now.ID["exif-reader-utils-si"],
  name: "ExifReaderUtils",
  description:
    "Wrapper around the exifreader npm module for parsing image EXIF metadata from attachments.",
  accessibleFrom: "public",
  active: true,
  script: /* javascript */ `
var ExifReaderUtils = Class.create();

ExifReaderUtils.prototype = {
  initialize: function() {
    // Load the bundled server module via require()
    var mod = x_require('x_1741852_exifnow/now-sdk-exiftool/0.0.1/src/server/exif-reader.server.js');
    this._impl = new mod.ExifReaderUtils();
    // Don't load Jimp immediately - wait until watermark is needed
    this._mark = null;
  },

  _getWatermarker: function() {
    if (!this._mark) {
      try {
        var mark = x_require('x_1741852_exifnow/now-sdk-exiftool/0.0.1/src/server/jimp.server.js');
        this._mark = new mark.default();
      } catch (e) {
        gs.error('ExifReaderUtils: Failed to load watermark module: ' + e.message, 'ExifReaderUtils');
        return null;
      }
    }
    return this._mark;
  },

  parseFromAttachment: function(attachmentSysId) {
      try {
        var grAtt = new GlideRecord('sys_attachment');
        if (!grAtt.get(attachmentSysId)) {
          gs.warn('ExifReaderUtils: attachment not found: ' + attachmentSysId, 'ExifReaderUtils');
          return {};
        }
        var sa = new GlideSysAttachment();
        var base64Data = sa.getContentBase64(grAtt);
        if (!base64Data) {
          gs.warn('ExifReaderUtils: no content for: ' + attachmentSysId, 'ExifReaderUtils');
          return {};
        }
        // Pass the raw base64 string directly — the module handles decoding
        // with a pure-JS decoder that avoids Rhino's UTF-8 corruption of binary bytes
        return this._impl.parseFromBase64(base64Data.toString());
      } catch (e) {
        gs.error('ExifReaderUtils.parseFromAttachment: ' + e.message, 'ExifReaderUtils');
        return {};
      }
    },

    parseFromBase64: function(base64Data) {
      try {
        return this._impl.parseFromBase64(base64Data.toString());
      } catch (e) {
        gs.error('ExifReaderUtils.parseFromBase64: ' + e.message, 'ExifReaderUtils');
        return {};
      }
    },

    addWatermark: function(attachmentSysId, targetTable, targetRecord){
      var watermarker = this._getWatermarker();
      if (!watermarker) {
        gs.error('ExifReaderUtils: Watermark functionality not available', 'ExifReaderUtils');
        return false;
      }

      try {
        var grAtt = new GlideRecord('sys_attachment');
        if (!grAtt.get(attachmentSysId)) {
          gs.warn('ExifReaderUtils: attachment not found: ' + attachmentSysId, 'ExifReaderUtils');
          return false;
        }

        // Get GPS coordinates from EXIF data
        var exifData = this.parseFromAttachment(attachmentSysId);
        var gpsText = '';

        if (exifData.gps && exifData.gps.Latitude && exifData.gps.Longitude) {
          gpsText = 'GPS: ' + exifData.gps.Latitude + ', ' + exifData.gps.Longitude;
        } else {
          gs.warn('ExifReaderUtils: No GPS data found in attachment', 'ExifReaderUtils');
          gpsText = 'No GPS data available';
        }

        var attachUtil = new GlideSysAttachment();
        var base64 = attachUtil.getContentBase64(grAtt);

        if (!base64) {
          gs.warn('ExifReaderUtils: No image data found', 'ExifReaderUtils');
          return false;
        }

        // Set watermark properties
        watermarker.text = gpsText;
        watermarker.fontSize = 32;
        watermarker.padding = 16;
        watermarker.fontColor = 'white';

        // Try Java-based watermarking first
        var watermarkedBase64;
        try {
          watermarkedBase64 = watermarker.apply(base64.toString());
        } catch (e) {
          gs.warn('ExifReaderUtils: Java watermarking failed: ' + e.message, 'ExifReaderUtils');
          watermarkedBase64 = null;
        }

        if (watermarkedBase64 && watermarkedBase64 !== base64.toString()) {
          // Create new attachment with watermarked image
          var fileName = 'watermarked_' + (grAtt.getValue('file_name') || 'image.png');
          var contentType = grAtt.getValue('content_type') || 'image/png';

          // Use provided target or default to sys_user table
          var targetTableName = targetTable || 'sys_user';
          var targetRecordId = targetRecord || '6816f79cc0a8016401c5a33be04be441'; // fallback record

          var targetGR = new GlideRecord(targetTableName);
          if (targetGR.get(targetRecordId)) {
            var newAttachSysId = attachUtil.writeBase64(targetGR, fileName, contentType, watermarkedBase64);
            gs.info('ExifReaderUtils: Java watermarked image created: ' + newAttachSysId + ' with GPS: ' + gpsText, 'ExifReaderUtils');
            return newAttachSysId;
          } else {
            gs.warn('ExifReaderUtils: Target record not found: ' + targetRecordId, 'ExifReaderUtils');
            // Fall through to metadata approach
          }
        }

        // Fallback: Log GPS watermark information if visual watermarking failed
        watermarker.logWatermark(attachmentSysId, gs);
        gs.info('ExifReaderUtils: GPS metadata logged for attachment ' + attachmentSysId + ': ' + gpsText, 'ExifReaderUtils');
        return attachmentSysId; // Return original attachment ID
      } catch (e) {
        gs.error('ExifReaderUtils.addWatermark: ' + e.message, 'ExifReaderUtils');
        return false;
      }
    },

    getAttributes: function(attachmentSysId){
      var attributes = {};
      var util = new GlideSysAttachment();
      var attrGR = util.fetchAllAttributes(attachmentSysId);
      while(attrGR.next()){
        var key = attrGR.getValue("key").toLowerCase();
        var val = attrGR.getValue("value");
        attributes[key] = val;
      }
      return attributes;
    },

    getTag: function(attachmentSysId, tagName) {
      var tags = this.parseFromAttachment(attachmentSysId);
      return this._impl.getTag(tags, tagName);
    },

    type: 'ExifReaderUtils'
};
  `,
});
