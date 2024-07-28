let storedModelData = null;
document.addEventListener('DOMContentLoaded', function () {
    function debounce(func, wait, immediate) {
        let timeout;
        return function () {
            const context = this, args = arguments;
            const later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    // Apply debounce to select2 initialization
    const delayedInit = debounce(function () {
        const selectElement = $('#modelSelect');
        selectElement.select2({
            placeholder: 'Select a Model',
            ajax: {
                url: 'models',
                dataType: 'json',
                minimumInputLength: 2,
                processResults: function (data) {
                    return {
                        results: data.map(function (model) {
                            return {
                                url: model.url,
                                text: model.name,
                                id: model.index
                            };
                        })
                    };
                },
                cache: true
            }
        });
    }, 300);
    delayedInit();
    $('#getUrlButton').on('click', async function () {
        const selectedModel = $('#modelSelect').select2('data')[0];
        if (selectedModel) {
            const id = selectedModel.id;
            showLoading();
            try {
                const response = await fetch('/scrapeModel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id })
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const data = await response.json();
                storedModelData = data;
                storedModelData.id = id;
                loadModelData(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                hideLoading();
            }
        } else {
            console.error('No model selected.');
        }
    });

    $('#getSourceButton').on('click', async function () {
        $('#models').removeClass('hidden');
    });
    const timePeriodSelect = document.getElementById('time-period');
    const fetchModels = async (timePeriod) => {
        try {
            const response = await fetch(`/most-downloaded?time_period=${timePeriod}`);
            const models = await response.json();
    
            // Clear existing grid items
            modelGrid.innerHTML = '';
    
            // Populate grid with model images
            models.forEach(model => {
                const gridItem = document.createElement('div');
                gridItem.classList.add('w-full', 'sm:w-1/2', 'md:w-1/3', 'lg:w-1/4', 'p-2', 'flex', 'justify-center');
    
                gridItem.innerHTML = `
                    <div class="bg-white rounded-lg shadow-lg overflow-hidden text-center">
                        <img src="${model.image}" alt="${model.name}" class="model-image w-full h-48 object-cover cursor-pointer" data-albums='${JSON.stringify(model.albums)}'>
                        <div class="p-4">
                            <h2 class="text-gray-800 text-lg font-semibold">${model.name}</h2>
                        </div>
                    </div>
                `;
                modelGrid.appendChild(gridItem);
            });
    
            // Add event listeners for model images
            document.querySelectorAll('.model-image').forEach(image => {
                image.addEventListener('click', (event) => {
                    const albums = JSON.parse(event.currentTarget.getAttribute('data-albums'));
                    showAlbumPopup(albums);
                });
            });
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    };
    
    // Function to show album popup
    const showAlbumPopup = (albums) => {
        const popup = document.createElement('div');
        popup.classList.add('fixed', 'inset-0', 'bg-black', 'bg-opacity-75', 'flex', 'flex-wrap', 'justify-center', 'items-center', 'p-5', 'overflow-y-auto', 'z-50');
    
        albums.forEach(album => {
            const albumDiv = document.createElement('div');
            albumDiv.classList.add('bg-white', 'm-2', 'p-4', 'rounded-md', 'shadow-lg', 'text-center');
    
            albumDiv.innerHTML = `
                <img src="${album.img}" alt="${album.title}" class="w-full h-auto mb-2 rounded-md">
                <a href="${album.url}" target="_blank" class="block mb-2 text-blue-500 hover:underline">${album.title}</a>
                <p class="text-gray-700">Image Count: ${album.count}</p>
            `;
            popup.appendChild(albumDiv);
        });
    
        document.body.appendChild(popup);
    
        // Close popup when clicking outside of it
        popup.addEventListener('click', (event) => {
            if (event.target === popup) {
                document.body.removeChild(popup);
            }
        });
    };    

    // Initial fetch
    fetchModels(timePeriodSelect.value);

    // Fetch models when time period changes
    timePeriodSelect.addEventListener('change', () => {
        fetchModels(timePeriodSelect.value);
    });
});
async function downloadModel() {
    let albumData = [];
    $('#result > div > div.grid.grid-cols-1.sm\\:grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-6 > div> div > label > input').each(function () {
        const parentDiv = $(this).closest('.p-4');
        const imgTag = parentDiv.parent().find('img');
        const titleTag = parentDiv.find('h4');

        if (imgTag.length > 0 && this.checked) {
            albumData.push({ title: titleTag.text(), url: imgTag.attr('url'), count: parentDiv.find('input[type=number]').val() });
        }
    });
    const id = storedModelData.id;
    const params = { id, albumData }
    downloadFile(params)
}
async function downloadFile(parameters) {
    const fileName = storedModelData.name + '.zip';
    try {
        showLoading();

        const response = await fetch('/downloadFile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(parameters)
        });

        if (!response.ok) {
            throw new Error('Failed to download file');
        }

        const blob = await response.blob();

        // Create a temporary URL to the blob
        const downloadUrl = window.URL.createObjectURL(blob);


        // Create a temporary link element
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error downloading file:', error);
    }
}

let currentIndex = 0;
const batchSize = 25;
let albumData = [];

function loadModelData(data) {
    albumData = data.albums;
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="mb-6">
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold mb-2">${data.name}</h2>
            <img src="${data.image}" alt="${data.name}" class="mb-4 rounded shadow-lg mx-auto">
            <div>
                <button class="bg-blue-500 text-white px-4 py-2 rounded" onclick="downloadModel()">Download</button>
            </div>
        </div>

        <h3 class="text-xl font-bold mt-6 mb-4">Albums</h3>
        <div id="albums-container" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
        <div id="load-more-trigger" class="h-1"></div>
    `;

    loadMoreAlbums();
    setupIntersectionObserver();
}

function loadMoreAlbums() {
    const container = document.getElementById('albums-container');
    const endIndex = Math.min(currentIndex + batchSize, albumData.length);
    for (let i = currentIndex; i < endIndex; i++) {
        const album = albumData[i];
        const albumDiv = document.createElement('div');
        albumDiv.className = 'bg-white rounded-lg shadow-md overflow-hidden';
        albumDiv.innerHTML = `
            <div class="aspect-w-3 aspect-h-4">
                <img src="${album.imgSrc}" alt="${album.title}" class="object-cover object-center w-full h-full" url="${album.url}">
            </div>
            <div class="p-4">
                <h4 class="text-lg font-bold mb-2">${album.title}</h4>
                <label class="mt-4">
                    <input type="checkbox" class="form-checkbox h-4 w-4 text-indigo-600">
                    <span class="ml-2 text-gray-700">Download</span>
                </label>
                <label class="mt-4 block">
                    <span class="ml-2 text-gray-700">Count</span>
                    <input type="number" value="5" class="border border-gray-300 rounded mt-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-12">
                </label>
            </div>
        `;
        container.appendChild(albumDiv);
    }
    currentIndex = endIndex;
}

function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentIndex < albumData.length) {
            loadMoreAlbums();
        }
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 1.0
    });

    observer.observe(document.getElementById('load-more-trigger'));
}
function showLoading() {
    $('#loadingIndicator').removeClass('hidden');
}

function hideLoading() {
    $('#loadingIndicator').addClass('hidden');
}

document.getElementById('uploadButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileUpload');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB size limit
        alert('File size exceeds 5MB.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            console.log('File uploaded successfully:', data);
            listZips();
            alert('File uploaded successfully.');
        } else {
            console.error('Upload failed:', response.statusText);
            alert('Upload failed. Please try again.');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error uploading file. Please try again.');
    }
});

document.getElementById('time-period').addEventListener('change', (event) => {
    const selectedPeriod = event.target.value;
    fetchData(selectedPeriod);
});

async function fetchData(timePeriod) {
    try {
        const response = await fetch(`/modelstats?timePeriod=${timePeriod}`);
        const data = await response.json();

        const tableBody = document.getElementById('model-table-body');
        tableBody.innerHTML = '';

        data.forEach(model => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${model.model_id}</td>
                <td class="px-6 py-4 whitespace-nowrap">${model.download_count}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}