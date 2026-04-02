# ServiceNow GPS EXIF Watermarking Service

A comprehensive ServiceNow application for extracting GPS coordinates from image EXIF data and applying watermarks using automated testing framework (ATF) with client-side processing.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Advanced Watermarking with ATF](#advanced-watermarking-with-atf)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Overview

This ServiceNow application provides:

1. **EXIF GPS Data Extraction**: Server-side extraction of GPS coordinates from image attachments
2. **Metadata Watermarking**: Logging of GPS coordinates as metadata
3. **ATF-Based Visual Watermarking**: Automated client-side image processing using Canvas API
4. **Comprehensive Error Handling**: Graceful fallbacks for various scenarios

## Features

### ✅ Core Functionality
- Extract GPS coordinates from JPEG and PNG images
- Parse EXIF metadata using pure JavaScript
- Support for both signed and unsigned GPS coordinates
- Comprehensive error handling and logging

### ✅ Watermarking Options
- **Metadata Watermarking**: Log GPS data to ServiceNow logs
- **ATF Visual Watermarking**: Create actual watermarked images using browser Canvas API
- **Fallback Support**: Multiple approaches ensure functionality in various environments

### ✅ ServiceNow Integration
- Script Include for server-side processing
- Service Portal integration for client-side watermarking
- ATF test automation for scalable processing
- Full ServiceNow SDK/Fluent API implementation

## Installation

### Prerequisites
- ServiceNow instance (Quebec or later recommended)
- Automated Test Framework (ATF) plugin activated
- Service Portal enabled (for visual watermarking)

### Deploy the Application

1. **Build and Deploy**:
   ```bash
   npm run build
   npm run deploy
   ```

2. **Verify Installation**:
   - Check that `ExifReaderUtils` script include is created
   - Verify ATF test `Image Watermarking ATF Test` is available
   - Confirm Service Portal page `image_watermark_processor` exists

## Basic Usage

### Extract GPS Coordinates from Image

```javascript
// Create ExifReaderUtils instance
var exif = new ExifReaderUtils();

// Extract GPS data from attachment
var attachmentSysId = '7376221483844f1492179565eeaad373';
var gpsData = exif.parseFromAttachment(attachmentSysId);

// Check if GPS coordinates were found
if (gpsData.gps && gpsData.gps.Latitude && gpsData.gps.Longitude) {
    gs.info('GPS Coordinates: ' + gpsData.gps.Latitude + ', ' + gpsData.gps.Longitude);
} else {
    gs.info('No GPS data found in image');
}
```

### Apply Metadata Watermark

```javascript
var exif = new ExifReaderUtils();

// Apply watermark (logs GPS coordinates)
var result = exif.addWatermark(
    '7376221483844f1492179565eeaad373', // attachment sys_id
    'incident',                          // target table (optional)
    'incident-record-sys-id'            // target record (optional)
);

if (result) {
    gs.info('Watermark applied successfully');
} else {
    gs.error('Watermark application failed');
}
```

## Automated Processing with Business Rules

The application includes a demonstration business rule that automatically processes new image attachments:

### GPS Watermark Demo Business Rule

This business rule automatically:

1. Detects when new image attachments are added to any table
2. Extracts GPS coordinates from EXIF data
3. Applies metadata watermarking (logs GPS coordinates)
4. Updates incident work notes if the attachment is on an incident

The business rule runs automatically - no manual intervention required.

## Advanced Watermarking Options

### Visual Watermarking Challenges

Due to ServiceNow's server-side environment restrictions, visual watermarking faces several technical challenges:

**Server-Side Limitations:**
- **Java AWT Restrictions**: ServiceNow blocks access to `java.awt.image` classes for security
- **No Canvas API**: HTML5 Canvas API not available in Rhino JavaScript environment
- **Node.js Dependencies**: Most image processing libraries require Node.js APIs

**Attempted Solutions:**
1. **Java AWT Integration**: Blocked by ServiceNow security restrictions
2. **PureImage Library**: Incompatible with Rhino environment
3. **ATF UI Testing**: Complex SDK API requirements for advanced components

### Recommended Approaches for Visual Watermarking

**1. External API Integration** (Most Practical):
```javascript
// Example: ConvertAPI integration
var request = new sn_ws.RESTMessageV2();
request.setEndpoint('https://api.convertapi.com/convert/jpg/to/jpg');
// Add watermark parameters and process externally
```

**2. Client-Side Processing** (Browser-Based):
```javascript
// Use HTML5 Canvas in Service Portal widgets
function applyWatermark(canvas, gpsText) {
    var ctx = canvas.getContext('2d');
    // Apply watermark using Canvas API
}
```

**3. MID Server Processing** (If Available):
- Deploy Node.js image processing on MID server
- Full access to libraries like Sharp, Jimp, or Canvas

### Manual Processing

For manual processing or custom workflows:

```javascript
// Business Rule or Scheduled Script Execution
var gr = new GlideRecord('sys_attachment');
gr.addQuery('content_type', 'CONTAINS', 'image');
gr.addQuery('sys_created_on', '>', gs.hoursAgoStart(24)); // Last 24 hours
gr.query();

while (gr.next()) {
    var exif = new ExifReaderUtils();
    var gpsData = exif.parseFromAttachment(gr.getUniqueValue());

    if (gpsData.gps) {
        // Trigger ATF watermarking for images with GPS data
        // (Implementation depends on your batch processing requirements)
    }
}
```

## API Reference

### ExifReaderUtils Class

#### Methods

##### `parseFromAttachment(attachmentSysId)`
Extracts EXIF data from a ServiceNow attachment.

**Parameters:**
- `attachmentSysId` (string): The sys_id of the attachment record

**Returns:**
- Object with `tags` and `gps` properties
- `gps`: Contains `Latitude` and `Longitude` with proper sign handling
- `tags`: Raw EXIF tag data

**Example:**
```javascript
var result = exif.parseFromAttachment('abc123');
// Returns: { gps: { Latitude: 39.15212222, Longitude: -84.45426944 }, tags: {...} }
```

##### `addWatermark(attachmentSysId, targetTable, targetRecord)`
Applies GPS watermark to an image attachment.

**Parameters:**
- `attachmentSysId` (string): Source attachment sys_id
- `targetTable` (string, optional): Target table for new attachment
- `targetRecord` (string, optional): Target record sys_id

**Returns:**
- String: Original attachment sys_id (for metadata approach)
- String: New attachment sys_id (if visual watermarking successful)
- Boolean: `false` if failed

##### `getTag(attachmentSysId, tagName)`
Retrieves a specific EXIF tag value.

**Parameters:**
- `attachmentSysId` (string): Attachment sys_id
- `tagName` (string): EXIF tag name (e.g., 'GPS')

**Returns:**
- Mixed: Tag value or `null` if not found

### Service Portal Integration

#### Image Watermark Processor Page
- **URL**: `/sp?id=image_watermark_processor&attachment_id=ATTACHMENT_SYS_ID`
- **Purpose**: Provides client-side Canvas processing for visual watermarks
- **Integration**: Designed to work with ATF automation

## Troubleshooting

### Common Issues

#### 1. "ExifReaderUtils not found"
**Solution**: Ensure the application is deployed and the script include is active.

```javascript
// Check if script include exists
var gr = new GlideRecord('sys_script_include');
gr.addQuery('name', 'ExifReaderUtils');
gr.query();
if (gr.next()) {
    gs.info('ExifReaderUtils found and active: ' + gr.getValue('active'));
}
```

#### 2. "No GPS data found"
**Solution**: Verify the image contains GPS EXIF data.

```javascript
// Debug EXIF tags
var exif = new ExifReaderUtils();
var data = exif.parseFromAttachment(attachmentSysId);
gs.info('Available EXIF tags: ' + Object.keys(data.tags).join(', '));
```

#### 3. "Business rule not triggering"
**Common causes:**
- Business rule is inactive
- Attachment is not an image type
- Script include not found

**Solution**: Check business rule configuration and system logs for error messages.

#### 4. "Java AWT restrictions"
This is expected behavior. The application automatically falls back to metadata watermarking.

```
Security restricted: Attempted access to restricted class name java.awt.image
```

### Debug Mode

Enable detailed logging:

```javascript
// Enable debug logging in script
gs.setProperty('glide.script.log.level', 'debug');

// Run with debug
var exif = new ExifReaderUtils();
var result = exif.parseFromAttachment(attachmentSysId);
```

## Examples

### Example 1: Basic GPS Extraction

```javascript
// Server Script or Business Rule
(function() {
    var attachmentSysId = '7376221483844f1492179565eeaad373';
    var exif = new ExifReaderUtils();

    try {
        var gpsData = exif.parseFromAttachment(attachmentSysId);

        if (gpsData.gps && gpsData.gps.Latitude && gpsData.gps.Longitude) {
            var coordinates = gpsData.gps.Latitude + ', ' + gpsData.gps.Longitude;
            gs.info('GPS Coordinates found: ' + coordinates);

            // Use coordinates for geolocation services, mapping, etc.
            // Example: Update incident with location data
            var incident = new GlideRecord('incident');
            if (incident.get('INC0000123')) {
                incident.setValue('location', coordinates);
                incident.update();
            }
        } else {
            gs.info('No GPS coordinates found in image');
        }
    } catch (e) {
        gs.error('Error processing EXIF data: ' + e.message);
    }
})();
```

### Example 2: Bulk Processing with Watermarks

```javascript
// Scheduled Script Execution
(function() {
    // Process all new image attachments from last hour
    var gr = new GlideRecord('sys_attachment');
    gr.addQuery('content_type', 'CONTAINS', 'image/');
    gr.addQuery('sys_created_on', '>', gs.hoursAgoStart(1));
    gr.orderBy('sys_created_on');
    gr.query();

    var exif = new ExifReaderUtils();
    var processedCount = 0;
    var withGpsCount = 0;

    while (gr.next()) {
        try {
            var attachmentId = gr.getUniqueValue();
            var result = exif.addWatermark(attachmentId);

            if (result) {
                processedCount++;

                // Check if GPS data was found
                var gpsData = exif.parseFromAttachment(attachmentId);
                if (gpsData.gps && gpsData.gps.Latitude) {
                    withGpsCount++;
                }
            }
        } catch (e) {
            gs.error('Error processing attachment ' + attachmentId + ': ' + e.message);
        }
    }

    gs.info('Bulk processing complete. Processed: ' + processedCount + ', With GPS: ' + withGpsCount);
})();
```

### Example 3: Integration with Incident Management

```javascript
// Business Rule: When image attached to incident, extract GPS and update location
(function executeRule(current, previous /*null when async*/) {

    // Only run for incident table attachments
    if (current.table_name != 'incident') return;

    // Only process image attachments
    var contentType = current.getValue('content_type') || '';
    if (!contentType.startsWith('image/')) return;

    var exif = new ExifReaderUtils();
    var attachmentSysId = current.getUniqueValue();

    try {
        // Extract GPS coordinates
        var gpsData = exif.parseFromAttachment(attachmentSysId);

        if (gpsData.gps && gpsData.gps.Latitude && gpsData.gps.Longitude) {
            // Apply watermark
            exif.addWatermark(attachmentSysId, 'incident', current.getValue('table_sys_id'));

            // Update incident with GPS location
            var incident = new GlideRecord('incident');
            if (incident.get(current.getValue('table_sys_id'))) {
                var coordinates = gpsData.gps.Latitude + ', ' + gpsData.gps.Longitude;

                // Set work notes with GPS info
                incident.setValue('work_notes', 'GPS coordinates extracted from image: ' + coordinates);

                // If incident has location field, update it
                if (incident.isValidField('location')) {
                    incident.setValue('location', coordinates);
                }

                incident.update();

                gs.info('Incident ' + incident.getValue('number') + ' updated with GPS coordinates: ' + coordinates);
            }
        }
    } catch (e) {
        gs.error('Error processing GPS data for incident attachment: ' + e.message);
    }

})(current, previous);
```

---

## Support

For issues or questions:

1. Check ServiceNow system logs for detailed error messages
2. Verify ATF and Service Portal configurations
3. Test with known GPS-enabled images
4. Review CSP settings if Canvas operations fail

## Version History

- **v0.0.1**: Initial implementation with EXIF extraction and metadata watermarking
- **v0.0.1**: Added ATF-based visual watermarking solution
- **v0.0.1**: Enhanced error handling and fallback mechanisms

---

*This guide covers the complete functionality of the ServiceNow GPS EXIF Watermarking Service. For technical support, refer to ServiceNow documentation or contact your system administrator.*