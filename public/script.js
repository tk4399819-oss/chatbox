const socket = io();

let loginMode = false;
let currentUser = null;
let selectedUser = null;


const authPage = document.getElementById("authPage");
const chatPage = document.getElementById("chatPage");

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");

const mainAuthBtn = document.getElementById("mainAuthBtn");
const switchAuthBtn = document.getElementById("switchAuthBtn");

const authMessage = document.getElementById("authMessage");

const searchInput = document.getElementById("searchInput");
const userList = document.getElementById("userList");

const myUsername = document.getElementById("myUsername");

const chatUsername = document.getElementById("chatUsername");
const chatStatus = document.getElementById("chatStatus");

const messages = document.getElementById("messages");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const logoutBtn = document.getElementById("logoutBtn");
const backBtn = document.getElementById("backBtn");


/* SWITCH LOGIN / CREATE */

switchAuthBtn.onclick = () => {

    loginMode = !loginMode;

    authMessage.textContent = "";

    if (loginMode) {

        mainAuthBtn.textContent = "Login";

        switchAuthBtn.textContent =
            "Create a new account";

    } else {

        mainAuthBtn.textContent =
            "Create Account";

        switchAuthBtn.textContent =
            "Already have an account? Login";
    }
};


/* AUTH */

mainAuthBtn.onclick = async () => {

    const username =
        usernameInput.value.trim().toLowerCase();

    const password =
        passwordInput.value;

    if (!username || !password) {

        authMessage.textContent =
            "Enter username and password.";

        return;
    }

    try {

        const url = loginMode
            ? "/api/login"
            : "/api/register";

        const response = await fetch(url, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!data.success) {

            authMessage.textContent =
                data.message;

            return;
        }

        currentUser = username;

        localStorage.setItem(
            "chatboxUser",
            username
        );

        openChat();

    } catch (error) {

        authMessage.textContent =
            "Server connection failed.";
    }
};


/* OPEN CHAT */

function openChat() {

    authPage.classList.add("hidden");
    chatPage.classList.remove("hidden");

    myUsername.textContent =
        "@" + currentUser;

    socket.emit("login", currentUser);

    loadUsers();
}


/* LOAD USERS */

async function loadUsers() {

    const search =
        searchInput.value.trim();

    const response =
        await fetch(
            "/api/users?search=" +
            encodeURIComponent(search)
        );

    const users =
        await response.json();

    userList.innerHTML = "";

    users
        .filter(user =>
            user.username !== currentUser
        )
        .forEach(user => {

            const div =
                document.createElement("div");

            div.className = "user";

            div.innerHTML = `
                <div class="user-name">
                    @${user.username}
                </div>

                <div class="status">
                    ${user.online ? "Online" : "Offline"}
                </div>
            `;

            div.onclick = () =>
                selectUser(user);

            userList.appendChild(div);
        });
}


/* SEARCH */

searchInput.addEventListener(
    "input",
    loadUsers
);


/* SELECT USER */

function selectUser(user) {

    selectedUser =
        user.username;

    chatUsername.textContent =
        "@" + user.username;

    chatStatus.textContent =
        user.online
            ? "Online"
            : "Offline";

    messages.innerHTML = "";

    messageInput.disabled = false;
    sendBtn.disabled = false;

    messageInput.focus();
    document.querySelector("main").classList.add("chat-open");
}



/* SEND */

sendBtn.onclick =
    sendMessage;

messageInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            sendMessage();
        }
    }
);


function sendMessage() {

    const text =
        messageInput.value.trim();

    if (!text || !selectedUser) {
        return;
    }

    socket.emit(
        "privateMessage",
        {
            sender: currentUser,
            receiver: selectedUser,
            text
        }
    );

    showMessage(
        text,
        true
    );

    messageInput.value = "";
}


/* RECEIVE */

socket.on(
    "privateMessage",
    data => {

        if (
            data.receiver === currentUser &&
            data.sender === selectedUser
        ) {

            showMessage(
                data.text,
                false
            );
        }
    }
);


/* SHOW MESSAGE */

function showMessage(
    text,
    mine
) {

    const div =
        document.createElement("div");

    div.className =
        "message" +
        (mine ? " mine" : "");

    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTop =
        messages.scrollHeight;
}


/* ONLINE STATUS */

socket.on(
    "userStatus",
    data => {

        loadUsers();

        if (
            selectedUser === data.username
        ) {

            chatStatus.textContent =
                data.online
                    ? "Online"
                    : "Offline";
        }
    }
);


/* LOGOUT */

logoutBtn.onclick = () => {

    localStorage.removeItem(
        "chatboxUser"
    );

    location.reload();
};


/* AUTO LOGIN */

const savedUser =
    localStorage.getItem(
        "chatboxUser"
    );

if (savedUser) {

    currentUser = savedUser;

    openChat();
}
backBtn.onclick = () => {
    document.querySelector("main").classList.remove("chat-open");
    selectedUser = null;
    messageInput.disabled = true;
    sendBtn.disabled = true;
};
