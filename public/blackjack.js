let deck = [];
let dealerHand = [];
let playerHand = [];
let playerMoney = 0;
let tableMoney = 0;
let betMoney = 0;
let initialMoney = 0;
let dealerDifficulty = 'easy';
let playerZipContent = null;
let dealerZipContent = null;

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const suitSymbols = {
    'Hearts': '<svg width="20" height="20" viewBox="0 0 24 24" fill="red" xmlns="http://www.w3.org/2000/svg"></svg>',
    'Diamonds': '<svg width="20" height="20" viewBox="0 0 24 24" fill="red" xmlns="http://www.w3.org/2000/svg"></svg>',
    'Clubs': '<svg width="20" height="20" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg"></svg>',
    'Spades': '<svg width="20" height="20" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg"></svg>'
};

function init() {
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('buy-in').addEventListener('click', buyIn);
    document.getElementById('deal').addEventListener('click', deal);
    document.getElementById('hit').addEventListener('click', hit);
    document.getElementById('stand').addEventListener('click', stand);
    document.getElementById('difficulty').addEventListener('change', setDifficulty);
    document.getElementById('game-exit').classList.add('hidden');
    document.getElementById("bet-amount-container").classList.remove('hidden');

}

function setDifficulty() {
    dealerDifficulty = document.getElementById('difficulty').value;
}

function buyIn() {
    const buyInAmount = parseInt(document.getElementById('buy-in-amount').value);
    if (isNaN(buyInAmount) || buyInAmount <= 0) {
        document.getElementById('buy-in-error').classList.remove('hidden');
        return;
    }
    document.getElementById('buy-in-error').classList.add('hidden');
    initializeGame(buyInAmount);
}


function initializeGame(buyInAmount) {
    initialMoney = buyInAmount;
    playerMoney = buyInAmount;
    tableMoney = buyInAmount;

    document.getElementById('player-money').innerText = playerMoney;
    document.getElementById('game-ui').classList.remove('hidden');
    document.getElementById('buy-in-container').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-complete').classList.add('hidden');

    createDeck();
    resetHands();
    updateUI();
}


function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
    deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function calculateHandValue(hand) {
    let value = hand.reduce((sum, card) => sum + getCardValue(card), 0);
    let aces = hand.filter(card => card.value === 'A').length;
    while (value > 21 && aces) {
        value -= 10;
        aces -= 1;
    }
    return value;
}

function renderCard(card, index, handType) {
    return `
        <div id="${handType}-card-${index}" class="card">
            <div class="top">${card.value}<br>${card.suit[0]}</div>
            <div class="middle">${suitSymbols[card.suit]}</div>
            <div class="bottom">${card.value}<br>${card.suit[0]}</div>
        </div>
    `;
}

function updateUI() {
    document.getElementById('dealer-cards').innerHTML = dealerHand.map((card, index) => renderCard(card, index, 'dealer')).join('');
    document.getElementById('player-cards').innerHTML = playerHand.map((card, index) => renderCard(card, index, 'player')).join('');
    document.getElementById('dealer-score').innerText = `Score: ${calculateHandValue(dealerHand)}`;
    document.getElementById('player-score').innerText = `Score: ${calculateHandValue(playerHand)}`;
    document.getElementById('player-money').innerText = playerMoney;
    updatePlayerImage();

    const isPlayerActive = playerHand.length > 0 && calculateHandValue(playerHand) <= 21;
    document.getElementById('hit').classList.toggle('hidden', !isPlayerActive);
    document.getElementById('stand').classList.toggle('hidden', !isPlayerActive);

    const isGameActive = dealerHand.length > 0 || playerHand.length > 0;
    document.getElementById('deal').classList.toggle('hidden', isGameActive);
    
    document.getElementById("bet-amount-container").classList.toggle('hidden', isGameActive);

    updateCardCount();  // Update card count display
}

function calculateCardCount() {
    let count = 0;
    for (let card of deck) {
        if (['2', '3', '4', '5', '6'].includes(card.value)) {
            count += 1;
        } else if (['10', 'J', 'Q', 'K', 'A'].includes(card.value)) {
            count -= 1;
        }
    }
    return count;
}


function updateCardCount() {
    const cardCountElement = document.getElementById('card-count');
    cardCountElement.innerText = calculateCardCount();
    cardCountElement.classList.remove('hidden');
}

