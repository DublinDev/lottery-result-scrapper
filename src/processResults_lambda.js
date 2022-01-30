// installed packages
const puppeteer = require("puppeteer");

// files
const helper = require("./helpers");
const { urls } = require("../data/urls");
const { addToTable } = require("./dynamoTest");

const IrishLotteryPage = require("./pageObjects/page.irishLotteryResults");

const url = "https://www.lottery.ie/draw-games/results/view?game=lotto&draws=2";
let uploadQueue = [];

async function scrapFromLambda(url) {
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

    //upload all files
    wholeDraw.forEach((res) => {
      uploadQueue.push(addToTable(res));
    });

    allLotteries.push(...wholeDraw);
  }

  await browser.close();
  return allLotteries;
}


exports.handler = async () => {
  const res = await scrapFromLambda(url);
  console.log(res);
  await Promise.all(uploadQueue);
};
