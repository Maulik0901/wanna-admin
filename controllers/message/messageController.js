var Message = require('../../models/message/message.model');
var config = require('../../config');


import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import ApiResponse from "../../helpers/ApiResponse";
import User from "../../models/user/user.model";
import Notif from "../../models/notif/notif.model";
import { Collection } from "mongoose";
var messageController = {

    async addChatMessage(data) {
        // var toRoom = 'room-' + data.toId;//الروم الى هتبعتلها الماسدج وهى عباره عن اى دى اليوزر 
        // var fromRoom = 'room-' + data.data.user._id;//الرساله جايه منين
        var orderId = data.data.orderId;
        
        var messData = { //شكل الداتا 
            to: data.toId,
            from: data.data.user._id,
            sent: true
        }
        if (data.data.orderId != null) {
            messData.order = data.data.orderId;
        }
        if (data.data.image != null) {//فى صورة ولا لا
            messData.image = data.data.image;
        }
        if (data.data.text != null) { // فى رساله ولا لا
            messData.content = data.data.text;
        }
        var query1 = { //من اليوزر الى فاتح
            to: data.toId,
            from: data.data.user._id,
            lastMessage: true,
            isDeleted: false
        }
        var query2 = { //الرسايل الى هتروح لليوزر الى فاتح
            to: data.data.user._id,
            from: data.toId,
            lastMessage: true,
            isDeleted: false
        }
        var countquery = {//عدد الرسايل
            to : data.data.user._id , 
            isDeleted : false , 
            informed : false 
        }
        var Count = await Message.count(countquery);
        Count = Count + 1 ;
        Message.updateMany({ $or: [query1, query2] }, { lastMessage: false })
            .then((result1) => {
                // if (io.nsps['/chat'].adapter.rooms[toRoom]) { //لو هو فاتح الروم 
                //     messData.delivered = true;//خلى الماسدج وصولها بقى ترو
                // }
                var message = new Message1(messData); //بيكريت مسدج فالداتا بيز
                // console.log(messData);
                // console.log("Message Save =>" + message.content);
                // console.log("Message Save =>" + message.image);

            
                message.save()
                    .then(result2 => {
                        // console.log("From Then , Message Save =>" + message.content);
                        // console.log("From Then , Message Save =>" + message.image);

                        // console.log(data.data);
                        // console.log(result2);
                        //دى فانكشن الايمت بتاعه اضافه رساله
                        // nsp.to(toRoom).emit('newMessage', data.data);
                        //هنا عشان يبعت نوتفكيشن بالرساله
                        // notificationNSP.to(toRoom).emit('updateUnInformedMessage',{count : Count});
                        //
                        // nsp.to(fromRoom).emit('done', { friendId: data.toId });
                        // if (io.nsps['/chat'].adapter.rooms[toRoom]){
                        //     //لو فاتح خلى الماسدج تحصلها ديليفر ويكون اليوزر اون لاين
                        //     console.log("friend is online ");
                        //     nsp.to(fromRoom).emit('delivered', { friendId: data.toId });
                        // }
                    })
                    .catch(err => {
                        console.log('can not save the message .')
                        console.log(err);
                    });
            }).catch((err) => {
                console.log('can not update Last Message.');
                console.log(err);
            });
    },

    async addnewMessage(io, nsp, data) {
        var toRoom = 'room-' + data.toId;//الروم الى هتبعتلها الماسدج وهى عباره عن اى دى اليوزر 
        var fromRoom = 'room-' + data.data.user._id;//الرساله جايه منين
        var orderId = data.data.orderId;
        // console.log('new message to room ' + toRoom);
        var messData = { //شكل الداتا 
            to: data.toId,
            from: data.data.user._id,
            sent: true
        }
        if (data.data.orderId != null) {
            messData.order = data.data.orderId;
        }
        if (data.data.image != null) {//فى صورة ولا لا
            messData.image = data.data.image;
        }
        if (data.data.text != null) { // فى رساله ولا لا
            if(data.data.text === "arrived_order" || data.data.text === "deliverd_order" ){

            }else {
                messData.content = data.data.text;
            }
           
        }
        var query1 = { //من اليوزر الى فاتح
            to: data.toId,
            from: data.data.user._id,
            lastMessage: true,
            isDeleted: false
        }
        var query2 = { //الرسايل الى هتروح لليوزر الى فاتح
            to: data.data.user._id,
            from: data.toId,
            lastMessage: true,
            isDeleted: false
        }
        var countquery = {//عدد الرسايل
            to : data.data.user._id , 
            isDeleted : false , 
            informed : false 
        }
        var Count = await Message.count(countquery);
        Count = Count + 1 ;
        Message.updateMany({ $or: [query1, query2] }, { lastMessage: false })
            .then((result1) => {
                if (io.nsps['/chat'].adapter.rooms[toRoom]) { //لو هو فاتح الروم 
                    messData.delivered = true;//خلى الماسدج وصولها بقى ترو
                }
                var message = new Message(messData); //بيكريت مسدج فالداتا بيز
                // console.log(messData);
            
                message.save()
                    .then(result2 => {
                        // console.log(data.data);
                        // console.log(result2);
                        //دى فانكشن الايمت بتاعه اضافه رساله
                        nsp.to(toRoom).emit('newMessage', data.data);
                        //هنا عشان يبعت نوتفكيشن بالرساله
                        notificationNSP.to(toRoom).emit('updateUnInformedMessage',{count : Count});
                        //
                        nsp.to(fromRoom).emit('done', { friendId: data.toId });
                        if (io.nsps['/chat'].adapter.rooms[toRoom]){
                            //لو فاتح خلى الماسدج تحصلها ديليفر ويكون اليوزر اون لاين
                            // console.log("friend is online ");
                            nsp.to(fromRoom).emit('delivered', { friendId: data.toId });
                        }
                        
                        sendNotifiAndPushNotifi({
                            targetUser: data.data.user._id, 
                            fromUser: data.toId, 
                            text: data.data.text,
                            subject: orderId,
                            subjectType: data.data.text
                        });
                        
                        /// send notification when sales man invoice genrate
                        if(data.type && data.type === 'invoice'){
                            
                            let notif = {
                                "description": data.data.text,
                                "arabicDescription": data.data.text
                            }
                            Notif.create({...notif,resource:data.toId,target:data.data.user._id,offer:orderId});
                        }
                        
                    })
                    .catch(err => {
                        console.log('can not save the message .')
                        console.log(err);
                    });
            }).catch((err) => {
                console.log('can not update Last Message.');
                console.log(err);
            });
    },

    async getAllMessages(req, res, next) {
        //بيجيب كل الرسايل عن طريق اليوزر اى دى والفريند اى دى 
        let page = +req.query.page || 1, limit = +req.query.limit || 20;
        let {userId, friendId,out,orderId} = req.query;
        var query1 = {isDeleted: false,order:orderId };
        var query2 = {isDeleted: false,order:orderId }
        if (userId) {
            query1.to= userId;
            query2.from= userId;
        }
        if (friendId) {
            query1.from= friendId;
            query2.to= friendId;
        }
        
        Message.find({ $or: [query1, query2] })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('to from')
            .sort({ _id: -1 })
            .then(async data => {
                var newdata = [];
                //res.status(200).send(data);
                data.map(function (element) {
                    newdata.push({
                        seen: element.seen,
                        _id: element._id,
                        text: element.content,
                        image: element.image,
                        createdAt: element.incommingDate,
                        user: {
                            _id: element.from._id,
                            username: element.from.username,
                            img: element.from.img
                        },
                    });
                })
                let f = newdata;
                let friends = []
                let ids = []
                for(var i=0;i<f.length;i++){
                   let user =  f[i]
                   if(!ids.includes(user.user._id)){
                       friends.push(user)
                       ids.push(user.user._id)
                   }
                }
                // console.log("Chat USers")
                // console.log(friends)
                // console.log(ids)
                    const messagesCount = await Message.find({ $or: [query1, query2] }).count();
                    const pageCount = Math.ceil(messagesCount / limit);
                if(out){
                    res.send(new ApiResponse(friends, page, pageCount, limit, messagesCount, req));
                } else{
                    res.send(new ApiResponse(newdata, page, pageCount, limit, messagesCount, req));
                }
               
            })
            .catch(err => {
                next(err);
            });
            
    },
    async unseenCount(req, res, next) {
        try {
            let user = req.user._id;
            let query = { isDeleted: false,to:user,seen:false };
            const unseenCount = await Message.count(query);
            res.status(200).send({
                unseen:unseenCount,
            });
        } catch (err) {
            next(err);
        }
    },
    updateSeen(req, res, next) {
        var myId = +req.query.userId || 0;
        var friendId = +req.query.friendId || 0;
        var toRoom = 'room-' + friendId;
        var query1 = {
            to: myId,
            from: friendId,
            seen: false
        };
        Message.updateMany(query1, { seen: true,informed:true, seendate: Date.now() })
            .exec()
            .then(async(data) => {
                var countquery = {
                    to : myId , 
                    isDeleted : false , 
                    informed : false 
                }
                var Count = await Message.count(countquery);
                //emit to update message informed
                notificationNSP.to(toRoom).emit('updateUnInformedMessage',{count : Count});
                res.status(200).send('Updated.');
            })
            .catch((err) => {
                next(err);
            });
    },

    updateSeenSocket(nsp, data) { //الداتا دى عباره عن ان الاى دى الى مبعوتله رساله هو الاى دى بتاعىnsp بتاخد الداتا وال

        //var myId = +req.query.userId || 0 ;
        //var friendId = +req.query.friendId || 0;
        var myId = data.myId || 0;
        var friendId = data.toId || 0;
        var toRoom = 'room-' + friendId;
        var query1 = {
            to: myId,
            from: friendId,
            seen: false
        };
        Message.updateMany(query1, { seen: true, informed:true , seendate: Date.now() })
            .exec()
            .then(async(result) => {
                 var countquery = {
                    to : myId , 
                    isDeleted : false , 
                    informed : false 
                }
                var Count = await Message.count(countquery);
                notificationNSP.to(toRoom).emit('updateUnInformedMessage',{count : Count});
                nsp.to(toRoom).emit('seen', { friendId: myId });
                // console.log("updated");
            })
            .catch((err) => {
                console.log(err);
            });
    },
    async findLastContacts(req, res, next) {
        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20,
            { id } = req.query;
            let query1 = { isDeleted: false ,lastMessage: true };
            if (id) query1.to = id;
            let query2 = { isDeleted: false , lastMessage: true };
            if (id) query2.from = id;
            Message.find({ $or: [query1, query2] })
                .sort({ _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('to from')
                .then(async (data) => {
                    const messagesCount = await Message.find({ $or: [query1, query2] }).count();
                    const pageCount = Math.ceil(messagesCount / limit);
                    var data1 = [];
                    var unseenCount = 0;
                    var queryCount = {
                        isDeleted: false,
                        to: id,
                        seen: false
                    }
                    data1 = await Promise.all(data.map(async (element) => {
                        if (element.from._id === id) {
                            queryCount.from = element.to._id;
                        } else {
                            queryCount.from = element.from._id;
                        }
                        unseenCount = await Message.count(queryCount);
                        element = {
                            seen: element.seen,
                            incommingDate: element.incommingDate,
                            lastMessage: element.lastMessage,
                            _id: element.id,
                            to: element.to,
                            from: element.from,
                            content: element.content,
                            unseenCount: unseenCount
                        };
                        return element;
                    }));
                    res.send(new ApiResponse(data1, page, pageCount, limit, messagesCount, req));
                })

        } catch (err) {
            next(err);
        };
    },
    getOnlineUsers(nsp,data){ 
        var userId = data.id;
        var myRoom = 'room-'+userId;
        var query={
            isDeleted:false,
            _id: { $in : data.users } 
        };
        // console.log(query);
        User.find(query).select('firstname lastname img')
        .then((data1)=>{
            // console.log(data1);
            nsp.to(myRoom).emit('onlineUsers', {data: data1});
        })
        .catch((err)=>{
            console.log(err);
        });
    },
    getMyInfo(socket,data){ 
// بتاخد اتنين برامتر الاول سوكت خاص بالسوكت سيرفر والتانى الاى دى بتاع اليوزر الى السوكت بيدهوله
        var userId = data.id;
        User.findByIdAndUpdate(userId,{status:true},{new: true})
        .then((data1)=>{
            // console.log("ingetinfo"+data1);
            if(data1)
            {
                socket.broadcast.emit('UserOnline',data1);
            }
        })
        .catch((err)=>{
            console.log(err);
        });
    },
    //بياخد 3 برامتر الاول السوكت والتانى الداتا الى هو اى دى اليوزر والتالت فلاج اون لاين ولا لا
    changeStatus(socket,data ,check){
        var userId = data.id;
        User.findByIdAndUpdate(userId,{status:check},{new: true})
        .then((data1)=>{
            if(check){
                // console.log("in if");
                socket.broadcast.emit('online',data1);
            }
            else{
                // console.log("in else");
                socket.broadcast.emit('offline',data1);
            }
        })
        .catch((err)=>{
            console.log(err);
        });
    },
    updateInformed(req,res,next){
        var id = +req.query.id || 0 ;
        // console.log(id);
        if(!id)
        {
            next(new ApiError(404 , ' User Id Not Found . '));
        }
        var query = {
            to : id , 
            informed : false ,
            isDeleted : false
        }
        Message.updateMany(query , {informed:true})
            .then((data)=>{
                res.status(200).send('Updated Successfully');
            }) 
            .catch((err)=>{
                next(err);
            });
    },
    async getAllSender(req, res, next) {
        //بيجيب كل الرسايل عن طريق اليوزر اى دى والفريند اى دى 
        let page = +req.query.page || 1, limit = +req.query.limit || 20;
        let {userId} = req.query;
        var query = {isDeleted: false };
        if (userId) {
            query.to= userId;
        }
       
        
        Message.find(query)
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('to from')
            .sort({ _id: -1 })
            .then(async data => {
                var newdata = [];
                //res.status(200).send(data);
                data.map(function (element) {
                    newdata.push({
                        seen: element.seen,
                        _id: element._id,
                        text: element.content,
                        createdAt: element.incommingDate,
                        user: {
                            _id: element.from._id,
                            firstname: element.from.firstname,
                            lastname: element.from.lasttname,
                            img: element.from.img
                        },
                    });
                })
            /*let friends = []
            let ids = []
            for(var i=0;i<newdata.length;i++){
               let user =  newdata[i]
               if(!ids.includes(user.user._id)){
                   friends.push(user)
                   ids.push(user.user._id)
               }
            }*/
                const messagesCount = await Message.find(query).count();
                const pageCount = Math.ceil(messagesCount / limit);
                res.send(new ApiResponse(newdata, page, pageCount, limit, messagesCount, req));
            })
            .catch(err => {
                next(err);
            });
            
    },

    updateNotifications(socket,data ,check){ 
// بتاخد اتنين برامتر الاول سوكت خاص بالسوكت سيرفر والتانى الاى دى بتاع اليوزر الى السوكت بيدهوله
        var userId = data.id;
        User.findByIdAndUpdate(userId,{isOnline:check},{new: true})
        .then((data1)=>{
            // console.log("ingetinfo"+data1);
        })
        .catch((err)=>{
            console.log(err);
        });
    },
    setMyLocation(myId,data){ 
// بتاخد اتنين برامتر الاول سوكت خاص بالسوكت سيرفر والتانى الاى دى بتاع اليوزر الى السوكت بيدهوله
        var userId = myId;
        // var query = {latLocation: locationLat, longLocation: locationLng}
        // console.log("currentLocation is " + data.currentLocation);
        // console.log("currentLocation is " + userId);
        User.findByIdAndUpdate(userId,{currentLocation:data.currentLocation},{new: true})
        .then((data1)=>{
            // console.log("location => "+data1);
        })
        .catch((err)=>{
            console.log(err);
        });
        
    },
    
};

module.exports = messageController;
