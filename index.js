// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');
let appInsights = require('applicationinsights');
const restifyBodyParser = require('restify-plugins').bodyParser;
const axios = require('axios');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState, CardFactory } = require('botbuilder');

// This bot's main dialog.
const { EVABOT } = require('./evabot');

const AlertNotifyCard = require('./resources/adaptiveCards/alert-notify-card.json');
const AllNotifyCard = require('./resources/adaptiveCards/all-notify-card.json');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });
const memoryStorage = new MemoryStorage();

appInsights.setup(`${process.env.InstrumentationKey}`).start();

const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create HTTP server
const server = restify.createServer();
server.use(restifyBodyParser());
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

let conversationReferences = [];

const getAllUsers = async () => {
    try {
        const response = await axios.get(`${process.env.ApiUrl}/api/v1/user/all`);
        const { data: { data } } = response;
        conversationReferences = data;
    } catch (error) {
        conversationReferences = [];
    }
};

// Create the main dialog.
const evaBot = new EVABOT(conversationState, userState, getAllUsers);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await evaBot.run(context);
    });
});

// Listen for incoming notifications and send proactive messages to users.
server.post('/api/notify/all', async (req, res) => {
    const { title, description, type, baseURL } = req.body;
    let promises = conversationReferences.map(async profile => {
        const { meta } = profile;
        await adapter.continueConversation(meta, async turnContext => {
            let cardJson = JSON.parse(JSON.stringify(AllNotifyCard));
            cardJson.body[0].columns[0].items[0].text = `**${title}**`;
            cardJson.body[0].columns[0].items[1].text = `**${type}**`;
            cardJson.body[0].columns[0].items[2].text = `_${description}_`;
            cardJson.body[0].columns[1].items[0].url = `${process.env.AppUrl}/images/Eva.png`;
            cardJson.actions[0].url = `${process.env.AppUrl}/${type}`;
            const adaptiveCard = CardFactory.adaptiveCard(cardJson);
            await context.sendActivity(`Notification : ${title} of type ${type} triggered. ${description}`);
            await context.sendActivity(`Link : ${process.env.AppUrl}/${type}`);
            await turnContext.sendActivity({
                text: '',
                attachments: [adaptiveCard]
            });
        });
    });

    try {
        let data = await Promise.all(promises);
        await res.send('success');
        await res.status(200);
        await res.end();
    } catch (error) {
        await res.send('error');
        await res.status(404);
        await res.end();
    }
});

server.post('/api/notify/:conversationID', async (req, res) => {
    const { conversationID } = req.params;
    const { trigger_value, diagnostic_url, metric, condition, value, name, trigger_date } = req.body;
    const conversationReference = await conversationReferences.find(o => o.id == conversationID);
    if (conversationReference.id) {
        const { meta } = conversationReference;
        await adapter.continueConversation(meta, async turnContext => {
            let cardJson = JSON.parse(JSON.stringify(AlertNotifyCard));
            cardJson.body[0].columns[0].items[0].text = `_Alert Name_ : **${name}**`;
            cardJson.body[0].columns[0].items[1].text = `_Metrics_ : **${metric}**`;
            cardJson.body[0].columns[0].items[2].text = `_Condition_ : **${condition} ${value}**`;
            cardJson.body[0].columns[0].items[3].text = `**${trigger_value}**`;
            cardJson.body[0].columns[0].items[4].text = `_${trigger_date}_`;
            cardJson.actions[0].url = `${process.env.AppUrl}/help`;
            const adaptiveCard = CardFactory.adaptiveCard(cardJson);
            await context.sendActivity(`Alert : ${name} is triggered at ${trigger_date} for value ${trigger_value}`);
            await context.sendActivity(`Link : ${process.env.AppUrl}/help`);
            await turnContext.sendActivity({
                text: '',
                attachments: [adaptiveCard]
            });
            
        });
        await res.send('success');
        await res.status(200);
        await res.end();
    } else {
        await res.send('error');
        await res.status(404);
        await res.end();
    }
});

getAllUsers();
