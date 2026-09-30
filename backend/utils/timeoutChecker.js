const Donation = require('../models/Donation');
const { sendEmail, sendSMS } = require('./notify');

// Configurable constants
const VOLUNTEER_RESPONSE_TIMEOUT_MINUTES = 7;
const SCAN_INTERVAL_MS = 30000; // scan every 30 seconds

function startTimeoutChecker() {
  console.log(`[timeoutChecker] Timer started. Scanning every ${SCAN_INTERVAL_MS / 1000}s. Volunteer timeout: ${VOLUNTEER_RESPONSE_TIMEOUT_MINUTES} min.`);

  setInterval(async () => {
    try {
      const now = new Date();

      // ── 1. Food Spoilage Auto-Expiration Scan ─────────────────────────────
      const expiredDonations = await Donation.find({
        expiryDate: { $lte: now },
        status: { $in: ['pending', 'accepted', 'assigned_pending_volunteer', 'out_for_pickup', 'awaiting_ngo_selfpickup'] },
      })
        .populate('donor', 'name email phone')
        .populate('acceptedBy', 'name email phone');

      for (const donation of expiredDonations) {
        donation.status = 'expired';
        donation.assignedVolunteer = null;
        donation.timeline.push({
          status: 'expired',
          note: 'Food safety window expired — donation automatically cancelled to prevent food spoilage.',
          timestamp: now,
        });
        await donation.save();

        const alertText = `⚠️ GiveAway Food Safety Alert: Your donation "${donation.foodName}" reached its safe consumption window and was automatically cancelled to ensure food safety.`;

        if (donation.donor?.email) {
          sendEmail({
            to: donation.donor.email,
            subject: '⚠️ GiveAway: Donation Auto-Cancelled (Expired)',
            text: alertText,
          }).catch((err) => console.error('[timeoutChecker] Failed to send expiry email:', err.message));
        }

        console.log(`[timeoutChecker] Auto-cancelled expired donation ${donation._id} ("${donation.foodName}")`);
      }

      // ── 2. Volunteer 7-Minute Invitation Response Timeout ──────────────────
      const timeoutThreshold = new Date(Date.now() - VOLUNTEER_RESPONSE_TIMEOUT_MINUTES * 60 * 1000);
      const timedOutAssignments = await Donation.find({
        status: 'assigned_pending_volunteer',
        volunteerInvitationStatus: 'pending',
        $or: [
          { assignedAt: { $lte: timeoutThreshold } },
          { volunteerNotifiedAt: { $lte: timeoutThreshold } },
          { responseDeadline: { $lte: now } },
        ],
      })
        .populate('acceptedBy', 'name email phone')
        .populate('assignedVolunteer', 'name email phone');

      for (const donation of timedOutAssignments) {
        const ngoUser = donation.acceptedBy;
        const volUser = donation.assignedVolunteer;

        donation.status = 'accepted';
        donation.volunteerInvitationStatus = 'rejected';
        donation.assignedVolunteer = null;
        donation.timeline.push({
          status: 'accepted',
          note: `Volunteer (${volUser?.name || 'Assigned volunteer'}) failed to respond within ${VOLUNTEER_RESPONSE_TIMEOUT_MINUTES} minutes. Assignment automatically cancelled.`,
          timestamp: now,
        });

        await donation.save();

        console.log(`[timeoutChecker] Volunteer invitation timed out for donation ${donation._id}. Reverted to 'accepted'.`);

        if (ngoUser) {
          const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
          const donationUrl = `${appUrl}/donations/${donation._id}`;
          const subject = `⚠️ Volunteer Response Timeout (${VOLUNTEER_RESPONSE_TIMEOUT_MINUTES} min) - Action Required`;
          const text =
            `Hi ${ngoUser.name},\n\n` +
            `The volunteer assigned to pickup "${donation.foodName}" did not respond within ${VOLUNTEER_RESPONSE_TIMEOUT_MINUTES} minutes.\n` +
            `The assignment has been automatically cancelled. You can now assign another volunteer or collect the food yourself.\n\n` +
            `Manage Donation: ${donationUrl}\n\n— GiveAway`;

          const smsMessage =
            `⚠️ GiveAway: Assigned volunteer did not respond within ${VOLUNTEER_RESPONSE_TIMEOUT_MINUTES} min for "${donation.foodName}". ` +
            `Re-assign or pickup: ${donationUrl}`;

          if (ngoUser.email) {
            sendEmail({ to: ngoUser.email, subject, text }).catch((err) =>
              console.error('[timeoutChecker] Failed to send NGO timeout email:', err.message)
            );
          }
          if (ngoUser.phone) {
            sendSMS({ to: ngoUser.phone, message: smsMessage }).catch((err) =>
              console.error('[timeoutChecker] Failed to send NGO timeout SMS:', err.message)
            );
          }
        }
      }

      // ── 3. General Broadcast Timeout (10-minute timeout for unassigned requests) ─
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const matchedDonations = await Donation.find({
        status: 'out_for_pickup',
        assignedVolunteer: null,
        volunteerNotifiedAt: { $lte: tenMinutesAgo },
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

        const smsMessage =
          `⚠️ GiveAway: No volunteer accepted the pickup for "${donation.foodName}" in time. ` +
          `Collect it yourself? Decide here: ${selfPickupUrl}`;

        if (ngoUser.email) {
          sendEmail({ to: ngoUser.email, subject, text }).catch((err) =>
            console.error('[timeoutChecker] Failed to send email to NGO:', err.message)
          );
        }
        if (ngoUser.phone) {
          sendSMS({ to: ngoUser.phone, message: smsMessage }).catch((err) =>
            console.error('[timeoutChecker] Failed to send SMS to NGO:', err.message)
          );
        }

        donation.status = 'awaiting_ngo_selfpickup';
        donation.timeline.push({
          status: 'awaiting_ngo_selfpickup',
          note: 'No volunteer accepted within 10 minutes. Awaiting NGO self-pickup decision.',
          timestamp: new Date(),
        });
        await donation.save();
        console.log(`[timeoutChecker] Updated donation ${donation._id} to awaiting_ngo_selfpickup`);
      }
    } catch (err) {
      console.error('[timeoutChecker] Error running check:', err);
    }
  }, SCAN_INTERVAL_MS);
}

module.exports = { startTimeoutChecker, VOLUNTEER_RESPONSE_TIMEOUT_MINUTES };
