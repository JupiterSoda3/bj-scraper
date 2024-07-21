const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body').default;
const serve = require('koa-static');
const path = require('path');
const JSZip = require('jszip');
const fs = require('fs');

const { scrapeModelPage, scrapeAlbumPages, scrapeImages, downloadImage, scrapeAlbumAndFormatData } = require('./scraper');
const { saveModelsToJson, loadModelsFromJson, filterModels, filterModelbyId } = require('./fileHandler');

const app = new Koa();
const router = new Router();

app.use(serve(path.join(__dirname, 'public')));
app.use(koaBody({
    multipart: true,
    formidable: {
        uploadDir: null,       // Do not save files to disk
        keepExtensions: false, // Do not keep file extensions
        maxFileSize: 5 * 1024 * 1024, // 5MB size limit
    },
}));

// In-memory storage for ZIP files
const zipStorage = {};

// Function to store a ZIP file in memory with a timeout
const storeZipInMemory = (key, zipContent, timeout) => {
    zipStorage[key] = zipContent;
    setTimeout(() => {
        delete zipStorage[key];
        console.log(`ZIP file with key ${key} has been deleted from memory.`);
    }, timeout);
};

// Endpoint to scrape models
router.post('/scrapeModel', async (ctx) => {
    const { id } = ctx.request.body;
    try {
        const model = filterModelbyId(id, models);
        if (model) {
            const modelsData = await scrapeAlbumAndFormatData(model);
            ctx.body = modelsData;
        } else {
            ctx.body = { error: "Not found" };
        }
    } catch (error) {
        ctx.status = error.response && error.response.status === 404 ? 404 : 500;
        ctx.body = { error: error.message };
    }
});

// Endpoint to download model
router.post('/downloadModel', async (ctx) => {
    const { url } = ctx.request.body;
    try {
        const modelsData = await scrapeModelPage(url);
        saveModelsToJson(modelsData);
        ctx.body = modelsData;
    } catch (error) {
        ctx.status = error.response && error.response.status === 404 ? 404 : 500;
        ctx.body = { error: error.message };
    }
});

// Define the upload route
router.post('/upload', async (ctx) => {
    const file = ctx.request.files.file;

    if (!file) {
        ctx.status = 400;
        ctx.body = 'No file uploaded';
        return;
    }

    try {
        // Read the uploaded file
        const fileData = fs.readFileSync(file.filepath); // Read the file into memory

        // Create a ZIP archive and add the uploaded file to it
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(fileData);
        const extractedFiles = {};

        // Extract all files from the uploaded ZIP
        for (const fileName in zipContent.files) {
            if (zipContent.files[fileName].dir) continue; // Skip directories
            const fileData = await zipContent.files[fileName].async('nodebuffer');
            extractedFiles[fileName] = fileData;
        }

        // Create a new ZIP archive and add the extracted files
        const newZip = new JSZip();
        for (const [fileName, fileData] of Object.entries(extractedFiles)) {
            newZip.file(fileName, fileData);
        }

        // Generate the new ZIP file content
        const newZipContent = await newZip.generateAsync({ type: 'nodebuffer' });

        // Store the ZIP file in memory with a unique key
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
        const cacheTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
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
});


router.get('/listZips', async (ctx) => {
    const zipKeys = Object.keys(zipStorage);
    ctx.body = { zipFiles: zipKeys };
});

// Endpoint to scrape albums
router.post('/scrape', async (ctx) => {
    const { url } = ctx.request.body;
    try {
        const albumsData = await scrapeAlbumPages(url);
        ctx.body = albumsData;
    } catch (error) {
        ctx.status = error.response && error.response.status === 404 ? 404 : 500;
        ctx.body = { error: error.message };
    }
});

let models = [];

// Endpoint to retrieve filtered models
router.get('/models', async (ctx) => {
    try {
        const { term } = ctx.query;
        const filteredModels = await filterModels(term, models);
        ctx.body = filteredModels;
    } catch (error) {
        console.error('Error handling request:', error);
        ctx.status = 500;
        ctx.body = { error: 'Internal Server Error' };
    }
});

// Endpoint to download files and transform data
router.post('/downloadFile', async (ctx) => {
    const { id, albumData } = ctx.request.body;

    const requestData = ctx.request.body;

    const transformDataAndDownload = async (model, albumData, onProgress) => {
        const transformedData = {};
        const imageFiles = {};

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

            transformedData[cleanString(name)].blackjackeventkeys.push(albumKey);
        }

        return { transformedData, imageFiles };
    };

    const sendProgress = (progress) => {
        ctx.status = 200;
        ctx.type = 'application/json';
        ctx.body = { progress };
        ctx.res.flushHeaders();
    };

    let name = '';
    const model = filterModelbyId(id, models);
    if (model) {
        name = model.name;
    } else {
        ctx.body = { "error": "Not found" };
        return;
    }

    const { transformedData, imageFiles } = await transformDataAndDownload(model, albumData, sendProgress);

    ctx.body = { transformedData, imageFiles };

    const zip = new JSZip();
    zip.file(`${model.name}.json`, JSON.stringify(transformedData, null, 2));

    for (const [filePath, fileData] of Object.entries(imageFiles)) {
        zip.file(filePath, fileData);
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

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
    const cacheTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
    storeZipInMemory(cacheKey, zipContent, cacheTimeout);

    ctx.set('Content-Disposition', `attachment; filename=${model.name}.zip`);
    ctx.set('Content-Type', 'application/zip');
    ctx.body = zipContent;
});

router.get('/download/:key', async (ctx) => {
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
});

const PORT = 3000;
app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    models = await loadModelsFromJson();
});