function deal() {
    betMoney = parseInt(document.getElementById("bet-amount").value);
    if(betMoney > playerMoney) {
        alert("Incorrect amount");
        betMoney = 0;
        return;
    }
    const betElement = document.getElementById("bet-amount-container");
    betElement.classList.add("hidden");
    createDeck();
    dealerHand = [deck.pop(), deck.pop()];
    playerHand = [deck.pop(), deck.pop()];
    
    // Add animation class
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('deal-animation');
        setTimeout(() => card.classList.remove('deal-animation'), 500);
    });

    updateUI();
    document.getElementById('message').innerText = 'Dealt cards!';
}

function hit() {
    playerHand.push(deck.pop());
    updateUI();
    if (calculateHandValue(playerHand) > 21) {
        document.getElementById('message').innerText = 'Bust! You lose.';
        document.getElementById('message').classList.add('message');
        adjustPlayerMoney(false);
        resetHands();
    }
}

function stand() {
    switch (dealerDifficulty) {
        case 'easy':
            while (calculateHandValue(dealerHand) < 17) {
                dealerHand.push(deck.pop());
                updateUI();
                animateCardDraw('dealer');
            }
            break;
        case 'medium':
            while (calculateHandValue(dealerHand) < 17 || 
                   (calculateHandValue(dealerHand) === 17 && dealerHand.some(card => card.value === 'A'))) {
                dealerHand.push(deck.pop());
                updateUI();
                animateCardDraw('dealer');
            }
            break;
        case 'hard':
            while (calculateHandValue(dealerHand) < 17 || 
                   (calculateHandValue(dealerHand) < calculateHandValue(playerHand) && calculateHandValue(dealerHand) <= 21)) {
                dealerHand.push(deck.pop());
                updateUI();
                animateCardDraw('dealer');
            }
            break;
    }

    updateUI();
    const dealerScore = calculateHandValue(dealerHand);
    const playerScore = calculateHandValue(playerHand);

    let message = '';
    if (dealerScore > 21 || playerScore > dealerScore) {
        message = 'You win!';
        adjustPlayerMoney(true);
    } else if (playerScore < dealerScore) {
        message = 'Dealer wins!';
        adjustPlayerMoney(false);
    } else {
        message = 'It\'s a tie!';
    }
    displayMessage(message);
    resetHands();
    document.getElementById('message').classList.add('message');
}

function displayMessage(message) {
    const messageElement = document.getElementById('message');
    messageElement.innerText = message;
    messageElement.classList.add('animate__animated', 'animate__fadeIn');
    setTimeout(() => {
        messageElement.classList.remove('animate__fadeIn');
    }, 2000); // Adjust the timeout to match the animation duration
}

function animateCardDraw(handType) {
    const cardElement = document.querySelector(`#${handType}-card-${handType === 'dealer' ? dealerHand.length - 1 : playerHand.length - 1}`);
    if (cardElement) {
        cardElement.classList.add('animate__animated', 'animate__flipInY');
        setTimeout(() => {
            cardElement.classList.remove('animate__flipInY');
        }, 1000); // Adjust the timeout to match the animation duration
    }
}

function displayMessage(message) {
    const messageElement = document.getElementById('message');
    messageElement.innerText = message;
    messageElement.classList.add('animate__animated', 'animate__fadeIn');
    setTimeout(() => {
        messageElement.classList.remove('animate__fadeIn');
    }, 2000);
}



function adjustPlayerMoney(win) {
    if (win) {
        playerMoney += betMoney;
    } else {
        playerMoney -= betMoney;
    }
    if (playerMoney <= 0) {
        endGame(false);
    } else if (playerMoney >= initialMoney * 2) {
        endGame(true);
    }
    document.getElementById('player-money').innerText = playerMoney;
}

function endGame(win) {
    document.getElementById('game-ui').classList.add('hidden');

    if (win) {
        document.getElementById('game-complete').classList.remove('hidden');
        prepareSlideshow(document.getElementById('dealer-image'),dealerZipContent)
    } else {
        document.getElementById('game-over').classList.remove('hidden');
    }
    document.getElementById('game-exit').classList.remove('hidden');

    playerMoney = 0;
    document.getElementById('player-money').innerText = playerMoney;
}

function exitGame(){
    document.getElementById('game').classList.add('hidden');
    document.getElementById('character-init').classList.remove('hidden');
    document.getElementById('game-exit').classList.add('hidden');

}


