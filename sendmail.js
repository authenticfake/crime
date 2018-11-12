
var nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');

function sendMail (transaction_id, side, params={}) {
	console.log("oneway*****")
	//var template = (side==='oneway')?"email-close-opportunity-template-oneway.hbs": "email-close-opportunity-template.hbs"
	var options = {
	    viewEngine: {
	        extname: '.hbs',
	        layoutsDir: 'email/',
	        defaultLayout : 'template'
	    },
	    viewPath: 'email/',
	    extName: '.hbs'
	 };



	var mailer = nodemailer.createTransport({
	     service: 'Gmail',
	     auth: {
        user: 'sqv.team@gmail.com',
        pass: 'smettoquandovoglio.1'
    },
	     
	     logger: true,
	     debug: false
	 });
	  
	mailer.use('compile', hbs(options));
	if (side==='oneway') {
		console.log("oneway")
		mailer.sendMail({
	    from: 'SQV Team',
	    to: 'andrea.franco@gmail.com, piergiorgio.ret@libero.it, dangelo.giovanni@gmail.com, andrea.manno83@gmail.com, leonardo979@gmail.com',
		cc: 'sqv.team@gmail.com',
        subject: 'Oppurtinity ID: '+ transaction_id + ' closed',
	    template: 'oneway_body',
	    context: params
	    
	}, function (error, response) {
	    console.log('mail sent to SQV');
	    mailer.close();
	});

	} else {
		 	mailer.sendMail({
		     from: 'SQV Team',
		     to: 'andrea.franco@gmail.com, piergiorgio.ret@libero.it, dangelo.giovanni@gmail.com, andrea.manno83@gmail.com, leonardo979@gmail.com',
		     cc: 'sqv.team@gmail.com',
		     subject: 'Oppurtinity ID: '+ transaction_id + ' closed',
		     template: 'roundtrip_body',
		     context: params
		     
		 }, function (error, response) {
		     console.log('mail sent to ' + to);
		     mailer.close();
		 });
	}
	
}

exports.sendMail=sendMail
