const dayjs = require("dayjs");
const pup = require("puppeteer");
const { Parser } = require("json2csv");
const fs = require("fs");
const prompt = require("prompt-sync")({ sigint: true });

const getDataFromPage = async (page) => {
  const titles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".mCBkyc")).map((el) => {
      return el.innerHTML;
    });
  });
  const dates = (
    await page.evaluate(() => {
      return Array.from(document.querySelectorAll("div.OSrXXb > span")).map(
        (el) => {
          return el.innerHTML;
        }
      );
    })
  ).map((day) => {
    const extractedDate = day.split(" ");
    const days = parseInt(extractedDate[0]);
    const duration = extractedDate[1];
    const date = dayjs().subtract(days, duration).format("DD-MM-YYYY");
    return date;
  });

  return titles.map((title, i) => ({ title, date: dates[i] }));
};

(async () => {
  try {
    const stockName = prompt("What's the stock, you're looking for? : ");
    const browser = await pup.launch({ headless: true });
    const page = await browser.newPage();
    const searchUrl = `https://www.google.co.in/search?q=${stockName.toUpperCase()}&tbm=nws`;
    await page.goto(searchUrl);
    let pageNum = 0; // to get which page bot is on
    const extractedData = [];
    let nextBtn = await page.$("a#pnnext"); // look for next page btn

    while (nextBtn) {
      pageNum += 1;
      console.clear();
      console.log("currently on page: ", pageNum);
      const data = await getDataFromPage(page);
      extractedData.push(...data);
      await nextBtn.click();
      await page.waitForNavigation();
      nextBtn = await page.$("a#pnnext");
    }

    const lastPageData = await getDataFromPage(page);
    extractedData.push(...lastPageData);

    const fields = ["title", "date"];
    const parser = new Parser({ fields });
    const csv = parser.parse(extractedData);
    fs.writeFileSync(`${stockName}.csv`, csv);
    console.log(`Extracted ${extractedData.length} data points`);
  } catch (error) {
    console.error(error.message);
  }
})();
