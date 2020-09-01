const core = require('@actions/core')
const request = require('request');

try {
    const slackAliasesCsv = core.getInput('slack-aliases');
    const aliases = slackAliasesCsv.split(',').map(alias => alias.trim());
    
    // KFY shuffle the array by swapping elements from back to front with random ones before them
    for(let i = aliases.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        var temp = aliases[i];
        aliases[i] = aliases[j];
        aliases[j] = temp;
    }

    let message = "Here are the pairs for this round!\n"

    for(let i = 0; i < aliases.length; i += 2) {
        if(i == aliases.length - 1) {
            message += ", " + aliases[i];
        } else {
            message += "\n-" + aliases[i] + ", " + aliases[i + 1];
        }
    }

    const slackWebhook = core.getInput('slack-webhook');

    request.post(
        slackWebhook,
        { json: { text: message} },
        function(error, response, body) {
            if(error) {
                console.log('Failed to send message: ' + error.message);
                core.setFailed(error.message);
            } else {
                console.log('Invitations sent');
            }
        }
    )

} catch (error) {
    core.setFailed(error.message);
}