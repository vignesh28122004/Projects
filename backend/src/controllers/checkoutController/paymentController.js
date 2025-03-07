const jwt = require('jsonwebtoken');
const { kv } = require('@vercel/kv'); // Import the appropriate Redis client library
const { setData, deleteData, getData } = require('../../utils/redisVercelKv');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Import Stripe library

exports.createOrderSession = async (req, res, next) => {
    try {
        const userId = req.user;
        const { cartOrProducts, shippingInfo, pricing } = req.body;

        // Generate JWT token with user ID
        const token = jwt.sign({ userId: userId.toString() }, process.env.SECRET_KEY, { expiresIn: "30m" });

        // Store cart or product information in Redis
        await setData(userId, token, 'cartOrProducts', cartOrProducts, 1800);
        // Store shipping information in Redis
        await setData(userId, token, 'shipping', shippingInfo, 1800);
        // Store pricing information in Redis
        await setData(userId, token, 'pricing', pricing, 1800);

        //* CLEANUP_TASK:: REMOVE THE DATA FROM THE REDIS_DB OF THE ORDER_SESSION_DATA :: PAYMENT_INFORMATION
        await deleteData(userId, token, 'payment');
        

        // Set cookie with JWT token
        // res.cookie('orderSession', token, {
        //     expires: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: 'none'
        // });

        // Send success response
        const info = {
            status: true,
            message: "Successfully added the cart or product info.",
            orderToken: token
        };
        res.status(200).send(info);
    } catch (error) {
        next(error);
    }
};

exports.getOrderSession = async (req, res, next) => {
    try {
        // Send success response if order session is active
        const info = {
            status: true,
            message: "Order Session is active!",
        };
        res.status(200).send(info);

    } catch (error) {
        // Pass error to error handling middleware
        next(error);
    }
};


exports.addShippingInfo = async (req, res, next) => {
    try {
        const userId = req.orderUser;
        const shipping = req.body;

        // Store shipping information in Redis
        await setData(userId, req.orderToken, 'shipping', shipping, 1800);

        // Create response object
        const info = {
            status: true,
            message: "Successfully added the Shipping info.",
        };

        // Send response
        res.status(200).send(info);
    } catch (error) {
        // Pass error to error handling middleware
        next(error);
    }
};

exports.getShippingInfo = async (req, res, next) => {
    try {
        const userId = req.orderUser;
        
        // Retrieve shipping information from Redis
        const result = await getData(userId, req.orderToken, 'shipping');

        if (!result) {
            const error = new Error("Order Session is expired! Please try again.");
            error.statusCode = 403;
            throw error;
        }

        // Create response object if shipping information is available
        const info = {
            status: true,
            message: "Order Session is active!.",
            result
        };
        // Send success response
        res.status(200).send(info);

    } catch (error) {
        // Pass error to error handling middleware
        next(error);
    }
};

exports.confirmOrder = async (req, res, next) => {
    try {
        const userId = req.orderUser;

        // Retrieve cart or product information, shipping information, and pricing from Redis
        const cartOrProductInfo = await getData(userId, req.orderToken, 'cartOrProducts');
        const shippingInfo = await getData(userId, req.orderToken, 'shipping');
        const pricing = await getData(userId, req.orderToken, 'pricing');

        //* CLEANUP_TASK:: REMOVE THE DATA FROM THE REDIS_DB OF THE ORDER_SESSION_DATA :: PAYMENT_INFORMATION
        await deleteData(userId, req.orderToken, 'payment');


        // Check if any of the required data is missing
        if (!cartOrProductInfo || !shippingInfo || !pricing) {
            const error = new Error("Order Session is expired! Please try again.");
            error.statusCode = 403;
            throw error;
        }

        // Create response object with shipping address, cart or product info, and pricing
        const info = {
            status: true,
            message: "Order Session is active!.",
            result: {
                address: shippingInfo,
                cartOrProducts: cartOrProductInfo,
                pricing
            }
        };

        // Send success response
        res.status(200).send(info);
    } catch (error) {
        // Pass error to error handling middleware
        next(error);
    }
};

exports.processPayment = async (req, res, next) => {
    try {
        const userId = req.orderUser;

        // Retrieve shipping information and pricing from Redis
        const shippingInfo = await getData(userId, req.orderToken,'shipping');
        const pricing = await getData(userId, req.orderToken, 'pricing');
        const paymentInfo = await getData(userId, req.orderToken, 'payment');

        // Check if shipping info and pricing exist
        if (!shippingInfo || !pricing) {
            const error = new Error("Invalid Order Session.");
            error.statusCode = 403;
            throw error;
        }

        if (paymentInfo) {
            const info = {
                status: true,
                message: "Payment already created.",
                result: paymentInfo
            }
            res.status(200).send(info);
            return;
        }

        // Create payment intent with shipping info and pricing
        const myPayment = await stripe.paymentIntents.create({
            description: 'Plant Selling website',
            shipping: {
                name: shippingInfo.name,
                address: {
                    line1: shippingInfo.address,
                    postal_code: shippingInfo.pinCode,
                    city: shippingInfo.city,
                    state: shippingInfo.state,
                    country: "India", // Setting the default country.
                },
            },
            amount: pricing.totalPrice * 100,
            currency: "inr",
            metadata: {
                company: "PlantSeller",
                user: shippingInfo.user,
            }
        });

        const paymentData = {
            paymentId: myPayment.id,
            client_secret: myPayment.client_secret,
            amount: pricing.totalPrice * 100,
            paymentMethods: myPayment.payment_method_types[0]
        }

        await setData(userId, req.orderToken, 'payment', paymentData, 1800);

        // Send payment response
        if (myPayment) {
            const info = {
                status: true,
                message: "Payment intents created.",
                result: paymentData
                
            }
            res.status(200).send(info);
        } else {
            const info = {
                status: false,
                message: "Payment not completed.",
            }
            res.status(400).send(info);
        }
    } catch (error) {
        // Pass error to error handling middleware
        next(error);
    }
};


exports.getStripePublicKey = async (req, res, next) => {
    try {
        if (req.orderUser) {
            const info = {
                status: true,
                message: "Sending the stripe public key.",
                result: {
                    stripeApiKey: process.env.STRIPE_PUBLISHABLE_KEY
                }
            }
            res.status(200).send(info);
        } else {
            const info = {
                status: false,
                message: "Authentication Failed"
            }
            res.status(403).send(info);
        }
    } catch (error) {
        // Pass error to error handling middleware
        next(error);
    }
};
