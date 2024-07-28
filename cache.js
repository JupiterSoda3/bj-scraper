const NodeCache = require('node-cache');
const cache = new NodeCache();

const cacheData = (key, value, ttl) => {
    cache.set(key, value, ttl);
};

const getCachedData = (key) => {
    return cache.get(key);
};

module.exports = {
    cacheData,
    getCachedData,
};
