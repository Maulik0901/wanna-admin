import Schedule from 'node-schedule';
import moment from 'moment';
import User from '../models/user/user.model';

export function checkUser() {
    try { //    */2 * * * *
        let schedule = Schedule.scheduleJob('0 0 * * *', async () => {
            let users = await Users.find({ isDeleted: false });
            for (let user of users) {
                let differnceTime = moment().diff(moment(user.expiredate), 'days');
                if (differnceTime > 31) {
                    user.monthlySubscription = true;
                    await user.save();
                }
            }
        });
    } catch (error) {
        throw error;
    }

}