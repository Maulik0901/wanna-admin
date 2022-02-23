import express from 'express';
import SettingControoler from '../../controllers/settings/settings.controller';
import { requireAuth } from '../../services/passport';
import {requireAdminAuth} from "../../services/adminAuth";
const router = express.Router();

router
  .route("/version")
  .post(requireAdminAuth,SettingControoler.createOrUpdateVersionSetting);

router
  .route("/system")
  .post(requireAdminAuth,SettingControoler.createOrUpdateSystemSettings);

router
  .route("/orders")
  .post(requireAdminAuth,SettingControoler.createOrUpdateOrdersSettings);

router
  .route("/")
  .get(SettingControoler.getSettings);


export default router;
