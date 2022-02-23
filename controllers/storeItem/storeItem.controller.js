import ApiResponse from "../../helpers/ApiResponse";
import Store from "../../models/store/store.model";
import StoreItem from "../../models/storeItem/storeItem.modal";

import Report from "../../models/reports/report.model";
import ApiError from '../../helpers/ApiError';
import ApiSuccess from '../../helpers/ApiSuccess';
import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImg, checkValidations , checkNewValidations} from "../shared/shared.controller";
import { body } from "express-validator/check";
import IndexItem from '../../models/indexItem/indexItem.model';

const populateQuery = [
    { path: 'storeID', model: 'store' }    
];

export default {

    async findAll(req, res, next) {

        try {
            let query = {isDeleted: false,isActive:true };
            let page = +req.query.page || 1, limit = +req.query.limit || 100,
            { id,isActive } = req.query;
            let { storeID } = req.params;
            
            if(id){
                query.storeID = id;                
            }

            if(storeID){
                query.storeID = storeID
            }
            let queryData = [
                {
                    $match: {
                        isDeleted : false,                        
                        storeID: parseInt(query.storeID),
                        // createdBy: order.createdBy
                    }                   
                }                         
            ]

            if(req.get('lang') === 'ar'){                
                queryData.push({
                    $lookup:{
                        from: 'storeitems',
                        // localField: '_id',
                        // foreignField: 'itemIndex',                        
                        let: {id: "$_id"},
                        pipeline: [
                            {
                                $match:{
                                    // isActive: true,
                                    isDeleted: false,
                                    $expr: {$eq: ["$itemIndex", "$$id"]}
                                },                          
                            },
                            {   
                                "$sort":{
                                    "displayOrder": 1
                                }
                            },  
                            {
                                $project: {
                                    "_id": 17,
                                    "isActive": 1,
                                    "isNonVeg": 1,
                                    "displayOrder": 1,
                                    "quantity": 1,
                                    "isDeleted": 1,
                                    "storeID": 1,
                                    "name": "$arName",
                                    "description": "$arDescription",
                                    "itemIndex": 1,
                                    "price": 1,  
                                    "img": 1,                                  
                                    "arDescription": 1,
                                    "arName": 1
                                }
                            }
                        ],
                        as: 'items'
                    }
                })
                
                queryData.push({
                    $project: { 
                        _id: 1,
                        isDeleted: 1,
                        storeID: 1,
                        name : '$arName',
                        items: 1,
                        displayOrder: 1
                    }
                })
                queryData.push({
                    $sort: {
                        displayOrder: 1
                    }
                })
            } else {
                queryData.push({
                    $lookup:{
                        from: 'storeitems',
                        // localField: '_id',
                        // foreignField: 'itemIndex',                        
                        let: {id: "$_id"},
                        pipeline: [
                            {
                                $match:{
                                    // isActive: true,
                                    isDeleted: false,
                                    $expr: {$eq: ["$itemIndex", "$$id"]}
                                },                          
                            },
                            {   
                                "$sort":{
                                    "displayOrder": 1
                                }
                            }  
                        ],
                        as: 'items'
                    }
                })

                queryData.push({
                    $sort: {
                        displayOrder: 1
                    }
                })
            }
            let createIndexItem = await IndexItem.aggregate(queryData);




            res.send(new ApiSuccess(true,200,'item find SuccessFully',{storeItem:createIndexItem, page:0, pageCount:20, limit:20, storeItemCount:createIndexItem.length}));
            // let query = {isDeleted: false,isActive:true };
            // if(isActive){
            //     delete query.isActive;
            // }
            // if(id){
            //     query.storeID = id;                
            // }

            // if(storeID){
            //     query.storeID = storeID
            // }
            
            // let storeItem = await StoreItem.find(query).populate(populateQuery)                
            //     .sort({ displayOrder: 1 })
            //     .limit(limit)
            //     .skip((page - 1) * limit);


            // const storeItemCount = await StoreItem.count(query);
            // const pageCount = Math.ceil(storeItemCount / limit);

            // res.send(new ApiSuccess(true,200,'item find SuccessFully',{storeItem, page, pageCount, limit, storeItemCount}));
        } catch (err) {
            console.log({err})
            // next(err);
            res.status(400).send(err)
        }
    },
    async findSelection(req, res, next) {
        try {
            let query = { isDeleted: false };
            let storeItem = await StoreItem.find(query)
                .sort({ displayOrder: 1 });
            res.send(storeItem)
        } catch (err) {
            next(err);
        }
    },

    validateCreated() {
        let validations = [
            body('storeID').not().isEmpty().withMessage('store id is required'),
            body('name').not().isEmpty().withMessage('name is required'),
            body('description').not().isEmpty().withMessage('description is required'),
            body('arName').not().isEmpty().withMessage('Arabic name is required'),
            body('arDescription').not().isEmpty().withMessage('Arabic description is required'),
            body('itemIndex').not().isEmpty().withMessage('itemIndex is required'),  
            body('price').not().isEmpty().withMessage('price is required'), 
            body('isActive').not().isEmpty().withMessage('active is required'),  
            body('displayOrder').optional(),
            body('quantity').optional(),
            body('img').optional().custom(val => isImgUrl(val)).withMessage('img should be a valid img'),
            body('isNonVeg').optional()      
        ];
       
        return validations;
    },

    async create(req, res, next) {

        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkNewValidations(req);
            let image;
            if(req.file){
                image = await handleImg(req);                   
            }
            // let image = await handleImg(req);
            
            let createItem = await StoreItem.create({ ...validatedBody,img:image});
            
            res.send(new ApiSuccess(true,200,'store item create successFully',createItem));
        } catch (err) {
            console.log({err})
            // next(err);
            res.status(400).send(err)
        }
    },


    async findById(req, res, next) {
        try {
            let { storeId } = req.params;
            await checkExist(storeId, Store, { isDeleted: false });
            let store = await Store.findById(storeId);
            res.send(store);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));

            let { storeItemId } = req.params;
            
            await checkExist(storeItemId, StoreItem, { isDeleted: false });

            const validatedBody = checkNewValidations(req);
            
            if (req.file) {
                let image = await handleImg(req, { attributeName: 'img', isUpdate: true });
                validatedBody.img = image;
            }
            let updateStoreItem = await StoreItem.findByIdAndUpdate(storeItemId, {
                ...validatedBody,
            }, { new: true });
            
            res.send(new ApiSuccess(true,200,'store item update successFully',updateStoreItem));
        }
        catch (err) {
            res.status(400).send(err)
        }
    },
    
    async delete(req, res, next) {
        try {
            
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
                
            let { storeItemId } = req.params;
            let storeItem = await checkExistThenGet(storeItemId, StoreItem, { isDeleted: false });
            storeItem.isDeleted = true;
            await storeItem.save();
            
            res.send(new ApiSuccess(true,200,'store item delete successFully',{}));
        }
        catch (err) {
             res.status(400).send(err)
        }
    },

    async updateItemOrder(req,res,next) {
        let {item} = req.body;
        
        for(let i=0;i<item.length;i++){
            await StoreItem.findByIdAndUpdate(item[i]._id, {
                displayOrder: i
            }, { new: true });
        }

        res.status(200).send('');
    },


    validateIndexItemCreated() {
        let validations = [
            body('storeID').not().isEmpty().withMessage('store id is required'),
            body('name').not().isEmpty().withMessage('name is required'),  
            body('arName').not().isEmpty().withMessage('Arabic name is required'),                     
            body('image').optional().custom(val => isImgUrl(val)).withMessage('image should be a valid img')            
        ];
       
        return validations;
    },

    async createItemIndex(req,res,next) {
        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkNewValidations(req);
           
            
            let createIndexItem = await IndexItem.create({ ...validatedBody});
            
            res.send(new ApiSuccess(true,200,'store index item create successFully',createIndexItem));
        } catch (err) {
            console.log({err})
            // next(err);
            res.status(400).send(err)
        }
    },
    async getItemIndex(req,res,next){
        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
            let { storeId } = req.params;
            console.log({storeId})
            let createIndexItem = await IndexItem.aggregate([
                {
                    $match: {
                        isDeleted : false,
                        storeID: parseInt(storeId),
                        // createdBy: order.createdBy
                    }                   
                },
                {
                    $lookup:{
                        from: 'storeitems',
                        // localField: '_id',
                        // foreignField: 'itemIndex',
                        let: {id: "$_id"},
                        pipeline: [{
                            $match:{
                                // isActive: true,
                                isDeleted: false,
                                $expr: {$eq: ["$itemIndex", "$$id"]}
                            }                                                    
                        },
                        {   
                            "$sort":{
                                "displayOrder": 1
                            }
                        }  
                        ],
                        as: 'items'
                    }
                },
                {
                    $sort: {
                        displayOrder: 1
                    }
                }
            ]);
            
            res.send(new ApiSuccess(true,200,'store index item',createIndexItem));
        } catch (err) {
            console.log({err})
            // next(err);
            res.status(400).send(err)
        }
    },
    async deleteItemIndex(req,res,next){
        let { storeindexItemId } = req.params;
            let storeIndexItem = await checkExistThenGet(storeindexItemId, IndexItem, { isDeleted: false });
            storeIndexItem.isDeleted = true;
            await storeIndexItem.save();
            
            res.send(new ApiSuccess(true,200,'store item delete successFully',{}));
    },

    async updateIndexItem(req, res, next) {

        try {
            
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));

            let { storeindexItemId } = req.params;
            
            await checkExist(storeindexItemId, IndexItem, { isDeleted: false });

            const validatedBody = checkNewValidations(req);
            
            
            let updateStoreIndexItem = await IndexItem.findByIdAndUpdate(storeindexItemId, {
                ...validatedBody,
            }, { new: true });
            
            res.send(new ApiSuccess(true,200,'store index item update successFully',updateStoreIndexItem));
        }
        catch (err) {
            res.status(400).send(err)
        }
    },

    async updateItemIndexOrder(req,res,next) {
        let {itemIndex} = req.body;
        
        for(let i=0;i<itemIndex.length;i++){
            await IndexItem.findByIdAndUpdate(itemIndex[i].id, {
                displayOrder: i
            }, { new: true });
        }

        res.status(200).send('');
    },

    async getItemByIndexId(req,res,next){

        let { storeId,indexId } = req.query;
        console.log(storeId,indexId)
        let getStoreItemByIndex = await StoreItem.aggregate([
            {
                $match: {
                    isDeleted : false,
                    storeID: parseInt(storeId),
                    itemIndex: parseInt(indexId)
                    // createdBy: order.createdBy
                }
            },
            {
                $sort: {
                    displayOrder: 1
                }
            }
        ])

        res.send(new ApiSuccess(true,200,'store index item',getStoreItemByIndex));
    }
   

};