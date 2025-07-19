// Game state
let players = [];
let currentPlayer = null;
let unsoldPlayers = {
    batsmen: [],
    bowlers: [],
    wicketKeepers: [],
    allRounders: []
};
let isSecondRound = false;
let teams = {
    "CSK": { balance: 1200000000, players: [],bids:[], foreignPlayers: 0 },
    "MI": { balance: 1200000000, players: [],bids:[], foreignPlayers: 0 },
    "RCB": { balance: 1200000000, players: [],bids:[], foreignPlayers: 0 },
    "SRH": { balance: 1200000000, players: [],bids:[], foreignPlayers: 0 },
    "KKR": { balance: 1200000000, players: [],bids:[], foreignPlayers: 0 }
};

// Add this once at the top of your script.js
const teamNameMap = {
    "CSK": "Chennai Super Kings",
    "MI": "Mumbai Indians",
    "RCB": "Royal Challengers Bangalore",
    "SRH": "Sun Risers Hyderabad",
    "KKR": "Kolkata Knight Riders"
};


// DOM elements
const gameContainer = document.getElementById('game-container');
const resultsContainer = document.getElementById('results-container');
const auctionStatus = document.getElementById('auction-status');
const playerImage = document.getElementById('player-image');
const playerDetails = document.getElementById('player-details');
const teamBids = document.getElementById('team-bids');
const startAuctionButton = document.getElementById('start-auction');
const teamInfo = document.getElementById('team-info');
const resultsTable = document.getElementById('results-table');
const restartAuctionButton = document.getElementById('restart-auction');

// Initialize Socket.IO
const socket = io('http://Your_IP:3000'); 
async function loadPlayers() {
    const response = await fetch('data/players.json');
    players = await response.json();
}



