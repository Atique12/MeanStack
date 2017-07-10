var express = require('express');
var app = express();
var ejs = require('ejs')
var port = process.env.PORT || 4533;
var bodyParser = require('body-parser');

//Multer is npm third party packege manager we do use for uploading file and store into the folder
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
var dbRouter = express.Router();
var mongodb = require('mongodb').MongoClient;


//Set Up Template Engine
app.set('view engine', 'ejs');
//static file
app.use(express.static('./public'));

app.use(bodyParser.json());
var storage = multer.diskStorage({ //multers disk storage settings
      destination: function (req, file, cb) {
            cb(null, './uploads/')
      },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
        }
    });
    var upload = multer({ //multer settings
                    storage: storage,
                    fileFilter : function(req, file, callback) { //file filter
                        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
                            return callback(new Error('Wrong extension type'));
                        }
                        callback(null, true);
                    }
                }).single('file');

    /** API path that will upload the files */
    app.post('/upload', function(req, res) {
        var exceltojson;
        upload(req,res,function(err){
            if(err){
                 res.json({error_code:1,err_desc:err});
                 return;
            }
            /** Multer gives us file info in req.file object */
            if(!req.file){
                res.json({error_code:1,err_desc:"No file passed"});
                return;
            }
            /** Check the extension of the incoming file and
             *  use the appropriate module
             */
            if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
                exceltojson = xlsxtojson;
            } else {
                exceltojson = xlstojson;
            }
            console.log(req.file.path);
            try {
                exceltojson({
                    input: req.file.path,
                    output: null, //since we don't need output.json
                    lowerCaseHeaders:true
                }, function(err,result){
                    if(err)
                    {
                        return res.json({error_code:1,err_desc:err, data: null});
                    }
                    var url = 'mongodb://localhost:27017/DBFracTest';
                    mongodb.connect(url, function(err, db) {
                        var collection = db.collection('ExcelFileData'); //If it does not exists MongoDB crates for us the collections
                         //Insert Data into mongodb
                         collection.insertMany(result, function(err, results){
                             res.send(results);
                             db.close();
                         });
                    });
                    //res.json({error_code:0,err_desc:null, data: result});
                });
            } catch (e){
                res.json({error_code:1,err_desc:"Corupted excel file"});
            }
        })

    });

    app.get('/', function(req, res) {
    	res.render('index')
    })


app.listen(port, function(err) {
    console.log('The server is listening the port Number:'+port);
});
