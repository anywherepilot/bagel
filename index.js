const axios = require("axios");
const core = require("@actions/core");
const github = require("@actions/github");
const qs = require("qs");

const NUM_ITERATIONS = 1000;
const HISTORY_ISSUE_TITLE = "Bagel history";

try {
    console.log("Bagel version 1.0.2");
    const slackApiToken = core.getInput("slack-api-token");
    if (slackApiToken) bakeGreatBagels(slackApiToken).then();
    else bakeBasicBagels().then();
} catch (error) {
    core.setFailed(error.message);
}

/**
 * The main method performing the pairing work when only a Slack webhook is provided.
 */
async function bakeBasicBagels() {
    const aliases = getAliases();
    const githubToken = core.getInput("github-token");
    const octokit = github.getOctokit(githubToken);

    const historyIssue = getHistoryIssue(octokit);
    const history = getHistory(historyIssue);

    console.log(`History: ${JSON.stringify(history)}`);

    const pairList = getGoodPairList(aliases, history);
    sendPairListSlackMessage(pairList);

    history.push(pairList);
    updateHistory(history, historyIssue.number, octokit);
}

/**
 * Reads the slack-aliases input and separates it into an array of aliases, making sure they all start with '@'.
 *
 * @returns {string[]} The array of aliases provided to the action.
 */
function getAliases() {
    const slackAliasesCsv = core.getInput("slack-aliases");
    const aliases = slackAliasesCsv
        .split(",")
        .map((alias) => alias.trim())
        .map((alias) => (alias.startsWith("@") ? alias : "@" + alias));
    return aliases;
}

/**
 * Gets the issue containing the history of pairs, creating it if necessary.
 *
 * @param {InstanceType<typeof GitHub>} octokit GitHub client.
 * @returns {IssuesListForRepoResponseData} An issue in the repository the action is running in, containing the pairing history.
 */
async function getHistoryIssue(octokit) {
    const { data: issues } = await octokit.issues.listForRepo({
        owner: github.context.payload.repository.owner.name,
        repo: github.context.payload.repository.name,
    });

    let historyIssue = issues.find((i) => i.title === HISTORY_ISSUE_TITLE);

    if (!historyIssue) {
        console.log("No history issue found: creating");
        const response = await octokit.issues.create({
            owner: github.context.payload.repository.owner.name,
            repo: github.context.payload.repository.name,
            title: HISTORY_ISSUE_TITLE,
        });
        historyIssue = response.data;
    } else {
        console.log(`Found history issue ${historyIssue.number}`);
    }

    return historyIssue;
}

/**
 * Gets the pairing history from the body of an issue. Returns an empty array when there is no issue or no body.
 *
 * @param {IssuesListForRepoResponseData} historyIssue The issue containing the history in its body property.
 * @returns {string[][][]} An outer array of historic pairings, which are themselves arrays of pairs, which are arrays of aliases.
 */
function getHistory(historyIssue) {
    let history;
    if (historyIssue.body && historyIssue.body.length > 0) {
        history = JSON.parse(historyIssue.body);
    } else {
        history = [];
    }
    return history;
}

/**
 * Creates a set of pairs of aliases trying to maximize new pairs and secondly pairs that have not happened for as long as possible,
 * based on the history.
 *
 * If the aliases list contains an odd number, there will be one group of three.
 *
 * @param {string[]} aliases The aliases to pair up.
 * @param {string[][][]} history The history of previous sets of pairs.
 * @returns {string[][]} A new list of pairs.
 */
function getGoodPairList(aliases, history) {
    let bestCombination;
    if (history.length === 0) {
        bestCombination = createRandomPairs(aliases);
    } else {
        let currentCombination;
        let highestScore = 0;
        let currentScore;
        // Throw some brute force compute at this
        for (let i = 0; i < NUM_ITERATIONS; i++) {
            currentCombination = createRandomPairs(aliases);
            currentScore = score(currentCombination, history);
            if (currentScore > highestScore) {
                highestScore = currentScore;
                bestCombination = currentCombination;
                console.log(
                    `New highest score in iteration ${i}: ${highestScore}, for combination ${JSON.stringify(bestCombination)}`
                );
            }
        }
    }

    return bestCombination;
}

/**
 * Scores a set of pairs based on how long ago it has been for each pair to meet, the longer the better. Completely new pairs get
 * a very high score.
 *
 * @param {string[][]} pairs The list of pairs to score
 * @param {string[][][]} history The historic context to score the list of pairs in.
 */
