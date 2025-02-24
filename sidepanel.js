const socket = io('https://chatext.onrender.com', { 
    transports: ['websocket'],
    reconnection: true, // Auto-reconnect on disconnection
    reconnectionAttempts: 5, // Retry 5 times before failing
    reconnectionDelay: 2000 // Wait 2s between attempts
});
let userName = '';
const TENOR_API_KEY = 'AIzaSyDoyEqCXWo1FXr66X2kmnCmid1_QHZaTUg'; // Replace with your key
const emojiList = [
    '😊', '😂', '❤️', '👍', '😢', '😍', '😘', '😜', '😎', '😭',
    '🙌', '👏', '🔥', '💪', '✨', '💕', '💖', '💔', '💯', '🎉',
    '🎂', '🍕', '🍔', '🍟', '🍦', '☕', '🍺', '🍷', '🥳', '🤓',
    '🤔', '🤗', '🤩', '😴', '😡', '😱', '🙈', '🙉', '🙊', '🐱',
    '🐶', '🐻', '🐼', '🐰', '🦁', '🐸', '🐵', '🐴', '🐦', '🌟',
    '☀️', '🌈', '☁️', '❄️', '🌊', '🌺', '🌸', '🍁', '🍀', '⚽',
    '🏀', '🎸', '🎤', '🎬', '📸', '✈️', '🚀', '🚗', '⏰', '💻'
    // Add more here or fetch from a larger source
];

chrome.storage.local.get(['chatUserName'], (result) => {
    if (result.chatUserName) {
        userName = result.chatUserName;
        initializeChat();
    } else {
        promptForName();
    }
});

function promptForName() {
    const name = prompt('Enter your name to join the chat:');
    if (name && name.trim()) {
        userName = name.trim();
        chrome.storage.local.set({ chatUserName: userName }, () => {
            initializeChat();
        });
    } else {
        alert('A valid name is required!');
        promptForName();
    }
}

async function fetchGifs(query = 'funny') {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=12`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results.map(result => result.media_formats.gif.url);
}

function initializeChat() {
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('chatMessage', (msgData) => {
        console.log('Received:', msgData.message);
        const messages = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = msgData.socketId === socket.id ? 'sent' : 'received';

        const nameSpan = document.createElement('span');
        nameSpan.style.fontWeight = 'bold';
        nameSpan.textContent = msgData.name + ': ';
        messageElement.appendChild(nameSpan);

        const contentSpan = document.createElement('span');
        if (msgData.message.startsWith('http') && msgData.message.match(/\.(gif)$/i)) {
            const img = document.createElement('img');
            img.src = msgData.message;
            img.style.maxWidth = '100%';
            contentSpan.appendChild(img);
        } else {
            contentSpan.innerHTML = msgData.message;
        }
        messageElement.appendChild(contentSpan);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        const now = new Date();
        timeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.appendChild(timeSpan);

        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight;
    });

    const input = document.getElementById('message-input');
    const emojiButton = document.getElementById('emoji-button');
    const gifButton = document.getElementById('gif-button');
    const emojiPicker = document.getElementById('emoji-picker');
    const gifPicker = document.getElementById('gif-picker');
    const gifSearch = document.getElementById('gif-search');
    const gifResults = document.getElementById('gif-results');

    // Populate emoji picker
    emojiList.forEach(emoji => {
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji';
        emojiSpan.setAttribute('data-emoji', emoji);
        emojiSpan.textContent = emoji;
        emojiPicker.appendChild(emojiSpan);
    });

    emojiButton.addEventListener('click', () => {
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
        gifPicker.style.display = 'none';
    });

    gifButton.addEventListener('click', async () => {
        gifPicker.style.display = gifPicker.style.display === 'none' ? 'block' : 'none';
        emojiPicker.style.display = 'none';
        if (!gifResults.children.length) {
            const gifs = await fetchGifs();
            displayGifs(gifs);
        }
    });

    emojiPicker.querySelectorAll('.emoji').forEach(emoji => {
        emoji.addEventListener('click', () => {
            input.value += emoji.dataset.emoji;
            emojiPicker.style.display = 'none';
            input.focus();
        });
    });

    gifSearch.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query) {
            const gifs = await fetchGifs(query);
            displayGifs(gifs);
        }
    });

    function displayGifs(gifs) {
        gifResults.innerHTML = '';
        gifs.forEach(gifUrl => {
            const img = document.createElement('img');
            img.src = gifUrl;
            img.addEventListener('click', () => {
                socket.emit('chatMessage', { 
                    message: gifUrl, 
                    socketId: socket.id, 
                    name: userName 
                });
                gifPicker.style.display = 'none';
            });
            gifResults.appendChild(img);
        });
    }

    document.getElementById('send-button').addEventListener('click', sendMessage);

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    if (message) {
        console.log('Sending:', message);
        socket.emit('chatMessage', { 
            message: message, 
            socketId: socket.id, 
            name: userName 
        });
        input.value = '';
    }
}