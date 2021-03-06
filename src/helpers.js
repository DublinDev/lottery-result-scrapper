const fs = require("fs");
const path = require("path");

const resultsPath = path.join(__dirname, "../results");

function countDaysInYear(yearToDate, day) {
  let d = new Date(`1-1-${yearToDate}`),
    year = d.getFullYear(),
    days = ["mon", "tues", "wed", "thurs", "fri", "sat", "sun"],
    daysFound = [];

  // Get the first Monday in the month
  while (d.getDay() !== days.indexOf(day) + 1) {
    d.setDate(d.getDate() + 1);
  }

  // Get all the other wednesdays
  while (d.getFullYear() === year) {
    daysFound.push(`${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`);
    d.setDate(d.getDate() + 7);
  }

  return daysFound;
}

function getDatesForAllWednesdaysAndFridaysInYears() {
  const wednesdaysIn2021 = countDaysInYear("2021", "wed");
  const fridaysIn2021 = countDaysInYear("2021", "sat");
  const wednesdaysIn2020 = countDaysInYear("2020", "wed");
  const fridaysIn2020 = countDaysInYear("2020", "sat");

  return wednesdaysIn2021.concat(
    fridaysIn2021,
    wednesdaysIn2020,
    fridaysIn2020
  );
}

function findDatesMissingFromDataset(allLotteryResultObjs) {
  let datesOfAllDraws = getDatesForAllWednesdaysAndFridaysInYears();

  // filter out all the dates for which we have the draws for
  const missingDates = datesOfAllDraws.filter((date) => {
    //if date is not found leave it in
    return !allLotteryResultObjs.find((result) => {
      const d = result.drawDate[0] === "0" ? result.drawDate.substring(1) : result.drawDate;
      return d === date;
    });
  });

  console.log(
    "# of dates checked" +
      datesOfAllDraws.length +
      "->" +
      missingDates.length +
      "(missing days of results missing for last 2 years of results)"
  );
  // console.log(missingDates);
  return missingDates;
}

// restructure the date into a d-m-y format
function convertDateFormat(date) {
  let splitted = date.split(" ");
  const year = splitted[3];
  const month = new Date(date).getMonth() + 1;
  const day = splitted[1];

  return `${day}-${month}-${year}`;
}

function combineFiles() {
  const allFiles = fs.readdirSync(resultsPath);
  let allEntries = [];

  for (let i = 0; i < allFiles.length; i++) {
    const fileName = allFiles[i];
    const data = require(`${resultsPath}/${fileName}`);
    // console.log(fileName + " - " + data.length + " results");

    for (let j = 0; j < data.length; j++) {
      const result = data[j];
      const isFound = () => {
        return allEntries.find((storedResult) => {
          return (
            storedResult.lotteryType === result.lotteryType &&
            storedResult.drawDate === result.drawDate
          );
        });
      };
      if (!isFound()) {
        allEntries.push(result);
        // } else {
        // 	console.log(`duplicate ${result.type}-${result.date}`);
      }
    }
  }

  fs.writeFileSync(
    resultsPath + "/all-results.json",
    JSON.stringify(allEntries, null, 2)
  );
}

module.exports = {
  countDaysInYear,
  getDatesForAllWednesdaysAndFridaysInYears,
  findDatesMissingFromDataset,
  convertDateFormat,
  combineFiles,
};
