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

var capmaignPromises = [];



sendpulse.init(secrets.API_USER_ID, secrets.API_SECRET, secrets.TOKEN_STORAGE, async (token) => {
  console.log('your token: ' + token)


  var listCampaign = (data) => {
    data.forEach((elem) => {
      capmaignPromises.push(new Promise((resolve, reject) => {
        sendpulse.getCampaignInfo(function (info) {
          resolve(info);
        }, elem.id);
      }));
    });

  };

  for (let i = 0; i < 1; i++) {
    await (new Promise((res, rej) => {
      sendpulse.listCampaigns((result) => {
        listCampaign(result);
        res();
      },
      100, // count to get (max 100)
      i * 100 // count to skip
      );
    }))

  }


  
    Promise.all(capmaignPromises).then((results) => {
      var json2csvCallback = async (err, csv) => {
        if (err) throw err;
        await fs.writeFile('\campaign.csv', csv)
        console.log(csv);
      }
      var stats = results.map(s => {
        var stcs = s.statistics;
        if (!stcs)
          return {
            name: s.name,
            subject: s.message.subject,
            send_date: s.send_date,
            send: 0,
            delivered: 0,
            opened: 0,
          };
        var send = stcs.find(ss => ss.code === 1);
        var delivered = stcs.find(ss => ss.code === 2);
        var opened = stcs.find(ss => ss.code === 3);
        return {
          name: s.name,
          subject: s.message.subject,
          send_date: s.send_date,
          send: send ? send.count : 0,
          delivered: delivered ? delivered.count : 0,
          opened: opened ? opened.count : 0,
        };
      });
      converter.json2csv(stats, json2csvCallback, options);
    });
});