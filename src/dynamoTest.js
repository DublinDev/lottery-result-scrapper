// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
// Set the region
AWS.config.update({
  region: "eu-west-1",
  maxRetries: 15,
  retryDelayOptions: { base: 500 },
});

// Create the DynamoDB service object
var docClient = new AWS.DynamoDB.DocumentClient();

const addToTable = (entry, tableName = "lottery_results") => {
  const resultPrimaryKey =
    entry.type.toLowerCase().replace(" ", "_") + "_" + entry.date;

  var params = {
    TableName: tableName,
    Item: entry,
  };

  //add primary key
  params.Item.lottery_type_and_date = resultPrimaryKey;

  return new Promise((res, rej) => {
    docClient.put(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        rej();
      } else {
        console.log(`Successfully uploaded ${resultPrimaryKey} to DB`, data);
        res(data);
      }
    });
  });
};

const checkResultExistsInDb = (
  resultPrimaryKey,
  tableName = "lottery_results"
) => {
  var params = {
    TableName: tableName,
    Key: {
      lottery_type_and_date: resultPrimaryKey,
    },
  };

  return new Promise((resolve, reject) => {
    docClient.get(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        // console.log("Success", JSON.stringify(data, null, 2));
        resolve(data);
      }
    });
  });
};

const getAll = (tableName = "lottery_results") => {
  var params = {
    TableName: tableName,
    Key: {
      lottery_type_and_date: "*",
    },
  };

  return new Promise((resolve, reject) => {
    docClient.get(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        // console.log("Success", JSON.stringify(data, null, 2));
        resolve(data);
      }
    });
  });
};

module.exports = {
  addToTable,
  checkResultExistsInDb,
  getAll,
};
