const { scrapeModelPage, scrapeAlbumAndFormatData, scrapeAlbumPages, scrapeImages, downloadImage } = require('./scraper');
const { saveModelsToJson, loadModelsFromJson, filterModels, filterModelbyId } = require('./fileHandler');
const { cacheData, getCachedData } = require('./cache');
const { storeZipInMemory, zipStorage } = require('./zipHandler');
const { storeModelDataInSupabase, getMostDownloadedModels } = require('./supabase');
const JSZip = require('jszip');
const fs = require('fs');


const scrapeModel = async (ctx) => {
    const { id } = ctx.request.body;
    const cacheKey = `model_${id}`;
    const cachedData = getCachedData(cacheKey);

    if (cachedData) {
        ctx.body = cachedData;
        return;
    }

    try {
        let models = await loadModelsFromJson();
        const model = filterModelbyId(id, models);
        if (model) {
            const modelsData = await scrapeAlbumAndFormatData(model);
            ctx.body = modelsData;
            cacheData(cacheKey, modelsData, 3600000);
        } else {
            ctx.body = { error: "Not found" };
        }
    } catch (error) {
        ctx.status = error.response && error.response.status === 404 ? 404 : 500;
        ctx.body = { error: error.message };
    }
};

const downloadModel = async (ctx) => {
    const { url } = ctx.request.body;
    try {
        const modelsData = await scrapeModelPage(url);
        saveModelsToJson(modelsData);
        ctx.body = modelsData;
    } catch (error) {
        ctx.status = error.response && error.response.status === 404 ? 404 : 500;
        ctx.body = { error: error.message };
    }
};

