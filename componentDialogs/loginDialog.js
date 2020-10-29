const {
    WaterfallDialog,
    ComponentDialog,
    TextPrompt,
    DialogSet,
    DialogTurnStatus
} = require('botbuilder-dialogs');

const USER_PROFILE = 'userProfile';
const TEXT_PASSWORD_PROMPT = 'TEXT_PASSWORD_PROMPT';
const TEXT_NAME_PROMPT = 'TEXT_NAME_PROMPT';
const TEXT_EMAIL_PROMPT = 'TEXT_EMAIL_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class LoginDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('loginDialog');
        this.userProfileAccessor = userState.createProperty(USER_PROFILE);
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
        this.userState = userState;
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
        endDialog = false;
        return await step.prompt(TEXT_NAME_PROMPT, 'With what name we should address you?');
    }

    async getUserEmail(step) {
        step.values.name = step.result;
        endDialog = false;
        return await step.prompt(TEXT_EMAIL_PROMPT, 'Enter your E-Mail ID');
    }

    async getUserPassword(step) {
        step.values.email = step.result;
        endDialog = false;
        return await step.prompt(TEXT_PASSWORD_PROMPT, 'Please enter your Password');
    }

    async summaryStep(step) {
        step.values.complete = true;
        await step.context.sendActivity("Successfully logged in.");
        await this.userProfileAccessor.set(step.context, step.values);
        endDialog = true;
        return await step.endDialog();
    }

    async emailValidator(promptContext) {
        // const re = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))){2,6}$/i;
        // return re.test(email);
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








