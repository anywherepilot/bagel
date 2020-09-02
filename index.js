const axios = require("axios");
const core = require("@actions/core");
const github = require("@actions/github");
const qs = require("qs");

const NUM_ITERATIONS = 1000;

try {
    const slackApiToken = core.getInput("slack-api-token");
    if (slackApiToken) bakeGreatBagels(slackApiToken).then();
    else bakeBasicBagels().then();
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

async function bakeBasicBagels() {
    const slackAliasesCsv = core.getInput("slack-aliases");
    const aliases = slackAliasesCsv
        .split(",")
        .map((alias) => alias.trim())
        .map((alias) => (alias.startsWith("@") ? alias : "@" + alias));

    const githubToken = core.getInput("github-token");
    const octokit = github.getOctokit(githubToken);

    const repoOwnerName = github.context.payload.repository.owner.name;
    const repoName = github.context.payload.repository.name;
    const historyIssueTitle = "Bagel history";

    // Get the history issue
    const { data: issues } = await octokit.issues.listForRepo({
        owner: repoOwnerName,
        repo: repoName
    });
    
    const historyIssue = issues.find(i => i.title === historyIssueTitle);
    let history;
    if(!historyIssue) {
        const response = await octokit.issues.create({
            owner: repoOwnerName,
            repo: repoName,
            title: historyIssueTitle
        });
        historyIssue = response.data;
        history = [];
    } else {
        history = JSON.parse(historyIssue.body);
    }

    // Throw some brute force compute at this
    let bestCombination;
    let highestScore = 0;
    for(let i = 0; i < NUM_ITERATIONS; i++) {
        bestCombination = createRandomPairs(aliases);
        score = score(bestCombination, history);
        if(score > highestScore) {
            highestScore = score;
            bestCombination = [...aliases];
        }
    }

    // Send out the list
    let message = "Here are the pairs for this round!\n";

    for (let i = 0; i < bestCombination.length; i += 2) {
        if (i == bestCombination.length - 1) {
            message += ", " + bestCombination[i];
        } else {
            message += "\n-" + bestCombination[i] + ", " + bestCombination[i + 1];
        }
    }

    const slackWebhook = core.getInput("slack-webhook");

    const response = await axios.post(slackWebhook, { text: message })
    if (response.status != 200) {
        core.setFailed(response.statusText);
        return undefined;
    }
    if (!response.data.ok) {
        core.setFailed(response.data.error);
        return undefined;
    }

    // Update the history
    const newHistory = history + "\n" + JSON.stringify(bestCombination);
    await octokit.issues.update({
        owner: repoOwnerName,
        repo: repoName,
        issue_number: historyIssue.number,
        body: newHistory
    });
}

function score(pairs, history) {
    let score = 0;

    // For each pair
    for(let pair in pairs) {
        let foundInHistory = false;
        // Go back through history
        for(let i = history.length - 1; i >= 0; i++) {
            const historicPairs = history[i];
            // Check if this pair occurred back then
            // TODO handle the odd case
            if(historicPairs.some(historicPair => pair.every(alias => historicPair.includes(alias)))) {
                // The longer ago, the better
                score += history.length - 1 - i;
                foundInHistory = true;
                break;
            }
        }

        // Prioritize new pairs hard
        if(!foundInHistory) score += 100;
    }

    return score;
}

function createRandomPairs(aliases) {
    const shuffled = Array.from(aliases);
    shuffleArray(shuffled);
    
    const pairs = [];
    if(shuffled.length === 1) {
        return shuffled;
    }
    if(shuffled.length % 2 !== 0) {
        for(let i = 0; i < shuffled.length - 3; i++) {
            pairs.push([shuffled[i], shuffled[i + 1]]);
        }
        pairs.push([shuffled[shuffled.length - 3], shuffled[shuffled.length - 2], shuffled[shuffled.length - 1]]);
    }
    else {
        for(let i = 0; i < shuffled.length; i++) {
            pairs.push([shuffled[i], shuffled[i + 1]]);
        }
    }
    return pairs;
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
