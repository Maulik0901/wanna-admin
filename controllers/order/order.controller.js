import {
  checkExist,
  checkCouponExist,
  checkExistThenGet,
  isLng,
  isLat,
} from "../../helpers/CheckMethods";
import ApiResponse from "../../helpers/ApiResponse";
import Order from "../../models/order/order.model";
import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import { body } from "express-validator/check";
import { ValidationError } from "mongoose";
import {
  handleImg,
  checkValidations,
  checkNewValidations,
} from "../shared/shared.controller";
import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Report from "../../models/reports/report.model";
import Notif from "../../models/notif/notif.model";
import Coupon from "../../models/coupon/coupon.model";
import Bill from "../../models/bills/bill.model";
import Debt from "../../models/debt/debt.model";
import Offer from "../../models/offer/offer.model";
import StoreUser from "../../models/storeUser/storeUser.model";
import Distances from "../../models/distance/distance/distance.model";
import orderItem from "../../models/orderItem/orderItem.model";
import { toImgUrl } from "../../utils";
import Store from "../../models/store/store.model";
import Tax from "../../models/tax/tax.model";
import ApiSuccess from "../../helpers/ApiSuccess";
import config from "../../config";
import Rating from "../../models/ratings/ratings.model";
import OrdersSettings from "../../models/settings/ordersSettings.modal";
import PaymentTransaction from "../../models/paymentTransaction/paymentTransaction.model";
import NotificationMessage from '../../models/notifyMessage/notifyMessage';
var moment = require("moment");

var Distance = require("geo-distance");
const storeDriverCharge = 20;
const ratingPopulateQuery = [
  { path: "client", model: "user" },
  { path: "salesMan", model: "user" },
  { path: "storeID", model: "store" },
  { path: "storeAddressID", model: "storeAddress" },
  {path: "storeAddress",  model: "storeAddress"},
  { path: "orderID", model: "order" },
];

const populateQuery = [
  { path: "fromUser", model: "user" },
  { path: "driverID", model: "user" },
  { path: "bill", model: "bill" },
  { path: "offer", model: "offer" },
  { path: "coupon", modal: "coupon" },
  { path: "storeID", model: "store" },
  { path: "storeAddress", model: "storeAddress" },
  { path: "storeUser", model: "user" },
  { path: "clientAddress", modal: "address" },
  { path: "salesMan", model: "user" },
  { path: "client", model: "user" },
];
function validatedestination(location) {
  if (!isLng(location[0]))
    throw new ValidationError.UnprocessableEntity({
      keyword: "location",
      message: "location[0] is invalid lng",
    });
  if (!isLat(location[1]))
    throw new ValidationError.UnprocessableEntity({
      keyword: "location",
      message: "location[1] is invalid lat",
    });
}

