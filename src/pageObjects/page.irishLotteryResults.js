const helpers = require("../helpers");

module.exports = class IrishLotteryPage {
  constructor(
    page,
    url = "https://www.lottery.ie/draw-games/results/view?game=lotto&draws=",
    draws = "0"
  ) {
    this.url = url + draws;
    this.page = page;
  }

  get resultsBlocks() {
    return this.page.$$(".ltr-results-outcome section");
  }

  async getDrawDate(resultBlock) {
    return await resultBlock.$("h4");
  }
  async getDrawResultsForSection(resultBlock) {
    return await resultBlock.$$(".draw-results");
  }
  async getRaffleResultsForSection(resultBlock) {
    return await resultBlock.$(".raffle-results");
  }

  async getJackpotForDraw(lotteryEle) {
    return lotteryEle.$('[data-test-id="winning_amount"]');
  }

  async getNumbersDrawnForDraw(lotteryEle) {
    return lotteryEle.$$(".winning-numbers .pick-number");
  }

  //Only applies to main lottery
  async getBonusNumberForDraw(lotteryEle) {
    return lotteryEle.$('[data-test-id="bonus_results"]');
  }

  async extractNumberValue(pickNumEle) {
    return await (await pickNumEle.$("label")).evaluate((el) => el.textContent);
  }

  async getPrizeTable(lotteryEle) {
    return lotteryEle.$('[data-test-id="prize_table"]');
  }

  async getNoteAboutPrizes(lotteryEle) {
    return lotteryEle.$(".winning-results p");
  }
  async getPrizeWinnerBreakdown(lotteryEle) {
    return lotteryEle.$$("table tbody tr");
  }

  async getPrizeWinnersDetailsForRow(prizeWinnerRow) {
    return prizeWinnerRow.$$("td");
  }

  async getRaffleNumberDrawn(raffleEle) {
    return raffleEle.$('[data-test-id="raffle_numbers"]');
  }

  async getRafflePrizeNote(raffleEle) {
    return raffleEle.$(".raffle-box p");
  }

  // ------------------------
  //         Methods
  // ------------------------

  async processAllResultsForDay(section) {
    let drawDate = await (
      await this.getDrawDate(section)
    ).evaluate((el) => el.textContent);
    drawDate = helpers.convertDateFormat(drawDate);
    const allDrawResults = await this.getDrawResultsForSection(section);
    const raffleResults = await this.getRaffleResultsForSection(section);

    let lotteryResults = [
      {
        type: "Irish Lottery",
        date: drawDate,
        details: await this.processLotteryResult(allDrawResults[0]),
      },
      {
        type: "Plus 1",
        date: drawDate,
        details: await this.processLotteryResult(allDrawResults[1]),
      },
      {
        type: "plus 2",
        date: drawDate,
        details: await this.processLotteryResult(allDrawResults[2]),
      },
      {
        type: "raffle",
        date: drawDate,
        details: await this.processRaffleNumber(raffleResults),
      },
    ];

    return lotteryResults;
  }

  async processLotteryResult(parentLotteryEle) {
    let lotteryResults = {};

    const jackpot = await (
      await this.getJackpotForDraw(parentLotteryEle)
    ).evaluate((el) => el.textContent);

    const allDrawnNumbers = await this.extractAllDrawnNumbers(parentLotteryEle);
    lotteryResults.numbersDrawn = allDrawnNumbers;
    lotteryResults.jackpot = jackpot;

    const resultDetails = await this.processWinnerStats(parentLotteryEle);
    // console.log(resultDetails);
    // Use object destructuring to get all key/value pairs from both objects into new object
    lotteryResults = { ...lotteryResults, ...resultDetails };
    if (lotteryResults.results.length > 0) {
      //if the first entry in lotteryResults.results is not 0 jackpot was won
      lotteryResults.wasWon =
        lotteryResults.results[0].winners != 0 ? true : false;
    } else {
      lotteryResults.wasWon = null;
    }
    return lotteryResults;
  }

  // the numbers are need to be extracted from the ball graphic elements they are stored in
  async extractAllDrawnNumbers(parentLotteryEle) {
    let winningNumbers = [];

    // Get main numbers
    const allDrawnNumbersEle = await this.getNumbersDrawnForDraw(
      parentLotteryEle
    );
    for (let i = 0; i < allDrawnNumbersEle.length; i++) {
      const num = await this.extractNumber(allDrawnNumbersEle[i]);
      winningNumbers.push(num);
    }

    // Get bonus ball
    const bonusNumEle = await this.getBonusNumberForDraw(parentLotteryEle);
    const bonusNum = await this.extractNumber(bonusNumEle);
    winningNumbers.push("b" + bonusNum);

    return winningNumbers;
  }

  async extractNumber(pickNumEle) {
    return await (await pickNumEle.$("label")).evaluate((el) => el.textContent);
  }

  async processWinnerStats(lotteryEle) {
    //Added this to check if prize winner details are available
    // not good practice
    try {
      await lotteryEle.waitForSelector('[data-test-id="prize_table"]', {
        timeout: 500,
      });
    } catch (error) {
      return { results: [] };
    }

    // now that we know prize details are available we process it
    const resultNote = await (
      await this.getNoteAboutPrizes(lotteryEle)
    ).evaluate((el) => el.textContent);
    const allWinningDetailsEle = await this.getPrizeWinnerBreakdown(lotteryEle);

    let resultsDetails = {
      results: [],
    };
    resultsDetails.note = resultNote.replace(/\n/g, "");
    for (let i = 0; i < allWinningDetailsEle.length; i++) {
      const entry = await allWinningDetailsEle[i];
      const detailsEle = await this.getPrizeWinnersDetailsForRow(entry);

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

  async processRaffleNumber(parentRaffleEle) {
    const raffleDrawEle = await this.getRaffleNumberDrawn(parentRaffleEle);
    const raffleNoteEle = await this.getRafflePrizeNote(parentRaffleEle);
    const raffleNumDrawn = (
      await raffleDrawEle.evaluate((el) => el.textContent)
    ).replace(/\n/g, "");
    const raffleNote = await raffleNoteEle.evaluate((el) => el.textContent);

    return {
      winningTicket: raffleNumDrawn,
      note: raffleNote,
    };
  }
};
