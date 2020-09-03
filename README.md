# Bagel action: meet your coworkers

This action takes a list of people and randomly pairs them up each time to get them all to meet.

The best way to use this action is to provide a list of Slack aliases. The action will write the next set of pairs into a message in your Slack workspace using the webhook you provide.

This action will create an issue in your repository to keep track of the history of pairs. As long as you keep the JSON valid, you can mess with this history if you like. You can close the issue: the action will keep using it as long as the title remains the same.

## Inputs

### github-token

The action needs access to your GitHub token in order to create an issue to keep the history, find the issue again and update its content.

### slack-webhook

The easiest way to set up the action is with a simple [Slack incoming webhook](https://api.slack.com/messaging/webhooks#create_a_webhook). With just a webhook, the action can only send messages to the channel the webhook is connected to, and not perform any other actions in Slack. That means you should provide the list of people yourself, using `slack-aliases`. You also have to create any conversations yourself.

### slack-aliases

A comma separated list of people to pair. They don't necessarily have to be Slack aliases, but if you want the names to end up clickable in the Slack message, they should be. This input is required with and only used with `slack-webhook`.

### slack-api-token

The other **as of yet not fully implemented** way of using the action is to provide a Slack API token. You should provide a token which has at least the following permissions, for the following reasons:

- [channels:read](https://api.slack.com/scopes/channels:read) to [list channels](https://api.slack.com/methods/conversations.list) to convert the names of the channels (`pairing-channels`) to use into channel IDs, and to [list the members](https://api.slack.com/methods/conversations.members) so the only thing teammates need to do to opt in and out is join or leave the channel.
- [im:write](https://api.slack.com/scopes/im:write) to [create new chats](https://api.slack.com/methods/conversations.open) for pairs directly.
- [chat:write](https://api.slack.com/scopes/chat:write) to [write a message](https://api.slack.com/methods/chat.postMessage) in the chat.
- Optionally [users:read](https://api.slack.com/scopes/users:read) to [get the users their name](https://api.slack.com/methods/users.info) if we want to use that in a message.

If you use this input, you must also provide `pairing-channels`.

### pairing-channels

A comma separated list of channels to use for facilitating meetings. The action will, for each of these channels, check who is in there at the moment and pair the members up. This input is required when you provide `slack-api-token`.

## Example usage

Create a secret available to your repository called `SLACK_WEBHOOK`, containing the [Slack incoming webhook](https://api.slack.com/messaging/webhooks#create_a_webhook). The secret `GITHUB_TOKEN` should already be automagically available.

Be sure to check what the latest stable version of the action is, or run with `master` if you are a dare devil.

```
jobs:
  slackNotification:
    runs-on: ubuntu-latest
    steps:
      - name: Slack notification
        uses: anywherepilot/bagel@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
          slack-aliases: 'user1, user2, user3, user4, user5, user6, user7, user8'
```