var OrderController = {
  async findOrders(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        {
          status,
          client,
          salesMan,
          accept,
          city,
          isDriver,
          isWhiteourStore,
          isStoreOrder,
          createdBy,
          id,
          storeID,
          storeAddress,
          isHistory,
          startDate,
          endDate,
        } = req.query,
        query = { isDeleted: false };

      if (id) {
        query._id = id;
      }
      if (storeID) {
        query.storeID = storeID;
      }
      if (storeAddress) {
        query.storeAddress = storeAddress;
      }

      if (status) {
        if (!isDriver) {
          query.status = status;
        } else {
          query.status = status;
        }
      }

      if (createdBy) {
        query.createdBy = createdBy;
      }

      if (salesMan && status !== "PENDING") {
        query.salesMan = salesMan;
      }

      if (isWhiteourStore) {
        query.storeID = null;
      }
      if (isStoreOrder) {
        query.storeID = { $ne: null };
      }

      if (startDate && endDate) {
        query.createdAt = { $lte: endDate };
        query.createdAt = { $gte: startDate };
      }

      if (isStoreOrder && status === "REJECT") {
        query.status = { $in: ["CANCEL", "REJECT"] };
      }
      if (accept) {
        if (isDriver) {
          query.accept = accept;
          query.status = {
            $in: ["ON_PROGRESS", "RECEIVED", "ON_THE_WAY", "ARRIVED"],
          };
        } else {
          query.accept = accept;
        }
      }

      if (isDriver && status === "PENDING") {
        query["$or"] = [
          { status: "PENDING", storeID: null },
          { status: "READY_FOR_DELIVER" },
        ];
        query["isStoreDelivery"] = false;
      }

      if (status === "REJECT") {
        delete query.isDeleted;
      }
      if (client) {
        query.client = client;
        if (isHistory) {
          query.status = { $in: ["DELIVERED", "CANCEL", "REJECT"] };
        } else {
          query.status = {
            $in: [
              "PENDING",
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "ACCEPT",
              "READY_FOR_DELIVER",
            ],
          };
        }
      }
      let orders = await Order.find(query)
        .populate(populateQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      if (city) orders = orders.filter((order) => order.client.city === city);
      let ordersId = [];
      let orderUpdateData = [];
      let allorderData = [];
      for (var i = 0; i < orders.length; i++) {
        orderUpdateData.push({ ...orders[i] });

        let orderData = { ...orders[i]._doc };

        if (!orderData.storeID) {
          orderData["isStoreOrder"] = false;
        } else {
          orderData["isStoreOrder"] = true;
        }
        allorderData.push({ ...orderData });
        ordersId.push(orders[i].id);
      }

      if (status == "PENDING") {
        console.log(
          "================= order list Pending get api call============="
        );

        let orderItemFind = await orderItem
          .find({ orderID: { $in: ordersId } })
          .populate([{ path: "itemID", modal: "storeItem" }]);

        let findRatings = await Rating.find({ orderID: { $in: ordersId } });
        for (let j = 0; j < allorderData.length; j++) {
          let ratings = [];

          if (allorderData.isStoreOrder) {
            allorderData[j]["items"] = [];
          }
          allorderData[j].id = allorderData[j]._id;
          if (req.get("lang") === "ar") {
            if (allorderData[j].storeID) {
              allorderData[j].storeID.name = allorderData[j].storeID.arName
                ? allorderData[j].storeID.arName
                : allorderData[j].storeID.name;
            }
            if (allorderData[j].storeAddress) {
              allorderData[j].storeAddress.name = allorderData[j].storeAddress
                .arName
                ? allorderData[j].storeAddress.arName
                : allorderData[j].storeAddress.name;
              allorderData[j].storeAddress.address = allorderData[j]
                .storeAddress.arAddress
                ? allorderData[j].storeAddress.arAddress
                : allorderData[j].storeAddress.name;
              allorderData[j].storeAddress.landmark = allorderData[j]
                .storeAddress.arLandmark
                ? allorderData[j].storeAddress.arLandmark
                : allorderData[j].storeAddress.landmark;
            }
          }
          for (let i = 0; i < orderItemFind.length; i++) {
            if (allorderData[j]._id == orderItemFind[i].orderID) {
              // allorderData[j].items.push(orderItemFind[i])
              if (allorderData[j].items && allorderData[j].items.length > 0) {
                let item = { ...orderItemFind[i]._doc };
                item.id = item._id;
                if (req.get("lang") === "ar") {
                  if (item.itemID) {
                    item.itemID.name = item.itemID.arName
                      ? item.itemID.arName
                      : item.itemID.name;
                    item.itemID.description = item.itemID.arDescription
                      ? item.itemID.arDescription
                      : item.itemID.description;
                  }
                }
                if (item.itemID) {
                  let itemOrderQuantity = item.itemQuantity;
                  let itemQuantity = item.itemID.quantity;
                  item.itemID.quantity = itemOrderQuantity;
                  item.itemQuantity = itemQuantity;
                }
                allorderData[j].items = [...allorderData[j].items, { ...item }];
              } else {
                let item = { ...orderItemFind[i]._doc };
                item.id = item._id;
                if (req.get("lang") === "ar") {
                  if (item.itemID) {
                    item.itemID.name = item.itemID.arName
                      ? item.itemID.arName
                      : item.itemID.name;
                    item.itemID.description = item.itemID.arDescription
                      ? item.itemID.arDescription
                      : item.itemID.description;
                  }
                }
                if (item.itemID) {
                  let itemOrderQuantity = item.itemQuantity;
                  let itemQuantity = item.itemID.quantity;
                  item.itemID.quantity = itemOrderQuantity;
                  item.itemQuantity = itemQuantity;
                }
                allorderData[j].items = [{ ...item }];
              }
            }
          }

          for (let k = 0; k < findRatings.length; k++) {
            if (allorderData[j]._id == findRatings[k].orderID) {
              ratings.push(findRatings[k]);
            }
          }

          allorderData[j].ratings = ratings;
        }

        const ordersCount = await Order.count(query);
        const pageCount = Math.ceil(ordersCount / limit);

        res.send(
          new ApiSuccess(true, 200, "Order list", {
            orders: allorderData,
            page,
            pageCount,
            limit,
            ordersCount,
          })
        );
      } else {
        let orderItemFind = await orderItem
          .find({ orderID: { $in: ordersId } })
          .populate([{ path: "itemID", modal: "storeItem" }]);

        let findRatings = await Rating.find({ orderID: { $in: ordersId } });
        let findAverageRating = await Rating.aggregate([
          {
            $match: {
              ratingToWhom: "S",
            },
          },
          {
            $group: {
              _id: "$storeAddressID",
              average_rating: { $avg: "$ratings" },
            },
          },
        ]);

        let findAverageSalesmenRating = await Rating.aggregate([
          {
            $match: {
              ratingToWhom: "D",
            },
          },
          {
            $group: {
              _id: "$driverID",
              average_rating: { $avg: "$ratings" },
            },
          },
        ]);
        console.log({findAverageSalesmenRating})
        for (let j = 0; j < allorderData.length; j++) {
          let ratings = [];

          if (allorderData.isStoreOrder) {
            allorderData[j]["items"] = [];
          }
          allorderData[j].id = allorderData[j]._id;
          if (req.get("lang") === "ar") {
            if (allorderData[j].storeID) {
              allorderData[j].storeID.name = allorderData[j].storeID.arName
                ? allorderData[j].storeID.arName
                : allorderData[j].storeID.name;
            }
            if (allorderData[j].storeAddress) {
              allorderData[j].storeAddress.name = allorderData[j].storeAddress
                .arName
                ? allorderData[j].storeAddress.arName
                : allorderData[j].storeAddress.name;
              allorderData[j].storeAddress.address = allorderData[j]
                .storeAddress.arAddress
                ? allorderData[j].storeAddress.arAddress
                : allorderData[j].storeAddress.name;
              allorderData[j].storeAddress.landmark = allorderData[j]
                .storeAddress.arLandmark
                ? allorderData[j].storeAddress.arLandmark
                : allorderData[j].storeAddress.landmark;
            }
          }
          for (let i = 0; i < orderItemFind.length; i++) {
            if (allorderData[j]._id == orderItemFind[i].orderID) {
              // allorderData[j].items.push(orderItemFind[i])
              if (allorderData[j].items && allorderData[j].items.length > 0) {
                let item = { ...orderItemFind[i]._doc };
                item.id = item._id;
                if (req.get("lang") === "ar") {
                  if (item.itemID) {
                    item.itemID.name = item.itemID.arName
                      ? item.itemID.arName
                      : item.itemID.name;
                    item.itemID.description = item.itemID.arDescription
                      ? item.itemID.arDescription
                      : item.itemID.description;
                  }
                }

                if (item.itemID) {
                  let itemOrderQuantity = item.itemQuantity;
                  let itemQuantity = item.itemID.quantity;
                  item.itemID.quantity = itemOrderQuantity;
                  item.itemQuantity = itemQuantity;
                }

                allorderData[j].items = [...allorderData[j].items, { ...item }];
              } else {
                let item = { ...orderItemFind[i]._doc };
                item.id = item._id;
                if (req.get("lang") === "ar") {
                  if (item.itemID) {
                    item.itemID.name = item.itemID.arName
                      ? item.itemID.arName
                      : item.itemID.name;
                    item.itemID.description = item.itemID.arDescription
                      ? item.itemID.arDescription
                      : item.itemID.description;
                  }
                }

                if (item.itemID) {
                  let itemOrderQuantity = item.itemQuantity;
                  let itemQuantity = item.itemID.quantity;
                  item.itemID.quantity = itemOrderQuantity;
                  item.itemQuantity = itemQuantity;
                }

                allorderData[j].items = [{ ...item }];
              }
            }
          }

          for (let k = 0; k < findRatings.length; k++) {
            if (allorderData[j]._id == findRatings[k].orderID) {
              ratings.push(findRatings[k]);
            }
          }

          if (
            allorderData[j].storeAddress &&
            allorderData[j].storeAddress._doc
          ) {
            allorderData[j].storeAddress = {
              ...allorderData[j].storeAddress._doc,
              average_rating: 0,
              id: allorderData[j].storeAddress._doc._id,
            };
            for (let m = 0; m < findAverageRating.length; m++) {
              if (allorderData[j].storeAddress.id == findAverageRating[m]._id) {
                allorderData[j].storeAddress.average_rating =
                  findAverageRating[m].average_rating;
              }
            }
            allorderData[j].ratings = ratings;
          }

          // console.log("allorderData[j].salesMan",allorderData[j].salesMan._id)
          if (allorderData[j].salesMan && allorderData[j].salesMan._id) {
            allorderData[j].salesMan = {
              ...allorderData[j].salesMan._doc,
              average_rating: 0,
              id: allorderData[j].salesMan._doc._id,
            };

            // allorderData[j].salesMan.average_rating = 0;
            for (let d = 0; d < findAverageSalesmenRating.length; d++) {
              if (
                findAverageSalesmenRating[d]._id === allorderData[j].salesMan.id
              ) {
                allorderData[j].salesMan.average_rating =
                  findAverageSalesmenRating[d].average_rating;
              }
            }
          }
        }

        const ordersCount = await Order.count(query);
        const pageCount = Math.ceil(ordersCount / limit);

        res.send(
          new ApiSuccess(true, 200, "Order list", {
            orders: allorderData,
            page,
            pageCount,
            limit,
            ordersCount,
          })
        );
        // res.send(new ApiResponse(allorderData, page, pageCount, limit, ordersCount, req));
      }
    } catch (err) {
      console.log({ err });
      next(err);
    }
  },
  async findNearByDriverOrder(req, res, next) {
    let driver = await checkExistThenGet(req.user._id, User, {
      isDeleted: false,
    });
    if (driver.type !== "STORE-SALESMAN") {
      if (!req.query.lat) {
        return res.send(new ApiSuccess(false, 400, "latitude is required", {}));
      }
      if (!req.query.long) {
        return res.send(new ApiSuccess(false, 400, "logitude is required", {}));
      }
    }

    let query = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              parseFloat(req.query.long),
              parseFloat(req.query.lat),
            ],
          },
          key: "shopLocation",
          distanceField: "dist.calculated",
          maxDistance: 30 * 1000,
          minDistance: 0,
          // includeLocs: "dist.location",
          spherical: true,
        },
      },
      {
        $match: {
          $or: [
            { status: "PENDING", storeID: null },
            { status: "READY_FOR_DELIVER" },
          ],
          createdBy: driver.createdBy,
          isStoreDelivery: false,
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "clientAddress",
          foreignField: "_id",
          as: "clientAddress",
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "storeID",
          foreignField: "_id",
          as: "storeID",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $lookup: {
          from: "storeaddresses",
          localField: "storeAddress",
          foreignField: "_id",
          as: "storeAddress",
        },
      },
      { $unwind: "$storeID" },
      { $unwind: "$clientAddress" },
      { $unwind: "$storeAddress" },
      { $unwind: "$client" },
    ];

    if (driver.type === "STORE-SALESMAN") {
      query = [
        {
          $match: {
            $or: [
              { status: "PENDING", storeID: null },
              { status: "READY_FOR_DELIVER" },
            ],
            createdBy: driver.createdBy,
            storeID: driver.store,
            isStoreDelivery: true,
            // storeAddress: driver.storeAddress
          },
        },
        {
          $lookup: {
            from: "addresses",
            localField: "clientAddress",
            foreignField: "_id",
            as: "clientAddress",
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "storeID",
            foreignField: "_id",
            as: "storeID",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        {
          $lookup: {
            from: "storeaddresses",
            localField: "storeAddress",
            foreignField: "_id",
            as: "storeAddress",
          },
        },
        { $unwind: "$storeID" },
        { $unwind: "$clientAddress" },
        { $unwind: "$storeAddress" },
        { $unwind: "$client" },
      ];
    }

    let findOrders = await Order.aggregate(query);
    let ordersId = [];
    for (let i = 0; i < findOrders.length; i++) {
      ordersId.push(findOrders[i]._id);
    }

    let findAverageRating = await Rating.aggregate([
      {
        $match: {
          ratingToWhom: "S",
        },
      },
      {
        $group: {
          _id: "$storeAddressID",
          average_rating: { $avg: "$ratings" },
        },
      },
    ]);

    let orderItemFind = await orderItem
      .find({ orderID: { $in: ordersId } })
      .populate([{ path: "itemID", modal: "storeItem" }]);
    for (let j = 0; j < findOrders.length; j++) {
      findOrders[j]["items"] = [];

      findOrders[j].storeAddress = {
        ...findOrders[j].storeAddress,
        average_rating: 0,
      };

      if (req.get("lang") === "ar") {
        console.log(findOrders[j].storeID);
        if (findOrders[j].storeID) {
          findOrders[j].storeID.name = findOrders[j].storeID.arName
            ? findOrders[j].storeID.arName
            : findOrders[j].storeID.name;
        }
        if (findOrders[j].storeAddress) {
          findOrders[j].storeAddress.name = findOrders[j].storeAddress.arName
            ? findOrders[j].storeAddress.arName
            : findOrders[j].storeAddress.name;
          findOrders[j].storeAddress.address = findOrders[j].storeAddress
            .arAddress
            ? findOrders[j].storeAddress.arAddress
            : findOrders[j].storeAddress.name;
          findOrders[j].storeAddress.landmark = findOrders[j].storeAddress
            .arLandmark
            ? findOrders[j].storeAddress.arLandmark
            : findOrders[j].storeAddress.landmark;
        }
      }

      for (let m = 0; m < findAverageRating.length; m++) {
        if (findOrders[j].storeAddress.id == findAverageRating[m]._id) {
          findOrders[j].storeAddress.average_rating =
            findAverageRating[m].average_rating;
        }
      }

      for (let i = 0; i < orderItemFind.length; i++) {
        if (findOrders[j]._id == orderItemFind[i].orderID) {
          if (req.get("lang") === "ar") {
            if (orderItemFind[i]._doc.itemID) {
              orderItemFind[i]._doc.itemID.name = orderItemFind[i]._doc.itemID
                .arName
                ? orderItemFind[i]._doc.itemID.arName
                : orderItemFind[i]._doc.itemID.name;
              orderItemFind[i]._doc.itemID.description = orderItemFind[i]._doc
                .itemID.arDescription
                ? orderItemFind[i]._doc.itemID.arDescription
                : orderItemFind[i]._doc.itemID.description;
            }
          }

          if (orderItemFind[i]._doc.itemID) {
            let itemOrderQuantity = orderItemFind[i]._doc.itemQuantity;
            let itemQuantity = orderItemFind[i]._doc.itemID.quantity;
            orderItemFind[i]._doc.itemID.quantity = itemOrderQuantity;
            orderItemFind[i]._doc.itemQuantity = itemQuantity;
          }

          if (findOrders[j].items && findOrders[j].items.length > 0) {
            findOrders[j].items = [
              ...findOrders[j].items,
              { ...orderItemFind[i]._doc },
            ];
          } else {
            findOrders[j].items = [{ ...orderItemFind[i]._doc }];
          }
        }
      }
    }

    res.send(new ApiSuccess(true, 200, "Order list", findOrders));
  },
  async findDriverOrders(req, res, next) {
    try {
      let driver = await checkExistThenGet(req.user._id, User, {
        isDeleted: false,
      });

      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        {
          status,
          client,
          salesMan,
          accept,
          city,
          isDriver,
          isWhiteourStore,
          isStoreOrder,
          createdBy,
          id,
          storeID,
          storeAddress,
        } = req.query,
        query = {
          isDeleted: false,
          salesMan: req.user._id,
          isStoreDelivery: false,
        };

      if (status === "DELIVERED") {
        query.status = "DELIVERED";
      } else {
        query.status = {
          $in: ["ON_PROGRESS", "RECEIVED", "ON_THE_WAY", "ARRIVED"],
        };
      }

      if (driver.type === "STORE-SALESMAN") {
        query.storeID = driver.store;
        query.isStoreDelivery = true;
        // query.storeAddress = driver.storeAddress;
      } else {
        // query.salesMan = driver._id;
      }

      console.log({ query });
      let orders = await Order.find(query)
        .populate(populateQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      if (city) orders = orders.filter((order) => order.client.city === city);
      let ordersId = [];
      let orderUpdateData = [];
      let allorderData = [];
      for (var i = 0; i < orders.length; i++) {
        orderUpdateData.push({ ...orders[i] });

        let orderData = { ...orders[i]._doc };

        if (!orderData.storeID) {
          orderData["isStoreOrder"] = false;
        } else {
          orderData["isStoreOrder"] = true;
        }
        allorderData.push({ ...orderData });
        ordersId.push(orders[i].id);
      }

      let orderItemFind = await orderItem
        .find({ orderID: { $in: ordersId } })
        .populate([{ path: "itemID", modal: "storeItem" }]);

      let findRatings = await Rating.find({ orderID: { $in: ordersId } });
      let findAverageRating = await Rating.aggregate([
        {
          $match: {
            ratingToWhom: "S",
          },
        },
        {
          $group: {
            _id: "$storeAddressID",
            average_rating: { $avg: "$ratings" },
          },
        },
      ]);
      for (let j = 0; j < allorderData.length; j++) {
        let ratings = [];
        if (allorderData.isStoreOrder) {
          allorderData[j]["items"] = [];
        }
        allorderData[j].id = allorderData[j]._id;
        if (req.get("lang") === "ar") {
          console.log(allorderData[j].storeID);
          if (allorderData[j].storeID) {
            allorderData[j].storeID.name = allorderData[j].storeID.arName
              ? allorderData[j].storeID.arName
              : allorderData[j].storeID.name;
          }
          if (allorderData[j].storeAddress) {
            allorderData[j].storeAddress.name = allorderData[j].storeAddress
              .arName
              ? allorderData[j].storeAddress.arName
              : allorderData[j].storeAddress.name;
            allorderData[j].storeAddress.address = allorderData[j].storeAddress
              .arAddress
              ? allorderData[j].storeAddress.arAddress
              : allorderData[j].storeAddress.name;
            allorderData[j].storeAddress.landmark = allorderData[j].storeAddress
              .arLandmark
              ? allorderData[j].storeAddress.arLandmark
              : allorderData[j].storeAddress.landmark;
          }
        }
        for (let i = 0; i < orderItemFind.length; i++) {
          if (allorderData[j]._id == orderItemFind[i].orderID) {
            // allorderData[j].items.push(orderItemFind[i])
            if (allorderData[j].items && allorderData[j].items.length > 0) {
              let item = { ...orderItemFind[i]._doc };
              item.id = item._id;
              if (req.get("lang") === "ar") {
                if (item.itemID) {
                  item.itemID.name = item.itemID.arName
                    ? item.itemID.arName
                    : item.itemID.name;
                  item.itemID.description = item.itemID.arDescription
                    ? item.itemID.arDescription
                    : item.itemID.description;
                }
              }
              if (item.itemID) {
                let itemOrderQuantity = item.itemQuantity;
                let itemQuantity = item.itemID.quantity;
                item.itemID.quantity = itemOrderQuantity;
                item.itemQuantity = itemQuantity;
              }
              allorderData[j].items = [...allorderData[j].items, { ...item }];
            } else {
              let item = { ...orderItemFind[i]._doc };
              item.id = item._id;
              if (req.get("lang") === "ar") {
                if (item.itemID) {
                  item.itemID.name = item.itemID.arName
                    ? item.itemID.arName
                    : item.itemID.name;
                  item.itemID.description = item.itemID.arDescription
                    ? item.itemID.arDescription
                    : item.itemID.description;
                }
              }
              if (item.itemID) {
                let itemOrderQuantity = item.itemQuantity;
                let itemQuantity = item.itemID.quantity;
                item.itemID.quantity = itemOrderQuantity;
                item.itemQuantity = itemQuantity;
              }
              allorderData[j].items = [{ ...item }];
            }
          }
        }

        for (let k = 0; k < findRatings.length; k++) {
          if (allorderData[j]._id == findRatings[k].orderID) {
            ratings.push(findRatings[k]);
          }
        }

        allorderData[j].storeAddress = {
          ...allorderData[j].storeAddress._doc,
          average_rating: 0,
          id: allorderData[j].storeAddress._doc._id,
        };
        for (let m = 0; m < findAverageRating.length; m++) {
          if (allorderData[j].storeAddress.id == findAverageRating[m]._id) {
            allorderData[j].storeAddress.average_rating =
              findAverageRating[m].average_rating;
          }
        }
        allorderData[j].ratings = ratings;
      }

      const ordersCount = await Order.count(query);
      const pageCount = Math.ceil(ordersCount / limit);

      res.send(
        new ApiSuccess(true, 200, "Order list", {
          orders: allorderData,
          page,
          pageCount,
          limit,
          ordersCount,
        })
      );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  },
  validateCreated() {
    let validations = [
      body("clientDestination")
        .not()
        .isEmpty()
        .withMessage("client Destination is required"),
      body("shopDestination")
        .not()
        .isEmpty()
        .withMessage("shop Destination is required"),
      body("description")
        .not()
        .isEmpty()
        .withMessage("description is required"),
      body("time").not().isEmpty().withMessage("delivery time is required"),
      body("img")
        .optional()
        .custom((val) => isImgUrl(val))
        .withMessage("img should be a valid img"),
      body("shopName"),
      body("couponNumber"),
      body("createdBy").optional(),
      body("deliveryFees").optional(),
      body("itemTotal").optional(),
      body("tax").optional(),
      body("total").optional(),
    ];
    return validations;
  },

  async create(req, res, next) {
    try {
      await checkExist(req.user._id, User);
      const validatedBody = checkNewValidations(req);

      // let distance = await Distance.find(query)
      //     .sort({ createdAt: -1 })
      //     .limit(20);

      // console.log(distance[0])
      // validatedBody.createdBy = req.body.createdBy;

      validatedBody.client = req.user._id;
      validatedestination(validatedBody.clientDestination);
      validatedBody.clientDestination = [
        +req.body.clientDestination[0],
        +req.body.clientDestination[1],
      ];

      validatedestination(validatedBody.shopDestination);
      validatedBody.shopDestination = [
        +req.body.shopDestination[0],
        +req.body.shopDestination[1],
      ];
      if (req.file) {
        let image = await handleImg(req);
        validatedBody.img = image;
      }
      validatedBody.createTime = Date.now();
      if (req.body.coupon) {
        let coupon = await Coupon.findOne({
          isDeleted: false,
          endDate: { $gte: Date.now() },
          code: req.body.coupon.toUpperCase(),
        });

        if (coupon) {
          if (coupon.couponType == "NU") {
            let query = {
              client: req.user._id,
            };
            let orders = await Order.find(query);

            if (orders.length <= coupon.reedMeCoupone) {
              // res.status(200).json({
              //     isValid:true
              // })
              validatedBody.coupon = coupon._id;
            } else {
              // res.status(200).json({
              //     isValid:false
              // })
              // return next(new ApiError(403, ('invalid coupon')))
              return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
            }
          }
          if (coupon.couponType == "FX") {
            let query = {
              coupon: coupon._id,
            };
            let orders = await Order.find(query);

            if (orders.length <= coupon.firstX) {
              // res.status(200).json({
              //     isValid:true
              // })
              validatedBody.coupon = coupon._id;
            } else {
              // res.status(200).json({
              //     isValid:false
              // })
              // return next(new ApiError(403, ('invalid coupon')))
              return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
            }
          }

          if (coupon.couponType == "UN") {
            // res.status(200).json({
            //     isValid:true
            // })
            validatedBody.coupon = coupon._id;
          }

          if (coupon.discountType == "Percentage") {
            let percentagePrice =
              (parseFloat(validatedBody.deliveryCharge) *
                parseFloat(coupon.discount)) /
              100;
            validatedBody.discountPrice = percentagePrice.toString();
          } else {
            if (
              parseFloat(validatedBody.deliveryCharge) <=
              parseFloat(coupon.discount)
            ) {
              validatedBody.discountPrice = parseFloat(
                validatedBody.deliveryCharge
              );
            } else {
              validatedBody.discountPrice = coupon.discount.toString();
            }
          }
        } else {
          return next(new ApiError(403, "invalid coupon"));
        }
      }

      let createdOrder = await Order.create({ ...validatedBody });
      let user = await checkExistThenGet(req.user._id, User);

      // if(validatedBody.couponNumber){
      //     await checkCouponExist(validatedBody.couponNumber, Coupon, { isDeleted: false,end:false });
      //     let coupon = await Coupon.find({isDeleted:false,end:false,couponNumber:validatedBody.couponNumber});
      //     if(coupon ){
      //         user.hasCoupon = true;
      //         user.coupon = coupon[0]._id;
      //         await user.save();
      //     }
      //     if(coupon === "undefined"){
      //         return next(new ApiError(403, ('invalid coupon')))
      //     }
      // }
      let order = await Order.populate(createdOrder, populateQuery);
      let reports = {
        action: "Create New Order",
      };
      let report = await Report.create({ ...reports, user: req.user });
      let users = await User.find({ type: "SALES-MAN" });
      users.forEach((user) => {
        //Calculate distance and check if less than distance in db send notification

        sendNotifiAndPushNotifi({
          ////////
          targetUser: user.id,
          fromUser: req.user._id,
          text: "ونا ديليفري",
          subject: createdOrder.id,
          subjectType: "هناك طلب جديد",
        });
        let notif = {
          description: req.user.username + " You have a new order",
          arabicDescription: req.user.username + " ",
        };
        Notif.create({
          ...notif,
          resource: req.user._id,
          target: user.id,
          order: createdOrder.id,
        });
      });

      // res.status(201).send(order);
      return res.send(new ApiSuccess(true, 200, "order create", order));
    } catch (err) {
      // next(err);
      return res.status(400).send(err);
    }
  },
  async addOrder(socket, data, nsp) {
    console.log(
      "<============================> Add Order <============================>"
    );
    var userId = data.userId;
    var orderData = {
      //شكل الداتا
      clientDestination: data.clientDestination,
      shopDestination: data.shopDestination,
      description: data.description,
      time: data.time,
      client: data.userId,
      createdBy: data.createdBy,
      deliveryFees: req.body.deliveryFees,
      itemTotal: req.body.itemTotal,
      tax: req.body.tax,
      total: req.body.total,
    };

    if (data.img != null) {
      orderData.img = data.img;
    }
    if (data.shopName != null) {
      orderData.shopName = data.shopName;
    }

    if (data.deliveryCharge) {
      orderData.deliveryCharge = data.deliveryCharge;
    }

    if (data.coupon) {
      let coupon = await Coupon.findOne({
        isDeleted: false,
        endDate: { $gte: Date.now() },
        code: data.coupon.toUpperCase(),
      });

      if (coupon) {
        let UserOrderQuery = {
          client: data.userId,
          status: {
            $in: [
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "DELIVERED",
            ],
          },
          isDeleted: false,
        };
        let userOrderData = await Order.find(UserOrderQuery);

        let userOrderCouponeViseQuery = {
          client: data.userId,
          status: {
            $in: [
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "DELIVERED",
            ],
          },
          coupon: coupon._id,
        };
        let couponeViseOrder = await Order.find(userOrderCouponeViseQuery);

        if (couponeViseOrder.length > coupon.reedMeCoupone) {
          return next(new ApiError(403, "invalid coupon"));
        }

        if (coupon.couponType == "NU") {
          let newUserCouponeFind = {
            client: req.user._id,
            status: {
              $in: [
                "ON_PROGRESS",
                "RECEIVED",
                "ON_THE_WAY",
                "ARRIVED",
                "DELIVERED",
              ],
            },
            coupon: { $ne: null },
          };
          let couponeNewUserOrder = await Order.find(newUserCouponeFind);

          if (couponeNewUserOrder.length > 0) {
            // return next(new ApiError(403, ('invalid coupon')))
            return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
          } else {
            orderData.coupon = coupon._id;
          }

          // if(userOrderData.length <= coupon.reedMeCoupone){
          //     // res.status(200).json({
          //     //     isValid:true
          //     // })
          //     orderData.coupon = coupon._id;
          // }else{
          //     // res.status(200).json({
          //     //     isValid:false
          //     // })
          //     return next(new ApiError(403, ('invalid coupon')))
          // }
        }
        if (coupon.couponType == "FX") {
          let query = {
            coupon: coupon._id,
            status: {
              $in: [
                "ON_PROGRESS",
                "RECEIVED",
                "ON_THE_WAY",
                "ARRIVED",
                "DELIVERED",
              ],
            },
            isDeleted: false,
          };
          let orders = await Order.find(query);

          if (orders.length <= coupon.firstX) {
            // res.status(200).json({
            //     isValid:true
            // })
            orderData.coupon = coupon._id;
          } else {
            // res.status(200).json({
            //     isValid:false
            // })
            // return next(new ApiError(403, ('invalid coupon')))
            return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
          }
        }

        if (coupon.couponType == "UN") {
          // res.status(200).json({
          //     isValid:true
          // })
          orderData.coupon = coupon._id;
        }

        if (coupon.discountType == "Percentage") {
          let percentagePrice =
            (parseFloat(data.deliveryCharge) * parseFloat(coupon.discount)) /
            100;
          orderData.discountPrice = percentagePrice.toString();
        } else {
          if (parseFloat(data.deliveryCharge) <= parseFloat(coupon.discount)) {
            orderData.discountPrice = parseFloat(
              data.deliveryCharge
            ).toString();
          } else {
            orderData.discountPrice = parseFloat(coupon.discount).toString();
          }
        }
      } else {
        // return next(new ApiError(403, ('invalid coupon')))
        return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
      }
    }

    if (data.modal != null) {
      orderData.modal = data.modal;
    }
    orderData.updateTime = Date.now();
    console.log({ orderData });
    orderData.createTime = Date.now();
    var order = new Order(orderData);
    let reports = {
      action: "Create New Order",
    };
    let report = Report.create({ ...reports, user: data.userId });
    let dept = await Debt.find({ isDeleted: false }).select("value");

    let debtValue = dept[0].value;
    order
      .save()
      .then(async (data1) => {
        await Distances.find({ _id: 1 })
          .then(async (dist) => {
            // default distance is 15 km.
            let temp_distance = 15;

            if (dist.length > 0 && dist[0].value > 0) {
              temp_distance = dist[0].value;
            } else {
              temp_distance = 15;
            }

            if (data.modal != null) {
              let value = parseInt(data.modal);
              let salesMans = await User.find({
                type: "SALES-MAN",
                notif: true,
                manufacturingYear: { $gte: value },
                debt: { $lte: debtValue },
              });
              //console.log({salesMans})
              salesMans.forEach((user) => {
                var toRoom = "room-" + user.id;
                nsp.to(toRoom).emit("newOrder", { data: data1 });

                var orderLocation = {
                  lat: data.shopDestination[0],
                  lon: data.shopDestination[1],
                };
                var userLocation = {
                  lat: user.currentLocation[0],
                  lon: user.currentLocation[1],
                };
                var OsloToBerlin = Distance.between(
                  userLocation,
                  orderLocation
                );

                // console.log('OsloToBerlin' + OsloToBerlin.human_readable());
                if (OsloToBerlin <= Distance(temp_distance + " km")) {
                  // console.log('Nice journey!');
                  sendNotifiAndPushNotifi({
                    ////////
                    targetUser: user.id,
                    fromUser: data.userId,
                    text: "ونا ديليفري",
                    subject: data1._id,
                    subjectType: "طلب جديد",
                    type: "new order",
                  });
                  let notif = {
                    description: "New order",
                    arabicDescription: "طلب جديد",
                  };
                  Notif.create({
                    ...notif,
                    resource: data.userId,
                    target: user.id,
                    order: data1._id,
                  });
                }
              });
            } else {
              //socket.emit('newOrder', {data:data1});

              let salesMans = await User.find({
                type: "SALES-MAN",
                notif: true,
                debt: { $lte: debtValue },
              });
              // console.log({salesMans})
              salesMans.forEach(async (user) => {
                var toRoom = "room-" + user.id;
                nsp.to(toRoom).emit("newOrder", { data: data1 });

                var orderLocation = {
                  lat: data.shopDestination[0],
                  lon: data.shopDestination[1],
                };
                var userLocation = {
                  lat: user.currentLocation[0],
                  lon: user.currentLocation[1],
                };
                var OsloToBerlin = Distance.between(
                  userLocation,
                  orderLocation
                );

                // console.log('OsloToBerlin ' + OsloToBerlin.human_readable());
                if (OsloToBerlin <= Distance(temp_distance + " km")) {
                  // console.log("journey else modal condction")
                  await sendNotifiAndPushNotifi({
                    ////////
                    targetUser: user.id,
                    fromUser: data.userId,
                    text: "ونا ديليفري",
                    subject: data1._id,
                    subjectType: "طلب جديد",
                    type: "new order",
                  });
                  let notif = {
                    description: "New order",
                    arabicDescription: "طلب جديد",
                  };
                  Notif.create({
                    ...notif,
                    resource: data.userId,
                    target: user.id,
                    order: data1._id,
                  });
                }
              });
            }
          })
          .catch((err) => {
            console.log({ err });
          });
        //socket.emit('newOrder', {data:data1});
      })
      .catch((err) => {
        console.log({ err });
      });
  },
  async findById(req, res, next) {
    try {
      let { orderId } = req.params;

      // res.send(
      //     await checkExistThenGet(orderId, Order, { isDeleted: false, populate: populateQuery })
      // );

      let order = await Order.findById(orderId).populate(populateQuery);

      res.send(new ApiSuccess(true, 200, "Order list", { order }));
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      String.prototype.interpolate = function(params) {
        let template = this
        for (let key in params) {
          template = template.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), params[key])
        }
        return template
      }
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);
      let getClient = await checkExistThenGet(order.client, User, { isDeleted: false })
      order.status = "CANCEL";
      if (req.body.note) {
        order.cancelNote = req.body.note;
      }

      order.cancelByUser = req.user._id;
      // sendNotifiAndPushNotifi({
      //   targetUser: order.client,
      //   fromUser: req.user._id,
      //   title:"",
      //   text: 'ونا ديليفري',
      //   subject: order.id,
      //   subjectType: 'تم إلغاء الطلب'
      // });

      let getMessageStore = await NotificationMessage.findOne({type: 'Store-Cancel',createdBy: order.createdBy,isDeleted: false});
      let sendMessageStoreEn = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
      let sendMessageStoreAr = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
      let ifSendMessaeStore = true;

      if(getMessageStore){
        let id = order._id;
        let note = req.body.note;
        
        sendMessageStoreAr = getMessageStore.arText.interpolate({id: order._id,note: req.body.note})
        sendMessageStoreEn = getMessageStore.text.interpolate({id: order._id,note: req.body.note})        
      }
      
      
      if(ifSendMessaeStore){
        await sendNotifiAndPushNotifi({
          ////////
          targetUser: order.client,
          fromUser: req.user._id,
          // title: `Your order : ${orderId} is cancel for (${req.body.note}) to store`,
          subject: orderId,
          subjectType: getClient.language && getClient.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
          type: "Store-Cancel",
          bundelID: config.iosBundelID.customerApp,
          orderID: orderId,
          orderStatus: "cancel",
        });
      }
      

      await order.save();

      return res.send(new ApiSuccess(true, 200, "order cancel", {}));
    } catch (error) {
      next(error);
    }
  },

  async accept(req, res, next) {
    try {
      let { orderId } = req.params;
      if (!orderId) {
        return next(new ApiError(403, "Orderid is required!"));
      }
      // let offer = await checkExistThenGet(offerId, Offer);
      let order = await checkExistThenGet(orderId, Order);
      if (["CANCEL"].includes(order.status) || order.isDeleted)
        next(new ApiError(400, "order should be cancel or isDeleted"));

      let salesManActiveOrder = await Order.find({
        salesMan: req.user._id,
        isDeleted: false,
        systemDeleted: false,
        systemDeletedWithoutOffer: false,
        status: { $in: ["ON_PROGRESS", "RECEIVED", "ON_THE_WAY", "ARRIVED"] },
      });

      // if(salesManActiveOrder.length > 0){
      //     return next(new ApiError(403, ('this salesman already book')));
      // }

      // if (order.offer)
      // return next(new ApiError(403, ('this order have offer')));

      // if (offer.isDeleted) {
      //     return next(new ApiError(403, ('this sales man have order accepted')));
      // }

      // let salesManOffers_ = await Offer.find({accept:true,salesMan:offer.salesMan,delivered:false});
      // console.log("SalesMan Has Active Offers "+ salesManOffers_)
      // console.log("SalesMan Has Active Offers "+ salesManOffers_ != null)
      // console.log("SalesMan Has Active Offers "+ salesManOffers_.length)
      // if (salesManOffers_.length > 0 ){
      //     return next(new ApiError(403, ('this sales man have order accepted')));
      // }
      console.log(order);
      if (order.coupon) {
        let findCoupone = await Coupon.findOne({ _id: order.coupon });

        if (findCoupone.discountType == "Percentage") {
          let percentagePrice =
            (parseFloat(order.deliveryCharge) *
              parseFloat(findCoupone.discount)) /
            100;
          order.discountPrice = percentagePrice.toString();
        } else {
          if (
            parseFloat(order.deliveryCharge) <= parseFloat(findCoupone.discount)
          ) {
            order.discountPrice = parseFloat(order.deliveryCharge).toString();
          } else {
            order.discountPrice = parseFloat(findCoupone.discount).toString();
          }
        }
        // offer.deliveryCost
        // discountPrice
      }

      order.updateTime = Date.now();
      order.status = "ON_PROGRESS";
      order.salesMan = req.user._id;
      order.accept = true;

      // order.offer = offerId;
      await order.save();

      // offer.accept = true;
      // offer.delivered = false;
      // await offer.save();

      // let salesManOffers = await Offer.find({isDeleted:false,salesMan:order.salesMan});
      // for (let salesManOffer of salesManOffers ) {
      //     salesManOffer.isDeleted = true;
      //     salesManOffer.rejected = true;
      //     salesManOffer.accept = false;
      //     salesManOffer.currentLocation = salesManOffer.currentLocation
      //     await salesManOffer.save();
      // }

      let user = await checkExistThenGet(order.salesMan, User);
      let newCount = user.tasksCount + 1;
      user.tasksCount = newCount;
      await user.save();

      // let salesMans = await Offer.find({isDeleted:false,order:order._id});
      // salesMans.forEach(salesMan => {
      //     console.log(salesMan.salesMan)
      //     if (salesMan.id == order.salesMan.id) {

      //     } else {
      //         sendNotifiAndPushNotifi({////////
      //             targetUser: salesMan.salesMan,
      //             fromUser: "ونا",
      //             text: 'ونا ديليفري',
      //             subject: order.id,
      //             subjectType: 'احد مندوبينا حصل على الطلب '
      //         });
      //         let notif = {
      //             "description":'This order will be delivered by another runner',
      //             "arabicDescription":"هذا الطلب سيتم توصيله بواسطة مندوب آخر"
      //         }
      //         Notif.create({...notif,resource:req.user._id,target:salesMan.salesMan,order:order.id});
      //     }
      // });

      sendNotifiAndPushNotifi({
        targetUser: order.client,
        fromUser: req.user._id,
        text: "ونا ديليفري",
        subject: order.id,
        subjectType: " تم قبول عرضك",
        type: "acceptOffer",
      });
      let notif = {
        description: " Your offer has been accepted",
        arabicDescription: " تم قبول عرضك",
      };
      await Notif.create({
        ...notif,
        resource: req.user._id,
        target: order.client,
        order: order.id,
      });
      res.send(order);
    } catch (error) {
      next(error);
    }
  },

  async receive(req, res, next) {
    try {
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);
      if (
        ["PENDING", "CANCEL", "ON_THE_WAY", "ARRIVED", "DELIVERED"].includes(
          order.status
        )
      )
        next(
          new ApiError(
            400,
            'status should be "ON_PROGRESS" to delete this order'
          )
        );
      order.status = "RECEIVED";
      order.updateTime = Date.now();
      await order.save();

      res.send(order);
    } catch (error) {
      next(error);
    }
  },
  async onTheWay(req, res, next) {
    try {
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);

      // if (['PENDING','CANCEL','ON_PROGRESS','ARRIVED', 'DELIVERED'].includes(order.status))
      //     next(new ApiError(400, 'status should be "RECEIVED" to delete this order'));

      order.status = "ON_THE_WAY";
      order.updateTime = Date.now();
      await order.save();
      sendNotifiAndPushNotifi({
        targetUser: order.client,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: order.id,
        subjectType: "المندوب في الطريق إليك",
      });
      let notif = {
        description: "Runner on the way",
        arabicDescription: "المندوب في الطريق إليك",
      };
      await Notif.create({
        ...notif,
        resource: req.user,
        target: order.client,
        order: order.id,
      });
      res.send(order);
    } catch (error) {
      next(error);
    }
  },
  async arrived(req, res, next) {
    try {
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);

      // if (['PENDING','CANCEL','ON_PROGRESS','RECEIVED','DELIVERED'].includes(order.status))
      //     next(new ApiError(400, 'status should be "ON_THE_WAY" to delete this order'));

      order.status = "ARRIVED";
      order.updateTime = Date.now();
      await order.save();
      console.log("save ");
      sendNotifiAndPushNotifi({
        targetUser: order.client,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: order.id,
        subjectType: "مندوبنا وصل اليك",
      });
      let notif = {
        description: "Runner arrived",
        arabicDescription: "المندوب وصل إلى الموقع",
        //"المندوب وصل إلى الموقع " + req.user.username
      };

      await Notif.create({
        ...notif,
        resource: req.user,
        target: order.client,
        order: order.id,
      });
      let user = await checkExistThenGet(order.client, User);

      // sendNotifiAndPushNotifi({
      //     targetUser: order.client,
      //     fromUser: "ونا",
      //     text: 'ونا ديليفري',
      //     subject: order.id,
      //     subjectType: user.addBalance +' اضيف الى حسابك'
      // });
      // let notiff = {
      //     "description": user.addBalance +' ',
      //     "arabicDescription": user.balance + " إلى حسابك رصيدك الحالي هو "+ user.addBalance +" تم إضافة "
      // }
      // await Notif.create({...notiff,resource:req.user,target:order.client,order:order.id});
      res.send(order);
    } catch (error) {
      next(error);
    }
  },
  async delivered(req, res, next) {
    try {
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);

      // if (['PENDING','CANCEL','ON_PROGRESS','RECEIVED','ON_THE_WAY'].includes(order.status))
      //     next(new ApiError(400, 'status should be "ARRIVED" to delete this order'));

      order.status = "DELIVERED";
      order.updateTime = Date.now();
      await order.save();
      let user = await checkExistThenGet(req.user._id, User);
      user.hasCoupon = false;
      await user.save();
      sendNotifiAndPushNotifi({
        targetUser: order.client,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: order.id,
        subjectType: "تم توصيل طلبك",
      });
      let notif = {
        description: "Your order has been delivered ",
        arabicDescription: " تم توصيل طلبك ",
      };
      await Notif.create({
        ...notif,
        resource: req.user,
        target: order.client,
        order: order.id,
      });
      let reports = {
        action: "Order Deliverd",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.send(order);
    } catch (error) {
      next(error);
    }
  },

  async OrderUpdateStatus(req, res, next) {
    try {
      let { orderId } = req.params;
      if (!orderId) {
        // return next(new ApiError(403, ('Orderid is required!')));
        return res.send(new ApiSuccess(false, 400, "Orderid is required", {}));
      }
      // let offer = await checkExistThenGet(offerId, Offer);
      let order = await checkExistThenGet(orderId, Order);
      console.log({ order });
      let OrderStatus = req.body.status;
      if (OrderStatus === "ACCEPT") {
        if (["CANCEL"].includes(order.status) || order.isDeleted) {
          // next(new ApiError(400, 'order should be cancel or isDeleted'));
          return res.send(
            new ApiSuccess(
              false,
              400,
              "order should be cancel or isDeleted",
              {}
            )
          );
        }

        let salesManActiveOrder = await Order.find({
          salesMan: req.user._id,
          isDeleted: false,
          systemDeleted: false,
          systemDeletedWithoutOffer: false,
          status: { $in: ["ON_PROGRESS", "RECEIVED", "ON_THE_WAY", "ARRIVED"] },
        });

        if (order.coupon) {
          let findCoupone = await Coupon.findOne({ _id: order.coupon });

          if (findCoupone.discountType == "Percentage") {
            let percentagePrice =
              (parseFloat(order.deliveryCharge) *
                parseFloat(findCoupone.discount)) /
              100;
            order.discountPrice = percentagePrice.toString();
          } else {
            if (
              parseFloat(order.deliveryCharge) <=
              parseFloat(findCoupone.discount)
            ) {
              order.discountPrice = parseFloat(order.deliveryCharge).toString();
            } else {
              order.discountPrice = parseFloat(findCoupone.discount).toString();
            }
          }
        }

        order.updateTime = Date.now();
        order.status = "ON_PROGRESS";
        order.salesMan = req.user._id;
        order.accept = true;

        await order.save();

        let user = await checkExistThenGet(order.salesMan, User);
        let newCount = user.tasksCount + 1;
        user.tasksCount = newCount;
        await user.save();

        sendNotifiAndPushNotifi({
          targetUser: order.client,
          fromUser: req.user._id,
          text: "ونا ديليفري",
          subject: order.id,
          subjectType: " تم قبول عرضك",
          type: "acceptOffer",
        });
        let notif = {
          description: " Your offer has been accepted",
          arabicDescription: " تم قبول عرضك",
        };
        await Notif.create({
          ...notif,
          resource: req.user._id,
          target: order.client,
          order: order.id,
        });
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "RECEIVED") {
        if (
          ["PENDING", "CANCEL", "ON_THE_WAY", "ARRIVED", "DELIVERED"].includes(
            order.status
          )
        ) {
          return res.send(
            new ApiSuccess(
              false,
              400,
              'status should be "ON_PROGRESS" to delete this order',
              {}
            )
          );
        }

        order.status = "RECEIVED";
        order.updateTime = Date.now();
        await order.save();

        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "ON_THE_WAY") {
        order.status = "ON_THE_WAY";
        order.updateTime = Date.now();
        await order.save();
        sendNotifiAndPushNotifi({
          targetUser: order.client,
          fromUser: req.user,
          text: "ونا ديليفري",
          subject: order.id,
          subjectType: "المندوب في الطريق إليك",
        });
        let notif = {
          description: "Runner on the way",
          arabicDescription: "المندوب في الطريق إليك",
        };
        await Notif.create({
          ...notif,
          resource: req.user,
          target: order.client,
          order: order.id,
        });
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "ARRIVED") {
        order.status = "ARRIVED";
        order.updateTime = Date.now();
        await order.save();
        console.log("save ");
        sendNotifiAndPushNotifi({
          targetUser: order.client,
          fromUser: req.user,
          text: "ونا ديليفري",
          subject: order.id,
          subjectType: "مندوبنا وصل اليك",
        });
        let notif = {
          description: "Runner arrived",
          arabicDescription: "المندوب وصل إلى الموقع",
          //"المندوب وصل إلى الموقع " + req.user.username
        };

        await Notif.create({
          ...notif,
          resource: req.user,
          target: order.client,
          order: order.id,
        });
        let user = await checkExistThenGet(order.client, User);

        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "DELIVERED") {
        order.status = "DELIVERED";
        order.updateTime = Date.now();
        await order.save();
        let user = await checkExistThenGet(req.user._id, User);
        user.hasCoupon = false;
        await user.save();
        sendNotifiAndPushNotifi({
          targetUser: order.client,
          fromUser: req.user,
          text: "ونا ديليفري",
          subject: order.id,
          subjectType: "تم توصيل طلبك",
        });
        let notif = {
          description: "Your order has been delivered ",
          arabicDescription: " تم توصيل طلبك ",
        };
        await Notif.create({
          ...notif,
          resource: req.user,
          target: order.client,
          order: order.id,
        });
        let reports = {
          action: "Order Deliverd",
        };
        let report = await Report.create({ ...reports, user: req.user });
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else {
        return res.send(new ApiSuccess(false, 400, "status not valid", {}));
      }
    } catch (err) {
      return res.send(new ApiSuccess(false, 400, "Order Not Found", {}));
    }
  },
  async rate(req, res, next) {
    try {
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);
      order.rate = req.body.rate;
      order.rateText = req.body.rateText;
      await order.save();

      let sales_rate = await Order.aggregate([
        {
          $match: {
            $and: [{ salesMan: order.salesMan }, { rate: { $exists: true } }],
          },
        },
        {
          $group: {
            _id: "$salesMan",
            totalRate: { $sum: "$rate" },
            count: { $sum: 1 },
          },
        },
      ]);

      let user = await checkExistThenGet(order.salesMan, User);
      let newRate = sales_rate[0].totalRate;
      //let newRate = user.rate + req.body.rate;
      user.rate = newRate;
      let newTasksCount = sales_rate[0].count;
      user.tasksCount = newTasksCount;

      let totalDegree = user.tasksCount * 5; //عدد التاسكات فى الدرجه النهائيه
      // console.log(totalDegree)
      let degree = newRate * 100;
      // console.log(degree)
      user.ratePercent = degree / totalDegree;
      let rateFrom5 = user.ratePercent / 20;
      user.rateFrom5 = Math.ceil(rateFrom5);
      await user.save();
      sendNotifiAndPushNotifi({
        targetUser: order.salesMan,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: order.id,
        subjectType: "تم تقييم خدمتك",
      });
      let notif = {
        description: "User rate your service",
        arabicDescription: "تم تقييم خدمتك",
      };
      await Notif.create({
        ...notif,
        resource: req.user,
        target: order.salesMan,
        order: order.id,
      });
      res.send(order);
    } catch (error) {
      next(error);
    }
  },
  async payFromBalance(req, res, next) {
    try {
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);
      order.paidFromBalance = true;
      await order.save();
      let client = await checkExistThenGet(order.client, User);
      let bill = await checkExistThenGet(order.bill, Bill);
      let newBalance = client.balance - Math.floor(client.balance);

      let reduceBalance = Math.floor(client.balance);
      let paidFromBill = bill.paidCost - Math.floor(client.balance);

      client.balance = newBalance;
      await client.save();

      sendNotifiAndPushNotifi({
        targetUser: order.client,
        fromUser: "ونا",
        text: "ونا ديليفري",
        subject: order.id,
        subjectType: reduceBalance + " خصم من رصيدك",
      });
      let notif = {
        description: reduceBalance + " take from your balance",
        arabicDescription:
          newBalance + " من رصيدك، رصيدك الحالي هو" + reduceBalance + "  ",
      };
      await Notif.create({
        ...notif,
        resource: req.user,
        target: order.client,
        order: order.id,
      });
      let user = await checkExistThenGet(req.user._id, User);
      let newSBalance = user.balance + Math.floor(client.balance);
      user.balance = newSBalance;
      await user.save();

      sendNotifiAndPushNotifi({
        targetUser: req.user,
        fromUser: "ونا",
        text: "new notification",
        subject: order.id,
        subjectType: reduceBalance + " اضيف الى رصيدك",
      });
      let notiff = {
        description: reduceBalance + " ",
        arabicDescription:
          newSBalance +
          " إلى حسابك رصيدك الحالي هو " +
          reduceBalance +
          " تم إضافة ",
      };
      await Notif.create({
        ...notiff,
        resource: order.client,
        target: req.user,
        order: order.id,
      });

      res.status(200).send({
        paidFromBill: paidFromBill,
      });
    } catch (err) {
      next(err);
    }
  },
  async delete(req, res, next) {
    try {
      let { orderId } = req.params;
      let order = await checkExistThenGet(orderId, Order);

      order.isDeleted = true;
      await order.save();
      let reports = {
        action: "Delete Order",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async uploadImage(req, res, next) {
    try {
      let image = await handleImg(req);
      // console.log(req.file)
      // console.log(image)

      res.send(image);
    } catch (error) {
      next(error);
    }
  },
  async checkCoupon(req, res, next) {
    try {
      let user = await checkExistThenGet(req.user._id, User);
      await checkCouponExist(req.body.couponNumber, Coupon, {
        isDeleted: false,
        end: false,
      });

      let coupon = await Coupon.find({
        isDeleted: false,
        end: false,
        couponNumber: req.body.couponNumber,
      });
      // console.log(coupon)
      if (coupon) {
        user.hasCoupon = true;
        user.coupon = coupon[0]._id;
        await user.save();
      }

      res.send(coupon);
    } catch (error) {
      next(error);
    }
  },
  async checkDistance(req, res, next) {
    try {
      let distance = await Distance.find({ isDeleted: false });
      // console.log(distance)
      if (distance) {
      }

      res.send(distance);
    } catch (error) {
      next(error);
    }
  },
  async checkActive(nsp, data) {
    var userId = data.userId;
    var toRoom = "room-" + userId;
    // console.log(toRoom)
    let dept = await Debt.find({ isDeleted: false }).select("value");
    // console.log(dept)
    let debtValue = dept[0].value;
    let user = await checkExistThenGet(data.userId, User);
    if (user.debt < debtValue) {
      nsp
        .to(toRoom)
        .emit("active", { myuser: user, message: "you are active" });
    } else {
      nsp.to(toRoom).emit("active", {
        myuser: user,
        message: "you are dis-active please pay your dept ",
      });
    }
    if (user.block == true) {
      nsp
        .to(toRoom)
        .emit("active", { myuser: user, message: "you are blocked" });
    }
    if (user.isDeleted == true) {
      nsp
        .to(toRoom)
        .emit("active", { myuser: user, message: "you are  isDeleted" });
    }
    if (user.block == false) {
      nsp
        .to(toRoom)
        .emit("active", { myuser: user, message: "you are not blocked" });
    }
  },

  async filterOrders(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        //   { status, client, salesMan, accept } = req.query,
        query = { isDeleted: false };

      const today_start = moment().startOf("day");
      const today_end = moment().endOf("day");

      if (req.query.filterType === "day") {
        query = {
          ...query,
          createdAt: {
            $gte: today_start.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "yesterday") {
        const y_start = moment().subtract(1, "d").startOf("day");
        const y_end = moment().subtract(1, "d").endOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: y_start.toDate(),
            $lte: y_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "week") {
        const last_week = moment().subtract(7, "d").endOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: last_week.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "month") {
        const last_month = moment(today_end)
          .subtract(1, "months")
          .endOf("month")
          .endOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: last_month.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "year") {
        const last_year = moment()
          .subtract(1, "years")
          .endOf("week")
          .startOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: last_year.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }

      let orders = await Order.find(query)
        .populate(populateQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const ordersCount = await Order.count(query);
      const pageCount = Math.ceil(ordersCount / limit);

      res.send(
        new ApiResponse(orders, page, pageCount, limit, ordersCount, req)
      );
    } catch (err) {
      next(err);
    }
  },

  async orederIsInProgress(req, res, next) {
    let client = req.user._id || 81;

    let query = {
      client: client,
      status: {
        $in: ["PENDING", "ON_PROGRESS", "RECEIVED", "ON_THE_WAY", "ARRIVED"],
      },
      storeID: null,
      isDeleted: false,
    };
    let findOrder = await Order.find(query);

    let isOrderInProgress = false;
    if (findOrder.length > 0) {
      isOrderInProgress = true;
    }

    res.status(200).json({ isOrderInProgress });
  },
  async deliveredByAdmin(req, res, next) {
    try {
      let { orderId } = req.params;

      let order = await checkExistThenGet(orderId, Order);

      if (["PENDING", "DELIVERED", "CANCEL"].includes(order.status)) {
        next(ApiError(400, 'status should be "ARRIVED" to delete this order'));
      }

      order.status = "DELIVERED";

      await order.save();
      let user = await checkExistThenGet(order.salesMan, User);
      user.hasCoupon = false;
      await user.save();
      sendNotifiAndPushNotifi({
        targetUser: order.client,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: order.id,
        subjectType: "تم توصيل طلبك",
      });
      let notif = {
        description: "Your order has been delivered ",
        arabicDescription: " تم توصيل طلبك ",
      };
      await Notif.create({
        ...notif,
        resource: req.user,
        target: order.client,
        order: order.id,
      });
      let reports = {
        action: "Order Deliverd",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.send(order);
    } catch (error) {
      next(error);
    }
  },
  async systemDeleteOrder(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { ifWithoutOffer, city } = req.query,
        query = {};
      console.log({ ifWithoutOffer });
      if (ifWithoutOffer === "true") {
        query.systemDeletedWithoutOffer = true;
      }

      if (ifWithoutOffer === "false") {
        query.systemDeleted = true;
      }
      let orders = await Order.find(query)
        .populate(populateQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      if (city) orders = orders.filter((order) => order.client.city === city);
      const ordersCount = await Order.count(query);
      const pageCount = Math.ceil(ordersCount / limit);

      res.send(
        new ApiResponse(orders, page, pageCount, limit, ordersCount, req)
      );
    } catch (error) {
      next(error);
    }
  },

  async applingCouponOrder(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { status, client, salesMan, accept, city } = req.query,
        query = {
          isDeleted: false,
          coupon: { $ne: null },
          status: "DELIVERED",
        };

      let orders = await Order.find(query)
        .populate(populateQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
      if (city) orders = orders.filter((order) => order.client.city === city);
      const ordersCount = await Order.count(query);
      const pageCount = Math.ceil(ordersCount / limit);

      await Order.aggregate(
        [
          {
            $match: {
              coupon: { $ne: null },
              isDeleted: false,
              status: "DELIVERED",
            },
          },
          {
            $group: {
              _id: null,
              totalPrice: {
                $sum: "$discountPrice",
              },
            },
          },
        ],
        function (err, result) {
          if (err) {
            console.log({ err });
            // res.send(err);
          } else {
            console.log({ result });
            // res.json(result);
            res.send(
              new ApiResponse(
                { orders, total: result },
                page,
                pageCount,
                limit,
                ordersCount,
                req
              )
            );
          }
        }
      );
    } catch (e) {}
  },

  async addItemOrder(req, res, next) {
    if (!req.body.storeID) {
      // return next(new ApiError(400, 'storeID is required'));
      return res.send(new ApiSuccess(false, 400, "storeID is required", {}));
    }
    if (!req.body.storeAddress) {
      // return next(new ApiError(400, 'storeID is required'));
      return res.send(
        new ApiSuccess(false, 400, "Store address is required", {})
      );
    }

    if (!req.body.items) {
      // return next(new ApiError(400, 'items is required'));
      return res.send(new ApiSuccess(false, 400, "items is required", {}));
    }

    if (!req.body.paymentType) {
      // return next(new ApiError(400, 'items is required'));
      return res.send(
        new ApiSuccess(false, 400, "paymentType is required", {})
      );
    }

    for (let i = 0; i < req.body.items.length; i++) {
      if (!req.body.items[i].itemID) {
        // return next(new ApiError(400, 'itemID is required'));
        return res.send(new ApiSuccess(false, 400, "itemID is required", {}));
      }
      if (!req.body.items[i].itemQuantity) {
        // return next(new ApiError(400, 'itemQuantity is required'));
        return res.send(
          new ApiSuccess(false, 400, "itemQuantity is required", {})
        );
      }
      if (!req.body.items[i].totalItemPrice) {
        // return next(new ApiError(400, 'totalItemPrice is required'));
        return res.send(
          new ApiSuccess(false, 400, "totalItemPrice is required", {})
        );
      }
    }

    let deleveryCharge = parseFloat(req.body.deliveryFees);
    let orderSetting = await OrdersSettings.findOne({
      createdBy: req.body.createdBy,
    });
    // console.log({orderSetting})
    let adminEarnByDriver = 0;
    let driverEarnByOrderDelevery = 0;
    let adminCommsionByDriver = 0;
    if (orderSetting && orderSetting.driverOrderCommision) {
      // driverOrderCommision
      adminCommsionByDriver = orderSetting.driverOrderCommision;
      adminEarnByDriver =
        (deleveryCharge * parseFloat(orderSetting.driverOrderCommision)) / 100;
      driverEarnByOrderDelevery = deleveryCharge - adminEarnByDriver.toFixed(2);
    }

    let storeData = await checkExistThenGet(req.body.storeID, Store, {
      isDeleted: false,
    });

    let adminCommisionEarnByStore = 0;
    let storeEarn = 0;
    if (
      storeData.adminCommisionType === "flat" ||
      storeData.adminCommisionType === "f"
    ) {
      if (req.body.itemTotal) {
        adminCommisionEarnByStore = parseFloat(storeData.adminCommission);
        storeEarn =
          parseFloat(req.body.itemTotal) -
          parseFloat(storeData.adminCommission);
      }
    } else {
      if (req.body.itemTotal) {
        adminCommisionEarnByStore =
          (parseFloat(req.body.itemTotal) *
            parseFloat(storeData.adminCommission)) /
          100;
        storeEarn =
          parseFloat(req.body.itemTotal) - adminCommisionEarnByStore.toFixed(2);
      }
    }

    const clientDestinationLoc = req.body.clientDestination;
    const shopDestinationLoc = req.body.shopDestination;

    var orderData = {
      //شكل الداتا
      clientDestination: [...clientDestinationLoc],
      shopDestination: [...shopDestinationLoc],
      clientLocation: {
        type: "Point",
        coordinates: req.body.clientDestination.reverse(),
      },
      shopLocation: {
        type: "Point",
        coordinates: req.body.shopDestination.reverse(),
      },
      clientAddress: req.body.clientAddress,
      description: req.body.description,
      time: req.body.time,
      client: req.user._id,
      // storeItemID: req.body.storeItemID,
      // itemQuantity: req.body.itemQuantity,
      storeID: req.body.storeID,
      updateTime: Date.now(),
      createdBy: req.body.createdBy,
      storeAddress: req.body.storeAddress,
      deliveryFees: parseFloat(req.body.deliveryFees),
      itemTotal: req.body.itemTotal,
      vatPrice: req.body.tax,
      total: req.body.total,
      adminCommisionTypeStore: storeData.adminCommisionType,
      adminCommissionStore: storeData.adminCommission,
      vatPercentage: storeData.vat,
      adminCommisionDriver: adminCommsionByDriver,
      driverEarn: driverEarnByOrderDelevery,
      adminCommisionEarnByDrive: adminEarnByDriver,
      adminCommisionEarnByStore: adminCommisionEarnByStore,
      storeEarn: storeEarn,
      deviceType: req.body.deviceType,
      deviceVersion: req.body.deviceVersion,
      couponePrice: req.body.couponePrice,
      paymentType: req.body.paymentType ? req.body.paymentType : "cod",
      storeDeliveryType: storeData.deliveryFees
        ? storeData.deliveryFees
        : "paid",
      storeDeliveryPrice: req.body.storeDeliveryPrice,
      store_note: req.body.store_note
    };

    if (req.body.shopName) {
      orderData.shopName = req.body.shopName;
    }

    if (req.body.coupon) {
      let coupon = await Coupon.findOne({
        isDeleted: false,
        endDate: { $gte: Date.now() },
        code: req.body.coupon.toUpperCase(),
        createdBy: req.body.createdBy,
      });
      console.log({ coupon });
      if (coupon) {
        let UserOrderQuery = {
          client: orderData.client,
          status: {
            $in: [
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "DELIVERED",
            ],
          },
          isDeleted: false,
        };
        let userOrderData = await Order.find(UserOrderQuery);

        let userOrderCouponeViseQuery = {
          client: orderData.client,
          status: {
            $in: [
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "DELIVERED",
            ],
          },
          coupon: coupon._id,
        };
        let couponeViseOrder = await Order.find(userOrderCouponeViseQuery);

        if (couponeViseOrder.length > coupon.reedMeCoupone) {
          // return next(new ApiError(403, ('invalid coupon')))
          return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
        }

        if (coupon.couponType == "NU") {
          let newUserCouponeFind = {
            client: orderData.client,
            status: {
              $in: [
                "ON_PROGRESS",
                "RECEIVED",
                "ON_THE_WAY",
                "ARRIVED",
                "DELIVERED",
              ],
            },
            coupon: { $ne: null },
          };
          let couponeNewUserOrder = await Order.find(newUserCouponeFind);

          if (couponeNewUserOrder.length > 0) {
            // return next(new ApiError(403, ('invalid coupon')))
            return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
          } else {
            orderData.coupon = coupon._id;
          }
        }
        if (coupon.couponType == "FX") {
          let query = {
            coupon: coupon._id,
            status: {
              $in: [
                "ON_PROGRESS",
                "RECEIVED",
                "ON_THE_WAY",
                "ARRIVED",
                "DELIVERED",
              ],
            },
            isDeleted: false,
          };
          let orders = await Order.find(query);

          if (orders.length <= coupon.firstX) {
            // res.status(200).json({
            //     isValid:true
            // })
            orderData.coupon = coupon._id;
          } else {
            // res.status(200).json({
            //     isValid:false
            // })
            // return next(new ApiError(403, ('invalid coupon')))
            return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
          }
        }

        if (coupon.couponType == "UN") {
          // res.status(200).json({
          //     isValid:true
          // })
          orderData.coupon = coupon._id;
        }

        // let findCoupone = await Coupon.findOne({_id:order.coupon});

        // if(coupon.discountType == "Percentage"){
        //     let percentagePrice = (parseFloat(coupon.discount))/100;
        //     orderData.discountPrice = percentagePrice.toFixed(2);
        // }else {
        //     orderData.discountPrice = parseFloat(coupon.discount).toFixed(2);
        // }

        // console.log(orderData.discountPrice)
      } else {
        // return next(new ApiError(403, ('invalid coupon')))
        return res.send(new ApiSuccess(false, 400, "invalid coupon", {}));
      }
    }

    if (req.body.modal != null) {
      orderData.modal = req.body.modal;
    }

    orderData.createTime = Date.now();
    if (orderData.paymentType == "online") {
      orderData.status = "PAYMENT_PENDING";
    }

    console.log({ orderData });
    var order = new Order(orderData);

    let reports = {
      action: "Create New Order",
    };
    let report = Report.create({ ...reports, user: orderData.client });

    order
      .save()
      .then(async (data1) => {
        for (let i = 0; i < req.body.items.length; i++) {
          let data = {
            orderID: data1._id,
            storeID: req.body.storeID,
            itemID: req.body.items[i].itemID,
            itemQuantity: req.body.items[i].itemQuantity,
            itemTotalPrice: req.body.items[i].totalItemPrice.toString(),
          };
          await orderItem.create(data);
        }

        if (orderData.paymentType == "cod") {
          let findUsers = await User.find({
            createdBy: orderData.createdBy,
            storeAddress: orderData.storeAddress,
            isDeleted: false,
          });

          let getMessage = await NotificationMessage.findOne({type: 'StoreNewOrder',createdBy: req.body.createdBy,isDeleted: false});
          let sendMessageEN = 'New Order Request';
          let sendMessageAR = 'New Order Request'
          let ifSendMessae = true;
          if(getMessage){
            sendMessageAR = getMessage.arText;
            sendMessageEN = getMessage.text;
            ifSendMessae = getMessage.isNotify
          }
          
          findUsers.forEach((user) => {

            if (user.isNotification && ifSendMessae) {
              sendNotifiAndPushNotifi({
                ////////
                targetUser: user._id,
                fromUser: orderData.client,
                text: user.language && user.language == 'ar' ? sendMessageAR:sendMessageEN,
                subject: data1._id,
                subjectType: user.language && user.language == 'ar' ? sendMessageAR:sendMessageEN,
                type: "StoreNewOrder",
                new: true,
                bundelID: config.iosBundelID.storeApp,
              });
              // let notif = {
              //   description: "You have new order",
              //   arabicDescription: "لديك طلب جديد",
              // };
              // Notif.create({
              //   ...notif,
              //   resource: orderData.client,
              //   target: user._id,
              //   order: data1._id,
              // });
            }
          });
        }

        // res.status(201).send(data1);
        return res.send(new ApiSuccess(true, 200, "store create", data1));
      })
      .catch((err) => {
        console.log({ err });
        next(err);
      });
  },

  async OrderPaymentStatus(req, res) {
    try {
      let { orderId } = req.params;

      let order = await checkExistThenGet(orderId, Order, { isDeleted: false });

      order.status = "PENDING";
      await order.save();
      let findUsers = await User.find({
        createdBy: order.createdBy,
        storeAddress: order.storeAddress,
        isDeleted: false,
      });
      let paymentTransactionData = {
        orderID: orderId,
        transactionId: req.body.transactionId,
        amount: req.body.amount ? req.body.amount : order.total,
        currency: req.body.currency,
      };
      let paymentTransaction = new PaymentTransaction(paymentTransactionData);
      await paymentTransaction.save();

      let getMessage = await NotificationMessage.findOne({type: 'StoreNewOrder',createdBy: order.createdBy,isDeleted: false});
      let sendMessageEN = 'New Order Request';
      let sendMessageAR = 'New Order Request';
      let ifSendMessae = true;
      if(getMessage){
        sendMessageAR = getMessage.arText;
        sendMessageEN = getMessage.text;
        ifSendMessae = getMessage.isNotify
      }
      

      findUsers.forEach((user) => {
        if (user.isNotification && ifSendMessae) {
          sendNotifiAndPushNotifi({
            ////////
            targetUser: user._id,
            fromUser: order.client,
            text: user.language && user.language == 'ar' ? sendMessageAR : sendMessageEN,
            subject: order._id,
            subjectType: user.language && user.language == 'ar' ? sendMessageAR : sendMessageEN,
            type: "StoreNewOrder",
            new: true,
            bundelID: config.iosBundelID.storeApp,
          });
          // let notif = {
          //   description: "You have new order",
          //   arabicDescription: "لديك طلب جديد",
          // };
          // Notif.create({
          //   ...notif,
          //   resource: order.client,
          //   target: user._id,
          //   order: order._id,
          // });
        }
      });

      return res.send(new ApiSuccess(true, 200, "store status update", order));
    } catch (e) {
      console.log({ e });
      return res.send(new ApiSuccess(false, 400, "store", e));
    }
  },
  async acceptStoreUserOrder(req, res, next) {
    try {
      let { orderId } = req.params;
      let orderData = await checkExistThenGet(orderId, Order, {
        isDeleted: false,
        status: "PENDING",
      });
      console.log({ orderData });
      var order = new Order(orderData);
      order.storeUser = req.user._id;
      order.status = "ACCEPT";
      order.updateTime = Date.now();
      order.save();
      // res.send(order);
      return res.send(new ApiSuccess(true, 200, "order accept", order));
    } catch (err) {
      console.log({ err });
      next(err);
    }
  },
  async readyStoreOrder(req, res, next) {
    try {
      let { orderId } = req.params;
      let orderData = await checkExistThenGet(orderId, Order, {
        isDeleted: false,
        status: "ACCEPT",
      });
      console.log({ orderData });
      var order = new Order(orderData);
      order.status = "READY_FOR_DELIVER";
      order.updateTime = Date.now();

      order.save().then(async (data1) => {
        await Distances.find({ _id: 1 })
          .then(async (dist) => {
            // default distance is 15 km.
            let temp_distance = 15;

            if (dist.length > 0 && dist[0].value > 0) {
              temp_distance = dist[0].value;
            } else {
              temp_distance = 15;
            }
            let dept = await Debt.find({ isDeleted: false }).select("value");
            let debtValue = dept[0].value;

            let salesMans = await User.find({
              type: "SALES-MAN",
              notif: true,
              debt: { $lte: debtValue },
            });
            //console.log({salesMans})
            salesMans.forEach((user) => {
              var orderLocation = {
                lat: order.shopDestination[0],
                lon: order.shopDestination[1],
              };
              var userLocation = {
                lat: user.currentLocation[0],
                lon: user.currentLocation[1],
              };
              var OsloToBerlin = Distance.between(userLocation, orderLocation);

              // console.log('OsloToBerlin' + OsloToBerlin.human_readable());
              if (OsloToBerlin <= Distance(temp_distance + " km")) {
                // console.log('Nice journey!');
                sendNotifiAndPushNotifi({
                  ////////
                  targetUser: user.id,
                  fromUser: req.user._id,
                  text: "ونا ديليفري",
                  subject: data1._id,
                  subjectType: "طلب جديد",
                  type: "new order",
                });
                let notif = {
                  description: "New order",
                  arabicDescription: "طلب جديد",
                };
                Notif.create({
                  ...notif,
                  resource: req.user._id,
                  target: user.id,
                  order: data1._id,
                });
              }
            });
          })
          .catch((err) => {
            console.log({ err });
            next(err);
          });
        //socket.emit('newOrder', {data:data1});
      });
      // res.send(order);
    } catch (err) {
      console.log({ err });
      next(err);
    }
  },

  async acceptItemDriver(req, res, next) {
    try {
      let { orderId } = req.params;
      // let offer = await checkExistThenGet(offerId, Offer);
      let order = await checkExistThenGet(orderId, Order);
      let salesManActiveOrder = await Order.find({
        salesMan: req.user._id,
        isDeleted: false,
        systemDeleted: false,
        systemDeletedWithoutOffer: false,
        status: {
          $in: [
            "ON_PROGRESS",
            "RECEIVED",
            "ON_THE_WAY",
            "ARRIVED",
            "READY_FOR_DELIVER",
          ],
        },
      });

      if (salesManActiveOrder.length > 0) {
        return next(new ApiError(403, "this salesman already book"));
      }
      if (order.offer) return next(new ApiError(403, "this order have offer"));

      // if (offer.isDeleted) {
      //     return next(new ApiError(403, ('this sales man have order accepted')));
      // }

      let salesManOffers_ = await Offer.find({
        accept: true,
        salesMan: req.user._id,
        delivered: false,
      });
      // console.log("SalesMan Has Active Offers "+ salesManOffers_)
      // console.log("SalesMan Has Active Offers "+ salesManOffers_ != null)
      // console.log("SalesMan Has Active Offers "+ salesManOffers_.length)
      if (salesManOffers_.length > 0) {
        return next(new ApiError(403, "this sales man have order accepted"));
      }

      if (order.coupon) {
        let findCoupone = await Coupon.findOne({ _id: order.coupon });

        if (findCoupone.discountType == "Percentage") {
          let percentagePrice =
            (offer.deliveryCost * parseFloat(findCoupone.discount)) / 100;
          order.discountPrice = percentagePrice.toString();
        } else {
          if (offer.deliveryCost <= parseFloat(findCoupone.discount)) {
            order.discountPrice = offer.deliveryCost.toString();
          } else {
            order.discountPrice = parseFloat(findCoupone.discount).toString();
          }
        }
        // offer.deliveryCost
        // discountPrice
      }
      order.status = "ON_PROGRESS";
      order.updateTime = Date.now();
      order.salesMan = req.user._id;
      order.accept = true;

      // order.offer = offerId;
      await order.save();

      // offer.accept = true;
      // offer.delivered = false;
      // await offer.save();

      let user = await checkExistThenGet(order.salesMan, User);
      let newCount = user.tasksCount + 1;
      user.tasksCount = newCount;
      await user.save();

      sendNotifiAndPushNotifi({
        targetUser: order.client,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: orderId,
        subjectType: " تم قبول عرضك",
        type: "acceptStoreOrder",
      });
      let notif = {
        description: " Your order has been accepted",
        arabicDescription: " تم قبول عرضك",
      };
      await Notif.create({
        ...notif,
        resource: req.user,
        target: order.client,
        order: orderId,
      });
      res.send(order);
    } catch (error) {
      next(error);
    }
  },

  async itemOrderList(req, res, next) {
    // req.user._id
    let page = req.query.page || 1;
    let limit = +req.query.limit || 20;

    let storeUsers = await User.find({
      _id: req.user._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    if (storeUsers.length > 0) {
      let storeIDS = [];
      let storeAddress = [];
      for (let i = 0; i < storeUsers.length; i++) {
        storeIDS.push(storeUsers[i].store);
        if (storeUsers[i].storeAddress) {
          storeAddress.push(storeUsers[i].storeAddress);
        }
        // storeAddress.push(storeUsers[i].storeAddress)
      }

      let findData = { isDeleted: false, storeID: { $in: storeIDS } };
      if (storeAddress.length > 0) {
        findData.storeAddress = { $in: storeAddress };
      }
      console.log(findData);
      let { status } = req.query;

      if (status === "PENDING") {
        // let getRejectOrder = await RejectStoreOrder.find({isDeleted:false,storeUser: req.user._id});
        // let rejectOrder = []
        // for(let i=0;i<getRejectOrder.length;i++) {
        //     rejectOrder.push(getRejectOrder[i].orderID)
        // }

        findData.status = "PENDING";
        // findData._id = {$nin: rejectOrder}
      }

      if (status === "ACCEPT") {
        findData.status = "ACCEPT";
        // findData.storeUser = req.user._id;
      }

      if (status === "READY_FOR_DELIVER") {
        findData.status = { $in: ["READY_FOR_DELIVER", "ON_PROGRESS"] };
        // findData.storeUser = req.user._id;
      }

      if (status === "ON_THE_WAY") {
        findData.status = { $in: ["RECEIVED", "ON_THE_WAY", "ARRIVED"] };
        // findData.storeUser = req.user._id;
      }

      if (status === "DELIVERED") {
        findData.status = "DELIVERED";
        // findData.storeUser = req.user._id;
      }

      if (status === "CANCEL") {
        findData.status = "CANCEL";
        // findData.storeUser = req.user._id;
      }

      let findOrdes = await Order.find(findData)
        .populate([
          { path: "storeID", model: "store" },
          { path: "items", model: "orderItem" },
          { path: "client", model: "user" },
          { path: "salesMan", model: "user" },
          { path: "storeAddress", model: "storeAddress" },
          { path: "clientAddress", model: "address" },
          { path: "cancelByUser", model: "user" },
        ])
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      let orderItemFind = await orderItem
        .find({ storeID: { $in: storeIDS } })
        .populate([{ path: "itemID", modal: "storeItem" }]);


      let findAverageSalesmenRating = await Rating.aggregate([
        {
          $match: {
            ratingToWhom: "D",
          },
        },
        {
          $group: {
            _id: "$driverID",
            average_rating: { $avg: "$ratings" },
          },
        },
      ]);

      let orderData = [];
      for (let i = 0; i < findOrdes.length; i++) {
        if(findOrdes[i].salesMan){
          orderData.push({
            ...findOrdes[i]._doc,
            items: [],
            id: findOrdes[i]._doc._id,
            salesMan: {...findOrdes[i]._doc.salesMan._doc,average_rating: 0}
          });
        } else {
          orderData.push({
            ...findOrdes[i]._doc,
            items: [],
            id: findOrdes[i]._doc._id            
          });
        }
       

        for (let j = 0; j < orderItemFind.length; j++) {
          if (findOrdes[i].id == orderItemFind[j].orderID) {
            if (orderItemFind[j]._doc.itemID) {
              let itemOrderQuantity = orderItemFind[j]._doc.itemQuantity;
              let itemQuantity = orderItemFind[j]._doc.itemID.quantity;
              orderItemFind[j]._doc.itemID.quantity = itemOrderQuantity;
              orderItemFind[j]._doc.itemQuantity = itemQuantity;
            }

            orderData[i].items = [
              ...orderData[i].items,
              { ...orderItemFind[j]._doc, id: orderItemFind[j]._doc._id },
            ];
          }
        }

        
        if(findOrdes[i].salesMan){
          
          // orderData[i].salesMan['average_rating'] = 0;
          for (let d = 0; d < findAverageSalesmenRating.length; d++) {
            
            if (
              parseInt(findAverageSalesmenRating[d]._id) === parseInt(findOrdes[i].salesMan.id)
            ) {
              orderData[i].salesMan.average_rating =
                findAverageSalesmenRating[d].average_rating;
            }
          }
        }
        
      }

      // res.send(new ApiResponse(orderData, 1, 1, 100, 100, req));
      res.send(new ApiSuccess(true, 200, "Order list", orderData));
    } else {
      // res.send(new ApiResponse([], 1, 1, 100, 100, req));
      res.send(new ApiSuccess(true, 200, "Order list", []));
    }
  },
  async itemOrderCount(req, res, next) {
    // req.user._id
    try {
      let { createdBy } = req.query;
      console.log(req.user._id);
      let storeUsers = await User.find({
        _id: req.user._id,
        isDeleted: false,
      }).sort({ createdAt: -1 });
      console.log(storeUsers);
      if (storeUsers.length > 0) {
        // if()
        let storeIDS = [];
        let storeAddress = [];
        for (let i = 0; i < storeUsers.length; i++) {
          storeIDS.push(storeUsers[i].store);
          if (storeUsers[i].storeAddress) {
            storeAddress.push(storeUsers[i].storeAddress);
          }
        }

        let findDataPenddigData = {
          isDeleted: false,
          storeID: { $in: storeIDS },
          status: "PENDING",
          createdBy,
        };
        let findDataAcceptData = {
          isDeleted: false,
          storeID: { $in: storeIDS },
          status: "ACCEPT",
          storeUser: req.user._id,
          createdBy,
        };
        let findDataReadyData = {
          isDeleted: false,
          storeID: { $in: storeIDS },
          status: { $in: ["READY_FOR_DELIVER", "ON_PROGRESS"] },
          storeUser: req.user._id,
          createdBy,
        };
        let findOntehWayData = {
          isDeleted: false,
          storeID: { $in: storeIDS },
          status: { $in: ["RECEIVED", "ON_THE_WAY", "ARRIVED"] },
          storeUser: req.user._id,
          createdBy,
        };
        let findDataDeliverData = {
          isDeleted: false,
          storeID: { $in: storeIDS },
          status: "DELIVERED",
          storeUser: req.user._id,
          createdBy,
        };

        let findDataCancelData = {
          isDeleted: false,
          storeID: { $in: storeIDS },
          status: "CANCEL",
          createdBy,
        };

        if (storeAddress.length > 0) {
          findDataPenddigData["storeAddress"] = { $in: storeAddress };
          findDataAcceptData["storeAddress"] = { $in: storeAddress };
          findDataReadyData["storeAddress"] = { $in: storeAddress };
          findOntehWayData["storeAddress"] = { $in: storeAddress };
          findDataDeliverData["storeAddress"] = { $in: storeAddress };
          findDataCancelData["storeAddress"] = { $in: storeAddress };
        }

        let PenddingOrder = await Order.count(findDataPenddigData);
        let AcceptOrder = await Order.count(findDataAcceptData);
        let readyOrder = await Order.count(findDataReadyData);
        let onthenWayOrder = await Order.count(findOntehWayData);
        let deliverOrder = await Order.count(findDataDeliverData);
        let cancelOrder = await Order.count(findDataCancelData);

        // res.send(new ApiResponse({pedding:PenddingOrder,accept:AcceptOrder,ready:readyOrder,onTheWay:onthenWayOrder,deliver:deliverOrder }, 1, 1, 100, 100, req));
        res.send(
          new ApiSuccess(true, 200, "Order list", {
            pedding: PenddingOrder,
            accept: AcceptOrder,
            ready: readyOrder,
            onTheWay: onthenWayOrder,
            deliver: deliverOrder,
            cancel: cancelOrder,
          })
        );

        // res.send(new ApiSuccess(true,200,'Order list',{pedding:0,accept:0,ready:0,onTheWay: 0,deliver:0}));
      } else {
        // res.send(new ApiResponse({pedding:0,accept:0,ready:0,onTheWay: 0,deliver:0 }, 1, 1, 100, 100, req));
        res.send(
          new ApiSuccess(true, 200, "Order list", {
            pedding: 0,
            accept: 0,
            ready: 0,
            onTheWay: 0,
            deliver: 0,
            cancel: 0,
          })
        );
      }
    } catch (e) {
      console.log({ e });
    }
  },
  async orderUpdateDriverStatus(req, res, next) {
    let { orderId } = req.params;
    if (!req.body.status) {
      return next(new ApiError(400, "status is required"));
    }
    // salesMan: req.user._id
    let order = await checkExistThenGet(orderId, Order, { isDeleted: false });
    console.log({ order });
    order.status = req.body.status;
    order.updateTime = Date.now();
    await order.save();
    res.send(order);
  },

  async orderItemStatusUpdate(req, res, next) {
    try {
      let { orderId } = req.params;
      if (!req.body.status) {
        // return next(new ApiError(403, ('status is required!')));
        return res.send(new ApiSuccess(false, 400, "status is required!", {}));
      }
      let order = await checkExistThenGet(orderId, Order, { isDeleted: false });
      let getClient = await checkExistThenGet(order.client, User, { isDeleted: false })
      let OrderStatus = req.body.status;
      String.prototype.interpolate = function(params) {
        let template = this
        for (let key in params) {
          template = template.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), params[key])
        }
        return template
      }

      if (OrderStatus === "ACCEPT") {
        order.storeUser = req.user._id;
        order.status = "ACCEPT";
        order.updateTime = Date.now();
        // await RejectStoreOrder.update({orderID: orderId},{isDeleted:true});
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);

        let getMessage = await NotificationMessage.findOne({type: 'Store-Accept',createdBy: order.createdBy,isDeleted: false});
        let sendMessageEN = `Your Order ${order._id} is Accept to store`;
        let sendMessageAR = `Your Order ${order._id} is Accept to store`;
        let ifSendMessae = true;
        if(getMessage){
          let id =order._id;
          sendMessageAR = eval('`'+getMessage.arText+'`');
          sendMessageEN = eval('`'+getMessage.text+'`');
          ifSendMessae = getMessage.isNotify
        }
        
        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            ////////
            targetUser: order.client,
            fromUser: req.user._id,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAR : sendMessageEN,
            subject: order._id,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAR : sendMessageEN,
            type: "Store-Accept",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "ACCEPT",
          });
        }
        
        // let notif = {
        //   description: "Your order has been accepted",
        //   arabicDescription: "تم قبول طلبك",
        // };
        // Notif.create({
        //   ...notif,
        //   resource: req.user._id,
        //   target: order.client,
        //   order: order._id,
        // });

        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "READY_FOR_DELIVER") {
        order.status = "READY_FOR_DELIVER";
        order.updateTime = Date.now();

        if (req.body.isStoreDelivery) {
          order.isStoreDelivery = true;
        }

        if (req.body.isStoreDelivery) {
          order.driverEarn = order.driverEarn + order.adminCommisionEarnByDrive;
          order.adminCommisionEarnByDrive = 0;
        }
       
        if (!req.body.isStoreDelivery && order.storeDeliveryType == "free") {
          let orderSetting = await OrdersSettings.findOne({
            createdBy: order.createdBy,
          });
          
          if (orderSetting && orderSetting.driverOrderCommision) {
            // driverOrderCommision
            //adminCommsionByDriver = orderSetting.driverOrderCommision;

            let adminEarnByDriver =
              (order.storeDeliveryPrice *
                parseFloat(orderSetting.driverOrderCommision)) /
              100;
            order.driverEarn =
              order.storeDeliveryPrice - adminEarnByDriver.toFixed(2);
            order.adminCommisionEarnByDrive = adminEarnByDriver;
            console.log({ order });
          }
        }

        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);
        // .then(async (data1) => {

          let getMessage = await NotificationMessage.findOne({type: 'Store-ReadyForDeliver',createdBy: order.createdBy,isDeleted: false});
          let sendMessageAR = `Order ${order._id} is ready. Waiting for driver to accept`;
          let sendMessageER = `Order ${order._id} is ready. Waiting for driver to accept`
          let ifSendMessae = true;
          if(getMessage){
            let id = order._id;            
            sendMessageAR = getMessage.arText.interpolate({id: order._id})
            // sendMessage = eval('`'+getMessage.text+'`');
            sendMessageER = getMessage.text.interpolate({id: order._id})

            ifSendMessae = getMessage.isNotify
          }
          
        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client,
            fromUser: req.user._id,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAR :sendMessageER,
            subject: order._id,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAR :sendMessageER,
            type: "Store-ReadyForDeliver",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "READY_FOR_DELIVER",
          });
        }
        

        if (!req.body.isStoreDelivery) {
          // let orderSetting = await OrdersSettings.findOne({createdBy : req.body.createdBy});
          let orederSetting = await OrdersSettings.findOne({
            createdBy: order.createdBy,
          });

          let findUsers = await User.aggregate([
            {
              $geoNear: {
                near: order.shopLocation,
                key: "location",
                distanceField: "dist.calculated",
                maxDistance: 30 * 1000,
                minDistance: 0,
                // includeLocs: "dist.location",
                spherical: true,
              },
            },
            {
              $match: {
                type: "SALES-MAN",
                isDeleted: false,
                createdBy: order.createdBy,
                orderMoney: { $lte: orederSetting.maxCaseBalance },
              },
            },
          ]);

          let getNewMessage = await NotificationMessage.findOne({type: 'Store-driver',createdBy: order.createdBy,isDeleted: false});
          let sendMessageNewER = `New Order Request`;
          let sendMessageNewAR = `New Order Request`;
          let ifSendMessaeNew = true;
          if(getNewMessage){
            // let id =order._id;
            sendMessageNewAR = getNewMessage.arText.interpolate({id: order._id})
            // sendMessageNew = eval('`'+getNewMessage.text+'`');
            sendMessageNewER = getNewMessage.text.interpolate({id: order._id})
            ifSendMessaeNew = getNewMessage.isNotify
          }

          if(ifSendMessaeNew){
            findUsers.forEach((user) => {
              console.log({ user });
            
              sendNotifiAndPushNotifi({
                ////////
                targetUser: user._id,
                fromUser: req.user._id,
                text: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewER,
                subject: order._id,
                subjectType: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewER,
                type: "Store-driver",
                bundelID: config.iosBundelID.driverApp,
                orderID: orderId,
                orderStatus: "READY_FOR_DELIVER",
              });
              // let notif = {
              //   description: "New order from store shipments",
              //   arabicDescription: "طلب جديد من شحنات المتجر",
              // };
              // Notif.create({
              //   ...notif,
              //   resource: req.user._id,
              //   target: user._id,
              //   order: order._id,
              // });
            });
          }
          

          return res.send(new ApiSuccess(true, 200, "order", order));
        } else {
          let findUsers = await User.aggregate([
            {
              $match: {
                type: "STORE-SALESMAN",
                isDeleted: false,
                createdBy: order.createdBy,
                store: order.storeID,
                storeAddress: order.storeAddress,
              },
            },
          ]);


          let getNewMessage = await NotificationMessage.findOne({type: 'Store-driver',createdBy: order.createdBy,isDeleted: false});
          let sendMessageNewAR = `New Order Request`;
          let sendMessageNewEN = `New Order Request`;

          let ifSendMessaeNew = true;
          if(getNewMessage){
            // let id =order._id;
            
            sendMessageNewAR = getNewMessage.arText.interpolate({id: order._id})
            // sendMessageNew = eval('`'+getNewMessage.text+'`');
            sendMessageNewEN = getNewMessage.text.interpolate({id: order._id})
            ifSendMessaeNew = getNewMessage.isNotify
          }

          if(ifSendMessaeNew){
            findUsers.forEach((user) => {
              sendNotifiAndPushNotifi({
                ////////
                targetUser: user._id,
                fromUser: req.user._id,
                text: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewEN,
                subject: order._id,
                subjectType:user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewEN,
                type: "Store-driver",
                bundelID: config.iosBundelID.driverApp,
                orderID: orderId,
                orderStatus: "READY_FOR_DELIVER",
              });
              // let notif = {
              //   description: "New order from store shipments",
              //   arabicDescription: "طلب جديد من شحنات المتجر",
              // };
              // Notif.create({
              //   ...notif,
              //   resource: req.user._id,
              //   target: user._id,
              //   order: order._id,
              // });
            });
          }
          

          return res.send(new ApiSuccess(true, 200, "order", order));
        }

        //socket.emit('newOrder', {data:data1});
        // });
      } else if (OrderStatus === "ON_PROGRESS") {
        let salesManActiveOrder = await Order.find({
          salesMan: req.user._id,
          isDeleted: false,
          systemDeleted: false,
          systemDeletedWithoutOffer: false,
          status: {
            $in: [
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "READY_FOR_DELIVER",
            ],
          },
        });

        if (salesManActiveOrder.length > 0) {
          // return next(new ApiError(403, ('Please delivered your current order first')));
          return res.send(
            new ApiSuccess(
              false,
              400,
              "Please delivered your current order first",
              {}
            )
          );
        }

        // if (order.offer) {
        //     // return next(new ApiError(403, ('this order have offer')));
        //     return res.send(new ApiSuccess(false,400,'this order have offer',{}));
        // }

        // if (offer.isDeleted) {
        //     return next(new ApiError(403, ('this sales man have order accepted')));
        // }

        if (order.coupon) {
          let findCoupone = await Coupon.findOne({ _id: order.coupon });

          if (findCoupone.discountType == "Percentage") {
            let percentagePrice = parseFloat(findCoupone.discount) / 100;
            order.discountPrice = percentagePrice.toString();
          } else {
            order.discountPrice = parseFloat(findCoupone.discount).toString();
          }

          // offer.deliveryCost
          // discountPrice
        }

        let user = await checkExistThenGet(req.user._id, User);
        order.status = "ON_PROGRESS";
        order.updateTime = Date.now();
        order.salesMan = req.user._id;
        order.accept = true;

        order.driverType = user.type;

        // order.offer = offerId;
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);

        let newCount = user.tasksCount + 1;
        user.tasksCount = newCount;
        await user.save();
        console.log({ order });

        let getMessage = await NotificationMessage.findOne({type: 'Store-OnProgress',createdBy: order.createdBy,isDeleted: false});
        let sendMessageEn = `Driver accept Order ${orderId}. On the way to pickup order.`;
        let sendMessageAr = `Driver accept Order ${orderId}. On the way to pickup order.`
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          console.log(getMessage.text)
          sendMessageAr = getMessage.arText.interpolate({id: order._id})
          sendMessageEn = getMessage.text.interpolate({id: order._id})
          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.storeUser.id,
            fromUser: req.user._id,
            text: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr :sendMessageEn,
            subject: orderId,
            subjectType: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr :sendMessageEn,
            type: "Store-OnProgress",
            bundelID: config.iosBundelID.storeApp,
            orderID: orderId,
            orderStatus: "ON_PROGRESS",
          });
        }
        

        // let notif = {
        //   description: `${user.username} will deliver the order No :${orderId}`,
        //   arabicDescription: `${orderId} سيقوم بتوصيل الطلب رقم ${user.username}`,
        // };

       
        if(ifSendMessae){ 
          await sendNotifiAndPushNotifi({
            targetUser: order.client.id,
            fromUser: req.user._id,
            text: order.client.language && order.client.language == 'ar' ? sendMessageAr :sendMessageEn,
            subject: orderId,
            subjectType: order.client.language && order.client.language == 'ar' ? sendMessageAr :sendMessageEn,
            type: "Store",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "ON_PROGRESS",
          });
        }
        

        // await Notif.create({
        //   ...notif,
        //   resource: req.user._id,
        //   target: order.storeUser,
        //   order: orderId,
        // });
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "RECEIVED") {
        order.status = "RECEIVED";
        order.updateTime = Date.now();
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);

        let getMessage = await NotificationMessage.findOne({type: 'Store-Received',createdBy: order.createdBy,isDeleted: false});
        let sendMessageAr = `Order ${orderId} is on the way`;
        let sendMessageEn = `Order ${orderId} is on the way`;
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          console.log(getMessage.text)
          sendMessageAr = getMessage.arText.interpolate({id: order._id})
          
          sendMessageEn = getMessage.text.interpolate({id: order._id})

          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client,
            fromUser: order.salesMan,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: getClient.language && getClient.language == 'ar' ?sendMessageAr :sendMessageEn,
            type: "Store-Received",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "RECEIVED",
          });
  
          await sendNotifiAndPushNotifi({
            targetUser: order.storeUser.id,
            fromUser: order.salesMan,
            text: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr:sendMessageEn,
            type: "Store-Received",
            bundelID: config.iosBundelID.storeApp,
            orderID: orderId,
            orderStatus: "RECEIVED",
          });
        }
        

        // let notif = {
        //   description: ` Your order No:${orderId} has been dispatched to the driver for delivery`,
        //   arabicDescription: `طلبك رقم : ${orderId}، تم تسليمه للمندوب للتوصيل`,
        // };

        // await Notif.create({
        //   ...notif,
        //   resource: order.salesMan,
        //   target: order.client,
        //   order: orderId,
        // });

        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "ON_THE_WAY") {
        order.status = "ON_THE_WAY";
        order.updateTime = Date.now();
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "ARRIVED") {
        order.status = "ARRIVED";
        order.updateTime = Date.now();

        let getMessage = await NotificationMessage.findOne({type: 'Store-Arrived',createdBy: order.createdBy,isDeleted: false});
        let sendMessageEn = `Your Order ${orderId} has now arrived a your doorstep.`;
        let sendMessageAr = `Your Order ${orderId} has now arrived a your doorstep.`
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          console.log(getMessage.text)
          sendMessageAr = getMessage.arText.interpolate({id: order._id})
          // sendMessage = eval('`'+getMessage.text+'`');
          sendMessageEn = getMessage.text.interpolate({id: order._id})
          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client,
            fromUser: order.salesMan,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            type: "Store-Arrived",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "ARRIVED",
          });
        }
        
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "DELIVERED") {
        order.status = "DELIVERED";
        order.updateTime = Date.now();
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);

        let store = await checkExistThenGet(order.storeID.id, Store, {
          isDeleted: false,
        });
        let storeDelevrycharge = parseFloat(store.deliveryCharge);
        let storeTax = parseFloat(store.tax);

        let toalOrderItemPrice = 0;
        let gettotalItmeOrder = await orderItem.find({
          orderID: order._id,
          isDeleted: false,
        });

        for (let i = 0; i < gettotalItmeOrder.length; i++) {
          toalOrderItemPrice =
            toalOrderItemPrice +
            parseFloat(gettotalItmeOrder[i].itemTotalPrice);
        }

        let getPensentage = toalOrderItemPrice * (store.adminCommission / 100);

        let storeAdminEarn;
        if (store.adminEarn) {
          // store.adminEarn = store.adminEarn + getPensentage;
          storeAdminEarn = store.adminEarn + getPensentage;
        } else {
          // store.adminEarn = getPensentage;
          storeAdminEarn = getPensentage;
        }

        // store.save();

        // store = await checkExistThenGet(order.storeId, Store);
        let tax = await Tax.find({ isDeleted: false }).select("value");

        let taxValue = tax[0].value;

        let taxValueNumber = storeDriverCharge * taxValue;
        let taxFromTotal = taxValueNumber / 100;

        let delivary = storeDriverCharge - parseFloat(store.deliveryCharge);
        if (parseFloat(order.discountPrice) > 0) {
          delivary = parseFloat(store.deliveryCharge);
          taxFromTotal = taxFromTotal - parseFloat(order.discountPrice);
        } else {
          // delivary = store.deliveryCharge;
        }

        let salesMan = await checkExistThenGet(order.salesMan.id, User);

        let driverAdd = delivary - taxFromTotal;
        let finddevaryTax = 0;
        if (storeTax > 0) {
          finddevaryTax = (20 * storeTax) / 100;
        }

        // storeAdminEarn = storeAdminEarn + delivary;
        // store.adminEarn = storeAdminEarn + delivary;

        store.save();

        if (order.paymentType === "cod") {
          console.log(salesMan.orderMoney);
          console.log(order.itemTotal);
          console.log(order.driverEarn);
          salesMan.orderMoney = salesMan.orderMoney
            ? salesMan.orderMoney
            : 0 + (order.itemTotal - order.driverEarn);
        }

        await salesMan.save();

        if (
          salesMan.type != "STORE" ||
          salesMan.type != "STORE-ADMIN" ||
          salesMan.type != "STORE-SALESMAN"
        ) {
          // console.log(salesMan.completedOrder)
          // if(salesMan.completedOrder && salesMan.completedOrder > 0){
          //     salesMan.completedOrder = parseInt(salesMan.completedOrder) + 1;
          // } else {
          //     salesMan.completedOrder = 1;
          // }
          // console.log(salesMan.completedOrder)
          // // salesMan.debt = salesMan.debt + driverAdd - finddevaryTax;
          // // salesMan.balance = salesMan.balance + storeDriverCharge;
          // let acutlueTax = taxValueNumber / 100;
          // let plusBalance = delivary - acutlueTax;
          // salesMan.delivaryBalance = salesMan.delivaryBalance + plusBalance ;
          // orderMoney
        }


        let getMessage = await NotificationMessage.findOne({type: 'Store-Delivered',createdBy: order.createdBy,isDeleted: false});
        let sendMessageAr = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;
        let sendMessageEn = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          console.log(getMessage.text)
          sendMessageAr = getMessage.arText.interpolate({id: order._id})
          sendMessageEn = getMessage.text.interpolate({id: order._id})
          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client.id,
            fromUser: order.salesMan.id,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            type: "Store-Delivered",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "DELIVERED",
          });
        }
       


        let getMessageStore = await NotificationMessage.findOne({type: 'Store-Delivered-Store',createdBy: order.createdBy,isDeleted: false});
        let sendMessageStoreEn = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;
        let sendMessageStoreAr = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;

        let ifSendMessaeStore = true;
        if(getMessageStore){
          let id = order._id;
          sendMessageStoreEn = getMessageStore.arText.interpolate({id: order._id});
          sendMessageStoreAr = getMessageStore.text.interpolate({id: order._id});
          ifSendMessaeStore = getMessageStore.isNotify
        }
        

        if(ifSendMessaeStore){
          await sendNotifiAndPushNotifi({
            targetUser: order.storeUser.id,
            fromUser: order.salesMan.id,
            text: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
            subject: orderId,
            subjectType: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
            type: "Store-Delivered",
            bundelID: config.iosBundelID.storeApp,
            orderID: orderId,
            orderStatus: "DELIVERED",
          });
  
        }
        
        // let notif = {
        //   description: ` Your order NO: ${orderId},has been  delivered`,
        //   arabicDescription: `تم تسليم طلبك رقم :${orderId}`,
        // };
        // await Notif.create({
        //   ...notif,
        //   resource: order.salesMan.id,
        //   target: order.client.id,
        //   order: orderId,
        // });

        return res.send(new ApiSuccess(true, 200, "order", order));
        // res.send(order);
      } else {
        // return next(new ApiError(403, ('status not valid')));
        return res.send(new ApiSuccess(false, 400, "status not validt", {}));
      }
    } catch (err) {
      console.log({ err });
      // return next(new ApiError(403, ('Order Not Found')));
      return res.send(new ApiSuccess(false, 400, "Order Not Found", {}));
    }
  },

  async rejectStoreOrder(req, res, next) {
    let { orderId } = req.params;

    let order = await checkExistThenGet(orderId, Order, { isDeleted: false });
    order.isDeleted = true;
    order.status = "REJECT";
    order.save();
    // let createRejectStoreOrder = await RejectStoreOrder.create({storeUser: req.user._id,orderID: orderId});

    sendNotifiAndPushNotifi({
      ////////
      targetUser: order.client,
      fromUser: req.user._id,
      text: "نعتذر، هذا المتجر لايمكنه خدمتك الآن",
      subject: order._id,
      subjectType: "نعتذر، هذا المتجر لايمكنه خدمتك الآن",
      type: "Store",
    });
    // let notif = {
    //   description: `sorry, this store can't serve you at this time`,
    //   arabicDescription: "نعتذر، هذا المتجر لايمكنه خدمتك الآن",
    // };
    // Notif.create({
    //   ...notif,
    //   resource: req.user._id,
    //   target: order.client,
    //   order: order._id,
    // });

    res.send(order);
  },

  async getStoreOrder(req, res, next) {
    let page = +req.query.page || 1,
      limit = +req.query.limit || 20,
      { storeId } = req.query;

    let findData = { isDeleted: false };
    if (storeId) {
      findData.storeID = storeId;
    }

    let findOrdes = await Order.find(findData)
      .populate([
        { path: "storeID", model: "store" },
        { path: "items", modal: "orderItem" },
        { path: "client", model: "user" },
        { path: "salesMan", model: "user" },
      ])
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    let orderIds = findOrdes.map((item) => item.id);

    let findRatings = await Rating.find({ orderID: { $in: orderIds } });

    let newOrdersData = [];
    for (let j = 0; j < findOrdes.length; j++) {
      let ratings = [];

      for (let k = 0; k < findRatings.length; k++) {
        if (findOrdes[j].id == findRatings[k].orderID) {
          ratings.push(findRatings[k]);
        }
      }

      let item = { ...findOrdes[j]._doc };
      item.ratings = ratings;
      newOrdersData.push(item);
    }

    const ordersCount = await Order.count(findData);
    const pageCount = Math.ceil(ordersCount / limit);

    res.send(
      new ApiResponse(newOrdersData, page, pageCount, limit, ordersCount, req)
    );
  },

  async uploadbillImages(req, res, next) {
    try {
      if (!req.body.orderId) {
        return res.send(new ApiSuccess(false, 400, "orderId is required", {}));
      }

      if (!req.files["billImages"]) {
        return res.send(
          new ApiSuccess(false, 400, "billImages is required", {})
        );
      }

      let order = await Order.findOne({ _id: req.body.orderId });

      if (!order) {
        return res.send(
          new ApiSuccess(false, 400, "order not found with this id", {})
        );
      }

      let updateOrderData = {};

      if (req.files) {
        if (req.files["billImages"]) {
          let imagesList = [];
          for (let imges of req.files["billImages"]) {
            imagesList.push(await toImgUrl(imges));
          }
          updateOrderData.billImages = imagesList;
        }
      } else {
        next(new ApiError(422, "billImages is required"));
      }

      let orderUpdate = await Order.updateOne(
        { _id: req.body.orderId },
        updateOrderData
      );

      return res.send(
        new ApiSuccess(false, 200, "order images uploaded succesfully", {})
      );
    } catch (err) {
      console.log({ err });
      res.send(new ApiSuccess(false, 500, "Internal Server Error", err));
    }
  },

  async lastOrderRatingCheck(req, res, next) {
    await checkExist(req.user._id, User);

    let findLastOrder = await Order.find({
      client: req.user._id,
      isRatingShow: true,
      status: "DELIVERED",
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .populate(ratingPopulateQuery);

    if (findLastOrder.length > 0) {
      let findRating = await Rating.find({ orderID: findLastOrder[0].id });
      if (findRating.length > 0) {
        findLastOrder = [];
      }
      if (
        findLastOrder.length > 0 &&
        findLastOrder[0].salesMan &&
        findLastOrder[0].salesMan.id
      ) {
        let findAverageSalesmenRating = await Rating.aggregate([
          {
            $match: {
              ratingToWhom: "D",
            },
          },
          {
            $group: {
              _id: "$driverID",
              average_rating: { $avg: "$ratings" },
            },
          },
        ]);

        let updateFindOrder = {
          ...findLastOrder[0]._doc,
          id: findLastOrder[0]._doc._id,
        };

        updateFindOrder.salesMan = {
          ...updateFindOrder.salesMan._doc,
          average_rating: 0,
          id: updateFindOrder.salesMan.id,
        };
        for (let i = 0; i < findAverageSalesmenRating.length; i++) {
          if (
            parseInt(findAverageSalesmenRating[i]._id) ==
            updateFindOrder.salesMan._id
          ) {
            updateFindOrder.salesMan.average_rating =
              findAverageSalesmenRating[i].average_rating;
          }
        }

        findLastOrder[0] = { ...updateFindOrder };
      }
    }
    return res.send(new ApiSuccess(true, 200, "Order", findLastOrder));
  },

  async OrderRatingShowDisable(req, res, next) {
    let { orderId } = req.params;

    let order = await checkExistThenGet(orderId, Order, { isDeleted: false });
    order.isRatingShow = false;

    order.save();

    return res.send(new ApiSuccess(true, 200, "Order", order));
  },

  async dateWiseOrderData(req, res, next) {
    let match = {
      status: "DELIVERED"      
    };

    
    if (req.user.type == "SALES-MAN") {
      match.status = "DELIVERED";
      match['salesMan'] = req.user._id;
    }

    if (req.user.type == "STORE") {
      match.status = { $in: ["CANCEL", "DELIVERED"] };
      match['storeID'] = req.user.store;
      if(req.user.storeAddress){
        match['storeAddress']  = req.user.storeAddress;
      }
    }
   
    
    let findOrders = await Order.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "addresses",
          localField: "clientAddress",
          foreignField: "_id",
          as: "clientAddress",
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "storeID",
          foreignField: "_id",
          as: "storeID",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $lookup: {
          from: "storeaddresses",
          localField: "storeAddress",
          foreignField: "_id",
          as: "storeAddress",
        },
      },
      { $unwind: "$storeID" },
      { $unwind: "$clientAddress" },
      { $unwind: "$storeAddress" },
      { $unwind: "$client" },      
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: {"$toDate": "$updateTime"} } },
          data: { $push: "$$ROOT" },
        },
      },
      { $project: { date: "$_id", _id: 0, data: 1 } },
      { $sort: { date: -1 } },
    ]);

    //code for get orderIdsArray
    let orderIdsArray = [];
    

    findOrders.forEach((item) => {
      item.data.forEach((order) => {
        orderIdsArray.push(order._id);
      });
    });

    let orderItemFind = [];

    if (orderIdsArray.length > 0) {
      orderItemFind = await orderItem
        .find({ orderID: { $in: orderIdsArray } })
        .populate([{ path: "itemID", modal: "storeItem" }]);
    }

    for (let j = 0; j < findOrders.length; j++) {
      for (let k = 0; k < findOrders[j].data.length; k++) {
        findOrders[j].data[k]["items"] = [];
        for (let i = 0; i < orderItemFind.length; i++) {
          if (findOrders[j].data[k]._id == orderItemFind[i].orderID) {
            // if(findOrders[j].data[k].items && findOrders[j].data[k].items.length > 0){

            // }else {
            //     let item = {...orderItemFind[i]._doc}
            //     item.id = item._id;
            //     findOrders[j].data[k].items = [{...item}]
            // }

            let item = { ...orderItemFind[i]._doc };
            item.id = item._id;
            findOrders[j].data[k].items = [
              ...findOrders[j].data[k].items,
              { ...item },
            ];
          }
        }
      }
    }

    res.send(new ApiSuccess(true, 200, "orders", findOrders));
  },

  async orderItemStatusUpdateByAdmin(req, res, next) {
    try {
      let { orderId } = req.params;
      if (!req.body.status) {
        // return next(new ApiError(403, ('status is required!')));
        return res.send(new ApiSuccess(false, 400, "status is required!", {}));
      }
      let order = await checkExistThenGet(orderId, Order, { isDeleted: false });
      let getClient = await checkExistThenGet(order.client, User, { isDeleted: false })
      
      let OrderStatus = req.body.status;
      String.prototype.interpolate = function(params) {
        let template = this
        for (let key in params) {
          template = template.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), params[key])
        }
        return template
      }

      if (OrderStatus === "ACCEPT") {
        // order
        let storeUser = await User.findOne({
          type: "STORE-ADMIN",
          store: order.storeID,
        });

        order.storeUser = storeUser._id;
        order.status = "ACCEPT";
        order.updateTime = Date.now();
        // await RejectStoreOrder.update({orderID: orderId},{isDeleted:true});
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);
        

        let getMessage = await NotificationMessage.findOne({type: 'Store-Accept',createdBy: order.createdBy,isDeleted: false});
        
        let sendMessageEN = `Your Order ${order._id} is Accept to store`;
        let sendMessageAR = `Your Order ${order._id} is Accept to store`;
        
        let ifSendMessae = true;
        if(getMessage){
          let id =order._id;          
          sendMessageAR = eval('`'+getMessage.arText+'`');
          sendMessageEN = eval('`'+getMessage.text+'`');
          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            ////////
            targetUser: order.client,
            fromUser: storeUser._id,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAR : sendMessageEN,
            subject: order._id,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAR : sendMessageEN,
            type: "Store-Accept",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "ACCEPT",
          });
        }
        
        // let notif = {
        //   description: "Your order has been accepted",
        //   arabicDescription: "تم قبول طلبك",
        // };
        // Notif.create({
        //   ...notif,
        //   resource: storeUser._id,
        //   target: order.client,
        //   order: order._id,
        // });

        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "READY_FOR_DELIVER") {
        let storeUser = await User.findOne({
          type: "STORE-ADMIN",
          store: order.storeID,
        });

        order.status = "READY_FOR_DELIVER";
        order.updateTime = Date.now();

        if (req.body.isStoreDelivery) {
          order.isStoreDelivery = true;
        }

        if (!req.body.isStoreDelivery && order.storeDeliveryType == "free") {
          let orderSetting = await OrdersSettings.findOne({
            createdBy: order.createdBy,
          });
          console.log({ orderSetting });
          if (orderSetting && orderSetting.driverOrderCommision) {
            // driverOrderCommision
            //adminCommsionByDriver = orderSetting.driverOrderCommision;

            let adminEarnByDriver =
              (order.storeDeliveryPrice *
                parseFloat(orderSetting.driverOrderCommision)) /
              100;
            order.driverEarn =
              order.storeDeliveryPrice - adminEarnByDriver.toFixed(2);
            order.adminCommisionEarnByDrive = adminEarnByDriver;
            console.log({ order });
          }
        }
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);
        // .then(async (data1) => {

          let getMessage = await NotificationMessage.findOne({type: 'Store-ReadyForDeliver',createdBy: order.createdBy,isDeleted: false});
          let sendMessageAR = `Order ${order._id} is ready. Waiting for driver to accept`;
          let sendMessageER = `Order ${order._id} is ready. Waiting for driver to accept`;
          let ifSendMessae = true;
          if(getMessage){
            let id = order._id;
            sendMessageAR = getMessage.arText.interpolate({id: order._id});
            // sendMessage = eval('`'+getMessage.text+'`');
            sendMessageER = getMessage.text.interpolate({id: order._id});
            ifSendMessae = getMessage.isNotify
          }
          
        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client,
            fromUser: storeUser._id,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAR :sendMessageER,
            subject: order._id,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAR :sendMessageER,
            type: "Store-ReadyForDeliver",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "READY_FOR_DELIVER",
          });
  
        }
        
        if (!req.body.isStoreDelivery) {
          let findUsers = await User.aggregate([
            {
              $geoNear: {
                near: order.shopLocation,
                key: "location",
                distanceField: "dist.calculated",
                maxDistance: 30 * 1000,
                minDistance: 0,
                // includeLocs: "dist.location",
                spherical: true,
              },
            },
            {
              $match: {
                type: "SALES-MAN",
                isDeleted: false,
                createdBy: order.createdBy,
              },
            },
          ]);

          let getNewMessage = await NotificationMessage.findOne({type: 'Store-driver',createdBy: order.createdBy,isDeleted: false});
          let sendMessageNewER = `New Order Request`;
          let sendMessageNewAR = `New Order Request`;
          let ifSendMessaeNew = true;
          if(getNewMessage){
            sendMessageNewAR = getNewMessage.arText.interpolate({id: order._id})            
            sendMessageNewER = getNewMessage.text.interpolate({id: order._id});            

            ifSendMessaeNew = getNewMessage.isNotify
          }

          if(ifSendMessaeNew){
            findUsers.forEach((user) => {              
              sendNotifiAndPushNotifi({
                ////////
                targetUser: user._id,
                fromUser: storeUser._id,
                text: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewER,
                subject: order._id,
                subjectType: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewER,
                type: "Store-driver",
                bundelID: config.iosBundelID.driverApp,
                orderID: orderId,
                orderStatus: "READY_FOR_DELIVER",
              });
              // let notif = {
              //   description: "New order from store shipments",
              //   arabicDescription: "طلب جديد من شحنات المتجر",
              // };
              // Notif.create({
              //   ...notif,
              //   resource: storeUser._id,
              //   target: user._id,
              //   order: order._id,
              // });
            });
          }
          

          return res.send(new ApiSuccess(true, 200, "order", order));
        } else {
          let findUsers = await User.aggregate([
            {
              $match: {
                type: "STORE-SALESMAN",
                isDeleted: false,
                createdBy: order.createdBy,
                store: order.storeID,
                storeAddress: order.storeAddress,
              },
            },
          ]);

          
          let getNewMessage = await NotificationMessage.findOne({type: 'Store-driver',createdBy: order.createdBy,isDeleted: false});
          let sendMessageNewAR = `New Order Request`;
          let sendMessageNewEN = `New Order Request`;

          let ifSendMessaeNew = true;
          if(getNewMessage){
            sendMessageNewAR = getNewMessage.arText.interpolate({id: order._id})
            // sendMessageNew = eval('`'+getNewMessage.text+'`');
            sendMessageNewEN = getNewMessage.text.interpolate({id: order._id})
            ifSendMessaeNew = getNewMessage.isNotify
          }

          if(ifSendMessaeNew){
            findUsers.forEach((user) => {
              sendNotifiAndPushNotifi({
                ////////
                targetUser: user._id,
                fromUser: storeUser._id,
                text: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewEN,
                subject: order._id,
                subjectType: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewEN,
                type: "Store-driver",
                bundelID: config.iosBundelID.driverApp,
                orderID: orderId,
                orderStatus: "READY_FOR_DELIVER",
              });
              // let notif = {
              //   description: "New order from store shipments",
              //   arabicDescription: "طلب جديد من شحنات المتجر",
              // };
              // Notif.create({
              //   ...notif,
              //   resource: storeUser._id,
              //   target: user._id,
              //   order: order._id,
              // });
            });
  
          }
          
          return res.send(new ApiSuccess(true, 200, "order", order));
        }

        //socket.emit('newOrder', {data:data1});
        // });
      } else if (OrderStatus === "ON_PROGRESS") {
        // let salesManActiveOrder = await Order.find({salesMan: req.user._id,isDeleted:false,systemDeleted:false,systemDeletedWithoutOffer:false,status:{$in:['ON_PROGRESS','RECEIVED','ON_THE_WAY','ARRIVED','READY_FOR_DELIVER']}});

        // if(salesManActiveOrder.length > 0) {
        //     return next(new ApiError(403, ('this salesman already book')));
        // }

        // if (order.offer) {
        //     // return next(new ApiError(403, ('this order have offer')));
        //     return res.send(new ApiSuccess(false,400,'this order have offer',{}));
        // }

        // if (offer.isDeleted) {
        //     return next(new ApiError(403, ('this sales man have order accepted')));
        // }

        if (order.coupon) {
          let findCoupone = await Coupon.findOne({ _id: order.coupon });

          if (findCoupone.discountType == "Percentage") {
            let percentagePrice = parseFloat(findCoupone.discount) / 100;
            order.discountPrice = percentagePrice.toString();
          } else {
            order.discountPrice = parseFloat(findCoupone.discount).toString();
          }

          // offer.deliveryCost
          // discountPrice
        }

        order.status = "ON_PROGRESS";
        order.updateTime = Date.now();
        order.salesMan = req.body.driverId;
        order.accept = true;

        // order.offer = offerId;
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);

        let user = await checkExistThenGet(req.body.driverId, User);
        let newCount = user.tasksCount + 1;
        user.tasksCount = newCount;
        await user.save();
        console.log({ order });


        let getMessage = await NotificationMessage.findOne({type: 'Store-OnProgress',createdBy: order.createdBy,isDeleted: false});
        let sendMessageEn = `Driver accept Order ${orderId}. On the way to pickup order.`;
        let sendMessageAr = `Driver accept Order ${orderId}. On the way to pickup order.`;
        
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          sendMessageAr = getMessage.arText.interpolate({id: order._id});
          sendMessageEn = getMessage.text.interpolate({id: order._id});
          
          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.storeUser.id,
            fromUser: req.body.driverId,
            text: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr :sendMessageEn,
            subject: orderId,
            subjectType: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr :sendMessageEn,
            type: "Store-OnProgress",
            bundelID: config.iosBundelID.storeApp,
            orderID: orderId,
            orderStatus: "ON_PROGRESS",
          });
        }
       

        // let notif = {
        //   description: `${user.username} will deliver the order No :${orderId}`,
        //   arabicDescription: `${orderId} سيقوم بتوصيل الطلب رقم ${user.username}`,
        // };
        if(ifSendMessae){ 
          await sendNotifiAndPushNotifi({
            targetUser: order.client.id,
            fromUser: req.body.driverId,
            text: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr :sendMessageEn,
            subject: orderId,
            subjectType: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageAr :sendMessageEn,
            type: "Store",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "ON_PROGRESS",
          });
        }
        

        // await Notif.create({
        //   ...notif,
        //   resource: req.body.driverId,
        //   target: order.storeUser,
        //   order: orderId,
        // });
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "RECEIVED") {
        order.status = "RECEIVED";
        order.updateTime = Date.now();
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);


        
        let getMessage = await NotificationMessage.findOne({type: 'Store-Received',createdBy: order.createdBy,isDeleted: false});
        let sendMessageAr = `Order ${orderId} is on the way`;
        let sendMessageEn = `Order ${orderId} is on the way`;
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          
          sendMessageAr = getMessage.arText.interpolate({id: order._id})
          
          sendMessageEn = getMessage.text.interpolate({id: order._id})

          ifSendMessae = getMessage.isNotify
        }
        
        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client,
            fromUser: order.salesMan,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            type: "Store-Received",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "RECEIVED",
          });
  
          await sendNotifiAndPushNotifi({
            targetUser: order.storeUser.id,
            fromUser: order.salesMan,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            type: "Store-Received",
            bundelID: config.iosBundelID.storeApp,
            orderID: orderId,
            orderStatus: "RECEIVED",
          });
        }
        
        

        // let notif = {
        //   description: ` Your order No:${orderId} has been dispatched to the driver for delivery`,
        //   arabicDescription: `طلبك رقم : ${orderId}، تم تسليمه للمندوب للتوصيل`,
        // };

        // await Notif.create({
        //   ...notif,
        //   resource: order.salesMan,
        //   target: order.client,
        //   order: orderId,
        // });

        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "ON_THE_WAY") {
        order.status = "ON_THE_WAY";
        order.updateTime = Date.now();
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "ARRIVED") {
        order.status = "ARRIVED";
        order.updateTime = Date.now();

        let getMessage = await NotificationMessage.findOne({type: 'Store-Arrived',createdBy: order.createdBy,isDeleted: false});
        let sendMessageEn = `Your Order ${orderId} has now arrived a your doorstep.`;
        let sendMessageAr = `Your Order ${orderId} has now arrived a your doorstep.`;
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          sendMessageAr = getMessage.arText.interpolate({id: order._id})
          // sendMessage = eval('`'+getMessage.text+'`');
          sendMessageEn = getMessage.text.interpolate({id: order._id})

          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client,
            fromUser: order.salesMan,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            type: "Store-Arrived",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "ARRIVED",
          });
        }
        
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);
        // res.send(order);
        return res.send(new ApiSuccess(true, 200, "order", order));
      } else if (OrderStatus === "DELIVERED") {
        order.status = "DELIVERED";
        order.updateTime = Date.now();
        await order.save();
        order = await Order.findById(orderId).populate(populateQuery);

        let store = await checkExistThenGet(order.storeID.id, Store, {
          isDeleted: false,
        });
        let storeDelevrycharge = parseFloat(store.deliveryCharge);
        let storeTax = parseFloat(store.tax);

        let toalOrderItemPrice = 0;
        let gettotalItmeOrder = await orderItem.find({
          orderID: order._id,
          isDeleted: false,
        });

        for (let i = 0; i < gettotalItmeOrder.length; i++) {
          toalOrderItemPrice =
            toalOrderItemPrice +
            parseFloat(gettotalItmeOrder[i].itemTotalPrice);
        }

        let getPensentage = toalOrderItemPrice * (store.adminCommission / 100);

        let storeAdminEarn;
        if (store.adminEarn) {
          // store.adminEarn = store.adminEarn + getPensentage;
          storeAdminEarn = store.adminEarn + getPensentage;
        } else {
          // store.adminEarn = getPensentage;
          storeAdminEarn = getPensentage;
        }

        // store.save();

        // store = await checkExistThenGet(order.storeId, Store);
        let tax = await Tax.find({ isDeleted: false }).select("value");

        let taxValue = tax[0].value;

        let taxValueNumber = storeDriverCharge * taxValue;
        let taxFromTotal = taxValueNumber / 100;

        let delivary = storeDriverCharge - parseFloat(store.deliveryCharge);
        if (parseFloat(order.discountPrice) > 0) {
          delivary = parseFloat(store.deliveryCharge);
          taxFromTotal = taxFromTotal - parseFloat(order.discountPrice);
        } else {
          // delivary = store.deliveryCharge;
        }

        let salesMan = await checkExistThenGet(order.salesMan.id, User);

        let driverAdd = delivary - taxFromTotal;
        let finddevaryTax = 0;
        if (storeTax > 0) {
          finddevaryTax = (20 * storeTax) / 100;
        }

        // storeAdminEarn = storeAdminEarn + delivary;
        // store.adminEarn = storeAdminEarn + delivary;

        store.save();

        if (salesMan.type != "STORE") {
          console.log(salesMan.completedOrder);
          if (salesMan.completedOrder && salesMan.completedOrder > 0) {
            salesMan.completedOrder = parseInt(salesMan.completedOrder) + 1;
          } else {
            salesMan.completedOrder = 1;
          }

          console.log(salesMan.completedOrder);
          // salesMan.debt = salesMan.debt + driverAdd - finddevaryTax;
          // salesMan.balance = salesMan.balance + storeDriverCharge;
          let acutlueTax = taxValueNumber / 100;
          let plusBalance = delivary - acutlueTax;

          // salesMan.delivaryBalance = salesMan.delivaryBalance + plusBalance ;
          await salesMan.save();
        }


        let getMessage = await NotificationMessage.findOne({type: 'Store-Delivered',createdBy: order.createdBy,isDeleted: false});
        let sendMessageAr = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;
        let sendMessageEn = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;
        let ifSendMessae = true;
        if(getMessage){
          let id = order._id;
          sendMessageAr = getMessage.arText.interpolate({id: order._id})
          sendMessageEn = getMessage.text.interpolate({id: order._id});
          ifSendMessae = getMessage.isNotify
        }
        

        if(ifSendMessae){
          await sendNotifiAndPushNotifi({
            targetUser: order.client.id,
            fromUser: order.salesMan.id,
            text: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            subject: orderId,
            subjectType: getClient.language && getClient.language == 'ar' ? sendMessageAr:sendMessageEn,
            type: "Store-Delivered",
            bundelID: config.iosBundelID.customerApp,
            orderID: orderId,
            orderStatus: "DELIVERED",
          });
        }
        

        let getMessageStore = await NotificationMessage.findOne({type: 'Store-Delivered-Store',createdBy: order.createdBy,isDeleted: false});
        let sendMessageStoreEn = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;
        let sendMessageStoreAr = `Your Order ${orderId} has been delivered. Please don't forget to rate our service`;

        let ifSendMessaeStore = true;
        if(getMessageStore){
          let id = order._id;
          sendMessageStoreEn = getMessageStore.arText.interpolate({id: order._id});
          sendMessageStoreAr = getMessageStore.text.interpolate({id: order._id});
          ifSendMessaeStore = getMessageStore.isNotify
        }
        console.log({sendMessageStore})

        if(ifSendMessaeStore){
          await sendNotifiAndPushNotifi({
            targetUser: order.storeUser.id,
            fromUser: order.salesMan.id,
            text: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
            subject: orderId,
            subjectType: order.storeUser.language && order.storeUser.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
            type: "Store-Delivered",
            bundelID: config.iosBundelID.storeApp,
            orderID: orderId,
            orderStatus: "DELIVERED",
          });
        }  
        

        // let notif = {
        //   description: ` Your order NO: ${orderId},has been  delivered`,
        //   arabicDescription: `تم تسليم طلبك رقم :${orderId}`,
        // };
        // await Notif.create({
        //   ...notif,
        //   resource: order.salesMan.id,
        //   target: order.client.id,
        //   order: orderId,
        // });

        return res.send(new ApiSuccess(true, 200, "order", order));
        // res.send(order);
      } else if (OrderStatus === "CANCEL") {
        order.status = "CANCEL";
        if (req.body.note) {
          order.cancelNote = req.body.note;
        }
        
        order.cancelByUser = req.user._id;

        if (order.paymentType === "online") {
          let transaction = await PaymentTransaction.findOne({
            orderID: orderId,
          });
          if (transaction) {
            const apiCall = async () => {
              const path = `/v1/payments/${transaction.transactionId}`;
              const data = querystring.stringify({
                // 'entityId': config.HyperPayConfig.EntityIDVISA,
                entityId: config.HyperPayConfig.EntityAPPLEPAY,
                amount: transaction.amount,
                currency: transaction.currency,
                paymentType: "RF",
              });
              const options = {
                port: 443,
                host: "test.oppwa.com",
                path: path,
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  "Content-Length": data.length,
                  Authorization: `Bearer ${config.HyperPayConfig.AccessToken}`,
                },
              };
              return new Promise((resolve, reject) => {
                const postRequest = https.request(options, function (res) {
                  const buf = [];
                  res.on("data", (chunk) => {
                    buf.push(Buffer.from(chunk));
                  });
                  res.on("end", () => {
                    const jsonString = Buffer.concat(buf).toString("utf8");
                    try {
                      resolve(JSON.parse(jsonString));
                    } catch (error) {
                      reject(error);
                    }
                  });
                });
                postRequest.on("error", reject);
                postRequest.write(data);
                postRequest.end();
              });
            };

            await apiCall()
              .then(async (data) => {
                console.log(data);

                await order.save();

                let getMessageStore = await NotificationMessage.findOne({type: 'Store-Cancel',createdBy: order.createdBy,isDeleted: false});
                let sendMessageStoreEn = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
                let sendMessageStoreAr = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
                let ifSendMessaeStore = true;
                if(getMessageStore){
                  let id = order._id;
                  let note = req.body.note;
                  sendMessageStoreEn = getMessageStore.text.interpolate({id: order._id,note: req.body.note})
                  sendMessageStoreAr = getMessageStore.text.interpolate({id: order._id,note: req.body.note})
                  ifSendMessaeStore = getMessageStore.isNotify
                }
                
                if(ifSendMessaeStore){
                  await sendNotifiAndPushNotifi({
                    ////////
                    targetUser: order.client,
                    fromUser: req.user._id,
                    // title: `Your order : ${orderId} is cancel for (${req.body.note}) to store`,
                    subject: orderId,
                    subjectType: getClient.language && getClient.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
                    type: "Store-Cancel",
                    bundelID: config.iosBundelID.customerApp,
                    orderID: orderId,
                    orderStatus: "cancel",
                  });
                }
                
                return res.send(new ApiSuccess(true, 200, "order cancel", {}));
              })
              .catch((err) => {
                return res.send(new ApiSuccess(false, 400, "payment", err));
              });
          } else {

            let getMessageStore = await NotificationMessage.findOne({type: 'Store-Cancel',createdBy: order.createdBy,isDeleted: false});
            
            let sendMessageStoreEn = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
            let sendMessageStoreAr = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
            
            let ifSendMessaeStore = true;
            if(getMessageStore){
              let id = order._id;
              let note = req.body.note;

              sendMessageStoreEn = getMessageStore.text.interpolate({id: order._id,note: req.body.note});
              sendMessageStoreAr = getMessageStore.text.interpolate({id: order._id,note: req.body.note});
                
              ifSendMessaeStore = getMessageStore.isNotify
            }
            
            if(ifSendMessaeStore){
              await sendNotifiAndPushNotifi({
                ////////
                targetUser: order.client,
                fromUser: req.user._id,
                // title: `Your order : ${orderId} is cancel for (${req.body.note}) to store`,
                subject: orderId,
                subjectType: getClient.language && getClient.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
                type: "Store-Cancel",
                bundelID: config.iosBundelID.customerApp,
                orderID: orderId,
                orderStatus: "cancel",
              });
            }

            
            await order.save();
            return res.send(new ApiSuccess(true, 200, "order cancel", {}));
          }
        } else {

          let getMessageStore = await NotificationMessage.findOne({type: 'Store-Cancel',createdBy: order.createdBy,isDeleted: false});
          let sendMessageStoreEn = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
          let sendMessageStoreAr = `Your order : ${orderId} is cancel for (${req.body.note}) to store`;
          
          let ifSendMessaeStore = true;
          if(getMessageStore){
            let id = order._id;
            let note = req.body.note;
            
            sendMessageStoreAr = getMessageStore.arText.interpolate({id: order._id,note: req.body.note})            
            sendMessageStoreEn = getMessageStore.text.interpolate({id: order._id,note: req.body.note});

            ifSendMessaeStore = getMessageStore.isNotify
          }
          
          if(ifSendMessaeStore){
            await sendNotifiAndPushNotifi({
              ////////
              targetUser: order.client,
              fromUser: req.user._id,
              // title: `Your order : ${orderId} is cancel for (${req.body.note}) to store`,
              subject: orderId,
              subjectType: getClient.language && getClient.language == 'ar' ? sendMessageStoreAr:sendMessageStoreEn,
              type: "Store-Cancel",
              bundelID: config.iosBundelID.customerApp,
              orderID: orderId,
              orderStatus: "cancel",
            });
          }
          // await sendNotifiAndPushNotifi({
          //   ////////
          //   targetUser: order.client,
          //   fromUser: req.user._id,
          //   // title: `Your order : ${orderId} is cancel for (${req.body.note}) to store`,
          //   subject: orderId,
          //   subjectType: `Your order : ${orderId} is cancel for (${req.body.note}) to store`,
          //   type: "Store-Cancel",
          //   bundelID: config.iosBundelID.customerApp,
          //   orderID: orderId,
          //   orderStatus: "cancel",
          // });
          await order.save();
          return res.send(new ApiSuccess(true, 200, "order cancel", {}));
        }

      } else {
        // return next(new ApiError(403, ('status not valid')));
        return res.send(new ApiSuccess(false, 400, "status not validt", {}));
      }
    } catch (err) {
      console.log({ err });
      // return next(new ApiError(403, ('Order Not Found')));
      return res.send(new ApiSuccess(false, 400, "Order Not Found", {}));
    }
  },

  async OrderGetDriverByAdmin(req, res, next) {
    let { orderId } = req.params;
    let order = await checkExistThenGet(orderId, Order, { isDeleted: false });

    if (!req.body.isStoreDelivery) {
      // let orderSetting = await OrdersSettings.findOne({createdBy : req.body.createdBy});
      let orederSetting = await OrdersSettings.findOne({
        createdBy: order.createdBy,
      });
      let currentOrderSalsMne = await Order.find({
        status: { $in: ["ON_PROGRESS", "RECEIVED", "ON_THE_WAY", "ARRIVED"] },
        isDeleted: false,
      });
      let ordersId = [];
      for (let i = 0; i < currentOrderSalsMne.length; i++) {
        if (currentOrderSalsMne[i].salesMan) {
          ordersId.push(currentOrderSalsMne[i].salesMan);
        }
      }

      let findUsers = await User.aggregate([
        // {
        //     $geoNear: {
        //         near: order.shopLocation,
        //         key: "location",
        //         distanceField: "dist.calculated",
        //         maxDistance: 500000*1000,
        //         minDistance: 0,
        //         // includeLocs: "dist.location",
        //         spherical: true
        //     }
        // },
        {
          $match: {
            _id: { $nin: ordersId },
            type: "SALES-MAN",
            isDeleted: false,
            isOnline: true,
            createdBy: order.createdBy,
            orderMoney: { $lte: orederSetting.maxCaseBalance },
          },
        },
      ]);

      return res.send(new ApiSuccess(true, 200, "Users", findUsers));
    } else {
      let findUsers = await User.aggregate([
        {
          $match: {
            type: "STORE-SALESMAN",
            isDeleted: false,
            createdBy: order.createdBy,
            store: order.storeID,
            storeAddress: order.storeAddress,
          },
        },
      ]);

      return res.send(new ApiSuccess(true, 200, "Users", findUsers));
    }
  },
};
module.exports = OrderController;
