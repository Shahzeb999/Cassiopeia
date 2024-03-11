const fs = require('fs');
const path = require('path');
// Load environment variables
require('dotenv').config();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// AWS S3 client setup
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to upload a file to S3
async function uploadFileToS3(filePath, bucketName) {
  try {
    // Read file from local path
    const fileStream = fs.createReadStream(filePath);

    // Extract file name from the path
    const fileName = path.basename(filePath);

    // Upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileStream
    };

    // Upload file to S3
    const command = new PutObjectCommand(uploadParams);
    const data = await s3Client.send(command);

    console.log(`File uploaded successfully: ${data.Location}`);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

// Function to upload all files in a directory to S3
async function uploadDirectoryToS3(directoryPath, bucketName) {
  try {
    // Read all files in the directory
    const files = fs.readdirSync(directoryPath);

    // Upload each file
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      await uploadFileToS3(filePath, bucketName);
    }

    console.log(`All files from ${directoryPath} uploaded successfully!`);
  } catch (error) {
    console.error(`Error uploading directory ${directoryPath}:`, error);
  }
}

// Directories where your images are stored
const imagesDirectory = path.resolve(__dirname, 'public/images/');
const uploadsDirectory = path.resolve(__dirname, 'public/uploads/');

// S3 bucket name
const s3BucketName = 'shahzeb-blogify'; // Replace with your bucket name

// Call function to upload images from both directories to S3
uploadDirectoryToS3(imagesDirectory, s3BucketName);
uploadDirectoryToS3(uploadsDirectory, s3BucketName);
