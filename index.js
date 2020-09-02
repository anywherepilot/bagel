const axios = require("axios");
const core = require("@actions/core");
const github = require("@actions/github");
const qs = require("qs");

try {
    const slackApiToken = core.getInput("slack-api-token");
    if (slackApiToken) bakeGreatBagels(slackApiToken).then();
    else bakeBasicBagels();
} catch (error) {
    core.setFailed(error.message);
}

async function bakeGreatBagels(slackApiToken) {
    const pairingChannelNamesCsv = core.getInput("pairing-channels");
    const pairingChannelNames = pairingChannelNamesCsv
        .split(",")
        .map((channel) => channel.trim())
        .map((channel) => (channel.startsWith("#") ? channel.substr(1) : channel));

    // Find out which scopes we have
    let responseData = await callSlackApi("apps.permissions.scopes.list", { token: slackApiToken });
    if(!responseData) return;
    const scopes = responseData.scopes;

    // Get the list of channels
    responseData = await callSlackApi("conversations.list", { token: slackApiToken });
    if (!responseData) return;
    const allChannels = responseData.channels;

    for (let channelName of pairingChannelNames) {
        // Find the ID of the channel
        channel = allChannels.find((c) => c.name === channelName);
        if (!channel) {
            core.warning("No such channel: " + channelName);
            continue;
        }

        // Get the list of members of the channel
        responseData = await callSlackApi("conversations.members", { token: slackApiToken, channel: channel.id });
        if (!responseData) continue;
        members = responseData.members;
        console.log(`Members in channel ${channelName}: ${members}`);

        // Shuffle them into pairs
        shuffleArray(members);

        for (let i = 0; i < members.length; i += 2) {
            // TODO handle odd case

            // Attempt to get their names
            

            // Create conversation
        }
    }
}

function bakeBasicBagels() {
    const slackAliasesCsv = core.getInput("slack-aliases");
    const aliases = slackAliasesCsv
        .split(",")
        .map((alias) => alias.trim())
        .map((alias) => (alias.startsWith("@") ? alias : "@" + alias));

    const githubToken = core.getInput("github-token");
    const octokit = github.getOctokit(githubToken);

    await octokit.issues.create({
        owner: 'anywherepilot',
        repo: 'bagel-test',
        title: 'test 1'
    });

    shuffleArray(aliases);

    let message = "Here are the pairs for this round!\n";

    for (let i = 0; i < aliases.length; i += 2) {
        if (i == aliases.length - 1) {
            message += ", " + aliases[i];
        } else {
            message += "\n-" + aliases[i] + ", " + aliases[i + 1];
        }
    }

    const slackWebhook = core.getInput("slack-webhook");

    request.post(slackWebhook, { json: { text: message } }, function (error, response, body) {
        if (error) {
            console.log("Failed to send message: " + error.message);
            core.setFailed(error.message);
        } else {
            console.log("Invitations sent");
        }
    });
}

function shuffleArray(array) {
    // KFY shuffle the array by swapping elements from back to front with random ones before them
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

async function callSlackApi(method, arguments) {
    const url = `https://slack.com/api/${method}`;
    const config = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    };
    const response = await axios.post(url, qs.stringify(arguments), config);
    if (response.status != 200) {
        core.setFailed(response.statusText);
        return undefined;
    }
    if (!response.data.ok) {
        core.setFailed(response.data.error);
        return undefined;
    }
    // TODO pagination
    return response.data;
}
