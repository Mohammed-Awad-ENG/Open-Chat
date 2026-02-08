let userId = localStorage.getItem("userId");

if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("userId", userId);
}

const socket = io({
    auth: {
        userId: userId,
    },
});

const path = window.location.pathname;

const roomId = path.replace("/chat-", "");
const params = new URLSearchParams(window.location.search);
const name =
    params.get("name") ||
    `Michael Jackson_${Math.floor(new Date().getDate() * Math.random())}`;
socket.emit("join-room", { roomId, name });

const form = document.getElementById("form");
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input");
    if (input.value.trim()) {
        socket.emit("chat message", {
            roomId,
            message: input.value.trim(),
            name,
        });
        input.value = "";
    }
});

document.querySelector(".send").addEventListener("click", () => {
    const input = document.getElementById("input");
    if (input.value.trim()) {
        socket.emit("chat message", {
            roomId,
            message: input.value.trim(),
            name,
        });
        input.value = "";
    }
});

const notificationSound = document.querySelector(".send-sound");
socket.on("send_to_all", (data) => {
    if (!data || !data.name) return;

    const messages = document.getElementById("messages");
    const li = document.createElement("li");

    li.dataset.senderId = data.senderId;

    const msgClass = data.senderId === userId ? "my-message" : "other-message";
    li.classList.add(msgClass);

    li.innerHTML = `
        <span class="meta">
            ${data.name}
            <span class="time">${data.time}</span>
        </span>
        <div>${data.message}</div>`;

    messages.appendChild(li);
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
    });
    notificationSound.play();
});
function applyMessageClasses() {
    const messages = document.querySelectorAll("#messages li");

    messages.forEach((msg) => {
        const senderId = msg.dataset.senderId;

        if (!senderId) return;

        msg.classList.remove("my-message", "other-message");

        const msgClass = senderId === userId ? "my-message" : "other-message";
        msg.classList.add(msgClass);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    applyMessageClasses();
});

socket.on("connect", () => {
    applyMessageClasses();
});

socket.on("join_msg", (username) => {
    const connectionMsgBox = document.querySelector(".connection-msg-box");
    const div = document.createElement("div");
    div.className = "join";
    div.innerHTML = `<span>${username}</span> joined`;
    connectionMsgBox.appendChild(div);
    setTimeout(() => {
        div.remove();
    }, 5000);
});
socket.on("user_disconnect", (username) => {
    const connectionMsgBox = document.querySelector(".connection-msg-box");
    const div = document.createElement("div");
    div.className = "disconnect";
    div.innerHTML = `<span>${username}</span> disconnected`;
    connectionMsgBox.appendChild(div);
    setTimeout(() => {
        div.remove();
    }, 4000);
});

const input = document.getElementById("input");
const typingStats = document.querySelector(".typing-stats");
let typingTimeout;

input.addEventListener("input", () => {
    socket.emit("typing", { roomId, name });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("typing-stopped", { roomId });
    }, 1000);
});

socket.on(
    "show-typing-stats",
    (user) => (typingStats.innerText = `${user} is typing...`),
);
socket.on("user-stopped-typing", () => (typingStats.innerText = ""));

// settings
document.querySelector(".toggle-settings").addEventListener("click", () => {
    document.querySelector(".settings-box").classList.toggle("open");
});

// switch color & --other-msg-bg localStorage
const othersColorList = document.querySelectorAll(".others-color-list span");
othersColorList.forEach((li) => {
    li.addEventListener("click", () => {
        othersColorList.forEach((li) => li.classList.remove("active"));
        li.classList.add("active");
        document.documentElement.style.setProperty(
            "--other-msg-bg",
            li.getAttribute("data-color"),
        );
        window.localStorage.setItem(
            "--other-msg-bg",
            li.getAttribute("data-color"),
        );
    });
});
const myColorList = document.querySelectorAll(".my-color-list span");
myColorList.forEach((li) => {
    li.addEventListener("click", () => {
        myColorList.forEach((li) => li.classList.remove("active"));
        li.classList.add("active");
        document.documentElement.style.setProperty(
            "--my-msg-bg",
            li.getAttribute("data-color"),
        );
        window.localStorage.setItem(
            "--my-msg-bg",
            li.getAttribute("data-color"),
        );
    });
});
const BackgroundColorList = document.querySelectorAll(
    ".Background-color-list span",
);
BackgroundColorList.forEach((li) => {
    li.addEventListener("click", () => {
        BackgroundColorList.forEach((li) => li.classList.remove("active"));
        li.classList.add("active");
        document.documentElement.style.setProperty(
            "--body-bg",
            li.getAttribute("data-color"),
        );
        window.localStorage.setItem("--body-bg", li.getAttribute("data-color"));
    });
});
const TextColorList = document.querySelectorAll(".txt-color-list span");
TextColorList.forEach((li) => {
    li.addEventListener("click", () => {
        TextColorList.forEach((li) => li.classList.remove("active"));
        li.classList.add("active");
        document.documentElement.style.setProperty(
            "--text-color",
            li.getAttribute("data-color"),
        );
        window.localStorage.setItem(
            "--text-color",
            li.getAttribute("data-color"),
        );
    });
});

window.onload = () => {
    document.documentElement.style.setProperty(
        "--other-msg-bg",
        window.localStorage.getItem("--other-msg-bg"),
    );
    document.documentElement.style.setProperty(
        "--my-msg-bg",
        window.localStorage.getItem("--my-msg-bg"),
    );
    document.documentElement.style.setProperty(
        "--body-bg",
        window.localStorage.getItem("--body-bg"),
    );
    document.documentElement.style.setProperty(
        "--text-color",
        window.localStorage.getItem("--text-color"),
    );
    othersColorList.forEach((li) => {
        if (
            li.getAttribute("data-color") ===
            window.localStorage.getItem("--other-msg-bg")
        ) {
            li.classList.add("active");
        }
        if (window.localStorage.getItem("--other-msg-bg") === null) {
            document
                .querySelector(".others-default-color")
                .classList.add("active");
        }
    });
    myColorList.forEach((li) => {
        if (
            li.getAttribute("data-color") ===
            window.localStorage.getItem("--my-msg-bg")
        ) {
            li.classList.add("active");
        }
        if (window.localStorage.getItem("--my-msg-bg") === null) {
            document.querySelector(".my-default-color").classList.add("active");
        }
    });
    BackgroundColorList.forEach((li) => {
        if (
            li.getAttribute("data-color") ===
            window.localStorage.getItem("--body-bg")
        ) {
            li.classList.add("active");
        }
        if (window.localStorage.getItem("--body-bg") === null) {
            document
                .querySelector(".Background-default-color")
                .classList.add("active");
        }
    });
    TextColorList.forEach((li) => {
        if (
            li.getAttribute("data-color") ===
            window.localStorage.getItem("--text-color")
        ) {
            li.classList.add("active");
        }
        if (window.localStorage.getItem("--text-color") === null) {
            document
                .querySelector(".txt-default-color")
                .classList.add("active");
        }
    });
};
