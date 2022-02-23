import multer from 'multer';
import path from 'path';
import mkdirp from 'mkdirp';
import ApiError from '../helpers/ApiError';
import mime from 'mime';
import uuidv4 from 'uuid/v4';//

const fileFilter = (req, file, cb) => {

    // const filetypes = /jpeg|jpg|png|image\/\*/;
    // const mimetype = filetypes.test(file.mimetype);
    // const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    // if (mimetype && extname) {
    //     return cb(null, true);
    // }

    // cb(new ApiError.UnprocessableEntity('File upload only supports images types'));
    return cb(null, true);
};

export function multerSaveTo(folderName) {

    let storage = multer.diskStorage({
        destination: function (req, file, cb) {
            console.log('In Body: ', req.body);

            let dest = 'uploads';
            // create destination if don't exist
            mkdirp(dest, function (err) {
                if (err)
                    return cb(new ApiError(500, 'Couldn\'t create dest'));

                cb(null, dest);
            });
        },
        filename: function (req, file, cb) {
            // generate a unique random name with file extension
            cb(null, uuidv4() + path.extname(file.originalname));
        }
    });

    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: 1024 * 1024 * 10 // limit 10mb
        }
    });
}
