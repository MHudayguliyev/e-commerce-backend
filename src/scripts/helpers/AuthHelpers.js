const ENV = require('../../config')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const HashPassword = async (password) => {
    return bcryptjs.hash(password, 10)
}

const ComparePasswords = async (old_password, present_password) => {
    return bcryptjs.compare(present_password, old_password)
}

const GenerateAccessToken = async (user_data) => {
    return jwt.sign(user_data, ENV.ACCESS_KEY, { expiresIn: '1d' })
}

const GenerateRefreshToken = async (user_data) => {
    return jwt.sign(user_data, ENV.REFRESH_KEY, { expiresIn: '7 days' })
}

const VerifyRefreshToken = async (token) => {
    try {
        return jwt.verify(token, ENV.REFRESH_KEY, async (err, decoded) => {
            if (err) {
                return { status: "Unauthorized" }
            } else {
                const access_token = await GenerateAccessToken({
                    partner_guid: decoded.partner_guid,
                });
                return { status: "Verified", data: { access_token, partner: decoded } };
            }
        })
    } catch (error) {
        console.log("ERROR in VerifyRefreshToken: ", error);
        return { status: "Bad" };
    }
}


module.exports = {
    HashPassword,
    ComparePasswords,
    GenerateAccessToken, 
    GenerateRefreshToken,
    VerifyRefreshToken
}