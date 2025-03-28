let currentServerCode = '';
let autoRefreshInterval;
let lastRefreshTime;
let timerInterval;

function getServerCodeFromURL() {
    const hash = window.location.hash;
    if (hash) {
        return hash.substring(1);
    }
    return null;
}

function updateURL(serverCode) {
    if (serverCode) {
        window.location.hash = serverCode;
    } else {
        history.pushState("", document.title, window.location.pathname);
    }
}

window.addEventListener('load', () => {
    const serverCode = getServerCodeFromURL();
    if (serverCode) {
        document.getElementById('serverCode').value = serverCode;
        fetchServerInfo();
    }
});

window.addEventListener('hashchange', () => {
    const serverCode = getServerCodeFromURL();
    if (serverCode) {
        document.getElementById('serverCode').value = serverCode;
        fetchServerInfo();
    } else {
        clearServerInfo();
    }
});

function clearServerInfo() {
    document.getElementById('serverName').textContent = 'Server Name';
    document.getElementById('playerCount').textContent = 'Players: 0/0';
    document.getElementById('playerList').innerHTML = '';
    document.getElementById('serverDetails').innerHTML = '';
    document.getElementById('resourcesList').innerHTML = '';
    clearAllIntervals();
    removeRefreshIndicator();
}

async function fetchServerInfo(isAutoRefresh = false) {
    const serverCode = isAutoRefresh ? currentServerCode : document.getElementById('serverCode').value;
    
    if (!serverCode) {
        alert('Please enter a server code');
        return;
    }

    if (!isAutoRefresh) {
        updateURL(serverCode);
        
        currentServerCode = serverCode;
        clearAllIntervals();
        
        let refreshIndicator = document.getElementById('refreshIndicator');
        if (!refreshIndicator) {
            refreshIndicator = document.createElement('div');
            refreshIndicator.id = 'refreshIndicator';
            const serverHeader = document.querySelector('.server-header');
            serverHeader.insertBefore(refreshIndicator, serverHeader.firstChild);
        }
        
        lastRefreshTime = Date.now();
        updateRefreshTimer();
        
        autoRefreshInterval = setInterval(async () => {
            console.log('Auto-refreshing server data...');
            lastRefreshTime = Date.now();
            await fetchServerInfo(true);
        }, 30000);
    }

    try {
        if (!isAutoRefresh) {
            document.getElementById('serverInfo').style.opacity = '0.6';
        }

        console.log(`Fetching server info for ${serverCode}...`);
        const response = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${serverCode}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.Data) {
            if (!isAutoRefresh) {
                alert('Server not found or is offline');
                clearAllIntervals();
                currentServerCode = '';
                removeRefreshIndicator();
                updateURL('');
            }
            return;
        }

        updateServerInfo(data.Data);
        
        if (isAutoRefresh) {
            console.log('Successfully auto-refreshed server data');
            const refreshIndicator = document.getElementById('refreshIndicator');
            if (refreshIndicator) {
                lastRefreshTime = Date.now();
            }
        }
    } catch (error) {
        console.error('Error fetching server info:', error);
        if (!isAutoRefresh) {
            alert(`Error fetching server information: ${error.message}`);
            clearAllIntervals();
            currentServerCode = '';
            removeRefreshIndicator();
            updateURL('');
        }
    } finally {
        if (!isAutoRefresh) {
            document.getElementById('serverInfo').style.opacity = '1';
        }
    }
}

function clearAllIntervals() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateRefreshTimer() {
    const refreshIndicator = document.getElementById('refreshIndicator');
    if (!refreshIndicator || !lastRefreshTime) return;

    const updateTimer = () => {
        const now = Date.now();
        const timeSinceLastRefresh = Math.floor((now - lastRefreshTime) / 1000);
        const timeUntilNextRefresh = Math.max(0, 30 - timeSinceLastRefresh);
        
        if (timeUntilNextRefresh <= 3) {
            refreshIndicator.textContent = `Refreshing${'.'.repeat(3 - timeUntilNextRefresh)}`;
        } else {
            refreshIndicator.textContent = `Auto-refresh in ${timeUntilNextRefresh}s`;
        }
    };

    updateTimer();
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(updateTimer, 1000);
}

function removeRefreshIndicator() {
    const refreshIndicator = document.getElementById('refreshIndicator');
    if (refreshIndicator) {
        refreshIndicator.remove();
    }
    clearAllIntervals();
}

window.addEventListener('beforeunload', () => {
    clearAllIntervals();
    removeRefreshIndicator();
});

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
    const cleanServerName = serverData.hostname.replace(/\^[0-9]/g, '');
    
    document.getElementById('serverName').textContent = cleanServerName;
    document.getElementById('playerCount').textContent = 
        `Players: ${serverData.players.length}/${serverData.svMaxclients}`;

    const playerList = document.getElementById('playerList');
    const currentSearch = playerList.querySelector('.list-search')?.value || '';
    
    playerList.innerHTML = `
        <input type="text" class="list-search" placeholder="Search players..." onkeyup="filterPlayers(this.value)" value="${currentSearch}">
        <div id="playerItems"></div>
    `;
    const playerItems = document.getElementById('playerItems');
    
    const sortedPlayers = [...serverData.players].sort((a, b) => {
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idA - idB;
    });
    
    sortedPlayers.forEach(player => {
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

    const serverDetails = document.getElementById('serverDetails');
    serverDetails.innerHTML = `
        <p>Max Clients: ${serverData.svMaxclients}</p>
        <p>Game Build: ${serverData.gametype}</p>
        <p>Map: ${serverData.mapname}</p>
        <p>OneSync: ${serverData.vars.onesync_enabled ? 'Enabled' : 'Disabled'}</p>
    `;

    const resourcesList = document.getElementById('resourcesList');
    const currentResourceSearch = resourcesList.querySelector('.list-search')?.value || '';
    
    resourcesList.innerHTML = `
        <input type="text" class="list-search" placeholder="Search resources..." onkeyup="filterResources(this.value)" value="${currentResourceSearch}">
        <div id="resourceItems"></div>
    `;
    const resourceItems = document.getElementById('resourceItems');
    if (serverData.resources) {
        const sortedResources = serverData.resources.sort((a, b) => a.localeCompare(b));
        sortedResources.forEach(resource => {
            const resourceElement = document.createElement('div');
            resourceElement.className = 'resource-item';
            resourceElement.textContent = resource;
            resourceItems.appendChild(resourceElement);
        });
    }

    if (currentSearch) filterPlayers(currentSearch);
    if (currentResourceSearch) filterResources(currentResourceSearch);
}

function filterPlayers(searchTerm) {
    const playerItems = document.querySelectorAll('.player-item');
    searchTerm = searchTerm.toLowerCase();
    
    playerItems.forEach(item => {
        const playerName = item.querySelector('.player-info div:nth-child(2)').textContent.toLowerCase();
        const playerId = item.querySelector('.player-info div:nth-child(1)').textContent.toLowerCase();
        
        if (playerName.includes(searchTerm) || playerId.includes(searchTerm)) {
            item.style.display = 'flex';
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

window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}); 