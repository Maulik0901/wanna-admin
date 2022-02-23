var Message = require('../models/message/message.model');
var MessageController = require('../controllers/message/messageController');
var OfferController = require('../controllers/offer/offer.controller');
var OrderController = require('../controllers/order/order.controller');

module.exports = {

    startChat: function (io) {  
        console.log('socket is on')
        //الروم هى النيم سبيس لكن الفرق ان الروم مفهاش اوثنتكيشن والروم جزء من النيم سبيس
        //الروم دى للبرايفت شات
        var nsp = io.of('/chat'); //namespace

        nsp.on('connection', (socket) => { //connect to socket
            socket.emit('announcements', { message: 'A new user has joined!' });
               nsp.emit('hi', 'Hello everyone!'); 
//socket دى كول باك اوبجكت فيه اكتر من فانكش اقدر اعملها زى الجوين والبرودكاست والايمت والاون
            var myId = socket.handshake.query.id; //اى دى اليوزر
           
            var roomName = 'room-' + myId; //الروم اسمها بيبقى عباره عن روم-الاى دى
            socket.join(roomName); //عشان يعمل جوين للروم دى
            console.log('client ' + myId + ' connected.');

            //emit to all users i am online
            MessageController.getMyInfo(socket,{id: myId});
            
            MessageController.updateNotifications(socket,{id: myId}, true);
            //MessageController.sendNotification(nsp,{id: myId});

            var clients1 = nsp.clients(); // ده اوبجكت فيه كل المستخدمين على السيرفر بتاع السوكت 
            socket.userId = myId; //ضيف فالسوكت كولم اسمه يوزر اى دى وقيمته بالاى دى
            console.log("socket: "+socket.userId);
            var clients=[];
            for (var id in clients1.connected) { // هضيف كل الناس الكونكتد الى موجودين فالكلاينت.كونكتيد فاراى جديد
                //امشى على الكلاينت 1 الكونكتد بتوعه وشوف هل الاى دى الى دخل على السوكت موجود ولا لا 
                //لو موجود ضيفه فالكلاينتس اراى
                var userid= clients1.connected[id].userId;
                clients.push(userid);
            }
            //var clients = nsp.clients();
            console.log(clients);
            var onlineData={
                id: myId,
                users : clients
            };
            //الاون لاين داتا عباره عن الاى دى بتاع السوكت والكلاينتس كلهم الكونكت
            MessageController.getOnlineUsers(nsp,onlineData);
            

            socket.on('newMessage', function (data) { //بعمل فاير للفانكشن بتاعه الادد ماسدج 
                console.log(data);
                MessageController.addnewMessage(io,nsp,data);
            });

            // ana hana 3ayza al id bta3 al "to" basss
            socket.on('seen',function(data){
                data.myId = myId;
                console.log("in server in seeen")
                MessageController.updateSeenSocket(nsp,data);
            });

            socket.on('typing', function (data) { //لو حصل تايب الشخص الى بكتبله بس هيشوف التايبنج
                var toRoom = 'room-' + data.toId;
                nsp.to(toRoom).emit('typing', data);
            });

            socket.on('stopTyping', function (data) {
                var toRoom = 'room-' + data.toId;
                nsp.to(toRoom).emit('stopTyping', data);
            });

            socket.on('driverOrderUpdate', function (data) {  
                console.log("driverOrderUpdate ===>")
                console.log({data});
                nsp.to("driverOrderUpdate").emit('driverOrderUpdate', data);
            });

            socket.on('online',function(){
                var check = true; // لو اونلاين يبقى الشيك بترو يعنى الستيتاس فاليوزر مودل بترو
                MessageController.changeStatus(socket,{id: myId},check);
                console.log('user is online')
            });

            socket.on('offline',function(){
                var check = false;
                MessageController.changeStatus(socket,{id: myId},check);
                console.log('user is offline')
            });

            socket.on('newOffer', function (data) { 
                console.log(data);
                OfferController.addOffer(io,nsp,data);
            });
            socket.on('currentLocation',function(data){
                console.log(data)
                if (data.offerId == 0) {
                    MessageController.setMyLocation(myId,data);
                } else {
                    OfferController.updateLocationSocket(nsp,data);
                    MessageController.setMyLocation(myId,data);
                }
            });
            socket.on('active',function(data){
                OrderController.checkActive(nsp,data);
            });
            socket.on('newOrder', function (data) { 
                // console.log('============== new order soket call =============');
                // console.log({data})
                OrderController.addOrder(socket,data,nsp);
            });
            
            socket.on('disconnect', function () {
                //لو حصل ان اليوزر قفل يبقى الستيتس بقت اوف لاين وكمان هشيله من سيرفر السوكت
                var check = false;
                console.log('client disconnected');
                MessageController.changeStatus(socket,{id: myId},check);
                MessageController.updateNotifications(socket,{id: myId}, check);
                nsp.emit('clientDisconnected',{id: myId})
            });
            

        });
    },
    startNotification : function(io){
        global.notificationNSP = io.of('/notification') ; 
        notificationNSP.on('connection',function(socket){
            var id = socket.handshake.query.id;
            var roomName = 'room-' + id;
            socket.join(roomName);
            console.log('client ' + id + ' connected on notification .');
        });
    }
}