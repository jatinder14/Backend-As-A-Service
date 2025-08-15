import { Router } from "express";
import RazorPayController from "./razorPay.controller.js";
import { authentication } from "../middlewares/index.js";
const router = new Router();

const razorPayController = new RazorPayController();

const checkReferer = (req, res, next) => {
  const referer = req?.host;
  console.log(`referer..........${referer}`);
  //remove localhost after frontend integration -- Todo
  if (referer && [process.env.REFERER, 'localhost', process.env.ONDC_BASE_API_URL].includes(referer)) {
    // process.env.ONDC_BASE_API_URL is for IGM Refund scneario as we need to hit client service from IGM service
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Forbidden'
    });
  }
};

//Make Order
router.post(
  "/v2/razorpay/createOrder",
  authentication(),
  razorPayController.createOrder
);

//Make payment
router.post(
  "/v2/razorpay/:orderId",
  authentication(),
  razorPayController.createPayment
);

//verify payment
router.post("/v2/razorpay/verify/process", razorPayController.verifyPayment);

router.post("/v2/razorpay/razorPay/webhook", razorPayController.rzr_webhook);

router.get(
  "/v2/razorpay/razorPay/keys",
  // authentication(),
  razorPayController.keys
);

//Make refund
router.post(
  "/v2/razorpay/refund/order",
  authentication(),
  // checkReferer, - We have hosted multiple UI with this BE so will enable after development
  razorPayController.refundPayment
);

export default router;
