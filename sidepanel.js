const socket = io('https://chatext.onrender.com', { 
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000
});
let userName = '';
let unreadCount = 0;
let replyingTo = null;
let typingTimeout = null; // To debounce stopTyping
const TENOR_API_KEY = 'AIzaSyDoyEqCXWo1FXr66X2kmnCmid1_QHZaTUg'; // Replace with your actual Tenor API key
const emojiList = [
    '😊', '😂', '❤️', '👍', '😢', '😍', '😘', '😜', '😎', '😭',
    '🙌', '👏', '🔥', '💪', '✨', '💕', '💖', '💔', '💯', '🎉',
    '🎂', '🍕', '🍔', '🍟', '🍦', '☕', '🍺', '🍷', '🥳', '🤓',
    '🤔', '🤗', '🤩', '😴', '😡', '😱', '🙈', '🙉', '🙊', '🐱',
    '🐶', '🐻', '🐼', '🐰', '🦁', '🐸', '🐵', '🐴', '🐦', '🌟',
    '☀️', '🌈', '☁️', '❄️', '🌊', '🌺', '🌸', '🍁', '🍀', '⚽',
    '🏀', '🎸', '🎤', '🎬', '📸', '✈️', '🚀', '🚗', '⏰', '💻'
];

chrome.storage.local.get(['chatUserName'], (result) => {
    if (result.chatUserName) {
        userName = result.chatUserName;
        console.log('Loaded username from storage:', userName);
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
            console.log('Set username:', userName);
            initializeChat();
            socket.emit('userJoined', userName);
            console.log('Emitted userJoined with:', userName);
        });
    } else {
        alert('A valid name is required!');
        promptForName();
    }
}

async function fetchGifs(query = 'funny') {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=12`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results.map(result => result.media_formats.gif.url);
    } catch (error) {
        console.error('Failed to fetch GIFs:', error);
        return [];
    }
}

function initializeChat() {
    const onlineUsersBtn = document.getElementById('online-users-btn');
    const onlineUsersDropdown = document.getElementById('online-users-dropdown');
    const onlineCount = document.getElementById('online-count');
    const userListContainer = document.getElementById('user-list');
    const input = document.getElementById('message-input');
    const emojiButton = document.getElementById('emoji-button');
    const gifButton = document.getElementById('gif-button');
    const emojiPicker = document.getElementById('emoji-picker');
    const gifPicker = document.getElementById('gif-picker');
    const gifSearch = document.getElementById('gif-search');
    const gifResults = document.getElementById('gif-results');
    const contextMenu = document.getElementById('context-menu');
    const replyOption = document.getElementById('reply-option');
    const typingIndicator = document.getElementById('typing-indicator');

    unreadCount = 0;
    updateBadge();

    socket.on('connect', () => {
        console.log('Connected to server with socket ID:', socket.id);
        socket.emit('userJoined', userName);
        console.log('Emitted userJoined on connect:', userName);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
    });

    socket.on('updateUsers', (userList) => {
        console.log('Received updateUsers:', userList);
        onlineCount.textContent = userList.length;
        userListContainer.innerHTML = '';
        if (userList.length === 0) {
            const noUsers = document.createElement('li');
            noUsers.textContent = 'No users online';
            userListContainer.appendChild(noUsers);
        } else {
            userList.forEach(user => {
                const userItem = document.createElement('li');
                userItem.textContent = user;
                userListContainer.appendChild(userItem);
            });
        }
    });

    socket.on('chatMessage', (msgData) => {
        const messages = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = msgData.socketId === socket.id ? 'sent' : 'received';
        messageElement.dataset.socketId = msgData.socketId;
        messageElement.dataset.name = msgData.name;
        messageElement.dataset.message = msgData.message;

        if (msgData.replyTo) {
            const quoteDiv = document.createElement('div');
            quoteDiv.className = 'quote';
            const quoteName = document.createElement('span');
            quoteName.className = 'quote-name';
            quoteName.textContent = msgData.replyTo.name;
            const quoteText = document.createElement('span');
            quoteText.className = 'quote-text';
            quoteText.textContent = msgData.replyTo.message;
            quoteDiv.appendChild(quoteName);
            quoteDiv.appendChild(quoteText);
            messageElement.appendChild(quoteDiv);
        }

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

        if (msgData.socketId !== socket.id) {
            unreadCount++;
            console.log('New message received, unread count:', unreadCount);
            updateBadge();
        }
    });

    socket.on('typing', (data) => {
        typingIndicator.textContent = `${data.name} is typing...`;
        console.log(`${data.name} is typing...`);
    });

    socket.on('stopTyping', (data) => {
        typingIndicator.textContent = '';
        console.log(`${data.name} stopped typing`);
    });

    document.getElementById('messages').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const messageElement = e.target.closest('div.sent, div.received');
        if (messageElement) {
            replyingTo = {
                socketId: messageElement.dataset.socketId,
                name: messageElement.dataset.name,
                message: messageElement.dataset.message
            };
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        }
    });

    replyOption.addEventListener('click', () => {
        if (replyingTo) {
            input.value = ``;
            input.focus();
            contextMenu.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    });

    onlineUsersBtn.addEventListener('click', () => {
        onlineUsersDropdown.classList.toggle('show');
    });

    window.addEventListener('click', (event) => {
        if (!onlineUsersBtn.contains(event.target) && !onlineUsersDropdown.contains(event.target)) {
            onlineUsersDropdown.classList.remove('show');
        }
    });

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

    input.addEventListener('input', () => {
        socket.emit('typing');
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping');
        }, 1000); // Stop typing after 1 second of inactivity
    });

    input.addEventListener('blur', () => {
        socket.emit('stopTyping');
        clearTimeout(typingTimeout);
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
                    name: userName,
                    replyTo: replyingTo
                });
                gifPicker.style.display = 'none';
                replyingTo = null;
                socket.emit('stopTyping'); // Stop typing when sending GIF
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
    let message = input.value.trim();
    if (message) {
        if (replyingTo) {
            const replyPrefix = ``;
            if (message.startsWith(replyPrefix)) {
                message = message.substring(replyPrefix.length).trim();
            }
        }
        socket.emit('chatMessage', { 
            message: message, 
            socketId: socket.id, 
            name: userName,
            replyTo: replyingTo
        });
        input.value = '';
        replyingTo = null;
        socket.emit('stopTyping'); // Stop typing when message is sent
    }
}

function updateBadge() {
    chrome.runtime.sendMessage({
        type: 'updateBadge',
        count: unreadCount
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending badge update:', chrome.runtime.lastError);
        } else {
            console.log('Badge updated to:', unreadCount);
        }
    });
}