
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { category, fromUnit, toUnit, additionalNotes } = await request.json();

    // In development, use the resend.dev domain for testing
    const fromEmail = process.env.NODE_ENV === 'development' 
      ? 'onboarding@resend.dev'
      : 'notifications@unitswap.xyz';

    const data = await resend.emails.send({
      from: `UnitSwap <${fromEmail}>`,
      to: ['swapunits@gmail.com'], // Using default test recipient
      subject: `New Conversion Pair Request: ${fromUnit} to ${toUnit}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .logo {
                color: #0066cc;
                font-size: 24px;
                font-weight: bold;
                margin: 0;
              }
              .timestamp {
                color: #666;
                font-size: 14px;
                margin-top: 8px;
              }
              .content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #eee;
              }
              .subject {
                font-size: 20px;
                color: #1a1a1a;
                margin-top: 0;
                padding-bottom: 10px;
                border-bottom: 2px solid #f0f0f0;
              }
              .description {
                white-space: pre-wrap;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin-top: 15px;
              }
              .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="logo">UnitSwap</h1>
              <div class="timestamp">
                Received on ${new Date().toLocaleString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}
              </div>
            </div>
            <div class="content">
              <h2 class="subject"> New Conversion Pair Request</h2>
              <div class="content-section">
                <h3 style="color: #555; margin: 0 0 10px 0;">Category</h3>
                <div class="info-box">${category}</div>
              </div>
              <div class="content-section">
                <h3 style="color: #555; margin: 15px 0 10px 0;">Requested Conversion</h3>
                <div class="info-box" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                  <span style="font-weight: 500;">${fromUnit}</span>
                  <span style="color: #666;">↔️</span>
                  <span style="font-weight: 500;">${toUnit}</span>
                </div>
              </div>
              ${additionalNotes ? `
                <div class="content-section">
                  <h3 style="color: #555; margin: 15px 0 10px 0;">Additional Notes</h3>
                  <div class="description">
                    ${additionalNotes.replace(/\n/g, '<br/>')}
                  </div>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              This conversion pair request was submitted via unitswap.xyz
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Feature request email failed', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