const upload = async (ctx) => {
    const file = ctx.request.files.file;

    if (!file) {
        ctx.status = 400;
        ctx.body = 'No file uploaded';
        return;
    }

    try {
        const fileData = fs.readFileSync(file.filepath);

        const zip = new JSZip();
        const zipContent = await zip.loadAsync(fileData);
        const extractedFiles = {};

        for (const fileName in zipContent.files) {
            if (zipContent.files[fileName].dir) continue;
            const fileData = await zipContent.files[fileName].async('nodebuffer');
            extractedFiles[fileName] = fileData;
        }

        const newZip = new JSZip();
        for (const [fileName, fileData] of Object.entries(extractedFiles)) {
            newZip.file(fileName, fileData);
        }

        const newZipContent = await newZip.generateAsync({ type: 'nodebuffer' });

        const now = new Date();
        const options = {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const cacheKey = `${file.originalFilename.substring(0, file.originalFilename.lastIndexOf('.'))}_${now.toLocaleString('en-US', options).replace(/[^\d]/g, '')}.zip`;
        const cacheTimeout = 60 * 60 * 1000;
        storeZipInMemory(cacheKey, newZipContent, cacheTimeout);

        ctx.body = {
            message: 'File uploaded and stored successfully',
            filename: file.originalFilename,
            zipKey: cacheKey,
        };
    } catch (error) {
        console.error('Error processing the ZIP file:', error);
        ctx.status = 500;
        ctx.body = 'Failed to process the ZIP file';
    }
};

const listZips = async (ctx) => {
    const zipKeys = Object.keys(zipStorage);
    ctx.body = { zipFiles: zipKeys };
};

const scrape = async (ctx) => {
    const { url } = ctx.request.body;
    try {
        const albumsData = await scrapeAlbumPages(url);
        ctx.body = albumsData;
    } catch (error) {
        ctx.status = error.response && error.response.status === 404 ? 404 : 500;
        ctx.body = { error: error.message };
    }
};

const getModels = async (ctx) => {
    try {
        const { term } = ctx.query;
        let models = await loadModelsFromJson();
        const filteredModels = await filterModels(term, models);
        ctx.body = filteredModels;
    } catch (error) {
        console.error('Error handling request:', error);
        ctx.status = 500;
        ctx.body = { error: 'Internal Server Error' };
    }
};

const downloadFile = async (ctx) => {
    const { id, albumData } = ctx.request.body;
    let models = await loadModelsFromJson();
    const model = filterModelbyId(id, models);
    if (!model) {
        ctx.body = { "error": "Not found" };
        return;
    }

    const { transformedData, imageFiles, downloadedAlbums } = await transformDataAndDownload(model, albumData, (progress) => {
        ctx.status = 200;
        ctx.type = 'application/json';
        ctx.body = { progress };
        ctx.res.flushHeaders();
    });
    const now = new Date();
    const options = {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    const cacheKey = `${model.name}_${now.toLocaleString('en-US', options).replace(/[^\d]/g, '')}.zip`;
    const cacheTimeout = 60 * 60 * 1000;

    await storeModelDataInSupabase(id, model.name, model.image, cacheKey, downloadedAlbums);

    ctx.body = { transformedData, imageFiles };

    const zip = new JSZip();
    zip.file(`${model.name}.json`, JSON.stringify(transformedData, null, 2));

    for (const [filePath, fileData] of Object.entries(imageFiles)) {
        zip.file(filePath, fileData);
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    storeZipInMemory(cacheKey, zipContent, cacheTimeout);

    ctx.set('Content-Disposition', `attachment; filename=${model.name}.zip`);
    ctx.set('Content-Type', 'application/zip');
    ctx.body = zipContent;
};

const getModelStats = async (ctx) => {
    const { time_period } = ctx.query;

    if (!['24h', '7d', '30d'].includes(time_period)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid time period' };
        return;
    }
    let limit = 10;

    try {
        const models = await getMostDownloadedModels(limit, time_period);
        ctx.status = 200;
        ctx.body = models;
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch most downloaded models' };
    }
};

const downloadZip = async (ctx) => {
    const { key } = ctx.params;
    const zipContent = zipStorage[key];

    if (zipContent) {
        ctx.set('Content-Disposition', `attachment; filename=${key}.zip`);
        ctx.set('Content-Type', 'application/zip');
        ctx.body = zipContent;
    } else {
        ctx.status = 404;
        ctx.body = 'ZIP file not found or expired.';
    }
};

const transformDataAndDownload = async (model, albumData, onProgress) => {
    const transformedData = {};
    const imageFiles = {};
    const downloadedAlbums = [];

    const name = model.name;
    const cleanString = (str) => str.replace(/\s+/g, '').toLowerCase().substring(0, 30);

    const imgName = cleanString(name) + '.jpg';
    const imgPath = imgName;
    const downloadResult = await downloadImage(model.image, onProgress);

    if (downloadResult.success) {
        imageFiles[imgPath] = downloadResult.data;
    } else {
        console.error(`Failed to download image: ${model.image}, Error: ${downloadResult.error}`);
    }

    transformedData[cleanString(name)] = {
        key: cleanString(name),
        name: name,
        thumb: model.image,
        profilepic: model.image,
        blackjackevents: {},
        blackjackeventkeys: []
    };

    for (let album of albumData) {
        const images = await scrapeImages(album.url);
        let maxCount = parseInt(album.count, 10);

        const verticalImages = images.filter(img => img.height > img.width);
        const nonVerticalImages = images.filter(img => img.height <= img.width);

        let combinedImages = [...verticalImages, ...nonVerticalImages];
        let orderedImages = combinedImages.slice(0, maxCount);

        orderedImages.sort((a, b) => a.index - b.index);

        const usedIndices = new Set(orderedImages.map(img => img.index));

        while (orderedImages.length < maxCount && usedIndices.size < images.length) {
            const randomImage = images[Math.floor(Math.random() * images.length)];
            if (!usedIndices.has(randomImage.index)) {
                usedIndices.add(randomImage.index);
                orderedImages.push(randomImage);
            }
        }

        if (orderedImages.length < maxCount) {
            orderedImages = images;
            maxCount = orderedImages.length;
        }

        orderedImages.sort((a, b) => a.index - b.index);
        let i = 1;
        const albumTitleClean = cleanString(album.title);

        for (let img of orderedImages) {
            const filename = `${albumTitleClean}-${i.toString().padStart(2, '0')}.jpg`;
            const imgPath = `${cleanString(name)}/${albumTitleClean}/${filename}`;

            const downloadResult = await downloadImage(img.url, onProgress);

            if (downloadResult.success) {
                imageFiles[imgPath] = downloadResult.data;
            } else {
                console.error(`Failed to download image: ${img.url}, Error: ${downloadResult.error}`);
            }

            i++;
        }

        const albumKey = album.title;
        transformedData[cleanString(name)].blackjackevents[albumKey] = {
            name: albumKey,
            slideimgpath:`${cleanString(name)}/${albumTitleClean}/${albumTitleClean}-01.jpg`,
            cost: 50 * maxCount,
            bjbtnevents: [],
            model_names: [name],
            tags: [],
            description: "",
            album_img: imgName,
            maxcount: maxCount
        };
        album.img = images[0].url;
        album.img_list = orderedImages;
        transformedData[cleanString(name)].blackjackeventkeys.push(albumKey);
        downloadedAlbums.push(album);
    }

    return { transformedData, imageFiles, downloadedAlbums };
};

module.exports = {
    scrapeModel,
    downloadModel,
    upload,
    listZips,
    scrape,
    getModels,
    downloadFile,
    getModelStats,
    downloadZip
};
