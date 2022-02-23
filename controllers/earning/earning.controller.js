import Order from "../../models/order/order.model";
import Store from "../../models/store/store.model";
import storeAddress from "../../models/storeAddress/storeAddress.model";
import User from "../../models/user/user.model";
import DriverPayment from '../../models/driverPayment/driverPayment.model';
import moment from "moment";
import Rating from "../../models/ratings/ratings.model";

export default {
  async getCurrentMonthEarning(req, res, next) {
    try {
      let earningData = await Order.aggregate([
        {
          $match: {
            status: "DELIVERED",
          },
        },
        {
          $project: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            itemPrice: "$itemTotal",
            vat: "$vatPrice",
            couponePrice: { $ifNull: ["$couponePrice", 0] },
            totalAmount: "$total",
            deliveryPrice: "$deliveryFees",
            adminEarning: {
              $ifNull: [
                {
                  $subtract: ["$adminCommisionEarnByStore", "$couponePrice"],
                },
                0,
              ],
            },
            storeEarning: "$storeEarn",
            createdAt: "$createdAt",
          },
        },
        {
          $group: {
            _id: { $substr: ["$createdAt", 5, 2] },
            vat: { $sum: "$vat" },
            itemPrice: { $sum: "$itemPrice" },
            couponDiscount: { $sum: "$couponePrice" },
            totalAmount: { $sum: "$totalAmount" },
            deliveryPrice: { $sum: "$deliveryPrice" },
            adminEarning: { $sum: "$adminEarning" },
            storeEarning: { $sum: "$storeEarning" },
            month: { $first: "$month" },
            year: { $first: "$year" },
            createdAt: { $first: "$createdAt" },
          },
        },
        {
          $sort: { _id: -1 },
        },
      ]);
      res.status(200).send({
        data: earningData,
      });
    } catch (err) {
      console.log("err..", err);
      next(err);
    }
  },

  async getEarningData(req, res, next) {
    try {
      const todayEarning = await getEarning(`today`);
      const sevenDaysEarning = await getEarning(`sevenDay`);
      const currentMonthEarning = await getEarning(`currentMonth`);
      const totalAmount = await getEarning(`totalAmount`);

      const earningData = {
        todayEarning: todayEarning.length ? todayEarning[0].total : 0,
        sevenDaysEarning: sevenDaysEarning.length
          ? sevenDaysEarning[0].total
          : 0,
        currentMonthEarning: currentMonthEarning.length
          ? currentMonthEarning[0].total
          : 0,
        totalAmount: totalAmount.length ? totalAmount[0].total : 0,
      };

      res.status(200).send(earningData);
    } catch (err) {
      console.log("err..", err);
      next(err);
    }
  },

  async getStoreEarnings(req, res, next) {
    try {
      const { month = "", year = "" } = req.body;

      let match = {};
      if (month !== "" && month !== "") {
        match["orders.createdAt"] = {
          $lt: new Date(year, month, 0),
          $gt: new Date(year, month - 1, 1),
        };
        match["orders.status"] = "DELIVERED";
      }

      const storeEarning = await Store.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "storeID",
            as: "orders",
          },
        },
        {
          $unwind: {
            path: "$orders",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: match,
        },
        {
          $project: {
            _id: 1,
            name: 1,
            vat: "$orders.vatPrice",
            couponePrice: { $ifNull: ["$orders.couponePrice", 0] },
            itemPrice: "$orders.itemTotal",
            totalAmount: "$orders.total",
            deliveryPrice: "$orders.deliveryFees",
            adminEarning: {
              $ifNull: [
                {
                  $subtract: [
                    "$orders.adminCommisionEarnByStore",
                    "$orders.couponePrice",
                  ],
                },
                0,
              ],
            },
            storeEarning: "$orders.storeEarn",
          },
        },
        {
          $group: {
            _id: "$_id",
            storeName: { $first: "$name" },
            couponDiscount: { $sum: "$couponePrice" },
            vat: { $sum: "$vat" },
            itemPrice: { $sum: "$itemPrice" },
            totalAmount: { $sum: "$totalAmount" },
            deliveryPrice: { $sum: "$deliveryPrice" },
            adminEarning: { $sum: "$adminEarning" },
            storeEarning: { $sum: "$storeEarning" },
          },
        },
        {
          $sort: { storeName: 1 },
        },
      ]);

      res.status(200).send(storeEarning);
    } catch (e) {
      console.log("err..", e);
      next(e);
    }
  },

  async getStoreOrderEarnings(req, res, next) {
    try {
      const { storeId } = req.body;
      const query = [
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "storeID",
            as: "orders",
          },
        },
        {
          $unwind: {
            path: "$orders",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            _id: storeId,
            "orders.status": "DELIVERED"
          },
        },
        {
          $project: {
            _id: 1,
            orderID: "$orders._id",
            storeDeliveryType: "$orders.storeDeliveryType",
            storeDeliveryPrice: "$orders.storeDeliveryPrice",
            name: 1,
            itemPrice: "$orders.itemTotal",
            vat: "$orders.vatPrice",
            couponDiscount: { $ifNull: ["$orders.couponePrice", 0] },
            totalAmount: "$orders.total",
            deliveryPrice: "$orders.deliveryFees",
            isStoreDelivery: "$orders.isStoreDelivery",
            adminEarning: {
              $ifNull: [
                {
                  $subtract: [
                    "$orders.adminCommisionEarnByStore",
                    "$orders.couponePrice",
                  ],
                },
                0,
              ],
            },
            storeEarning: "$orders.storeEarn",
            createdAt: "$orders.createdAt",
          },
        },
      ];
      const data = await Store.aggregate(query);
      res.status(200).send(data);
    } catch (e) {
      console.log("e..", e);
      next(e);
    }
  },

  async getStoreDetails(req, res, next) {
    try {
      const { storeId, storeName } = req.body;
      const store = await Store.findOne({_id: storeId});

      let storeRating = await Rating.aggregate([
        {
            $match: {
              ratingToWhom: "S",
              storeID: parseInt(storeId)
            }
        },
        {
            $group: {
                _id: "$storeID",
                avg_ratings : {$avg : "$ratings"}
            }
        }
      ]);
      // const store = await storeAddress.findOne({ storeID: storeId });
      res.status(200).send({...store._doc,storeRating});
    } catch (err) {
      next(err);
    }
  },

  async getStorePeriodWiseEarning(req, res, next) {
    try {
      const { storeId } = req.body;

      const todayEarning = await getStoreDayWiseEarning(`today`, storeId);
      const sevenDaysEarning = await getStoreDayWiseEarning(
        `sevenDay`,
        storeId
      );
      const currentMonthEarning = await getStoreDayWiseEarning(
        `currentMonth`,
        storeId
      );
      const totalAmount = await getStoreDayWiseEarning(`totalAmount`, storeId);
      const adminEarning = await getAdminEarning(storeId);
      const totalCouponPrice = await getTotalCouponPrice(storeId);
      const totalDriverVendorEarning = await getDriverVendorEarning(storeId);
      const totalStoreDeliveryPrice = await getStoreDeliveryPriceTotal(storeId);

      const earningData = {
        todayEarning: todayEarning.length ? todayEarning[0].total : 0,
        sevenDaysEarning: sevenDaysEarning.length ? sevenDaysEarning[0].total : 0,
        currentMonthEarning: currentMonthEarning.length ? currentMonthEarning[0].total : 0,
        totalAmount: totalAmount.length ? totalAmount[0].total : 0,
        adminEarning: adminEarning.length ? adminEarning[0].total : 0,
        totalCouponPrice: totalCouponPrice.length ? totalCouponPrice[0].total : 0,
        totalDriverVendorEarning: totalDriverVendorEarning.length ? totalDriverVendorEarning[0].total : 0,
        totalStoreDeliveryPrice: totalStoreDeliveryPrice.length ? totalStoreDeliveryPrice[0].total : 0
      };

      res.status(200).send(earningData);
    } catch (err) {
      console.log("err..", err);
      next(err);
    }
  },

  async getDriverPeriodWiseEarning(req, res, next) {
    try {
      const { driverId } = req.body;


      let driverPayment = await DriverPayment.aggregate([
        {
          $match: {
            driverId: driverId,
            isDeleted: false
          }
        },
        {
          $project: {
            amount: 1,
            driverId: 1,
            paymentType: 1,
            paymentBy: 1,
            _id: 1
          }
        },
        {
          $group: {
            _id: null,
            driverpay: {$sum : {$cond: [ {"$eq": ["$paymentBy","driver"]}, "$amount", 0]}},
            adminPay: {$sum : {$cond: [ {"$eq": ["$paymentBy","admin"]}, "$amount", 0]}},
          }
        }
      ])

      
      const adminEarning = await getAdminEarningByDriver(driverId);
      
      
      const earningData = {
        payByAdmin: driverPayment.length > 0 ? driverPayment[0].adminPay : 0,
        payByDriver: driverPayment.length > 0 ? driverPayment[0].driverpay : 0,
        adminEarning: adminEarning.length ? adminEarning[0].adminEarning : 0,
        onlineDriverEarn: adminEarning.length ? adminEarning[0].onlineDriverEarn : 0,
        offlineDriverEarn: adminEarning.length ? adminEarning[0].offlineDriverEarn : 0,
        totalAmount: adminEarning.length ? adminEarning[0].totalAmount : 0,
         
      };

      res.status(200).send(earningData);
    } catch (err) {
      console.log("err..", err);
      next(err);
    }
  },

  async driverEarningListMonthly(req, res, next) {
    try {
      let driverEarningData = await Order.aggregate([
        {
          $match: {
            status: "DELIVERED",
            isStoreDelivery: false
          },
        },
        {
          $project: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            totalAmount: "$total",
            adminEarning: "$adminCommisionEarnByDrive",
            driverEarning: "$driverEarn",
            createdAt: "$createdAt",
            paymentType: 1
          },
        },
        {
          $group: {
            _id: { $substr: ["$createdAt", 5, 2] },
            totalAmount: { $sum: "$totalAmount" },
            adminEarning: { $sum: "$adminEarning" },
            driverEarning: { $sum: "$driverEarning" },
            onlinePay: {$sum : {$cond: [ {"$eq": ["$paymentType","online"]}, "$totalAmount", 0]}},
            // onlinePay: { $sum: "$totalAmount" },
            // onlinePay: {$cond: [ {"$eq": ["$paymentType","online"]}, { "$sum" : "$totalAmount"}, 0]},
            cashCollection: {$sum : {$cond: [ {"$eq": ["$paymentType","cod"]}, "$totalAmount", 0]}},
            cashDeposited: { $first: "-" },
            month: { $first: "$month" },
            year: { $first: "$year" },
            createdAt: { $first: "$createdAt" },
            
          },
        },
        {
          $sort: { _id: -1 },
        },
      ]);
      res.status(200).send({
        data: driverEarningData,
      });
    } catch (err) {
      console.log("err..", err);
      next(err);
    }
  },

  async getEarningsByDriver(req, res, next) {
    try {
      const { month = "", year = "" } = req.body;
      let match = {};
      if (month !== "" && month !== "") {
        match["orders.createdAt"] = {
          $lt: new Date(year, month, 0),
          $gt: new Date(year, month - 1, 1),
        };
        match["orders.status"] = "DELIVERED";
      }
      console.log({match})
      const driverEarning = await User.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "salesMan",
            as: "orders",
          },
        },
        {
          $unwind: {
            path: "$orders",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: match,
        },
        {
          $project: {
            _id: 1,
            username: 1,
            totalAmount: "$orders.total",
            createdAt: "$orders.createdAt",
            adminEarning: "$orders.adminCommisionEarnByDrive",
            driverEarning: "$orders.driverEarn",
            paymentType: "$orders.paymentType"
          },
        },
        {
          $group: {
            _id: "$_id",
            driverName: { $first: "$username" },
            totalAmount: { $sum: "$totalAmount" },
            adminEarning: { $sum: "$adminEarning" },
            driverEarning: { $sum: "$driverEarning" },
            onlinePay: {$sum : {$cond: [ {"$eq": ["$paymentType","online"]}, "$totalAmount", 0]}},
            cashCollection: {$sum : {$cond: [ {"$eq": ["$paymentType","cod"]}, "$totalAmount", 0]}},
            cashDeposited: { $first: "-" },
            createdAt: { $first: "$createdAt" },
          },
        },
        {
          $sort: { driverName: 1 },
        },
      ]);
      res.status(200).send(driverEarning);
    } catch (e) {
      console.log("err..", e);
      next(e);
    }
  },

  async getDriverOrderEarnings(req, res, next) {
    try {
      const { driverId } = req.body;
      const query = [
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "salesMan",
            as: "orders",
          },
        },
        {
          $unwind: {
            path: "$orders",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            _id: driverId,
            "orders.status": "DELIVERED"
          },
        },
        {
          $project: {
            _id: 1,
            orderID: "$orders._id",
            username: 1,
            totalAmount: "$orders.total",
            createdAt: "$orders.createdAt",
            adminEarning: {
              $ifNull: [
                {
                  $subtract: [
                    "$orders.adminCommisionEarnByDrive",
                    "$orders.couponePrice",
                  ],
                },
                0,
              ],
            },
            driverEarning: "$orders.driverEarn",            
            onlinePay: {$cond: [ {"$eq": ["$orders.paymentType","online"]}, "$orders.total", 0]},
            cashCollection: {$cond: [ {"$eq": ["$orders.paymentType","cod"]}, "$orders.total", 0]}
          },
        },
      ];
      const data = await User.aggregate(query);
      res.status(200).send(data);
    } catch (e) {
      console.log("e..", e);
      next(e);
    }
  },

  async getDriverEarningData(req, res, next) {
    try {
      console.log("askjfdhkjadsfhjkfadh")
      const { id } = req.body;

      const todayEarning = await getDriverEarning(`today`,id);
      
      const sevenDaysEarning = await getDriverEarning(`sevenDay`,id);
      
      const currentMonthEarning = await getDriverEarning(`currentMonth`,id);
      
      const totalAmount = await getDriverEarning(`totalAmount`,id);
      
      
      const earningData = {
        todayEarning: todayEarning.length ? todayEarning[0].total : 0,
        sevenDaysEarning: sevenDaysEarning.length
          ? sevenDaysEarning[0].total
          : 0,
        currentMonthEarning: currentMonthEarning.length
          ? currentMonthEarning[0].total
          : 0,
        totalAmount: totalAmount.length ? totalAmount[0].total : 0,
      };

      res.status(200).send(earningData);
    } catch (err) {
      console.log("err..", err);
      next(err);
    }
  },

  async getStoreDeliveryPriceTotal(req,res,next){
    const { id } = req.body;
  }

};

