const baseEmailTemplate = ({ title, previewText, body, action }) => {
  const actionMarkup = action
    ? `<p style="margin: 28px 0;"><a href="${action.url}" style="background: #2563eb; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 15px; font-weight: 600; padding: 12px 18px; text-decoration: none;">${action.label}</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="background: #f3f4f6; font-family: Arial, sans-serif; margin: 0; padding: 24px;">
    <span style="display: none; opacity: 0; overflow: hidden; visibility: hidden;">${previewText}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border: 1px solid #e5e7eb; border-collapse: collapse; border-radius: 8px; max-width: 560px; overflow: hidden;">
            <tr>
              <td style="background: #111827; color: #ffffff; padding: 20px 24px;">
                <h1 style="font-size: 20px; line-height: 1.3; margin: 0;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="color: #1f2937; font-size: 15px; line-height: 1.6; padding: 24px;">
                ${body}
                ${actionMarkup}
                <p style="color: #6b7280; font-size: 13px; margin: 28px 0 0;">If you did not request this activity, please secure your account immediately.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const signupSuccessTemplate = ({ name }) => ({
  subject: "Welcome to MERN Auth",
  text: `Hi ${name}, your account has been created successfully.`,
  html: baseEmailTemplate({
    title: "Welcome to MERN Auth",
    previewText: "Your account has been created successfully.",
    body: `<p>Hi ${name},</p><p>Your account has been created successfully. You can now login and manage your account securely.</p>`,
  }),
});

const loginAlertTemplate = ({ name }) => ({
  subject: "New login to your account",
  text: `Hi ${name}, your account was just accessed.`,
  html: baseEmailTemplate({
    title: "New Login Alert",
    previewText: "Your account was just accessed.",
    body: `<p>Hi ${name},</p><p>Your account was just accessed. If this was you, no action is needed.</p>`,
  }),
});

const forgotPasswordTemplate = ({ name, resetUrl }) => ({
  subject: "Password reset request",
  text: `Hi ${name}, reset your password using this link: ${resetUrl}. This link expires in 10 minutes.`,
  html: baseEmailTemplate({
    title: "Reset Your Password",
    previewText: "Use this link to reset your password. It expires in 10 minutes.",
    body: `<p>Hi ${name},</p><p>We received a request to reset your password. Use the button below to set a new password.</p><p>This link expires in 10 minutes.</p>`,
    action: {
      label: "Reset Password",
      url: resetUrl,
    },
  }),
});

const passwordResetSuccessTemplate = ({ name }) => ({
  subject: "Password reset successful",
  text: `Hi ${name}, your password has been reset successfully.`,
  html: baseEmailTemplate({
    title: "Password Reset Successful",
    previewText: "Your password has been reset successfully.",
    body: `<p>Hi ${name},</p><p>Your password has been reset successfully. You can now login with your new password.</p>`,
  }),
});

const accountDeletionTemplate = ({ name }) => ({
  subject: "Account deleted",
  text: `Hi ${name}, your account has been deleted.`,
  html: baseEmailTemplate({
    title: "Account Deleted",
    previewText: "Your account has been deleted.",
    body: `<p>Hi ${name},</p><p>Your account has been deleted successfully. We are sorry to see you go.</p>`,
  }),
});

const subscriptionActivatedTemplate = ({
  name,
  plan,
  price,
  billingCycle,
  status,
  activationDate,
  renewalDate,
}) => ({
  subject: "Subscription Activated Successfully 🎉",
  text: `Hello ${name}, your subscription has been activated successfully. Plan: ${plan}. Price: ${price}. Billing cycle: ${billingCycle}. Status: ${status}. Activation Date: ${activationDate}. Renewal Date: ${renewalDate}. Thank you for subscribing to our platform.`,
  html: baseEmailTemplate({
    title: "Subscription Activated Successfully",
    previewText: `Your ${plan} subscription has been activated successfully.`,
    body: `
      <p>Hello ${name},</p>
      <p>Your subscription has been activated successfully.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-top: 16px;">
        <tr><td style="border-bottom: 1px solid #e5e7eb; color: #6b7280; padding: 8px 0;">Plan</td><td align="right" style="border-bottom: 1px solid #e5e7eb; font-weight: 700; padding: 8px 0;">${plan}</td></tr>
        <tr><td style="border-bottom: 1px solid #e5e7eb; color: #6b7280; padding: 8px 0;">Price</td><td align="right" style="border-bottom: 1px solid #e5e7eb; font-weight: 700; padding: 8px 0;">${price}</td></tr>
        <tr><td style="border-bottom: 1px solid #e5e7eb; color: #6b7280; padding: 8px 0;">Billing Cycle</td><td align="right" style="border-bottom: 1px solid #e5e7eb; font-weight: 700; padding: 8px 0;">${billingCycle}</td></tr>
        <tr><td style="border-bottom: 1px solid #e5e7eb; color: #6b7280; padding: 8px 0;">Status</td><td align="right" style="border-bottom: 1px solid #e5e7eb; font-weight: 700; padding: 8px 0;">${status}</td></tr>
        <tr><td style="border-bottom: 1px solid #e5e7eb; color: #6b7280; padding: 8px 0;">Activation Date</td><td align="right" style="border-bottom: 1px solid #e5e7eb; font-weight: 700; padding: 8px 0;">${activationDate}</td></tr>
        <tr><td style="color: #6b7280; padding: 8px 0;">Renewal Date</td><td align="right" style="font-weight: 700; padding: 8px 0;">${renewalDate}</td></tr>
      </table>
      <p style="margin-top: 20px;">Thank you for subscribing to our platform.</p>
    `,
  }),
});

const paymentSuccessfulTemplate = subscriptionActivatedTemplate;
const renewalConfirmationTemplate = subscriptionActivatedTemplate;

const cancellationTemplate = ({ name, plan, renewalDate }) => ({
  subject: "Subscription canceled",
  text: `Hello ${name}, your ${plan} subscription has been canceled. Access remains active until ${renewalDate}.`,
  html: baseEmailTemplate({
    title: "Subscription Canceled",
    previewText: "Your subscription has been canceled.",
    body: `<p>Hello ${name},</p><p>Your <strong>${plan}</strong> subscription has been canceled. Access remains active until ${renewalDate}.</p>`,
  }),
});

module.exports = {
  signupSuccessTemplate,
  loginAlertTemplate,
  forgotPasswordTemplate,
  passwordResetSuccessTemplate,
  accountDeletionTemplate,
  subscriptionActivatedTemplate,
  paymentSuccessfulTemplate,
  renewalConfirmationTemplate,
  cancellationTemplate,
};
