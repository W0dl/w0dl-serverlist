async function fetchServerInfo() {
    const serverCode = document.getElementById('serverCode').value;
    if (!serverCode) {
        alert('Please enter a server code');
        return;
    }

    try {
        // Fetch server info
        const response = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${serverCode}`);
        
        // Add status code check
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.Data) {
            alert('Server not found or is offline');
            return;
        }

        updateServerInfo(data.Data);
    } catch (error) {
        console.error('Error fetching server info:', error);
        alert(`Error fetching server information: ${error.message}`);
    }
}

function getSteamId(ids) {
    const filteredIdentifiers = ids.filter((identifier) => identifier.startsWith('steam:'));
    if (filteredIdentifiers.length > 0) {
        return hexToDecimal(filteredIdentifiers[0].substring(filteredIdentifiers[0].indexOf(':') + 1));
    }
    return null;
}

function getDiscordId(ids) {
    const filteredIdentifiers = ids.filter((identifier) => identifier.startsWith('discord:'));
    if (filteredIdentifiers.length > 0) {
        return filteredIdentifiers[0].substring(filteredIdentifiers[0].indexOf(':') + 1);
    }
    return null;
}

function hexToDecimal(s) {
    var i, j, digits = [0], carry;
    for (i = 0; i < s.length; i += 1) {
        carry = parseInt(s.charAt(i), 16);
        for (j = 0; j < digits.length; j += 1) {
            digits[j] = digits[j] * 16 + carry;
            carry = (digits[j] / 10) | 0;
            digits[j] %= 10;
        }
        while (carry > 0) {
            digits.push(carry % 10);
            carry = (carry / 10) | 0;
        }
    }
    return digits.reverse().join('');
}

function updateServerInfo(serverData) {
    // Clean up server name by removing color codes
    const cleanServerName = serverData.hostname.replace(/\^[0-9]/g, '');
    
    // Update server name and player count
    document.getElementById('serverName').textContent = cleanServerName;
    document.getElementById('playerCount').textContent = 
        `Players: ${serverData.players.length}/${serverData.svMaxclients}`;

    // Update player list with search
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = `
        <input type="text" class="list-search" placeholder="Search players..." onkeyup="filterPlayers(this.value)">
        <div id="playerItems"></div>
    `;
    const playerItems = document.getElementById('playerItems');
    
    // Sort players by ID
    const sortedPlayers = [...serverData.players].sort((a, b) => {
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idA - idB;
    });
    
    sortedPlayers.forEach(player => {
        console.log('Player identifiers:', player.identifiers);
        const steamId = getSteamId(player.identifiers || []);
        const discordId = getDiscordId(player.identifiers || []);
        
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.innerHTML = `
            <div class="player-info">
                <div>ID: ${player.id || 'N/A'}</div>
                <div>Name: ${player.name}</div>
                <div>Ping: ${player.ping}ms</div>
            </div>
            <div class="player-socials">
                ${steamId ? `<a href="https://steamcommunity.com/profiles/${steamId}" target="_blank" title="Steam Profile">
                    <i class="fab fa-steam"></i>
                </a>` : ''}
                ${discordId ? `<a href="https://discord.com/users/${discordId}" target="_blank" title="Discord Profile">
                    <i class="fab fa-discord"></i>
                </a>` : ''}
            </div>
        `;
        playerItems.appendChild(playerElement);
    });

    // Update server details
    const serverDetails = document.getElementById('serverDetails');
    serverDetails.innerHTML = `
        <p>Max Clients: ${serverData.svMaxclients}</p>
        <p>Game Build: ${serverData.gametype}</p>
        <p>Map: ${serverData.mapname}</p>
        <p>OneSync: ${serverData.vars.onesync_enabled ? 'Enabled' : 'Disabled'}</p>
    `;

    // Update resources list with search and alphabetical sorting
    const resourcesList = document.getElementById('resourcesList');
    resourcesList.innerHTML = `
        <input type="text" class="list-search" placeholder="Search resources..." onkeyup="filterResources(this.value)">
        <div id="resourceItems"></div>
    `;
    const resourceItems = document.getElementById('resourceItems');
    if (serverData.resources) {
        // Sort resources alphabetically
        const sortedResources = serverData.resources.sort((a, b) => a.localeCompare(b));
        sortedResources.forEach(resource => {
            const resourceElement = document.createElement('div');
            resourceElement.className = 'resource-item';
            resourceElement.textContent = resource;
            resourceItems.appendChild(resourceElement);
        });
    }
}

// Add these new functions for search functionality
function filterPlayers(searchTerm) {
    const playerItems = document.querySelectorAll('.player-item');
    searchTerm = searchTerm.toLowerCase();
    
    playerItems.forEach(item => {
        const playerName = item.querySelector('.player-info div:nth-child(2)').textContent.toLowerCase();
        const playerId = item.querySelector('.player-info div:nth-child(1)').textContent.toLowerCase();
        
        if (playerName.includes(searchTerm) || playerId.includes(searchTerm)) {
            item.style.display = 'flex';  // Keep flex display for layout
        } else {
            item.style.display = 'none';
        }
    });
}

function filterResources(searchTerm) {
    const resourceItems = document.querySelectorAll('.resource-item');
    searchTerm = searchTerm.toLowerCase();
    
    resourceItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
} 