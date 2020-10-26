const {
    WaterfallDialog,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    ConfirmPrompt,
    ChoicePrompt,
    DateTimePrompt,
    NumberPrompt,
    TextPrompt
} = require('botbuilder-dialogs');
const { ActionTypes, MessageFactory } = require('botbuilder');
const axios = require('axios');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
let endDialog = '';

class AlertsDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('cancelAlertDialog');
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
        const cardActions = [
            {
                type: ActionTypes.PostBack,
                title: 'Alert 1',
                value: 'Alert 1',
                image: 'https://via.placeholder.com/20/FF0000?text=R',
                imageAltText: ''
            },
            {
                type: ActionTypes.PostBack,
                title: 'Alerts 2',
                value: 'Alerts 2',
                image: 'https://via.placeholder.com/20/FFFF00?text=Y',
                imageAltText: ''
            },
            {
                type: ActionTypes.PostBack,
                title: 'Alerts 3',
                value: 'Alerts 3',
                image: 'https://via.placeholder.com/20/0000FF?text=B',
                imageAltText: ''
            }
        ];

        var reply = MessageFactory.suggestedActions(cardActions, 'Select the alert to change the settings?');
        return await step.context.sendActivity(reply);
    }

    async confirmStep(step) {
        console.log("step to message",step.result);
        step.values.reservationNo = step.result
        var msg = ` You have entered following values: \n Reservation Number: ${step.values.reservationNo}`
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'Are you sure that all values are correct and you want to CANCEL the reservation?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            // Business 
            await step.context.sendActivity("Reservation successfully cancelled. Your reservation id is : 12345678")
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.AlertsDialog = AlertsDialog;








