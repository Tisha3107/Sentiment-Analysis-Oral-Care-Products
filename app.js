const axios = require("axios");
const cheerio = require("cheerio");
const { createObjectCsvWriter } = require("csv-writer");

// CSV writer setup to append data
const csvWriter = createObjectCsvWriter({
  path: "customer_say_reviews.csv",
  append: true, // Append data to the existing file
  header: [
    { id: "product_name", title: "Product Name" },
    { id: "price", title: "Price" },
    { id: "title", title: "Title" }, // The title/criterion
    { id: "criteria", title: "Criteria" },
    { id: "positive_count", title: "Positive Count" },
    { id: "negative_count", title: "Negative Count" },
    { id: "mention_count", title: "Mention Count" },
    { id: "reviews", title: "Reviews" },
  ],
});

const scrapeAmazon = async (productUrl) => {
  try {
    // Fetch the HTML of the page
    const { data: html } = await axios.get(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(html);

    const insightsData = [];

    // Extract product name
    const productName = $("#productTitle").text().trim();

    // Extract price
    let price = $(".a-price-whole").first().text().trim();
    if (!price) price = "Not Available";

    // Extract "Customers Say" section
    const insightsSelector = $("#cr-product-insights-cards .a-box-inner");
    if (insightsSelector.length > 0) {
      insightsSelector.each((_, el) => {
        const criteria = $(el).find(".a-color-base").text().trim(); // Criteria name (e.g., Value for money)
        const title = $(el).find(".a-expander-header-content").text().trim(); // Extract title for each criterion

        const mentionCount =
          $(el).find('span:contains("mention")').text().match(/\d+/)?.[0] || 0; // Mentions count (like "55 mention")
        const positiveCount =
          $(el).find("._Y3Itc_text-positive_QRaJ2").text().trim() || 0; // Positive count
        const negativeCount =
          $(el).find("._Y3Itc_text-negative_zjq0Y").text().trim() || 0; // Negative count

        // Extract associated original reviews
        const reviews = [];
        $(el)
          .find(".a-section.a-spacing-base")
          .each((_, reviewEl) => {
            const reviewText = $(reviewEl).text().trim();
            reviews.push(reviewText);
          });

        insightsData.push({
          product_name: productName,
          price,
          title,
          criteria,
          mention_count: mentionCount,
          positive_count: positiveCount,
          negative_count: negativeCount,
          reviews: reviews.join(" | "), // Combine reviews into a single string
        });
      });
    } else {
      console.log('No "Customers Say" section found for this product.');
    }

    // Save data to CSV
    await csvWriter.writeRecords(insightsData);
    console.log(
      `Data for product "${productName}" saved to customer_say_reviews_may.csv`
    );
  } catch (error) {
    console.error("Error scraping Amazon:", error.message);
  }
};

// Example usage
const productUrls = [
  "https://www.amazon.in/dp/B0881YY2QJ/ref=sspa_mw_detail_1?ie=UTF8&psc=1&spc=MToyMjA3OTcwMzYxNTA4Njg4OjE3MzY1NzAyNTM6c3BfcGhvbmVfZGV0YWlsOjMwMDAwOTkwNDE0MjQzMjo6Ojo&sp_csd=d2lkZ2V0TmFtZT1zcF9waG9uZV9kZXRhaWwp13NParams",
  "https://www.amazon.in/dp/B0CJXXGHVS/?_encoding=UTF8&pd_rd_i=B0CJXXGHVS&ref_=sbx_be_s_sparkle_ssd_tt&qid=1736569497&pd_rd_w=c9zB9&content-id=amzn1.sym.1c3f6377-e9e7-4231-b06d-247ff644a657%3Aamzn1.sym.1c3f6377-e9e7-4231-b06d-247ff644a657&pf_rd_p=1c3f6377-e9e7-4231-b06d-247ff644a657&pf_rd_r=R2MA9HB9F1HHJNTBWE7Q&pd_rd_wg=qhJUX&pd_rd_r=aaccbd6c-9fda-4af7-b947-4963efc2aacf&pd_rd_plhdr=t",
];

// Add multiple product URLs here

(async () => {
  for (const url of productUrls) {
    console.log(`Scraping product at URL: ${url}`);
    await scrapeAmazon(url);
  }
})();
