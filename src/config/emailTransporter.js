const nodemailer = require('nodemailer');
const config = require("config")

const mailConfig = config.get("mail")

exports.transporter = nodemailer.createTransport({...mailConfig});
