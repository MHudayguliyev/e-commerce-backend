const express = require('express')
const router = express.Router()
const { GetPartnerAddresses, AddPartnerAddress, UpdatePartnerAddress, DeletePartnerAddress,  SetMainAddress,  } = require('../controllers/PartnerController')
const { CheckQueries, CheckBody } = require('../scripts/helpers/SchemaValidate')
const { AddPartnerAddressSchema } = require('../scripts/schemas/PartnerSchema')
const Authenticate = require('../scripts/helpers/Authenticate')

// GET
router.route('/get-partner-addresses').get(Authenticate, GetPartnerAddresses)



// POST
router.route('/add-address').post(Authenticate, CheckBody(AddPartnerAddressSchema),  AddPartnerAddress) 


// UPDATE
router.route('/update-partner-address').put(Authenticate, UpdatePartnerAddress)
router.route('/set-main-address').put(Authenticate, SetMainAddress)


// DELETE
router.route('/delete-partner-address').delete(Authenticate, DeletePartnerAddress)



module.exports = router