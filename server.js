const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const databaseFile = path.join(__dirname, "users.json");

function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(databaseFile, "utf8"));
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(
        databaseFile,
        JSON.stringify(users, null, 2)
    );
}

const users = new Map();

loadUsers().forEach(user => {
    users.set(user.username, {
        username: user.username,
        password: user.password,
        online: false
    });
});


/* REGISTER */

app.post("/api/register", (req, res) => {

    const username =
        String(req.body.username || "")
            .trim()
            .toLowerCase();

    const password =
        String(req.body.password || "");

    if (username.length < 3) {
        return res.json({
            success: false,
            message: "Username must be at least 3 characters."
        });
    }

    if (password.length < 6) {
        return res.json({
            success: false,
            message: "Password must be at least 6 characters."
        });
    }

    if (users.has(username)) {
        return res.json({
            success: false,
            message: "Username already exists."
        });
    }

    const user = {
        username,
        password,
        online: false
    };

    users.set(username, user);

    saveUsers(
        [...users.values()].map(u => ({
            username: u.username,
            password: u.password
        }))
    );

    res.json({
        success: true
    });
});


/* LOGIN */

app.post("/api/login", (req, res) => {

    const username =
        String(req.body.username || "")
            .trim()
            .toLowerCase();

    const password =
        String(req.body.password || "");

    const user = users.get(username);

    if (!user || user.password !== password) {
        return res.json({
            success: false,
            message: "Wrong username or password."
        });
    }

    res.json({
        success: true
    });
});


/* SEARCH USERS */

app.get("/api/users", (req, res) => {

    const search =
        String(req.query.search || "")
            .trim()
            .toLowerCase();

    const result =
        [...users.values()]
            .filter(user =>
                user.username.includes(search)
            )
            .map(user => ({
                username: user.username,
                online: user.online
            }));

    res.json(result);
});


/* SOCKET */

io.on("connection", socket => {

    socket.on("login", username => {

        socket.username = username;

        if (users.has(username)) {
            users.get(username).online = true;
        }

        io.emit("userStatus", {
            username,
            online: true
        });
    });


    socket.on("privateMessage", data => {

        const sender = data.sender;
        const receiver = data.receiver;
        const text =
            String(data.text || "").trim();

        if (!sender || !receiver || !text) {
            return;
        }

        io.sockets.sockets.forEach(client => {

            if (client.username === receiver) {

                client.emit("privateMessage", {
                    sender,
                    receiver,
                    text
                });

            }

        });
    });


    socket.on("disconnect", () => {

        if (!socket.username) {
            return;
        }

        if (users.has(socket.username)) {
            users.get(socket.username).online = false;
        }

        io.emit("userStatus", {
            username: socket.username,
            online: false
        });
    });

});


server.listen(3000, () => {

    console.log(
        "ChatBox running at http://localhost:3000"
    );

});