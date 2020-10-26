const {
    WaterfallDialog,
    ComponentDialog,
    TextPrompt,
    DialogSet,
    DialogTurnStatus
} = require('botbuilder-dialogs');
const { UserProfile } = require('../userProfile');

const TEXT_PASSWORD_PROMPT = 'TEXT_PASSWORD_PROMPT';
const TEXT_NAME_PROMPT = 'TEXT_NAME_PROMPT';
const TEXT_EMAIL_PROMPT = 'TEXT_EMAIL_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class LoginDialog extends ComponentDialog {
    constructor() {
        super('loginDialog');
        this.addDialog(new TextPrompt(TEXT_NAME_PROMPT, this.nameValidator));
        this.addDialog(new TextPrompt(TEXT_EMAIL_PROMPT, this.emailValidator));
        this.addDialog(new TextPrompt(TEXT_PASSWORD_PROMPT, this.passwordValidator));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getUserName.bind(this),
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

    async getUserName(step) {
        step.values.userInfo = new UserProfile();
        endDialog = false;
        return await step.prompt(TEXT_NAME_PROMPT, 'With what name we should address you?');
    }

    async getUserEmail(step) {
        step.values.userInfo.name = step.result;
        endDialog = false;
        return await step.prompt(TEXT_EMAIL_PROMPT, 'Enter your E-Mail ID');
    }

    async getUserPassword(step) {
        step.values.userInfo.email = step.result;
        endDialog = false;
        return await step.prompt(TEXT_PASSWORD_PROMPT, 'Please enter your Password');
    }

    async summaryStep(step) {
        step.values.password = step.result
        await step.context.sendActivity("Successfully logged in.");
        const userProfile = step.values.userInfo;
        endDialog = true;
        return await step.endDialog(userProfile);
    }

    async emailValidator(promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value == 'a';
    }

    async passwordValidator(promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value == 'a';
    }

    async nameValidator(promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value == 'a';
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.LoginDialog = LoginDialog;








