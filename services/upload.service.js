const { getSignedUrlForUpload, downloadResourceFromS3 } = require('../utils/s3');

class UploadService {
  async upload(file) {
    console.log('file-->', file);
    return await getSignedUrlForUpload({ file });
  }

  async download(fileKey) {
    return await downloadResourceFromS3(fileKey);
  }
}

module.exports = UploadService;
