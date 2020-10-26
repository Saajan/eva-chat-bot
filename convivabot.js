// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory, TurnContext, CardFactory, ActionTypes } = require('botbuilder');
const { CreateAlertDialog } = require('./componentDialogs/createAlertDialog');
const { AlertsDialog } = require('./componentDialogs/alertsDialog');
const { LoginDialog } = require('./componentDialogs/loginDialog');

const USER_PROFILE = 'userProfile';
const CONVERSATION_DATA = 'conversationData';
const DIALOG_STATE = 'dialogState';
const PREVIOUS_INTENT = 'previousIntent';

class CONVIVABOT extends ActivityHandler {
    constructor(conversationState, userState, conversationReferences) {
        super();
        this.userProfileAccessor = userState.createProperty(USER_PROFILE);
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA);
        this.previousIntentAccessor = conversationState.createProperty(PREVIOUS_INTENT);
        this.dialogState = conversationState.createProperty(DIALOG_STATE);

        this.conversationReferences = conversationReferences;
        this.conversationState = conversationState;
        this.userState = userState;
        this.createAlertDialog = new CreateAlertDialog(this.conversationState, this.userState);
        this.alertsDialog = new AlertsDialog(this.conversationState, this.userState);
        this.loginDialog = new LoginDialog(this.conversationState, this.userState);

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const userProfile = await this.userProfileAccessor.get(context, {});
            const conversationData = await this.conversationDataAccessor.get(context, { promptedForUsername: false })
            if (!userProfile.name) {
                if (conversationData.promptedForUsername) {
                    userProfile.name = context.activity.text;
                    await context.sendActivity(`Thanks ${userProfile.name}. Welcome to Conviva bot.`);
                    conversationData.promptedForUsername = false;
                    await this.sendSuggestedActions(context);
                } else {
                    await this.conversationDataAccessor.set(context, { endDialog: false });
                    await this.loginDialog.run(context, this.dialogState);
                    conversationData.endDialog = await this.loginDialog.isDialogComplete();
                    console.log({ conversationData }, this.loginDialog);
                    if (conversationData.endDialog) {
                        conversationData.promptedForUsername = true;
                        userProfile.name = "good";
                        await this.sendSuggestedActions(context);
                    } else {
                        conversationData.endDialog = false;
                        conversationData.promptedForUsername = false;
                    }
                }
            } else {
                await this.dispatchToIntentAsync(context, next);
            }
            await next();
        });

        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
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

    async addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        this.conversationReferences[conversationReference.conversation.id] = conversationReference;
    };

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;
        for (const idx in activity.membersAdded) {
            if (activity.membersAdded[idx].id !== activity.recipient.id) {
                const welcomeMessage = `Welcome to Conviva, Type anything to get started. `;
                await turnContext.sendActivity(welcomeMessage);
            }
        }
    }

    async sendHelpActions(turnContext, next) {
        const card = CardFactory.heroCard(
            'Here is the help you wanted',
            `Type 'suggestion' for suggested actions and for detailed documentation here are the links`,
            [],
            [{
                type: ActionTypes.OpenUrl,
                title: 'Get the Overview',
                value: 'https://www.google.com'
            }, {
                type: ActionTypes.OpenUrl,
                title: 'Ask a Question',
                value: 'https://www.google.com'
            }]
        );
        await turnContext.sendActivity({ attachments: [card] });
        await next();
    }

    async sendSuggestedActions(turnContext) {
        const reply = MessageFactory.suggestedActions(['Alerts', 'Reports', 'Create Alert', 'Create Report', 'Help'], 'What would you like to do today ?');
        await turnContext.sendActivity(reply);
    }

    async dispatchToIntentAsync(context, next) {
        let currentIntent = '';
        const previousIntent = await this.previousIntentAccessor.get(context, {});
        const conversationData = await this.conversationDataAccessor.get(context, {});
        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            currentIntent = context.activity.text;
        } else {
            currentIntent = context.activity.text;
            await this.previousIntentAccessor.set(context, { intentName: context.activity.text });
        }
        let currentIntentRunning = currentIntent.toLowerCase();
        if (context.activity.text === 'exit') {
            currentIntentRunning = 'suggestion';
            await this.previousIntentAccessor.set(context, { intentName: null });
        }
        switch (currentIntentRunning) {
            case 'alerts':
                console.log("Alert Case");
                await this.conversationDataAccessor.set(context, { endDialog: false });
                await this.alertsDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.alertsDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntentAccessor.set(context, { intentName: null });
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'reports':
                console.log("Inside Make Alert Case");
                await this.conversationDataAccessor.set(context, { endDialog: false });
                await this.createAlertDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.createAlertDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntentAccessor.set(context, { intentName: null });
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'create alert':
                console.log("Inside Make Alert Case");
                await this.conversationDataAccessor.set(context, { endDialog: false });
                await this.createAlertDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.createAlertDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntentAccessor.set(context, { intentName: null });
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'create report':
                console.log("Inside Make Alert Case");
                await this.conversationDataAccessor.set(context, { endDialog: false });
                await this.createAlertDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.createAlertDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntentAccessor.set(context, { intentName: null });
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'help':
                await this.sendHelpActions(context, next);
                break;
            case 'suggestion':
                await this.sendSuggestedActions(context);
                break;
            default:
                await context.sendActivity(`I did not follow what you asked me to do. But don't worry.  Type 'Help' to understand me better.`);
                break;
        }
    }
}

module.exports.CONVIVABOT = CONVIVABOT;
