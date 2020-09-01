const core = require('@actions/core')

try {
    const slackAliasesCsv = core.getInput('slack-aliases');
    const aliases = slackAliasesCsv.split(',').map(alias => alias.trim());
    
    // KFY shuffle the array by swapping elements from back to front with random ones before them
    for(let i = aliases.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    console.log('Sending invitations for ' + aliases);

    const slackWebhook = core.getInput('slack-webhook');
    const request = new XMLHttpRequest();
    request.open('POST', slackWebhook);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify({
        text: "Testing!"
    }));

    console.log('Invitations sent');
} catch (error) {
    core.setFailed(error.message);
}