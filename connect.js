const mongoose = require("mongoose");

function connectToMongoDB(url){
    mongoose.connect(url);
}

module.exports = {connectToMongoDB};