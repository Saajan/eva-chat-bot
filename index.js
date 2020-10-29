// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');
const { MongoDbStorage } = require('@botbuildercommunity/storage-mongodb');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, ConversationState, UserState } = require('botbuilder');

// This bot's main dialog.
const { ALERTBOT } = require('./alertbot');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });
const mongoDbStorage = new MongoDbStorage('mongodb://localhost:27017/', 'testDatabase', 'testCollection');

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${error}`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${error}`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

const conversationState = new ConversationState(mongoDbStorage);
const userState = new UserState(mongoDbStorage);
const conversationReferences = {};

// Create the main dialog.
const alertBot = new ALERTBOT(conversationState, userState, conversationReferences);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await alertBot.run(context);
    });
});

// Listen for incoming notifications and send proactive messages to users.
server.get('/api/notify/all', async (req, res) => {
    for (const conversationReference of Object.values(conversationReferences)) {
        await adapter.continueConversation(conversationReference, async turnContext => {
            await turnContext.sendActivity('proactive hello');
        });
    }
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.write('<html><body><h1>Proactive messages have been sent to all.</h1></body></html>');
    res.end();
});

server.get('/api/notify/:conversationID', async (req, res) => {
    const { conversationID } = req.params;
    const conversationReference = conversationReferences[conversationID];
    await adapter.continueConversation(conversationReference, async turnContext => {
        await turnContext.sendActivity('proactive hello');
    });
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.write(`<html><body><h1>Proactive messages have been sent to ${conversationID}.</h1></body></html>`);
    res.end();
});
