const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storeModelDataInSupabase = async (model_id, name, image, filename, albums) => {
    try {
        const { data, error } = await supabase
            .from('model_data')
            .insert([
                { model_id, name, image, filename, albums }
            ]);

        if (error) {
            throw error;
        }
        console.log('Data stored in Supabase:', data);
    } catch (error) {
        console.error('Error storing data in Supabase:', error.message);
    }
};


const getMostDownloadedModels = async (limit = 10, timePeriod) => {
    try {
        let sinceDate;
        const now = new Date();

        switch (timePeriod) {
            case '24h':
                sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                sinceDate = new Date(0); // Default to all time
                break;
        }

        const { data, error } = await supabase
            .from('model_data')
            .select('*')
            .gte('created_at', sinceDate.toISOString())
            .limit(limit);

        if (error) {
            throw error;
        }

        // Group and merge data
        const groupedData = data.reduce((acc, model) => {
            if (!acc[model.name]) {
                acc[model.name] = {
                    name: model.name,
                    image: model.image,
                    model_id: model.model_id,
                    albums: []
                };
            }
            acc[model.name].albums.push(...model.albums);
            return acc;
        }, {});

        return Object.values(groupedData);
    } catch (error) {
        console.error('Error retrieving most downloaded models from Supabase:', error.message);
        return [];
    }
};


module.exports = {
    storeModelDataInSupabase,
    getMostDownloadedModels
};
