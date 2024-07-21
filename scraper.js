// scraper.js
const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

// Function to scrape albums from a given URL and page number
const scrapeAlbumPage = async (url, page) => {
    try {
        const { data } = await axios.get(`${url}${page}`);
        const $ = cheerio.load(data);

        const albums = [];
        $('#list_albums_common_albums_list_items .item').each((index, element) => {
            const albumTitle = $(element).find('.title').text().trim();
            const albumPhotos = $(element).find('.photos').text().trim();
            const albumRating = $(element).find('.rating').text().trim();
            const albumAdded = $(element).find('.added em').text().trim();
            const albumViews = $(element).find('.views').text().trim();
            const albumImgSrc = $(element).find('.thumb').attr('src');
            const url = $(element).find('a').attr('href');

            albums.push({
                title: albumTitle,
                photos: albumPhotos,
                rating: albumRating,
                added: albumAdded,
                views: albumViews,
                imgSrc: albumImgSrc,
                url: url,
            });
        });

        return albums;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null; // Return null if page not found (404)
        }
        throw error; // Throw other errors
    }
};

const scrapeImages = async (baseUrl) => {
    let images = [];

    const url = `${baseUrl}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    $('.thumbwook').each((index, element) => {
        const img = $(element).find('img');
        const imageUrl = img.attr('data-src');
        const width = img.attr('width');
        const height = img.attr('height');

        images.push({
            url: imageUrl,
            width: parseInt(width),
            height: parseInt(height),
            index: index
        });
    });
    return images;
};
const downloadImage = async (url, onProgress) => {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            maxRedirects: 5,
            onDownloadProgress: (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(progress);
            }
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

const scrapeAlbumPages = async (url) => {
    let albums = [];
    for (let i = 1; ; i++) {
        const albumPage = await scrapeAlbumPage(url, i);
        if (!albumPage) break;
        albums = albums.concat(albumPage);
    }
    return albums
}

// Function to scrape model details from a given URL
const scrapeModelPage = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const name = $('.headline h2').text();

        let albums = [];
        for (let i = 1; ; i++) {
            const albumPage = await scrapeAlbumPage(url, i);
            if (!albumPage) break;
            albums = albums.concat(albumPage);
        }

        return {
            name,
            model,
            albums,
        };
    } catch (error) {
        throw error;
    }
};
baseUrl = 'https://www.pornpics.com/pornstars/'; // Replace with the actual base URL
const startPage = 1;
const endPage = 506;
let indexValue = 0;

const scrapePage = async (pageNumber) => {
    const url = `${baseUrl}${pageNumber}`;
    console.log(`Scraping page ${url}`);

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const data = [];

    $('.thumbwook').each((index, element) => {
        const name = $(element).find('.rel-link').attr('title');
        const href = $(element).find('.rel-link').attr('href');
        const image = $(element).find('img').attr('data-src');
         indexValue = indexValue++;

        data.push({ name, href,image , index: indexValue });
    });

    return data;
};

const scrapeAllPages = async () => {
    const allData = [];

    for (let page = startPage; page <= endPage; page++) {
        console.log(`Scraping page ${page}`);
        const pageData = await scrapePage(page);
        allData.push(...pageData);
    }

    fs.writeFileSync('data.json', JSON.stringify(allData, null, 2));
};

// Function to scrape data and construct the desired JSON format
async function scrapeAlbumAndFormatData(model) {
    let parts = model.url.split('/');
    parts.pop()
    let modelqry = parts.pop();
    modelqry = modelqry.replace(/-/g, '+'); 
    const baseUrl = "https://www.pornpics.com/search/srch.php";
    const queryParams = {
        q: modelqry,
        date: "latest",
        lang: "en",
        limit: 50
    };
    
    let offset = 0;
    let albums = [];
    while (true) {
        queryParams.offset = offset;
        try {
            const response = await axios.get(baseUrl, { params: queryParams });
            
            // Assuming response.data is an array of models, adjust as per actual response structure
            let models = response.data;
            
            if (models.length === 0) {
                break; // No more data available
            }
            
            models.forEach((model, index) => {
                    models[index] = parseJSON(model);
            });
            models = models.filter(model => model.url.includes("https://www.pornpics.com/"))
            albums.push(...models); // Accumulate models data
            
            offset += 50; // Increment offset for next request, assuming limit is 50
        } catch (error) {
            console.error(`Error fetching data: ${error.message}`);
            break; // Exit loop on error
        }
    }
    model.albums = albums
    return model;
}
function parseJSON(album) {
    return {
        imgSrc: album.t_url,
        title: album.desc,
        url: album.g_url
    };
}


module.exports = { scrapeAlbumPages, scrapeModelPage, scrapePage, scrapeImages, downloadImage, scrapeAlbumAndFormatData};
