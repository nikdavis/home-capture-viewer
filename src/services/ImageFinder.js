import AWS from 'aws-sdk'
import moment from 'moment'

const accessKeyKey = 'awsAccessKey'
const secretKeyKey = 'awsSecretKey'

class Image {
    constructor(s3Metadata, data) {
        const metadata = s3Metadata
        this.lastModified = metadata.LastModified
        this.size = metadata.Size
        this.name = metadata.Key
        this.data = data
    }

    toString() {
        return `name: ${this.name}, size: ${this.size}, lastModified: ${this.lastModified}`
    }
}

export default class ImageFinder {

    constructor(bucket, region) {
        //find credentials or fail
        this.bucket = bucket
        this.region = region
        const params = new URLSearchParams(window.location.search);
    
        let accessKey, secretKey
    
        // does storage exist?
        if (typeof(Storage) !== "undefined") {
    
          // check for query params then store
          if (params.get(accessKeyKey) && params.get(secretKeyKey)) {
            accessKey = params.get(accessKeyKey)
            secretKey = params.get(secretKeyKey)
            localStorage.setItem(accessKeyKey, accessKey)
            localStorage.setItem(secretKeyKey, secretKey)
    
          // check for local storage keys
          } else if (localStorage.getItem(accessKeyKey) && localStorage.getItem(secretKeyKey)) {
            accessKey = localStorage.getItem(accessKeyKey)
            secretKey = localStorage.getItem(secretKeyKey)
          } else {
            throw "No credentials available"
          }
        } else {
          throw "No storage available. Are you from 1996? AWS doesn't exist yet anyway."
        }
    
        const creds = new AWS.Credentials(accessKey, secretKey)
    
        AWS.config.update(
          {
            credentials: creds,
            region: region
          }
        )
    
        this.S3 = new AWS.S3()
    }

    // Assumes images are prefixed with simple zero-padded
    // date -> eg. 2018-04-16
    // Returns S3 objects
    getImages(metadataCallback, imageCallback) {
        const params = new URLSearchParams(window.location.search);
        let date = moment.utc() // now
        // Can pass date to URL if desired
        if (params.get('date')) {
            date = moment(params.get('date'))
        }
        const folderPrefix = date.format('YYYY-MM-DD')
 
        this.getObjects(metadataCallback, imageCallback, folderPrefix)
    }

    getObjects(metadataCallback, imageCallback, prefix, continuationToken) {
        const s3Params = {Bucket: this.bucket, Prefix: prefix}

        if (continuationToken) {
            s3Params.ContinuationToken = continuationToken
        }

        this.S3.listObjectsV2(s3Params).promise().then((data) => {
            const notDoneLoading = data.IsTruncated && data.NextContinuationToken
            if(notDoneLoading) {
                this.getObjects(metadataCallback, imageCallback, prefix, data.NextContinuationToken)
            }
            const metadatas = data.Contents //.splice(0,5)
            metadataCallback(metadatas, !notDoneLoading)
            // const metadatas = data.Contents
            metadatas.forEach((metadata) => {
                this.getObject(imageCallback, metadata)
            })
        })
    }

    getObject(callback, metadata) {
        this.S3.getObject({Bucket: this.bucket, Key: metadata.Key}).promise().then((object) => {
            var reader = new FileReader()
            reader.onload = (function(self) {
                return function(e) {
                    const base64EncodedData = e.target.result;
                    const image = new Image(metadata, base64EncodedData)
                    callback(image)
                }
            })(this);
            reader.readAsDataURL(new Blob([object.Body]));
        });
    }
}