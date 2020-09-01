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

    console.log('Sending invitations for ' + aliases);

    const slackWebhook = core.getInput('slack-webhook');

    request.post(
        slackWebhook,
        { json: { text: 'Testing!'} },
        function(error, response, body) {
            if(error) {
                core.setFailed(error.message);
            }
        }
    )

    console.log('Invitations sent');
} catch (error) {
    core.setFailed(error.message);
}