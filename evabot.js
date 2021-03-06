// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory, TurnContext, CardFactory, ActionTypes } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');
const { CreateAlertDialog } = require('./componentDialogs/createAlertDialog');
const { AlertsDialog } = require('./componentDialogs/alertsDialog');
const { ReportsDialog } = require('./componentDialogs/reportsDialog');
const { LoginDialog } = require('./componentDialogs/loginDialog');

const USER_PROFILE = 'userProfile';
const CONVERSATION_DATA = 'conversationData';
const DIALOG_STATE = 'dialogState';
const PREVIOUS_INTENT = 'previousIntent';

class EVABOT extends ActivityHandler {
    constructor(conversationState, userState, getAllUsers) {
        super();
        this.userProfileAccessor = userState.createProperty(USER_PROFILE);
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA);
        this.previousIntentAccessor = conversationState.createProperty(PREVIOUS_INTENT);
        this.dialogState = conversationState.createProperty(DIALOG_STATE);

        this.getAllUsers = getAllUsers;
        this.conversationState = conversationState;
        this.userState = userState;
        this.createAlertDialog = new CreateAlertDialog(this.conversationState, this.userState);
        this.alertsDialog = new AlertsDialog(this.conversationState, this.userState);
        this.reportsDialog = new ReportsDialog(this.conversationState, this.userState);
        this.loginDialog = new LoginDialog(this.conversationState, this.userState);

        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${process.env.LuisAPIHostName}.api.cognitive.microsoft.com`
        }, {
            includeAllIntents: true
        }, true);

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgeBaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });

        this.qnaMaker = qnaMaker;

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const userProfile = await this.userProfileAccessor.get(context, {});
            const conversationData = await this.conversationDataAccessor.get(context, { promptedForUsername: false });
            if (!userProfile.name) {
                if (conversationData.promptedForUsername) {
                    userProfile.name = context.activity.text;
                    await context.sendActivity(`Thanks ${userProfile.name}. Welcome to Alert bot.`);
                    conversationData.promptedForUsername = true;
                    await this.sendSuggestedActions(context);
                } else {
                    await this.conversationDataAccessor.set(context, { endDialog: false });
                    await this.loginDialog.run(context, this.dialogState, userProfile);
                    conversationData.endDialog = await this.loginDialog.isDialogComplete();
                    if (conversationData.endDialog) {
                        await this.getAllUsers();
                        conversationData.promptedForUsername = true;
                        await this.sendSuggestedActions(context);
                    } else {
                        conversationData.endDialog = false;
                        conversationData.promptedForUsername = false;
                    }
                }
            } else {
                const luisResult = await dispatchRecognizer.recognize(context)
                const intent = LuisRecognizer.topIntent(luisResult);
                let entities = luisResult.entities;
                delete entities.$instance;
                await this.dispatchToIntentAsync(context, next, intent, entities);
            }
            await next();
        });

        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context);
            await next();
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await this.sendWelcomeMessage(context);
                }
            }
            await next();
        });
    }

    async addConversationReference(context) {
        const conversationReference = await TurnContext.getConversationReference(context.activity);
        await this.userProfileAccessor.set(context, {
            meta: conversationReference
        });
    };

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;
        for (const idx in activity.membersAdded) {
            if (activity.membersAdded[idx].id !== activity.recipient.id) {
                const welcomeMessage = `Welcome to Eva Bot, Type anything to get started. `;
                await turnContext.sendActivity(welcomeMessage);
            }
        }
    }

    async sendHelpActions(turnContext, next) {
        const card = CardFactory.heroCard(
            'Here is the help you wanted',
            `Type 'suggestion' to get me started and for detailed documentation here are the links`,
            [],
            [{
                type: ActionTypes.OpenUrl,
                title: 'Get the Overview',
                value: `${process.env.AppUrl}/help`
            }, {
                type: ActionTypes.OpenUrl,
                title: 'Ask a Question',
                value: `${process.env.AppUrl}/help`
            }]
        );
        await turnContext.sendActivity({ attachments: [card] });
    }

    async sendSuggestedActions(turnContext) {
        const userProfile = await this.userProfileAccessor.get(turnContext, {});
        const reply = MessageFactory.suggestedActions(['Reports', 'Alerts', 'Create Alert', 'Help'], `Hello ${userProfile.name}, Here's some suggestions?`);
        await turnContext.sendActivity(reply);
    }

    async dispatchToIntentAsync(context, next, intent, entities) {
        let currentIntent = '';
        const previousIntent = await this.previousIntentAccessor.get(context, {});
        const conversationData = await this.conversationDataAccessor.get(context, {});
        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            currentIntent = intent;
        } else if (intent == "None" && !previousIntent.intentName) {
            let result = await this.qnaMaker.getAnswers(context);
            if (result.length > 0) {
                await context.sendActivity(`${result[0].answer}`);
            } else {
                conversationData.endDialog = true;
                await this.previousIntentAccessor.set(context, { intentName: undefined });
                intent = 'suggestion'
            }
        } else {
            currentIntent = intent;
            await this.previousIntentAccessor.set(context, { intentName: intent });
        }
        let currentIntentRunning = currentIntent.toLowerCase();
        if (intent === 'exit') {
            currentIntentRunning = 'suggestion';
            await this.previousIntentAccessor.set(context, { intentName: null });
        }
        switch (currentIntentRunning) {
            case 'alerts':
                await this.conversationDataAccessor.set(context, { endDialog: false });
                await this.alertsDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.alertsDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntentAccessor.set(context, { intentName: null });
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'reports':
                await this.conversationDataAccessor.set(context, { endDialog: false });
                await this.reportsDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.reportsDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntentAccessor.set(context, { intentName: null });
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'create_alert':
                await this.conversationDataAccessor.set(context, { endDialog: false });
                await this.createAlertDialog.run(context, this.dialogState, entities);
                conversationData.endDialog = await this.createAlertDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntentAccessor.set(context, { intentName: null });
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'help':
                await this.sendHelpActions(context, next);
                await this.previousIntentAccessor.set(context, { intentName: null });
                break;
            case 'suggestion':
                await this.sendSuggestedActions(context);
                break;
            default:
                await context.sendActivity(`If you want to know what all i can do.Type 'help'.`);
                break;
        }
    }
}

module.exports.EVABOT = EVABOT;
