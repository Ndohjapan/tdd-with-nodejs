const nodemailer = require('nodemailer');
const nodemailerStub = require('nodemailer-stub');

exports.transporter = nodemailer.createTransport(nodemailerStub.stubTransport);