function downloadGameState() {
    const gameState = {
        players,
        currentPlayer,
        unsoldPlayers,
        isSecondRound,
        teams
    };

    const jsonData = JSON.stringify(gameState, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "auction_game_state.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}



function uploadGameState(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const gameState = JSON.parse(e.target.result);
        
        // Load saved state
        players = gameState.players;
        currentPlayer = gameState.currentPlayer;
        unsoldPlayers = gameState.unsoldPlayers;
        isSecondRound = gameState.isSecondRound;
        teams = gameState.teams;

        alert("Game state loaded successfully!");

        // ✅ Update Team UI using existing function
        updateTeamInfo();  
        

        // ✅ Resume Auction Status & Player Info
        displayPlayerInfo(currentPlayer);
        updateAuctionStatus(`Resuming auction for ${currentPlayer.name}`);
    };
    reader.readAsText(file);
}






async function loadPlayerStats(category, playerName) {
    try {
        let fileName;
        if (category.toLowerCase().includes('batsman')) {
            fileName = 'batsmen_stats.json';
        } else if (category.toLowerCase().includes('bowler')) {
            fileName = 'bowlers_stats.json';
        } else if (category.toLowerCase().includes('all-rounder')) {
            fileName = 'all_rounders_stats.json';
        } else if (category.toLowerCase().includes('wicket-keeper')) {
            fileName = 'wicket_keepers_stats.json';
        } else {
            console.error('Unknown category:', category);
            return null;
        }

        const response = await fetch(`data/${fileName}`);
        if (!response.ok) throw new Error('Failed to fetch stats');

        const stats = await response.json();
        return stats.find(player => player['Player Name'] === playerName);
    } catch (error) {
        console.error('Error loading player stats:', error);
        return null;
    }
}


function addToUnsoldPlayers(player) {
    const category = player.category.toLowerCase().replace(' ', '_');
    if (!unsoldPlayers[category]) {
        unsoldPlayers[category] = [];
    }
    unsoldPlayers[category].push(player);

    // Debugging unsold players
    console.log('Unsold Players:', unsoldPlayers);
}


function saveBiddingResultsToJSON() {
    const results = {};
    for (let team in teams) {
        results[team] = {
            players: teams[team].players,
            bids: teams[team].bids // Include bids in the JSON
        };
    }
    const jsonData = JSON.stringify(results, null, 2);

    // Create a Blob with the JSON data
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a link to download the file and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bidding_results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function saveFinalUnsoldPlayers() {
    const finalUnsoldPlayers = Object.values(unsoldPlayers).flat();
    const jsonData = JSON.stringify(finalUnsoldPlayers, null, 2);
    
    // Debugging: Check the data before saving
    console.log('Saving final_unsold_players.json:', jsonData);

    // Create a Blob from the JSON data
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create an anchor element and simulate a click to download the file
    const a = document.createElement('a');
    a.href = url;
    a.download = 'final_unsold_players.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
}






function formatIndianCurrency(num) {
  if (num >= 1e7) {
    const crores = num / 1e7;
    return crores % 1 === 0 ? `${crores} crore` : `${crores.toFixed(1)} crores`;
  } else if (num >= 1e5) {
    const lakhs = num / 1e5;
    return lakhs % 1 === 0 ? `${lakhs} lakh` : `${lakhs.toFixed(1)} lakhs`;
  } else {
    return num.toLocaleString('en-IN');
  }
}


function displayPlayerInfo(player) {
    const playerImage = document.getElementById('player-image');
    const playerDetails = document.getElementById('player-details');
    const playerStats = document.getElementById('player-stats');

    if (!playerImage || !playerDetails || !playerStats) {
        console.error('Player image, details container, or stats container not found in DOM.');
        return;
    }

    playerImage.src = `images/${player.name.toUpperCase()}.png`;
    console.log(player);

    const basePrice = parseInt(currentPlayer.Base_Price?.replace(/,/g, '') || "0", 10);
    const basePriceFormatted = formatIndianCurrency(basePrice);

    playerDetails.innerHTML = `
        <h2>${player.name}</h2>
        <p>Category: ${player.category}</p>
        <p>Country: ${player.country}</p>
        <p>IPL Debut: ${player.IPL_Debut}</p>
        <p>Base Price: ₹${basePriceFormatted}</p>
        <p>Type: ${player.Type || "N/A"}</p> 
    `;

    loadPlayerStats(player.category, player.name).then(stats => {
        if (stats) {
            console.log(stats);
            let statsHtml = '<table><tr>';
            const statsOrder = getStatsOrder(player.category);
            for (let key of statsOrder) {
                statsHtml += `<th>${key}</th>`;
            }
            statsHtml += '</tr><tr>';
            for (let key of statsOrder) {
                statsHtml += `<td>${stats[key] || '-'}</td>`;
            }
            statsHtml += '</tr></table>';
            playerStats.innerHTML = statsHtml;
        } else {
            playerStats.innerHTML = '<p>Stats not available for this player.</p>';
            console.error('No stats found for:', player.name, player.category);
        }
    }).catch(error => {
        playerStats.innerHTML = '<p>Error loading player stats.</p>';
        console.error('Error in displayPlayerInfo:', error);
    });
}

function getStatsOrder(category) {
    if (category.toLowerCase().includes('batsman')) {
        return ['MAT', 'NO', 'RUNS', 'HS', 'AVG', 'BF', 'SR', '100','50','4S','6S'];
    } else if (category.toLowerCase().includes('bowler')) {
        return ['MAT', 'BALLS', 'RUNS', 'WKTS', 'BBM', 'AVE','ECON','SR','4W','5W'];
    } else if (category.toLowerCase().includes('all')) {
        return ['MAT', 'NO', 'RUNS SCORED', 'HS', 'AVG', 'BF', 'SR', '100','50','4S','6S','BALLS','RUNS GIVEN','WKTS','BBM','AVE','ECON','4W','5W'];
    } else if (category.toLowerCase().includes('keeper')) {
        return ['MAT', 'NO', 'RUNS', 'HS', 'AVG', 'BF', 'SR', '100','50','4S','6S'];
    } else {
        return [];
    }
}



// Update auction status
function updateAuctionStatus(message) {
    auctionStatus.innerHTML += `<p>${message}</p>`;
    auctionStatus.scrollTop = auctionStatus.scrollHeight;
}



async function playMusic(team) {
    const musicPath = "music/"; // Adjust based on your server setup
    // const teamMusic = {
    //     MI: [musicPath + 'MI1.mp3', musicPath + 'MI2.mp3'],
    //     CSK: [musicPath + 'CSK1.mp3', musicPath + 'CSK2.mp3'],
    //     RCB: [musicPath + 'RCB1.mp3', musicPath + 'RCB2.mp3'],
    //     SRH: [musicPath + 'SRH1.mp3', musicPath + 'SRH2.mp3'],
    //     KKR: [musicPath + 'KKR1.mp3']
    // };

    if (teamMusic[team] && teamMusic[team].length > 0) {
        // const randomSong = teamMusic[team][Math.floor(Math.random() * teamMusic[team].length)];
        const randomSong=musicPath+'IPL3.mp3'
        const audio = new Audio(randomSong);
        audio.volume = 0.6; // Set volume to 60%
        audio.play().then(() => {
            console.log(`Playing: ${randomSong}`);
            
            // Stop after 5 seconds
            setTimeout(() => {
                audio.pause();
                audio.currentTime = 0; // Reset to start
                console.log(`Stopped: ${randomSong}`);
            }, 4000);

        }).catch(error => console.error("Error playing music:", error));

    } else {
        console.warn(`No music found for team ${team}`);
    }
}

async function conductAuction() {
    let highestBid = 0;
    let winningTeam = null;

    for (let team in teams) {
        const bidInput = document.getElementById(`${team}-bid`);
        const denominationSelect = document.getElementById(`${team}-denomination`);
        const bidValue = parseFloat(bidInput.value); // Parse as float to handle fractional values
        const denomination = denominationSelect.value;

        // Skip if the bid value is invalid
        if (isNaN(bidValue) || bidValue <= 0) {
            continue;
        }

        // Calculate the actual bid
        const bid = bidValue * (denomination === 'crore' ? 10000000 : (denomination === 'lakh' ? 100000 : 1));


        if (teams[team].players.length > 25){
            bidInput.disabled = true;
            updateAuctionStatus(`${team} has already reached the limit of 25 players and cannot bid for any new players.`);
            await announceMessage(`${team} has already reached the limit of 25 players and cannot bid for any new players.`,teams);
            continue;
        }
        const country = currentPlayer.country.toLowerCase();
        const isIndian = country.includes('india');
        // Restrict bidding for teams with 8 foreign players
        if (!isIndian && teams[team].foreignPlayers >= 8) {
            bidInput.disabled = true;
            updateAuctionStatus(`${team} has already reached the limit of 8 foreign players and cannot bid for ${currentPlayer.name}.`);
            await announceMessage(`${team} has already reached the limit of 8 foreign players and cannot bid for ${currentPlayer.name}.`,teams)
            continue;
        }

        if(bid>=teams[team].balance){
            updateAuctionStatus(`${team} bid for ${currentPlayer.name} exceeds their balance, so their bid is invalid.`);
            await announceMessage(`${team} bid for ${currentPlayer.name} exceeds their balance, so their bid is invalid.`,teams)
            return;
        }
        const basePrice = parseInt(currentPlayer.Base_Price.replace(/,/g, ''), 10); // Convert Base_Price to a number

        if (bid < basePrice) {
            updateAuctionStatus(`${team} bid for ${currentPlayer.name} is below the base price, so their bid is invalid.`);
            await announceMessage(`${team} bid for ${currentPlayer.name} is below the base price, so their bid is invalid.`, teams);
            return;
        }

        // Check if the bid is valid and higher than the current highest bid
        if (bid > highestBid && bid <= teams[team].balance) {
            
            highestBid = bid;
            winningTeam = team;
        }

        

        // Clear the bid input and reset the denomination
        bidInput.value = '';
        denominationSelect.value = 'crore';
    }

    if (winningTeam) {
        const playerDetails = document.getElementById('player-details');
        const playerStats = document.getElementById('player-stats');
        const basePrice = parseInt(currentPlayer.Base_Price?.replace(/,/g, '') || "0", 10);
        const basePriceFormatted = formatIndianCurrency(basePrice);
        await playMusic(winningTeam)
        // Send update to the server
           socket.emit('updatePlayer', {
               team: winningTeam,
               player: currentPlayer,
               bid: highestBid
           });
        teams[winningTeam].balance -= highestBid;
        teams[winningTeam].players.push(currentPlayer); // Push the full player object
        teams[winningTeam].bids.push(highestBid);
        if (!currentPlayer.country.toLowerCase().includes('india')) {
            teams[winningTeam].foreignPlayers++;
        }
        // Format the highest bid as a readable string
        const formattedHighestBid = highestBid.toLocaleString('en-IN');
        const teamTelugu = teamNameMap[winningTeam] || winningTeam;
        
        updateAuctionStatus(`${currentPlayer.name} sold to ${winningTeam} for ₹${formattedHighestBid}.`);
        await announceMessage(`${currentPlayer.name} sold to ${teamTelugu} for ₹${formattedHighestBid}. Base price for that player was ${basePriceFormatted} and got sold for ${formattedHighestBid}. Team Balance is ${teams[winningTeam].balance}/1200000000.Players in ${teamTelugu} is now ${teams[winningTeam].players.length} `,teams);
        
    } else {
        addToUnsoldPlayers(currentPlayer);
        updateAuctionStatus(`No bids received. ${currentPlayer.name} remains unsold.`);
        await announceMessage(`No bids received. ${currentPlayer.name} remains unsold.`,teams);
        
    }

    updateTeamInfo();
}

function saveUnsoldPlayersToJSON() {
    const unsoldPlayersData = {
        batsmen: unsoldPlayers.batsmen,
        bowlers: unsoldPlayers.bowlers,
        wicketKeepers: unsoldPlayers.wicketKeepers,
        allRounders: unsoldPlayers.allRounders
    };
    const jsonData = JSON.stringify(unsoldPlayersData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unsold_players.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function nextPlayer() {
    if (players.length > 0) {
        // Extract the current category of the player to be auctioned
        const currentCategory = players[0].category.toLowerCase();

        // Group players by category
        const categoryPlayers = players.filter(player => player.category.toLowerCase() === currentCategory);
        const otherPlayers = players.filter(player => player.category.toLowerCase() !== currentCategory);

        const indianPlayers = categoryPlayers.filter(player =>
            player.country.toLowerCase().includes('india')
        );
        const foreignPlayers = categoryPlayers.filter(player =>
            !player.country.toLowerCase().includes('india')
        );

        // Shuffle Indian and foreign players within the category
        shuffleArray(indianPlayers);
        shuffleArray(foreignPlayers);

        // Combine Indian and foreign players back into the players array for auction
        players = [...indianPlayers, ...foreignPlayers, ...otherPlayers];

        // Proceed with the next player
        currentPlayer = players.shift();
        if (currentPlayer) {
            console.log('Emitting playerUpForBid for:', currentPlayer.name);
            socket.emit('playerUpForBid', currentPlayer);
        } else {
            console.log('No currentPlayer for bidding');
        }
        await displayPlayerInfo(currentPlayer);
        await announcePlayer(currentPlayer);
    } else if (!isSecondRound) {
        const unsoldPlayersCount = Object.values(unsoldPlayers).flat().length;

        if (unsoldPlayersCount > 0) {
            isSecondRound = true;
            players = Object.values(unsoldPlayers).flat();

            unsoldPlayers = {
                batsmen: [],
                bowlers: [],
                wicketKeepers: [],
                allRounders: []
            };

            updateAuctionStatus('Starting second round for unsold players.');
            speakMessageEng('Starting second round for unsold players.');
            nextPlayer();
        } else {
            endAuction();
        }
    } else {
        endAuction();
    }
}

function endAuction() {
    window.scrollTo(0, 0);
    updateAuctionStatus('Auction completed!');
    message='Auction completed!';
    announceMessage(message);
    startAuctionButton.disabled = true;
    saveFinalUnsoldPlayers();
    saveBiddingResultsToJSON();
    displayBiddingResults();
    console.log("hello")
}


function displayBiddingResults() {
    gameContainer.style.display = 'none';
    resultsContainer.style.display = 'block';

    let resultsHtml = `
        <h2>Select a Team to View Results</h2>
        <table>
            <tr>
                <th>Team</th>
                <th>Highest Bid Player</th>
                <th>Remaining Purse (Cr)</th>
                <th>Total Players</th>
                <th>Batsmen</th>
                <th>Bowlers</th>
                <th>All-Rounders</th>
                <th>Foreign Players</th>
                <th>View Team</th>
            </tr>
    `;

    for (let team in teams) {
        let totalSpent = 0;
        let highestBid = 0;
        let highestBidPlayer = "N/A";
        let batsmen = 0, bowlers = 0, allRounders = 0,wicketKeepers=0, foreignPlayers = 0;

        teams[team].players.forEach((player, index) => {
            let bid = teams[team].bids[index] / 10000000; // Convert to crores
            totalSpent += bid;

            if (bid > highestBid) {
                highestBid = bid;
                highestBidPlayer = player.name;
            }

            // Categorizing players
            if (player.category.toLowerCase().includes("batsman")) {
                batsmen++;
            } else if (player.category.toLowerCase().includes("bowler")) {
                bowlers++;
            } else if (player.category.toLowerCase().includes("all-rounder")) {
                allRounders++;
            } else if (player.category.toLowerCase().includes("wicket-keeper")) {
                wicketKeepers++;
            }

            // Separate check for foreign players
            if (player.category.toLowerCase().includes("foreign")) {
                foreignPlayers++;
            }

        });

        let remainingPurse = (120 - totalSpent).toFixed(2); // 120 crore initial budget
        let totalPlayers = teams[team].players.length;

        resultsHtml += `
            <tr>
                <td>${team}</td>
                <td>${highestBidPlayer} (${highestBid.toFixed(2)} Cr)</td>
                <td>${remainingPurse} Cr</td>
                <td>${totalPlayers}</td>
                <td>${batsmen}</td>
                <td>${bowlers}</td>
                <td>${allRounders}</td>
                <td>${foreignPlayers}</td>
                <td>
                    <button onclick="displayTeam('${team}')" class="team-res-btn">
                        <img src="/logos/${team}.png" alt="${team} Logo" class="team-logo">
                        View
                    </button>
                </td>
            </tr>
        `;
    }

    resultsHtml += `</table>`;
    resultsTable.innerHTML = resultsHtml;
}



function displayTeam(team) {
    // Generate the HTML content for the new tab
    let newTabHtml = `
        <html>
        <head>
            <title>Team Info - ${team}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #1e5799 0%,#2989d8 50%,#207cca 51%,#7db9e8 100%);
                    color: #fff;
                    min-height: 100vh;
                }
                h2 {
                    text-align: center;
                    color: #ffcc00;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                }
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                .team-logo {
                    width: 80px; /* Set the size of the logo */
                    height: 80px; /* Set the size of the logo */
                    object-fit: scale-down;
                    border-radius: 28%;
                    background-color: #ffffff7f;
                    padding: 10px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                    margin-right: 20px;
                    
                }
                .player-photo {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 10px;
                    text-align: center;
                }
                th {
                    background-color: rgba(255, 255, 255, 0.1);
                    font-weight: bold;
                }
                td {
                    background-color: rgba(255, 255, 255, 0.1);
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                }
                button {
                    background-color: #ffcc00;
                    color: #000;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background-color 0.3s;
                }
                button:hover {
                    background-color: #ffd633;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="/logos/${team}.png" alt="${team} logo" class="team-logo">
                <h2>Final Bidding Results for ${team}</h2>
            </div>
            <table>
                <tr>
                    <th> photo </th>
                    <th>Player</th>
                    <th>Category</th>
                    <th>Bid Amount (in Crores)</th>
                </tr>
    `;

    // Calculate total bids and add rows for each player
    let totalBids = 0;
    teams[team].players.forEach((player, index) => {
        const bidInCrores = (teams[team].bids[index] || 0) / 10000000; // Convert to crores
        totalBids += bidInCrores; // Accumulate total
        newTabHtml += `
            <tr>
                <td><img src="images/${player.name.toUpperCase()}.png" alt="${player.name}" class="player-photo" onerror="this.src='images/default.png'"></td>
                <td>${player.name}</td>
                <td>${player.category}</td>
                <td>${bidInCrores.toFixed(2)} Crores</td>
            </tr>
        `;
    });

    // Add a final row to display total bids
    newTabHtml += `
            <tr>
                <td colspan="3"><strong>Total Bids</strong></td>
                <td><strong>${totalBids.toFixed(2)} Crores</strong></td>
            </tr>
    `;

    newTabHtml += `
            </table>
            <div class="footer">
                <button onclick="window.close()">Close Tab</button>
            </div>
        </body>
        </html>
    `;

    // Open the content in a new tab
    const newTab = window.open();
    newTab.document.open();
    newTab.document.write(newTabHtml);
    newTab.document.close();
}

let voices = [];

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Voices not loaded yet, listen for event
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      voices = window.speechSynthesis.getVoices();
    });
  }
}

