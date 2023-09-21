const winston = require('winston')
const ENV = require('../config')



const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.json(),
        winston.format.timestamp()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error', format: winston.format.combine(
            winston.format.json(),
            winston.format.timestamp()
        ) }),
        new winston.transports.File({ filename: 'info.log', level: 'info'}),
        new winston.transports.File({ filename: 'combined.log' })
    ]
})


if (ENV.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }))
}


module.exports = logger

// const CATEGORY = 'ECOMMERCE'

// const { createLogger, format, transports } = require('winston')
// const { printf, timestamp, label, combine, prettyPrint } = format
// const ENV = require('../config')


// const logger = createLogger({
//     levels: ['info', 'error', 'warn'],
//     format: combine(
//         label({ label: CATEGORY }),
//         timestamp({
//             format: "MMM-DD-YYYY HH:mm:ss",
//         }),
//         prettyPrint()
//     ),
//     transports: [
//         new transports.Console(),
//         new transports.File({ filename: 'error.log', level: 'error' }),
//         new transports.File({ filename: 'info.log', level: 'info' }),
//         new transports.File({ filename: 'warn.log', level: 'warn' }),
//         new transports.File({ filename: 'combined.log' }),
//     ]
// })


// if (ENV.NODE_ENV !== 'production') {
//     logger.add(new transports.Console({
//         format: format.simple()
//     }))
// }

// module.exports = logger
