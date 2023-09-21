const status = require('../utils/status')

const CheckBody = schema => (req, res, next) => {
    const { error, value } = schema.validate(req.body)
    if(error){
        res.status(status.bad).json({
            error: error.details[0].message
        })
        return        
    }
    Object.assign(req.body, value)
    return next()
}

const CheckParams = schema => (req, res, next) => {
    const { error, value } = schema.validate(req.params)
    if(error){
        res.status(status.bad).json({
            error: error.details[0].message
        })
        return        
    }
    Object.assign(req.params, value)
    return next()
}

const CheckQueries = schema => (req, res, next) => {
    const { error, value } = schema.validate(req.query)
    if(error){
        res.status(status.bad).json({
            error: error.details[0].message
        })
        return        
    }
    Object.assign(req.query, value)
    return next()
}

module.exports = {
    CheckBody,
    CheckParams,
    CheckQueries
}