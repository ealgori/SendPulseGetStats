var sendpulse = require("sendpulse-api");
let converter = require('json-2-csv');
var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));

var options = {  //<--- options for json to csv transformation
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

sendpulse.init(secrets.API_USER_ID, secrets.API_SECRET, secrets.TOKEN_STORAGE, async (token) => {
  console.log('your token: ' + token)

  let has_data = true;
  let counter = 0;
  let campaign_ids = [];
  let page_size = 100;
  let limit = 300; // <--- change campaign count there
  let skip_init=0; // <--- change inin skip there 
  console.log(`Getting campaign infos...(${skip_init}..${limit})`);
  do {
    var data = await new Promise((resolve) => {
      sendpulse.listCampaigns((result) => resolve(result), page_size, counter * page_size+skip_init);
    });

    if (!data || data.length === 0 || campaign_ids.length >= limit)
      has_data = false;
    else {
      campaign_ids = campaign_ids.concat(data.map(c => c.id));
      ++counter;
      console.log(campaign_ids.length);
    }
  }
  while (has_data)

  let progress = 0;
  let lastProgress=0;
  let campaign_stats_promises = [];
  console.log("Geting campaing statistics...");
  campaign_ids.forEach(async (id) => {
    campaign_stats_promises.push(new Promise((resolve) => {
      sendpulse.getCampaignInfo((info) => {
        ++progress;
        let progressProc = Math.round(progress * 100 / campaign_ids.length);
        if(progressProc-lastProgress>=10)
        {
          lastProgress=progressProc;
          console.log(progressProc + "%...");
        }

        var stcs = info.statistics;
        let stat = {};
        var send = stcs ? stcs.find(ss => ss.code === 1) : undefined;
        var delivered = stcs ? stcs.find(ss => ss.code === 2) : undefined;
        var opened = stcs ? stcs.find(ss => ss.code === 3) : undefined;
        stat = {
          name: info.name,
          subject: info.message.subject,
          send_date: info.send_date,
          send: send ? send.count : 0,
          delivered: delivered ? delivered.count : 0,
          opened: opened ? opened.count : 0,
        };

        return resolve(stat);
      },
        id)
    }))
  });

  await Promise.all(campaign_stats_promises).then((stats) => {
    converter.json2csv(stats, async (err,csv)=>{
      if (err) throw err;
      await fs.writeFile('\campaign.csv', csv, (err)=>{if(err)console.log(err);})
      console.log(csv);
    }, options)
  }
  );
});