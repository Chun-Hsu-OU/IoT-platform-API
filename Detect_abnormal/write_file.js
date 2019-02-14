const fs = require('fs');
fs.writeFile("log_file", "Hey there!", function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
}); 