function score(pairs, history) {
    let result = 0;

    // For each pair
    for (let pair of pairs) {
        let foundInHistory = false;
        // Go back through history
        for (let i = history.length - 1; i >= 0; i--) {
            const historicPairs = history[i];
            // Check if this pair occurred back then
            for (let historicPair of historicPairs) {
                if (
                    (historicPair.includes(pair[0]) && historicPair.includes(pair[1])) ||
                    (pair.length === 3 &&
                        ((historicPair.includes(pair[0]) && historicPair.includes(pair[2])) ||
                            (historicPair.includes(pair[1]) && historicPair.includes(pair[2]))))
                ) {
                    // The longer ago, the better
                    result += history.length - 1 - i;
                    foundInHistory = true;
                    break;
                }
            }
            if (foundInHistory) break;
        }

        // Prioritize new pairs hard
        if (!foundInHistory) result += 100;
    }

    return result;
}

/**
 * Sends a message to the slack-webhook input with information on the pairs in the array.
 *
 * @param {string[][]} pairList The pairs to inform.
 */
async function sendPairListSlackMessage(pairList) {
    // Send out the list
    let message = "Here are the pairs for this round!\n";

    for (let pair of pairList) {
        message += "\n- " + pair.join(", ");
    }

    const slackWebhook = core.getInput("slack-webhook");

    await axios.post(slackWebhook, { text: message });
}

/**
 * Writes a history out to an issue.
 *
 * @param {string[][][]} history The history to write
 * @param {number} historyIssueNumber The number of the issue in the repo the action is running on whose body to replace with the history.
 * @param {InstanceType<typeof GitHub>} octokit GitHub client.
 */
async function updateHistory(history, historyIssueNumber, octokit) {
    console.log(`Storing new full history in issue ${historyIssueNumber}:\n` + JSON.stringify(history));
    await octokit.issues.update({
        owner: github.context.payload.repository.owner.name,
        repo: github.context.payload.repository.name,
        issue_number: historyIssueNumber,
        body: JSON.stringify(history),
    });
}

/**
 * Creates a pseudo random combination of pairs of aliases, with every alias in exactly one pair. All pairs contain two aliases, except
 * the last one in case of an odd number, in which case it contains three. An empty array returns an empty array, and an array with a
 * single element returns the array itself.
 *
 * @param {string[]} aliases List of aliases to randomly pair up.
 */
function createRandomPairs(aliases) {
    const shuffled = Array.from(aliases);
    shuffleArray(shuffled);

    const pairs = [];
    if (shuffled.length === 1) {
        return shuffled;
    }
    if (shuffled.length % 2 !== 0) {
        for (let i = 0; i < shuffled.length - 3; i += 2) {
            pairs.push([shuffled[i], shuffled[i + 1]]);
        }
        pairs.push([shuffled[shuffled.length - 3], shuffled[shuffled.length - 2], shuffled[shuffled.length - 1]]);
    } else {
        for (let i = 0; i < shuffled.length; i += 2) {
            pairs.push([shuffled[i], shuffled[i + 1]]);
        }
    }
    return pairs;
}

/**
 * Takes an array and evenly pseudo-randomly shuffles its elements in place.
 *
 * @param {any[]} array The array to shuffle.
 */
function shuffleArray(array) {
    // KFY shuffle the array by swapping elements from back to front with random ones before them
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

/**
 * This method is a work in progress. Since it requires extensive permissions in Slack, it is unlikely large organizations
 * their administrators will allow the action to perform this activity. The goal is to:
 *
 * - For a series of user provided channels.
 * - Get the list of members in those channels.
 * - Pair them up.
 * - Optionally get their user info so we can call them out by alias.
 * - Create a conversation for each pair, introducing them to one another. [not implemented]
 *
 * @param {string} slackApiToken A Slack API token with enough rights to perform a series of actions. See README.
 */
async function bakeGreatBagels(slackApiToken) {
    const pairingChannelNamesCsv = core.getInput("pairing-channels");
    const pairingChannelNames = pairingChannelNamesCsv
        .split(",")
        .map((channel) => channel.trim())
        .map((channel) => (channel.startsWith("#") ? channel.substr(1) : channel));

    // Find out which scopes we have
    let responseData = await callSlackApi("apps.permissions.scopes.list", { token: slackApiToken });
    if (!responseData) return;
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
