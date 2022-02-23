import ApiSuccess from '../../helpers/ApiSuccess';
import RatingModel from '../../models/ratings/ratings.model'

export default {

    async calculateAverageRating(which,idArray){
        let returnData = [];

        if(idArray.length <= 0){
            return returnData;
        }
       
        //calculate average store wise
        if(which == "S"){
            returnData = await RatingModel.aggregate([
                {
                    $match: {
                        $and: [
                            {storeID: {'$in' : idArray}},
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$storeID",
                        avg_ratings : {$avg : "$ratings"}
                    }
                }
            ]);
        }
        
        //calculate average driver wise
        if(which == "D"){
            returnData = await RatingModel.aggregate([
                {
                    $match: {
                        $and: [
                            {driverID: {'$in' : idArray}},
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$driverID",
                        avg_ratings : {$avg : "$ratings"}
                    }
                }
            ]);
        }

        //calculate average store address wise
        if(which == "SA"){
            returnData = await RatingModel.aggregate([
                {
                    $match: {
                        $and: [
                            {storeAddressID: {'$in' : idArray}},
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$storeAddressID",
                        avg_ratings : {$avg : "$ratings"}
                    }
                }
            ]);
        }

        return returnData;
        
    },

    async createRating(req,res,next){
        try{
            
            if (!req.body.fromUser) {
                return res.send(new ApiSuccess(false,400,'fromUser field is required',{}))
            }

            if(!req.body.ratingsArray && !Array.isArray(req.body.ratingsArray && req.body.ratingsArray.length <= 0)){
                return res.send(new ApiSuccess(false,400,'ratingsArray field is required',{}))
            }

            if(!req.body.orderID){
                return res.send(new ApiSuccess(false,400,'orderID field is required',{}))
            }            

            let createRatingsArray = [];

            for(let i=0;i<req.body.ratingsArray.length;i++){
                let item = req.body.ratingsArray[i];

                if (!item.ratingToWhom || !["S", "D"].includes(item.ratingToWhom)) {
                    return res.send(new ApiSuccess(false,400,'Valid ratingToWhom field is required for each ratingsArray object',{}))
                }

                if(item.ratingToWhom == "S" && !req.body.storeID){
                    return res.send(new ApiSuccess(false,400,'storeID field is required',{}))
                }  
                
                if(item.ratingToWhom == "S" && !req.body.storeAddressID){
                    return res.send(new ApiSuccess(false,400,'storeAddressID field is required',{}))
                }   
    
                if(item.ratingToWhom == "D" && !req.body.driverID){
                    return res.send(new ApiSuccess(false,400,'driverID field is required',{}))
                }

                if (!item.ratings) {
                    return res.send(new ApiSuccess(false,400,'ratings field is required for each ratingsArray object',{}))
                }

                // if (!item.review) {
                //     return res.send(new ApiSuccess(false,400,'review field is required for each ratingsArray object',{}))
                // }

                let createRatingData = {
                    fromUser : req.body.fromUser,
                    orderID : req.body.orderID,
                    ratingToWhom : item.ratingToWhom,
                    review : item.review,
                    ratings : item.ratings,                     
                }                 

                if(item.ratingToWhom == "S"){
                    createRatingData.storeID = req.body.storeID;
                    createRatingData.storeAddressID = req.body.storeAddressID;
                }
    
                if(item.ratingToWhom == "D"){
                    createRatingData.driverID = req.body.driverID
                }

                let createdrating = await RatingModel.create(createRatingData);

                createRatingsArray.push(createdrating);
                
            }

            res.send(new ApiSuccess(true,200,'Rating given SuccessFully',createRatingsArray))

        }catch(err){
            console.log(req.body)
            console.log({err})
            res.send(new ApiSuccess(false,400,'Unknown Error',err))
        }
    }


};