const { scrapeModel, downloadModel, upload, listZips, scrape, getModels, downloadFile, getModelStats, downloadZip } = require('./handlers');

module.exports = (router) => {
    router.post('/scrapeModel', scrapeModel);
    router.post('/downloadModel', downloadModel);
    router.post('/upload', upload);
    router.get('/listZips', listZips);
    router.post('/scrape', scrape);
    router.get('/models', getModels);
    router.post('/downloadFile', downloadFile);
    router.get('/most-downloaded', getModelStats);
    router.get('/download/:key', downloadZip);
};
