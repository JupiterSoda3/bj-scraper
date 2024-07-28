let zipStorage = {};

const storeZipInMemory = (key, zipContent, timeout) => {
    zipStorage[key] = zipContent;
    setTimeout(() => {
        delete zipStorage[key];
    }, timeout);
};

module.exports = {
    storeZipInMemory,
    zipStorage,
};
