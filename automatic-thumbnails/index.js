const fs = require('fs');
const stream = require('stream');

const sizeOf = require('image-size');
const Sharp = require('sharp');

const AWS = require('aws-sdk');
const S3 = new AWS.S3();

// Helper to name DL files
const tmp = file => `/tmp/${file}`;

exports.handler = async(event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  const regex = /_thumbnail\./g;
  if (regex.test(key)) {
    return 'Already resized';
  }

  const tempFile = tmp(key);

  let extension;
  let miniKey;
  let resizedFile;

  return getImg(bucket, key, tempFile)
    .then(async(img) => {
      console.log(`Resized dimensions: ${JSON.stringify(img)}`);

      extension = img.type;
      miniKey = `${key.split('.')[0]}_thumbnail.${extension}`;
      resizedFile = tmp(miniKey);

      const width = 350;
      const height = null; // Math.round(width * img.height / img.width);

      const resized = await resizeImg(tempFile, resizedFile, width, height, extension);
      return resized;
    }).then(smallImg => {
      console.log(`Smaller image location: ${smallImg}`);

      return reUpload(smallImg, bucket, miniKey, extension);
    }).then(status => {
      //cleanUp(tempFile);
      //cleanUp(resizedFile);
      console.log(status);
    }).catch(console.error);
};

// Gets image from S3 and returns its dimensions (object w props width, height, type)
const getImg = (bucketName, keyName, file) => {
  return new Promise((resolve, reject) => {
    fs.writeFileSync(file, '');
    const writeStream = fs.createWriteStream(file);
    const readStream = S3.getObject({
      Bucket: bucketName,
      Key: keyName
    }).createReadStream();
    readStream.pipe(writeStream);

    writeStream.on('error', (err) => {
      writeStream.end();
      reject(err);
    });

    writeStream.on('close', () => {
      resolve(sizeOf(file));
    });
  });
};

// Resizes the file
const resizeImg = (src, dest, width, height, ext) => {
  return new Promise((resolve, reject) => {
    Sharp(src)
      .resize(width, height)
      .toFormat(ext.toString())
      .toFile(dest, (err, info) => {
        if (err) {
          reject(err);
        }
        console.log(JSON.stringify(info));
        resolve(dest);
      });
  });
};

// Upload the new, smaller image to S3
const reUpload = (src, bucketName, keyName, extension) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(src);
    const writeStream = (success, fail) => {
      const pass = new stream.PassThrough();
      const params = {
        Body: pass,
        Key: `thumbnails/${keyName}`,
        Bucket: bucketName,
        ContentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`
      };
      console.log('Uploading resized image...');
      S3.upload(params).promise()
        .then(success)
        .catch(fail);
      return pass;
    }

    readStream.pipe(writeStream(resolve, reject));
    readStream.on('close', () => {
      console.log('Done!');
    });
  });
};

// Removes a file
const cleanUp = (file) => {
  fs.unlinkSync(file);
};
