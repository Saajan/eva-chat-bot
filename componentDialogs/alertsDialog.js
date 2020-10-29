const {
    WaterfallDialog,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    ConfirmPrompt,
    ChoicePrompt,
    NumberPrompt,
    TextPrompt
} = require('botbuilder-dialogs');
const axios = require('axios');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
let endDialog = '';

class AlertsDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('deleteAlertDialog');
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),
            this.confirmStep.bind(this),
            this.summaryStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step) {
        endDialog = false;
        //axios.get('http://localhost:3000/alert')
        //.then(function (response) {
        //let { data } = response;
        // console.log(data);
        //})
        //.catch(function (error) {
        // console.log(error);
        //})
        //.then(function () {

        //});
        return await step.prompt(CHOICE_PROMPT, `Here are your alerts. Select any one of them to Edit or Delete.`, ['Alert 1', 'Alert 2']);
    }

    async confirmStep(step) {
        step.values.alert = step.result.value;
        var msg = ` You have selected: \n Alert : ${step.values.alert}`
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'Do you want to delete this alert?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            await step.context.sendActivity(`${step.values.alert} has been deleted successfully.`)
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.AlertsDialog = AlertsDialog;








