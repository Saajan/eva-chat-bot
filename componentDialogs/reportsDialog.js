const { CardFactory } = require('botbuilder');
const {
    WaterfallDialog,
    ComponentDialog,
    ConfirmPrompt,
    ChoicePrompt,
    DialogSet,
    DialogTurnStatus
} = require('botbuilder-dialogs');

const ReportCard = require('../resources/adaptiveCards/report-card.json');

const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const RANGE_PROMPT = 'RANGE_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class ReportsDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('makeReportDialog');
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new ChoicePrompt(RANGE_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getRange.bind(this),
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

    async getRange(step) {
        endDialog = false;
        if (step._info.options.range) {
            step.values.range = step._info.options.range[0];
        }
        if (!step.values.range) {
            return await step.prompt(RANGE_PROMPT, 'Show reports for what interval?', ['yesterday', 'today', 'week', 'month']);
        } else {
            return await step.continueDialog();
        }
    }

    async confirmStep(step) {
        if (!step.values.range) {
            step.values.range = step.result;
        }
        return await step.prompt(CONFIRM_PROMPT, `Should i create report for ${step.values.range}?`, ['yes', 'no']);
    }

    async summaryStep(step) {
        console.log("final", step.values);
        if (step.result === true) {
            await step.context.sendActivity({
                text: 'Here is the report',
                attachments: [CardFactory.adaptiveCard(ReportCard)]
            });
            endDialog = true;
            return await step.endDialog();
        } else if (step.result === false) {
            await step.context.sendActivity("You chose not to create the report");
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.ReportsDialog = ReportsDialog;








