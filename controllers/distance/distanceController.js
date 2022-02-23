var Distance = require('../../models/distance/distance.model');
var config = require('../../config');


var distanceController = {

    async getAllDistances(res, next) {
        var query = {isDeleted: false};
        
        Distance.find({})
            .sort({ _id: -1 })
            .then(async data => {
                var newdata = [];
                //res.status(200).send(data);
                // console.log('Distance Is => ' + data)
                data.map(function (element) {
                    // console.log('Distance Element => ' + element)
                })
               
            })
            .catch(err => {
                console.log('err Is => ' + err)
            });
            
    }
    
};

module.exports = distanceController;
