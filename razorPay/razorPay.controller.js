import RazorPayService from "./razorPay.service.js";
import lokiLogger from "../utils/logger.js";
//import {Payment} from "../models";
import Refund from "../order/v2/db/refund.js";
import Order from "../order/v1/db/order.js";

const razorPayService = new RazorPayService();

class RazorPayController {
  /**
   * create payment
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   * @param {*} next   Callback argument to the middleware function
   * @return {callback}
   */
  createPayment(req, res, next) {
    const { orderId: orderId } = req.params;
    const currentUser = req.user;
    const data = req.body;

    const currentUserAccessToken = res.get("currentUserAccessToken");
    razorPayService
      .createPayment(orderId, data, currentUser, currentUserAccessToken)
      .then((user) => {
        res.json({ data: user });
      })
      .catch((err) => {
        next(err);
      });
  }

  createOrder(req, res, next) {
    const { amount, currency } = req.body;
    razorPayService
      .createOrder(amount, currency)
      .then((user) => {
        res.json({ data: user });
      })
      .catch((err) => {
        next(err);
      });
  }

  /**
   * verify payment
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   * @param {*} next   Callback argument to the middleware function
   * @return {callback}
   */
  verifyPayment(req, res, next) {
    const data = req.body;
    const signature = req.headers["x-razorpay-signature"];
    razorPayService
      .verifyPayment(signature, data)
      .then((user) => {
        res.json({ data: user });
      })
      .catch((err) => {
        next(err);
      });
  }

  async refundPayment(req, res, next) {
    const data = req?.body;
    let razorpayPaymentId = data?.paymentId;
    const refundAmount = data?.amount;
    const orderId = data?.orderId;
    try {
      if (orderId) {
        let razorpayPayment = await Order.findOne({ id: orderId }).select('payment.razorpayPaymentId').lean().exec();
        razorpayPaymentId = (razorpayPayment?.payment?.razorpayPaymentId) ? razorpayPayment?.payment?.razorpayPaymentId : razorpayPaymentId;
        console.log(`-------------razorpayPaymentId-----------${JSON.stringify(razorpayPaymentId)}`)
      }
      console.log(`-------------refundPayment-----------${refundAmount}`)
      const payment = razorPayService.fetchPayment(razorpayPaymentId);
      if (payment && razorpayPaymentId && refundAmount) {
        let razorpayRefundAmount = Math.abs(refundAmount).toFixed(2) * 100;
        console.log(`------------------amount-passed-to-razorpay-- ${razorpayRefundAmount}`)
        let response = await razorPayService.refundOrder(razorpayPaymentId, razorpayRefundAmount)
        console.log(`response_razorpay_on_update>>>>>>>>>> ${JSON.stringify(response)}`)
        const refundDetails = await Refund.create({
          refundId: response.id,
          refundedAmount: (response?.amount && response?.amount > 0) ? (response?.amount) / 100 : response?.amount,
          isRefunded: true,
          razorpayPaymentId: response?.payment_id,
          created_at: response?.created_at,
        })
        console.log(`refundDetails>>>>>>>>>>, ${JSON.stringify(refundDetails)}`)
        console.log(`--------response---${JSON.stringify(response)}`)
        return res.json({
          status: true,
          message: `refund amount of ${refundAmount} is successfull`
        })
      }
      return res.json({
        status: false,
        message: `refund failed`
      })
    } catch (e) {
      lokiLogger.info(`error found in refunding the money ------${e}`);
      // status code 400 represents that the refunded amoount asked is greater than the actual total payment amount or the left amount that is present in the specific payment id or if the order is already fully refunded
      return res.json({
        status: false,
        message: (e?.statusCode == 404) ? `paymnet with ${razorpayPaymentId} does not exists` : (e?.statusCode == 400) ? `${e?.error?.description}` : `We encountered an unexpected error while refunding your payment, We will look into this.`
      })
    }
  }

  async rzr_webhook(req, res) {
    try {
      const data = req.body;
      const signature = req.headers["x-razorpay-signature"];
      razorPayService
        .verifyPayment(signature, data)
        .then((user) => {
          res.json({ data: user });
        })
        .catch((err) => {
          throw err;
        });
    } catch (error) {
      console.log(error);
      res.header("Access-Control-Allow-Origin", "*");
      return res.status(400).send(error);
    }
  }

  async keys(req, res) {
    try {
      res.json({ keyId: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
      console.log(error);
      res.header("Access-Control-Allow-Origin", "*");
      return res.status(400).send(error);
    }
  }

  // /**
  // * verify payment
  // * @param {*} req    HTTP request object
  // * @param {*} res    HTTP response object
  // * @param {*} next   Callback argument to the middleware function
  // * @return {callback}
  // */
  // verifyPayment(req, res, next) 
  // {

  //     const confirmdata = req.body.confirmRequest;
  //     const razorPaydata = req.body.razorPayRequest;
  //     const signature = razorPaydata.razorpay_signature
  //     razorPayService.verifyPaymentDetails(signature,razorPaydata,confirmdata).then(response => {
  //         res.json(response);
  //     }).catch((err) => {
  //         next(err);
  //     });
  // }

}

export default RazorPayController;
