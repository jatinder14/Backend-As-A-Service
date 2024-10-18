const AWS = require('aws-sdk');
const uuidv4 = require('uuid').v4;
const fs = require('fs');

async function uploadImageToS3(imagePath, bucketName, keyName) {
    // Create an S3 instance
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    
    const params = {
        Bucket: bucketName,
        Key: keyName,
        Body: imagePath
    };

    try {
        // Upload the image to S3
        const data = await s3.upload(params).promise();
        console.log('Image uploaded successfully:', data);
        let imageUrl= await getSignedUrl(data.Key);
        // const fileKey = data.Location.replace(/^.*\//, '');
        // const imageUrl = `${process.env.BACKEND_ENDPOINT || process.env.CLIENT_WEBHOOK_ENDPOINT.replace(/\/[^/]+$/, '')}/v2/getResource/${fileKey}`;
        return { success: true, message: 'Image uploaded successfully', imageUrl: imageUrl };

    } catch (err) {
        console.error('Error uploading image to S3:', err);
        return { success: false, message: 'Error uploading image to S3', error: err?.message };
    }
}

async function getSignedUrl(fileKey) {
    // const signedUrlExpireSeconds = 60 * 12
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.S3_REGION,
        signatureVersion: process.env.S3_VERSION
    });

    const url = s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET,
        Key: fileKey,
        // Expires: signedUrlExpireSeconds
    });
    return url;
}

async function getSignedUrlForUpload(data) {
    const imagePath = data.file.buffer;
    const keyName = `${uuidv4()}-${data.file.originalname}`; // Specify the key (path) in the bucket where you want to store the image
    let result = await uploadImageToS3(imagePath, process.env.S3_BUCKET, keyName)
    console.log("---------result------------",result)
    return await new Promise((resolve, reject) => {
        resolve({
            success: true,
            message: 'AWS SDK S3 Pre-signed urls generated successfully.',
            publicUrl: result.imageUrl,
            urls: result.imageUrl
        });
    });
}

// async function downloadResourceFromS3(fileKey) {
//     const s3 = new AWS.S3({
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//         region: process.env.S3_REGION,
//         signatureVersion: process.env.S3_VERSION
//     });

//     const params = {
//         Bucket: process.env.S3_BUCKET,
//         Key: fileKey
//     };

//     return new Promise((resolve, reject) => {
//         // Use the getObject method to retrieve the file from S3
//         const getObjectPromise = s3.getObject(params).promise();
//         getObjectPromise
//             .then(data => {
//                 console.log('Successfully downloaded file from S3');
//                 resolve(data.Body);
//             })
//             .catch(err => {
//                 console.error('Error downloading file from S3:', err);
//                 reject(err);
//             });
//     });
// }

// module.exports = { getSignedUrlForUpload, downloadResourceFromS3 };
module.exports = { getSignedUrlForUpload };