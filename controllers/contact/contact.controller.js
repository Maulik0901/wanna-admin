import { body } from "express-validator/check";
import Contact from "../../models/contact/contact.model";
import User from "../../models/user/user.model";
import { checkExist, checkExistThenGet } from "../../helpers/CheckMethods";
import ApiError from "../../helpers/ApiError";
import ApiResponse from "../../helpers/ApiResponse";
import { checkValidations } from "../shared/shared.controller";
import { sendEmail } from "../../services/emailMessage.service";

export default {
    validateContactCreateBody() {
        return [
            body('name').not().isEmpty().withMessage('name required'),
            body('email').not().isEmpty().withMessage('email is required')
                .isEmail().withMessage('email syntax'),
            body('number').not().isEmpty().withMessage('number required'),
            body('message').not().isEmpty().withMessage('message required')
        ]
    },
    async createContactMessage(req, res, next) {
        try {
            const validatedBody = checkValidations(req);
            await Contact.create({ ...validatedBody });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },
    async findAll(req, res, next) {
        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20, query = { isDeleted: false };

            await checkExist(req.user._id, User);
            let user = req.user;
            if (user.type !== 'ADMIN')
                return next(new ApiError(403, ('admin auth')));

            let contacts = await Contact.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const contactsCount = await Contact.count(query);
            const pageCount = Math.ceil(contactsCount / limit);

            res.send(new ApiResponse(contacts, page, pageCount, limit, contactsCount, req));
        } catch (err) {
            next(err);
        }
    },
    async findById(req, res, next) {
        try {
            let { contactId } = req.params;
            res.send(
                await checkExistThenGet(contactId, Contact)
            );
        } catch (err) {
            next(err);
        }
    },
    validateContactReplyBody() {
        let validation = [
            body('reply').not().isEmpty().withMessage('reply required')
        ]
        return validation; 
    },
    async reply(req, res, next) {
        try {
            let { contactId } = req.params;
            let contact = await checkExistThenGet(contactId, Contact);
            const validatedBody = checkValidations(req);
            sendEmail(contact.email, validatedBody.reply)

            res.status(204).send();
        } catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            let { contactId } = req.params;
            let contact = await checkExistThenGet(contactId, Contact);
            contact.isDeleted = true;
            await contact.save();
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    },
};