loadVoices();  // Call once on page load

function announceCategory(category) {
  const prabhatVoice = voices.find(voice => voice.name === "Microsoft Prabhat Online (Natural) - English (India)");

  const utterance = new SpeechSynthesisUtterance(`Now auctioning ${category}`);
  utterance.voice = prabhatVoice || voices[0]; // fallback to first voice
  utterance.rate = 1.4;
  utterance.pitch = 1.5; 
  window.speechSynthesis.speak(utterance);
}

function announceCategory2(category) {
    const voices = window.speechSynthesis.getVoices();
    const prabhatVoice = voices.find(voice => voice.name === "Microsoft Prabhat Online (Natural) - English (India)");
    // console.log(prabhatVoice)
    const utterance = new SpeechSynthesisUtterance(`He is a ${category}`);
    utterance.voice = prabhatVoice;
    utterance.rate = 1.4;
    window.speechSynthesis.speak(utterance);
}

function announcePlayer(player) {
    const voices = window.speechSynthesis.getVoices();
    const prabhatVoice = voices.find(voice => voice.name === "Microsoft Prabhat Online (Natural) - English (India)");

    // Announce player's name first
    const utterance = new SpeechSynthesisUtterance(`Player ${player.name} is up for auction`);
    utterance.voice = prabhatVoice;
    utterance.rate = 1.4; 
    window.speechSynthesis.speak(utterance);

    // Announce category after the player's name
    announceCategory2(player.category);

    updateAuctionStatus(`Now auctioning: ${player.name}`);
}



