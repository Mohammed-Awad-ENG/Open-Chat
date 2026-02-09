const express = require("express");
const app = express();
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const server = http.createServer(app);
const rateLimit = require("express-rate-limit");
app.use(express.static(path.join(__dirname, "pages")));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
});

app.use(limiter);


const pacePageModel = fs.readFileSync(
    path.join(__dirname, "pages", "index.html"),
    "utf8",
);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "join.html"));
});

app.get("/chat", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "index.html"));
});

app.get("/chat-:id", (req, res) => {
    const { id } = req.params;
    const filePath = path.join(__dirname, "pages", `chat-${id}.html`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, pacePageModel, "utf8");
        let currentPage = fs.readFileSync(filePath, "utf8");
        let now = new Date();
        currentPage = currentPage.replace(
            /<div class="create-date">\s*<\/div>/,
            `<div class="create-date">Chat Created in <span>${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}</span></div>`,
        );
        fs.writeFileSync(filePath, currentPage, "utf8");
    }
    res.sendFile(filePath, (err) => {
        if (err) res.status(500).send(err);
    });
});

app.all(/.*/, (_, res) => {
    const lostPage = fs.readFileSync(
        path.join(__dirname, "pages", "lost_404.html"),
        "utf8",
    );
    res.status(404).send(lostPage);
});
// -----------------------------------------------
const io = new Server(server);

app.use(
    "/socket.io",
    express.static(path.join(__dirname, "node_modules/socket.io-client/dist")),
);
app.use(cors());
function getTime() {
    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    const AmPm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    return `${hours}:${minutes} ${AmPm}`;
}
io.on("connection", (socket) => {
    socket.userId = socket.handshake.auth.userId;
    socket.on("join-room", ({ roomId, name }) => {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        socket.join(roomId);

        socket.roomId = roomId;
        socket.name = name;

        socket.to(roomId).emit("send_to_all", name);
        socket.to(roomId).emit("join_msg", name);
    });

    socket.on("chat message", ({ roomId, message, name }) => {
        if (!message || message.length > 400) {
            return;
        }
        name = name.charAt(0).toUpperCase() + name.slice(1);
        io.to(roomId).emit("send_to_all", {
            name,
            message,
            time: getTime(),
            senderId: socket.userId,
        });

        const filePath = path.join(__dirname, "pages", `chat-${roomId}.html`);

        let currentPage = fs.readFileSync(filePath, "utf8");

        const newMessageHTML = `<li data-sender-id="${socket.userId}"><span>${name} <span>${getTime()}</span></span> ${message}</li>\n`;

        currentPage = currentPage.replace("</ul>", newMessageHTML + "</ul>");

        fs.writeFileSync(filePath, currentPage, "utf8");
    });

    socket.on("typing", ({ roomId, name }) => {
        socket.to(roomId).emit("show-typing-stats", name);
    });

    socket.on("typing-stopped", ({ roomId }) => {
        socket.to(roomId).emit("user-stopped-typing");
    });

    socket.on("disconnect", () => {
        if (socket.roomId && socket.name) {
            socket.to(socket.roomId).emit("user_disconnect", socket.name);
        }
    });
});

const port = 3000;
server.listen(port, () =>
    console.log(`app listening on http://localhost:${port}`),
);

