// I create this whole file using the discord developpers page about the discord gateways (https://discord.com/developers/docs/topics/gateway#gateways)
// (And some search on internet)


const channelName_h = document.querySelector('#channelName');
const messagesUl = document.querySelector('#messages');

const TOKEN = "ODQ3MTUyNzU0OTA4MzMyMDM0.Yh_Cvw.JXyH2OtVDpxvXP8WKEggGtelg3o"; // Account created for this project only
let socket = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');
let sequence = null; // Used to keep connection alive (In the Hearbeat payload, and in the Resume one)
let ack_received = true; // To check if the server answered (If not, break the connection and resume it)
let interval_id = 0; // To clear interval if the connection close
let session_id = 0; // To resume session, if connection closed
let member; // The member identified, used to know if it's a bot or not
let channel_id = channelName_h.getAttribute('title'); // Channel to read (base channel: djs-help)
const guild_id = "222078108977594368"; // Guild to read

const headers = {
    'Authorization': TOKEN,
    'Content-Type': 'application/json',
};

const addMessage = message => {
    const line = document.createElement('li');
    const img = document.createElement('img');
    const p = document.createElement('p');
    const h5 = document.createElement('h5');
    const div = document.createElement('div');

    line.id = message.id;

    line.className = "message";
    img.className = "avatar";
    p.className = "messageContent";
    p.title = message.id;
    h5.className = 'username';
    h5.title = message.author.id;
    div.className = "messageText";

    img.src = `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`;
    img.alt = `${message.author.username}'s avatar`;
    p.innerHTML = message.content.replaceAll('\n', '<br/>');
    h5.textContent = `${message.author.username}#${message.author.discriminator} ${message.author.bot ? "(BOT)" : ""}`;

    line.appendChild(img);
    div.appendChild(h5);
    div.appendChild(p);

    if (message.attachments.length > 0) {
        const attachments_div = document.createElement('div');
        attachments_div.className = "attachments";
        for (att of message.attachments) {
            const { url } = att;
            const a = document.createElement('a');
            a.href = url;
            a.target = "_blank";
            a.innerHTML = "Attachment";
            a.className = "attachment";
            attachments_div.appendChild(a);
        };
        div.appendChild(attachments_div);
    };

    line.appendChild(div);
    messagesUl.appendChild(line);
};

const get = (url, headers) => {
    return new Promise((resolve, reject) => {
        fetch(url, {method: 'GET', headers}).then(async rep => {
            const text = await rep.text();
            try {
                resolve(JSON.parse(text));
            } catch (error) {
                console.log(text);
                reject(error);
            };
        });
    });
};

const identify = () => {
    console.log('Identification...');
    socket.send(JSON.stringify({
        "op": 2,
        "d": {
            "token": TOKEN,
            "intents": 512,//32767,
            "properties": {
                // Idk how to retrieve it
                "$os": "Windows",  
            }
        }
    }));
};


// (Not working for now, always receive a 9 OpCode, so the session is closed to open a new one anyway)
const resume = () => {
    console.log('Recovering...');
    socket.send(JSON.stringify({
        "op": 6,
        "d": {
            "token": TOKEN,
            "session_id": session_id,
            "seq": sequence
        }
    }));
    ack_received = true;
};

const initSocketEvents = () => {
    socket.addEventListener('open', async () => {
        // Identify
        if (session_id == 0) {
            member = await get(`https://discord.com/api/v9/users/@me/guilds/${guild_id}/member`, headers);
            if (member.code == 0) {
                headers.Authorization = `Bot ${TOKEN}`;
                member = await get(`https://discord.com/api/v9/users/@me/guilds/${guild_id}/member`, headers);
            };
            console.log(member);
            identify();
        }
        // Or resume
        else {
            resume();
        };
    });

    socket.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        if (data) {
            const opcode = data.op;
            console.log(`OpCode: ${opcode}`);
            if (data.s) sequence = data.s;
            if (actionsByCodes[opcode]) {
                actionsByCodes[opcode](data);
            };
        };
    });

    socket.addEventListener('error', evt => {
        console.log('Error in the WebSocket');
        console.log(evt);
    });
    
    socket.addEventListener('close', evt => {
        console.log('WebSocket closed');
        console.log(evt);
    });
};

const rebootConnection = () => {
        clearInterval(interval_id);
        socket.close(1000);
        socket = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');
        initSocketEvents();
};

const loadOldMessages = async (limit=50) => {
    const messages = await get(`https://discordapp.com/api/v9/channels/${channel_id}/messages?limit=${limit}`, headers);
    for(let i = messages.length - 1; i >= 0; i--) {
        addMessage(messages[i]);
    };
};

const reloadChat = () => {
    messagesUl.innerHTML = "";
    loadOldMessages();
};

// See: https://discord.com/developers/docs/topics/gateway#heartbeating
const heartbeat = () => {
    if (!ack_received) {
        console.log('Previous ACK not received.');
        rebootConnection();
        return;
    };
    console.log('Heartbeat send!');
    socket.send(JSON.stringify({
        "op": 1,
        "d": sequence
    }));
    ack_received = false;
};

// See: https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
const events = {
    "READY": data => {
        session_id = data.d.session_id;
        console.log(`Identified as: ${member.user.username}#${member.user.discriminator} (${member.user.id}) ${member.user.bot ? "(BOT)" : ""}`);
    },
    "MESSAGE_CREATE": async data => {
        if (data.d.channel_id == channel_id) {
            if (member.user.bot) {
                addMessage(data.d);
            } else {
                const msg = (await get(`https://discordapp.com/api/v9/channels/${data.d.channel_id}/messages?limit=1`, headers))[0];
                addMessage(msg);
            };
        } else {
            const a = document.getElementById(data.d.channel_id);
            if (a) a.className = 'unread';
        };
    },
    "MESSAGE_ACK": d => {
        // What's this?
        console.log(d);
    }
};

// See: https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
const actionsByCodes = {
    0: data => {
        console.log(`Event: ${data.t}`);
        if (events[data.t]) events[data.t](data);
    },
    1: heartbeat,
    7: rebootConnection,
    9: () => {
        session_id = 0;
        rebootConnection();
    },
    10: data => {
        console.log(`Heartbeat Interval: ${data.d.heartbeat_interval}`);
        interval_id = setInterval(() => {
            heartbeat();
        }, data.d.heartbeat_interval);
    },
    11: () => {
        ack_received = true;
    }
};

loadOldMessages();
initSocketEvents();