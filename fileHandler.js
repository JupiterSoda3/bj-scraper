const fs = require('fs').promises;
const path = require('path');

let modelsData = []; // To store JSON data

// Load JSON data from file
async function loadModelsFromJson() {
    try {
        const filePath = path.join(__dirname, 'public', 'models.json');
        const data = await fs.readFile(filePath, { encoding: 'utf8' }); // Specify encoding option
        modelsData = JSON.parse(data);
        console.log('Data loaded successfully.');
    } catch (err) {
        console.error('Error loading data:', err);
    }
    return modelsData;
}

// Function to save model data to a JSON file
function saveModelsToJson(modelsData) {
    const jsonContent = JSON.stringify(modelsData, null, 2);

    fs.writeFile('models.json', jsonContent, 'utf8', function (err) {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('Models data saved to models.json');
        }
    });
}

// Function to filter models by name
function filterModels(term, models) {
    let filteredModels = models;
    if (term) {
        filteredModels = models.filter(model => model.name.toLowerCase().includes(term.toLowerCase()));
    }
    filteredModels = filteredModels.slice(0, 15);
    return filteredModels;
}

// Function to filter models by name
function filterModelbyId(id, models) {
    let filteredModels = models;
    if (id) {
        filteredModels = models.filter(model => model.index== id);
    }
    if(filteredModels.length>0){
        return filteredModels[0];
    }
    return null;
}

module.exports = { saveModelsToJson, loadModelsFromJson, filterModels, filterModelbyId };
