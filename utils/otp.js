import twilio from 'twilio';

const client = new twilio(process.env.TWILLIO_ACCOUNT_SID, process.env.TWILLIO_AUTH_TOKEN);
async function sendOTPUtil(phone, otp) {
  client.messages
    .create({
      body: `Your login otp for duomo is ${otp}`,
      from: process.env.TWILLIO_SENDER_NUMBER,
      to: phone,
    })
    .then(message => console.log('twilio res ====================', message))
    .catch(err => {
      return err;
    });
}

export default sendOTPUtil;
