const express = require('express')
const router = express.Router()
const { Login, Register, LoadPartnerData } = require('../controllers/AuthController')
const { LoginSchema, RegisterSchema } = require('../scripts/schemas/AuthSchema')
const { CheckBody } = require('../scripts/helpers/SchemaValidate')



router.route('/login').post(CheckBody(LoginSchema), Login)
router.route('/register').post(CheckBody(RegisterSchema), Register)

router.route('/load-partner-data').get(LoadPartnerData)







module.exports = router