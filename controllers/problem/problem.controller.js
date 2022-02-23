import ApiResponse from "../../helpers/ApiResponse";
import Problem from "../../models/problem/problem.model";
import Report from "../../models/reports/report.model";
import ApiError from '../../helpers/ApiError';
import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import Notif from "../../models/notif/notif.model"

import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImgs, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";
const populateQuery = [
    { path: 'user', model: 'user' },
    { path: 'order', model: 'order' },
   
];
export default {

    async findAll(req, res, next) {

        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20 ,
            { user,order } = req.query
            , query = {isDeleted: false };

            if (user) query.user = user;
            if (order) query.order = orde;

            let Problems = await Problem.find(query).populate(populateQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const ProblemsCount = await Problem.count(query);
            const pageCount = Math.ceil(ProblemsCount / limit);

            res.send(new ApiResponse(Problems, page, pageCount, limit, ProblemsCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('problemType').not().isEmpty().withMessage('problem Type is required'),
            body('description').not().isEmpty().withMessage('description is required'),
            

        ];
        if (isUpdate)
        validations.push([
            body('img').optional().custom(val => isImgUrl(val)).withMessage('img should be a valid img')
        ]);
        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            let { orderId } = req.params;
    
            const validatedBody = checkValidations(req);
            validatedBody.order = orderId;
            validatedBody.user = req.user._id;
            let image = await handleImgs(req);
            let createdProblem = await Problem.create({ ...validatedBody,img:image});
            let reports = {
                "action":"Create Problem",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdProblem);
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {

        try {
            let user = req.user;
           
            let { ProblemId } = req.params;
            await checkExist(ProblemId, Problem, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedProblem = await Problem.findByIdAndUpdate(ProblemId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update Problem",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedProblem);
        }
        catch (err) {
            next(err);
        }
    },

    async delete(req, res, next) { 
        try {
            let user = req.user;
            
            let { ProblemId } = req.params;
            let problem = await checkExistThenGet(ProblemId, Problem, { isDeleted: false });
            problem.isDeleted = true;
            await problem.save();
            let reports = {
                "action":"Delete Problem",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
    async reply(req, res, next) { 
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
                
            let { ProblemId } = req.params;
            let problem = await checkExistThenGet(ProblemId, Problem, { isDeleted: false });
            problem.reply = true;
            problem.replyText = req.body.replyText;
            await problem.save();
            sendNotifiAndPushNotifi({
                targetUser: problem.user, 
                fromUser: req.user._id, 
                text: 'new notification',
                subject: problem.id,
                subjectType: ' Your complaint has been answered'
            });
            let notif = {
                "description":' Your complaint has been answered',
                "arabicDescription":' تم الرد على شكواك'

            }
            Notif.create({...notif,resource:req.user._id,target:problem.user,problem:problem.id});
            let reports = {
                "action":'reply on Problem'
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
  
};