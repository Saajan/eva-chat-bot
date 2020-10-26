const {
    WaterfallDialog,
    ComponentDialog,
    TextPrompt,
    DialogSet,
    DialogTurnStatus
} = require('botbuilder-dialogs');

const TEXT_PASSWORD_PROMPT = 'TEXT_PASSWORD_PROMPT';
const TEXT_EMAIL_PROMPT = 'TEXT_EMAIL_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class LoginDialog extends ComponentDialog {
    constructor() {
        super('loginDialog');
        this.addDialog(new TextPrompt(TEXT_EMAIL_PROMPT, this.emailValidator));
        this.addDialog(new TextPrompt(TEXT_PASSWORD_PROMPT, this.passwordValidator));
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
        return await step.prompt(TEXT_EMAIL_PROMPT, 'Enter your E-Mail ID');
    }

    async getUserPassword(step) {
        step.values.email = step.result
        return await step.prompt(TEXT_PASSWORD_PROMPT, 'Please enter your Password');
    }

    async summaryStep(step) {
        step.values.password = step.result
        if (step.values.email == "a" && step.values.password == "a") {
            await step.context.sendActivity("Successfully logged in.")
            endDialog = true;
            return await step.endDialog();
        }
    }

    async emailValidator(promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value == 'a';
    }

    async passwordValidator(promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value == 'a';
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.LoginDialog = LoginDialog;








