const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT, // Optional: useful for R2 or localstack
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadAudioToS3 = async (fileBuffer, originalName, mimeType) => {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not configured');
  }

  const extension = path.extname(originalName) || (mimeType.includes('mp4') ? '.mp4' : '.webm');
  const uniqueName = `audio/` + crypto.randomBytes(16).toString('hex') + '-' + Date.now() + extension;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueName,
    Body: fileBuffer,
    ContentType: mimeType,
    // ACL: 'public-read', // Uncomment if bucket policy requires explicit ACLs
  });

  await s3Client.send(command);

  const publicBaseUrl = process.env.S3_PUBLIC_URL;
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${uniqueName}`;
  }

  if (process.env.AWS_ENDPOINT) {
    return `${process.env.AWS_ENDPOINT}/${bucketName}/${uniqueName}`;
  }

  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueName}`;
};

module.exports = {
  uploadAudioToS3
};
