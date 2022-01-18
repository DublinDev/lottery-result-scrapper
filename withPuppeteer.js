const fs = require("fs");
const puppeteer = require("puppeteer");
const helper = require("./helpers");

const urls = [
  "https://www.lottery.ie/draw-games/results/view?game=lotto&draws=0",
  "http://web.archive.org/web/20211013192521/https://www.lottery.ie/draw-games/results/view?game=lotto&draws=0", //2021_july17_oct13
  "http://web.archive.org/web/20210304212901/https://www.lottery.ie/draw-games/results/view?game=lotto&draws=0", //2020_dec5_2021_mar3
  "http://web.archive.org/web/20200924045552/https://www.lottery.ie/draw-games/results/view?game=lotto&draws=0", //2020_mar28_sep23
  "https://web.archive.org/web/20210510011837/https://www.lottery.ie/draw-games/results/view?game=lotto&draws=0", //2021_feb10_may8
  "http://web.archive.org/web/20201128021355/https://www.lottery.ie/draw-games/results/view?game=lotto&draws=0", //2020_nov25_jun3
  "http://web.archive.org/web/20201002020430/https://www.lottery.ie/draw-games/results/view?game=lotto&draws=0", //2020_april4_sep30
  "https://web.archive.org/web/20210510021605/https://www.lottery.ie/draw-games/results/view?game=lotto&draws=8", //2021_april14-may8
];

// if results directory doesn't exist create it
fs.existsSync('./results/') || fs.mkdirSync('./results/');

(async () => {
  for (let j = 0; j < urls.length; j++) {
    console.log('Processing file'+(j+1));
    const url = urls[j];
    let allLotteries = [];

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120 * 1000);
    await page.goto(url);

    // Result blocks represent all draws on a particular date,
    // one result page has multiple result blocks
    const resultBlocks = await page.$$(".ltr-results-outcome section");

    // Iterate over all result blocks and process results
    for (let i = 0; i < resultBlocks.length; i++) {
      const wholeDraw = await processAllResultsForDay(resultBlocks[i]);
      allLotteries.push(...wholeDraw);
    }

    await fs.writeFileSync(
      `./results/lotteryResults-${j + 1}.json`,
      JSON.stringify(allLotteries, null, 2)
    );

    await browser.close();
  }

  helper.combineFiles();
  helper.findDatesMissingFromDataset(
    require("./results/all-results.json")
  );
})();


// -----------------------------
//         FUNCTIONS
// -----------------------------


async function processAllResultsForDay(section) {
  let drawDate = await (await section.$("h4")).evaluate((el) => el.textContent);
  drawDate = helper.convertDateFormat(drawDate);
  const allDrawResults = await section.$$(".draw-results");
  const raffleResults = await section.$(".raffle-results");

  let lotteryResults = [
    {
      type: "Irish Lottery",
      date: drawDate,
      details: await processLotteryResult(allDrawResults[0]),
    },
    {
      type: "Plus 1",
      date: drawDate,
      details: await processLotteryResult(allDrawResults[1]),
    },
    {
      type: "plus 2",
      date: drawDate,
      details: await processLotteryResult(allDrawResults[2]),
    },
    {
      type: "raffle",
      date: drawDate,
      details: await processRaffleNumber(raffleResults),
    },
  ];

  return lotteryResults;
}

async function processLotteryResult(parentLotteryEle) {
  let lotteryResults = {};

  const jackpot = await (
    await parentLotteryEle.$('[data-test-id="winning_amount"]')
  ).evaluate((el) => el.textContent);

  const allDrawnNumbers = await extractAllDrawnNumbers(parentLotteryEle);
  lotteryResults.numbersDrawn = allDrawnNumbers;
  lotteryResults.jackpot = jackpot;

  const resultDetails = await processWinnerStats(parentLotteryEle);

  // Use object destructuring to get all key/value pairs from both objects into new object
  lotteryResults = { ...lotteryResults, ...resultDetails };
  if (lotteryResults.results) {
    //if the first entry in lotteryResults.results is not 0 jackpot was won
    lotteryResults.wasWon =
      lotteryResults.results[0].winners != 0 ? true : false;
  } else {
    lotteryResults.wasWon = null;
  }
  return lotteryResults;
}

// the numbers are need to be extracted from the ball graphic elements they are stored in
async function extractAllDrawnNumbers(parentLotteryEle) {
  let winningNumbers = [];

  // Get main numbers
  const allDrawnNumbersEle = await parentLotteryEle.$$(
    ".winning-numbers .pick-number"
  );
  for (let i = 0; i < allDrawnNumbersEle.length; i++) {
    const num = await extractNumber(allDrawnNumbersEle[i]);
    winningNumbers.push(num);
  }

  // Get bonus ball
  const bonusNumEle = await parentLotteryEle.$(
    '[data-test-id="bonus_results"]'
  );
  const bonusNum = await extractNumber(bonusNumEle);
  winningNumbers.push("b" + bonusNum);

  return winningNumbers;
}

async function extractNumber(pickNumEle) {
  return await (await pickNumEle.$("label")).evaluate((el) => el.textContent);
}

async function processWinnerStats(lotteryEle) {
  //Added this to check if prize winner details are available
  // not good practice
  try {
    await lotteryEle.waitForSelector('[data-test-id="prize_table"]', {
      timeout: 500,
    });
  } catch (error) {
    return { results: null };
  }

  // now that we know prize details are available we process it
  const resultNote = await (
    await lotteryEle.$(".winning-results p")
  ).evaluate((el) => el.textContent);
  const allWinningDetailsEle = await lotteryEle.$$("table tbody tr");

  let resultsDetails = {
    results: [],
  };
  resultsDetails.note = resultNote.replace(/\n/g, "");

  for (let i = 0; i < allWinningDetailsEle.length; i++) {
    const entry = allWinningDetailsEle[i];
    const detailsEle = await entry.$$("td");

    resultsDetails.results.push({
      match: (await detailsEle[0].evaluate((el) => el.textContent)).replace(
        /\n/g,
        ""
      ),
      winners: await detailsEle[1].evaluate((el) => el.textContent),
      prize: (await detailsEle[2].evaluate((el) => el.textContent)).replace(
        /\n/g,
        ""
      ),
    });
  }

  return resultsDetails;
}

async function processRaffleNumber(parentRaffleEle) {
  const raffleDrawEle = await parentRaffleEle.$(
    '[data-test-id="raffle_numbers"]'
  );
  const raffleNoteEle = await parentRaffleEle.$(".raffle-box p");
  const raffleNumDrawn = (
    await raffleDrawEle.evaluate((el) => el.textContent)
  ).replace(/\n/g, "");
  const raffleNote = await raffleNoteEle.evaluate((el) => el.textContent);

  return {
    winningTicket: raffleNumDrawn,
    note: raffleNote,
  };
}
