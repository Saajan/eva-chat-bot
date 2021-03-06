const { CardFactory } = require('botbuilder');
const {
    WaterfallDialog,
    ComponentDialog,
    ConfirmPrompt,
    ChoicePrompt,
    NumberPrompt,
    TextPrompt,
    DialogSet,
    DialogTurnStatus
} = require('botbuilder-dialogs');
const axios = require('axios');

const AlertCard = require('../resources/adaptiveCards/alert-card.json');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const METRIC_PROMPT = 'METRIC_PROMPT';
const CONDITION_PROMPT = 'CONDITION_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class CreateAlertDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('makeAlertDialog');
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new ChoicePrompt(METRIC_PROMPT));
        this.addDialog(new ChoicePrompt(CONDITION_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getName.bind(this),
            this.getMetrics.bind(this),
            this.getValue.bind(this),
            this.getCondition.bind(this),
            this.confirmStep.bind(this),
            this.summaryStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
        this.userState = userState;
    }

    async run(turnContext, accessor, entities) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }
    }

    async getName(step) {
        endDialog = false;
        if (step._info.options.name) {
            step.values.name = step._info.options.name[0];
        }
        if (step._info.options.condition) {
            step.values.condition = step._info.options.condition[0];
        }
        if (step._info.options.metrics) {
            step.values.metrics = step._info.options.metrics[0];
        }
        if (step._info.options.value) {
            step.values.value = step._info.options.value[0];
        }
        if (!step.values.name) {
            return await step.prompt(TEXT_PROMPT, 'Set the name to the alert?');
        } else {
            return await step.continueDialog();
        }
    }

    async getMetrics(step) {
        if (!step.values.name) {
            step.values.name = step.result;
        }
        if (!step.values.metrics) {
            return await step.prompt(METRIC_PROMPT, 'Select the metrics', ['Average Bitrate', 'Concurrent Plays', 'VSF', 'VPF', 'Plays', 'Average Framerate', 'Attempts', 'Rebuffering Ratio']);
        } else {
            return await step.continueDialog();
        }
    }

    async getValue(step) {
        if (!step.values.metrics) {
            step.values.metrics = step.result.score ? step.result.value : step.result;
        }
        if (!step.values.value) {
            return await step.prompt(NUMBER_PROMPT, 'Enter the threshold value')
        } else {
            return await step.continueDialog();
        }
    }

    async getCondition(step) {
        if (!step.values.value) {
            step.values.value = step.result;
        }
        if (!step.values.condition) {
            return await step.prompt(CONDITION_PROMPT, 'Select the condition', ['Less', 'Equal', 'More'])
        } else {
            return await step.continueDialog();
        }
    }

    async confirmStep(step) {
        if (!step.values.condition) {
            step.values.condition = step.result.score ? step.result.value : step.result;
        }
        return await step.prompt(CONFIRM_PROMPT, 'Do want to create the alert?', ['yes', 'no']);
    }

    async summaryStep(step) {
        const userProfile = await this.userState.get(step.context, {});
        const conversationId = userProfile.userProfile ? userProfile.userProfile.conversionId : '';
        if (step.result === true) {
            try {
                await step.context.sendActivity("Please wait while i create the alert for you.");
                const response = await axios.post(`${process.env.ApiUrl}/api/v1/alert/`, {
                    name: step.values.name,
                    metric: step.values.metrics,
                    condition: step.values.condition,
                    value: step.values.value,
                    user_id: conversationId
                });
                let cardJson = JSON.parse(JSON.stringify(AlertCard));
                cardJson.body[0].columns[0].items[0].text = `Alert Name : ${step.values.name}`;
                cardJson.body[0].columns[0].items[1].text = `Metrics : ${step.values.metrics}`;
                cardJson.body[0].columns[0].items[2].text = `${step.values.condition} ${step.values.value}`;
                cardJson.body[0].columns[1].items[0].url = `${process.env.AppUrl}/images/Eva.png`;
                let adaptiveCard = CardFactory.adaptiveCard(cardJson);
                await step.context.sendActivity({
                    text: 'Alert successfully created.',
                    attachments: [adaptiveCard]
                });
                endDialog = true;
                return await step.endDialog();
            } catch (error) {
                endDialog = true;
                await step.context.sendActivity("Sorry, we were not able to complete your request.");
                return await step.endDialog();
            }
        } else if (step.result === false) {
            await step.context.sendActivity("You chose not to create the alert.");
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.CreateAlertDialog = CreateAlertDialog;








