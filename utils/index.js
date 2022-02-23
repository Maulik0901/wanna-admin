import config from '../config';
import ApiError from '../helpers/ApiError';
import * as cloudinary from 'cloudinary';

export * from './token';

cloudinary.config(config.cloudinary);

// Convert Local Upload To Cloudinary Url  toImgUrl
export async function toImgUrl (multerObject) {
  try {
     multerObject.path = 'https'+'://'+'www.appwanna.com:8081'+'/'+multerObject.path;
    console.log("path:  "+multerObject.path);
    return multerObject.path;
  }
  catch (err) {
    console.log('Cloudinary Error: ', err);
    throw new ApiError(500, 'Failed To Upload An Image due to network issue! Retry again...');
  }
}


// Convert Local Upload To Full Url  toImgUrlCloudinary
export async function toImgUrlCloudinary(multerObject) {

  return `${config.appUrl}/${multerObject.destination}/${multerObject.filename}`;

}
export function parseStringToArrayOfObjectsMw(fieldName, inWhich = 'body') {
  return (req, res, next) => {
      try {
          if (req[inWhich][fieldName]) {
              let arrOfObjectsAsString = req[inWhich][fieldName];
              let handledStringForParsing = arrOfObjectsAsString.replace(/([a-zA-Z0-9]+?):/g, '"$1":').replace(/'/g, '"');
              req[inWhich][fieldName] = JSON.parse(handledStringForParsing);
              console.log('the object',typeof req[inWhich][fieldName]);
          }
          next();
      } catch (err) {
          console.log(err);
          next(new ApiError(400, { message: `Failed To Parse "${fieldName}"` }));
      }
  }
}