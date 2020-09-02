const core = require("@actions/core");
const request = require("request");

try {
  const slackApiToken = core.getInput("slack-api-token");
  if (slackApiToken) bakeGreatBagels(slackApiToken);
  else bakeBasicBagels();
} catch (error) {
  core.setFailed(error.message);
}

function bakeGreatBagels(slackApiToken) {
  const pairingChannelsCsv = core.getInput("pairing-channels");
  const pairingChannels = pairingChannelsCsv
    .split(",")
    .map((channel) => channel.trim())
    .map((channel) => (channel.startsWith("#") ? channel.substr(1) : channel));

  // Get the list of channels
  let allChannels;
  request.post("https://slack.com/api/conversations.list", { form: { token: slackApiToken } }, function (error, response, body) {
    if (response.statusCode != 200 || !body.ok) core.setFailed(body.error);
    allChannels = response.channels;
    console.log("response:");
    console.log(JSON.stringify(response));
    console.log("body:");
    console.log(JSON.stringify(body));
    console.log("error:");
    console.log(JSON.stringify(error));
  });

  for (let channel of pairingChannels) {
    // Find the ID of the channel
    // Get the list of members of the channel
    // Shuffle them into pairs
    // Attempt to get their names
    // Create conversations
  }
}

function bakeBasicBagels() {
  const slackAliasesCsv = core.getInput("slack-aliases");
  const aliases = slackAliasesCsv
    .split(",")
    .map((alias) => alias.trim())
    .map((alias) => (alias.startsWith("@") ? alias : "@" + alias));

  // KFY shuffle the array by swapping elements from back to front with random ones before them
  for (let i = aliases.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    var temp = aliases[i];
    aliases[i] = aliases[j];
    aliases[j] = temp;
  }

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
