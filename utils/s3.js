const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

// Create an S3 client
const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestHandler: {
        connectionTimeout: 600000, // 10 minutes due to large uploads
        socketTimeout: 600000, // 10 minutes
    }
});

// Function to upload an image to S3
async function uploadImageToS3(imagePath, bucketName, keyName) {
    const params = {
        Bucket: bucketName,
        Key: keyName,
        Body: imagePath,
    };

    try {
        const command = new PutObjectCommand(params);
        await s3.send(command);
        console.log('Image uploaded successfully');
        const imageUrl = await generateSignedUrl(keyName);
        return { success: true, message: 'Image uploaded successfully', imageUrl };
    } catch (err) {
        console.error('Error uploading image to S3:', err);
        throw err;
    }
}

async function generateSignedUrl(fileKey) {
    if (!fileKey) {
        console.log("Please Provide filekey---", fileKey);
        return
    }
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: fileKey,
    });
    console.log("------fileKey--------", fileKey);
    try {
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour
        return url;
    } catch (err) {
        console.error('Error generating signed URL:', err);
        throw err;
    }
}

// Wrapper function for generating a signed URL after uploading
async function getSignedUrlForUpload(data) {
    try {
        const imagePath = data.file.buffer;
        const keyName = `${uuidv4()}-${data.file.originalname}`; // Specify the key (path) in the bucket where you want to store the image
        const result = await uploadImageToS3(imagePath, process.env.S3_BUCKET, keyName);

        return {
            success: true,
            message: 'AWS SDK S3 Pre-signed URLs generated successfully.',
            publicUrl: result.imageUrl,
            urls: result.imageUrl,
        };
    }
    catch (err) {
        return { success: false, message: 'Error uploading image to S3', error: err?.message };
    }
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

function getKey(url) {
    if (!url) {
        console.log("Please Provide url---", url);
        return
    }
    const lastSlashIndex = url.lastIndexOf('/');

    const queryIndex = url.indexOf('?');
    const endIndex = queryIndex !== -1 ? queryIndex : url.length;

    return url.substring(lastSlashIndex + 1, endIndex);
};

module.exports = { getSignedUrlForUpload, generateSignedUrl, getKey };