const axios = require("axios");
const core = require("@actions/core");
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

  // Get the list of channels
  let allChannels;
  const url = "https://slack.com/api/conversations.list";
  const data = { token: slackApiToken };
  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const response = await axios.post(url, qs.stringify(data), config);
  console.log(response);
  console.log(response.data);

  //     .then(response, body) {
  //     if (error) {
  //       core.setFailed(error.message);
  //       return;
  //     }
  //     if (response.statusCode != 200 || !body.ok) {
  //       core.setFailed(body.error);
  //       return;
  //     }
  //     // TODO pagination
  //     console.log(JSON.stringify(body));
  //     console.log(body.channels);
  //     allChannels = body.channels;
  //   });

  //   for (let channelName of pairingChannelNames) {
  //     // Find the ID of the channel
  //     channel = allChannels.find((c) => c.name === channelName);
  //     if (!channel) {
  //       core.warning("No such channel: " + channelName);
  //       continue;
  //     }

  //     // Get the list of members of the channel
  //     let members;
  //     request.post("https://slack.com/api/conversations.members", { form: { token: slackApiToken, channel: channel.id } }, function (
  //       error,
  //       response,
  //       body
  //     ) {
  //       if (error) {
  //         core.setFailed(error.message);
  //         return;
  //       }
  //       if (response.statusCode != 200 || !body.ok) {
  //         core.setFailed(body.error);
  //         return;
  //       }
  //       // TODO pagination
  //       members = body.members;
  //     });

  //     console.log(members);

  //     // Shuffle them into pairs
  //     // Attempt to get their names
  //     // Create conversations
  //   }
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
