# lottery-result-scrapper
A repo to scrape and compile the lottery results for various lotteries.
The lottery site only stores results for a certain amount of time (currently 90 days).

This repo should help complie existing results and record new results in a easily parsable JSON format to gather some interesting data on pervious results.

Results to date are available here https://lottery-files.s3.eu-west-1.amazonaws.com/all-results.json


# Getting Started
1. Clone repo 
2. Run npm install from directory to install dependacies
3. Run node withPuppeteer.js to gather the data for the urls in that file
4. Results files for each URL are stored in a created Results/ folder
5. Finally all those results files are merged into a single result file 
6. Manually upload file to S3

# Gathering old results
I used an internet archive called The Wayback Machine (https://archive.org/web/) to view past versions of the lottery results page. 
These pages were opened using puppeteer and the relevent information extracted out and merged into one long results file.

# Example of results page
![image](https://user-images.githubusercontent.com/16609581/150023115-1a95aec5-188c-4228-af80-7151ca5d8f82.png)


# Future plans
* Modularise existing functions into a class. This will allow for different files to be created to process different lottery results such as the 
euromillions and daily millions draws.
* Store results in a online db or individual files on S3 instead of single large file
* Create some API to allow people to query the data easily
* Create Docker Image and configure AWS Lambda to run at regular intervals to get and store new results
