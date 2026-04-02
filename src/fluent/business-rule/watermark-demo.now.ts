// Business Rule for GPS Watermarking Demo
// Automatically processes image attachments and extracts GPS data

import "@servicenow/sdk/global";
import { BusinessRule } from "@servicenow/sdk/core";

BusinessRule({
  $id: Now.ID["watermark-demo-br"],
  name: "GPS Watermark Demo",
  table: "sys_attachment",
  active: true,
  when: "after",
  description: "Demonstrates GPS extraction and watermarking for new image attachments",

  script: /* javascript */ `
    // Only process image attachments
    var contentType = current.getValue('content_type') || '';
    if (!contentType.startsWith('image/')) {
        return;
    }

    try {
        var exif = new ExifReaderUtils();
        var attachmentSysId = current.getUniqueValue();

        // Extract GPS coordinates
        var gpsData = exif.parseFromAttachment(attachmentSysId);

        if (gpsData.gps && gpsData.gps.Latitude && gpsData.gps.Longitude) {
            var coordinates = gpsData.gps.Latitude + ', ' + gpsData.gps.Longitude;

            // Apply watermark (metadata approach)
            var result = exif.addWatermark(
                attachmentSysId,
                current.getValue('table_name'),
                current.getValue('table_sys_id')
            );

            if (result) {
                gs.info('GPS Watermark Demo: GPS coordinates extracted and watermarked for attachment ' +
                       attachmentSysId + ': ' + coordinates);

                // If attached to an incident, update work notes
                if (current.getValue('table_name') == 'incident') {
                    var incident = new GlideRecord('incident');
                    if (incident.get(current.getValue('table_sys_id'))) {
                        incident.setValue('work_notes',
                            'GPS coordinates extracted from image: ' + coordinates);
                        incident.update();
                    }
                }
            }
        } else {
            gs.info('GPS Watermark Demo: No GPS data found in image attachment ' + attachmentSysId);
        }

    } catch (e) {
        gs.error('GPS Watermark Demo: Error processing attachment ' + attachmentSysId + ': ' + e.message);
    }
  `
});