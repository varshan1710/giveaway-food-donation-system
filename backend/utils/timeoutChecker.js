const Donation = require('../models/Donation');
const { sendEmail, sendSMS } = require('./notify');

function startTimeoutChecker() {
  console.log('[timeoutChecker] Timer started. Will scan every 60 seconds.');
  setInterval(async () => {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const matchedDonations = await Donation.find({
        status: 'out_for_pickup',
        assignedVolunteer: null,
        volunteerNotifiedAt: { $lte: tenMinutesAgo }
      }).populate('acceptedBy', 'name email phone');

      for (const donation of matchedDonations) {
        if (!donation.acceptedBy) continue;

        const ngoUser = donation.acceptedBy;
        const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const selfPickupUrl = `${appUrl}/donations/${donation._id}`;

        const subject = `⚠️ No Volunteer Found: Self-Pickup Decision Required`;
        const text =
          `Hi ${ngoUser.name},\n\n` +
          `No volunteer accepted the pickup request for "${donation.foodName}" within the 10-minute time limit.\n\n` +
          `Would you like to collect the food yourself?\n` +
          `Confirm or decline here:\n${selfPickupUrl}\n\n` +
          `— GiveAway`;

        const html = `
          <div style="font-family:sans-serif;max-width:520px">
            <h2 style="color:#dc2626;">⚠️ GiveAway — No Volunteer Found</h2>
            <p>Hi <strong>${ngoUser.name}</strong>,</p>
            <p>No volunteer accepted the pickup request for <strong>${donation.foodName}</strong> within the 10-minute time limit.</p>
            <p>Would you like to collect the food yourself?</p>
            <a href="${selfPickupUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Decide Self-Pickup</a>
          </div>`;

        const smsMessage =
          `⚠️ GiveAway: No volunteer accepted the pickup for "${donation.foodName}" in time. ` +
          `Collect it yourself? Decide here: ${selfPickupUrl}`;

        // Send Email & SMS to NGO
        if (ngoUser.email) {
          await sendEmail({ to: ngoUser.email, subject, text, html }).catch(err =>
            console.error('[timeoutChecker] Failed to send email to NGO:', err.message)
          );
        }
        if (ngoUser.phone) {
          await sendSMS({ to: ngoUser.phone, message: smsMessage }).catch(err =>
            console.error('[timeoutChecker] Failed to send SMS to NGO:', err.message)
          );
        }

        // Set donation.status = 'awaiting_ngo_selfpickup'
        donation.status = 'awaiting_ngo_selfpickup';
        donation.timeline.push({
          status: 'awaiting_ngo_selfpickup',
          note: 'No volunteer accepted within 10 minutes. Awaiting NGO self-pickup decision.',
          timestamp: new Date()
        });
        await donation.save();
        console.log(`[timeoutChecker] Updated donation ${donation._id} to awaiting_ngo_selfpickup`);
      }
    } catch (err) {
      console.error('[timeoutChecker] Error running check:', err);
    }
  }, 60000);
}

module.exports = { startTimeoutChecker };
