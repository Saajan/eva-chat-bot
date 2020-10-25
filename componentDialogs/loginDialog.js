const {
    WaterfallDialog,
    ComponentDialog,
    ConfirmPrompt,
    NumberPrompt,
    TextPrompt,
    DialogSet,
    DialogTurnStatus
} = require('botbuilder-dialogs');

const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class LoginDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('loginDialog');
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.noOfParticipantsValidator));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getUserEmail.bind(this),
            this.getUserPassword.bind(this),
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

    async getUserEmail(step) {
        endDialog = false;
        return await step.prompt(TEXT_PROMPT, 'Enter your E-Mail ID');
    }

    async getUserPassword(step) {
        step.values.email = step.result
        return await step.prompt(TEXT_PROMPT, 'Please enter your Password');
    }

    async summaryStep(step) {
        step.values.password = step.result
        if (step.values.email == "a" && step.values.password == "a") {
            await step.context.sendActivity("Successfully logged in.")
            endDialog = true;
            return await step.endDialog();
        } else {
            await this.dialogContext.beginDialog(this.id);
        }
    }

    async noOfParticipantsValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 1 && promptContext.recognized.value < 150;
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.LoginDialog = LoginDialog;








