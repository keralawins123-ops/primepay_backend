const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const generateSignedApkUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentType: "application/vnd.android.package-archive",
    ResponseContentDisposition: 'attachment; filename="app-release.apk"',
  });

  return await getSignedUrl(s3, command, {
    expiresIn: 60 * 60, // 1 hour
  });
};

module.exports = { generateSignedApkUrl };