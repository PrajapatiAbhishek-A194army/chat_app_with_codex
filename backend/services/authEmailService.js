const sendEmail = require("../utils/sendEmail");
const {
  signupSuccessTemplate,
  loginAlertTemplate,
  forgotPasswordTemplate,
  passwordResetSuccessTemplate,
  accountDeletionTemplate,
  subscriptionActivatedTemplate,
  paymentSuccessfulTemplate,
  renewalConfirmationTemplate,
  cancellationTemplate,
} = require("../templates/emailTemplates");

const sendAuthEmail = async ({ to, template }) => {
  try {
    return await sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendSignupSuccessEmail = async ({ user }) => {
  try {
    return await sendAuthEmail({
      to: user.email,
      template: signupSuccessTemplate({ name: user.name }),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendLoginAlertEmail = async ({ user }) => {
  try {
    return await sendAuthEmail({
      to: user.email,
      template: loginAlertTemplate({ name: user.name }),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendForgotPasswordEmail = async ({ user, resetUrl }) => {
  try {
    return await sendAuthEmail({
      to: user.email,
      template: forgotPasswordTemplate({ name: user.name, resetUrl }),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendPasswordResetSuccessEmail = async ({ user }) => {
  try {
    return await sendAuthEmail({
      to: user.email,
      template: passwordResetSuccessTemplate({ name: user.name }),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendAccountDeletionEmail = async ({ email, name }) => {
  try {
    return await sendAuthEmail({
      to: email,
      template: accountDeletionTemplate({ name }),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendSubscriptionActivatedEmail = async ({ user, subscription }) => {
  try {
    return await sendAuthEmail({
      to: user.email,
      template: subscriptionActivatedTemplate({
        name: user.name,
        ...subscription,
      }),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendPaymentSuccessfulEmail = async ({ user, subscription }) =>
  sendAuthEmail({
    to: user.email,
    template: paymentSuccessfulTemplate({ name: user.name, ...subscription }),
  });

const sendRenewalConfirmationEmail = async ({ user, subscription }) =>
  sendAuthEmail({
    to: user.email,
    template: renewalConfirmationTemplate({ name: user.name, ...subscription }),
  });

const sendCancellationEmail = async ({ user, subscription }) =>
  sendAuthEmail({
    to: user.email,
    template: cancellationTemplate({ name: user.name, ...subscription }),
  });

module.exports = {
  sendSignupSuccessEmail,
  sendLoginAlertEmail,
  sendForgotPasswordEmail,
  sendPasswordResetSuccessEmail,
  sendAccountDeletionEmail,
  sendSubscriptionActivatedEmail,
  sendPaymentSuccessfulEmail,
  sendRenewalConfirmationEmail,
  sendCancellationEmail,
};