function getEarning(period) {
  return new Promise(async (resolve, reject) => {
    if (period === "today") {
      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: new Date(Date.now() -  24 * 60 * 60 * 1000),
            },
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$total",
            },
          },
        },
      ]);
      resolve(earningData);
    }
    if (period === "sevenDay") {
      const startDay = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: startDay,
            },
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$total",
            },
          },
        },
      ]);
      resolve(earningData);
    }
    if (period === "currentMonth") {
      var date = new Date();
      var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: new Date(firstDay.getTime() - 24 * 60 * 60 * 1000),
            },
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$total",
            },
          },
        },
      ]);

      resolve(earningData);
    }
    if (period === "totalAmount") {
      const earningData = await Order.aggregate([
        {
          $match: {
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$total",
            },
          },
        },
      ]);

      resolve(earningData);
    }
  });
}

function getStoreDayWiseEarning(period, storeId) {
  return new Promise(async (resolve, reject) => {
    if (period === "today") {
      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: new Date(Date.now() -  24 * 60 * 60 * 1000),
            },
            status: "DELIVERED",
            storeID: storeId,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$storeEarn",
            },
          },
        },
      ]);
      resolve(earningData);
    }
    if (period === "sevenDay") {
      const startDay = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: startDay,
            },
            status: "DELIVERED",
            storeID: storeId,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$storeEarn",
            },
          },
        },
      ]);
      resolve(earningData);
    }
    if (period === "currentMonth") {
      var date = new Date();
      var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: new Date(firstDay.getTime() - 24 * 60 * 60 * 1000),
            },
            status: "DELIVERED",
            storeID: storeId,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$storeEarn",
            },
          },
        },
      ]);
      resolve(earningData);
    }
    if (period === "totalAmount") {
      const earningData = await Order.aggregate([
        {
          $match: {
            status: "DELIVERED",
            storeID: storeId,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$storeEarn",
            },
          },
        },
      ]);
      resolve(earningData);
    }
  });
}

