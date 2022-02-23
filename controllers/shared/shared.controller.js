import fs from 'fs';
import ApiError from '../../helpers/ApiError';
import ApiSuccess from '../../helpers/ApiSuccess';
import { validationResult } from 'express-validator/check';
import { matchedData } from 'express-validator/filter';
import { toImgUrl } from '../../utils';


function deleteTempImages(req) {
    try{
      if (req.file || req.files) {
        let files = req.file ? Array.from(req.file) : req.files;
        for (let file of files) {
          fs.unlink(file.path, function (err) {
            if (err) return console.log(err);
            // Under Experimental 
            console.log(file.filename + ' isDeleted successfully');
          });
        }
      }
    }catch(err){
      console.log({err});
    }
}

export const localeFn = (localeName) => (value, { req }) => req.__(localeName);

export function checkValidations(req) {

  const validationErrors = validationResult(req).array({ onlyFirstError: true });

  if (validationErrors.length > 0) {
    console.log("Request => "+ req);
    deleteTempImages(req);
    throw new ApiError(422, validationErrors);
  }

  return matchedData(req);
}


export async function handleImgs(req, { attributeName = 'images', isUpdate = false } = {}) {
  if (req.files && req.files.length > 0 || (isUpdate && req.body[attributeName])) { // .files contain an array of 'images'  
    let images = [];
    if (isUpdate && req.body[attributeName]) {
      if (Array.isArray(req.body[attributeName]))
        images = req.body[attributeName];
      else
        images.push(req.body[attributeName]);
    }

    for (const img of req.files) {
      images.push(await toImgUrl(img));
    }
    return images;
  }
  throw new ApiError.UnprocessableEntity(`${attributeName} are required`);
}

export async function handleImg(req, { attributeName = 'img', isUpdate = false } = {}) {
  if (req.file || (isUpdate && req.body[attributeName])) {
    return req.body[attributeName] || await toImgUrl(req.file);

  }


  throw new ApiError.UnprocessableEntity(`${attributeName} is required`);
}

export function checkNewValidations(req) {

  const validationErrors = validationResult(req).array({ onlyFirstError: true });
  console.log({validationErrors})
  if (validationErrors.length > 0) {
    console.log("Request => "+ req);
    deleteTempImages(req);
    throw new ApiSuccess(false,200,validationErrors[0].msg ,validationErrors);
  }

  return matchedData(req);
}