const GEMINI_API_KEY = "YOUR_GEMINI_API"; // Replace with your actual API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
function cleanText(text) {
    return text.replace(/\*/g, "").trim();  // Remove all '*'
}



// Function to pick a random excitement (pitch, rate, volume)
function getRandomExcitement() {
    return {
        pitch: 1.5, // Pitch between 1 and 1.5
        rate: 1.3, // Rate between 0.8 and 1.3
        volume: 1 // Volume between 0.8 and 1.0
    };
}

let globalIndex = 1;  // Initialize global index
async function announceMessage(Message, teams) {
    if (!teams || typeof teams !== "object") {
        console.error("Error: 'teams' is undefined or not an object.");
        return;
    }

    
    // Stack to store auction results
    const auctionStack = [];
    // Extract auction results using a stack approach
    Object.entries(teams).forEach(([teamName, teamData]) => {
        teamData.players.forEach((player, index) => {
            auctionStack.push(`${player.name} to ${teamName} for ₹${teamData.bids[index].toLocaleString('en-IN')}.`);
        });
    });
    // Reverse the stack so that the most recent bid appears first
    const auctionResults = auctionStack
        .reverse()
        .map((entry, idx) => `${idx + 1}. ${entry}`)
        .join("\n");
    
    
    console.log("Auction Results:", auctionResults); // Debugging



const prompt = `🏏 The IPL auction is heating up!

🔥 Current Bid War: ${Message}

📝 Latest Signings:

${auctionResults}

Based on the latest bidding battle (${Message}), write a short, witty English commentary in 2–3 lines that captures the excitement of the IPL auction.

Avoid inappropriate or offensive language — keep it clean, sharp, and professional.

Use a tone similar to that of a clever, experienced cricket commentator — think Nasser Hussain's dry wit, Harsha Bhogle's insight, or Michael Atherton's sharp takes.

*Mention only the top signing from ${auctionResults} — if it's relevant to the current bid (e.g., a bold spend or a strategic shift).*

Keep sentences short, punchy, and full of energy. End with a cinematic, powerful phrase that fits the flow — nothing forced, just naturally impactful.

🔥 Only in English. No translations or explanations.`;




    try {
        const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 150,  
                    topP: 0.9,
                    // topK: 15
                },
                safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }],
            }),
        });

        const data = await response.json();
        console.log("Gemini API Response:", data);

        let commentary = Message; // Default to original message if API fails

        if (data.candidates && data.candidates.length > 0) {
            commentary = cleanText(data.candidates[0].content.parts[0].text);
        }

        await speakMessage(commentary); // Call text-to-speech function
        await nextPlayer();  // Only move to the next player **after** commentary finishes

    } catch (error) {
        console.error("Error fetching AI commentary:", error);
        await speakMessage("Error generating commentary.");
        await nextPlayer();  // Proceed even if there's an error
    }
}