function getAdminEarning(storeId) {
  return new Promise(async (resolve, reject) => {
    const adminEarningData = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          storeID: storeId,
        },
      },
      {
        $project: {
          adminEarning: "$adminCommisionEarnByStore",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$adminEarning",
          },
        },
      },
    ]);
    resolve(adminEarningData);
  });
}

function getTotalCouponPrice(storeId) {
  return new Promise(async (resolve, reject) => {
    const totalCouponPriceData = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          storeID: storeId,
        },
      },
      {
        $project: {
          couponPrice: "$couponePrice",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$couponPrice",
          },
        },
      },
    ]);
    resolve(totalCouponPriceData);
  });
}

function getDriverVendorEarning(storeId) {
  return new Promise(async (resolve, reject) => {
    const driverVendorEarningData = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          driverType: "STORE-SALESMAN",
          storeID: storeId,
        },
      },
      {
        $project: {
          driverEarn: "$driverEarn",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$driverEarn",
          },
        },
      },
    ]);
    resolve(driverVendorEarningData);
  });
}


function getStoreDeliveryPriceTotal(storeId) {

  return new Promise(async (resolve, reject) => {
    const driverVendorEarningData = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          // driverType: "STORE-SALESMAN",
          storeDeliveryType: "free",
          isStoreDelivery: false,
          storeID: storeId,
        },
      },
      {
        $project: {
          storeDeliveryPrice: "$storeDeliveryPrice",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$storeDeliveryPrice",
          },
        },
      },
    ]);
    resolve(driverVendorEarningData);
  });
}



