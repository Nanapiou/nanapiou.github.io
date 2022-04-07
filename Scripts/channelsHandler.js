let oldButton;

const clickCallback = evt => {
    let { target } = evt;
    const id = target.id;
    if (id && id != oldButton.id) {
        channelName_h.textContent = target.textContent;
        channelName_h.title = target.id;
        channel_id = target.id;
        oldButton.className = "";
        target.className = "active";
        oldButton = target;
        reloadChat();
    } else console.log(target);
};

// Anonymous function, to await Promises...
(async () => {
const channels = await get(`https://discordapp.com/api/v9/guilds/${guild_id}/channels`, headers);
const channelsUl = document.querySelector('#channels');
channels.sort((a, b) => {
    return a.position - b.position;
});
for(const channel of channels) {
    if (channel.type === 0 && channel.last_message_id) {
        // Id is the everyone one of the guild, just work for this one.
        const everyoneDeny = parseInt((channel.permission_overwrites.find(e => e.id == "222078108977594368") || {}).deny);
        // See: https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
        if ((everyoneDeny & 0x400) != 0x400 && (everyoneDeny & 0x10000) != 0x10000) {
            const line = document.createElement('li');
            const a = document.createElement('a');

            a.id = channel.id;
            a.className = 'unread';
            a.textContent = "#" + channel.name;
            // Base channel (djs-help)
            if (channel.id == channel_id) {
                oldButton = a
                a.className = "active";
                channelName_h.textContent = "#" + channel.name;
            };

            line.appendChild(a);
            a.addEventListener('click', clickCallback);
            channelsUl.appendChild(line);
        };
    };
};
})();