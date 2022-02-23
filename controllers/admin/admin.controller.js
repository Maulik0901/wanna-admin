import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Order from "../../models/order/order.model";
import Category from "../../models/category/category.model";
import Coupon from "../../models/coupon/coupon.model";
import Shop from "../../models/shop/shop.model";
import Report from "../../models/reports/report.model";
import Bill from "../../models/bills/bill.model";
import Store from "../../models/store/store.model";
import Admin from "../../models/admin/admin.model";
import { body } from 'express-validator/check';
import ApiSuccess from '../../helpers/ApiSuccess';
import { checkValidations, handleImg } from '../shared/shared.controller';
import { genratePassword } from '../../utils/password';
import { generateToken } from '../../utils/token';
import {comparePassword} from '../../utils/comparePassword';


const populateQuery = [
    { path: 'client', model: 'user' },
    { path: 'salesMan', model: 'user' },
];
const action = [
    { path: 'user', model: 'user' },
]
export default {
    async getLastUser(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, 'bad auth'));
            let query = {
                $and: [
                    {isDeleted: false},
                    {type:'CLIENT'}
                ]
            };
         
            let lastUser = await User.find(query)
                .sort({ createdAt: -1 })
                .limit(10);

            res.send(lastUser);
        } catch (error) {
            next(error);
        }
    },
    async getLastActions(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, 'bad auth'));
            let query = {isDeleted: false};
         
            let lastUser = await Report.find(query).populate(action)
                .sort({ createdAt: -1 })
                .limit(10);

            res.send(lastUser);
        } catch (error) {
            next(error);
        }
    },

    async getLastOrder(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, 'bad auth'));
            let { status} = req.query
            let query = {isDeleted: false };
            if (status)
                query.status = status;                
            let lastOrder = await Order.find(query).populate(populateQuery)
                .sort({ createdAt: -1 })
                .limit(10);

            res.send(lastOrder);
        } catch (error) {
            next(error);
        }
    },
   
    async count(req,res, next) {
        try {
            // console.log(req.user);
            let createdBy = req.user.type == "SUB" ? req.user.createdBy : req.user._id;

            let query = { isDeleted: false,createdBy };
            const usersCount = await User.count({isDeleted:false,type:'CLIENT',createdBy});
            const salesMenCount = await User.count({isDeleted:false,type:'SALES-MAN',createdBy});
            // const StoreCount = await User.count({isDeleted:false,type:'STORE',createdBy});
            const AdminCount = await Admin.count({isDeleted:false,createdBy})
            
            // const categoryCount = await Category.count(query);
            // const shopCount = await Store.count({isDeleted:false,branchID: null,createdBy});
            // const couponCount = await Coupon.count(query);
            // const PendingOrdersCount = await Order.count({createdBy,isDeleted:false,status: {$in: ['PENDING','ON_PROGRESS','RECEIVED','ARRIVED']},storeID: null});
            // const StoreOrdersCount = await Order.count({createdBy,isDeleted:false,status: {$in: ['PENDING','ON_PROGRESS','RECEIVED','ON_THE_WAY','ARRIVED', 'ACCEPT', 'READY_FOR_DELIVER']},storeID: {$ne: null}});

            // const AcceptedOrdersCount = await Order.count({createdBy,isDeleted:false,status:'ON_PROGRESS'});
            // const RefusedOrdersCount = await Order.count({createdBy,isDeleted:false,status:'CANCEL'});
            // const DeliveredOrdersCount = await Order.count({isDeleted:false,status:'DELIVERED'});
            // const OnWayOrdersCount = await Order.count({createdBy,isDeleted:false,status:'ON_THE_WAY'});
            // const systemDeleteCount = await Order.count({$or:[{systemDeleted:true},{systemDeletedWithoutOffer:true}],createdBy})
           
            //  let total = await User.find({isDeleted:false,type:'SALES-MAN',createdBy}).select('debt');
            // var sum = 0;
            // for (var i = 0; i < total.length; i++) { 
            //   sum += total[i].debt
            // }

            const PenddingOrderCount = await Order.count({createdBy,isDeleted:false,status:"PENDING"});
            const acceptOrderCount = await Order.count({createdBy,isDeleted:false,status:"ACCEPT"});
            const ReadyTODeliveryOrderCount = await Order.count({createdBy,isDeleted:false,status:"READY_FOR_DELIVER"});
            const OnTheWayOrderCount = await Order.count({createdBy,isDeleted:false,accept:true,status:{$in: ['ON_PROGRESS','RECEIVED','ON_THE_WAY','ARRIVED']}});
            const DeliverdOrderCount = await Order.count({createdBy,isDeleted:false,status:"DELIVERED"});
            const RejectCountOrderCount = await Order.count({createdBy,isDeleted:false,status: {$in: ['CANCEL','REJECT']}});
            
            res.status(200).send({
                admins: AdminCount,
                clients:usersCount,
                salesMen:salesMenCount,

                //
                newRequestCount: PenddingOrderCount,
                acceptCount: acceptOrderCount,
                readyToDeliveryCount: ReadyTODeliveryOrderCount,
                onTheWayCount: OnTheWayOrderCount,
                deliverdCount: DeliverdOrderCount,
                rejectCount: RejectCountOrderCount
                // storeUser: StoreCount,
                // categories:categoryCount,                
                // coupons:couponCount,
                // shops:shopCount,
                // pending:PendingOrdersCount,
                // storeOrder: StoreOrdersCount,
                // accepted:AcceptedOrdersCount,
                // refused:RefusedOrdersCount,
                // delivered:DeliveredOrdersCount,
                // onWay:OnWayOrdersCount,
                // totalSales:sum,
                // systemDeleteCount:systemDeleteCount
            });
        } catch (err) {
            console.log({err})
            next(err);
        }
        
    },

    async countAll(req,res, next) {
        try {
            console.log(req.query);
            let first = req.query.first;
            let second = req.query.second;
            console.log(first, second)
            let newQuery = {'createdAt': { '$gte': new Date(first),'$lt': new Date(second)}}
            console.log(newQuery);
            // const usersCount = await User.count({isDeleted:false,type:'CLIENT'});
            // const salesMenCount = await User.count({isDeleted:false,type:'SALES-MAN'});
            // const categoryCount = await Category.count(query);
            // const shopCount = await Shop.count(query);
            // const couponCount = await Coupon.count(query);
            // const PendingOrdersCount = await Order.count({isDeleted:false,status:'PENDING'});
            // const AcceptedOrdersCount = await Order.count({isDeleted:false,status:'ON_PROGRESS'});
            // const RefusedOrdersCount = await Order.count({isDeleted:false,status:'CANCEL'});
            // const DeliveredOrdersCount = await Order.count({isDeleted:false,status:'DELIVERED'});
            // const OnWayOrdersCount = await Order.count({isDeleted:false,status:'ON_THE_WAY'});

            let total = await Bill.find(newQuery).select('totalCost');
            var sum = 0;
            for (var i = 0; i < total.length; i++) { 
              sum += total[i].totalCost
            }
            // let total = await User.find({isDeleted:false,type:'SALES-MAN'}).select('debt');
            // var sum = 0;
            // for (var i = 0; i < total.length; i++) { 
            //   sum += total[i].debt
            // }
            
            res.status(200).send({
                // clients:usersCount,
                // salesMen:salesMenCount,
                // categories:categoryCount,
                // coupons:couponCount,
                // shops:shopCount,
                // pending:PendingOrdersCount,
                // accepted:AcceptedOrdersCount,
                // refused:RefusedOrdersCount,
                // delivered:DeliveredOrdersCount,
                // onWay:OnWayOrdersCount,
                totalSales:sum
                
            });
        } catch (err) {
            next(err);
        }
        
    },
    


    validateAdminCreateBody(isUpdate = false) {
        let validations = [
            body('username').not().isEmpty().withMessage('username is required'),
            
            body('gender').optional(),
            body('birthYear').optional(),
            body('language').optional(),
            body('signUpFrom').optional(),
            body('phone').optional(),
            body('city').optional(),
           
            // body('phone').not().isEmpty().withMessage('phone is required')
            //     .custom(async (value, { req }) => {
            //         let userQuery = { phone: value,isDeleted:false };
            //         if (isUpdate && req.user.phone === value)
            //             userQuery._id = { $ne: req.user._id};

            //         if (await User.findOne(userQuery))
            //             throw new Error(req.__('phone duplicated'));
            //         else
            //             return true;
            //     }),
            body('email').not().isEmpty().withMessage('email is required')
                .isEmail().withMessage('email syntax')
                .custom(async (value, { req }) => {
                    let userQuery = { email: value,isDeleted:false };
                    if (isUpdate && req.user.email === value)
                        userQuery._id = { $ne: req.user._id};

                    if (await Admin.findOne(userQuery))
                        throw new Error(req.__('email duplicated'));
                    else
                        return true;
                }),

                body('type').not().isEmpty().withMessage('type is required')
                .isIn(['SA','A']).withMessage('wrong type'),
                body('img').optional().custom(val => isImgUrl(val)).withMessage('img should be a valid img'),
               
               
        ];
        return validations;
    },

    async create(req,res,next) {
        try {
            console.log("callsakjdfhjksadhfkjhadfj")
            const validatedBody = checkValidations(req);
           
            let password =await genratePassword(req.body.password);
            
            let createdUser = await Admin.create({
                ...validatedBody,token:req.body.token,password
            });

            let responesData = {
                user: await Admin.findOne(createdUser),
                token: generateToken(createdUser.id)
            }
            res.send(new ApiSuccess(true,200,'Admin Create SuccessFully',responesData))
           
        } catch(e) {
            console.log({e})
            res.status(400).send(e)
        }
    }
}