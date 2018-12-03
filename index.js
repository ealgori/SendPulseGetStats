var sendpulse = require("sendpulse-api");
let converter = require('json-2-csv');
var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));

var options = {
  delimiter: {
   // wrap: '"', // Double Quote (") character
    field: ';', // Comma field delimiter
    array: ';;', // Semicolon array value delimiter
    eol: '\n' // Newline delimiter
  },
  prependHeader: true,
  sortHeader: false,
  trimHeaderValues: true,
  trimFieldValues: false,
};

var campaignStats = [];
var capmaignPromises = [];



sendpulse.init(secrets.API_USER_ID, secrets.API_SECRET, secrets.TOKEN_STORAGE, function (token) {
  console.log('your token: ' + token)


  var listCampaign = function (data) {
    data.forEach((elem, index) => {
      capmaignPromises.push(new Promise((resolve, reject) => {
        sendpulse.getCampaignInfo(function (info) {
          resolve(info);
        }, elem.id);

      }));
    });
    Promise.all(capmaignPromises).then((results) => {
      var json2csvCallback = function (err, csv) {
        if (err) throw err;
        console.log(csv);
      }
      var stats = results.map(s=>{
        var stcs = s.statistics;
        var send = stcs.find(ss=>ss.code===1);
        var delivered = stcs.find(ss=>ss.code===2);
        var opened = stcs.find(ss=>ss.code===3);
        return {
          name: s.name,
          subject: s.message.subject,
          send_date: s.send_date,
          send: send?send.count:0,
          delivered: delivered?delivered.count:0,
          opened: opened?opened.count:0,

        };
      })
      converter.json2csv(stats, json2csvCallback,options);
    });
  };

  sendpulse.listCampaigns(listCampaign,10);
});