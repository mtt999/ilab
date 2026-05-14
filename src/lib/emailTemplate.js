const LOGO_URL = 'https://mtt999.github.io/ilab/logo.svg'
const APP_URL  = 'https://mtt999.github.io/ilab/'

export function buildEmailHtml({ title, body, ctaLabel = 'View in iLab →', ctaUrl = APP_URL, prefsUrl = APP_URL }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#0d47a1;padding:28px 32px 24px;text-align:center;">
            <img src="${LOGO_URL}" width="72" height="72" alt="iLab logo" style="display:block;margin:0 auto 12px;border:0;">
            <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1;">iLab</div>
            <div style="color:#ffb380;font-size:11px;font-weight:400;letter-spacing:1.2px;text-transform:uppercase;margin-top:5px;">intelligent laboratory</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px 24px;">
            <h2 style="margin:0 0 14px;font-size:17px;font-weight:700;color:#111827;line-height:1.4;">${escHtml(title)}</h2>
            <p style="margin:0 0 28px;font-size:14px;color:#4B5563;line-height:1.7;">${escHtml(body)}</p>

            <!-- CTA button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
              <tr><td align="center">
                <a href="${ctaUrl}" style="display:inline-block;background:#1D9E75;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:8px;letter-spacing:0.1px;">${escHtml(ctaLabel)}</a>
              </td></tr>
            </table>

            <!-- Notification prefs link (directly under the button) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
              <tr><td align="center">
                <a href="${prefsUrl}" style="font-size:12px;color:#6B7280;text-decoration:underline;">Manage notification preferences</a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
              You received this notification because you are a member of an iLab organization.<br>
              <a href="${prefsUrl}" style="color:#9CA3AF;text-decoration:underline;">Manage notification preferences</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
