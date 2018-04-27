# Automatic Thumbnails

This is a Lambda function that will automatically create thumbnails for new objects uploaded to S3.

The difference between this and existing image resizers is that this function is intended to be triggered by a new object upload to S3 rather than an HTTP request to a URL.

## IAM Permissions

The function should have a role that includes the `LambdaBasicExecution` managed policy, as well as read and write permissions for S3.

## Trigger

To work properly, the function will need an S3 event trigger. The setting I used was "ObjectCreated," which encompasses all PUT and POST requests, but you may limit this if necessary. However, it will need to be triggered by a new S3 object.

## Customization

Two things come to mind as potentially needing custom values:

1. You can change the suffix of the thumbnail file by modifying values in the `regex` and `miniKey` variables within the handler. Currently, the suffix is `_thumbnail` - so for example, a new file called `selfie.jpg` would be transformed into `selfie_thumbnail.jpg`. In the future these should be combined somehow so they're defined in a single location.
2. You can change the dimensions of the thumbnail by looking for the `height` and `width` variables. Default is to create an image 350px wide, with a proportional height. Also going to make these easier to change in the future.

## Things to Know

Because the function is triggered by an addition to S3, it will run twice for each image. The upload of the resized image creates a new event, which is handled by testing for a suffix on the new object.