function getDriverEarning(period,salesMan) {
  return new Promise(async (resolve, reject) => {
    if (period === "today") {
      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: new Date(Date.now() -  24 * 60 * 60 * 1000),
            },
            status: "DELIVERED",
            salesMan: salesMan
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$driverEarn",
            },
          },
        },
      ]);
      resolve(earningData);
    }
    if (period === "sevenDay") {
      const startDay = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: startDay,
            },
            status: "DELIVERED",
            salesMan: salesMan
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$driverEarn",
            },
          },
        },
      ]);
      resolve(earningData);
    }
    if (period === "currentMonth") {
      var date = new Date();
      var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

      const earningData = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $lt: new Date(),
              $gt: new Date(firstDay.getTime() - 24 * 60 * 60 * 1000),
            },
            status: "DELIVERED",
            salesMan: salesMan
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$driverEarn",
            },
          },
        },
      ]);

      resolve(earningData);
    }
    if (period === "totalAmount") {
      const earningData = await Order.aggregate([
        {
          $match: {
            status: "DELIVERED",
            salesMan: salesMan
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$driverEarn"              
            },
          },
        },
      ]);

      resolve(earningData);
    }
  });
}


function getAdminEarningByDriver(salesMan) {
  return new Promise(async (resolve, reject) => {
    const adminEarningData = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          salesMan: salesMan,
        },
      },
      {
        $project: {
          adminEarning: "$adminCommisionEarnByDrive",
          paymentType: 1,
          driverEarn: 1,
          adminCommisionDriver: 1,
          total: 1
        },
      },
      {
        $group: {
          _id: null,
          adminEarning: {$sum: "$adminEarning"},
          onlineDriverEarn: {$sum : {$cond: [ {"$eq": ["$paymentType","online"]}, "$driverEarn", 0]}},
          offlineDriverEarn: {$sum : {$cond: [ {"$eq": ["$paymentType","cod"]}, "$driverEarn", 0]}},
          totalAmount: {$sum : {$cond: [ {"$eq": ["$paymentType","cod"]}, "$total", 0]}}
        },
      },
    ]);
    resolve(adminEarningData);
  });
}
