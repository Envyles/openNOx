var mailer = require('nodemailer'); //e-mail functions

//Configuration for the eMail Service
var mailSender = mailer.createTransport({
  service: '',
  auth: {
    user: '',
    pass: ''
  }
});

exports.sendMail = function(mailContent){
  mailSender.sendMail(mailContent, function(error, info){
    if (error) {
      console.log('Email error: ');
      console.log(error);
      return false;
    } else {
      console.log('Email sent: ' + info.response);
      return true
    }
  }); // Send mail
}

exports.mailSettings =  mailSender