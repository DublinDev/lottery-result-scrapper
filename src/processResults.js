// default modules
const fs = require("fs");
const path = require("path");

// installed packages
const puppeteer = require("puppeteer");

// files
const helper = require("./helpers");
const { irishLotteryUrl, irishLotteryUrls_legacy } = require("../data/urls");
const { addToTable } = require("./dynamoTest");

const IrishLotteryPage = require("./pageObjects/page.irishLotteryResults");

let uploadQueue = [];
const resultsPath = path.join(__dirname, "../results");

// if results directory doesn't exist create it
fs.existsSync(resultsPath) || fs.mkdirSync(resultsPath);

(async () => {
  for (let j = 0; j < irishLotteryUrl.length; j++) {
    console.log("Processing file" + (j + 1));
    const url = irishLotteryUrl[j];
    let allLotteries = [];

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120 * 1000);
    await page.goto(url);

    const irishLotteryPage = new IrishLotteryPage(page, url);
    const resultBlocks = await irishLotteryPage.resultsBlocks;

    // Iterate over all result blocks and process results
    for (let i = 0; i < resultBlocks.length; i++) {
      let wholeDraw = await irishLotteryPage.processAllResultsForDay(
        resultBlocks[i]
      );

      allLotteries.push(...wholeDraw);
    }

    for (let i = 0; i < allLotteries.length; i++) {
      const result = allLotteries[i];
      uploadQueue.push(addToTable(result));
    }

    // write to file
    // await fs.writeFileSync(
    //   resultsPath + `/lotteryResults-${j + 1}.json`,
    //   JSON.stringify(allLotteries, null, 2)
    // );

    await Promise.all(uploadQueue);
    await browser.close();
  }

  // Merge files
  // helper.combineFiles();
  // helper.findDatesMissingFromDataset(
  //   require(resultsPath + "/all-results.json")
  // );
})();
