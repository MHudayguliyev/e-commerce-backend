const express = require('express')
const router = express.Router()
const { CreateOrder, GetOrderHistory } = require('../controllers/OrderController')
const { CheckQueries, CheckBody } = require('../scripts/helpers/SchemaValidate')
const { CreateOrderSchema, GetOrderHistorySchema } = require('../scripts/schemas/OrderSchema')
const Authenticate = require('../scripts/helpers/Authenticate')


// GET
router.route('/get-order-history').get(Authenticate, CheckQueries(GetOrderHistorySchema),  GetOrderHistory)


// POST
router.route('/create-order').post(Authenticate,  CreateOrder) // CheckBody(CreateOrderSchema), 



module.exports = router