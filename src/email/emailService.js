const { transporter } = require("../config/emailTransporter");

exports.sendAccountActivation = async (email, token, happy = "hello world") => {
  try {
    await transporter.sendMail({
      from: 'My App <info@my-app.com>',
      to: email,
      subject: 'Account Activation',
      html: `Token is ${token}`,
    });
    return happy
  } catch (error) {
    throw new Error('Error From Inside')
  }
};
