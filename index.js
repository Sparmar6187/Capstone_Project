// import dependencies
const express = require('express');
const req = require('express/lib/request');
const path = require('path');
const myApp = express();
const session = require('express-session');

// Setup DB Connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://0.0.0.0:27017/Travel_Blog', {
    UseNewUrlParser: true,
    UseUnifiedTopology: true
});

// Setup Database Model
const Order = mongoose.model('Travellers',{
    name : String, 
    email : String,
    phone : String,
    interest : String
});

// Setup Database Model
const destination = mongoose.model('Destinations',{
    des_name : String, 
    des_price : String
});

const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

const Blogger = mongoose.model('Blogger', {
    username: String,
    password: String
});

// Setup Session
myApp.use(session({
    secret: "thisismyrandomkeysuperrandomsecret",
    resave: false,
    saveUninitialized: true
}));

// Create Object Destructuring for Express Validator
const {check, validationResult} = require ('express-validator');

// Express Body-Parser
myApp.use(express.urlencoded({extended:true}));

//Set path to public and views folder.
myApp.set('views', path.join(__dirname, 'views'));
myApp.use (express.static(__dirname + '/public'));
myApp.set('view engine', 'ejs');

//------------------- Validation Functions --------------------

var phoneRegex = /^[0-9]{3}\-?[0-9]{3}\-?[0-9]{4}$/; // 123-123-1234 OR 1231231234
var positiveNumber = /^[1-9][0-9]*$/;

function checkRegex(userInput, regex)
{
    if (regex.test(userInput))
        return true;
    else   
        return false;
}

function customPhoneValidation(value)
{
    if (!checkRegex(value, phoneRegex))
    {
        throw new Error ('Please enter correct format: 123-123-1234!');
    }
    return true;
}

function customLunchAndTicketValidations (lunch, {req})
{
    var tickets = req.body.tickets;
    if (!checkRegex(tickets,positiveNumber))
    {
        throw Error ('Please select tickets and tickets must be a positive number!');
    }
    else
    {
        tickets = parseInt(tickets);
        if (tickets < 3 && lunch != 'yes')
        {
            throw Error ('Lunch is required, if you buy less than 3 tickets!');
        }
    }
    return true;
}

//------------------- Set up different routes (pages) --------------------

// Root Page
myApp.get('/', function(req, res){
    res.render('travel'); // No need to add .ejs extension to the command.
});

// Render the form
myApp.get('/traveller_details', function(req, res) {
    res.render('traveller_details');
});

myApp.get('/add_destinations', function(req, res) {
    res.render('add_destinations');
});

myApp.get('/user_review', function(req, res) {
    res.render('user_review');
});

myApp.get('/travel', function(req, res) {
    res.render('travel');
});

myApp.get('/transport', function(req, res) {
    res.render('transport');
});

myApp.get('/edit', function(req, res) {
    res.render('edit');
});

// Handle form submission
myApp.post('/add_destinations', [
    check ('des_name', 'Name is required!').notEmpty(),
],function(req, res){

    const errors = validationResult(req);
    console.log(errors);

    if (!errors.isEmpty())
    {
        res.render('add_destinations', {errors : errors.array()});
    }

    else 
    {
		// No errors
        var des_name = req.body.des_name;
        var des_price = req.body.des_price;
        
        var pageData = {
            des_name : des_name, 
            des_price : des_price,
            
        };

        // Save the form data into Database
        var new_des = new destination(pageData);
        new_des.save().then(function() {        
            console.log("Destination details added!");
            res.render('editsuccess', pageData); 
            
            
        }).catch(function (x) {
            console.log(`Error: ${x}`);
            res.render('add_destinations', {errors: [{msg: 'An error occurred while saving the form data.'}]});
        });
    }
});

myApp.get('/update_data', function(req, res){
    // If session exists, then access All Orders Page.
    if (req.session.userLoggedIn)
    {
        // Read documents from MongoDb
        destination.find({}).exec(function (err, ordersValue){
            console.log(`Error: ${err}`);
            console.log(`Orders Value:: ${ordersValue}`);
            res.render('update_data', {ordersKey: ordersValue}); // No need to add .ejs extension to the command.
        })
    }
    // Otherwise redirect user to login page.
    else
        res.redirect('/admin_panel');
    
});



