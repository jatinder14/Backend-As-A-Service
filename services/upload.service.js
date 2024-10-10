const { getSignedUrlForUpload, downloadResourceFromS3 } = require('../utils/s3');

class UploadService {
    async upload(path, fileType) {
        console.log("path---->", path);
        console.log("path--filetype-->", fileType);

        return await getSignedUrlForUpload({ path, fileType });
    }

    async download(fileKey) {
        return await downloadResourceFromS3(fileKey);
    }

}

module.exports = UploadService;

