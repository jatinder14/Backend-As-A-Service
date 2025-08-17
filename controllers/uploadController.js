const UploadService = require('../services/upload.service');

const uploadService = new UploadService();

class UploadController {
  async upload(req, res, next) {
    try {
      const result = await uploadService.upload(req.file);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  async download(req, res, next) {
    try {
      console.log('req.params.type------>', req.params.fileKey);
      const result = await uploadService.download(req.params.fileKey);
      res.send(result);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = UploadController;