// Login Page
myApp.get('/admin_panel', function(req, res) {
    res.render('admin_panel');
});

myApp.get('/Blogger_Panel', function(req, res) {
    res.render('Blogger_Panel');
});

// Login Page
myApp.get('/login', function(req, res) {
    res.render('login');
});

// Blogger Login Page
myApp.get('/Blogger_Login', function(req, res) {
    res.render('Blogger_Login');
});


// Login Page
myApp.post('/login', function(req,res) {
    var user = req.body.username;
    var pass = req.body.password;
    console.log(`Username is: ${user}`);
    console.log(`Password is: ${pass}`);

    Admin.findOne({username:user, password: pass}).exec(function(err, admin) {
        console.log(`Error is: ${err}`);
        console.log(`Admin is: ${admin}`);
        if (admin)
        {
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            res.redirect('/admin_panel');
        }
        else
        {
            res.render('login', {error: "Sorry login failed. Please try again!"});
        }
    });

});

myApp.post('/Blogger_Login', function(req,res) {
    var user = req.body.username;
    var pass = req.body.password;
    console.log(`Username is: ${user}`);
    console.log(`Password is: ${pass}`);

    Blogger.findOne({username:user, password: pass}).exec(function(err, blogger) {
        console.log(`Error is: ${err}`);
        console.log(`Admin is: ${blogger}`);
        if (blogger)
        {
            req.session.username = blogger.username;
            req.session.userLoggedIn = true;
            res.redirect('/Blogger_Panel');
        }
        else
        {
            res.render('Blogger_Login', {error: "Sorry login failed. Please try again!"});
        }
    });

});


// Logout Page


myApp.get('/logout', (req,res) => {
    // Remove Stored Session and redirect user to login page.
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.render('login', {error: 'Successfully logged out!'});
});


// Edit/Update Page
myApp.get('/edit/:id', (req,res) => {
    // Check if session exists.
    if (req.session.userLoggedIn)
    {
        // Read object from MongoDb to Edit.
        var id = req.params.id;
        console.log(`Object Id: ${id}`);
        destination.findById({_id : id}).exec(function(err, order) {
            console.log(`Error: ${err}`);
            console.log(`Order: ${order}`);
            if (order)
                res.render('edit', {order : order});
            else
                res.send ('No data found with this id....!');
        });
    }
    // Otherwise redirect user to login page.
    else
        res.redirect('/admin_panel');
});

// Edit Page - Post Method
myApp.post('/edit/:id', [], function(req, res) {
    // check for errors
    const errors = validationResult(req);
    console.log(errors);

    if (!errors.isEmpty()) {
        // Edit and display errors if any.
        var id = req.params.id;
        console.log(`Object Id: ${id}`);
        destination.findById({ _id : id }).exec(function(err, dest) {
            console.log(`Error: ${err}`);
            console.log(`Destination: ${dest}`);
            if (dest)
                res.render('edit', { destination: dest, errors: errors.array() });
            else
                res.send('No destination found with this id....!');
        });
    } else {
        var des_name = req.body.des_name;
        var des_price = req.body.des_price;
        
        var pageData = {
            des_name : des_name, 
            des_price : des_price,
        };


        // Update MongDb with Existing (Modified) Data. 
        var id = req.params.id;
        destination.findByIdAndUpdate({ _id: id }).exec(function(err, dest) {
            dest.des_name = des_name; 
            dest.des_price = des_price;
    
            dest.save();
        });

        // Display the output: Updated Information
        res.render('editsuccess', pageData); 
    }
});


myApp.get('/author', function(req, res){
    res.render('author', {
        studentName: "admin",
        studentNumber: "32456"
    }); // No need to add .ejs extension to the command.
});

myApp.listen(8080);
console.log('Everything executed fine... Open http://localhost:8080/');