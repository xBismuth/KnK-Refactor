// ==================== SUPPORT CONTROLLER ====================
const db = require('../config/db');
const { emailTransporter } = require('../config/email');

// Submit support ticket
exports.submitTicket = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, subject, and message are required' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email address' 
      });
    }

    const [result] = await db.query(
      `INSERT INTO support_tickets (name, email, phone, subject, message, status, created_at) 
       VALUES (?, ?, ?, ?, ?, 'Pending', NOW())`,
      [name, email, phone || null, subject, message]
    );

    console.log(`✅ New support ticket created: ID ${result.insertId} from ${email}`);

    // Send confirmation email
    try {
      await emailTransporter.sendMail({
        from: {
          name: 'Kusina ni Katya',
          address: process.env.MAIL_USER
        },
        to: email,
        subject: 'We received your message - Kusina ni Katya',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #cda45e 0%, #b8924e 100%); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .message-box { background: #f8f9fa; border-left: 4px solid #cda45e; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Kusina ni Katya</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Authentic Filipino Cuisine</p>
              </div>
              
              <div class="content">
                <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello ${name}! 👋</p>
                <p style="font-size: 16px; color: #666;">
                  Thank you for reaching out to us. We've received your message and our team will get back to you within 24 hours.
                </p>
                
                <div class="message-box">
                  <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Your Message:</p>
                  <p style="margin: 0 0 5px 0; color: #666;"><strong>Subject:</strong> ${subject}</p>
                  <p style="margin: 0; color: #666;"><strong>Message:</strong> ${message}</p>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                  If you have any urgent concerns, please call us at <strong>+63 912 345 6789</strong>.
                </p>
              </div>
              
              <div class="footer">
                <p style="margin: 0 0 10px 0;">© 2025 Kusina ni Katya. All Rights Reserved.</p>
                <p style="margin: 0;">Aurora Blvd, Quezon City, Manila, Philippines</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      console.log('📧 Confirmation email sent to customer');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email:', emailError.message);
    }

    res.json({ 
      success: true, 
      message: 'Your message has been sent successfully. We\'ll get back to you soon!',
      ticketId: result.insertId
    });

  } catch (error) {
    console.error('❌ Support ticket error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit your message. Please try again.' 
    });
  }
};

// Get all support tickets (Admin)
exports.getAllTickets = async (req, res) => {
  try {
    const [tickets] = await db.query(
      `SELECT * FROM support_tickets ORDER BY created_at DESC`
    );

    res.json({ 
      success: true, 
      tickets 
    });

  } catch (error) {
    console.error('❌ Get support tickets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch support tickets',
      tickets: []
    });
  }
};

// Reply to support ticket (Admin)
exports.replyToTicket = async (req, res) => {
  try {
    const { ticketId, email, subject, reply, customerName } = req.body;

    if (!ticketId || !email || !subject || !reply) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    await emailTransporter.sendMail({
      from: {
        name: 'Kusina ni Katya Support',
        address: process.env.MAIL_USER
      },
      to: email,
      subject: `Re: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #cda45e 0%, #b8924e 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .reply-box { background: #f8f9fa; border-left: 4px solid #cda45e; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Kusina ni Katya</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Customer Support</p>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello ${customerName || 'Valued Customer'}! 👋</p>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">
                Thank you for contacting Kusina ni Katya. Here's our response to your inquiry:
              </p>
              
              <div class="reply-box">
                <p style="margin: 0 0 15px 0; font-weight: bold; color: #cda45e; font-size: 14px;">SUPPORT REPLY:</p>
                <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${reply}</p>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                If you have any additional questions, feel free to reply to this email or call us at <strong>+63 912 345 6789</strong>.
              </p>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Best regards,<br>
                <strong style="color: #cda45e;">Kusina ni Katya Support Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">© 2025 Kusina ni Katya. All Rights Reserved.</p>
              <p style="margin: 0;">Aurora Blvd, Quezon City, Manila, Philippines</p>
              <p style="margin: 10px 0 0 0;">📞 +63 912 345 6789 | 📧 hello@kusinanikatya.ph</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    await db.query(
      'UPDATE support_tickets SET status = ?, replied_at = NOW() WHERE id = ?',
      ['Replied', ticketId]
    );

    console.log(`✅ Reply sent for ticket #${ticketId} to ${email}`);

    res.json({ 
      success: true, 
      message: 'Reply sent successfully via email' 
    });

  } catch (error) {
    console.error('❌ Reply error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send reply email' 
    });
  }
};

// Update ticket status (Admin)
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Replied'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    const [result] = await db.query(
      'UPDATE support_tickets SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Status updated successfully' 
    });

  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update status' 
    });
  }
};

module.exports = exports;