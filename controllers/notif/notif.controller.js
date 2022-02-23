import User from "../../models/user/user.model";
import Admin from '../../models/admin/admin.model';
import { checkExistThenGet, checkExist} from "../../helpers/CheckMethods";
import Notif from "../../models/notif/notif.model";
import ApiResponse from "../../helpers/ApiResponse";
import ApiSuccess from "../../helpers/ApiSuccess";
var moment = require("moment");
const populateQuery = [
    { path: 'target', model: 'user' },
    { path: 'order', model: 'order' },
    { path: 'bill', model: 'bill' },
    { path: 'user', model: 'user' },
    { path: 'resource', model: 'user' },
    {
        path: 'offer', model: 'offer',
        populate: { path: 'order', model: 'order' }
    },
    {
        path: 'problem', model: 'problem',
        populate: { path: 'order', model: 'order' }
    }
    

];
export default {
    async find(req, res, next) {
        try {
            let user = req.user._id;
            // await checkExist(req.user._id, User);
            let {activeStart, activeEnd,type} = req.query;
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = { isDeleted: false,to: user };
         
           
            if (activeStart && activeEnd) {
				query = {
					...query,
					createdAt: {
						$gte: moment(activeStart).toDate(),
						$lte: moment(activeEnd).toDate(),
					},
				};
            }
                        
            let notifs = await Notif.find(query).populate(populateQuery)
                .sort({ createdAt: -1 })
                // .limit(limit)
                // .skip((page - 1) * limit);
            const notifsCount = await Notif.count(query);
            const pageCount = Math.ceil(notifsCount / limit);

            res.send(new ApiResponse(notifs, page, pageCount, limit, notifsCount, req));
        } catch (err) {
            next(err);
        }
    },

    async getByUser(req, res, next) {
        try {
            let user = req.user._id;
            // await checkExist(req.user._id, User);
            let {activeStart, activeEnd,type} = req.query;
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = { isDeleted: false,to: user };
         
           
            if (activeStart && activeEnd) {
				query = {
					...query,
					createdAt: {
						$gte: moment(activeStart).toDate(),
						$lte: moment(activeEnd).toDate(),
					},
				};
            }
                        
            let notifs = await Notif.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);
            const notifsCount = await Notif.count(query);
            const pageCount = Math.ceil(notifsCount / limit);

            // res.send(new ApiResponse(notifs, page, pageCount, limit, notifsCount, req));
            return res.send(new ApiSuccess(true, 200, "notifs", {notifs,total: notifsCount}));

        } catch (err) {
            next(err);
        }
    },
    async read(req, res, next) {
        try {
            let { notifId} = req.params;
            let notif = await checkExistThenGet(notifId, Notif);
            notif.read = true;
            await notif.save();
            res.send('notif read');
        } catch (error) {
            next(error);
        }
    },

    async unread(req, res, next) {
        try {
            let { notifId} = req.params;
            let notif = await checkExistThenGet(notifId, Notif);
            notif.read = false;
            await notif.save();
            res.send('notif unread');
        } catch (error) {
            next(error);
        }
    },
    async delete(req, res, next) {
        try {
            let { notifId} = req.params;
            let notif = await checkExistThenGet(notifId, Notif);
            notif.isDeleted = true;
            await notif.save();
            // res.send('notif isDeleted');
            return res.send(new ApiSuccess(true, 200, "notif deleted", {}));
        } catch (error) {
            next(error);
        }
    },
    async deleteAll(req, res, next) {
        try {
            // let notifs = await Notif.find({target : req.user._id });
            // for (let notif of notifs ) {
            //     notif.isDeleted = true;
            //     await notif.save();
            // }
            res.send('notifs isDeleted');
        } catch (error) {
            next(error);
        }
    },
    async unreadCount(req, res, next) {
        try {
            let user = req.user._id;
            await checkExist(req.user._id, Admin);
            let query = { isDeleted: false,target:user,read:false };
            const unreadCount = await Notif.count(query);
            res.status(200).send({
                unread:unreadCount,
            });
        } catch (err) {
            next(err);
        }
    },
}