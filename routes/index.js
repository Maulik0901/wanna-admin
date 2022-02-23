import express from 'express';
import userRoute from './user/user.route';
import CategoryRoute from './category/category.route';
import CityRoute from './city/city.route';
import CouponRoute  from './coupon/coupon.route';
import TaxRoute  from './tax/tax.route';
import DebtRoute  from './debt/debt.route';
import StoreRoute from './store/store.route';
import StoreItemRoute from './storeItem/storeItem.route';

import TimeRoute  from './time/time.route';
import YearRoute  from './year/year.route';
import TypeRoute  from './type/type.route';
import BankRoute  from './bank/bank.route';
import ShopRoute  from './shop/shop.route';
import OrderRoute  from './order/order.route';
import OfferRoute  from './offer/offer.route';
import BillRoute  from './bills/bill.route';
import messageRoute  from './message/message.route';
import ContactRoute  from './contact/contact.route';
import ReportRoute  from './reports/report.route';
import NotifRoute  from './notif/notif.route';
import AdminRoute  from './admin/admin.route';
import AboutRoute  from './about/about.route';
import ProblemRoute  from './problem/problem.route';
import OptionRoute  from './option/option.route';
import VersionRoute from './version/version.route';
import AddressRoute from './address/address.route';
import RatingsRoute from './ratings/ratings.route';
import { requireAuth } from '../services/passport';
import SettingRoute from './settings/settings.route';
import PaymentRoute from './payment/payment.route';
import NotifyMessageRoute from './notificationMessage/notificationMessage.route';

import EarningRoute from "./earning/earning.route";
import DeleveryChageRoute from './deleveryCharge/deleveryCharge.route'; 

import distance from "./distance/distance.route";
import vat from "./vat/vat.route";

const router = express.Router();


router.use('/payment',PaymentRoute);
router.use('/address',AddressRoute);
router.use('/rating',RatingsRoute);
router.use("/store",StoreRoute);
router.use("/item",StoreItemRoute);
router.use('/orders',OrderRoute);
router.use('/offers',OfferRoute);
router.use('/bills',BillRoute);
router.use('/categories', CategoryRoute);
router.use('/city',CityRoute);
router.use('/shops',ShopRoute);
router.use('/coupons',CouponRoute);
router.use('/tax',TaxRoute);
router.use('/debt',DebtRoute);
router.use('/option',OptionRoute);
router.use('/time',TimeRoute);
router.use('/bank',BankRoute);
router.use('/type',TypeRoute);
router.use('/year',YearRoute);
router.use('/problem',ProblemRoute);

router.use('/contact-us',ContactRoute);
router.use('/reports',requireAuth, ReportRoute);
router.use('/notif', NotifRoute);
router.use('/notifyMessage',NotifyMessageRoute);
router.use('/admin', AdminRoute);
router.use('/about',AboutRoute);
router.use('/messages',messageRoute);
router.use('/version',VersionRoute);

router.use('/deleveryCharge',DeleveryChageRoute);

router.use("/vat", vat);
router.use("/distance", distance);

router.use('/setting',SettingRoute);

router.use('/earning', EarningRoute)
router.use('/', userRoute);

export default router;
