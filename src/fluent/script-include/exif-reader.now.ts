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
    var mark = x_require('x_1741852_exifnow/now-sdk-exiftool/0.0.1/src/server/jimp.server.js');
    this._mark = new mark.Watermark();
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

    addWatermark: function(attachmentSysId){
      var attachUtil = new GlideSysAttachment();
      var attributes = this.getAttributes(attachmentSysId);
      var gps = attributes?.["gps_latitude"] + ", " + attributes?.["gps_longitude"];
      var watermark = this._mark({
        text: gps,
        fontSize: 32,
        padding: 16,
      });
        var grAtt = new GlideRecord('sys_attachment');
        if (!grAtt.get(attachmentSysId)) {
          gs.warn('ExifReaderUtils: attachment not found: ' + attachmentSysId, 'ExifReaderUtils');
          return {};
        }
      var base64 = attachUtil.getContentBase64(grAtt);
      var output = await watermark.apply(base64);
      var rec = new GlideRecord('sys_user');
var incidentSysID = '6816f79cc0a8016401c5a33be04be441';
rec.get(incidentSysID);
var fileName = 'example.jpeg';
var contentType = 'image/jpeg';
var newAttach = attachUtil.writeBase64(rec, fileName, contentType, output);
    },

    getAttributes: function(attachmentSysId){
      var attributes = {};
      var util = new GlideSysAttachment();
      var attrGR = util.fetachAllAttributes(attachmentSysId);
      while(attGR.next()){
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
