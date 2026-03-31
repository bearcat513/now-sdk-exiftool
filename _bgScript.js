// var attachmentSysId = '06fa8ccfdb7262809aa8d604ce961950';
// var exifData = new x_1741852_exifnow.ExifReaderUtils().extractExifFromAttachment(attachmentSysId);

// if (Object.keys(exifData).length > 0) {
//     gs.info('Camera Make: ' + exifData.Make);
//     gs.info('Camera Model: ' + exifData.Model);
//     gs.info('Date Taken: ' + exifData.DateTime);
// } else {
//     gs.info('No EXIF data found');
// }

var exif = new ExifReaderUtils();
var tags = exif.parseFromAttachment('7376221483844f1492179565eeaad373');
var tagKeys = Object.keys(tags["tags"]);
var gpsObj = filterGPSKeys(tags["tags"]);
// gs.info(JSON.stringify(gpsObj,null,2));
// gs.info(JSON.stringify(tags,null,2));
// gs.info(tagKeys.join("\n"));
// gs.info(JSON.stringify(tags["gps"]))
gs.info(JSON.stringify(tags["tags"]))



function filterGPSKeys(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => key.startsWith("GPS"))
  );
}