async function speakMessage(message) {
    try {
        const response = await axios.post(
            "https://api.elevenlabs.io/v1/text-to-speech/ELEVENLABS_VOICE_ID",//REPLACE WITH  ELEVENLABS VOICE ID OF YOUR CHOICE
            {
                text: message,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.4,
                    similarity_boost: 0.9,
                    style: 1.0,
                    use_speaker_boost: true
                }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": "ELEVENLABS_API_KEY" // REPLACE WITH ELEVENLABS API KEY
                },
                responseType: "arraybuffer"
            }
        );

        // Convert response to playable audio
        const blob = new Blob([response.data], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        // Return a promise that resolves when the audio finishes playing
        await new Promise((resolve) => {
            audio.onended = resolve;  // Resolve the promise when the audio finishes
            audio.play();
        });
    } catch (error) {
        console.error("Error generating speech:", error);
    }
}






function formatCurrency(amount) {
    if (amount >= 10000000) {
        return (amount / 10000000).toFixed(2) + ' Crores';
    } else if (amount >= 100000) {
        return (amount / 100000).toFixed(2) + ' Lakhs';
    } else {
        return amount.toLocaleString(); // Adds commas for smaller amounts
    }
}

function updateTeamInfo() {
    teamInfo.innerHTML = '';
    for (let team in teams) {
        const foreignPlayerLimitReached = teams[team].foreignPlayers >= 8;
        teamInfo.innerHTML += `
            <div class="team-card ${foreignPlayerLimitReached ? 'foreign-limit-reached' : ''}">
                <div class="team-header">
                    <img src="/logos/${team}.png" alt="${team} logo" class="team-logo">
                    <h3>${team}</h3>
                    <button class="info-button" 
                            onclick="displayTeam('${team}')">Info</button>
                </div>
                <p>Balance: ${formatCurrency(teams[team].balance)}</p>
                <p>Players: ${teams[team].players.length}</p>
                <p>Foreign Players: ${teams[team].foreignPlayers} ${foreignPlayerLimitReached ? '(Limit Reached)' : ''}</p>
            </div>
        `;
    }
}




function showResults() {
    gameContainer.style.display = 'none';
    resultsContainer.style.display = 'block';

    let resultsHtml = '<table><tr><th>Team</th><th>Players</th></tr>';
    for (let team in teams) {
        resultsHtml += `<tr><td>${team}</td><td>${teams[team].players.join(', ')}</td></tr>`;
    }
    resultsHtml += '</table>';

    resultsTable.innerHTML = resultsHtml;
}

// Restart auction
function restartAuction() {
    location.reload();
}




async function initGame() {
    await loadPlayers();
    updateTeamInfo();

    for (let team in teams) {
        teamBids.innerHTML += `
            <div class="team-bid">
                <label for="${team}-bid">${team}</label>
                <input type="number" id="${team}-bid" min="0" max="${teams[team].balance}" placeholder="Enter amount">
                <select id="${team}-denomination">
                    <option value="crore" selected>Crore</option>
                    <option value="lakh">Lakh</option>
                    <option value="unit">Unit</option>
                </select>
            </div>
        `;
    }

    startAuctionButton.addEventListener('click', conductAuction);

    if (players.length > 0) {
        announceCategory(players[0].category);
    }
    socket.emit('setPlayers', players);
    nextPlayer();
}

initGame();