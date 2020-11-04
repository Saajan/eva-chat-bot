const {
    WaterfallDialog,
    ComponentDialog,
    TextPrompt,
    DialogSet,
    DialogTurnStatus
} = require('botbuilder-dialogs');
const axios = require('axios');

const USER_PROFILE = 'userProfile';
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
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getUserName.bind(this),
            this.getUserEmail.bind(this),
            this.summaryStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
        this.userState = userState;
    }

    async run(turnContext, accessor, conversation) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, conversation);
        }
    }

    async getUserName(step) {
        endDialog = false;
        return await step.prompt(TEXT_NAME_PROMPT, 'With what name I should address you?');
    }

    async getUserEmail(step) {
        step.values.name = step.result;
        endDialog = false;
        return await step.prompt(TEXT_EMAIL_PROMPT, 'Can you enter your E-Mail ID');
    }

    async summaryStep(step) {
        step.values.email = step.result;
        step.values.conversionId = Object.keys(step._info.options)[0];
        try {
            const response = await axios.post(`${process.env.ApiUrl}/api/v1/user/`, {
                name: step.values.name,
                email: step.values.email,
                conversation_id: step.values.conversionId
            });
            await this.userProfileAccessor.set(step.context, step.values);
            await step.context.sendActivity("Thanks for the information. Lets get going.");
            endDialog = true;
            return await step.endDialog();
        } catch (error) {
            endDialog = true;
            await step.context.sendActivity("Sorry, we were not able to complete your request.");
            return await step.endDialog();
        }
    }

    async nameValidator(promptContext) {
        return promptContext.recognized.succeeded;
    }
    
    async emailValidator(promptContext) {
        // const re = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))){2,6}$/i;
        // return re.test(email);
        return promptContext.recognized.succeeded && promptContext.recognized.value == 'a';
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.LoginDialog = LoginDialog;








