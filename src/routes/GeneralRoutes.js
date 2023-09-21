const express = require('express')
const router = express.Router()
const { GetGroups, GetAttributes, GetMaterials, GetMaterialDetails, GenerateCode, GetDummyData, GetAllMaterials, AddFavorites, RemoveFavorites, GetFavorites, GetFirmData, GetBannerImages } = require('../controllers/GeneralController')
const { CheckQueries, CheckBody } = require('../scripts/helpers/SchemaValidate')
const { GetAttributesSchema, GetMaterialsSchema, GetMaterialDetailsSchema, GenerateCodeSchema, FavoritesSchema, GetFavoritesSchema } = require('../scripts/schemas/GeneralSchema')
const Authenticate = require('../scripts/helpers/Authenticate')

// GET
router.route('/groups').get(GetGroups)
router.route('/attributes').get(CheckQueries(GetAttributesSchema), GetAttributes)
router.route('/all-materials').get(GetAllMaterials) //    CheckQueries(GetAllMaterialsSchema),
router.route('/materials').get( GetMaterials) // CheckQueries(GetMaterialsSchema),
router.route('/material/details').get(CheckQueries(GetMaterialDetailsSchema), GetMaterialDetails)
router.route('/generate-code').get( CheckQueries(GenerateCodeSchema), GenerateCode) // Authenticate,
router.route('/dummy-data').get(GetDummyData)
router.route('/get-favorites').get(CheckQueries(GetFavoritesSchema), GetFavorites)
router.route('/get-firm-data').get(GetFirmData)
router.route('/get-banner-images').get(GetBannerImages)


// POST
router.route('/add-favorites').post(CheckBody(FavoritesSchema), AddFavorites)



// DELETE
router.route('/remove-favorites').delete(CheckBody(FavoritesSchema), RemoveFavorites)

module.exports = router