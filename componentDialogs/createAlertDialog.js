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
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.valueValidator));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),
            this.getName.bind(this),
            this.getMetrics.bind(this),
            this.getValue.bind(this),
            this.getCondition.bind(this),
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
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(CONFIRM_PROMPT, 'Would you like to create an Alert?', ['yes', 'no']);
    }

    async getName(step) {
        console.log(step.result)
        if (step.result === true) {
            step.values.name = step.result
            return await step.prompt(TEXT_PROMPT, 'Set the name to the alert?');
        }
        if (step.result === false) {
            await step.context.sendActivity("You chose not to create the alert.");
            endDialog = true;
            return await step.endDialog();
        }
    }

    async getMetrics(step) {
        step.values.metrics = step.result
        return await step.prompt(METRIC_PROMPT, 'Select the metrics', ['Average Bitrate', 'Concurrent Plays', 'VSF', 'VPF']);
    }

    async getValue(step) {
        step.values.value = step.result
        return await step.prompt(NUMBER_PROMPT, 'value')
    }

    async getCondition(step) {
        step.values.condition = step.result
        return await step.prompt(CONDITION_PROMPT, 'Select the condition', ['Less', 'Equal', 'More', 'Less or Equal', 'More or Equal'])
    }

    async confirmStep(step) {
        step.values.time = step.result
        console.log(step.values);
        var msg = ` You have created an Alert : \n Named: ${step.values.name}\n : ${step.values.metrics}\n ${step.values.condition}\n than ${step.values.value}\n`
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'Are you sure that all values are correct and you want to create a alert?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            // Business 
            await step.context.sendActivity("Alert successfully created.")
            endDialog = true;
            return await step.endDialog();
        }
    }

    async valueValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 1 && promptContext.recognized.value < 150;
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.CreateAlertDialog = CreateAlertDialog;