function resetHands() {
    dealerHand = [];
    playerHand = [];
    updateUI();
}

function updateImageToStage(img, stage, zipContent) {
    const src = img.filename;
    const max = parseInt(img.getAttribute('maxcount'));
    const filename = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));
    const ext = src.substring(src.lastIndexOf('.'));
    const index = parseInt(filename.match(/(\d+)$/)[0]);
    const oInd = index.toString().padStart(2, '0');

    if (stage <= max && index < stage) {
        img.setAttribute('index', stage);
        const newFileName = filename.replace(oInd, stage.toString().padStart(2, '0')) + ext;
        
        const newFilePath = src.replace(filename + ext, newFileName);
        
        const zipEntry = zipContent.file(newFilePath);
        if (zipEntry) {
            zipEntry.async('blob').then(blob => {
                const url = URL.createObjectURL(blob);
                img.setAttribute('src', url);
                img.filename =  newFilePath;
            });
        }
    }
}

function updatePlayerImage() {
    const playerImage = document.getElementById('player-image');
    const maxcount = parseInt(playerImage.getAttribute('maxcount'));
    const currentStage = parseInt((tableMoney - playerMoney) * maxcount / tableMoney);
    if (currentStage > 0) {
        updateImageToStage(playerImage, currentStage, playerZipContent);
    }

    const dealerImage = document.getElementById('dealer-image');
    const dealerMaxCount = parseInt(dealerImage.getAttribute('maxcount'));
    const dealerStage = parseInt((playerMoney - initialMoney) * dealerMaxCount / tableMoney);
    if (dealerStage > 0) {
        updateImageToStage(dealerImage, dealerStage, dealerZipContent);
    }
}
const displayBlackjackEvents = (data, type) => {
    const blackjackEventsContainer = document.getElementById('blackjack-events');
    const characterSelectContainer = document.getElementById('character-select');
    characterSelectContainer.classList.remove('hidden');
    blackjackEventsContainer.innerHTML = ''; // Clear previous events
    const playerMode = type === 'player';
    const characterSelectMessage = document.getElementById('character-select-message');
    characterSelectMessage.innerText = `Select ${playerMode?"Player":"Dealer"} Event`
    for (let category in data) {
        const events = data[category].blackjackevents;
        const eventKeys = data[category].blackjackeventkeys;

        eventKeys.forEach(key => {
            const event = events[key];
            const eventElement = document.createElement('div');
            eventElement.className = 'max-w-sm rounded overflow-hidden shadow-lg m-4 bg-white text-black cursor-pointer';
            
            const zipEntry = (playerMode) ? playerZipContent.file(event.slideimgpath) : dealerZipContent.file(event.slideimgpath);
            
            if (zipEntry) {
                zipEntry.async('blob').then(blob => {
                    const url = URL.createObjectURL(blob);
                    eventElement.innerHTML = `
                        <img class="w-full" src="${url}" alt="${event.model_names.join(', ')}" maxcount="${event.maxcount}" index="${event.index}">
                        <div class="px-6 py-4">
                            <div class="font-bold text-xl mb-2">${event.model_names.join(', ')}</div>
                            <p class="text-gray-700 text-base">${event.description}</p>
                            <p class="text-gray-700 text-base">Photo count:${event.maxcount}</p>
                        </div>
                        <div class="px-6 pt-4 pb-2">
                            <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">Cost: $${event.cost}</span>
                        </div>
                    `;

                    eventElement.addEventListener('click', () => {selectCharacterEvent(event,playerMode);});
                    blackjackEventsContainer.appendChild(eventElement);
                });
            }
        });
    }
};


let selectedPlayerEvent = null;
let selectedDealerEvent = null;

