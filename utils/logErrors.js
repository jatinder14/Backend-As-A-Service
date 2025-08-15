import ERRORS from "../lib/errors/errors.js";

const logErrors = (err, req, res, next) => {
    //TODO handle errors
    let response = res;

    err.status = err.status || ERRORS.INTERNAL_SERVER_ERROR.status;
    response = response.status(err.status);
    response.header("Access-Control-Allow-Origin", "*");
    response.json({
        status: err.status, 
        success: false,
        message: "Something went wrong!, Please try again later...",
        error: {
            name: err.name,
            message: err.message
        }
    });
    
    next(err);
};

export default logErrors;