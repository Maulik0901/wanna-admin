var express = require('express');
var router = express.Router();
var messageController = require('../../controllers/message/messageController');
import { requireAuth } from '../../services/passport';

/* GET users listing. */
router.get('/',messageController.getAllMessages);
router.route('/unseenCount')
    .get(requireAuth,messageController.unseenCount);
router.route('/allSender')
    .get(messageController.getAllSender);
router.get('/lastContacts',messageController.findLastContacts);
router.put('/',messageController.updateSeen);
router.put('/updateInformed',messageController.updateInformed);

module.exports = router;