function selectCharacterEvent(event,playerMode){
    const blackjackEventsContainer = document.getElementById('blackjack-events');
    const characterSelectContainer = document.getElementById('character-select');
    const loadPlayerModelCard = document.getElementById('loadPlayerModelCard');
    const loadDealerModelCard = document.getElementById('loadDealerModelCard');
    const characterInitContainer = document.getElementById('character-init')

    blackjackEventsContainer.innerHTML = ''; // Clear previous events
    characterSelectContainer.classList.add('hidden');

    const eventElement = document.createElement('div');
    eventElement.className = 'max-w-sm rounded overflow-hidden shadow-lg m-4 bg-white text-black cursor-pointer';

    const beginGameButton = document.createElement('button');
    beginGameButton.id = 'beginGameButton';
    beginGameButton.className = 'bg-blue-500 text-white px-4 py-2 rounded mt-4';
    beginGameButton.innerText = 'Begin Game';

    
    const zipEntry = (playerMode) ? playerZipContent.file(event.slideimgpath) : dealerZipContent.file(event.slideimgpath);
    
    if (zipEntry) {
        zipEntry.async('blob').then(blob => {
            const url = URL.createObjectURL(blob);
            eventElement.innerHTML = `
                <img class="w-full" src="${url}" alt="${event.model_names.join(', ')}" maxcount="${event.maxcount}" index="${event.index}">
                <div class="px-6 py-4">
                    <div class="font-bold text-xl mb-2">${event.model_names.join(', ')}</div>
                    <p class="text-gray-700 text-base">${event.description}</p>
                </div>
                <div class="px-6 pt-4 pb-2">
                    <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">Cost: $${event.cost}</span>
                </div>
            `;
            if (playerMode) {
                loadPlayerModelCard.innerHTML = ''; // Clear existing content
                loadPlayerModelCard.appendChild(eventElement);
                selectedPlayerEvent = event; // Save the player event

            } else {
                loadDealerModelCard.innerHTML = ''; // Clear existing content
                loadDealerModelCard.appendChild(eventElement);
                selectedDealerEvent = event; // Save the dealer event
            }

            // Check if both cards are filled and display the "Begin Game" button
            if (loadPlayerModelCard.childElementCount > 0 && loadDealerModelCard.childElementCount > 0) {
                const gameButtonContainer = document.getElementById('game-button-container');
                if (!gameButtonContainer) {
                    const newGameButtonContainer = document.createElement('div');
                    newGameButtonContainer.id = 'game-button-container';
                    newGameButtonContainer.className = 'text-center mt-4';
                    newGameButtonContainer.appendChild(beginGameButton);
                    beginGameButton.addEventListener('click', () => {
                        startBlackjackGame(selectedPlayerEvent,selectedDealerEvent);
                    });
                    characterInitContainer.prepend(newGameButtonContainer);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });
    }
}

function listZips() {
    const playerZipSelect = document.getElementById('playerZipSelect');
    const dealerZipSelect = document.getElementById('dealerZipSelect');
    
    // Clear existing options from both select elements
    playerZipSelect.innerHTML = '';
    dealerZipSelect.innerHTML = '';
    
    // Fetch and display the list of ZIP files
    fetch('/listZips')
        .then(response => response.json())
        .then(data => {
            data.zipFiles.forEach(zipFile => {
                const playerOption = document.createElement('option');
                playerOption.value = zipFile;
                playerOption.textContent = zipFile;
                playerZipSelect.appendChild(playerOption);

                const dealerOption = document.createElement('option');
                dealerOption.value = zipFile;
                dealerOption.textContent = zipFile;
                dealerZipSelect.appendChild(dealerOption);
            });
        })
        .catch(error => {
            console.error('Error fetching ZIP files:', error);
        });
}


document.addEventListener('DOMContentLoaded', function() {
    init();
    const playerZipSelect = document.getElementById('playerZipSelect');
    const dealerZipSelect = document.getElementById('dealerZipSelect');
    const loadPlayerZipButton = document.getElementById('loadPlayerZipButton');
    const loadDealerZipButton = document.getElementById('loadDealerZipButton');

    listZips();
    loadPlayerZipButton.addEventListener('click', () => {
        const selectedPlayerZip = playerZipSelect.value;
        if (selectedPlayerZip) {
            loadPlayerZipFile(selectedPlayerZip);
        }
    });

    loadDealerZipButton.addEventListener('click', () => {
        const selectedDealerZip = dealerZipSelect.value;
        if (selectedDealerZip) {
            loadDealerZipFile(selectedDealerZip);
        }
    });

    const loadPlayerZipFile = (zipFile) => {
        fetch(`/download/${zipFile}`)
            .then(response => response.arrayBuffer())
            .then(data => {
                JSZip.loadAsync(data).then(zip => {
                    playerZipContent = zip;
                    zip.forEach((relativePath, zipEntry) => {
                        if (zipEntry.name.endsWith('.json')) {
                            zipEntry.async('string').then(content => {
                                const jsonData = JSON.parse(content);
                                displayBlackjackEvents(jsonData, 'player');
                            });
                        }
                    });
                });
            });
    };

    const loadDealerZipFile = (zipFile) => {
        fetch(`/download/${zipFile}`)
            .then(response => response.arrayBuffer())
            .then(data => {
                JSZip.loadAsync(data).then(zip => {
                    dealerZipContent = zip;
                    zip.forEach((relativePath, zipEntry) => {
                        if (zipEntry.name.endsWith('.json')) {
                            zipEntry.async('string').then(content => {
                                const jsonData = JSON.parse(content);
                                displayBlackjackEvents(jsonData, 'dealer');
                            });
                        }
                    });
                });
            });
    };

    $('#tab-scraper').on('click', function () {
        $('.tab-content').removeClass('active');
        $('#scraper-tab').addClass('active');
    });

    $('#tab-blackjack').on('click', function () {
        $('.tab-content').removeClass('active');
        $('#blackjack-tab').addClass('active');
        listZips();
    });
});
function startBlackjackGame(playerEvent, dealerEvent) {
    const characterInitContainer = document.getElementById('character-init');
    const gameContainer = document.getElementById('game');
    const characterSelectContainer = document.getElementById('character-select');
    const gameUI = document.getElementById('game-ui');

    gameContainer.classList.remove('hidden');
    gameUI.classList.add('hidden');
    characterSelectContainer.classList.add('hidden');
    characterInitContainer.classList.add('hidden');

    const playerImage = document.getElementById('player-image');
    const dealerImage = document.getElementById('dealer-image');

    playerImage.setAttribute('maxcount', playerEvent.maxcount);
    dealerImage.setAttribute('maxcount', dealerEvent.maxcount);

    // Load player image from the specified ZIP file
    const playerImagePath = playerEvent.slideimgpath;
    const playerImageEntry = playerZipContent.file(playerImagePath);
    if (playerImageEntry) {
        playerImageEntry.async('blob').then(blob => {
            const url = URL.createObjectURL(blob);
            playerImage.src = url;
            playerImage.filename = playerImagePath;
        });
    }

    // Load dealer image from the specified ZIP file
    const dealerImagePath = dealerEvent.slideimgpath;
    const dealerImageEntry = dealerZipContent.file(dealerImagePath);
    if (dealerImageEntry) {
        dealerImageEntry.async('blob').then(blob => {
            const url = URL.createObjectURL(blob);
            dealerImage.src = url;
            dealerImage.filename = dealerImagePath;
        });
    }

    document.getElementById('buy-in-amount').value = dealerEvent.cost;
    initializeGame(dealerEvent.cost);
}


let currentStage = 1;
let maxCount = 1;
let images = [];

function showModal() {
    document.getElementById('slideshow-modal').classList.remove('hidden');
    updateSlideshow();
}

function closeModal() {
    document.getElementById('slideshow-modal').classList.add('hidden');
}

function updateSlideshow() {
    const img = document.getElementById('slideshow-image');

    if (images.length > 0) {
        img.src = images[currentIndex].url;
    }
}

function showNextImage() {
    if (currentIndex < images.length - 1) {
        currentIndex++;
        updateSlideshow();
    }
}

function showPrevImage() {
    if (currentIndex > 0) {
        currentIndex--;
        updateSlideshow();
    }
}

document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('prev-btn').addEventListener('click', showPrevImage);
document.getElementById('next-btn').addEventListener('click', showNextImage);

function prepareSlideshow(img, zipContent) {
    const src = img.filename;
    maxCount = parseInt(img.getAttribute('maxcount'));
    images = [];
    currentIndex = 0;

    for (let s = 1; s <= maxCount; s++) {
        const filename = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));
        const ext = src.substring(src.lastIndexOf('.'));
        const newFileName = filename.replace(/(\d+)$/, s.toString().padStart(2, '0')) + ext;
        const newFilePath = src.replace(filename + ext, newFileName);
        if(zipContent.file(newFilePath)==null){
           console.log(newFilePath)
        }
        zipContent.file(newFilePath).async('blob').then(blob => {
            const url = URL.createObjectURL(blob);
            images.push({ url, filePath: newFilePath });
            if (s === 1) { // Show the modal when the first image is ready
                showModal();
            }
        });
    }
}