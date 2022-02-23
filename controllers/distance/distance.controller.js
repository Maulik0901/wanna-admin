// import Distance from "../../models/distance/distance.model";
// import ApiResponse from "../../helpers/ApiResponse";
// import Report from "../../models/reports/report.model";
// import ApiError from '../../helpers/ApiError';

// export default {

//     async findAll(req, res, next) {
//         try {
//             let query = {isDeleted: false};
//             let Distances = await Distance.find({});

//             const DistancesCount = await Distance.count(query);

//             console.log('Distances is => ' + Distances)
//             console.log('DistancesCount is => ' + DistancesCount)
//             res.status(200).send({
//                 Distances,
//                 DistancesCount
//             });
//         } catch (err) {
//             console.log('err is => ' + err)
//             next(err);
//         }
//     },  
// };

import ApiResponse from "../../helpers/ApiResponse";
import Distances from "../../models/distance/distance/distance.model";
import ApiError from '../../helpers/ApiError';
import Report from "../../models/reports/report.model";
import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImg, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";

export default {

    async findAll(req, res, next) {

        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = {isDeleted: false };
            let Distances = await Distance.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const pageCount = Math.ceil(1 / limit);

            res.send(new ApiResponse(Distances, page, pageCount, limit, 1, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('value').not().isEmpty().withMessage('value is required'),
        ];
        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdTax = await Distance.create({ ...validatedBody});
            let reports = {
                "action":"Create Distance",
            };
            res.status(201).send(createdTax);
        } catch (err) {
            next(err);
        }
    },

	  async findDis(req, res, next) {
		try {
		  let { id } = req.params;
		  //await checkExist(id, { isDeleted: false });
		  let distance = await Distances.find({ _id: id }).then((data) => {
			res.send(data);
		  });
		} catch (err) {
		  next(err);
		}
	  },

    async findById(req, res, next) {
        try {
            let { id } = req.params;
            await checkExist(id, Distances, { isDeleted: false });
            let distance = await Distances.findById(id);
            res.send(distance);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
		  let user = req.user;
		  if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));
		  let { id } = req.params;
		  const validatedBody = checkValidations(req);
		  let updatedYear = await Distances.findByIdAndUpdate(
			id,
			{
			  ...validatedBody,
			},
			{ upsert: true, new: true }
		  );
		  let reports = {
			action: "Update Distance",
		  };
		  let report = await Report.create({ ...reports, user: user });
		  res.status(200).send(updatedYear);
		} catch (err) {
		  console.log(err);
		  next(err);
		}
    },

    async delete(req, res, next) { 
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
                
            let { YearId } = req.params;
            let year = await checkExistThenGet(YearId, Distance, { isDeleted: false });
            year.isDeleted = true;
            await year.save();
            let reports = {
                "action":"Delete Year",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
  
};
