import ApiSuccess from '../../helpers/ApiSuccess';
import VersionSettings from '../../models/settings/versionSettings.modal'
import SystemSettings from '../../models/settings/systemSettings.modal'
import OrdersSettings from '../../models/settings/ordersSettings.modal'


export default {

    async createOrUpdateVersionSetting(req, res, next) {

        try {

            if (!req.body.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }

            if (!req.body.iosCustomerAppVersion) {
                return res.send(new ApiSuccess(false, 400, 'iosCustomerAppVersion field is required', {}))
            }

            if (!req.body.iosStoreAppVersion) {
                return res.send(new ApiSuccess(false, 400, 'iosStoreAppVersion field is required', {}))
            }

            if (!req.body.iosDriverAppVersion) {
                return res.send(new ApiSuccess(false, 400, 'iosDriverAppVersion field is required', {}))
            }

            if (!req.body.androidCustomerAppVersion) {
                return res.send(new ApiSuccess(false, 400, 'androidCustomerAppVersion field is required', {}))
            }

            if (!req.body.androidStoreAppVersion) {
                return res.send(new ApiSuccess(false, 400, 'androidStoreAppVersion field is required', {}))
            }

            if (!req.body.androidDriverAppVersion) {
                return res.send(new ApiSuccess(false, 400, 'androidDriverAppVersion field is required', {}))
            }

            let findVersionSettings = await VersionSettings.findOne({ createdBy: req.body.createdBy });

            let data = {
                createdBy: req.body.createdBy,
                iosCustomerAppVersion: req.body.iosCustomerAppVersion,
                iosStoreAppVersion: req.body.iosStoreAppVersion,
                iosDriverAppVersion: req.body.iosDriverAppVersion,
                androidCustomerAppVersion: req.body.androidCustomerAppVersion,
                androidStoreAppVersion: req.body.androidStoreAppVersion,
                androidDriverAppVersion: req.body.androidDriverAppVersion,
            }

            if (!findVersionSettings) {
                let settig = await VersionSettings.create(data)
            } else {
                let settig = await VersionSettings.updateOne({ createdBy: req.body.createdBy }, data)
            }

            return res.send(new ApiSuccess(true, 200, 'VersionSettings SuccessFully', {}))

        } catch (err) {
            console.log(req.body)
            console.log({ err })
            return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }

    },

    async createOrUpdateSystemSettings(req, res, next) {

        try {

            if (!req.body.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }

            if (!req.body.startTime) {
                return res.send(new ApiSuccess(false, 400, 'startTime field is required', {}))
            }

            if (!req.body.endTime) {
                return res.send(new ApiSuccess(false, 400, 'endTime field is required', {}))
            }

            if (!req.body.systemMessage) {
                return res.send(new ApiSuccess(false, 400, 'systemMessage field is required', {}))
            }




            let findSystemSettings = await SystemSettings.findOne({ createdBy: req.body.createdBy });

            let data = {
                createdBy: req.body.createdBy,
                startTime: req.body.startTime,
                endTime: req.body.endTime,
                systemMessage: req.body.systemMessage
            }

            if (req.body.contactNumber) {
                data['contactNumber'] = req.body.contactNumber
            }
            if (!findSystemSettings) {
                let settig = await SystemSettings.create(data)
            } else {
                let settig = await SystemSettings.updateOne({ createdBy: req.body.createdBy }, data)
            }

            return res.send(new ApiSuccess(true, 200, 'SystemSettings SuccessFully', {}))

        } catch (err) {
            console.log(req.body)
            console.log({ err })
            return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }


    },

    async createOrUpdateOrdersSettings(req, res, next) {

        try {

            if (!req.body.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }

            if (!req.body.maxCaseBalance) {
                return res.send(new ApiSuccess(false, 400, 'maxCaseBalance field is required', {}))
            }

            if (!req.body.driverOrdersCount) {
                return res.send(new ApiSuccess(false, 400, 'driverOrdersCount field is required', {}))
            }

            if (!req.body.driverOrderCommision) {
                return res.send(new ApiSuccess(false, 400, 'driverOrderCommision field is required', {}))
            }

            if (req.body.deliveryOrderCharges && !Array.isArray(req.body.deliveryOrderCharges)) {
                return res.send(new ApiSuccess(false, 400, 'deliveryOrderCharges field is must be Array', {}))
            }

            let deliveryOrderCharges = [];

            if (req.body.deliveryOrderCharges) {
                for (let i = 0; i < req.body.deliveryOrderCharges.length; i++) {

                    let item = req.body.deliveryOrderCharges[i];
                    console.log({ item })
                        // if(!item.valueFrom){
                        //     return res.send(new ApiSuccess(false,400,'valueFrom field is required',{}))
                        // }

                    // if(!item.valueTo){
                    //     return res.send(new ApiSuccess(false,400,'valueTo field is required',{}))
                    // }

                    if (!item.deliveryCharges) {
                        return res.send(new ApiSuccess(false, 400, 'deliveryCharges field is required', {}))
                    }

                    deliveryOrderCharges.push({
                        valueFrom: item.valueFrom,
                        valueTo: item.valueTo,
                        deliveryCharges: item.deliveryCharges
                    })

                }
            }


            let findOrdersSettings = await OrdersSettings.findOne({ createdBy: req.body.createdBy });

            let data = {
                createdBy: req.body.createdBy,
                maxCaseBalance: req.body.maxCaseBalance,
                driverOrdersCount: req.body.driverOrdersCount,
                driverOrderCommision: req.body.driverOrderCommision,
                deliveryOrderCharges: deliveryOrderCharges
            }

            if (!findOrdersSettings) {
                let settig = await OrdersSettings.create(data)
            } else {
                let settig = await OrdersSettings.updateOne({ createdBy: req.body.createdBy }, data)
            }

            return res.send(new ApiSuccess(true, 200, 'OrdersSettings SuccessFully', {}))

        } catch (err) {
            console.log(req.body)
            console.log({ err })
            return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }
    },

    async getSettings(req, res, next) {

        try {

            if (!req.query.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }

            let settings = {
                versionSettings: {},
                ordersSettings: {},
                systemSettings: {}
            }

            if (['V', 'O', 'S'].includes(req.query.type)) {

                if (req.query.type == 'V') {
                    settings.versionSettings = await VersionSettings.findOne({ createdBy: req.query.createdBy });
                } else if (req.query.type == 'O') {
                    settings.ordersSettings = await OrdersSettings.findOne({ createdBy: req.query.createdBy });
                } else {
                    settings.systemSettings = await SystemSettings.findOne({ createdBy: req.query.createdBy });
                }

            } else {
                settings.versionSettings = await VersionSettings.findOne({ createdBy: req.query.createdBy });
                settings.ordersSettings = await OrdersSettings.findOne({ createdBy: req.query.createdBy });
                settings.systemSettings = await SystemSettings.findOne({ createdBy: req.query.createdBy });
            }

            return res.send(new ApiSuccess(true, 200, '', settings))

        } catch (err) {
            console.log(req.body)
            console.log({ err })
            return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }
    }
}