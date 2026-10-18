/**
 * Branded HTML Email Template Helper
 * Tesla Prime Capital // Tesla red (#CC0000) / dark (#0a0a0f) theme
 * Inline CSS only // email clients don't support external stylesheets
 * Responsive with max-width: 600px
 */

export function renderBrandedEmail(
  title: string,
  content: string,
  ctaText?: string,
  ctaUrl?: string,
): string {
  const ctaHtml = ctaText && ctaUrl
    ? `
    <div style="text-align:center;margin:32px 0">
      <a href="${ctaUrl}" target="_blank" style="display:inline-block;background-color:#CC0000;color:#ffffff;padding:14px 40px;border-radius:4px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">${ctaText}</a>
    </div>`
    : '';

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Helvetica Neue','Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;min-height:100vh">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0a0f;border-radius:8px;overflow:hidden;border:1px solid #1a1a1a">
          <tr>
            <td style="background-color:#0a0a0f;padding:40px 32px 28px;text-align:center;border-bottom:1px solid #CC0000">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px">
                <tr>
                  <td style="width:56px;height:56px;background-color:#000;border:1.5px solid #CC0000;border-radius:12px;text-align:center;vertical-align:middle;line-height:56px;font-size:32px;font-weight:900;color:#CC0000;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:-2px">T</td>
                </tr>
              </table>
              <h1 style="color:#fff;margin:0;font-size:16px;font-weight:700;letter-spacing:4px;font-family:'Helvetica Neue',Arial,sans-serif">TESLA PRIME CAPITAL</h1>
              <p style="color:#CC0000;margin:8px 0 0;font-size:8px;letter-spacing:4px;text-transform:uppercase;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif">Premium Investment Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0;text-align:center">
              <h2 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:0.5px;font-family:'Helvetica Neue',Arial,sans-serif">${title}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px">
              <div style="color:#ccc;font-size:14px;line-height:1.8;letter-spacing:0.3px">${content}</div>
            </td>
          </tr>
          ${ctaText && ctaUrl ? `<tr><td style="padding:0 32px">${ctaHtml}</td></tr>` : ''}
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-top:1px solid #1a1a1a">
              <p style="color:#666;font-size:10px;margin:0 0 8px;font-weight:700;letter-spacing:3px;font-family:'Helvetica Neue',Arial,sans-serif">TESLA PRIME CAPITAL</p>
              <div style="width:24px;height:1px;background-color:#CC0000;margin:0 auto 12px"></div>
              <p style="color:#444;font-size:10px;margin:0 0 12px;line-height:1.7;letter-spacing:0.5px">Professionally managed investment platform. Daily returns up to 1.8%.</p>
              <p style="color:#333;font-size:9px;margin:0;line-height:1.6;letter-spacing:0.5px">&copy; ${year} TeslaPrime Support. All rights reserved.<br>This is an automated message. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
