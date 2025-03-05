const errorHandlerMiddleware = (err, req, res, next) => {
    console.error(err.stack);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    if(err.name === "TokenExpiredError") {
        message = "Authentication Failed";
        statusCode = 401;
    }

    if(err.name === "JsonWebTokenError") {
        message = "Authentication Failed";
        statusCode = 403;
    }

    if(err.name === "ValidationError") {
        message = `These ${Object.keys(err.errors)} all fields are required.`;
        statusCode = 400;
    }

    if(err.code === 11000) {
        message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
        statusCode = 400;
    }

    if(err.name === "MongoServerError") {
        message = "Error On Server";
        statusCode = 500;
    }

    //TODO: Add All the cases of error such as:.

    const info = {
        status: false,
        message
    }

    if(err.name === "TokenExpiredError" || statusCode === 401) {
        info.code = 'TOKEN_EXPIRED';
    }

    res.status(statusCode).json(info);
};

module.exports = errorHandlerMiddleware;
