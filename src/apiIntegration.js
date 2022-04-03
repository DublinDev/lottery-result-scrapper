const axios = require("axios");

const addResult = (result, tableName = "lottery_result") => {
  const params = {
    Table: "lottery_results",
    Item: result,
  };

  if (!result.hasOwnProperty("lottery_type_and_date")) {
    const resultPrimaryKey =
      result.type.toLowerCase().replace(" ", "_") + "_" + result.date;

    //add primary key
    params.Item.lottery_type_and_date = resultPrimaryKey;
  }
  try {
    return axios.default
      .post(process.env.LOTTERY_API + tableName, params)
      .then((res) => {
        return res;
      });
  } catch (e) {
    console.log(e);
    return { err: e };
  }
};

module.exports = {
  addResult,
};
