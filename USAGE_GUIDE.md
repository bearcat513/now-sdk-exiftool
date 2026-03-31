# EXIF Reader ServiceNow Script Include Usage Guide

This guide explains how to use the ExifReaderScriptInclude class to extract EXIF metadata from images in ServiceNow.

## Overview

The ExifReaderScriptInclude provides methods to extract EXIF (Exchangeable Image File Format) metadata from various image sources including attachments, base64 data, and raw image buffers.

## Supported Image Formats

- JPEG/JPG
- TIFF/TIF
- PNG
- WebP
- HEIC/HEIF

## Methods

### 1. Extract EXIF from ServiceNow Attachment

Extract EXIF data directly from a ServiceNow attachment record:

```javascript
// Get EXIF data from an attachment
var attachmentSysId = 'your_attachment_sys_id_here';
var exifData = ExifReaderScriptInclude.extractExifFromAttachment(attachmentSysId);

if (Object.keys(exifData).length > 0) {
    gs.info('Camera Make: ' + exifData.Make);
    gs.info('Camera Model: ' + exifData.Model);
    gs.info('Date Taken: ' + exifData.DateTime);
} else {
    gs.info('No EXIF data found');
}
```

### 2. Extract EXIF from Base64 Data

Extract EXIF data from base64 encoded image data:

```javascript
// Base64 image data (with or without data URL prefix)
var base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...';
// or just the base64 string: '/9j/4AAQSkZJRgABAQEA...'

var exifData = ExifReaderScriptInclude.extractExifFromBase64(base64Image);

// Check for specific metadata
if (exifData.ImageWidth && exifData.ImageHeight) {
    gs.info('Image dimensions: ' + exifData.ImageWidth + 'x' + exifData.ImageHeight);
}
```

### 3. Extract EXIF from Image Buffer

For advanced use cases with raw image data:

```javascript
// Assuming you have an ArrayBuffer or Uint8Array with image data
var imageBuffer = getImageBufferSomehow(); // Your method to get buffer
var exifData = ExifReaderScriptInclude.extractExifFromBuffer(imageBuffer);
```

### 4. Get Specific EXIF Tags

Extract only the EXIF tags you need:

```javascript
var imageBuffer = getImageBufferSomehow();
var requestedTags = ['Make', 'Model', 'DateTime', 'ISO'];
var specificData = ExifReaderScriptInclude.getSpecificTags(imageBuffer, requestedTags);

// Only contains the requested tags
gs.info('Camera: ' + specificData.Make + ' ' + specificData.Model);
```

### 5. Extract GPS Coordinates

Get GPS location data if available in the image:

```javascript
var imageBuffer = getImageBufferSomehow();
var gpsData = ExifReaderScriptInclude.getGpsCoordinates(imageBuffer);

if (gpsData) {
    gs.info('Latitude: ' + gpsData.latitude);
    gs.info('Longitude: ' + gpsData.longitude);
} else {
    gs.info('No GPS data found in image');
}
```

## Configuration Options

You can customize the EXIF extraction with options:

```javascript
var options = {
    includeUnknown: false,  // Include unknown/proprietary tags
    expanded: true,         // Return expanded tag information
    tiff: true,            // Extract TIFF metadata
    ifd1: true,            // Extract thumbnail metadata
    iptc: true,            // Extract IPTC metadata
    xmp: true              // Extract XMP metadata
};

var exifData = ExifReaderScriptInclude.extractExifFromAttachment(attachmentSysId, options);
```

## Common EXIF Tags

Here are some commonly available EXIF tags:

| Tag Name | Description |
|----------|-------------|
| Make | Camera manufacturer |
| Model | Camera model |
| DateTime | Date and time photo was taken |
| ImageWidth | Image width in pixels |
| ImageHeight | Image height in pixels |
| Orientation | Image orientation |
| XResolution | Horizontal resolution |
| YResolution | Vertical resolution |
| ISO | ISO sensitivity |
| FNumber | F-number/aperture |
| ExposureTime | Shutter speed |
| FocalLength | Lens focal length |
| Flash | Flash mode used |
| WhiteBalance | White balance setting |

## Complete Example: Processing Incident Attachments

```javascript
// Script to process all image attachments on an incident
var incident = new GlideRecord('incident');
if (incident.get('INC0000123')) {

    // Get all attachments for this incident
    var attachment = new GlideRecord('sys_attachment');
    attachment.addQuery('table_name', 'incident');
    attachment.addQuery('table_sys_id', incident.getUniqueValue());
    attachment.query();

    while (attachment.next()) {
        var contentType = attachment.getValue('content_type');

        // Check if it's an image
        if (contentType && contentType.startsWith('image/')) {
            gs.info('Processing image: ' + attachment.getValue('file_name'));

            // Extract EXIF data
            var exifData = ExifReaderScriptInclude.extractExifFromAttachment(
                attachment.getUniqueValue()
            );

            // Log interesting metadata
            if (exifData.Make) {
                gs.info('Camera: ' + exifData.Make + ' ' + (exifData.Model || ''));
            }

            if (exifData.DateTime) {
                gs.info('Photo taken: ' + exifData.DateTime);
            }

            // Check for GPS data
            var gps = ExifReaderScriptInclude.getGpsCoordinates(
                attachment.getUniqueValue()
            );
            if (gps) {
                gs.info('Location: ' + gps.latitude + ', ' + gps.longitude);
            }
        }
    }
}
```

## Error Handling

The script include includes built-in error handling:

- Invalid attachment IDs return empty objects
- Non-image files are detected and logged as warnings
- Parsing errors are logged and return empty objects
- GPS parsing failures return null

All errors are logged using ServiceNow's `gs.error()` and `gs.warn()` functions.

## Best Practices

1. **Check for empty results**: Always verify that EXIF data was found before using it
2. **Handle missing tags**: Not all images have all EXIF tags - check for existence before using
3. **Consider privacy**: GPS and other metadata may contain sensitive information
4. **Performance**: For batch processing, consider the performance impact of processing many large images
5. **File size limits**: Very large images may impact performance or hit memory limits

## Troubleshooting

### No EXIF Data Found
- Verify the file is actually an image format that supports EXIF
- Some images may have had their EXIF data stripped
- Check ServiceNow logs for specific error messages

### GPS Coordinates Show as 0,0
- The image may not have GPS data
- GPS coordinates may be in a format the parser doesn't recognize
- Check the raw GPS tags to debug parsing issues

### Performance Issues
- Consider processing images asynchronously for large batches
- Use `getSpecificTags()` to extract only needed metadata
- Monitor script execution time for very large images